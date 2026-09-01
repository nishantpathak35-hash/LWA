import React, { useMemo } from 'react';
import { Receipt, Download, PlusCircle, CheckCircle2, Clock, FileCheck, IndianRupee, ShieldCheck } from 'lucide-react';
import { Card, CardContent, Button } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';

export default function POFilters({ canCreate, filteredPOs, handleExportPOs, handleOpenModal, pos = [] }) {
  const allPOs = pos && pos.length > 0 ? pos : (filteredPOs || []);

  const kpis = useMemo(() => {
    const total = allPOs.length;
    const pending = allPOs.filter(p => {
      const s = String(p.status || p.approval_status || '').toLowerCase();
      return s === 'pending approval' || s === 'pending_approval' || s === 'pending' || s.includes('pending') || s === 'under approval';
    });
    const approved = allPOs.filter(p => {
      const s = String(p.status || p.approval_status || '').toLowerCase();
      return s === 'approved' || s === 'active';
    });
    const paidOrClosed = allPOs.filter(p => {
      const s = String(p.status || p.approval_status || '').toLowerCase();
      const ps = String(p.payment_status || '').toLowerCase();
      return s === 'short closed' || s === 'short_closed' || s === 'closed' || ps === 'fully paid';
    });

    const totalVal = allPOs.reduce((acc, p) => acc + Number(p.po_value || 0), 0);
    const pendingVal = pending.reduce((acc, p) => acc + Number(p.po_value || 0), 0);
    const approvedVal = approved.reduce((acc, p) => acc + Number(p.po_value || 0), 0);
    const paidVal = allPOs.reduce((acc, p) => acc + Number(p.paid || 0), 0);
    const paidPercent = totalVal > 0 ? Math.round((paidVal / totalVal) * 100) : 0;

    return {
      total,
      pendingCount: pending.length,
      pendingVal,
      approvedCount: approved.length,
      approvedVal,
      paidCount: paidOrClosed.length,
      paidVal,
      totalVal,
      paidPercent
    };
  }, [allPOs]);

  return (
    <div className="space-y-5">
      {/* ── 1. Header Command Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-card via-card to-amber-500/5 border border-border/80 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-gold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Procurement Lifecycle
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground font-medium">Purchase Orders Registry</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-gold border border-amber-500/30 shrink-0 shadow-inner">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Purchase Orders
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Issue, authorize, track deliveries, and manage stage-wise billing pipelines
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPOs} 
              disabled={filteredPOs.length === 0} 
              className="text-xs font-semibold h-9 rounded-xl border-border/80 hover:bg-muted/80 transition-all"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Export Report
            </Button>
            {canCreate && (
              <Button 
                onClick={() => handleOpenModal()} 
                className="bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Create Purchase Order
              </Button>
            )}
          </div>
        </div>

        {/* Treasury Settlement Progress Bar */}
        <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-2/3">
            <span className="text-muted-foreground font-medium whitespace-nowrap text-[11px]">Paid Outflow Rate:</span>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${kpis.paidPercent}%` }}
                title={`Settled: ${kpis.paidPercent}%`}
              />
            </div>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-[11px] whitespace-nowrap">
              {kpis.paidPercent}% Disbursed
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span>Committed: <strong className="text-foreground font-mono font-semibold">{formatCurrency(kpis.totalVal)}</strong></span>
            <span>•</span>
            <span>Paid: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">{formatCurrency(kpis.paidVal)}</strong></span>
          </div>
        </div>
      </div>

      {/* ── 2. Metric KPI Cards Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total PO Registry</span>
              <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">{kpis.total}</p>
              <span className="text-xs font-semibold text-foreground font-mono tabular-nums">{formatCurrency(kpis.totalVal)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Total Contract Value</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Needs Approval</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 font-mono tabular-nums">{kpis.pendingCount}</p>
              {kpis.pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending Director
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Value: {formatCurrency(kpis.pendingVal)}</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Active Approved</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">{kpis.approvedCount}</p>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">{formatCurrency(kpis.approvedVal)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">In Execution / Invoicing</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Disbursed Paid</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-400 font-mono tabular-nums">{kpis.paidCount}</p>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 font-mono tabular-nums">{formatCurrency(kpis.paidVal)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Completed Payments</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
