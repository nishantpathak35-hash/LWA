'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';
import { ShoppingCart, Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function BOQProcurementTracker({ boqVersionId, onNavigateToPO }) {
  const { call } = useAppState();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'uncommitted' | 'partial' | 'full'

  const loadProcurement = useCallback(async () => {
    if (!boqVersionId) return;
    setLoading(true);
    try {
      const res = await call('getBoqProcurementStatus', boqVersionId);
      setItems(res || []);
    } catch (err) {
      toast.error('Failed to load procurement status: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, boqVersionId]);

  useEffect(() => {
    loadProcurement();
  }, [loadProcurement]);

  // Filter items
  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      (it.description || '').toLowerCase().includes(q) ||
      (it.item_code || '').toLowerCase().includes(q) ||
      (it.section_name || '').toLowerCase().includes(q) ||
      (it.linked_pos || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    const committed = it.committed_qty || 0;
    const qty = it.quantity || 0;

    if (statusFilter === 'uncommitted') return committed === 0;
    if (statusFilter === 'partial') return committed > 0 && committed < qty;
    if (statusFilter === 'full') return committed >= qty && qty > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-purple-500" />
            BOQ-to-Procurement Traceability & PO Ledger
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Real-time synchronization between BOQ work packages and Purchase Orders created across PTS
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadProcurement} className="text-xs gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
        </Button>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search item, package, PO number..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${statusFilter === 'all' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setStatusFilter('uncommitted')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${statusFilter === 'uncommitted' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
          >
            Pending PO
          </button>
          <button
            onClick={() => setStatusFilter('partial')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${statusFilter === 'partial' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
          >
            Partially Ordered
          </button>
          <button
            onClick={() => setStatusFilter('full')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${statusFilter === 'full' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
          >
            100% Ordered
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="text-xs w-24">Item Code</TableHead>
                <TableHead className="text-xs">Specification</TableHead>
                <TableHead className="text-xs">Work Package</TableHead>
                <TableHead className="text-xs w-20 text-center">Unit</TableHead>
                <TableHead className="text-xs w-24 text-right">BOQ Qty</TableHead>
                <TableHead className="text-xs w-28 text-right text-purple-600 dark:text-purple-400 font-bold">Committed PO Qty</TableHead>
                <TableHead className="text-xs w-28 text-right font-bold text-foreground">Available Balance</TableHead>
                <TableHead className="text-xs w-32 text-center">PO Coverage</TableHead>
                <TableHead className="text-xs min-w-[140px]">Linked POs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                    Synchronizing PO ledger...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                    No matching procurement records found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(it => {
                  const qty = it.quantity || 0;
                  const committed = it.committed_qty || 0;
                  const remaining = Math.max(0, qty - committed);
                  const coveragePct = qty > 0 ? Math.min(100, Math.round((committed / qty) * 100)) : 0;
                  const isFullyCommitted = committed >= qty && qty > 0;

                  return (
                    <TableRow key={it.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {it.item_code || it.s_no}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground max-w-sm">
                        {it.description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {it.section_name}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {it.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {qty}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                        {committed}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold ${remaining > 0 ? 'text-foreground' : 'text-emerald-600'}`}>
                        {remaining}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[10px] font-bold ${isFullyCommitted ? 'text-emerald-600' : committed > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            {coveragePct}%
                          </span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isFullyCommitted ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${coveragePct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {it.linked_pos ? (
                          <div className="flex flex-wrap gap-1">
                            {it.linked_pos.split(',').map((po, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                {po}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">None (Pending)</span>
                        )}
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
