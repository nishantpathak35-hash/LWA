'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';
import {
  Plus, Trash2, Edit2, ChevronDown, ChevronRight, Save, Download, Upload,
  CheckCircle2, XCircle, Send, ShoppingCart, Search, Database, Layers,
  Lock, RefreshCw, FileSpreadsheet, Eye, SlidersHorizontal, AlertCircle
} from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';
import ItemMasterSearchDrawer from './ItemMasterSearchDrawer';
import CreatePoFromBoqDrawer from './CreatePoFromBoqDrawer';
import BOQImportModal from './BOQImportModal';

const UOM_OPTIONS = ['Nos', 'Sqft', 'Sqm', 'Rft', 'Rmt', 'Kg', 'Ton', 'Set', 'Lump Sum', 'Ltr', 'Box'];

// Editable cell helper
function EditableCell({ value, onSave, type = 'text', readOnly = false, className = '', isCurrency = false, isPercent = false }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  if (readOnly) {
    return (
      <span className={`block px-1.5 py-1 text-xs ${className}`}>
        {isCurrency ? formatCurrency(value || 0) : isPercent ? `${value || 0}%` : (value ?? '-')}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        step={type === 'number' ? 'any' : undefined}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (local !== value) onSave(local);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            setEditing(false);
            if (local !== value) onSave(local);
          } else if (e.key === 'Escape') {
            setEditing(false);
            setLocal(value);
          }
        }}
        className="w-full px-1.5 py-1 text-xs bg-card border-2 border-amber-500 rounded text-foreground focus:outline-none"
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={`cursor-pointer hover:bg-amber-500/10 hover:ring-1 hover:ring-amber-500/30 px-1.5 py-1 rounded text-xs transition-all min-h-[1.75rem] flex items-center ${className}`}
    >
      {isCurrency ? formatCurrency(value || 0) : isPercent ? `${value || 0}%` : (value || <span className="text-muted-foreground italic text-[11px]">click to edit</span>)}
    </div>
  );
}

export default function BOQEditor({ boqVersionId, onVersionUpdated }) {
  const { call, user } = useAppState();
  const [boqData, setBoqData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [viewPreset, setViewPreset] = useState('internal'); // 'client' | 'internal' | 'procurement'

  // Modals & Drawers
  const [showItemMasterDrawer, setShowItemMasterDrawer] = useState(false);
  const [targetSectionForMaster, setTargetSectionForMaster] = useState(null);
  const [showPoDrawer, setShowPoDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Selected items for PO Drawer
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());

  // Load BOQ full structure
  const loadBoq = useCallback(async () => {
    if (!boqVersionId) return;
    setLoading(true);
    try {
      const res = await call('getBoqVersion', boqVersionId);
      setBoqData(res);
    } catch (err) {
      toast.error('Failed to load BOQ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, boqVersionId]);

  useEffect(() => {
    loadBoq();
  }, [loadBoq]);

  const isApproved = boqData?.status === 'Approved';

  // Toggle section collapse
  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Add new section
  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    try {
      await call('saveBoqSection', {
        boq_version_id: boqVersionId,
        name: newSectionName.trim(),
        sort_order: (boqData?.sections?.length || 0) * 10
      });
      toast.success('Work Package section created');
      setNewSectionName('');
      setShowNewSectionModal(false);
      loadBoq();
    } catch (err) {
      toast.error('Error creating section: ' + err.message);
    }
  };

  // Delete section
  const handleDeleteSection = async (sectionId, name) => {
    if (!confirm(`Delete section "${name}" and all items under it?`)) return;
    try {
      await call('deleteBoqSection', sectionId);
      toast.success('Section deleted');
      loadBoq();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Add blank item to section
  const handleAddBlankItem = async (sectionId) => {
    if (isApproved) {
      toast.error('Approved BOQs are locked. Please create a new Revision.');
      return;
    }
    try {
      await call('saveBoqItem', {
        boq_version_id: boqVersionId,
        section_id: sectionId,
        s_no: `${boqData?.sections?.findIndex(s => s.id === sectionId) + 1 || 1}.${Date.now().toString().slice(-2)}`,
        description: 'New Line Item Specification',
        unit: 'Nos',
        quantity: 1,
        cost_rate: 0,
        selling_rate: 0
      });
      loadBoq();
    } catch (err) {
      toast.error('Failed to add item: ' + err.message);
    }
  };

  // Save updated item field
  const handleUpdateItem = async (item, field, val) => {
    if (isApproved) {
      toast.error('Approved BOQs are locked.');
      return;
    }
    try {
      const updatedItem = {
        ...item,
        [field]: field === 'quantity' || field === 'cost_rate' || field === 'selling_rate'
          ? parseFloat(val) || 0
          : val
      };
      await call('saveBoqItem', updatedItem);
      loadBoq();
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId) => {
    if (isApproved) {
      toast.error('Approved BOQs cannot be modified.');
      return;
    }
    try {
      await call('deleteBoqItem', itemId);
      toast.success('Item removed');
      loadBoq();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Handle Item Master item added
  const handleItemMasterSelected = async (masterItem) => {
    if (!targetSectionForMaster) return;
    try {
      await call('saveBoqItem', {
        boq_version_id: boqVersionId,
        section_id: targetSectionForMaster,
        item_master_id: masterItem.id,
        item_code: masterItem.item_code,
        description: masterItem.name + (masterItem.description ? ` - ${masterItem.description}` : ''),
        make: masterItem.preferred_make || '',
        unit: masterItem.unit || 'Nos',
        quantity: 1,
        cost_rate: masterItem.std_cost || 0,
        selling_rate: masterItem.std_selling_rate || 0,
        rate_source: 'master'
      });
      toast.success(`Added ${masterItem.item_code} from Master`);
      loadBoq();
    } catch (err) {
      toast.error('Error adding item: ' + err.message);
    }
  };

  // Checkbox selection for PO creation
  const toggleSelectItem = (id) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSectionItems = (section) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      const allSelected = section.items.every(it => next.has(it.id));
      section.items.forEach(it => {
        if (allSelected) next.delete(it.id);
        else next.add(it.id);
      });
      return next;
    });
  };

  // Approval Workflow
  const handleSubmitApproval = async () => {
    setActionLoading(true);
    try {
      await call('submitBoqForApproval', boqVersionId);
      toast.success('BOQ submitted for management approval');
      loadBoq();
      onVersionUpdated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await call('approveBoqVersion', boqVersionId, 'Approved by Management');
      toast.success('BOQ approved and baseline locked!');
      loadBoq();
      onVersionUpdated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRevision = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await call('createBoqRevision', boqVersionId, revisionReason || 'Scope Revision');
      toast.success(`Created Revision ${res.revision_label}!`);
      setShowRevisionModal(false);
      setRevisionReason('');
      onVersionUpdated?.(res.new_version_id);
    } catch (err) {
      toast.error('Failed to create revision: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !boqData) {
    return (
      <div className="p-16 text-center text-muted-foreground text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
        Loading spreadsheet editor...
      </div>
    );
  }

  if (!boqData) return null;

  const sections = boqData.sections || [];

  return (
    <div className="space-y-4">
      {/* Immutability Banner if Approved */}
      {isApproved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs">
            <Lock className="w-4 h-4" />
            <span>
              <strong>Approved Baseline:</strong> This version is locked for audit integrity. To make variations or scope changes, create a new Revision.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowRevisionModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Create Revision
          </Button>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          {/* View Preset Selector */}
          <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
            <button
              onClick={() => setViewPreset('client')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${viewPreset === 'client' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Client View
            </button>
            <button
              onClick={() => setViewPreset('internal')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${viewPreset === 'internal' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Internal QS View
            </button>
            <button
              onClick={() => setViewPreset('procurement')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${viewPreset === 'procurement' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Procurement View
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewSectionModal(true)}
            disabled={isApproved}
            className="text-xs gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Section
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowImportModal(true)}
            disabled={isApproved}
            className="text-xs gap-1"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Button>
        </div>

        {/* Right Actions: PO & Approval */}
        <div className="flex items-center gap-2">
          {selectedItemIds.size > 0 && (
            <Button
              size="sm"
              onClick={() => setShowPoDrawer(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 animate-pulse"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Create PO ({selectedItemIds.size} items)
            </Button>
          )}

          {/* Workflow Status Buttons */}
          {boqData.status === 'Draft' && (
            <Button
              size="sm"
              onClick={handleSubmitApproval}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1"
            >
              <Send className="w-3.5 h-3.5" /> Submit for Approval
            </Button>
          )}

          {boqData.status === 'Submitted' && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Version
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/70 sticky top-0 z-20 border-b border-border text-[11px] font-semibold text-foreground uppercase tracking-wider">
              <tr>
                <th className="p-2 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="p-2 w-16 text-center">S.No</th>
                <th className="p-2 w-28">Item Code</th>
                <th className="p-2 min-w-[260px]">Description & Technical Specification</th>
                <th className="p-2 w-28">Make / Brand</th>
                <th className="p-2 w-20 text-center">Unit</th>
                <th className="p-2 w-24 text-right">Quantity</th>
                <th className="p-2 w-28 text-right">Selling Rate (₹)</th>
                <th className="p-2 w-32 text-right">Amount (₹)</th>

                {/* Internal Columns */}
                {(viewPreset === 'internal' || viewPreset === 'procurement') && (
                  <>
                    <th className="p-2 w-28 text-right text-blue-600 dark:text-blue-400">Cost Rate (₹)</th>
                    <th className="p-2 w-32 text-right text-blue-600 dark:text-blue-400">Cost Amount (₹)</th>
                    <th className="p-2 w-24 text-right text-amber-600 dark:text-amber-400">Margin</th>
                    <th className="p-2 w-20 text-center text-amber-600 dark:text-amber-400">Margin %</th>
                  </>
                )}

                {/* Procurement Columns */}
                {viewPreset === 'procurement' && (
                  <>
                    <th className="p-2 w-24 text-right text-purple-600 dark:text-purple-400">Committed</th>
                    <th className="p-2 w-24 text-right text-purple-600 dark:text-purple-400">Available</th>
                  </>
                )}

                <th className="p-2 w-16 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border text-xs">
              {sections.map((section, sIdx) => {
                const isCollapsed = collapsedSections[section.id];
                const items = section.items || [];
                const secSelling = items.reduce((acc, it) => acc + (it.amount || 0), 0);
                const secCost = items.reduce((acc, it) => acc + (it.cost_amount || 0), 0);
                const secMargin = secSelling - secCost;
                const secMarginPct = secSelling > 0 ? Math.round((secMargin / secSelling) * 10000) / 100 : 0;

                return (
                  <React.Fragment key={section.id}>
                    {/* Section Header Row */}
                    <tr className="bg-muted/40 hover:bg-muted/60 font-semibold border-t-2 border-border">
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={items.length > 0 && items.every(it => selectedItemIds.has(it.id))}
                          onChange={() => selectAllSectionItems(section)}
                          className="rounded border-border"
                        />
                      </td>
                      <td colSpan={3} className="p-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <span className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                            [{sIdx + 1}]
                          </span>
                          <span className="font-bold text-foreground text-xs uppercase tracking-wide">
                            {section.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] ml-2 font-normal">
                            {items.length} items
                          </Badge>
                        </div>
                      </td>
                      <td colSpan={2} />
                      <td className="p-2 text-right font-mono text-xs text-muted-foreground">Subtotal</td>
                      <td className="p-2" />
                      <td className="p-2 text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(secSelling)}
                      </td>

                      {(viewPreset === 'internal' || viewPreset === 'procurement') && (
                        <>
                          <td className="p-2" />
                          <td className="p-2 text-right font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(secCost)}
                          </td>
                          <td className="p-2 text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(secMargin)}
                          </td>
                          <td className="p-2 text-center font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            {secMarginPct}%
                          </td>
                        </>
                      )}

                      {viewPreset === 'procurement' && <td colSpan={2} />}

                      <td className="p-2 text-center">
                        {!isApproved && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setTargetSectionForMaster(section.id);
                                setShowItemMasterDrawer(true);
                              }}
                              title="Add from Item Master"
                              className="p-1 hover:bg-amber-500/10 rounded text-amber-600"
                            >
                              <Database className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleAddBlankItem(section.id)}
                              title="Add blank row"
                              className="p-1 hover:bg-muted rounded text-foreground"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section.id, section.name)}
                              title="Delete section"
                              className="p-1 hover:bg-rose-500/10 rounded text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Section Line Items */}
                    {!isCollapsed && items.map((item, iIdx) => {
                      const isSelected = selectedItemIds.has(item.id);
                      const availableQty = (item.quantity || 0) - (item.committed_qty || 0);

                      return (
                        <tr key={item.id} className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-purple-500/5' : ''}`}>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(item.id)}
                              className="rounded border-border"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <EditableCell
                              value={item.s_no || `${sIdx + 1}.${iIdx + 1}`}
                              onSave={v => handleUpdateItem(item, 's_no', v)}
                              readOnly={isApproved}
                              className="text-center font-mono text-muted-foreground"
                            />
                          </td>
                          <td className="p-2">
                            <EditableCell
                              value={item.item_code}
                              onSave={v => handleUpdateItem(item, 'item_code', v)}
                              readOnly={isApproved}
                              className="font-mono text-amber-600 dark:text-amber-400 font-medium"
                            />
                          </td>
                          <td className="p-2">
                            <EditableCell
                              value={item.description}
                              onSave={v => handleUpdateItem(item, 'description', v)}
                              readOnly={isApproved}
                              className="font-medium text-foreground"
                            />
                          </td>
                          <td className="p-2">
                            <EditableCell
                              value={item.make}
                              onSave={v => handleUpdateItem(item, 'make', v)}
                              readOnly={isApproved}
                              className="text-muted-foreground"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <EditableCell
                              value={item.unit}
                              onSave={v => handleUpdateItem(item, 'unit', v)}
                              readOnly={isApproved}
                              className="text-center font-mono"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <EditableCell
                              type="number"
                              value={item.quantity}
                              onSave={v => handleUpdateItem(item, 'quantity', v)}
                              readOnly={isApproved}
                              className="text-right font-mono font-medium"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <EditableCell
                              type="number"
                              isCurrency
                              value={item.selling_rate}
                              onSave={v => handleUpdateItem(item, 'selling_rate', v)}
                              readOnly={isApproved}
                              className="text-right font-mono font-semibold text-foreground"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-foreground">
                            {formatCurrency(item.amount || 0)}
                          </td>

                          {/* Internal Rate Analysis columns */}
                          {(viewPreset === 'internal' || viewPreset === 'procurement') && (
                            <>
                              <td className="p-2 text-right">
                                <EditableCell
                                  type="number"
                                  isCurrency
                                  value={item.cost_rate}
                                  onSave={v => handleUpdateItem(item, 'cost_rate', v)}
                                  readOnly={isApproved}
                                  className="text-right font-mono text-blue-600 dark:text-blue-400"
                                />
                              </td>
                              <td className="p-2 text-right font-mono text-blue-600 dark:text-blue-400 font-medium">
                                {formatCurrency(item.cost_amount || 0)}
                              </td>
                              <td className="p-2 text-right font-mono text-amber-600 dark:text-amber-400">
                                {formatCurrency(item.margin || 0)}
                              </td>
                              <td className="p-2 text-center font-mono text-xs font-semibold">
                                <span className={`px-1.5 py-0.5 rounded ${
                                  (item.margin_pct || 0) >= 20 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                  {item.margin_pct || 0}%
                                </span>
                              </td>
                            </>
                          )}

                          {/* Procurement columns */}
                          {viewPreset === 'procurement' && (
                            <>
                              <td className="p-2 text-right font-mono text-purple-600 dark:text-purple-400">
                                {item.committed_qty || 0}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-foreground">
                                {availableQty}
                              </td>
                            </>
                          )}

                          <td className="p-2 text-center">
                            {!isApproved && (
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                title="Remove line item"
                                className="p-1 hover:bg-rose-500/10 rounded text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Grand Total Footer Strip */}
            <tfoot className="bg-muted/80 sticky bottom-0 z-20 border-t-2 border-border font-bold text-xs text-foreground">
              <tr>
                <td colSpan={6} className="p-3 text-right uppercase tracking-wider text-muted-foreground">
                  Grand Total Project BOQ:
                </td>
                <td className="p-3 text-right font-mono" />
                <td className="p-3 text-right" />
                <td className="p-3 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(boqData.total_selling_value || 0)}
                </td>

                {(viewPreset === 'internal' || viewPreset === 'procurement') && (
                  <>
                    <td className="p-3" />
                    <td className="p-3 text-right font-mono text-sm text-blue-600 dark:text-blue-400">
                      {formatCurrency(boqData.total_cost_value || 0)}
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-amber-600 dark:text-amber-400">
                      {formatCurrency(boqData.gross_margin || 0)}
                    </td>
                    <td className="p-3 text-center font-mono text-sm text-amber-600 dark:text-amber-400">
                      {boqData.margin_pct || 0}%
                    </td>
                  </>
                )}

                {viewPreset === 'procurement' && <td colSpan={2} />}
                <td className="p-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Item Master Search Drawer */}
      <ItemMasterSearchDrawer
        open={showItemMasterDrawer}
        onClose={() => setShowItemMasterDrawer(false)}
        onSelectItem={handleItemMasterSelected}
      />

      {/* Create PO Drawer */}
      <CreatePoFromBoqDrawer
        open={showPoDrawer}
        onClose={() => setShowPoDrawer(false)}
        boqVersionId={boqVersionId}
        project={boqData.project}
        selectedItemIds={Array.from(selectedItemIds)}
        onPoCreated={() => {
          setShowPoDrawer(false);
          setSelectedItemIds(new Set());
          loadBoq();
        }}
      />

      {/* Import CSV Modal */}
      <BOQImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        boqVersionId={boqVersionId}
        sections={sections}
        onImportSuccess={() => {
          setShowImportModal(false);
          loadBoq();
        }}
      />

      {/* Add Section Modal */}
      <Dialog
        open={showNewSectionModal}
        onOpenChange={setShowNewSectionModal}
        title="Add Work Package Section"
      >
        <form onSubmit={handleCreateSection} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Section Name *</label>
            <Input
              required
              autoFocus
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
              placeholder="e.g. Electrical & Low Voltage Fixtures"
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowNewSectionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              Create Section
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Create Revision Modal */}
      <Dialog
        open={showRevisionModal}
        onOpenChange={setShowRevisionModal}
        title="Create New Scope Revision"
      >
        <form onSubmit={handleCreateRevision} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            A new draft revision will be created containing all sections and items from the approved baseline. The current approved version remains immutable in historical records.
          </p>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Revision Reason / Scope Change Notes *</label>
            <textarea
              required
              rows={3}
              value={revisionReason}
              onChange={e => setRevisionReason(e.target.value)}
              placeholder="e.g. Client requested alteration in Flooring specification from Vitrified Tiles to Italian Marble..."
              className="w-full text-xs p-2 bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowRevisionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={actionLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
              {actionLoading ? 'Cloning...' : 'Generate Revision'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
