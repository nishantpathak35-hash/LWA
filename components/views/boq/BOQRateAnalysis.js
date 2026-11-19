'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';
import { Tag, TrendingUp, Layers, RefreshCw, SlidersHorizontal, Percent, Database } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function BOQRateAnalysis({ boqVersionId }) {
  const { call } = useAppState();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matchingMaster, setMatchingMaster] = useState(false);

  const loadData = useCallback(async () => {
    if (!boqVersionId) return;
    setLoading(true);
    try {
      const res = await call('getBoqVersion', boqVersionId);
      setData(res);
    } catch (err) {
      toast.error('Failed to load Rate Analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, boqVersionId]);

  const handleAutoMatchMaster = async () => {
    setMatchingMaster(true);
    try {
      const res = await call('autoMatchBoqWithMaster', boqVersionId);
      toast.success(`Matched ${res.matchedCount} items from Master Library! (${res.unmappedCount} unmapped set to ₹0)`);
      loadData();
    } catch (err) {
      toast.error('Failed to auto-match: ' + err.message);
    } finally {
      setMatchingMaster(false);
    }
  };
  }, [call, boqVersionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="p-16 text-center text-muted-foreground text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
        Analyzing unit rates, component markups and margins...
      </div>
    );
  }

  if (!data) return null;

  const sections = data.sections || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500" />
            Detailed Unit Rate Analysis & Markup Breakdown
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Transparent breakdown between direct cost rates, applied markups, and client contract rates
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAutoMatchMaster}
            disabled={matchingMaster}
            className="text-xs gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20 font-sans"
            title="Auto-match all items against the 680 Master Rate library items"
          >
            <Database className="w-3.5 h-3.5" />
            {matchingMaster ? 'Matching...' : 'Auto-Link Master Rates'}
          </Button>
          <div className="bg-card px-3 py-1.5 rounded-lg border border-border">
            <span className="text-muted-foreground block text-[10px]">Avg Project Margin</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">
              {data.margin_pct || 0}%
            </span>
          </div>
          <div className="bg-card px-3 py-1.5 rounded-lg border border-border">
            <span className="text-muted-foreground block text-[10px]">Total Contract Margin</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              {formatCurrency(data.gross_margin || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Sections Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="text-xs w-16 text-center">S.No</TableHead>
                <TableHead className="text-xs">Specification & Item Code</TableHead>
                <TableHead className="text-xs w-20 text-center">UOM</TableHead>
                <TableHead className="text-xs w-24 text-right">Quantity</TableHead>
                <TableHead className="text-xs w-28 text-right text-blue-600 dark:text-blue-400">Direct Cost Rate</TableHead>
                <TableHead className="text-xs w-28 text-right text-emerald-600 dark:text-emerald-400">Selling Rate</TableHead>
                <TableHead className="text-xs w-24 text-right">Unit Markup (₹)</TableHead>
                <TableHead className="text-xs w-20 text-center">Margin %</TableHead>
                <TableHead className="text-xs w-32 text-right">Total Profit (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section, sIdx) => {
                const items = section.items || [];
                const secProfit = items.reduce((acc, it) => acc + (it.margin || 0), 0);

                return (
                  <React.Fragment key={section.id}>
                    {/* Section Header */}
                    <TableRow className="bg-muted/40 font-semibold border-t-2 border-border">
                      <TableCell colSpan={2} className="py-2.5 text-xs text-foreground font-bold">
                        <span className="text-amber-600 mr-2 font-mono">[{sIdx + 1}]</span>
                        {section.name.toUpperCase()}
                      </TableCell>
                      <TableCell colSpan={6} />
                      <TableCell className="text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(secProfit)}
                      </TableCell>
                    </TableRow>

                    {/* Items */}
                    {items.map((it, iIdx) => {
                      const unitMarkup = (it.selling_rate || 0) - (it.cost_rate || 0);

                      return (
                        <TableRow key={it.id} className="hover:bg-muted/20">
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {it.s_no || `${sIdx + 1}.${iIdx + 1}`}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-foreground">{it.description}</div>
                            {it.item_code && (
                              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                {it.item_code}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {it.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {it.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                            {it.cost_rate > 0 ? (
                              <div>
                                <span>{formatCurrency(it.cost_rate)}</span>
                                {it.rate_source === 'master' && (
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-sans block leading-none mt-0.5">
                                    Master Linked
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded font-sans inline-block">
                                Unlinked (₹0)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(it.selling_rate || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-foreground">
                            {formatCurrency(unitMarkup)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              (it.margin_pct || 0) >= 20 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {it.margin_pct || 0}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(it.margin || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
