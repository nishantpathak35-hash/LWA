import React, { useMemo } from 'react';
import { Download, Plus, CheckCircle2, Clock, FileCheck, Layers } from 'lucide-react';
import { Card, Button } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';

export default function POFilters({
  canCreate,
  filteredPOs = [],
  handleExportPOs,
  handleOpenModal,
  pos = [],
  statusFilter = 'all',
  setStatusFilter
}) {
  const allPOs = pos && pos.length > 0 ? pos : filteredPOs;

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

  const cards = [
    {
      id: 'all',
      label: 'Total POs',
      value: kpis.total,
      sub: `Committed: ${formatCurrency(kpis.totalVal)}`,
      subColor: 'text-muted-foreground',
      icon: <Layers className="w-4 h-4" />,
      iconBg: 'bg-muted text-muted-foreground border-border',
      hover: 'hover:border-foreground/30',
      activeRing: 'ring-2 ring-foreground/30 border-foreground/50 bg-foreground/[0.03]',
      isActive: statusFilter === 'all',
      onClick: () => setStatusFilter && setStatusFilter('all'),
      hint: 'Click to show all purchase orders'
    },
    {
      id: 'pending',
      label: 'Needs Approval',
      value: kpis.pendingCount,
      sub: `Pending: ${formatCurrency(kpis.pendingVal)}`,
      subColor: kpis.pendingCount > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground',
      icon: <Clock className="w-4 h-4" />,
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-primary border-amber-500/20',
      hover: 'hover:border-amber-500/40',
      activeRing: 'ring-2 ring-amber-500/50 border-amber-500/60 bg-amber-500/[0.04]',
      isActive: statusFilter === 'pending',
      onClick: () => setStatusFilter && setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending'),
      hint: 'Click to filter orders needing approval'
    },
    {
      id: 'approved',
      label: 'Active Approved',
      value: kpis.approvedCount,
      sub: `Approved: ${formatCurrency(kpis.approvedVal)}`,
      subColor: 'text-emerald-600 dark:text-emerald-400 font-semibold',
      icon: <CheckCircle2 className="w-4 h-4" />,
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      hover: 'hover:border-emerald-500/40',
      activeRing: 'ring-2 ring-emerald-500/50 border-emerald-500/60 bg-emerald-500/[0.04]',
      isActive: statusFilter === 'approved',
      onClick: () => setStatusFilter && setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved'),
      hint: 'Click to filter approved orders'
    },
    {
      id: 'paid',
      label: 'Disbursed Paid',
      value: kpis.paidCount,
      sub: `Paid: ${formatCurrency(kpis.paidVal)} (${kpis.paidPercent}%)`,
      subColor: 'text-sky-600 dark:text-sky-400 font-semibold',
      icon: <FileCheck className="w-4 h-4" />,
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      hover: 'hover:border-sky-500/40',
      activeRing: 'ring-2 ring-sky-500/50 border-sky-500/60 bg-sky-500/[0.04]',
      isActive: statusFilter === 'paid',
      onClick: () => setStatusFilter && setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid'),
      hint: 'Click to filter fully paid orders'
    }
  ];

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Purchase Orders</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {allPOs.length} order{allPOs.length !== 1 ? 's' : ''} · Issue, authorize, track deliveries, and manage vendor commitments
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPOs}
            disabled={filteredPOs.length === 0}
            className="h-8 text-xs font-semibold border-border"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Export
          </Button>
          {canCreate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenModal()}
              className="h-8 text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Purchase Order
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <button
            key={c.id}
            type="button"
            title={c.hint}
            onClick={c.onClick}
            className={`text-left p-4 bg-card border border-border rounded-lg shadow-xs flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden ${c.hover} ${c.isActive ? c.activeRing : ''}`}
          >
            <div className="flex items-start justify-between w-full">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block truncate">
                    {c.label}
                  </span>
                  {c.isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Active Filter" />
                  )}
                </div>
                <div className="text-xl font-bold text-foreground font-mono mt-1 tabular-nums">{c.value}</div>
              </div>
              <div className={`p-2 rounded-xl border shrink-0 ml-2 ${c.iconBg}`}>{c.icon}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-border w-full flex items-center justify-between">
              <span className={`text-[11px] truncate ${c.subColor}`}>{c.sub}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
