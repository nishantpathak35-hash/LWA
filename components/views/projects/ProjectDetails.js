'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Dialog, Button, Input } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';
import { Folder, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import { useAppState } from '../../StateProvider';

export default function ProjectDetails({ selectedProject, projectPOs, onUpdateProject }) {
  const { call } = useAppState();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRef, setEditRef] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editSiteAddress, setEditSiteAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      setEditRef(selectedProject.project_ref || '');
      setEditClient(selectedProject.client || '');
      setEditSiteAddress(selectedProject.site_address || '');
    }
  }, [selectedProject]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await call('updateProjectFinancials', {
        project: selectedProject.project,
        projectValue: selectedProject.projectValue,
        bcs: selectedProject.bcs,
        inflow: selectedProject.inflow,
        clientDebit: selectedProject.invoiceValue,
        tds: selectedProject.tds,
        project_ref: editRef,
        client: editClient,
        site_address: editSiteAddress
      });
      setShowEditModal(false);
      if (onUpdateProject) onUpdateProject();
    } catch (e) {
      alert("Failed to update settings: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm font-light Card rounded-xl border border-slate-900/60">
        Select a project from the left panel to inspect its ledger.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Project Details Header & Actions */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium text-slate-200">{selectedProject.project}</h2>
            {selectedProject.project_ref && (
              <Badge variant="default" className="text-[10px] uppercase tracking-wider">{selectedProject.project_ref}</Badge>
            )}
          </div>
          {selectedProject.client && (
            <p className="text-sm text-slate-400">Client: <span className="text-slate-300">{selectedProject.client}</span></p>
          )}
          {selectedProject.site_address && (
            <p className="text-sm text-slate-400 mt-2 max-w-xl whitespace-pre-line leading-relaxed">
              <span className="font-medium text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">Site Address</span>
              {selectedProject.site_address}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowEditModal(true)} className="text-slate-400 hover:text-gold">
          Edit Settings
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-900 bg-slate-950/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-gold/10 text-gold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total PO Committed</p>
              <p className="text-lg font-light text-slate-200 mt-1">{formatCurrency(selectedProject.poIssued)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-950/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Paid Outflow</p>
              <p className="text-lg font-light text-slate-200 mt-1">{formatCurrency(selectedProject.outflow)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-950/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Unspent Balance</p>
              <p className="text-lg font-light text-slate-200 mt-1">{formatCurrency(selectedProject.pendingOutflow)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* POs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-gold" />
            <CardTitle>POs Linked to {selectedProject.project}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {projectPOs.length === 0 ? (
            <div className="p-12 text-slate-500 text-center text-sm font-light">
              No purchase orders registered under this project.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">PO Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectPOs.map((po, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-slate-200">{po.po_no}</TableCell>
                    <TableCell>{po.vendor_name || 'Legacy Vendor'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          String(po.status || '').toLowerCase().includes('approved') || String(po.status || '').toLowerCase().includes('active')
                            ? 'success'
                            : String(po.status || '').toLowerCase().includes('draft')
                            ? 'default'
                            : 'pending'
                        }
                      >
                        {po.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-200">
                      {formatCurrency(po.po_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Project Settings — ${selectedProject.project}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-light mb-1 block">Project Reference</label>
            <Input
              value={editRef}
              onChange={(e) => setEditRef(e.target.value)}
              placeholder="e.g. MT-PH2-001"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-light mb-1 block">Client</label>
            <Input
              value={editClient}
              onChange={(e) => setEditClient(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-light mb-1 block">Site Address</label>
            <textarea
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all resize-none"
              rows="3"
              value={editSiteAddress}
              onChange={(e) => setEditSiteAddress(e.target.value)}
              placeholder="Enter full site address..."
            />
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-900/60">
            <Button
              variant="ghost"
              onClick={() => setShowEditModal(false)}
              className="mr-3"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
