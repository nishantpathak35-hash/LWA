import React, { useMemo } from 'react';
import { Button, Input, Card, CardContent } from '../../ui/core';
import { CreditCard, PlusCircle, Search, Download, AlertTriangle, CheckCircle2, Clock, ShieldCheck, IndianRupee, Layers } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

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
    const pending = payments.filter(p => {
      const s = String(p.status || '').toLowerCase();
      const stage = String(p.stage || '').toLowerCase();
      return (s === 'pending' || s.includes('pending')) && !stage.includes('remit') && !stage.includes('reject');
    });
    const overBudget = payments.filter(p => p.is_overbudget_approval || p.overbudget === 1);
    const approved = payments.filter(p => {
      const s = String(p.status || '').toLowerCase();
      const stage = String(p.stage || '').toLowerCase();
      return (s === 'approved' || stage.includes('approved') || stage.includes('ready')) && !stage.includes('remit');
    });
    const remitted = payments.filter(p => {
      const s = String(p.status || '').toLowerCase();
      const stage = String(p.stage || '').toLowerCase();
      return s === 'paid' || s === 'remitted' || stage.includes('remit') || stage.includes('paid');
    });

    const pendingVal = pending.reduce((acc, p) => acc + Number(p.gross_amount || p.amount || 0), 0);
    const approvedVal = approved.reduce((acc, p) => acc + Number(p.gross_amount || p.amount || 0), 0);
    const remittedVal = remitted.reduce((acc, p) => acc + Number(p.gross_amount || p.amount || 0), 0);
    const totalVal = payments.reduce((acc, p) => acc + Number(p.gross_amount || p.amount || 0), 0);

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
      {/* ── 1. Executive Header Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-card via-card to-emerald-500/5 border border-border/80 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Treasury & Payouts Engine
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground font-medium">Multi-Tier Approval Pipeline</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 shadow-inner">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Payment Requests & Approvals
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verify invoices against PO buffers, authorize multi-tier approvals, and disburse bank remittances
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            {onExportCSV && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportCSV}
                className="text-xs font-semibold h-9 rounded-xl border-border/80 hover:bg-muted/80 transition-all"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Export Ledger
              </Button>
            )}
            {canOnboard && (
              <Button
                onClick={handleOpenRequestModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> New Payment Request
              </Button>
            )}
          </div>
        </div>

        {/* Treasury Stats Sub-bar */}
        <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-medium text-[11px]">Total Claim Value:</span>
            <span className="font-bold text-foreground font-mono text-[12px]">{formatCurrency(kpis.totalVal)}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span>Pending Authorization: <strong className="text-amber-600 dark:text-amber-400 font-mono font-semibold">{formatCurrency(kpis.pendingVal)}</strong></span>
            <span>•</span>
            <span>Disbursed (UTR Logged): <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">{formatCurrency(kpis.remittedVal)}</strong></span>
          </div>
        </div>
      </div>

      {/* ── 2. Metric KPI Cards Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">All Requests</span>
              <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">{kpis.total}</p>
              <span className="text-xs font-semibold text-foreground font-mono tabular-nums">{formatCurrency(kpis.totalVal)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Total Raised Claims</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Awaiting Sanction</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 font-mono tabular-nums">{kpis.pendingCount}</p>
              {kpis.pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> In Queue
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Value: {formatCurrency(kpis.pendingVal)}</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Over-Budget Alerts</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-rose-700 dark:text-rose-400 font-mono tabular-nums">{kpis.overBudgetCount}</p>
              {kpis.overBudgetCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  Director Required
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Exceeds PO/Project Buffer</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Disbursed (Settled)</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">{kpis.remittedCount}</p>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">{formatCurrency(kpis.remittedVal)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">UTR Logged Successfully</span>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Tabs Navigation & Search Bar ── */}
      <div className="p-3 bg-card rounded-2xl border border-border/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'active' 
                ? 'bg-foreground text-background shadow-xs' 
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            All Active Requests ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            My Pending Approvals
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search vendor, PO No, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs py-1.5 h-9 bg-background rounded-xl border-border"
          />
        </div>
      </div>
    </div>
  );
}
