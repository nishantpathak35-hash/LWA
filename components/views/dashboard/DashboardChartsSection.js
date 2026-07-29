'use client';
import React from 'react';
import { Card } from '../../ui/core';
import { DonutChart, fmtLakhs } from './dashboard-utils';

export default function DashboardChartsSection({ stageParts, stageTotal, vendorSlices, totalVendorPayable }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Payment Flow stacked bar */}
      <Card className="p-6 bg-card border-border shadow-xs rounded-xl">
        <div className="space-y-1 mb-6">
          <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">Payment Flow</h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Approval pipeline distribution</p>
        </div>

        {/* Stacked bar */}
        <div className="w-full h-4 bg-muted rounded-full overflow-hidden flex mb-6">
          {stageParts.map((s, idx) => {
            const pct = (s.v / stageTotal) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={idx}
                style={{ width: `${pct}%`, backgroundColor: s.c }}
                className="h-full transition-all duration-300"
                title={`${s.k}: ${s.v}`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-4">
          {stageParts.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.c }} />
              <span className="text-muted-foreground font-medium flex-1 truncate">{s.k}</span>
              <span className="font-bold text-foreground">{s.v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Vendor Exposure donut */}
      <Card className="p-6 bg-card border-border shadow-xs rounded-xl">
        <div className="space-y-1 mb-6">
          <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">Vendor Exposure</h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Top Payables Liability</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative flex justify-center items-center">
            <DonutChart slices={vendorSlices} totalVal={totalVendorPayable} />
            <div className="absolute text-center">
              <div className="text-base font-bold text-foreground font-mono">{fmtLakhs(totalVendorPayable)}</div>
              <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Total Payable</div>
            </div>
          </div>

          {/* List of top vendors */}
          <div className="flex-1 space-y-2.5 w-full">
            {vendorSlices.length > 0 ? (
              vendorSlices.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs gap-3 p-2 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-900 dark:text-slate-200 font-bold truncate">{s.label}</span>
                  </div>
                  <span className="font-bold text-amber-700 dark:text-gold font-mono whitespace-nowrap">{fmtLakhs(s.value)}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-muted-foreground py-6 font-medium">
                No payables exposure logged.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
