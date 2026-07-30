'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import dynamic from 'next/dynamic';
import { Edit, Plus, Copy, Trash2 } from 'lucide-react';
import { toast } from '../../ui/Toast';

const SettingsWorkflowEditorModal = dynamic(() => import('./SettingsWorkflowEditorModal'), { ssr: false });

export default function SettingsApprovalWorkflowTab() {
  const { call } = useAppState();
  const [workflows, setWorkflows] = useState([]);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

  const loadWorkflows = () => {
    call('getApprovalWorkflows', null)
      .then(res => setWorkflows(Array.isArray(res) ? res : []))
      .catch(e => { console.error(e); setWorkflows([]); });
  };

  useEffect(() => {
    loadWorkflows();
  }, [call]);

  const handleEdit = (id) => {
    setSelectedWorkflowId(id);
    setEditModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedWorkflowId(null);
    setEditModalOpen(true);
  };

  const handleClone = async (id) => {
    try {
      await call('cloneApprovalWorkflow', id);
      toast.success('Workflow cloned successfully.');
      loadWorkflows();
    } catch (err) {
      toast.error('Failed to clone workflow: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this approval workflow? This action cannot be undone.')) return;
    try {
      await call('deleteApprovalWorkflow', id);
      toast.success('Workflow deleted successfully.');
      loadWorkflows();
    } catch (err) {
      toast.error('Failed to delete workflow: ' + err.message);
    }
  };

  return (
    <Card className="bg-card border-border shadow-xs rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-border bg-muted/20">
        <CardTitle className="text-amber-800 dark:text-gold font-bold text-sm uppercase tracking-wider">Approval Workflows</CardTitle>
        <Button variant="primary" size="sm" onClick={handleCreate} className="gap-2 text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Workflow
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-transparent">
              <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Module</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Name</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Status</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">Version</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((wf, idx) => {
              if (!wf || typeof wf !== 'object') return null;
              return (
                <TableRow key={wf.id || idx} className="border-b border-border/70 hover:bg-muted/40 transition-colors">
                  <TableCell className="font-bold text-xs capitalize text-slate-900 dark:text-slate-100 py-3">{String(wf.module_type || '').replace('_', ' ')}</TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200 py-3">{String(wf.name || '')}</TableCell>
                  <TableCell className="py-3"><Badge variant={wf.is_active ? 'success' : 'inactive'} className="font-bold">{wf.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400 py-3">v{wf.version || 1}</TableCell>
                  <TableCell className="text-right space-x-1 py-3">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(wf.id)} className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10">
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleClone(wf.id)} className="h-7 text-xs text-amber-700 dark:text-gold hover:bg-amber-50 dark:hover:bg-gold/10">
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Clone
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(wf.id)} className="h-7 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      
      {editModalOpen && (
        <SettingsWorkflowEditorModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          workflowId={selectedWorkflowId}
          onSaved={loadWorkflows}
        />
      )}
    </Card>
  );
}
