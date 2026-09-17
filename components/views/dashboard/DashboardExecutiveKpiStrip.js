'use client';

import React from 'react';
import { Card } from '../../ui/core';
import { Briefcase, ArrowDownLeft, ArrowUpRight, TrendingUp, ShieldCheck, PieChart, Coins } from 'lucide-react';
import { Sparkline, fmtLakhs, fmtPct, num } from './dashboard-utils';
import { cn } from '../../../app/lib/utils';

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
  spPV,
  spIn,
  spOutCF,
  projectsCount = 0
}) {
  const collectionPct = totPV > 0 ? Math.min(Math.round((totInflow / totPV) * 100), 100) : 0;
  const netBuffer = totInflow - totOut;
  const gmAchievedPct = totBCS > 0 ? ((totAGM / totBCS) * 100) : 0;
  const poCommitmentPct = totBCS > 0 ? Math.min(Math.round((totPO / totBCS) * 100), 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Contract Value (BOQ) */}
      <Card className="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Contract Value</span>
            <div className="text-xl font-bold text-foreground font-mono mt-1 tabular-nums">
              {fmtLakhs(totPV)}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-gold border border-amber-500/20 shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/60">
          <span className="text-[11px] text-muted-foreground font-medium">
            {projectsCount} Active Projects
          </span>
          <div className="w-16 h-7">
            <Sparkline data={spPV} color="rgba(200,164,90,.95)" />
          </div>
        </div>
      </Card>

      {/* 2. Inflow Received */}
      <Card className="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between hover:border-emerald-500/40 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Inflow Realized</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1 tabular-nums">
              {fmtLakhs(totInflow)}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/60">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {collectionPct}% of BOQ Collected
          </span>
          <div className="w-16 h-7">
            <Sparkline data={spIn} color="rgba(61,214,140,.95)" />
          </div>
        </div>
      </Card>

      {/* 3. Treasury Outflow */}
      <Card className="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between hover:border-rose-500/40 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Treasury Outflow</span>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono mt-1 tabular-nums">
              {fmtLakhs(totOut)}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/60">
          <span className="text-[11px] text-muted-foreground font-medium">
            Pending: <strong className="text-amber-600 dark:text-amber-500">{fmtLakhs(totPendInflow)}</strong>
          </span>
          <div className="w-16 h-7">
            <Sparkline data={spOutCF} color="rgba(239,68,68,.95)" />
          </div>
        </div>
      </Card>

      {/* 4. BCS Budget & PO Issued */}
      <Card className="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between hover:border-blue-500/40 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Budgeted Cost (BCS)</span>
            <div className="text-xl font-bold text-foreground font-mono mt-1 tabular-nums">
              {fmtLakhs(totBCS)}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/60">
          <span className="text-[11px] text-muted-foreground font-medium">
            POs Issued: <strong className="text-foreground">{fmtLakhs(totPO)}</strong> ({poCommitmentPct}%)
          </span>
        </div>
      </Card>

      {/* 5. Actual GM & Cash Buffer */}
      <Card className="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between hover:border-violet-500/40 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">Actual Gross Margin</span>
            <div className="text-xl font-bold text-violet-600 dark:text-violet-400 font-mono mt-1 tabular-nums">
              {fmtLakhs(totAGM)}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/60">
          <span className="text-[11px] font-bold">
            Cash Buffer:{' '}
            <span className={netBuffer >= 0 ? "text-emerald-600 dark:text-emerald-400 font-mono" : "text-rose-600 dark:text-rose-400 font-mono"}>
              {netBuffer >= 0 ? `+${fmtLakhs(netBuffer)}` : fmtLakhs(netBuffer)}
            </span>
          </span>
        </div>
      </Card>
    </div>
  );
}
