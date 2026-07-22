import React from 'react';
import { Button, Input, Card, CardContent } from '../../ui/core';
import { FileText, Download, Calendar } from 'lucide-react';

export default function ReportsHeader({
  handleExport, loading, data, rTypes, reportType, setReportType,
  startDate, setStartDate, endDate, setEndDate, vendorFilter, setVendorFilter, projectFilter, setProjectFilter
}) {
  return (
    <>
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5 tracking-tight">
            <FileText className="w-5 h-5 text-amber-600 dark:text-gold" />
            Financial Reports & Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Real-time tax registers, day-wise payment audit ledgers and status registers.
          </p>
        </div>
        <Button onClick={handleExport} size="sm" variant="primary" disabled={loading || !data}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Filter and Tab Options */}
      <Card>
        <CardContent className="space-y-5">
          {/* Quick Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-border pb-4">
            {rTypes.map(t => (
              <Button
                key={t.id}
                onClick={() => setReportType(t.id)}
                size="sm"
                variant={reportType === t.id ? 'primary' : 'ghost'}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {/* Contextual Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            {/* Custom filters for payment lists */}
            {['All', 'Approved', 'Rejected', 'Remit', 'Remitted'].includes(reportType) && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Vendor Search</label>
                  <Input
                    placeholder="Search vendor..."
                    value={vendorFilter}
                    onChange={e => setVendorFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Project Search</label>
                  <Input
                    placeholder="Search project..."
                    value={projectFilter}
                    onChange={e => setProjectFilter(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}