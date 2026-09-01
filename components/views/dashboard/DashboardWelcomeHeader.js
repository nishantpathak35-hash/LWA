'use client';
import React from 'react';
import { Button, Card, CardContent } from '../../ui/core';
import { CreditCard, FilePlus, CheckSquare, Sparkles, AlertTriangle, ShieldCheck, FileCheck2, ArrowUpRight, Clock, Building2, Layers } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { isSuperAdmin } from '../../../app/lib/config';

export default function DashboardWelcomeHeader({ user, loading, loadDashboardData, setActiveView, approvalMetrics }) {
  const { syncStatus } = useAppState();
  const isSyncing = loading || syncStatus === 'syncing';
  const isSuper = isSuperAdmin(user?.email);

  return (
    <div className="space-y-6">
      {/* ── 1. Executive Welcome & System Status Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-card via-card to-amber-500/5 border border-border/80 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-gold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> {isSuper ? 'Super Admin Executive' : 'Procurement & Treasury Command'}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground font-medium">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-gold border border-amber-500/20 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Welcome, <span className="text-amber-700 dark:text-gold">{user?.name || user?.email?.split('@')[0] || 'User'}</span>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time project budgets, treasury outflow ledger, multi-tier approvals, and vendor health
                </p>
              </div>
            </div>
          </div>

          {/* Cloud ERP Sync Badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                syncStatus === 'reconnecting'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                  : isSyncing
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isSyncing ? (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                ) : syncStatus === 'reconnecting' ? (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                ) : (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    syncStatus === 'reconnecting'
                      ? 'bg-amber-500'
                      : isSyncing
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                ></span>
              </span>
              {syncStatus === 'reconnecting'
                ? 'Reconnecting...'
                : isSyncing
                ? 'Syncing Database...'
                : 'Cloud Live Sync'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Quick Action Launchpads ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveView('payments')}
          className="flex items-center justify-between p-5 bg-card border border-border/80 hover:border-emerald-500/50 hover:shadow-md rounded-2xl transition-all active:scale-[0.98] shadow-xs group cursor-pointer text-left"
        >
          <div className="space-y-1">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block">New Payment Request</span>
            <span className="text-xs text-muted-foreground font-medium block">Initiate invoice disbursement against PO</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setActiveView('pos')}
          className="flex items-center justify-between p-5 bg-card border border-border/80 hover:border-amber-500/50 hover:shadow-md rounded-2xl transition-all active:scale-[0.98] shadow-xs group cursor-pointer text-left"
        >
          <div className="space-y-1">
            <span className="text-xs text-amber-700 dark:text-gold font-bold uppercase tracking-wider block">New Purchase Order</span>
            <span className="text-xs text-muted-foreground font-medium block">Contract vendor line-items & terms</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-gold group-hover:scale-110 transition-transform shrink-0">
            <FilePlus className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setActiveView('payments')}
          className="flex items-center justify-between p-5 bg-card border border-border/80 hover:border-blue-500/50 hover:shadow-md rounded-2xl transition-all active:scale-[0.98] shadow-xs group cursor-pointer text-left"
        >
          <div className="space-y-1">
            <span className="text-xs text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider block">Approvals Pipeline</span>
            <span className="text-xs text-muted-foreground font-medium block">Review & authorize pending stages</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* ── 3. Approval Queue Triage Metrics ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Approval Triage & Risk Radar</h3>
          <span className="text-xs text-muted-foreground font-medium">Real-time Stage Analysis</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Claims</div>
            <div className="text-2xl font-bold text-foreground mt-1.5 font-mono tabular-nums">{approvalMetrics.total}</div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Active Pipeline</span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Action</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1.5 font-mono tabular-nums">{approvalMetrics.pending}</div>
            <span className="text-[10px] text-amber-600/80 mt-0.5 block">Needs Approval</span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Approved</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5 font-mono tabular-nums">{approvalMetrics.approved}</div>
            <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Sanctioned</span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Rejected</div>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1.5 font-mono tabular-nums">{approvalMetrics.rejected}</div>
            <span className="text-[10px] text-rose-600/80 mt-0.5 block">Disallowed</span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Over-Budget</div>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1.5 font-mono tabular-nums">{approvalMetrics.overBudget}</div>
            <span className="text-[10px] text-rose-600/80 mt-0.5 block">Director Sign-off</span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">TDS Active</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1.5 font-mono tabular-nums">{approvalMetrics.tdsApplicable}</div>
            <span className="text-[10px] text-blue-600/80 mt-0.5 block">Withholding Tax</span>
          </div>
        </div>
      </div>
    </div>
  );
}
