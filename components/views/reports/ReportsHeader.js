import React from 'react';
import { Button, Input } from '../../ui/core';
import { FileText, Download, Calendar, Search, X, Filter, PieChart, CreditCard, ShieldCheck } from 'lucide-react';
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

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setVendorFilter('');
    setProjectFilter('');
  };

  return (
    <div className="space-y-4">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-gold border border-amber-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              Financial Reports & Analytics
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Real-time payment ledgers, tax registers, and audit approval trails.
            </p>
          </div>
        </div>

        <Button onClick={handleExport} size="sm" variant="primary" disabled={loading || !data} className="shrink-0 font-medium">
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Categorized Tab Navigation */}
      <div className="bg-card border border-border p-1.5 rounded-xl space-y-2">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 border-b border-border/60 pb-1.5 px-1 pt-1">
          {/* Main Segment Switcher */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            <button
              onClick={() => setReportType('All')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                isPaymentView 
                  ? "bg-background text-foreground shadow-xs border border-border" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Payment Registers
            </button>
            <button
              onClick={() => setReportType('TDS_Register')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                !isPaymentView 
                  ? "bg-background text-foreground shadow-xs border border-border" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PieChart className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
              TDS & Tax Ledgers
            </button>
          </div>

          {/* Sub-navigation Pills */}
          <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-1">
            {(isPaymentView ? paymentTabs : ledgerTabs).map(t => (
              <button
                key={t.id}
                onClick={() => setReportType(t.id)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                  reportType === t.id
                    ? "bg-amber-500/15 text-amber-700 dark:text-gold font-semibold border border-amber-500/30"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Filter Bar */}
        <div className="pt-1.5 px-1.5 pb-0.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border border-border text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-gold shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs font-medium focus:outline-none text-foreground p-0"
                placeholder="From"
              />
              <span className="text-muted-foreground text-xs font-medium">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs font-medium focus:outline-none text-foreground p-0"
                placeholder="To"
              />
            </div>

            {['All', 'Approved', 'Rejected', 'Remit', 'Remitted'].includes(reportType) && (
              <>
                <div className="relative flex-1 min-w-[150px] max-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search vendor..."
                    value={vendorFilter}
                    onChange={e => setVendorFilter(e.target.value)}
                    className="h-8 pl-8 text-xs bg-muted/20 border-border"
                  />
                </div>
                <div className="relative flex-1 min-w-[150px] max-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search project..."
                    value={projectFilter}
                    onChange={e => setProjectFilter(e.target.value)}
                    className="h-8 pl-8 text-xs bg-muted/20 border-border"
                  />
                </div>
              </>
            )}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-muted-foreground hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}