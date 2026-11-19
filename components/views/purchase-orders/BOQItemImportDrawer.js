'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import { FileSpreadsheet, X, Search, RefreshCw, CheckCircle2, Plus } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function BOQItemImportDrawer({
  open,
  onClose,
  project,
  onImportItems
}) {
  const { call, projects = [] } = useAppState();
  const [selectedProject, setSelectedProject] = useState(project || '');
  const [boqList, setBoqList] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Selected item IDs & custom order quantities
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [orderQtys, setOrderQtys] = useState({});

  // Sync project prop
  useEffect(() => {
    if (project) setSelectedProject(project);
  }, [project]);

  // Load BOQs when project changes
  const loadBoqs = useCallback(async () => {
    if (!selectedProject || !open) return;
    setLoading(true);
    try {
      const list = await call('getBoqList', selectedProject);
      setBoqList(list || []);
      if (list && list.length > 0) {
        setSelectedVersionId(list[0].current_version_id || '');
      } else {
        setSelectedVersionId('');
        setItems([]);
      }
    } catch (err) {
      toast.error('Failed to load project BOQs: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, selectedProject, open]);

  useEffect(() => {
    loadBoqs();
  }, [loadBoqs]);

  // Load items when version changes
  const loadVersionItems = useCallback(async () => {
    if (!selectedVersionId || !open) return;
    setLoading(true);
    try {
      const boqItems = await call('getBoqItemsForPoImport', { boq_version_id: selectedVersionId, search });
      setItems(boqItems || []);

      // Default quantities to available balance
      const initialQtys = {};
      (boqItems || []).forEach(it => {
        const avail = Math.max(0, (it.quantity || 0) - (it.committed_qty || 0));
        initialQtys[it.id] = avail > 0 ? avail : it.quantity;
      });
      setOrderQtys(initialQtys);
    } catch (err) {
      toast.error('Failed to load BOQ items: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, selectedVersionId, open, search]);

  useEffect(() => {
    loadVersionItems();
  }, [loadVersionItems]);

  if (!open) return null;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(it => it.id)));
    }
  };

  const handleImport = () => {
    const toImport = items.filter(it => selectedIds.has(it.id)).map(it => {
      const qty = parseFloat(orderQtys[it.id]) || (it.quantity - it.committed_qty) || 1;
      return {
        description: it.description,
        hsnSac: it.hsn_sac || '',
        quantity: qty,
        unit: it.unit || 'Nos',
        rate: it.cost_rate || 0,
        gstPct: 18,
        boq_item_id: it.id,
        boq_version_id: selectedVersionId
      };
    });

    if (toImport.length === 0) {
      toast.error('Please select at least one item to import');
      return;
    }

    onImportItems(toImport);
    toast.success(`Imported ${toImport.length} line items from BOQ into PO!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-amber-500/10">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              Import Line Items from Project BOQ
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pull approved specifications, measured quantities, and target purchase rates directly into this PO
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project & BOQ Selector Strip */}
        <div className="p-3 border-b border-border bg-card grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1 uppercase">Project</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Select Project</option>
              {projects.map(p => {
                const name = typeof p === 'string' ? p : p?.project || p?.name;
                return <option key={name} value={name}>{name}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1 uppercase">BOQ Version</label>
            <select
              value={selectedVersionId}
              onChange={e => setSelectedVersionId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
            >
              {boqList.length === 0 ? (
                <option value="">No BOQs for project</option>
              ) : (
                boqList.map(b => (
                  <option key={b.id} value={b.current_version_id}>
                    {b.boq_no} - {b.revision_label || `Rev ${b.version_number}`} ({b.version_status})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border bg-muted/20">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search BOQ items by specification or section..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
              Loading BOQ items...
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              No BOQ items found for this version.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead className="w-8 text-center">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onChange={handleSelectAll}
                      className="rounded border-border"
                    />
                  </TableHead>
                  <TableHead className="text-xs">Specification</TableHead>
                  <TableHead className="text-xs w-16 text-center">Unit</TableHead>
                  <TableHead className="text-xs w-20 text-right">Available</TableHead>
                  <TableHead className="text-xs w-24 text-right">Order Qty</TableHead>
                  <TableHead className="text-xs w-24 text-right">Est Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(it => {
                  const isChecked = selectedIds.has(it.id);
                  const avail = Math.max(0, (it.quantity || 0) - (it.committed_qty || 0));

                  return (
                    <TableRow key={it.id} className={`hover:bg-muted/20 ${isChecked ? 'bg-amber-500/5' : ''}`}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(it.id)}
                          className="rounded border-border"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{it.description}</div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          {it.item_code && <span className="font-mono text-amber-600">{it.item_code}</span>}
                          {it.section_name && <span>Package: {it.section_name}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {it.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                        {avail}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="any"
                          value={orderQtys[it.id] ?? ''}
                          onChange={e => setOrderQtys({ ...orderQtys, [it.id]: e.target.value })}
                          className="text-xs font-mono w-20 ml-auto h-7 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-blue-600">
                        {formatCurrency(it.cost_rate || 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            <strong>{selectedIds.size}</strong> items selected
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={handleImport}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Import to PO Form
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
