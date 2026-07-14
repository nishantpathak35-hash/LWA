'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import SettingsWorkflowEditorModal from './SettingsWorkflowEditorModal';
import { Edit } from 'lucide-react';

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

  return (
    <Card className="border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-200">Approval Workflows</CardTitle>
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
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(wf.id)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
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
