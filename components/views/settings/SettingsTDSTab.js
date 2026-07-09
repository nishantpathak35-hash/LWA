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
    <Card className="border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-slate-200">TDS Sections</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-800 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">Section Code</label>
            <Input value={formData.section_code} onChange={e => setFormData({...formData, section_code: e.target.value})} placeholder="e.g. 194C" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">Default %</label>
            <Input type="number" step="0.1" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} placeholder="e.g. 1.5" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Payments to contractors..." />
          </div>
          <Button onClick={handleSave} variant="primary">
            {editingId ? 'Update' : 'Add Section'}
          </Button>
          {editingId && <Button onClick={() => { setEditingId(null); setFormData({ section_code: '', rate: '', description: '' }); }} variant="ghost">Cancel</Button>}
        </div>

        {loading ? <div className="text-slate-400 p-4">Loading...</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Rate %</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map(sec => (
                <TableRow key={sec.id}>
                  <TableCell className="font-medium">{sec.section_code}</TableCell>
                  <TableCell>{sec.rate}%</TableCell>
                  <TableCell className="text-slate-400 text-sm">{sec.description}</TableCell>
                  <TableCell>
                    <Badge variant={sec.is_active ? 'success' : 'secondary'} className="cursor-pointer" onClick={() => handleToggleStatus(sec.id, sec.is_active)}>
                      {sec.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sec.is_default ? (
                      <Badge variant="primary">Default</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleSetDefault(sec.id)} className="text-xs py-0 h-6">Set Default</Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(sec)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(sec.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
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
