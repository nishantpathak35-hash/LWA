import React, { useMemo } from 'react';
import { Button, Input, Card, CardContent } from '../../ui/core';
import { CreditCard, PlusCircle, Search, Download, Clock, CheckCircle2, Layers, Landmark, ArrowUpRight, X } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { getPaymentStageKey, isPaymentSettled } from '../../../app/lib/paymentStatus';

export default function PaymentFilters({
  canOnboard,
  handleOpenRequestModal,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onExportCSV,
  payments = []
}) {
  const kpis = useMemo(() => {
    const total = payments.length;
    const pending = payments.filter(p => !isPaymentSettled(p) && getPaymentStageKey(p) !== 'readyToRemit' && getPaymentStageKey(p) !== 'rejected');
    const overBudget = payments.filter(p => p.is_overbudget_approval || p.overbudget === 1);
    const approved = payments.filter(p => getPaymentStageKey(p) === 'readyToRemit');
    const remitted = payments.filter(isPaymentSettled);

    const amount = p => Number(p.approved_amount ?? p.gross_amount ?? p.amount_requested ?? p.amount ?? 0) || 0;
    const pendingVal = pending.reduce((acc, p) => acc + amount(p), 0);
    const approvedVal = approved.reduce((acc, p) => acc + amount(p), 0);
    const remittedVal = remitted.reduce((acc, p) => acc + amount(p), 0);
    const totalVal = payments.reduce((acc, p) => acc + amount(p), 0);

    return {
      total,
      pendingCount: pending.length,
      pendingVal,
      overBudgetCount: overBudget.length,
      approvedCount: approved.length,
      approvedVal,
      remittedCount: remitted.length,
      remittedVal,
      totalVal
    };
  }, [payments]);

  return (
    <div className="space-y-5">
      {/* ── 1. Executive Treasury Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-amber-700 dark:text-primary border border-primary/20">
              <Landmark className="w-3 h-3" /> Treasury & Disbursements
            </span>
            <span className="text-xs text-muted-foreground/60">•</span>
            <span className="text-xs text-muted-foreground font-medium">Enterprise PTS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Payment Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit vendor invoices against PO commitments, enforce multi-tier sanctions, and manage remittances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onExportCSV && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              className="text-xs font-semibold h-9 rounded-xl border-border/80 hover:bg-muted/80 text-foreground transition-all gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Export CSV</span>
            </Button>
          )}
          {canOnboard && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenRequestModal()}
              className="text-xs font-semibold h-9 rounded-xl shadow-xs gap-1.5 px-4"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Payment Request</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. Metric KPI Cards Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: All Requests */}
        <div className="group relative rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 shadow-2xs hover:border-border transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Invoiced</span>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {formatCurrency(kpis.totalVal)}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span>{kpis.total} Total Requests</span>
              <span className="font-medium text-foreground/75">100% Invoiced</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Approval */}
        <div className="group relative rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 shadow-2xs hover:border-amber-500/40 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Sanction</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 font-mono tabular-nums">
              {formatCurrency(kpis.pendingVal)}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {kpis.pendingCount} Awaiting Review
              </span>
              {kpis.overBudgetCount > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{kpis.overBudgetCount} Overbudget</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Ready to Remit */}
        <div className="group relative rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 shadow-2xs hover:border-sky-500/40 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">Ready to Disburse</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-400 font-mono tabular-nums">
              {formatCurrency(kpis.approvedVal)}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span>{kpis.approvedCount} Sanctioned</span>
              <span className="text-sky-700 dark:text-sky-400 font-medium">Ready for UTR/Chq</span>
            </div>
          </div>
        </div>

        {/* Card 4: Disbursed */}
        <div className="group relative rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 shadow-2xs hover:border-emerald-500/40 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Settled & Remitted</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
              {formatCurrency(kpis.remittedVal)}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span>{kpis.remittedCount} Disbursed</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">100% Closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Sleek Segmented Control & Search Bar ── */}
      <div className="p-2 bg-card rounded-xl border border-border/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shadow-2xs">
        {/* Segmented Tab Track */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/40 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Awaiting Review</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              activeTab === 'pending' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground'
            }`}>
              {kpis.pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'approved'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span>Ready to Remit</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              activeTab === 'approved' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400' : 'bg-muted text-muted-foreground'
            }`}>
              {kpis.approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>All Orders</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              activeTab === 'all' ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {payments.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <Input
            type="text"
            placeholder="Filter vendor, PO, invoice, mode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 text-xs py-1.5 h-9 bg-background/80 rounded-lg border-border/80 focus:border-primary/60 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
