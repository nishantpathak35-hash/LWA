import React, { useMemo } from 'react';
import { Button, Input } from '../../ui/core';
import { PlusCircle, Search, Download, Clock, Landmark, ArrowUpRight, X, ShieldCheck, FileCheck2, UserCheck } from 'lucide-react';
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
  payments = [],
  onGoToReports
}) {
  const kpis = useMemo(() => {
    // Only ACTIVE pending requests (excluding readyToRemit, settled, and rejected which belong to Reports)
    const pendingRequests = payments.filter(p => !isPaymentSettled(p) && getPaymentStageKey(p) !== 'readyToRemit' && getPaymentStageKey(p) !== 'rejected');
    
    const proc = pendingRequests.filter(p => getPaymentStageKey(p) === 'pendingProc');
    const finance = pendingRequests.filter(p => getPaymentStageKey(p) === 'pendingFinance');
    const director = pendingRequests.filter(p => getPaymentStageKey(p) === 'pendingDirector');

    const amount = p => Number(p.approved_amount ?? p.gross_amount ?? p.amount_requested ?? p.amount ?? 0) || 0;
    
    const totalVal = pendingRequests.reduce((acc, p) => acc + amount(p), 0);
    const procVal = proc.reduce((acc, p) => acc + amount(p), 0);
    const financeVal = finance.reduce((acc, p) => acc + amount(p), 0);
    const directorVal = director.reduce((acc, p) => acc + amount(p), 0);

    return {
      totalCount: pendingRequests.length,
      totalVal,
      procCount: proc.length,
      procVal,
      financeCount: finance.length,
      financeVal,
      directorCount: director.length,
      directorVal
    };
  }, [payments]);

  return (
    <div className="space-y-5">
      {/* ── 1. Executive Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-amber-700 dark:text-primary border border-primary/20">
              <Landmark className="w-3 h-3" /> Treasury & Governance
            </span>
            <span className="text-xs text-muted-foreground/60">•</span>
            <span className="text-xs text-muted-foreground font-medium">Approval Pipeline</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Payment Requests
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active vendor claims requiring approval. Approved orders and remittances are processed in Reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {onGoToReports && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToReports}
              className="text-xs font-semibold h-9 rounded-xl border-border/80 hover:bg-muted/80 text-foreground transition-all gap-1.5 shadow-2xs"
              title="Open Reports to disburse approved payments or review settled ledger"
            >
              <span>Remittance & Reports</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
            </Button>
          )}
          {onExportCSV && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              className="text-xs font-semibold h-9 rounded-xl border-border/80 hover:bg-muted/80 text-foreground transition-all gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Export Queue</span>
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

      {/* ── 2. Metric KPI Cards Bar (Approval Pipeline Tiers) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Awaiting Approval */}
        <div className="group relative rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 shadow-2xs hover:border-amber-500/40 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Total Awaiting Sanction</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 font-mono tabular-nums">
              {formatCurrency(kpis.totalVal)}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {kpis.totalCount} Orders Pending
              </span>
              <span className="font-medium text-foreground/75">Full Queue</span>
            </div>
          </div>
        </div>

        {/* Card 2: Procurement Check */}
        <div className="group relative rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 shadow-2xs hover:border-border transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Procurement Stage</span>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {formatCurrency(kpis.procVal)}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span>{kpis.procCount} In Review</span>
              <span className="text-muted-foreground font-medium">Initial Verification</span>
            </div>
          </div>
        </div>

        {/* Card 3: Finance Review */}
        <div className="group relative rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 shadow-2xs hover:border-blue-500/40 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Finance Review</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-400 font-mono tabular-nums">
              {formatCurrency(kpis.financeVal)}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span>{kpis.financeCount} In Review</span>
              <span className="text-blue-700 dark:text-blue-400 font-medium">TDS & Ledger Check</span>
            </div>
          </div>
        </div>

        {/* Card 4: Director Sign-off */}
        <div className="group relative rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 shadow-2xs hover:border-purple-500/40 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Director Sign-off</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-400 font-mono tabular-nums">
              {formatCurrency(kpis.directorVal)}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span>{kpis.directorCount} Escalated</span>
              <span className="text-purple-700 dark:text-purple-400 font-medium">Final Authorization</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Stage Filter & Search Bar ── */}
      <div className="p-2 bg-card rounded-xl border border-border/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shadow-2xs">
        {/* Segmented Stage Pills */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/40 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'all' || activeTab === 'pending'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>All Pending</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              activeTab === 'all' || activeTab === 'pending' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground'
            }`}>
              {kpis.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('proc')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'proc'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Procurement</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              activeTab === 'proc' ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {kpis.procCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'finance'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Finance</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              activeTab === 'finance' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400' : 'bg-muted text-muted-foreground'
            }`}>
              {kpis.financeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('director')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'director'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Director</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              activeTab === 'director' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400' : 'bg-muted text-muted-foreground'
            }`}>
              {kpis.directorCount}
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
