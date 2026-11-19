'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Input, Badge } from '../../ui/core';
import { Search, X, Plus, Database, RefreshCw, Tag, Sparkles, Check, ArrowRight, Layers, DollarSign, Percent } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

const STANDARD_UOMS = [
  'Sqft', 'Rft', 'Nos', 'Set', 'Lumpsum', 'Sqm', 'Rmt', 'Kg', 'Litre', 'Hour', 'Day', 'Month'
];

export default function ItemMasterSearchDrawer({
  open,
  onClose,
  boqVersionId,
  sectionId,
  sectionName = '',
  onItemAdded,
  onSelectItem
}) {
  const { call } = useAppState();

  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'create'
  const [hierarchy, setHierarchy] = useState([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  // Search tab state
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [quantities, setQuantities] = useState({});
  const [addingItemId, setAddingItemId] = useState(null);

  // Create new item state
  const [createForm, setCreateForm] = useState({
    category: '',
    subcategory: '',
    name: '',
    description: '',
    preferred_make: '',
    unit: 'Nos',
    cost_rate: '',
    selling_rate: '',
    quantity: '1'
  });
  const [savingNewItem, setSavingNewItem] = useState(false);

  // Fetch category hierarchy
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    (async () => {
      setLoadingHierarchy(true);
      try {
        const res = await call('getBoqCategoryHierarchy');
        if (isMounted && Array.isArray(res)) {
          setHierarchy(res);
        }
      } catch (err) {
        console.error('Failed to load category hierarchy:', err);
      } finally {
        if (isMounted) setLoadingHierarchy(false);
      }
    })();
    return () => { isMounted = false; };
  }, [open, call]);

  // Match section name to category on open
  useEffect(() => {
    if (!open || hierarchy.length === 0) return;

    let matchedCat = '';
    const cleanSecName = (sectionName || '').toLowerCase().replace(/^[0-9.\s]+/, '').replace(/^part\s+[a-z0-9]+\s*-\s*/i, '').trim();

    for (const cat of hierarchy) {
      const catLower = cat.name.toLowerCase();
      if (cleanSecName.includes(catLower) || catLower.includes(cleanSecName)) {
        matchedCat = cat.name;
        break;
      }
    }

    if (!matchedCat && hierarchy.length > 0) {
      matchedCat = hierarchy[0].name;
    }

    setSelectedCategory(matchedCat);
    setSelectedSubcategory('');
    setCreateForm(prev => ({
      ...prev,
      category: matchedCat,
      subcategory: ''
    }));
  }, [open, sectionName, hierarchy]);

  // Available subcategories for selected category in search tab
  const activeSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = hierarchy.find(c => c.name.toLowerCase() === selectedCategory.toLowerCase());
    return cat?.subcategories || [];
  }, [selectedCategory, hierarchy]);

  // Available subcategories for create form
  const createSubcategories = useMemo(() => {
    if (!createForm.category) return [];
    const cat = hierarchy.find(c => c.name.toLowerCase() === createForm.category.toLowerCase());
    return cat?.subcategories || [];
  }, [createForm.category, hierarchy]);

  // Load items based on filters
  const loadItems = useCallback(async () => {
    if (!open || activeTab !== 'search') return;
    setLoadingItems(true);
    try {
      const res = await call('searchMasterItems', {
        search: searchQuery,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        limit: 50
      });
      if (res) {
        setItems(res.items || []);
      }
    } catch (err) {
      toast.error('Search failed: ' + err.message);
    } finally {
      setLoadingItems(false);
    }
  }, [open, activeTab, call, searchQuery, selectedCategory, selectedSubcategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadItems]);

  // Handle quantity change in search tab
  const handleQtyChange = (itemId, val) => {
    setQuantities(prev => ({ ...prev, [itemId]: val }));
  };

  // Add existing master item to BOQ
  const handleAddExistingItem = async (masterItem) => {
    setAddingItemId(masterItem.id);
    const qty = parseFloat(quantities[masterItem.id]) || 1;
    try {
      if (onSelectItem) {
        await onSelectItem(masterItem, qty);
      }
      toast.success(`Added "${masterItem.name}" (${qty} ${masterItem.unit})`);
    } catch (err) {
      toast.error('Failed to add item: ' + err.message);
    } finally {
      setAddingItemId(null);
    }
  };

  // Live margin preview for Create New Item form
  const calculatedMargin = useMemo(() => {
    const cost = parseFloat(createForm.cost_rate) || 0;
    const sell = parseFloat(createForm.selling_rate) || 0;
    if (sell <= 0) return { pct: 0, profit: 0, isValid: false };
    const profit = sell - cost;
    const pct = ((profit / sell) * 100).toFixed(1);
    return { pct: Number(pct), profit, isValid: true };
  }, [createForm.cost_rate, createForm.selling_rate]);

  // Submit Create New Master Item form
  const handleSaveAndAddToBoq = async (e) => {
    e?.preventDefault();
    if (!createForm.name.trim()) {
      toast.error('Item Title / Name is required');
      return;
    }
    if (!createForm.category) {
      toast.error('Main Category is required');
      return;
    }

    setSavingNewItem(true);
    try {
      const res = await call('createMasterItemAndAddToBoq', {
        boq_version_id: boqVersionId,
        section_id: sectionId,
        category: createForm.category,
        subcategory: createForm.subcategory || (createSubcategories[0] || 'General'),
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        preferred_make: createForm.preferred_make.trim() || 'Custom',
        unit: createForm.unit || 'Nos',
        std_purchase_rate: parseFloat(createForm.cost_rate) || 0,
        std_selling_rate: parseFloat(createForm.selling_rate) || 0,
        quantity: parseFloat(createForm.quantity) || 1
      });

      toast.success(`Created & added "${res?.item?.description || createForm.name}" (Code: ${res?.master_item?.item_code || 'Generated'})`);

      // Reset form
      setCreateForm({
        category: selectedCategory || '',
        subcategory: '',
        name: '',
        description: '',
        preferred_make: '',
        unit: 'Nos',
        cost_rate: '',
        selling_rate: '',
        quantity: '1'
      });

      if (onItemAdded) {
        onItemAdded();
      }
      onClose();
    } catch (err) {
      toast.error('Failed to create master item: ' + err.message);
    } finally {
      setSavingNewItem(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  Indian Item Library & Master Engine
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Section target: <span className="font-semibold text-amber-600 dark:text-amber-400">{sectionName || 'Active Section'}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center gap-2 mt-4 bg-muted/60 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-amber-500" />
              Select from Library
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-amber-600 text-white shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              + Create New Item & Save to Master
            </button>
          </div>
        </div>

        {/* TAB 1: Search & Select */}
        {activeTab === 'search' && (
          <>
            {/* Filter Controls */}
            <div className="p-3 border-b border-border bg-card space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Category Dropdown */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Main Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubcategory('');
                    }}
                    className="w-full text-xs py-1.5 px-2 bg-muted/50 border border-border rounded-md text-foreground focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">All Categories ({hierarchy.length})</option>
                    {hierarchy.map(cat => (
                      <option key={cat.id || cat.code} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory Dropdown */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Subcategory Filter
                  </label>
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 bg-muted/50 border border-border rounded-md text-foreground focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">All Subcategories ({activeSubcategories.length})</option>
                    {activeSubcategories.map(sub => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item name, specification, brand, item code..."
                  className="pl-9 text-xs py-1.5"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingItems ? (
                <div className="p-12 text-center text-muted-foreground text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                  Searching Master Library...
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-border rounded-lg m-2">
                  <Database className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">No matching items found</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
                    Can't find what you need in the standard library? Add it directly to your company master and BOQ.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreateForm(prev => ({
                        ...prev,
                        category: selectedCategory || prev.category,
                        name: searchQuery
                      }));
                      setActiveTab('create');
                    }}
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Create "{searchQuery || 'New Item'}" Now
                  </Button>
                </div>
              ) : (
                items.map(it => {
                  const qty = quantities[it.id] !== undefined ? quantities[it.id] : '1';
                  const isAdding = addingItemId === it.id;
                  const purchaseRate = it.std_cost ?? it.std_purchase_rate ?? 0;
                  const sellingRate = it.std_selling_rate || 0;
                  const marginPct = it.target_margin_pct ?? (sellingRate > 0 ? (((sellingRate - purchaseRate) / sellingRate) * 100).toFixed(1) : 0);

                  return (
                    <div
                      key={it.id}
                      className="p-3 rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-muted/10 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              {it.item_code}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/60">
                              {it.category}
                            </Badge>
                            {it.subcategory && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                {it.subcategory}
                              </Badge>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                              Unit: <strong className="text-foreground">{it.unit}</strong>
                            </span>
                          </div>

                          <h4 className="text-xs font-semibold text-foreground">{it.name}</h4>
                          {it.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 font-normal">
                              {it.description}
                            </p>
                          )}
                          {it.preferred_make && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-1">
                              Make: {it.preferred_make}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rates Strip & Add Action */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50 text-[11px] font-mono">
                        <div className="flex items-center gap-3">
                          <span className="text-blue-600 dark:text-blue-400">
                            Purchase: <strong>{formatCurrency(purchaseRate)}</strong>
                          </span>
                          <span className="text-foreground font-semibold">
                            Sell: <strong>{formatCurrency(sellingRate)}</strong>
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            marginPct > 15 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            Margin: {marginPct}%
                          </span>
                        </div>

                        {/* Quantity and Add Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-sans text-muted-foreground">Qty:</span>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={qty}
                            onChange={(e) => handleQtyChange(it.id, e.target.value)}
                            className="w-14 text-center text-xs py-1 px-1 bg-muted/60 border border-border rounded font-mono"
                          />
                          <Button
                            size="sm"
                            disabled={isAdding}
                            onClick={() => handleAddExistingItem(it)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-2.5 gap-1 shrink-0 font-medium"
                          >
                            {isAdding ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-3 h-3" /> Add
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* TAB 2: Create New Master Item */}
        {activeTab === 'create' && (
          <form onSubmit={handleSaveAndAddToBoq} className="flex-1 overflow-y-auto p-4 space-y-3.5">
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-muted-foreground">
                <strong className="text-foreground font-semibold">Instant Central Sync:</strong> This item will be assigned a permanent item code, saved into your centralized Rate Master, and immediately added into this BOQ section.
              </div>
            </div>

            {/* Category & Subcategory */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Main Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.category}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    const catObj = hierarchy.find(c => c.name.toLowerCase() === newCat.toLowerCase());
                    const firstSub = catObj?.subcategories?.[0] || '';
                    setCreateForm(prev => ({
                      ...prev,
                      category: newCat,
                      subcategory: firstSub
                    }));
                  }}
                  className="w-full text-xs py-2 px-2.5 bg-muted/50 border border-border rounded-md text-foreground focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">Select Category...</option>
                  {hierarchy.map(cat => (
                    <option key={cat.id || cat.code} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Subcategory
                </label>
                <input
                  list="subcategory-options"
                  value={createForm.subcategory}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, subcategory: e.target.value }))}
                  placeholder="Select or type subcategory..."
                  className="w-full text-xs py-1.5 px-2.5 bg-muted/50 border border-border rounded-md text-foreground focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
                <datalist id="subcategory-options">
                  {createSubcategories.map(sub => (
                    <option key={sub} value={sub} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Item Title / Name */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Item Title / Name <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Modular Linear Workstation 1200x600 with Screen"
                className="text-xs"
              />
            </div>

            {/* Technical Specification */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Detailed Technical Specification
              </label>
              <textarea
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Specify dimensions, materials, finishes, thickness, hardware, mounting details..."
                className="w-full text-xs p-2 bg-muted/50 border border-border rounded-md text-foreground focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none font-normal"
              />
            </div>

            {/* UOM and Make/Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Unit of Measurement (UOM) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.unit}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full text-xs py-2 px-2.5 bg-muted/50 border border-border rounded-md text-foreground focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                >
                  {STANDARD_UOMS.map(uom => (
                    <option key={uom} value={uom}>{uom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Preferred / Approved Make
                </label>
                <Input
                  value={createForm.preferred_make}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, preferred_make: e.target.value }))}
                  placeholder="e.g. Featherlite / Haworth / Merino"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Rates and Margin Preview */}
            <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  Rate Analysis & Margin Intelligence
                </span>
                {calculatedMargin.isValid && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    calculatedMargin.pct >= 15 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
                  }`}>
                    {calculatedMargin.pct}% Target Margin
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Typical Purchase / Cost Rate (₹)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={createForm.cost_rate}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, cost_rate: e.target.value }))}
                    placeholder="0.00"
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Quoted Selling Rate (₹)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={createForm.selling_rate}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, selling_rate: e.target.value }))}
                    placeholder="0.00"
                    className="text-xs font-mono font-bold text-foreground"
                  />
                </div>
              </div>

              {calculatedMargin.isValid && (
                <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 font-mono border-t border-border/50">
                  <span>Unit Markup: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(calculatedMargin.profit)}</strong> per {createForm.unit}</span>
                  <span>Margin: <strong className="text-foreground">{calculatedMargin.pct}%</strong></span>
                </div>
              )}
            </div>

            {/* Quantity for this BOQ */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Quantity for this BOQ <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="0.01"
                step="any"
                required
                value={createForm.quantity}
                onChange={(e) => setCreateForm(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="1"
                className="text-xs font-mono w-32"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={savingNewItem}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                {savingNewItem ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving & Adding to BOQ...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Save to Master & Add to BOQ
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
