'use client';

import React from 'react';
import { fmtLakhs, num } from './dashboard-utils';

export default function DashboardExecutiveKpiStrip({
  totPV,
  totInflow,
  totOut,
  totPendInflow,
  totBCS,
  totPO,
  totAGM,
  totPGM,
  totBal,
  projectsCount = 0
}) {
  const collectionPct = totPV > 0 ? Math.min(Math.round((totInflow / totPV) * 100), 100) : 0;
  const netBuffer = totInflow - totOut;
  const poCommitmentPct = totBCS > 0 ? Math.min(Math.round((totPO / totBCS) * 100), 100) : 0;

  return (
    <div className="space-y-4">
      {/* Primary metrics — larger, asymmetric layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Contract Value — featured */}
        <div className="bg-card border border-border rounded-lg p-4 col-span-2 lg:col-span-1">
          <span className="text-xs text-muted-foreground">Total Contract Value</span>
          <div className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{fmtLakhs(totPV)}</div>
          <span className="text-xs text-muted-foreground mt-1 block">{projectsCount} active projects</span>
        </div>

        {/* Inflow — featured */}
        <div className="bg-card border border-border rounded-lg p-4">
          <span className="text-xs text-muted-foreground">Inflow Realized</span>
          <div className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{fmtLakhs(totInflow)}</div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">{collectionPct}% collected</span>
        </div>

        {/* Outflow */}
        <div className="bg-card border border-border rounded-lg p-4">
          <span className="text-xs text-muted-foreground">Treasury Outflow</span>
          <div className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{fmtLakhs(totOut)}</div>
          <span className="text-xs text-muted-foreground mt-1 block">Pending: {fmtLakhs(totPendInflow)}</span>
        </div>

        {/* Cash Buffer */}
        <div className="bg-card border border-border rounded-lg p-4">
          <span className="text-xs text-muted-foreground">Net Cash Buffer</span>
          <div className={`text-2xl font-semibold mt-1 tabular-nums ${netBuffer >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {netBuffer >= 0 ? `+${fmtLakhs(netBuffer)}` : fmtLakhs(netBuffer)}
          </div>
          <span className="text-xs text-muted-foreground mt-1 block">Inflow − Outflow</span>
        </div>
      </div>

      {/* Secondary metrics — compact inline row, not more cards */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-xs">
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground">BCS Budget</span>
          <span className="font-semibold text-foreground tabular-nums">{fmtLakhs(totBCS)}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground">POs Issued</span>
          <span className="font-semibold text-foreground tabular-nums">{fmtLakhs(totPO)}</span>
          <span className="text-muted-foreground">({poCommitmentPct}%)</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground">Planned GM</span>
          <span className="font-semibold text-foreground tabular-nums">{fmtLakhs(totPGM)}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground">Actual GM</span>
          <span className="font-semibold text-foreground tabular-nums">{fmtLakhs(totAGM)}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground">Balance</span>
          <span className="font-semibold text-foreground tabular-nums">{fmtLakhs(totBal)}</span>
        </div>
      </div>
    </div>
  );
}
