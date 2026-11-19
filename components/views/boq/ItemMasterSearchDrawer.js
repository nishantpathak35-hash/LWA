'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import { Search, X, Plus, Database, RefreshCw, Tag } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function ItemMasterSearchDrawer({ open, onClose, onSelectItem }) {
  const { call } = useAppState();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const loadItems = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await call('getItemMasterList', { search, category, limit: 30, active_only: true });
      if (res) setItems(res.items || []);
    } catch (err) {
      toast.error('Failed to load item library: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, open, search, category]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" />
              Item Master & Rate Library
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Select pre-costed items to insert into this BOQ section
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Strip */}
        <div className="p-3 border-b border-border bg-card">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search specifications, item code, brand..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-amber-500" />
              Searching Rate Library...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No matching master items found.
            </div>
          ) : (
            items.map(it => (
              <div
                key={it.id}
                className="p-3 rounded-lg border border-border bg-card hover:border-amber-500/50 hover:bg-muted/20 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      {it.item_code}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/60">
                      {it.category}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      UOM: {it.unit}
                    </span>
                  </div>
                  <h4 className="text-xs font-medium text-foreground line-clamp-1">{it.name}</h4>
                  {it.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{it.description}</p>
                  )}
                  {it.preferred_make && (
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-1">
                      Brand: {it.preferred_make}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
                    <span className="text-muted-foreground">
                      Cost: <strong>{formatCurrency(it.std_cost || 0)}</strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Selling: <strong>{formatCurrency(it.std_selling_rate || 0)}</strong>
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">
                      Margin: {it.target_margin_pct || 0}%
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    onSelectItem(it);
                    onClose();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1 shrink-0 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
