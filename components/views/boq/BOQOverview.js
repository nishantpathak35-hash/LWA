'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';
import { TrendingUp, ShieldCheck, ShoppingCart, Percent, Layers, AlertCircle, RefreshCw, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function BOQOverview({ boqVersionId, onNavigateTab }) {
  const { call } = useAppState();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!boqVersionId) return;
    setLoading(true);
    try {
      const res = await call('getBoqDashboard', boqVersionId);
      setData(res);
    } catch (err) {
      toast.error('Failed to load BOQ analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, boqVersionId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-muted-foreground text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
        Calculating project financial metrics & procurement coverage...
      </div>
    );
  }

  if (!data) return null;

  const { version, total_selling = 0, total_cost = 0, gross_margin = 0, margin_pct = 0, sections = [], procurement = {} } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total BOQ Contract Value */}
        <Card className="border-border p-4 bg-card hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Client Contract Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-foreground">
            {formatCurrency(total_selling)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-500 font-medium">Selling Price</span> · Baseline agreed
          </p>
        </Card>

        {/* Estimated Direct Cost */}
        <Card className="border-border p-4 bg-card hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Estimated Budget Cost</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-foreground">
            {formatCurrency(total_cost)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Materials + Labour + Equipment + Overheads
          </p>
        </Card>

        {/* Gross Margin */}
        <Card className="border-border p-4 bg-card hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Target Gross Margin</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(gross_margin)}
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <span>{margin_pct}% Gross Margin</span>
          </div>
        </Card>

        {/* Procurement Committed */}
        <Card className="border-border p-4 bg-card hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Procurement Coverage</span>
            <ShoppingCart className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-foreground">
            {procurement.coverage_pct || 0}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {formatCurrency(procurement.total_committed_cost || 0)} committed via POs
          </p>
        </Card>
      </div>

      {/* Procurement Coverage Breakdown Strip */}
      <Card className="border-border p-4 bg-muted/20">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              PO Commitment Status
            </h4>
            <div className="flex flex-wrap gap-4 text-xs mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <strong className="text-foreground">{procurement.fully_committed || 0}</strong> items 100% Ordered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <strong className="text-foreground">{procurement.partially_committed || 0}</strong> items Partially Ordered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <strong className="text-foreground">{procurement.uncommitted || 0}</strong> items Pending PO
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onNavigateTab?.('procurement')} className="text-xs">
              View PO Tracker <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button size="sm" onClick={() => onNavigateTab?.('editor')} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
              Open Full Editor
            </Button>
          </div>
        </div>
      </Card>

      {/* Section Summary Table */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="bg-muted/40 py-3 px-4 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
            <span>Work Package & Section Cost Breakdown</span>
            <span className="text-xs text-muted-foreground font-normal">
              {sections.length} Active Packages
            </span>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Package / Section</TableHead>
                <TableHead className="text-center text-xs w-24">Items</TableHead>
                <TableHead className="text-right text-xs">Contract Value</TableHead>
                <TableHead className="text-right text-xs">Estimated Cost</TableHead>
                <TableHead className="text-right text-xs">Gross Margin</TableHead>
                <TableHead className="text-center text-xs w-24">Margin %</TableHead>
                <TableHead className="text-center text-xs w-32">Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map(sec => {
                const secMarginPct = sec.section_selling > 0
                  ? Math.round((sec.section_margin / sec.section_selling) * 10000) / 100
                  : 0;
                const weightPct = total_selling > 0
                  ? Math.round((sec.section_selling / total_selling) * 1000) / 10
                  : 0;

                return (
                  <TableRow key={sec.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-xs text-foreground">
                      {sec.name}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {sec.item_count || 0}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground font-semibold">
                      {formatCurrency(sec.section_selling)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">
                      {formatCurrency(sec.section_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {formatCurrency(sec.section_margin)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        secMarginPct >= 20 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {secMarginPct}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {weightPct}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
