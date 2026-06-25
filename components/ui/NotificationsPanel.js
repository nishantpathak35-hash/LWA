'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../StateProvider';
import { Bell, CheckCircle2, Clock, AlertTriangle, CreditCard, X } from 'lucide-react';
import { formatTimeAgo } from '../../app/lib/utils';

/**
 * NotificationsPanel
 * 
 * Derives notifications from existing `payments` state (zero extra API calls).
 * Shows items relevant to the current user's role:
 *  - Payments pending their approval action
 *  - Recently remitted payments (last 7 days)
 *  - Over-budget PRs (approved > PO value)
 */
function getPRStatus(stage, remittance) {
  const s = String(stage || '').toLowerCase().trim();
  const r = String(remittance || '').toLowerCase();
  if (r.includes('remit') || s.includes('remit')) return 'remitted';
  if (s.includes('reject') || s.includes('cancel')) return 'rejected';
  if (s.includes('ready')) return 'ready';
  if (s.includes('director')) return 'pending_director';
  if (s.includes('finance')) return 'pending_finance';
  return 'pending_proc';
}

export function NotificationsPanel() {
  const { payments, user } = useAppState();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const roles = user?.roles || [];
  const isAdmin = user?.email === 'admin@luxeworx.com' || roles.includes('admin');
  const isDirector = roles.includes('director');
  const isFinance = roles.includes('finance');
  const isProcurement = roles.some(r => ['proc', 'procurement', 'maker'].includes(r));

  const notifications = useMemo(() => {
    if (!payments?.length) return [];
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const result = [];

    for (const p of payments) {
      const status = getPRStatus(p.stage, p.remittance);
      const createdAt = p.created_at || p.createdAt;
      const age = createdAt ? now - new Date(createdAt).getTime() : 0;

      // Action needed by this user's role
      if ((isAdmin || isProcurement) && status === 'pending_proc') {
        result.push({
          id: `proc-${p.id || p.pr_id}`,
          type: 'action',
          icon: <Clock className="w-4 h-4 text-amber-400" />,
          title: `PR #${p.id || p.pr_id} awaits procurement review`,
          subtitle: `${p.vendor_name || 'Vendor'} · ₹${Number(p.amount_requested || 0).toLocaleString('en-IN')}`,
          time: createdAt,
          urgent: age > 2 * 24 * 60 * 60 * 1000,
        });
      }
      if ((isAdmin || isFinance) && status === 'pending_finance') {
        result.push({
          id: `fin-${p.id || p.pr_id}`,
          type: 'action',
          icon: <CreditCard className="w-4 h-4 text-sky-400" />,
          title: `PR #${p.id || p.pr_id} awaits finance approval`,
          subtitle: `${p.vendor_name || 'Vendor'} · ₹${Number(p.approved_amount || p.amount_requested || 0).toLocaleString('en-IN')}`,
          time: createdAt,
          urgent: age > 3 * 24 * 60 * 60 * 1000,
        });
      }
      if ((isAdmin || isDirector) && (status === 'pending_director' || status === 'ready')) {
        result.push({
          id: `dir-${p.id || p.pr_id}`,
          type: 'action',
          icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
          title: `PR #${p.id || p.pr_id} awaiting director sign-off`,
          subtitle: `${p.vendor_name || 'Vendor'} · ₹${Number(p.approved_amount || p.amount_requested || 0).toLocaleString('en-IN')}`,
          time: createdAt,
          urgent: true,
        });
      }
      // Recent remittance (last 7 days)
      if (status === 'remitted') {
        const remitDate = p.remittance_date || createdAt;
        if (remitDate && now - new Date(remitDate).getTime() < sevenDays) {
          result.push({
            id: `remit-${p.id || p.pr_id}`,
            type: 'info',
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            title: `Payment remitted to ${p.vendor_name || 'vendor'}`,
            subtitle: `PR #${p.id || p.pr_id} · ${formatTimeAgo(remitDate)}`,
            time: remitDate,
            urgent: false,
          });
        }
      }
    }

    // Filter dismissed AFTER building — notification IDs have prefixes (fin-, dir-, etc.)
    // so we must match against the actual notification id, not the raw payment id.
    const filtered = result.filter(n => !dismissed.has(n.id));

    // Sort: urgent action items first, then by time descending
    filtered.sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      if (a.type === 'action' && b.type !== 'action') return -1;
      if (a.type !== 'action' && b.type === 'action') return 1;
      return new Date(b.time || 0) - new Date(a.time || 0);
    });

    return filtered.slice(0, 20);

  }, [payments, dismissed, isAdmin, isDirector, isFinance, isProcurement]);

  const actionCount = notifications.filter(n => n.type === 'action').length;

  if (!mounted) return null;

  return (
    <>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-800/60 transition-colors focus:outline-none"
      >
        <Bell className="w-4.5 h-4.5" />
        {actionCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9998] w-80 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150"
          style={{
            top: (buttonRef.current?.getBoundingClientRect().bottom ?? 56) + 8,
            right: 16,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {actionCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/20">
                  {actionCount} pending
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-900/60">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
                <p className="text-sm text-slate-500">All caught up!</p>
                <p className="text-xs text-slate-600">No pending actions for your role.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-900/40 transition-colors group ${n.urgent ? 'bg-amber-500/[0.03]' : ''}`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                    n.type === 'action'
                      ? 'bg-amber-500/10 border border-amber-500/10'
                      : 'bg-emerald-500/10 border border-emerald-500/10'
                  }`}>
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-snug ${n.urgent ? 'text-amber-300' : 'text-slate-200'}`}>
                      {n.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{n.subtitle}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{formatTimeAgo(n.time)}</p>
                  </div>
                  {/* Dismiss button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDismissed(prev => new Set([...prev, n.id])); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-slate-400 transition-all mt-0.5"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-800/60 bg-slate-900/40 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => setDismissed(new Set(notifications.map(n => n.id)))}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Dismiss all
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
