import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input } from '../../ui/core';
import dynamic from 'next/dynamic';
import { Edit, Plus, Copy, Trash2, Download, Search } from 'lucide-react';
import { toast } from '../../ui/Toast';
import SortableHeader from '../../ui/SortableHeader';
import { exportToCSV, sortData } from '../../../app/lib/exportUtils';

const SettingsWorkflowEditorModal = dynamic(() => import('./SettingsWorkflowEditorModal'), { ssr: false });

export default function SettingsApprovalWorkflowTab() {
  const { call } = useAppState();
  const [workflows, setWorkflows] = useState([]);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

  // Search & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const processedWorkflows = useMemo(() => {
    let result = (workflows || []).filter(wf => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (wf.name || '').toLowerCase().includes(q) ||
             (wf.module_type || '').toLowerCase().includes(q);
    });
    return sortData(result, sortField, sortDir);
  }, [workflows, searchQuery, sortField, sortDir]);

  const handleExportCSV = () => {
    const columns = [
      { label: 'Module Type', key: 'module_type' },
      { label: 'Workflow Name', key: 'name' },
      { label: 'Status', key: 'is_active', formatter: v => v ? 'Active' : 'Inactive' },
      { label: 'Version', key: 'version' }
    ];
    exportToCSV('Approval_Workflows_Master.csv', columns, processedWorkflows);
  };

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
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between p-6 border-b border-border bg-muted/20 gap-4">
        <CardTitle className="text-amber-800 dark:text-gold font-bold text-sm uppercase tracking-wider">
          Approval Workflows ({processedWorkflows.length})
        </CardTitle>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs font-medium">
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Export CSV
          </Button>
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workflow..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8 bg-background border-input"
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleCreate} className="gap-2 text-xs font-semibold shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add Workflow
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-transparent">
              <SortableHeader field="module_type" label="Module" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} />
              <SortableHeader field="name" label="Name" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} />
              <SortableHeader field="is_active" label="Status" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} />
              <SortableHeader field="version" label="Version" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} />
              <TableHead className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedWorkflows.map((wf, idx) => {
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
