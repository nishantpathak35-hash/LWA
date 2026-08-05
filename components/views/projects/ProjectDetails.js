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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-5 rounded-xl shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">{selectedProject.project}</h2>
            {selectedProject.project_ref && (
              <Badge variant="default" className="text-[10px] uppercase font-medium tracking-wider">{selectedProject.project_ref}</Badge>
            )}
          </div>
          {selectedProject.client && (
            <p className="text-xs font-medium text-muted-foreground">
              Client: <span className="text-foreground font-semibold">{selectedProject.client}</span>
            </p>
          )}
          {selectedProject.site_address && (
            <p className="text-xs text-muted-foreground mt-2 max-w-xl whitespace-pre-line leading-relaxed">
              <span className="font-medium text-muted-foreground uppercase text-[10px] tracking-wider block mb-0.5">Site Address</span>
              {selectedProject.site_address}
            </p>
          )}
        </div>
        <Button variant="default" size="sm" onClick={() => setShowEditModal(true)} className="text-xs font-medium shrink-0">
          Edit Settings
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total PO Committed</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums mt-0.5">{formatCurrency(selectedProject.poIssued)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Paid Outflow</p>
              <p className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">{formatCurrency(selectedProject.outflow)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Unspent Balance</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums mt-0.5">{formatCurrency(selectedProject.pendingOutflow)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* POs Table */}
      <Card className="bg-card border-border/80 shadow-2xs">
        <CardHeader className="border-b border-border/80 py-3.5 px-6">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">POs Linked to {selectedProject.project}</CardTitle>
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
                <TableRow className="border-b border-border bg-slate-50/70 dark:bg-slate-900/50">
                  <TableHead className="w-32 py-3 px-4 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">PO Number</TableHead>
                  <TableHead className="min-w-[180px] py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Vendor</TableHead>
                  <TableHead className="w-28 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Status</TableHead>
                  <TableHead className="text-right py-3 px-4 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">PO Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectPOs.map((po, idx) => (
                  <TableRow key={idx} className="border-b border-border/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150">
                    <TableCell className="px-4 py-3 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                      <a href={`/po/${encodeURIComponent(po.po_no || po.poNo)}`} target="_blank" rel="noreferrer" title={`Open PO ${po.po_no || po.poNo}`}>
                        {po.po_no || po.poNo}
                      </a>
                    </TableCell>
                    <TableCell className="px-3 py-3 font-semibold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[220px]" title={po.vendor_name || po.vendor || ''}>{po.vendor_name || po.vendor || 'Vendor'}</TableCell>
                    <TableCell className="px-3 py-3 whitespace-nowrap">
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
                    <TableCell className="px-4 py-3 text-right font-semibold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
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
