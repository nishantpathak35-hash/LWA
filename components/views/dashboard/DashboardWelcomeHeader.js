'use client';
import React from 'react';
import { Button } from '../../ui/core';
import { ArrowRight } from 'lucide-react';

export default function DashboardWelcomeHeader({ user, loading, loadDashboardData, setActiveView, approvalMetrics }) {
  return (
    <>
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-card border border-border rounded-xl shadow-2xs relative overflow-hidden">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Welcome back, <span className="text-amber-700 dark:text-gold">{user?.name || user?.email}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Real-time Project Balances, Outflow Ledger, Approvals and Studio Performance Metrics.
          </p>
        </div>
        <button
          onClick={() => loadDashboardData()}
          disabled={loading}
          className="relative z-10 flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-gold border border-amber-600/30 dark:border-gold/30 rounded-lg hover:bg-amber-500/10 transition-all disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing…' : 'Refresh Data'}
        </button>
      </div>

      {/* ── Quick Actions ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <button
            onClick={() => setActiveView('payments')}
            className="flex flex-col items-center justify-center p-5 bg-card border border-border hover:border-amber-500/40 rounded-xl transition-all hover:-translate-y-0.5 shadow-2xs group cursor-pointer"
          >
            <span className="text-xs text-amber-700 dark:text-gold font-bold uppercase tracking-wider">New Payment Request</span>
            <div className="text-3xl my-2 text-amber-700 dark:text-gold group-hover:scale-110 transition-transform font-bold">+</div>
            <span className="text-[11px] text-muted-foreground font-medium">Initiate a vendor payment request</span>
          </button>
          <button
            onClick={() => setActiveView('pos')}
            className="flex flex-col items-center justify-center p-5 bg-card border border-border hover:border-emerald-500/40 rounded-xl transition-all hover:-translate-y-0.5 shadow-2xs group cursor-pointer"
          >
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">New Purchase Order</span>
            <div className="text-3xl my-2 text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform">📄</div>
            <span className="text-[11px] text-muted-foreground font-medium">Create & issue a purchase order</span>
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className="flex flex-col items-center justify-center p-5 bg-card border border-border hover:border-amber-500/40 rounded-xl transition-all hover:-translate-y-0.5 shadow-2xs group cursor-pointer"
          >
            <span className="text-xs text-amber-700 dark:text-gold font-bold uppercase tracking-wider">Approvals Queue</span>
            <div className="text-3xl my-2 text-amber-700 dark:text-gold group-hover:scale-110 transition-transform font-bold">✓</div>
            <span className="text-[11px] text-muted-foreground font-medium">Review pending workflow stages</span>
          </button>
        </div>
      </div>

      {/* ── Approval Queue KPIs ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Approval Queue Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Requests</div>
            <div className="text-2xl font-bold text-foreground mt-2">{approvalMetrics.total}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-2">{approvalMetrics.pending}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Approved</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">{approvalMetrics.approved}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Rejected</div>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-2">{approvalMetrics.rejected}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Over-Budget</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-500 mt-2">{approvalMetrics.overBudget}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="text-[11px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">TDS Applicable</div>
            <div className="text-2xl font-bold text-violet-700 dark:text-violet-400 mt-2">{approvalMetrics.tdsApplicable}</div>
          </div>
        </div>
      </div>
    </>
  );
}
