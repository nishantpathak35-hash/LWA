'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Dialog, Button, Input } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';
import { Folder, TrendingUp, IndianRupee, Wallet } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Project Details Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-5 rounded-xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-foreground tracking-tight">{selectedProject.project}</h2>
            {selectedProject.project_ref && (
              <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">{selectedProject.project_ref}</Badge>
            )}
          </div>
          {selectedProject.client && (
            <p className="text-xs font-medium text-muted-foreground">
              Client: <span className="text-foreground font-semibold">{selectedProject.client}</span>
            </p>
          )}
          {selectedProject.site_address && (
            <p className="text-xs text-muted-foreground mt-2 max-w-xl whitespace-pre-line leading-relaxed">
              <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block mb-0.5">Site Address</span>
              {selectedProject.site_address}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="text-xs font-semibold shrink-0">
          Edit Settings
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-xs hover:border-amber-500/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-gold shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total PO Committed</p>
              <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">{formatCurrency(selectedProject.poIssued)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs hover:border-emerald-500/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Paid Outflow</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">{formatCurrency(selectedProject.outflow)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs hover:border-blue-500/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unspent Balance</p>
              <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">{formatCurrency(selectedProject.pendingOutflow)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* POs Table */}
      <Card className="bg-card border-border shadow-xs">
        <CardHeader className="border-b border-border/60 py-3.5 px-4">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-600 dark:text-gold" />
            <CardTitle className="text-sm font-bold text-foreground">POs Linked to {selectedProject.project}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {projectPOs.length === 0 ? (
            <div className="p-10 text-muted-foreground text-center text-xs font-medium">
              No purchase orders registered under this project.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">PO Number</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vendor</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">PO Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectPOs.map((po, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-amber-700 dark:text-gold">{po.po_no || po.poNo}</TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">{po.vendor_name || po.vendor || 'Vendor'}</TableCell>
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
                    <TableCell className="text-right font-bold text-xs text-foreground tabular-nums">
                      {formatCurrency(po.po_value || po.poValue || po.amount)}
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
