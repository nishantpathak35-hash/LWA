'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import { ShoppingCart, X, RefreshCw, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [category, setCategory] = useState('Material');
  const [terms, setTerms] = useState('Standard Procurement Terms & Conditions');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Item adjustments map: { [itemId]: { order_qty, po_rate } }
  const [itemAdjustments, setItemAdjustments] = useState({});

  // Load selected item details
  const loadSelectedItems = useCallback(async () => {
    if (!open || !boqVersionId || selectedItemIds.length === 0) return;
    setLoading(true);
    try {
      const allItems = await call('getBoqItemsForPoImport', { boq_version_id: boqVersionId });
      const filtered = (allItems || []).filter(it => selectedItemIds.includes(it.id));
      setItems(filtered);

      // Pre-fill adjustment state
      const initialAdj = {};
      filtered.forEach(it => {
        const available = Math.max(0, (it.quantity || 0) - (it.committed_qty || 0));
        initialAdj[it.id] = {
          order_qty: available > 0 ? available : it.quantity,
          po_rate: it.cost_rate || 0
        };
      });
      setItemAdjustments(initialAdj);
    } catch (err) {
      toast.error('Failed to load item specs: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, open, boqVersionId, selectedItemIds]);

  useEffect(() => {
    loadSelectedItems();
  }, [loadSelectedItems]);

  if (!open) return null;

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

  // Calculate totals
  const totalPoValue = items.reduce((acc, it) => {
    const adj = itemAdjustments[it.id] || {};
    return acc + ((adj.order_qty || 0) * (adj.po_rate || 0));
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVendorId) {
      toast.error('Please select a Vendor for this Purchase Order');
      return;
    }

    const vendorObj = vendors.find(v => (v.id || v.vendor_id || v.vendor_name) === selectedVendorId);
    const vendorName = vendorObj?.vendor_name || vendorObj?.name || selectedVendorId;
    const vendorCode = vendorObj?.vendor_code || vendorObj?.code || '';

    const payloadItems = items.map(it => {
      const adj = itemAdjustments[it.id] || {};
      return {
        boq_item_id: it.id,
        order_qty: adj.order_qty || 0,
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-purple-500/10">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-purple-500" />
              Convert BOQ Items to Purchase Order
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Generates official PTS Purchase Order records and links commitments to project BOQ
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Form Options */}
          <div className="p-4 border-b border-border bg-card space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Target Vendor *</label>
                <select
                  required
                  value={selectedVendorId}
                  onChange={e => setSelectedVendorId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Select Vendor from Master</option>
                  {vendors.map(v => {
                    const id = v.id || v.vendor_id || v.vendor_name;
                    const name = v.vendor_name || v.name;
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
                <label className="text-xs font-medium text-foreground block mb-1">Notes / Instructions</label>
                <Input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Special instructions or delivery floor..."
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Items Adjustment Table */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Selected BOQ Line Items ({items.length})
            </h4>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-purple-500" />
                Loading items...
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map(it => {
                  const adj = itemAdjustments[it.id] || {};
                  const lineTotal = (adj.order_qty || 0) * (adj.po_rate || 0);
                  const available = (it.quantity || 0) - (it.committed_qty || 0);

                  return (
                    <div key={it.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              {it.item_code || it.s_no}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {it.section_name}
                            </span>
                          </div>
                          <h5 className="text-xs font-medium text-foreground mt-0.5">{it.description}</h5>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                          BOQ: {it.quantity} {it.unit}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-border/60">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">
                            Available Balance ({it.unit})
                          </label>
                          <span className={`text-xs font-mono font-bold ${available > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {available} {it.unit}
                          </span>
                        </div>

                        <div>
                          <label className="text-[10px] text-foreground font-semibold block mb-1">
                            Order Qty *
                          </label>
                          <Input
                            type="number"
                            step="any"
                            value={adj.order_qty ?? ''}
                            onChange={e => handleQtyChange(it.id, e.target.value)}
                            className="text-xs font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-foreground font-semibold block mb-1">
                            PO Unit Rate (₹) *
                          </label>
                          <Input
                            type="number"
                            step="any"
                            value={adj.po_rate ?? ''}
                            onChange={e => handleRateChange(it.id, e.target.value)}
                            className="text-xs font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="text-right text-[11px] font-mono text-muted-foreground pt-1">
                        Line Amount: <strong className="text-foreground">{formatCurrency(lineTotal)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Strip */}
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Estimated PO Value (excl. GST):</span>
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
                disabled={submitting || items.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
              >
                {submitting ? 'Generating PO...' : 'Confirm & Create PO'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
