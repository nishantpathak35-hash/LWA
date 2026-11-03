import React from 'react';
import { Button, Input } from '../../ui/core';
import { FileText, Download, Calendar, Search, X, PieChart, CreditCard, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../../app/lib/utils';

export default function ReportsHeader({
  handleExport, loading, data, rTypes, reportType, setReportType,
  startDate, setStartDate, endDate, setEndDate, vendorFilter, setVendorFilter, projectFilter, setProjectFilter
}) {
  const paymentTabs = [
    { id: 'All', label: 'All Payments' },
    { id: 'Approved', label: 'Approved' },
    { id: 'Remit', label: 'Ready to Remit' },
    { id: 'Remitted', label: 'Remitted' },
    { id: 'Manual', label: 'Manual Entries' },
    { id: 'Rejected', label: 'Rejected' },
  ];

  const ledgerTabs = [
    { id: 'TDS_Register', label: 'TDS Register' },
    { id: 'Vendor_TDS', label: 'Vendor TDS' },
    { id: 'Project_TDS', label: 'Project TDS' },
    { id: 'TDS_Quarter_Tracker', label: 'Form 16A Tracker' },
    { id: 'Day_Wise', label: 'Day-Wise Approval' },
    { id: 'Approval_Audit', label: 'Audit Log' },
  ];

  const isPaymentView = paymentTabs.some(t => t.id === reportType);
  const hasActiveFilters = Boolean(startDate || endDate || vendorFilter || projectFilter);
  const showSearchFilters = ['All', 'Approved', 'Rejected', 'Remit', 'Remitted'].includes(reportType);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setVendorFilter('');
    setProjectFilter('');
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      {/* ── Top bar: title + export ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-primary border border-amber-500/20">
            <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight truncate">
              Financial Reports &amp; Analytics
            </h1>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">
              Real-time payment ledgers, tax registers &amp; audit trails
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          size="sm"
          variant="primary"
          disabled={loading || !data}
          className="self-end sm:self-auto font-semibold text-xs h-7 sm:h-8 px-3 gap-1.5 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* ── Segment switcher ── */}
      <div className="flex items-center gap-1.5 px-3 sm:px-4 pt-2.5 pb-0 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setReportType('All')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap shrink-0',
            isPaymentView
              ? 'border-amber-500 text-amber-700 dark:text-primary bg-amber-500/8'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Payment Registers
        </button>
        <button
          onClick={() => setReportType('TDS_Register')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap shrink-0',
            !isPaymentView
              ? 'border-amber-500 text-amber-700 dark:text-primary bg-amber-500/8'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <PieChart className="w-3.5 h-3.5" />
          TDS &amp; Tax Ledgers
        </button>
      </div>

      {/* ── Sub-tab pills + filters in responsive layout ── */}
      <div className="border-t border-border bg-muted/20 px-3 sm:px-4 py-2.5 space-y-2.5">
        {/* Sub-tab pills — horizontally scrollable on mobile */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {(isPaymentView ? paymentTabs : ledgerTabs).map(t => (
            <button
              key={t.id}
              onClick={() => setReportType(t.id)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0',
                reportType === t.id
                  ? 'bg-amber-500/15 text-amber-700 dark:text-primary font-semibold border border-amber-500/30'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter controls — responsive grid on mobile, inline row on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-border/40">
          {/* Date range */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 text-[11px] shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-primary shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent border-none text-[11px] font-medium focus:outline-none text-foreground p-0 flex-1 sm:w-[105px]"
            />
            <span className="text-muted-foreground font-medium px-1">→</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent border-none text-[11px] font-medium focus:outline-none text-foreground p-0 flex-1 sm:w-[105px]"
            />
          </div>

          {/* Vendor & Project search */}
          {showSearchFilters && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Vendor…"
                  value={vendorFilter}
                  onChange={e => setVendorFilter(e.target.value)}
                  className="w-full sm:w-[130px] pl-7 pr-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-border bg-background shadow-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Project…"
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className="w-full sm:w-[130px] pl-7 pr-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-border bg-background shadow-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          {/* Clear filters badge */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}