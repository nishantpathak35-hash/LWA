'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../../ui/core';
import { Search, Plus, Upload, Download, Edit2, Trash2, Check, X, RefreshCw, Layers, Database, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

const CATEGORIES = [
  'Civil & Demolition',
  'False Ceiling & Partition',
  'Flooring & Tiling',
  'Carpentry & Joinery',
  'Glass & Glazing',
  'Painting & Finishing',
  'Electrical & Lighting',
  'HVAC & Air Conditioning',
  'Plumbing & Sanitary',
  'Fire Safety',
  'Networking & IT',
  'Loose Furniture',
  'Miscellaneous & Hardware'
];

const UOM_LIST = ['Nos', 'Sqft', 'Sqm', 'Rft', 'Rmt', 'Kg', 'Ton', 'Set', 'Lump Sum', 'Ltr', 'Box', 'Roll'];

export default function SettingsItemMasterTab() {
  const { call } = useAppState();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Master Excel State
  const [exportingExcel, setExportingExcel] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [validatingExcel, setValidatingExcel] = useState(false);
  const [committingExcel, setCommittingExcel] = useState(false);
  const [excelValidation, setExcelValidation] = useState(null);

  // Form State
  const initialForm = {
    item_code: '',
    name: '',
    description: '',
    category: 'Civil & Demolition',
    subcategory: '',
    work_type: 'Supply & Installation',
    item_type: 'material',
    unit: 'Nos',
    material_spec: '',
    preferred_make: '',
    alternate_makes: '',
    hsn_sac: '',
    std_purchase_rate: 0,
    std_labour_rate: 0,
    std_equipment_cost: 0,
    std_other_cost: 0,
    overhead_pct: 10,
    std_cost: 0,
    std_selling_rate: 0,
    target_margin_pct: 25,
    lead_time_days: 7,
    min_order_qty: 1,
    wastage_pct: 5,
    is_active: 1
  };
  const [formData, setFormData] = useState(initialForm);

  // Bulk Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await call('getItemMasterList', {
        search,
        category: selectedCategory,
        page,
        limit: 25
      });
      if (res) {
        setItems(res.items || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load Item Master: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, search, selectedCategory, page]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Handle open add / edit modal
  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData(initialForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setFormData({
      id: item.id,
      item_code: item.item_code || '',
      name: item.name || '',
      description: item.description || '',
      category: item.category || 'Civil & Demolition',
      subcategory: item.subcategory || '',
      work_type: item.work_type || 'Supply & Installation',
      item_type: item.item_type || 'material',
      unit: item.unit || 'Nos',
      material_spec: item.material_spec || '',
      preferred_make: item.preferred_make || '',
      alternate_makes: item.alternate_makes || '',
      hsn_sac: item.hsn_sac || '',
      std_purchase_rate: item.std_purchase_rate || 0,
      std_labour_rate: item.std_labour_rate || 0,
      std_equipment_cost: item.std_equipment_cost || 0,
      std_other_cost: item.std_other_cost || 0,
      overhead_pct: item.overhead_pct || 10,
      std_cost: item.std_cost || 0,
      std_selling_rate: item.std_selling_rate || 0,
      target_margin_pct: item.target_margin_pct || 25,
      lead_time_days: item.lead_time_days || 7,
      min_order_qty: item.min_order_qty || 1,
      wastage_pct: item.wastage_pct || 5,
      is_active: item.is_active !== undefined ? item.is_active : 1
    });
    setModalOpen(true);
  };

  // Live Auto-Calculate Cost & Selling Rate
  const updateRates = (field, val) => {
    const updated = { ...formData, [field]: val };
    const pRate = parseFloat(field === 'std_purchase_rate' ? val : updated.std_purchase_rate) || 0;
    const lRate = parseFloat(field === 'std_labour_rate' ? val : updated.std_labour_rate) || 0;
    const eqRate = parseFloat(field === 'std_equipment_cost' ? val : updated.std_equipment_cost) || 0;
    const oRate = parseFloat(field === 'std_other_cost' ? val : updated.std_other_cost) || 0;
    const ohPct = parseFloat(field === 'overhead_pct' ? val : updated.overhead_pct) || 0;

    const baseCost = pRate + lRate + eqRate + oRate;
    const calculatedStdCost = Math.round((baseCost * (1 + ohPct / 100)) * 100) / 100;
    updated.std_cost = calculatedStdCost;

    let marginPct = parseFloat(field === 'target_margin_pct' ? val : updated.target_margin_pct) || 0;
    let sellingRate = parseFloat(field === 'std_selling_rate' ? val : updated.std_selling_rate) || 0;

    if (field === 'target_margin_pct') {
      if (marginPct < 100 && calculatedStdCost > 0) {
        sellingRate = Math.round((calculatedStdCost / (1 - marginPct / 100)) * 100) / 100;
        updated.std_selling_rate = sellingRate;
      }
    } else if (field === 'std_selling_rate') {
      if (sellingRate > 0 && calculatedStdCost > 0) {
        marginPct = Math.round(((sellingRate - calculatedStdCost) / sellingRate) * 10000) / 100;
        updated.target_margin_pct = marginPct;
      }
    } else {
      if (marginPct < 100 && calculatedStdCost > 0) {
        sellingRate = Math.round((calculatedStdCost / (1 - marginPct / 100)) * 100) / 100;
        updated.std_selling_rate = sellingRate;
      }
    }

    setFormData(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Item Name is required');
      return;
    }

    setSaving(true);
    try {
      await call('saveItemMaster', formData);
      toast.success(editItem ? 'Item updated in Rate Library' : 'New item saved to Master');
      setModalOpen(false);
      loadItems();
    } catch (err) {
      toast.error('Failed to save item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to deactivate item "${name}"?`)) return;
    try {
      await call('deleteItemMaster', id);
      toast.success('Item deactivated');
      loadItems();
    } catch (err) {
      toast.error('Failed to deactivate item: ' + err.message);
    }
  };

  // Bulk CSV Import
  const handleBulkImport = async () => {
    if (!csvText.trim()) {
      toast.error('Please paste CSV data');
      return;
    }
    setImporting(true);
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must have header row and at least 1 data row');

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const parsedItems = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length < 2) continue;

        const row = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx] || '';
        });

        parsedItems.push({
          item_code: row.item_code || row.code || '',
          name: row.name || row.item_name || parts[0],
          category: row.category || 'Civil & Demolition',
          unit: row.unit || row.uom || 'Nos',
          preferred_make: row.make || row.brand || '',
          std_purchase_rate: parseFloat(row.purchase_rate || row.rate || 0) || 0,
          std_cost: parseFloat(row.cost || row.std_cost || 0) || 0,
          std_selling_rate: parseFloat(row.selling_rate || row.price || 0) || 0,
          target_margin_pct: parseFloat(row.margin_pct || row.margin || 25) || 25
        });
      }

      const res = await call('importItemMasterBulk', parsedItems);
      toast.success(`Successfully imported ${res.imported || parsedItems.length} items to Master!`);
      setImportModalOpen(false);
      setCsvText('');
      loadItems();
    } catch (err) {
      toast.error('Bulk import error: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // ── Master Excel Download & Synchronization ──
  const handleDownloadMasterExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await call('generateMasterRateExcel');
      if (!res?.base64) throw new Error('No workbook generated');

      const byteCharacters = atob(res.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName || 'PTS_Master_Rate_Library.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Generated official 5-sheet Master Rate Library (${res.uniqueItemsExtracted} items from ${res.poLinesAnalyzed} PO lines)`);
    } catch (err) {
      toast.error('Failed to generate master rate excel: ' + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExcelFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidatingExcel(true);
    setExcelValidation(null);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const raw = evt.target.result || '';
          const base64 = String(raw).split(',')[1] || raw;
          const res = await call('parseAndValidateMasterRateExcel', { fileBase64: base64 });
          setExcelValidation(res);
          setExcelModalOpen(true);
        } catch (valErr) {
          toast.error('Validation error: ' + valErr.message);
        } finally {
          setValidatingExcel(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('File read error: ' + err.message);
      setValidatingExcel(false);
    }
    e.target.value = '';
  };

  const handleConfirmExcelImport = async () => {
    if (!excelValidation?.allValidItems?.length) return;
    setCommittingExcel(true);
    try {
      const res = await call('confirmMasterRateImport', { items: excelValidation.allValidItems });
      toast.success(`Synchronized ${res.totalImported} items (${res.createdCount} new, ${res.updatedCount} updated)`);
      setExcelModalOpen(false);
      setExcelValidation(null);
      loadItems();
    } catch (err) {
      toast.error('Import commit error: ' + err.message);
    } finally {
      setCommittingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            Central Item Master & Standard Rate Library
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage company-wide specifications, standard unit costs, client selling rates, and approved brands.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadMasterExcel}
            disabled={exportingExcel}
            className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30"
          >
            <Download className="w-3.5 h-3.5" />
            {exportingExcel ? 'Extracting POs...' : 'Download Master Rate Excel'}
          </Button>

          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFileChange} className="hidden" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              {validatingExcel ? 'Analyzing...' : 'Upload Master Excel'}
            </span>
          </label>

          <Button size="sm" variant="outline" onClick={() => setImportModalOpen(true)} className="gap-1.5 text-xs">
            <Upload className="w-3.5 h-3.5" /> Bulk CSV
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Master Item
          </Button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 gap-2 w-full md:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by code, specification, make..."
              className="pl-9 text-xs"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Categories ({totalCount})</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground self-end">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="w-7 h-7"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="w-7 h-7"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-28 text-xs font-semibold">Item Code</TableHead>
                <TableHead className="text-xs font-semibold">Description & Spec</TableHead>
                <TableHead className="text-xs font-semibold">Category</TableHead>
                <TableHead className="text-xs font-semibold">Make / Brand</TableHead>
                <TableHead className="w-20 text-xs font-semibold">Unit</TableHead>
                <TableHead className="text-right text-xs font-semibold">Std Cost</TableHead>
                <TableHead className="text-right text-xs font-semibold">Selling Rate</TableHead>
                <TableHead className="text-center text-xs font-semibold">Target Margin</TableHead>
                <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading item library...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-xs">
                    No master items found. Click "Add Master Item" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => (
                  <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs font-medium text-amber-600 dark:text-amber-400">
                      {item.item_code}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="font-medium text-foreground text-xs">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-muted/60">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {item.preferred_make || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-mono">
                      {item.unit}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-medium text-foreground">
                      {formatCurrency(item.std_cost || 0)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.std_selling_rate || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        (item.target_margin_pct || 0) >= 20 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {item.target_margin_pct || 0}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.is_active ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenEdit(item)}
                          className="w-7 h-7 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="w-7 h-7 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editItem ? `Edit Item: ${editItem.item_code}` : 'Add Master Item to Rate Library'}
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          {/* Row 1: Code & Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Item Code</label>
              <Input
                value={formData.item_code}
                onChange={e => setFormData({ ...formData, item_code: e.target.value })}
                placeholder="Auto-generated if blank"
                className="text-xs font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-foreground block mb-1">Item Name *</label>
              <Input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. 12mm Toughened Glass Partition"
                className="text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Detailed Technical Specification</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide comprehensive specs, standards, hardware inclusions..."
              className="w-full text-xs p-2 bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Category, Unit, Work Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Unit of Measurement (UOM)</label>
              <select
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground font-mono"
              >
                {UOM_LIST.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Preferred Make / Brand</label>
              <Input
                value={formData.preferred_make}
                onChange={e => setFormData({ ...formData, preferred_make: e.target.value })}
                placeholder="e.g. Saint-Gobain / Dorma"
                className="text-xs"
              />
            </div>
          </div>

          {/* Costing & Rate Breakdown Box */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              Standard Rate Analysis & Costing Engine
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Material Purchase Rate</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.std_purchase_rate}
                  onChange={e => updateRates('std_purchase_rate', e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Labour Installation</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.std_labour_rate}
                  onChange={e => updateRates('std_labour_rate', e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Equipment / Machinery</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.std_equipment_cost}
                  onChange={e => updateRates('std_equipment_cost', e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Overhead & Profit %</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.overhead_pct}
                  onChange={e => updateRates('overhead_pct', e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-foreground font-bold block mb-1">Total Std Cost Rate</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.std_cost}
                  onChange={e => updateRates('std_cost', e.target.value)}
                  className="text-xs font-mono font-bold bg-muted/60"
                />
              </div>
            </div>

            {/* Client Rate & Margin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">
                  Target Client Selling Rate (₹)
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.std_selling_rate}
                  onChange={e => updateRates('std_selling_rate', e.target.value)}
                  className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 block mb-1">
                  Gross Margin % (Auto-calculated)
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.target_margin_pct}
                  onChange={e => updateRates('target_margin_pct', e.target.value)}
                  className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving ? 'Saving...' : editItem ? 'Update Master' : 'Save to Library'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Bulk CSV Import Dialog */}
      <Dialog
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Bulk Import Items from CSV"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Paste CSV rows with headers. Format: <code className="bg-muted px-1 py-0.5 rounded font-mono">name,category,unit,make,cost,selling_rate,margin_pct</code>
          </p>
          <textarea
            rows={8}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder={`name,category,unit,make,cost,selling_rate,margin_pct\n12mm Toughened Glass,Glass & Glazing,Sqft,Saint-Gobain,220,310,29\nPOP False Ceiling,False Ceiling & Partition,Sqft,Gyproc,85,125,32`}
            className="w-full text-xs font-mono p-3 bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={importing} onClick={handleBulkImport} className="bg-amber-600 hover:bg-amber-700 text-white">
              {importing ? 'Importing...' : 'Execute Import'}
            </Button>
          </div>
        </div>
      </Dialog>
      {/* Master Excel Review & Import Dialog */}
      <Dialog
        open={excelModalOpen}
        onOpenChange={setExcelModalOpen}
        title="Review & Confirm Master Rate Excel Import"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
          {excelValidation && (
            <>
              {/* Validation Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-border bg-muted/40">
                  <span className="text-muted-foreground block text-[10px]">Valid Items Ready:</span>
                  <strong className="text-sm font-mono text-emerald-500 font-bold">
                    {excelValidation.validCount}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-muted/40">
                  <span className="text-muted-foreground block text-[10px]">Errors / Invalid:</span>
                  <strong className="text-sm font-mono text-rose-500 font-bold">
                    {excelValidation.errorCount}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-muted/40 col-span-2 sm:col-span-1">
                  <span className="text-muted-foreground block text-[10px]">Target Destination:</span>
                  <strong className="text-xs text-foreground font-semibold">
                    boq_item_master
                  </strong>
                </div>
              </div>

              {/* Error messages if any */}
              {excelValidation.errors?.length > 0 && (
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-500 space-y-1 max-h-32 overflow-y-auto">
                  <div className="font-bold">Validation Issues Found:</div>
                  {excelValidation.errors.slice(0, 10).map((err, i) => (
                    <div key={i} className="text-[11px]">
                      Row {err.row}: {err.item ? `[${err.item}] ` : ''}{err.error}
                    </div>
                  ))}
                  {excelValidation.errors.length > 10 && (
                    <div className="text-[10px] italic">...and {excelValidation.errors.length - 10} more rows</div>
                  )}
                </div>
              )}

              {/* Preview Table */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Item Preview (First {excelValidation.previewItems?.length || 0} rows)
                </div>
                <div className="border border-border rounded-lg overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase border-b border-border">
                      <tr>
                        <th className="p-2">Code</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Unit</th>
                        <th className="p-2 text-right">Cost Rate (₹)</th>
                        <th className="p-2 text-right">Selling Rate (₹)</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {excelValidation.previewItems?.map((it, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-2 font-mono text-[11px] text-amber-500">{it.item_code}</td>
                          <td className="p-2 max-w-xs truncate font-medium">{it.name}</td>
                          <td className="p-2 text-muted-foreground">{it.unit}</td>
                          <td className="p-2 font-mono text-right">{it.std_cost}</td>
                          <td className="p-2 font-mono text-right text-emerald-500 font-semibold">{it.std_selling_rate}</td>
                          <td className="p-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${it.is_existing ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {it.is_existing ? 'Update' : 'New'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setExcelModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={committingExcel || !excelValidation?.validCount}
              onClick={handleConfirmExcelImport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {committingExcel ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Synchronizing...
                </>
              ) : (
                `Confirm & Import (${excelValidation?.validCount || 0} Items)`
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
