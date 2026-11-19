'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';
import { Layers, Download, Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function BOQBomView({ boqVersionId }) {
  const { call } = useAppState();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!boqVersionId) return;
    setLoading(true);
    try {
      const res = await call('getBoqVersion', boqVersionId);
      setData(res);
    } catch (err) {
      toast.error('Failed to load BOM: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, boqVersionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="p-16 text-center text-muted-foreground text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
        Aggregating Bill of Materials (BOM) and component consumption...
      </div>
    );
  }

  if (!data) return null;

  // Extract all items from sections
  const allItems = [];
  (data.sections || []).forEach(sec => {
    (sec.items || []).forEach(it => {
      allItems.push({ ...it, section_name: sec.name });
    });
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            Material Consumption Schedule & Bill of Materials (BOM)
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Breakdown of raw materials, assemblies and subcomponents required for project execution
          </p>
        </div>
      </div>

      {/* BOM Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="text-xs w-20">Item Code</TableHead>
                <TableHead className="text-xs">BOQ Deliverable & Material Spec</TableHead>
                <TableHead className="text-xs">Work Package</TableHead>
                <TableHead className="text-xs w-20 text-center">Unit</TableHead>
                <TableHead className="text-xs w-24 text-right">Net Qty</TableHead>
                <TableHead className="text-xs w-24 text-right">Wastage %</TableHead>
                <TableHead className="text-xs w-28 text-right font-bold text-foreground">Gross Req. Qty</TableHead>
                <TableHead className="text-xs w-28 text-right text-blue-600 dark:text-blue-400">Unit Cost (₹)</TableHead>
                <TableHead className="text-xs w-32 text-right">Est. Material Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                    No items in this BOQ version.
                  </TableCell>
                </TableRow>
              ) : (
                allItems.map(it => {
                  const wastage = 5; // standard 5% buffer
                  const grossQty = Math.round((it.quantity || 0) * (1 + wastage / 100) * 100) / 100;
                  const totalEstCost = Math.round(grossQty * (it.cost_rate || 0) * 100) / 100;

                  return (
                    <TableRow key={it.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs text-amber-600 dark:text-amber-400">
                        {it.item_code || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{it.description}</div>
                        {it.make && (
                          <div className="text-[10px] text-muted-foreground">Make: {it.make}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {it.section_name}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {it.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {it.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {wastage}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                        {grossQty}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                        {formatCurrency(it.cost_rate || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(totalEstCost)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
