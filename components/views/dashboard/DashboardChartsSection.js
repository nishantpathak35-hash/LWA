'use client';
import React from 'react';
import { Card } from '../../ui/core';
import { DonutChart, fmtLakhs } from './dashboard-utils';
import { GitCommit, PieChart, ArrowUpRight } from 'lucide-react';

export default function DashboardChartsSection({ stageParts, stageTotal, vendorSlices, totalVendorPayable }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Payment Flow stacked bar */}
      <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl flex flex-col justify-between hover:border-amber-500/30 transition-all">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <GitCommit className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-foreground text-sm tracking-tight">Payment Pipeline Flow</h4>
                <p className="text-xs text-muted-foreground">Disbursement pipeline distribution across workflow stages</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              Total: {stageTotal > 1 ? stageParts.reduce((a, s) => a + s.v, 0) : 0}
            </span>
          </div>

          {/* Stacked bar */}
          <div className="w-full h-3.5 bg-muted/70 rounded-full overflow-hidden flex my-5 shadow-inner">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {stageParts.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-background/50 border border-border/60 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: s.c }} />
                <span className="text-muted-foreground font-medium flex-1 truncate">{s.k}</span>
                <span className="font-bold text-foreground font-mono tabular-nums">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Vendor Exposure donut */}
      <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl flex flex-col justify-between hover:border-amber-500/30 transition-all">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-gold border border-amber-500/20">
                <PieChart className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-foreground text-sm tracking-tight">Vendor Liability Exposure</h4>
                <p className="text-xs text-muted-foreground">Top vendor payables and open commitment balance</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 mt-2">
            <div className="relative flex justify-center items-center shrink-0">
              <DonutChart slices={vendorSlices} totalVal={totalVendorPayable} />
              <div className="absolute text-center">
                <div className="text-sm font-bold text-foreground font-mono">{fmtLakhs(totalVendorPayable)}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Total Exposure</div>
              </div>
            </div>

            {/* List of top vendors */}
            <div className="flex-1 space-y-2 w-full">
              {vendorSlices.length > 0 ? (
                vendorSlices.map((s, idx) => {
                  const sharePct = totalVendorPayable > 0 ? Math.round((s.value / totalVendorPayable) * 100) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs gap-3 p-2 rounded-xl bg-background/50 border border-border/60 hover:border-border transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-foreground font-bold truncate max-w-[140px] sm:max-w-[170px]">{s.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground font-mono">{fmtLakhs(s.value)}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">{sharePct}%</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-muted-foreground py-6 font-medium">
                  No payables exposure logged.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
