'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Dialog, Button, Input } from '../../ui/core';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
import { 
  Folder, TrendingUp, IndianRupee, Wallet, Download, ArrowLeft,
  Building2, Calendar, CheckCircle2, Clock, CreditCard, ExternalLink,
  Layers, Search, AlertTriangle, Edit2, ShieldAlert, Sparkles, MapPin, Receipt
} from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';
import SortableHeader from '../../ui/SortableHeader';
import { exportToCSV, sortData } from '../../../app/lib/exportUtils';
import CopyButton from '../../ui/CopyButton';

export default function ProjectDetails({ selectedProject, projectPOs, onBack, onUpdateProject }) {
  const { call, payments = [] } = useAppState();
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'payments' | 'site'
  const [poSearch, setPoSearch] = useState('');
  
  // Edit Financials & Settings Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRef, setEditRef] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editSiteAddress, setEditSiteAddress] = useState('');
  const [editProjectValue, setEditProjectValue] = useState('');
  const [editBcs, setEditBcs] = useState('');
  const [editInflow, setEditInflow] = useState('');
  const [editClientDebit, setEditClientDebit] = useState('');
  const [editTds, setEditTds] = useState('');
  const [saving, setSaving] = useState(false);

  // Sorting state for project PO ledger
  const [sortField, setSortField] = useState('po_no');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    if (selectedProject) {
      setEditRef(selectedProject.project_ref || '');
      setEditClient(selectedProject.client || '');
      setEditSiteAddress(selectedProject.site_address || '');
      setEditProjectValue(String(selectedProject.projectValue || ''));
      setEditBcs(String(selectedProject.bcs || ''));
      setEditInflow(String(selectedProject.inflow || ''));
      setEditClientDebit(String(selectedProject.invoiceValue || ''));
      setEditTds(String(selectedProject.tds || ''));
    }
  }, [selectedProject]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── Financial Calculations ──
  const contractValue = Number(selectedProject?.projectValue || 0);
  const clientInflow = Number(selectedProject?.inflow || 0);
  const clientInvoices = Number(selectedProject?.invoiceValue || 0);
  const pendingInflow = Math.max(0, contractValue - clientInflow);
  const inflowPercent = contractValue > 0 ? Math.min(100, Math.round((clientInflow / contractValue) * 100)) : 0;

  const bcsBudget = Number(selectedProject?.bcs || 0);
  const poCommitted = Number(selectedProject?.poIssued || 0);
  const paidOutflow = Number(selectedProject?.outflow || 0);
  const pendingPayable = Math.max(0, poCommitted - paidOutflow);
  const bcsUtilPercent = bcsBudget > 0 ? Math.round((poCommitted / bcsBudget) * 100) : 0;
  const outflowPaidPercent = poCommitted > 0 ? Math.min(100, Math.round((paidOutflow / poCommitted) * 100)) : 0;

  const clientTds = Number(selectedProject?.tds || 0);
  const netCashInHand = clientInflow - paidOutflow - clientTds;
  const actualGM = Number(selectedProject?.actualGM || (clientInflow - paidOutflow - clientTds));
  const actualGMPct = clientInflow > 0 ? (actualGM / clientInflow) * 100 : 0;
  const plannedGM = Number(selectedProject?.plannedGM || (contractValue - bcsBudget));
  const plannedGMPct = contractValue > 0 ? (plannedGM / contractValue) * 100 : 0;

  const isOverrun = bcsBudget > 0 && poCommitted > bcsBudget;
  const overrunAmount = Math.max(0, poCommitted - bcsBudget);

  // ── Enriched POs ──
  const enrichedPOs = useMemo(() => {
    return (projectPOs || []).map(po => {
      const poVal = Number(po.po_value || po.poValue || po.amount || 0);
      const paidVal = Number(po.paid ?? po.legacy_paid ?? po.amountPaid ?? 0);
      const rawStatus = String(po.status || '').toLowerCase();
      const isShortClosed = rawStatus.includes('short closed') || rawStatus.includes('short_closed') || rawStatus.includes('closed');
      const balVal = isShortClosed ? 0 : Math.max(0, poVal - paidVal);
      return {
        ...po,
        po_value: poVal,
        paid: paidVal,
        balance: balVal,
        isShortClosed
      };
    });
  }, [projectPOs]);

  // Filtered & Sorted POs
  const filteredAndSortedPOs = useMemo(() => {
    let list = enrichedPOs;
    if (poSearch.trim()) {
      const q = poSearch.toLowerCase().trim();
      list = list.filter(po => 
        (po.po_no || '').toLowerCase().includes(q) ||
        (po.vendor_name || po.vendor || '').toLowerCase().includes(q) ||
        (po.status || '').toLowerCase().includes(q)
      );
    }
    return sortData(list, sortField, sortDir);
  }, [enrichedPOs, poSearch, sortField, sortDir]);

  // Filter Payments matching this project
  const projectPayments = useMemo(() => {
    const projName = String(selectedProject?.project || '').toLowerCase().trim();
    const poNos = new Set(enrichedPOs.map(p => String(p.po_no).toLowerCase().trim()));
    return (payments || []).filter(pmt => {
      if (!pmt) return false;
      const pmtProj = String(pmt.project || '').toLowerCase().trim();
      const pmtPo = String(pmt.po_no || '').toLowerCase().trim();
      return (pmtProj && pmtProj === projName) || (pmtPo && poNos.has(pmtPo));
    });
  }, [payments, selectedProject, enrichedPOs]);

  const handleExportPOsCSV = () => {
    const columns = [
      { label: 'PO Number', key: 'po_no', formatter: (v, r) => r.po_no || r.poNo },
      { label: 'Vendor Name', key: 'vendor_name', formatter: (v, r) => r.vendor_name || r.vendor },
      { label: 'PO Date', key: 'po_date', formatter: (v, r) => formatDate(r.po_date) },
      { label: 'Status', key: 'status' },
      { label: 'PO Value (₹)', key: 'po_value', formatter: (v, r) => r.po_value },
      { label: 'Paid Outflow (₹)', key: 'paid', formatter: (v, r) => r.paid },
      { label: 'Balance Remaining (₹)', key: 'balance', formatter: (v, r) => r.balance }
    ];
    const projName = (selectedProject?.project || 'Project').replace(/\s+/g, '_');
    exportToCSV(`${projName}_POs_Ledger.csv`, columns, filteredAndSortedPOs);
  };

  const handleExportPaymentsCSV = () => {
    const columns = [
      { label: 'PR ID', key: 'pr_id' },
      { label: 'PO Number', key: 'po_no' },
      { label: 'Vendor', key: 'vendor_name' },
      { label: 'Requested Amount (₹)', key: 'amount_requested' },
      { label: 'Approved Amount (₹)', key: 'approved_amount' },
      { label: 'Status', key: 'status' },
      { label: 'Created At', key: 'created_at', formatter: (v) => formatDate(v) }
    ];
    const projName = (selectedProject?.project || 'Project').replace(/\s+/g, '_');
    exportToCSV(`${projName}_Payments_Log.csv`, columns, projectPayments);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await call('updateProjectFinancials', {
        project: selectedProject.project,
        projectValue: Number(editProjectValue) || 0,
        bcs: Number(editBcs) || 0,
        inflow: Number(editInflow) || 0,
        clientDebit: Number(editClientDebit) || 0,
        tds: Number(editTds) || 0,
        project_ref: editRef.trim(),
        client: editClient.trim(),
        site_address: editSiteAddress.trim()
      });
      setShowEditModal(false);
      if (onUpdateProject) onUpdateProject();
      toast.success("Project settings & financials updated successfully.");
    } catch (e) {
      toast.error("Failed to update settings: " + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (!selectedProject) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Navigation & Project Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-5 rounded-lg shadow-xs">
        <div className="space-y-2">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-primary hover:text-amber-500 hover:underline transition-colors cursor-pointer mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects Command Center
            </button>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Folder className="w-6 h-6 text-amber-500 shrink-0" />
              {selectedProject.project}
            </h1>
            {selectedProject.project_ref && (
              <Badge className="bg-muted text-foreground border-border font-mono text-xs px-2 py-0.5">
                {selectedProject.project_ref}
              </Badge>
            )}
            {isOverrun ? (
              <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-xs px-2.5 py-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Budget Overrun (+{formatCurrency(overrunAmount)})
              </Badge>
            ) : bcsUtilPercent > 85 ? (
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs px-2.5 py-0.5">
                High Utilization ({bcsUtilPercent}%)
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs px-2.5 py-0.5">
                On Track ({bcsUtilPercent}% Utilized)
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {selectedProject.client && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                Client: <strong className="text-foreground">{selectedProject.client}</strong>
              </span>
            )}
            {selectedProject.site_address && (
              <span className="flex items-center gap-1 max-w-md truncate" title={selectedProject.site_address}>
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{selectedProject.site_address}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditModal(true)}
            className="text-xs font-semibold border-border flex items-center gap-1.5 h-9"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Edit Financials & Info
          </Button>
        </div>
      </div>

      {/* ── 4 Master Financial Intelligence Panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Panel 1: Client Inflow */}
        <Card className="bg-card border-border rounded-lg shadow-xs p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4" /> Client Inflow (Revenue)
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground font-mono">
                {inflowPercent}% collected
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Contract Value</span>
                <span className="text-xl font-bold font-mono text-foreground">{formatCurrency(contractValue)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Inflow Received</span>
                  <span className="font-mono font-bold text-emerald-500">{formatCurrency(clientInflow)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Pending Collection</span>
                  <span className="font-mono font-bold text-amber-500">{formatCurrency(pendingInflow)}</span>
                </div>
              </div>
              {clientInvoices > 0 && (
                <div className="text-[11px] text-muted-foreground pt-1 flex justify-between">
                  <span>Client Billed:</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(clientInvoices)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${inflowPercent}%` }} />
            </div>
          </div>
        </Card>

        {/* Panel 2: Vendor Outflow & Payables */}
        <Card className="bg-card border-border rounded-lg shadow-xs p-5 flex flex-col justify-between hover:border-amber-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> PO Committed & Payable
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground font-mono">
                {outflowPaidPercent}% paid
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total PO Committed</span>
                <span className="text-xl font-bold font-mono text-foreground">{formatCurrency(poCommitted)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Paid Outflow</span>
                  <span className="font-mono font-bold text-emerald-500">{formatCurrency(paidOutflow)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Pending Payable</span>
                  <span className="font-mono font-bold text-amber-500">{formatCurrency(pendingPayable)}</span>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground pt-1 flex justify-between">
                <span>BCS Budget Limit:</span>
                <span className="font-mono font-semibold text-foreground">{formatCurrency(bcsBudget)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${outflowPaidPercent}%` }} />
            </div>
          </div>
        </Card>

        {/* Panel 3: Net Cash & Margin */}
        <Card className="bg-card border-border rounded-lg shadow-xs p-5 flex flex-col justify-between hover:border-violet-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                <Wallet className="w-4 h-4" /> Net Cash Position
              </span>
              <span className={`text-[10px] font-semibold font-mono ${netCashInHand >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {netCashInHand >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Net Cash in Hand</span>
                <span className={`text-xl font-bold font-mono ${netCashInHand >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(netCashInHand)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Actual Gross Margin</span>
                  <span className="font-mono font-bold text-violet-500">{actualGMPct.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Planned GM (BCS)</span>
                  <span className="font-mono font-bold text-muted-foreground">{plannedGMPct.toFixed(1)}%</span>
                </div>
              </div>
              {clientTds > 0 && (
                <div className="text-[11px] text-muted-foreground pt-1 flex justify-between">
                  <span>Client TDS Deducted:</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(clientTds)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground">
            Inflow ({formatCurrency(clientInflow)}) − Outflow ({formatCurrency(paidOutflow)})
          </div>
        </Card>

        {/* Panel 4: Budget Control & Risk */}
        <Card className="bg-card border-border rounded-lg shadow-xs p-5 flex flex-col justify-between hover:border-sky-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> BCS Budget Discipline
              </span>
              <span className={`text-[10px] font-bold font-mono ${isOverrun ? 'text-rose-500' : bcsUtilPercent > 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {bcsUtilPercent}% Utilized
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">BCS Cost Budget</span>
                <span className="text-xl font-bold font-mono text-foreground">{formatCurrency(bcsBudget)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Uncommitted Budget</span>
                  <span className={`font-mono font-bold ${bcsBudget - poCommitted >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(Math.max(0, bcsBudget - poCommitted))}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Budget Overrun</span>
                  <span className={`font-mono font-bold ${isOverrun ? 'text-rose-500' : 'text-muted-foreground'}`}>
                    {isOverrun ? formatCurrency(overrunAmount) : '₹0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isOverrun ? 'bg-rose-500' : bcsUtilPercent > 85 ? 'bg-amber-500' : 'bg-sky-500'}`} 
                style={{ width: `${Math.min(bcsUtilPercent, 100)}%` }} 
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Cashflow Balance Bar Strip ── */}
      <div className="bg-card border border-border p-4 rounded-lg shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Cashflow Balance Architecture
          </span>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-emerald-500 font-semibold">Inflow: {formatCurrency(clientInflow)}</span>
            <span className="text-rose-500 font-semibold">Outflow: {formatCurrency(paidOutflow)}</span>
            <span className="text-amber-500 font-semibold">Payable: {formatCurrency(pendingPayable)}</span>
          </div>
        </div>
        <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden flex">
          {contractValue > 0 && (
            <>
              <div 
                style={{ width: `${Math.min(100, (paidOutflow / contractValue) * 100)}%` }} 
                className="h-full bg-rose-500/80" 
                title={`Paid Outflow: ${formatCurrency(paidOutflow)}`}
              />
              <div 
                style={{ width: `${Math.min(100, (pendingPayable / contractValue) * 100)}%` }} 
                className="h-full bg-amber-500/80" 
                title={`Pending Payable: ${formatCurrency(pendingPayable)}`}
              />
              <div 
                style={{ width: `${Math.max(0, 100 - ((paidOutflow + pendingPayable) / contractValue) * 100)}%` }} 
                className="h-full bg-emerald-500/60" 
                title="Remaining Budget Capacity"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-2 border-b border-border pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pos' 
              ? 'bg-amber-500 text-slate-950 shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" /> Purchase Orders Ledger ({enrichedPOs.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'payments' 
              ? 'bg-amber-500 text-slate-950 shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" /> Payment Disbursements ({projectPayments.length})
        </button>
        <button
          onClick={() => setActiveTab('site')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'site' 
              ? 'bg-amber-500 text-slate-950 shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> Site & Contract Information
        </button>
      </div>

      {/* ── Tab 1: Purchase Orders Ledger ── */}
      {activeTab === 'pos' && (
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="border-b border-border py-3.5 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                Purchase Orders for {selectedProject.project} ({filteredAndSortedPOs.length})
              </CardTitle>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search PO #, vendor, status..."
                  value={poSearch}
                  onChange={e => setPoSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-card"
                />
              </div>
              {filteredAndSortedPOs.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportPOsCSV} className="h-8 text-xs font-semibold shrink-0">
                  <Download className="w-3.5 h-3.5 mr-1 text-muted-foreground" /> Export
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAndSortedPOs.length === 0 ? (
              <div className="p-12 text-muted-foreground text-center text-xs font-medium space-y-1">
                <Receipt className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p>No purchase orders found under this project.</p>
                {poSearch && <p className="text-[11px]">Try adjusting your search filter.</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/40">
                      <SortableHeader field="po_no" label="PO Number" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-36" />
                      <SortableHeader field="vendor_name" label="Vendor" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[160px]" />
                      <SortableHeader field="po_date" label="PO Date" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                      <SortableHeader field="status" label="Status" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                      <SortableHeader field="po_value" label="PO Value" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                      <SortableHeader field="paid" label="Paid" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                      <SortableHeader field="balance" label="Balance" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPOs.map((po, idx) => (
                      <TableRow key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <TableCell className="px-4 py-3 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <a href={`/po/${encodeURIComponent(po.po_no || po.poNo)}`} target="_blank" rel="noreferrer" className="hover:text-amber-500 hover:underline font-bold" title={`Open PO ${po.po_no || po.poNo}`}>
                              {po.po_no || po.poNo}
                            </a>
                            <CopyButton text={po.po_no || po.poNo} label="PO Number" />
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 font-semibold text-xs text-foreground truncate max-w-[200px]" title={po.vendor_name || po.vendor || ''}>
                          {po.vendor_name || po.vendor || 'Vendor'}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(po.po_date)}
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap">
                          {po.isShortClosed ? (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                              Short Closed
                            </Badge>
                          ) : (
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
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-right font-bold text-xs text-foreground tabular-nums font-mono">
                          {formatCurrency(po.po_value)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                          {formatCurrency(po.paid)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-semibold text-xs text-amber-600 dark:text-amber-400 tabular-nums font-mono">
                          {formatCurrency(po.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 2: Payment Disbursements Log ── */}
      {activeTab === 'payments' && (
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="border-b border-border py-3.5 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                Payment Disbursements for {selectedProject.project} ({projectPayments.length})
              </CardTitle>
            </div>
            {projectPayments.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportPaymentsCSV} className="h-8 text-xs font-semibold">
                <Download className="w-3.5 h-3.5 mr-1 text-muted-foreground" /> Export Payments
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {projectPayments.length === 0 ? (
              <div className="p-12 text-muted-foreground text-center text-xs font-medium space-y-1">
                <CreditCard className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p>No payment disbursements recorded for this project yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/40">
                      <TableHead className="text-xs">PR ID</TableHead>
                      <TableHead className="text-xs">PO Number</TableHead>
                      <TableHead className="text-xs">Vendor</TableHead>
                      <TableHead className="text-xs text-right">Requested (₹)</TableHead>
                      <TableHead className="text-xs text-right">Approved (₹)</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectPayments.map((pmt, idx) => (
                      <TableRow key={idx} className="border-b border-border/50 hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold">{pmt.pr_id || '—'}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span>{pmt.po_no || '—'}</span>
                            {pmt.po_no && <CopyButton text={pmt.po_no} label="PO Number" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium truncate max-w-[200px]">{pmt.vendor_name || pmt.vendor || '—'}</TableCell>
                        <TableCell className="text-xs text-right font-mono tabular-nums">{formatCurrency(pmt.amount_requested || 0)}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-emerald-500 tabular-nums">{formatCurrency(pmt.approved_amount || pmt.amount || 0)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="default" className="text-[10px]">{pmt.status || 'Processed'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(pmt.created_at || pmt.date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 3: Site & Contract Details ── */}
      {activeTab === 'site' && (
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="border-b border-border py-3.5 px-6">
            <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
              Project Specification & Financial Overrides
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Project Name</label>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border text-sm font-bold text-foreground">
                    {selectedProject.project}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Client Name</label>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border text-sm font-semibold text-foreground">
                    {selectedProject.client || '—'}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Project Reference Code</label>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border text-sm font-mono font-bold text-foreground">
                    {selectedProject.project_ref || '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Site Address</label>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border text-sm text-foreground whitespace-pre-line leading-relaxed min-h-[110px]">
                    {selectedProject.site_address || 'No site address registered.'}
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="text-xs font-semibold">
                    <Edit2 className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Update Information & Financial Settings
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Edit Settings & Financials Modal ── */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Project Settings — ${selectedProject.project}`}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-semibold mb-1 block">Project Reference</label>
              <Input
                value={editRef}
                onChange={(e) => setEditRef(e.target.value)}
                placeholder="e.g. MT-PH2-001"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold mb-1 block">Client</label>
              <Input
                value={editClient}
                onChange={(e) => setEditClient(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <label className="text-xs text-muted-foreground font-semibold mb-1 block">Contract Value (₹)</label>
              <Input
                type="number"
                value={editProjectValue}
                onChange={(e) => setEditProjectValue(e.target.value)}
                placeholder="Total contract value"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold mb-1 block">BCS Cost Budget (₹)</label>
              <Input
                type="number"
                value={editBcs}
                onChange={(e) => setEditBcs(e.target.value)}
                placeholder="Budget Cost Sheet limit"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground font-semibold mb-1 block">Inflow Received (₹)</label>
              <Input
                type="number"
                value={editInflow}
                onChange={(e) => setEditInflow(e.target.value)}
                placeholder="Cash collected"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-semibold mb-1 block">Client Invoiced (₹)</label>
              <Input
                type="number"
                value={editClientDebit}
                onChange={(e) => setEditClientDebit(e.target.value)}
                placeholder="Invoices raised"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-semibold mb-1 block">Client TDS (₹)</label>
              <Input
                type="number"
                value={editTds}
                onChange={(e) => setEditTds(e.target.value)}
                placeholder="TDS deducted"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <label className="text-xs text-muted-foreground font-semibold mb-1 block">Site Address</label>
            <textarea
              className="w-full bg-card border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all resize-none"
              rows="3"
              value={editSiteAddress}
              onChange={(e) => setEditSiteAddress(e.target.value)}
              placeholder="Enter full site address..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setShowEditModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveSettings}
              disabled={saving}
              className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
