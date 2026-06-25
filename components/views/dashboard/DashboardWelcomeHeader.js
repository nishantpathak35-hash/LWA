'use client';
import React from 'react';
import { Button } from '../../ui/core';
import { ArrowRight } from 'lucide-react';

export default function DashboardWelcomeHeader({ user, loading, loadDashboardData, setActiveView, approvalMetrics }) {
  return (
    <>
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-gradient-to-r from-card to-card/20 border border-border rounded-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gold/5 rounded-full blur-[80px]" />
        <div>
          <h2 className="text-2xl font-light tracking-tight font-serif text-foreground">
            Welcome back, <span className="font-normal text-gold">{user?.name || user?.email}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-light">
            Real-time Project Balances, Outflow Ledger, Approvals and Studio Performance Metrics.
          </p>
        </div>
        <button
          onClick={() => loadDashboardData()}
          disabled={loading}
          className="relative z-10 flex items-center gap-2 px-4 py-2 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold/10 transition-all disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing…' : 'Refresh Data'}
        </button>
      </div>

      {/* ── Quick Actions ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <button
            onClick={() => setActiveView('payments')}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border hover:border-gold/30 rounded-xl transition-all hover:-translate-y-0.5 group"
          >
            <span className="text-xs text-gold font-semibold uppercase tracking-wider">New Payment Request</span>
            <div className="text-3xl my-3 text-gold group-hover:scale-110 transition-transform">+</div>
            <span className="text-[11px] text-muted-foreground font-light">Initiate a vendor payment request</span>
          </button>
          <button
            onClick={() => setActiveView('pos')}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border hover:border-gold/30 rounded-xl transition-all hover:-translate-y-0.5 group"
          >
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">New Purchase Order</span>
            <div className="text-3xl my-3 text-emerald-400 group-hover:scale-110 transition-transform">📄</div>
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border hover:border-gold/30 rounded-xl transition-all hover:-translate-y-0.5 group"
          >
            <span className="text-xs text-gold font-semibold uppercase tracking-wider">Approvals Queue</span>
            <div className="text-3xl my-3 text-gold group-hover:scale-110 transition-transform">✓</div>
            <span className="text-[11px] text-muted-foreground font-light">Review pending workflow stages</span>
          </button>
        </div>
      </div>

      {/* ── Approval Queue KPIs ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Approval Queue Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Requests</div>
            <div className="text-2xl font-light text-foreground mt-2 font-serif">{approvalMetrics.total}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-gold">Pending</div>
            <div className="text-2xl font-light text-gold mt-2 font-serif">{approvalMetrics.pending}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-emerald-400">Approved</div>
            <div className="text-2xl font-light text-emerald-400 mt-2 font-serif">{approvalMetrics.approved}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-red-400">Rejected</div>
            <div className="text-2xl font-light text-red-400 mt-2 font-serif">{approvalMetrics.rejected}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-amber-500">Over-Budget</div>
            <div className="text-2xl font-light text-amber-500 mt-2 font-serif">{approvalMetrics.overBudget}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-violet-400">TDS Applicable</div>
            <div className="text-2xl font-light text-violet-400 mt-2 font-serif">{approvalMetrics.tdsApplicable}</div>
          </div>
        </div>
      </div>
    </>
  );
}
