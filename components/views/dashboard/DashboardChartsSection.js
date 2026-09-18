'use client';
import React from 'react';
import { DonutChart, fmtLakhs } from './dashboard-utils';

export default function DashboardChartsSection({ stageParts, stageTotal, vendorSlices, totalVendorPayable }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Payment Pipeline */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-foreground">Payment Pipeline</h4>
          <span className="text-xs text-muted-foreground tabular-nums">
            {stageTotal > 1 ? stageParts.reduce((a, s) => a + s.v, 0) : 0} total
          </span>
        </div>

        {/* Stacked bar */}
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden flex">
          {stageParts.map((s, idx) => {
            const pct = (s.v / stageTotal) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={idx}
                style={{ width: `${pct}%`, backgroundColor: s.c }}
                className="h-full transition-all duration-300"
                title={`${s.k}: ${s.v} requests`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs">
          {stageParts.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.c }} />
              <span className="text-muted-foreground">{s.k}</span>
              <span className="font-medium text-foreground tabular-nums">{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Exposure */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-foreground">Vendor Exposure</h4>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative flex justify-center items-center shrink-0">
            <DonutChart slices={vendorSlices} totalVal={totalVendorPayable} />
            <div className="absolute text-center">
              <div className="text-sm font-semibold text-foreground tabular-nums">{fmtLakhs(totalVendorPayable)}</div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Vendor list */}
          <div className="flex-1 space-y-1.5 w-full">
            {vendorSlices.length > 0 ? (
              vendorSlices.map((s, idx) => {
                const sharePct = totalVendorPayable > 0 ? Math.round((s.value / totalVendorPayable) * 100) : 0;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs gap-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-foreground font-medium truncate">{s.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-foreground tabular-nums">{fmtLakhs(s.value)}</span>
                      <span className="text-muted-foreground w-8 text-right">{sharePct}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                No payables exposure.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
