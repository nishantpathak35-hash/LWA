'use client';
import React from 'react';
import { Button } from '../../ui/core';
import { CreditCard, FilePlus, CheckSquare, RefreshCw, Sparkles, AlertTriangle, ShieldCheck, FileCheck2, ArrowUpRight } from 'lucide-react';

export default function DashboardWelcomeHeader({ user, loading, loadDashboardData, setActiveView, approvalMetrics }) {
  return (
    <>
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-card border border-border rounded-xl shadow-2xs relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-gold" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Welcome back, <span className="text-amber-800 dark:text-gold">{user?.name || user?.email}</span>
            </h2>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Real-time Project Balances, Outflow Ledger, Approvals and Studio Performance Metrics.
          </p>
        </div>
        <button
          onClick={() => loadDashboardData()}
          disabled={loading}
          className="relative z-10 flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-800 dark:text-gold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh Dashboard'}
        </button>
      </div>

      {/* ── Quick Actions ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveView('payments')}
            className="flex items-center justify-between p-5 bg-card border border-border hover:border-amber-500/50 rounded-xl transition-all hover:-translate-y-0.5 shadow-2xs group cursor-pointer text-left"
          >
            <div className="space-y-1">
              <span className="text-xs text-amber-800 dark:text-gold font-bold uppercase tracking-wider block">New Payment Request</span>
              <span className="text-xs text-muted-foreground font-medium block">Initiate a vendor payment request</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-gold group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </button>
          <button
            onClick={() => setActiveView('pos')}
            className="flex items-center justify-between p-5 bg-card border border-border hover:border-emerald-500/50 rounded-xl transition-all hover:-translate-y-0.5 shadow-2xs group cursor-pointer text-left"
          >
            <div className="space-y-1">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block">New Purchase Order</span>
              <span className="text-xs text-muted-foreground font-medium block">Create & issue a purchase order</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <FilePlus className="w-5 h-5" />
            </div>
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className="flex items-center justify-between p-5 bg-card border border-border hover:border-blue-500/50 rounded-xl transition-all hover:-translate-y-0.5 shadow-2xs group cursor-pointer text-left"
          >
            <div className="space-y-1">
              <span className="text-xs text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider block">Approvals Queue</span>
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
