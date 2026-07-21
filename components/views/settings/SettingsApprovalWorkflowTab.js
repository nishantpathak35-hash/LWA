'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import SettingsWorkflowEditorModal from './SettingsWorkflowEditorModal';
import { Edit, Plus, Copy, Trash2 } from 'lucide-react';
import { toast } from '../../ui/Toast';

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
    <Card className="border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-slate-200">Approval Workflows</CardTitle>
        <Button variant="outline" size="sm" onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Workflow
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((wf, idx) => {
              if (!wf || typeof wf !== 'object') return null;
              return (
                <TableRow key={wf.id || idx}>
                  <TableCell className="font-medium capitalize">{String(wf.module_type || '').replace('_', ' ')}</TableCell>
                  <TableCell>{String(wf.name || '')}</TableCell>
                  <TableCell><Badge variant={wf.is_active ? 'success' : 'default'}>{wf.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>v{wf.version || 1}</TableCell>
                  <TableCell className="text-right space-x-2 text-slate-300">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(wf.id)} className="hover:bg-slate-800">
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleClone(wf.id)} className="hover:bg-slate-800">
                      <Copy className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Clone
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(wf.id)} className="hover:bg-slate-800 text-red-400 hover:text-red-300">
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
          onSave={loadWorkflows}
        />
      )}
    </Card>
  );
}

