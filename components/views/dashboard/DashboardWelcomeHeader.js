'use client';
import React from 'react';
import { Button } from '../../ui/core';
import { CreditCard, FilePlus, CheckSquare, Sparkles, AlertTriangle, ShieldCheck, FileCheck2, ArrowUpRight } from 'lucide-react';

import { useAppState } from '../../StateProvider';

export default function DashboardWelcomeHeader({ user, loading, loadDashboardData, setActiveView, approvalMetrics }) {
  const { syncStatus } = useAppState();
  const isSyncing = loading || syncStatus === 'syncing';

  return (
    <>
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-card border border-border rounded-xl shadow-2xs relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Welcome back, <span className="text-amber-800 dark:text-amber-400">{user?.name || user?.email}</span>
            </h2>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Real-time Project Balances, Outflow Ledger, Approvals and Studio Performance Metrics.
          </p>
        </div>

        {/* ── Cloud ERP Live Sync Status ── */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
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
              ? 'Syncing...'
              : 'Live Sync Active'}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveView('payments')}
            className="flex items-center justify-between p-5 bg-card border border-border hover:border-amber-500/40 rounded-xl transition-all duration-150 active:scale-[0.98] shadow-2xs group cursor-pointer text-left"
          >
            <div className="space-y-1">
              <span className="text-xs text-amber-800 dark:text-amber-400 font-semibold uppercase tracking-wider block">New Payment Request</span>
              <span className="text-xs text-muted-foreground font-medium block">Initiate a vendor payment request</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </button>
          <button
            onClick={() => setActiveView('pos')}
            className="flex items-center justify-between p-5 bg-card border border-border hover:border-emerald-500/40 rounded-xl transition-all duration-150 active:scale-[0.98] shadow-2xs group cursor-pointer text-left"
          >
            <div className="space-y-1">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider block">New Purchase Order</span>
              <span className="text-xs text-muted-foreground font-medium block">Create & issue a purchase order</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 transition-transform">
              <FilePlus className="w-4 h-4" />
            </div>
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className="flex items-center justify-between p-5 bg-card border border-border hover:border-blue-500/40 rounded-xl transition-all duration-150 active:scale-[0.98] shadow-2xs group cursor-pointer text-left"
          >
            <div className="space-y-1">
              <span className="text-xs text-sky-700 dark:text-sky-400 font-semibold uppercase tracking-wider block">Approvals Queue</span>
              <span className="text-xs text-muted-foreground font-medium block">Review pending workflow stages</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>

      {/* ── Approval Queue KPIs ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Approval Queue Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Requests</div>
            <div className="text-2xl font-bold text-foreground mt-2 font-mono">{approvalMetrics.total}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-2 font-mono">{approvalMetrics.pending}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Approved</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2 font-mono">{approvalMetrics.approved}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Rejected</div>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-2 font-mono">{approvalMetrics.rejected}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Over-Budget</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-500 mt-2 font-mono">{approvalMetrics.overBudget}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">TDS Applicable</div>
            <div className="text-2xl font-bold text-violet-700 dark:text-violet-400 mt-2 font-mono">{approvalMetrics.tdsApplicable}</div>
          </div>
        </div>
      </div>
    </>
  );
}
