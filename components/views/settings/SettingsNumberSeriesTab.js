'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '../../../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';
import { toast } from '../../ui/Toast';
import { Edit } from 'lucide-react';

export default function SettingsNumberSeriesTab() {
  const { call } = useAppState();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ prefix: '', current_number: 0 });

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
        current_number: Number(formData.current_number)
      });
      toast.success('Updated successfully');
      setEditingId(null);
      setFormData({ prefix: '', current_number: 0 });
      loadData();
    } catch (e) {
      toast.error(e.message || 'Error saving number series');
    }
  };

  const handleEdit = (cfg) => {
    setEditingId(cfg.id);
    setFormData({ prefix: cfg.prefix || '', current_number: cfg.current_number });
  };

  return (
    <Card className="border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-200">Number Series Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        {editingId && (
          <div className="flex gap-4 mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-800 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Prefix (e.g. PO-)</label>
              <Input value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Current Number</label>
              <Input type="number" value={formData.current_number} onChange={e => setFormData({...formData, current_number: e.target.value})} />
            </div>
            <Button onClick={handleSave} variant="primary">Update</Button>
            <Button onClick={() => setEditingId(null)} variant="ghost">Cancel</Button>
          </div>
        )}

        {loading ? <div className="text-slate-400 p-4">Loading...</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module Type</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Current Number</TableHead>
                <TableHead>Format</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map(cfg => (
                <TableRow key={cfg.id}>
                  <TableCell className="font-medium capitalize">{cfg.module_type.replace('_', ' ')}</TableCell>
                  <TableCell>{cfg.prefix}</TableCell>
                  <TableCell>{cfg.current_number}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-400">{cfg.prefix}{String(cfg.current_number).padStart(3, '0')}</TableCell>
                  <TableCell className="text-right flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(cfg)}><Edit className="w-4 h-4" /></Button>
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
