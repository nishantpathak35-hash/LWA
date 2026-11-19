'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import { FileSpreadsheet, X, Search, RefreshCw, CheckCircle2, Plus, Filter, Building2 } from 'lucide-react';
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
  const [sectionFilter, setSectionFilter] = useState('ALL');

  // Selected item IDs & custom order quantities & rates
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [orderQtys, setOrderQtys] = useState({});
  const [orderRates, setOrderRates] = useState({});

  // Sync project prop
  useEffect(() => {
    if (project) setSelectedProject(project);
  }, [project, open]);

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
      const boqItems = await call('getBoqItemsForPoImport', { boq_version_id: selectedVersionId });
      const list = boqItems || [];
      setItems(list);

      // Default quantities to available balance, and rates to cost_rate or selling_rate
      const initialQtys = {};
      const initialRates = {};
      list.forEach(it => {
        const avail = Math.max(0, (it.quantity || 0) - (it.committed_qty || 0));
        initialQtys[it.id] = avail > 0 ? avail : it.quantity;
        initialRates[it.id] = it.cost_rate || it.selling_rate || 0;
      });
      setOrderQtys(initialQtys);
      setOrderRates(initialRates);

      // Default select all items with available balance
      const withAvail = list.filter(it => ((it.quantity || 0) - (it.committed_qty || 0)) > 0);
      setSelectedIds(new Set(withAvail.length > 0 ? withAvail.map(it => it.id) : []));
    } catch (err) {
      toast.error('Failed to load BOQ items: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, selectedVersionId, open]);

  useEffect(() => {
    loadVersionItems();
  }, [loadVersionItems]);

  // Extract unique sections for filter dropdown
  const sectionOptions = useMemo(() => {
    const s = new Set();
    items.forEach(it => {
      if (it.section_name) s.add(it.section_name);
    });
    return Array.from(s).sort();
  }, [items]);

  // Filter items by section and search
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (sectionFilter !== 'ALL' && it.section_name !== sectionFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchDesc = (it.description || '').toLowerCase().includes(q);
        const matchCode = (it.item_code || '').toLowerCase().includes(q);
        const matchSno = (it.s_no || '').toLowerCase().includes(q);
        const matchSec = (it.section_name || '').toLowerCase().includes(q);
        const matchSpec = (it.specification || '').toLowerCase().includes(q);
        if (!matchDesc && !matchCode && !matchSno && !matchSec && !matchSpec) return false;
      }
      return true;
    });
  }, [items, sectionFilter, search]);

  if (!open) return null;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllVisibleSelected = filteredItems.length > 0 && filteredItems.every(it => selectedIds.has(it.id));

  const handleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        filteredItems.forEach(it => next.delete(it.id));
      } else {
        filteredItems.forEach(it => next.add(it.id));
      }
      return next;
    });
  };

  const handleImport = () => {
    const toImport = items.filter(it => selectedIds.has(it.id)).map(it => {
      const qty = parseFloat(orderQtys[it.id]) || (it.quantity - it.committed_qty) || 1;
      const rate = parseFloat(orderRates[it.id]) || it.cost_rate || it.selling_rate || 0;
      return {
        description: it.description,
        specification: it.specification || '',
        location: it.location || '',
        hsnSac: it.hsn_sac || '',
        quantity: qty,
        unit: it.unit || 'Nos',
        rate: rate,
        gstPct: 18,
        boq_item_id: it.id,
        boq_version_id: selectedVersionId
      };
    });

    if (toImport.length === 0) {
      toast.error('Please check at least one item to import');
      return;
    }

    onImportItems(toImport, selectedProject);
    toast.success(`Imported ${toImport.length} line items from BOQ into PO!`);
    onClose();
  };

  // Total estimate of selected items
  const selectedTotal = items.filter(it => selectedIds.has(it.id)).reduce((acc, it) => {
    const q = parseFloat(orderQtys[it.id]) || 0;
    const r = parseFloat(orderRates[it.id]) || it.cost_rate || it.selling_rate || 0;
    return acc + (q * r);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-3xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-amber-500/10">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              Import Line Items from Project BOQ
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Check items to import directly into this PO with pre-filled quantities, UOMs, and purchase rates
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project & BOQ Selector Strip */}
        <div className="p-3 border-b border-border bg-card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1 uppercase">Project</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500 font-semibold"
            >
              <option value="">Select Project</option>
              {projects.map((p, idx) => {
                const name = typeof p === 'string' ? p : p?.name || p?.project;
                return <option key={idx} value={name}>{name}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1 uppercase">BOQ Version</label>
            <select
              value={selectedVersionId}
              onChange={e => setSelectedVersionId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500 font-medium"
            >
              {boqList.length === 0 ? (
                <option value="">No BOQs found for this project</option>
              ) : (
                boqList.map(b => (
                  <option key={b.id} value={b.current_version_id}>
                    {b.boq_no} - {b.revision_label || `Rev ${b.version_number}`} ({b.title || 'Fit-out BOQ'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by description, specification, code..."
              className="pl-9 h-8 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-card border border-border rounded-lg text-foreground font-medium"
            >
              <option value="ALL">All Packages ({items.length})</option>
              {sectionOptions.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="text-xs px-2.5 py-1 rounded border border-border bg-card hover:bg-muted font-medium text-foreground transition-colors shrink-0"
            >
              {isAllVisibleSelected ? 'Deselect Visible' : 'Select All Visible'}
            </button>
          </div>
        </div>

        {/* Table of Line Items */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
              Loading BOQ items...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl">
              {items.length === 0
                ? 'No line items available in this BOQ version.'
                : 'No items match your search or filter.'}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-8 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={handleSelectAllVisible}
                      className="rounded border-border text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="text-xs">Item Specification & Scope</TableHead>
                  <TableHead className="text-xs w-16 text-center">UOM</TableHead>
                  <TableHead className="text-xs w-20 text-right">Available</TableHead>
                  <TableHead className="text-xs w-24 text-right">Order Qty</TableHead>
                  <TableHead className="text-xs w-28 text-right">Unit Rate (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(it => {
                  const isChecked = selectedIds.has(it.id);
                  const avail = Math.max(0, (it.quantity || 0) - (it.committed_qty || 0));

                  return (
                    <TableRow
                      key={it.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isChecked ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(it.id)}
                          className="rounded border-border text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          {it.s_no && (
                            <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              [{it.s_no}]
                            </span>
                          )}
                          {it.description}
                        </div>
                        {it.specification && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 hover:line-clamp-none transition-all">
                            {it.specification}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                          {it.section_name && <Badge variant="outline" className="text-[9px] py-0">{it.section_name}</Badge>}
                          {it.location && <span>📍 {it.location}</span>}
                          {it.make && <span>Make: {it.make}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {it.unit || 'Nos'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                        {avail}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="any"
                          disabled={!isChecked}
                          value={orderQtys[it.id] ?? ''}
                          onChange={e => setOrderQtys({ ...orderQtys, [it.id]: e.target.value })}
                          className="text-xs font-mono font-bold w-20 ml-auto h-7 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="any"
                          disabled={!isChecked}
                          value={orderRates[it.id] ?? ''}
                          onChange={e => setOrderRates({ ...orderRates, [it.id]: e.target.value })}
                          className="text-xs font-mono font-bold w-24 ml-auto h-7 text-right"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/40 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-foreground block">
              <strong>{selectedIds.size}</strong> items checked for import
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              Estimated Total: <strong className="text-foreground">{formatCurrency(selectedTotal)}</strong>
            </span>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={handleImport}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 font-bold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Import {selectedIds.size} Items into PO
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
