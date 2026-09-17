'use client';

import React, { useState, useMemo } from 'react';
import { Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Input, Badge } from '../../ui/core';
import { Search, Edit2, ChevronDown, ChevronRight, TrendingUp, DollarSign, Wallet, ShieldCheck, ArrowUpRight, ArrowDownRight, Layers, BarChart3 } from 'lucide-react';
import { Sparkline, fmtLakhs, fmtPct, pct100, PaginationControls, num } from './dashboard-utils';
import { cn } from '../../../app/lib/utils';

export default function DashboardProjectLedger({
  projectsList,
  handleOpenEditModal,
  totPV, totInflow, totOut, totPendInflow,
  totBCS, totPGM, totPO, totAGM, totPendOut, totBal,
  spPV, spIn, spOutCF, spPin,
  spBCS, spPGM, spPO, spAGM, spOut, spPendOut, spBal
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'cashflow' | 'financial'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projectsList;
    return projectsList.filter(r => {
      const haystack = [r.project, r.projectName, r.clientName, r.category].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [projectsList, searchQuery]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedProjects = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, safePage]);

  const toggleExpand = (projectId) => {
    setExpandedProjectId(prev => prev === projectId ? null : projectId);
  };

  return (
    <div className="space-y-6">
      {/* ── Ledger Header & Controls ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-gold border border-amber-500/20">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Project Financial Ledger</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unified project performance, real-time treasury cashflow, BCS budgets & margin realization
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-1 bg-muted/60 border border-border/70 rounded-xl">
              <button
                type="button"
                onClick={() => { setActiveTab('overview'); setCurrentPage(1); }}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activeTab === 'overview'
                    ? "bg-card text-foreground shadow-xs font-bold border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Executive Overview
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('cashflow'); setCurrentPage(1); }}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activeTab === 'cashflow'
                    ? "bg-card text-foreground shadow-xs font-bold border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Cashflow & Inflow
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('financial'); setCurrentPage(1); }}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activeTab === 'financial'
                    ? "bg-card text-foreground shadow-xs font-bold border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Budgets & Margins
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                className="pl-8 pr-3 w-full sm:w-52 h-9 text-xs bg-background/80 border-border/80 rounded-xl"
                placeholder="Search projects or clients..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Contextual KPI Mini-Strip based on active view */}
        {activeTab === 'cashflow' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60">
            <div className="p-3 rounded-xl bg-background/60 border border-border/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Contract Value</span>
                <span className="text-base font-bold text-foreground font-mono tabular-nums">{fmtLakhs(totPV)}</span>
              </div>
              <div className="w-16 h-8 shrink-0"><Sparkline data={spPV} color="rgba(200,164,90,.95)" /></div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Inflow Received</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{fmtLakhs(totInflow)}</span>
              </div>
              <div className="w-16 h-8 shrink-0"><Sparkline data={spIn} color="rgba(61,214,140,.95)" /></div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Outflow (Paid)</span>
                <span className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">{fmtLakhs(totOut)}</span>
              </div>
              <div className="w-16 h-8 shrink-0"><Sparkline data={spOutCF} color="rgba(239,68,68,.95)" /></div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider block">Pending Inflow</span>
                <span className="text-base font-bold text-amber-600 dark:text-amber-500 font-mono tabular-nums">{fmtLakhs(totPendInflow)}</span>
              </div>
              <div className="w-16 h-8 shrink-0"><Sparkline data={spPin} color="rgba(245,158,11,.95)" /></div>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-3 border-t border-border/60">
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/70">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">BCS Budget</span>
              <span className="text-sm font-bold text-foreground font-mono tabular-nums">{fmtLakhs(totBCS)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/70">
              <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">Planned GM</span>
              <span className="text-sm font-bold text-violet-600 dark:text-violet-400 font-mono tabular-nums">{fmtLakhs(totPGM)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/70">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">PO Issued</span>
              <span className="text-sm font-bold text-foreground font-mono tabular-nums">{fmtLakhs(totPO)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/70">
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Actual GM</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{fmtLakhs(totAGM)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/70">
              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Outflow Paid</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">{fmtLakhs(totOut)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/70">
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider block">Pending Outflow</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-500 font-mono tabular-nums">{fmtLakhs(totPendOut)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border/70">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Net Balance</span>
              <span className={cn("text-sm font-bold font-mono tabular-nums", totBal < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                {fmtLakhs(totBal)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Master Table ── */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            {activeTab === 'overview' && (
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Project / Client</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Contract (BOQ)</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase tracking-wider min-w-44">Inflow vs Outflow</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actual GM</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Available Balance</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase tracking-wider">Cash Health</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase tracking-wider w-20">Action</TableHead>
              </TableRow>
            )}

            {activeTab === 'cashflow' && (
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Project / Client</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">BOQ Value (w/ Tax)</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Inflow Received</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">Outflow (Paid)</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Net Cash Buffer</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-500">Pending Inflow</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase tracking-wider w-20">Action</TableHead>
              </TableRow>
            )}

            {activeTab === 'financial' && (
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Project / Client</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">BOQ Value</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">BCS Budget</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400">Planned GM</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">PO Issued</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Actual GM</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Achieved %</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">Outflow Paid</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-500">Pending Outflow</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Available Balance</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase tracking-wider w-20">Action</TableHead>
              </TableRow>
            )}
          </TableHeader>

          <TableBody>
            {paginatedProjects.length > 0 ? (
              paginatedProjects.map((r, idx) => {
                const projectId = r.project || `proj-${idx}`;
                const isExpanded = expandedProjectId === projectId;
                const boq = num(r.projectValueTax || r.projectValue);
                const inflow = num(r.inflow);
                const outflow = num(r.outflow);
                const bcs = num(r.bcs);
                const plannedGM = num(r.plannedGM);
                const actualGM = num(r.actualGM);
                const bal = num(r.balanceAvailable);
                const pendingInflow = num(r.pendingInflow);
                const pendingOutflow = num(r.pendingOutflow);
                const poIssued = num(r.poIssued);
                const cashBuffer = inflow - outflow;
                const collectionPct = boq > 0 ? Math.min(Math.round((inflow / boq) * 100), 100) : 0;
                const outflowPctOfInflow = inflow > 0 ? Math.min(Math.round((outflow / inflow) * 100), 100) : (outflow > 0 ? 100 : 0);

                return (
                  <React.Fragment key={projectId}>
                    <TableRow className={cn("hover:bg-muted/30 transition-colors border-b border-border/50", isExpanded && "bg-muted/20")}>
                      {/* Expand Toggle */}
                      <TableCell className="w-8 pl-4 pr-1">
                        <button
                          type="button"
                          onClick={() => toggleExpand(projectId)}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Toggle details"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-600 dark:text-gold" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </TableCell>

                      {/* Project / Client Cell */}
                      <TableCell>
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <span>{r.project}</span>
                        </div>
                        {r.clientName && r.clientName !== r.project && (
                          <div className="text-xs text-muted-foreground font-medium">{r.clientName}</div>
                        )}
                      </TableCell>

                      {/* View: Overview */}
                      {activeTab === 'overview' && (
                        <>
                          <TableCell className="text-right font-medium text-foreground tabular-nums">
                            {fmtLakhs(boq)}
                          </TableCell>

                          {/* Inflow vs Outflow Dual Bar */}
                          <TableCell className="min-w-44">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[11px] font-semibold">
                                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">In: {fmtLakhs(inflow)}</span>
                                <span className="text-rose-600 dark:text-rose-400 tabular-nums">Out: {fmtLakhs(outflow)}</span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                                <div
                                  className="h-full bg-emerald-500 rounded-l-full transition-all"
                                  style={{ width: `${Math.min(100, (inflow / (boq || 1)) * 100)}%` }}
                                  title={`Inflow: ${fmtLakhs(inflow)}`}
                                />
                                <div
                                  className="h-full bg-rose-500 rounded-r-full transition-all"
                                  style={{ width: `${Math.min(100, (outflow / (boq || 1)) * 100)}%` }}
                                  title={`Outflow: ${fmtLakhs(outflow)}`}
                                />
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {fmtLakhs(actualGM)}
                            <div className="text-[10px] text-muted-foreground font-medium">{fmtPct(pct100(r.actualGMPct))}</div>
                          </TableCell>

                          <TableCell className={cn("text-right font-bold tabular-nums", bal < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                            {fmtLakhs(bal)}
                          </TableCell>

                          <TableCell className="text-center">
                            {cashBuffer >= 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <ArrowUpRight className="w-3 h-3" /> +{fmtLakhs(cashBuffer)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                <ArrowDownRight className="w-3 h-3" /> {fmtLakhs(cashBuffer)}
                              </span>
                            )}
                          </TableCell>
                        </>
                      )}

                      {/* View: Cashflow */}
                      {activeTab === 'cashflow' && (
                        <>
                          <TableCell className="text-right font-medium text-foreground tabular-nums">
                            {fmtLakhs(boq)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {fmtLakhs(inflow)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                            {fmtLakhs(outflow)}
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            <span className={cashBuffer >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                              {cashBuffer >= 0 ? `+${fmtLakhs(cashBuffer)}` : fmtLakhs(cashBuffer)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-amber-600 dark:text-amber-500 tabular-nums">
                            {fmtLakhs(pendingInflow)}
                          </TableCell>
                        </>
                      )}

                      {/* View: Financial */}
                      {activeTab === 'financial' && (
                        <>
                          <TableCell className="text-right font-medium text-foreground tabular-nums">{fmtLakhs(boq)}</TableCell>
                          <TableCell className="text-right font-medium text-foreground tabular-nums">{fmtLakhs(bcs)}</TableCell>
                          <TableCell className="text-right font-bold text-violet-600 dark:text-violet-400 tabular-nums">{fmtLakhs(plannedGM)}</TableCell>
                          <TableCell className="text-right font-medium text-foreground tabular-nums">{fmtLakhs(poIssued)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtLakhs(actualGM)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtPct(pct100(r.actualGMPct))}</TableCell>
                          <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">{fmtLakhs(outflow)}</TableCell>
                          <TableCell className="text-right font-bold text-amber-600 dark:text-amber-500 tabular-nums">{fmtLakhs(pendingOutflow)}</TableCell>
                          <TableCell className={cn("text-right font-bold tabular-nums", bal < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                            {fmtLakhs(bal)}
                          </TableCell>
                        </>
                      )}

                      {/* Action Cell */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-amber-600 dark:text-gold hover:bg-amber-500/10 hover:text-amber-700"
                          onClick={() => handleOpenEditModal(r)}
                          title={`Edit financials for ${r.project}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* ── Expandable Project Drilldown Card ── */}
                    {isExpanded && (
                      <TableRow className="bg-muted/15 hover:bg-muted/15 border-b border-border/80">
                        <TableCell colSpan={activeTab === 'financial' ? 12 : activeTab === 'overview' ? 8 : 7} className="p-4 sm:p-6">
                          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5 shadow-xs">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-foreground text-sm tracking-tight">{r.project} Financial Breakdown</h4>
                                  <Badge variant="outline" className="text-[10px] font-bold uppercase">
                                    {cashBuffer >= 0 ? 'Cash Positive' : 'Deficit Watch'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Comprehensive treasury and budgetary posture for {r.clientName || r.project}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditModal(r)}
                                className="h-8 gap-1.5 text-xs font-bold text-amber-700 dark:text-gold border-amber-500/30 hover:bg-amber-500/10"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit Financials
                              </Button>
                            </div>

                            {/* 4 Metric Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="p-3 rounded-xl bg-muted/30 border border-border/70">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Contract BOQ</span>
                                <span className="text-base font-bold text-foreground font-mono tabular-nums">{fmtLakhs(boq)}</span>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">Base project scale</span>
                              </div>
                              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Inflow Realized</span>
                                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{fmtLakhs(inflow)}</span>
                                <span className="text-[10px] text-emerald-600/80 block mt-0.5">{collectionPct}% collected</span>
                              </div>
                              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Treasury Outflow</span>
                                <span className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">{fmtLakhs(outflow)}</span>
                                <span className="text-[10px] text-rose-600/80 block mt-0.5">{outflowPctOfInflow}% of received</span>
                              </div>
                              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider block">Net Cash Buffer</span>
                                <span className={cn("text-base font-bold font-mono tabular-nums", cashBuffer >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                  {cashBuffer >= 0 ? `+${fmtLakhs(cashBuffer)}` : fmtLakhs(cashBuffer)}
                                </span>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">Inflow minus outflow</span>
                              </div>
                            </div>

                            {/* Secondary Budget Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">BCS Budget</span>
                                <div className="font-bold text-foreground font-mono">{fmtLakhs(bcs)}</div>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-violet-600 dark:text-violet-400 uppercase font-bold">Planned GM</span>
                                <div className="font-bold text-violet-600 dark:text-violet-400 font-mono">{fmtLakhs(plannedGM)}</div>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Actual GM</span>
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{fmtLakhs(actualGM)} ({fmtPct(pct100(r.actualGMPct))})</div>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">PO Issued</span>
                                <div className="font-bold text-foreground font-mono">{fmtLakhs(poIssued)}</div>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Balance Available</span>
                                <div className={cn("font-bold font-mono", bal < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                                  {fmtLakhs(bal)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={activeTab === 'financial' ? 12 : activeTab === 'overview' ? 8 : 7} className="text-center py-12 text-muted-foreground font-medium">
                  No projects match your search criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border/70">
          <PaginationControls
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredProjects.length}
            label="projects"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
