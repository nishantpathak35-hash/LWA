'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';
import { toast } from '../../ui/Toast';
import { Edit, Download, Search } from 'lucide-react';
import SortableHeader from '../../ui/SortableHeader';
import { exportToCSV, sortData } from '../../../app/lib/exportUtils';

export default function SettingsNumberSeriesTab() {
  const { call } = useAppState();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ prefix: '', current_number: 0, padding_length: 3 });

  // Search & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('module_type');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const processedConfigs = useMemo(() => {
    let result = (configs || []).filter(cfg => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (cfg.module_type || '').toLowerCase().includes(q) ||
             (cfg.prefix || '').toLowerCase().includes(q);
    });
    return sortData(result, sortField, sortDir);
  }, [configs, searchQuery, sortField, sortDir]);

  const handleExportCSV = () => {
    const columns = [
      { label: 'Module Type', key: 'module_type' },
      { label: 'Prefix', key: 'prefix' },
      { label: 'Current Number', key: 'current_number' },
      { label: 'Padding Length', key: 'padding_length' },
      { label: 'Sample Format', key: 'sample', formatter: (v, item) => `${item.prefix || ''}${String(item.current_number || 0).padStart(Number(item.padding_length || 3), '0')}` }
    ];
    exportToCSV('Number_Series_Configurations.csv', columns, processedConfigs);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await call('getAllNumberSeriesConfigs');
      setConfigs(res || []);
    } catch (e) {
      toast.error('Failed to load Number Series');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [call]);

  const handleSave = async () => {
    try {
      const config = configs.find(c => c.id === editingId);
      await call('updateNumberSeriesConfig', config.module_type, { 
        prefix: formData.prefix, 
        current_number: Number(formData.current_number),
        padding_length: Number(formData.padding_length)
      });
      toast.success('Updated successfully');
      setEditingId(null);
      setFormData({ prefix: '', current_number: 0, padding_length: 3 });
      loadData();
    } catch (e) {
      toast.error(e.message || 'Error saving number series');
    }
  };

  const handleEdit = (cfg) => {
    setEditingId(cfg.id);
    setFormData({ prefix: cfg.prefix || '', current_number: cfg.current_number, padding_length: cfg.padding_length !== undefined && cfg.padding_length !== null ? cfg.padding_length : 3 });
  };

  return (
    <Card className="bg-card border-border shadow-xs rounded-xl">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between p-6 border-b border-border bg-muted/20 gap-4">
        <CardTitle className="text-amber-800 dark:text-gold font-bold text-sm uppercase tracking-wider">
          Number Series Configuration ({processedConfigs.length})
        </CardTitle>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs font-medium">
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Export CSV
          </Button>
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search module or prefix..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8 bg-background border-input"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {editingId && (
          <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-xl border border-border items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Prefix (e.g. PO-)</label>
              <Input value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} className="bg-background text-foreground text-xs font-mono" />
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Current Number</label>
              <Input type="number" value={formData.current_number} onChange={e => setFormData({...formData, current_number: e.target.value})} className="bg-background text-foreground text-xs font-mono" />
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Padding Length</label>
              <Input type="number" value={formData.padding_length} onChange={e => setFormData({...formData, padding_length: e.target.value})} className="bg-background text-foreground text-xs font-mono" />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button onClick={handleSave} variant="primary" className="text-xs font-semibold">Update</Button>
              <Button onClick={() => setEditingId(null)} variant="ghost" className="text-xs">Cancel</Button>
            </div>
          </div>
        )}

        {loading ? <div className="text-muted-foreground p-4 text-xs font-medium">Loading number series...</div> : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-transparent">
                <SortableHeader field="module_type" label="Module Type" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} />
                <SortableHeader field="prefix" label="Prefix" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} />
                <SortableHeader field="current_number" label="Current Number" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} />
                <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Format Preview</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedConfigs.map(cfg => (
                <TableRow key={cfg.id} className="border-b border-border/70 hover:bg-muted/40 transition-colors">
                  <TableCell className="font-bold text-xs capitalize text-slate-900 dark:text-slate-100 py-3">{cfg.module_type.replace('_', ' ')}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-800 dark:text-slate-200 py-3">{cfg.prefix || '—'}</TableCell>
                  <TableCell className="text-xs font-mono font-bold text-amber-700 dark:text-gold py-3">{cfg.current_number}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold py-3">{cfg.prefix}{String(cfg.current_number).padStart(cfg.padding_length !== undefined && cfg.padding_length !== null ? Number(cfg.padding_length) : 3, '0')}</TableCell>
                  <TableCell className="py-3 text-right flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(cfg)} className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"><Edit className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
