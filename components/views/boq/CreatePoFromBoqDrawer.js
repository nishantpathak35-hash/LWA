'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import { ShoppingCart, X, RefreshCw, CheckCircle2, AlertTriangle, Building2, Search, Filter } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function CreatePoFromBoqDrawer({
  open,
  onClose,
  boqVersionId,
  project,
  selectedItemIds = [],
  onPoCreated
}) {
  const { call, vendors = [] } = useAppState();
  const [allItems, setAllItems] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  // Form Fields
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [category, setCategory] = useState('Material');
  const [terms, setTerms] = useState('Standard Procurement Terms & Conditions');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Item adjustments map: { [itemId]: { order_qty, po_rate } }
  const [itemAdjustments, setItemAdjustments] = useState({});

  // Load items
  const loadItems = useCallback(async () => {
    if (!open || !boqVersionId) return;
    setLoading(true);
    try {
      const itemsData = await call('getBoqItemsForPoImport', { boq_version_id: boqVersionId });
      const itemsList = (itemsData || []).filter(item => Number(item.available_balance ?? (item.quantity - item.committed_qty)) > 0);
      setAllItems(itemsList);

      // Pre-fill adjustments
      const initialAdj = {};
      itemsList.forEach(it => {
        const available = Math.max(0, (it.quantity || 0) - (it.committed_qty || 0));
        initialAdj[it.id] = {
          order_qty: available,
          gst_pct: 18,
          po_rate: it.cost_rate || it.selling_rate || 0
        };
      });
      setItemAdjustments(initialAdj);

      // Initialize checked items:
      // If user passed pre-selected IDs from table, check only those.
      // Otherwise, default all items with available balance > 0 to checked!
      if (selectedItemIds && selectedItemIds.length > 0) {
        setCheckedIds(new Set(itemsList.filter(item => selectedItemIds.includes(item.id)).map(item => item.id)));
      } else {
        const withBalance = itemsList.filter(it => ((it.quantity || 0) - (it.committed_qty || 0)) > 0);
        setCheckedIds(new Set(withBalance.map(it => it.id)));
      }
    } catch (err) {
      toast.error('Failed to load BOQ items: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, open, boqVersionId, selectedItemIds]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Extract unique sections
  const sectionOptions = useMemo(() => {
    const set = new Set();
    allItems.forEach(it => {
      if (it.section_name) set.add(it.section_name);
    });
    return Array.from(set).sort();
  }, [allItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItems.filter(it => {
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
  }, [allItems, sectionFilter, search]);

  if (!open) return null;

  const toggleCheck = (itemId) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const allVisibleChecked = filteredItems.length > 0 && filteredItems.every(it => checkedIds.has(it.id));
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (allVisibleChecked) {
        filteredItems.forEach(it => next.delete(it.id));
      } else {
        filteredItems.forEach(it => next.add(it.id));
      }
      return next;
    });
  };

  const handleQtyChange = (itemId, val) => {
    setItemAdjustments(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], order_qty: parseFloat(val) || 0 }
    }));
  };

  const handleRateChange = (itemId, val) => {
    setItemAdjustments(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], po_rate: parseFloat(val) || 0 }
    }));
  };

  // Calculate totals of CHECKED items only
  const checkedItems = allItems.filter(it => checkedIds.has(it.id));
  const totalPoValue = checkedItems.reduce((acc, it) => {
    const adj = itemAdjustments[it.id] || {};
    return acc + ((adj.order_qty || 0) * (adj.po_rate || 0));
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVendorId) {
      toast.error('Please select a Vendor for this Purchase Order');
      return;
    }

    if (checkedItems.length === 0) {
      toast.error('Please check at least one line item to include in the PO');
      return;
    }

    const vendorObj = vendors.find(v => String(v.id || v.vendor_id || v.vendor_name) === selectedVendorId);
    const vendorName = vendorObj?.legal_name || vendorObj?.vendor_name || vendorObj?.name || selectedVendorId;
    const vendorCode = vendorObj?.vendor_code || vendorObj?.code || '';

    const payloadItems = checkedItems.map(it => {
      const adj = itemAdjustments[it.id] || {};
      return {
        boq_item_id: it.id,
        order_qty: adj.order_qty || 0,
        gst_pct: adj.gst_pct ?? 18,
        po_rate: adj.po_rate || 0
      };
    }).filter(i => i.order_qty > 0);

    if (payloadItems.length === 0) {
      toast.error('Please specify valid order quantities greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      const res = await call('createPoFromBoq', {
        boq_version_id: boqVersionId,
        selected_items: payloadItems,
        vendor_id: selectedVendorId,
        vendor_name: vendorName,
        vendor_code: vendorCode,
        project: project,
        category,
        terms,
        notes,
        expected_delivery_date: deliveryDate || null
      });

      toast.success(`Purchase Order ${res.po_no} successfully generated in Procurement module!`);
      onPoCreated?.(res);
    } catch (err) {
      toast.error('Failed to create PO: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isAllVisibleChecked = filteredItems.length > 0 && filteredItems.every(it => checkedIds.has(it.id));

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-3xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-purple-500/10">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-purple-500" />
              Create Purchase Order from BOQ Items
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Select items using checkboxes, customize purchase rates/quantities, and generate an official PO linked directly to this BOQ.
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Vendor & PO Details Section */}
          <div className="p-4 border-b border-border bg-card space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Target Vendor *</label>
                <select
                  required
                  value={selectedVendorId}
                  onChange={e => setSelectedVendorId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-purple-500 font-medium"
                >
                  <option value="">Select Vendor from Master</option>
                  {vendors.map(v => {
                    const id = v.id || v.vendor_id || v.vendor_name;
                    const name = v.legal_name || v.vendor_name || v.name;
                    return <option key={id} value={id}>{name} {v.vendor_code ? `(${v.vendor_code})` : ''}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">PO Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="Material">Material Supply</option>
                  <option value="Labour">Labour Contract</option>
                  <option value="Service">Services & Subcontract</option>
                  <option value="Equipment">Equipment Rental</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Expected Site Delivery</label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Notes / Work Scope</label>
                <Input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Special instructions or floor delivery ref..."
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search items by code, description or spec..."
                className="h-8 text-xs flex-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={sectionFilter}
                onChange={e => setSectionFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-card border border-border rounded-lg text-foreground font-medium"
              >
                <option value="ALL">All Work Packages ({allItems.length})</option>
                {sectionOptions.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-xs px-2.5 py-1 rounded border border-border bg-card hover:bg-muted font-medium text-foreground transition-colors shrink-0"
              >
                {isAllVisibleChecked ? 'Deselect Visible' : 'Select All Visible'}
              </button>
            </div>
          </div>

          {/* Items Adjustment List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-1">
              <span>Showing {filteredItems.length} items ({checkedIds.size} checked for PO)</span>
              <span>Available / Order Qty / PO Rate</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-muted-foreground text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                Loading BOQ line items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                No items match the current search or section filter.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map(it => {
                  const isChecked = checkedIds.has(it.id);
                  const adj = itemAdjustments[it.id] || {};
                  const lineTotal = (adj.order_qty || 0) * (adj.po_rate || 0);
                  const available = (it.quantity || 0) - (it.committed_qty || 0);

                  return (
                    <div
                      key={it.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        isChecked
                          ? 'border-purple-500/40 bg-purple-500/5 shadow-xs'
                          : 'border-border bg-card opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(it.id)}
                            className="rounded border-border text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              {it.s_no || it.item_code}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-normal py-0">
                              {it.section_name}
                            </Badge>
                            {it.location && (
                              <span className="text-[10px] text-muted-foreground">📍 {it.location}</span>
                            )}
                          </div>

                          <h5 className="text-xs font-semibold text-foreground mt-1 leading-snug">
                            {it.description}
                          </h5>

                          {it.specification && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 hover:line-clamp-none transition-all">
                              {it.specification}
                            </p>
                          )}

                          {/* Numeric Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2.5 mt-2 border-t border-border/60 items-center">
                            <div>
                              <span className="text-[10px] text-muted-foreground block">BOQ Total / Unit</span>
                              <span className="text-xs font-mono font-medium text-foreground">
                                {it.quantity} {it.unit}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-muted-foreground block">Available Balance</span>
                              <span className={`text-xs font-mono font-bold ${available > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {available} {it.unit}
                              </span>
                            </div>

                            <div>
                              <label className="text-[10px] text-foreground font-semibold block mb-0.5">Order Qty *</label>
                              <Input
                                type="number"
                                step="any"
                                disabled={!isChecked}
                                min="0" max={available}
                                value={adj.order_qty ?? ''}
                                onChange={e => handleQtyChange(it.id, e.target.value)}
                                className="text-xs font-mono font-bold h-7"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-foreground font-semibold block mb-0.5">PO Unit Rate (₹) *</label>
                              <Input
                                type="number"
                                step="any"
                                disabled={!isChecked}
                                value={adj.po_rate ?? ''}
                                onChange={e => handleRateChange(it.id, e.target.value)}
                                className="text-xs font-mono font-bold h-7"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-xs">GST %
                            <Input type="number" min="0" max="100" step="any" disabled={!isChecked}
                              value={adj.gst_pct ?? 18} className="w-20"
                              onChange={e => setItemAdjustments(prev => ({ ...prev, [it.id]: { ...prev[it.id], gst_pct: Number(e.target.value) } }))} />
                          </label>

                          <div className="flex justify-between items-center text-[11px] font-mono text-muted-foreground pt-1.5 mt-1">
                            <span>Cost Rate: {formatCurrency(it.cost_rate || 0)}</span>
                            <span>Line Total: <strong className="text-foreground font-semibold">{formatCurrency(lineTotal)}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Strip */}
          <div className="p-4 border-t border-border bg-muted/40 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">
                Total PO Value ({checkedItems.length} items selected):
              </span>
              <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
                {formatCurrency(totalPoValue)}
              </span>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || checkedItems.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-bold shadow-md"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                {submitting ? 'Generating PO...' : `Generate PO (${checkedItems.length} Items)`}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
