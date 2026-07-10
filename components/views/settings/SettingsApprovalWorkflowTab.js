'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';

export default function SettingsApprovalWorkflowTab() {
  const { call } = useAppState();
  const [workflows, setWorkflows] = useState([]);
  
  useEffect(() => {
    call('getApprovalWorkflows')
      .then(res => setWorkflows(Array.isArray(res) ? res : []))
      .catch(e => { console.error(e); setWorkflows([]); });
  }, [call]);

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map(wf => (
              <TableRow key={wf.id}>
                <TableCell className="font-medium capitalize">{(wf.module_type || '').replace('_', ' ')}</TableCell>
                <TableCell>{wf.name}</TableCell>
                <TableCell><Badge variant={wf.is_active ? 'success' : 'secondary'}>{wf.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>v{wf.version}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
