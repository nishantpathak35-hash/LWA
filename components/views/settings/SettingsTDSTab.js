'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '../../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import { toast } from '../../ui/Toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function SettingsTDSTab() {
  const { call } = useAppState();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ section_code: '', rate: '', description: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await call('getAllTDSSections');
      setSections(res || []);
    } catch (e) {
      toast.error('Failed to load TDS sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [call]);

  const handleSave = async () => {
    if (!formData.section_code || !formData.rate) {
      toast.error('Section Code and Rate % are required');
      return;
    }
    try {
      if (editingId) {
        await call('updateTDSSection', editingId, { 
          section_code: formData.section_code, 
          rate: Number(formData.rate),
          description: formData.description 
        });
        toast.success('Updated successfully');
      } else {
        await call('createTDSSection', { 
          section_code: formData.section_code, 
          rate: Number(formData.rate),
          description: formData.description 
        });
        toast.success('Created successfully');
      }
      setEditingId(null);
      setFormData({ section_code: '', rate: '', description: '' });
      loadData();
    } catch (e) {
      toast.error(e.message || 'Error saving TDS section');
    }
  };

  const handleEdit = (sec) => {
    setEditingId(sec.id);
    setFormData({ section_code: sec.section_code, rate: sec.rate, description: sec.description || '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this TDS section?')) return;
    try {
      await call('deleteTDSSection', id);
      toast.success('Deleted successfully');
      loadData();
    } catch (e) {
      toast.error(e.message || 'Error deleting');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await call('toggleTDSStatus', id, !currentStatus);
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await call('setDefaultTDS', id);
      toast.success('Default TDS set successfully');
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="bg-card border-border shadow-xs rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-border bg-muted/20">
        <CardTitle className="text-amber-800 dark:text-gold font-bold text-sm uppercase tracking-wider">TDS Sections Configuration</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-xl border border-border items-end">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Section Code</label>
            <Input value={formData.section_code} onChange={e => setFormData({...formData, section_code: e.target.value})} placeholder="e.g. 194C" className="bg-background text-foreground text-xs" />
          </div>
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Default %</label>
            <Input type="number" step="0.1" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} placeholder="e.g. 1.5" className="bg-background text-foreground text-xs" />
          </div>
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Description</label>
            <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Payments to contractors..." className="bg-background text-foreground text-xs" />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button onClick={handleSave} variant="primary" className="text-xs font-semibold">
              {editingId ? 'Update' : 'Add Section'}
            </Button>
            {editingId && <Button onClick={() => { setEditingId(null); setFormData({ section_code: '', rate: '', description: '' }); }} variant="ghost" className="text-xs">Cancel</Button>}
          </div>
        </div>

        {loading ? <div className="text-muted-foreground p-4 text-xs font-medium">Loading TDS sections...</div> : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-transparent">
                <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Section</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Rate %</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Description</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Status</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Default</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map(sec => (
                <TableRow key={sec.id} className="border-b border-border/70 hover:bg-muted/40 transition-colors">
                  <TableCell className="font-bold text-xs font-mono text-amber-700 dark:text-gold py-3">{sec.section_code}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100 py-3">{sec.rate}%</TableCell>
                  <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-3">{sec.description || '—'}</TableCell>
                  <TableCell className="py-3">
                    <Badge variant={sec.is_active ? 'success' : 'inactive'} className="cursor-pointer font-bold" onClick={() => handleToggleStatus(sec.id, sec.is_active)}>
                      {sec.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    {sec.is_default ? (
                      <Badge variant="primary" className="font-bold">Default</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleSetDefault(sec.id)} className="text-xs py-0 h-6 text-slate-600 dark:text-slate-400 hover:text-foreground">Set Default</Button>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(sec)} className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(sec.id)} className="h-7 w-7 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
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
