'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Dialog, Button, Input } from '../../ui/core';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
import { 
  Folder, TrendingUp, IndianRupee, Wallet, Download, ArrowLeft,
  Building2, Calendar, CheckCircle2, Clock, CreditCard, ExternalLink,
  Layers, Search, AlertTriangle, Edit2, ShieldAlert, Sparkles, MapPin, Receipt,
  HardHat, Users, Camera, ShieldCheck, FileSpreadsheet
} from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';
import SortableHeader from '../../ui/SortableHeader';
import { exportToCSV, sortData } from '../../../app/lib/exportUtils';
import CopyButton from '../../ui/CopyButton';
import ProjectBOQModule from './ProjectBOQModule';

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

  // Site Workforce & Attendance State
  const [workforceSummary, setWorkforceSummary] = useState(null);
  const [workforceLoading, setWorkforceLoading] = useState(false);
  const [workforceSelfieModal, setWorkforceSelfieModal] = useState(null);
  const [workforceMapModal, setWorkforceMapModal] = useState(null);

  // Geofence Modal State
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [geofenceForm, setGeofenceForm] = useState({
    site_address: '',
    latitude: '',
    longitude: '',
    radius_meters: 200,
    is_mandatory: 1
  });
  const [savingGeofence, setSavingGeofence] = useState(false);

  // Load project workforce summary
  const loadWorkforce = useCallback(async () => {
    if (!selectedProject?.project) return;
    setWorkforceLoading(true);
    try {
      const summary = await call('getProjectWorkforceSummary', selectedProject.project);
      if (summary) {
        setWorkforceSummary(summary);
        if (summary.geofence) {
          setGeofenceForm({
            site_address: summary.geofence.site_address || selectedProject.site_address || '',
            latitude: summary.geofence.latitude ?? '',
            longitude: summary.geofence.longitude ?? '',
            radius_meters: summary.geofence.radius_meters ?? 200,
            is_mandatory: summary.geofence.is_mandatory ?? 1
          });
        } else {
          setGeofenceForm(prev => ({
            ...prev,
            site_address: selectedProject.site_address || ''
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load project workforce:', err);
    } finally {
      setWorkforceLoading(false);
    }
  }, [call, selectedProject]);

  useEffect(() => {
    if (selectedProject?.project) {
      loadWorkforce();
    }
  }, [selectedProject, loadWorkforce]);

  const handleSaveGeofence = async (e) => {
    e.preventDefault();
    setSavingGeofence(true);
    try {
      await call('saveSiteGeofence', {
        project: selectedProject.project,
        site_address: geofenceForm.site_address,
        latitude: geofenceForm.latitude ? parseFloat(geofenceForm.latitude) : null,
        longitude: geofenceForm.longitude ? parseFloat(geofenceForm.longitude) : null,
        radius_meters: geofenceForm.radius_meters ? parseInt(geofenceForm.radius_meters, 10) : 200,
        is_mandatory: geofenceForm.is_mandatory ? 1 : 0
      });
      toast.success('Site geofence configuration updated.');
      setShowGeofenceModal(false);
      await loadWorkforce();
    } catch (err) {
      toast.error(err.message || 'Failed to save geofence.');
    } finally {
      setSavingGeofence(false);
    }
  };

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
      const balVal = isShortClosed ? 0 : (poVal - paidVal);
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
          onClick={() => setActiveTab('boq')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'boq' 
              ? 'bg-amber-500 text-slate-950 shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Project BOQ & Estimation
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
        <button
          onClick={() => setActiveTab('workforce')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'workforce' 
              ? 'bg-amber-500 text-slate-950 shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <HardHat className="w-3.5 h-3.5" /> Site Workforce ({workforceSummary?.totalAllocated ?? 0})
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
              <>
                {/* ── Mobile View: PO Cards ── */}
                <div className="block md:hidden p-3 space-y-3">
                  {filteredAndSortedPOs.map((po, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                          <a href={`/po/${encodeURIComponent(po.po_no || po.poNo)}`} target="_blank" rel="noreferrer" className="hover:text-amber-500 hover:underline">
                            {po.po_no || po.poNo}
                          </a>
                          <CopyButton text={po.po_no || po.poNo} label="PO Number" />
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {formatDate(po.po_date)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-xs truncate" title={po.vendor_name || po.vendor || ''}>
                          {po.vendor_name || po.vendor || 'Vendor'}
                        </h4>
                        <div>
                          {po.isShortClosed ? (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">Short Closed</Badge>
                          ) : (
                            <Badge variant={String(po.status || '').toLowerCase().includes('approved') || String(po.status || '').toLowerCase().includes('active') ? 'success' : String(po.status || '').toLowerCase().includes('draft') ? 'default' : 'pending'}>
                              {po.status || 'Active'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/70 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">PO Value</span>
                          <span className="font-bold text-foreground font-mono tabular-nums text-xs block">{formatCurrency(po.po_value)}</span>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">Paid Outflow</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums text-xs block">{formatCurrency(po.paid)}</span>
                        </div>
                        <div className="col-span-2 pt-1.5 border-t border-border/50 flex justify-between items-center">
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${po.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            Remaining Balance
                          </span>
                          <span className={`font-bold font-mono tabular-nums text-xs ${po.balance < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-amber-600 dark:text-amber-400'}`}>
                            {formatCurrency(po.balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Desktop View: Table ── */}
                <div className="hidden md:block overflow-x-auto">
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
                        <TableCell className={`px-4 py-3 text-right font-semibold text-xs tabular-nums font-mono ${po.balance < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-amber-600 dark:text-amber-400'}`}>
                          {formatCurrency(po.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
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
              <>
                {/* ── Mobile View: Payment Cards ── */}
                <div className="block md:hidden p-3 space-y-3">
                  {projectPayments.map((pmt, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          PR #{pmt.pr_id || idx + 1}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {formatDate(pmt.created_at || pmt.date)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground text-xs truncate" title={pmt.vendor_name || pmt.vendor || ''}>
                            {pmt.vendor_name || pmt.vendor || 'Vendor'}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate">PO: {pmt.po_no || '—'}</p>
                        </div>
                        <Badge variant="default" className="text-[10px] shrink-0">{pmt.status || 'Processed'}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/70 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Requested</span>
                          <span className="font-bold text-foreground font-mono tabular-nums text-xs block">{formatCurrency(pmt.amount_requested || 0)}</span>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">Approved / Paid</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums text-xs block">{formatCurrency(pmt.approved_amount || pmt.amount || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Desktop View: Table ── */}
                <div className="hidden md:block overflow-x-auto">
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
            </>
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

      {/* ── Tab 4: Site Workforce & Attendance ── */}
      {activeTab === 'workforce' && (
        <div className="space-y-6">
          {/* Workforce Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border shadow-xs p-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Total Allocated
              </span>
              <span className="text-2xl font-bold font-mono text-foreground">
                {workforceSummary?.totalAllocated ?? 0}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">Active site engineers & staff</p>
            </Card>

            <Card className="bg-card border-border shadow-xs p-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Present Today
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-500">
                {workforceSummary?.presentToday ?? 0}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">Logged attendance today</p>
            </Card>

            <Card className="bg-card border-border shadow-xs p-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                On-Site Now
              </span>
              <span className="text-2xl font-bold font-mono text-amber-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                {workforceSummary?.currentlyOnSite ?? 0}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">Active inside site radius</p>
            </Card>

            <Card className="bg-card border-border shadow-xs p-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Absent Today
              </span>
              <span className="text-2xl font-bold font-mono text-rose-500">
                {workforceSummary?.absentToday ?? 0}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">Pending or no check-in</p>
            </Card>
          </div>

          {/* Project Geo-Fence & Boundary Card */}
          <Card className="bg-card border-border shadow-xs overflow-hidden">
            <CardHeader className="border-b border-border py-3.5 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Site Geo-Fence & Punch Boundary Configuration
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGeofenceModal(true)}
                className="text-xs font-semibold"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Configure Boundary & Radius
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Site Address
                  </span>
                  <p className="text-xs font-medium text-foreground truncate">
                    {workforceSummary?.geofence?.site_address || selectedProject.site_address || 'No location configured'}
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    GPS Coordinates
                  </span>
                  <p className="text-xs font-mono font-medium text-foreground">
                    {workforceSummary?.geofence?.latitude != null
                      ? `${workforceSummary.geofence.latitude.toFixed(6)}, ${workforceSummary.geofence.longitude.toFixed(6)}`
                      : 'Not configured'}
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Allowed Punch Radius
                  </span>
                  <p className="text-xs font-mono font-bold text-amber-500">
                    {workforceSummary?.geofence?.radius_meters || 200} Metres
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl border border-border">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Geo-Fencing Enforcement
                  </span>
                  {workforceSummary?.geofence?.is_mandatory ? (
                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[11px]">
                      Mandatory Enforced
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[11px]">
                      Flexible (Flagged)
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Allocated Workforce Table */}
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="border-b border-border py-3.5 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Allocated Workforce & Today&apos;s Presence ({workforceSummary?.workforce?.length || 0})
                </CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={loadWorkforce} disabled={workforceLoading} className="text-xs">
                Refresh Workforce
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {(!workforceSummary?.workforce || workforceSummary.workforce.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  No employees are currently allocated to {selectedProject.project}. Allocate employees in Site → Employees.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Designation & Role</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Punch In</TableHead>
                        <TableHead>Punch Out</TableHead>
                        <TableHead>Hours Today</TableHead>
                        <TableHead>Verification</TableHead>
                        <TableHead>Status Today</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workforceSummary.workforce.map(emp => (
                        <TableRow key={emp.employee_id}>
                          <TableCell className="font-semibold text-foreground text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-[10px] font-bold overflow-hidden">
                                {emp.photo_url ? (
                                  <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                                ) : (
                                  emp.name.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-foreground">{emp.name}</div>
                                <div className="text-[10px] font-mono text-muted-foreground">{emp.employee_id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">{emp.role_at_site || emp.designation}</div>
                            {emp.is_primary ? (
                              <span className="text-[10px] text-amber-500 font-medium">Primary Site</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {emp.phone || '—'}
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {emp.today_record?.punch_in_time ? (
                              new Date(emp.today_record.punch_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {emp.today_record?.punch_out_time ? (
                              new Date(emp.today_record.punch_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-amber-500">
                            {emp.today_record?.total_hours ? `${emp.today_record.total_hours}h` : '—'}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {emp.today_record?.punch_in_selfie && (
                                <button
                                  onClick={() => setWorkforceSelfieModal({
                                    title: `${emp.name} — Today's Selfie`,
                                    src: emp.today_record.punch_in_selfie
                                  })}
                                  title="View Check-In Selfie"
                                  className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                                </button>
                              )}
                              {emp.today_record?.punch_in_latitude != null && (
                                <button
                                  onClick={() => setWorkforceMapModal({
                                    lat: emp.today_record.punch_in_latitude,
                                    lng: emp.today_record.punch_in_longitude,
                                    address: emp.today_record.punch_in_address || selectedProject.project,
                                    title: `${emp.name} — Punch Location`
                                  })}
                                  title="View GPS Punch Location"
                                  className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {emp.today_status === 'on_site' ? (
                              <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On-Site Active
                              </Badge>
                            ) : emp.today_status === 'checked_out' ? (
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border border-blue-500/30">
                                Shift Completed
                              </Badge>
                            ) : emp.today_status === 'half_day' ? (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                Half Day
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-muted-foreground">
                                Absent Today
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Attendance History */}
          <Card className="bg-card border-border shadow-xs">
            {(() => {
              const recHistory = workforceSummary?.recentAttendance || workforceSummary?.recentHistory || [];
              return (
                <>
                  <CardHeader className="border-b border-border py-3.5 px-6">
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Recent Site Attendance Register ({recHistory.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        No historical punches logged for {selectedProject.project}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Employee</TableHead>
                              <TableHead>Punch In</TableHead>
                              <TableHead>Punch Out</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Geo Status</TableHead>
                              <TableHead>Verification</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recHistory.map(rec => (
                        <TableRow key={rec.id}>
                          <TableCell className="text-xs font-semibold text-foreground whitespace-nowrap">
                            {rec.date}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-foreground whitespace-nowrap">
                            <div>{rec.employee_name}</div>
                            <span className="text-[10px] font-mono text-muted-foreground">{rec.employee_id}</span>
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {rec.punch_in_time ? new Date(rec.punch_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {rec.punch_out_time ? new Date(rec.punch_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-amber-500 whitespace-nowrap">
                            {rec.total_hours ? `${rec.total_hours}h` : '—'}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {rec.punch_in_geo_status === 'within_radius' ? (
                              <span className="text-emerald-500 font-medium">Inside Site</span>
                            ) : rec.punch_in_geo_status ? (
                              <span className="text-rose-500 font-medium">Outside Radius</span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {rec.punch_in_selfie && (
                                <button
                                  onClick={() => setWorkforceSelfieModal({
                                    title: `${rec.employee_name} — Punch In Selfie (${rec.date})`,
                                    src: rec.punch_in_selfie
                                  })}
                                  title="View Punch In Selfie"
                                  className="px-1.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-0.5 text-[10px]"
                                >
                                  <Camera className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">In</span>
                                </button>
                              )}
                              {rec.punch_out_selfie && (
                                <button
                                  onClick={() => setWorkforceSelfieModal({
                                    title: `${rec.employee_name} — Punch Out Selfie (${rec.date})`,
                                    src: rec.punch_out_selfie
                                  })}
                                  title="View Punch Out Selfie"
                                  className="px-1.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-0.5 text-[10px]"
                                >
                                  <Camera className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">Out</span>
                                </button>
                              )}
                              {rec.punch_in_latitude != null && (
                                <button
                                  onClick={() => setWorkforceMapModal({
                                    lat: rec.punch_in_latitude,
                                    lng: rec.punch_in_longitude,
                                    address: rec.punch_in_address || selectedProject.project,
                                    title: `${rec.employee_name} — Punch In Location`
                                  })}
                                  title="View Punch In GPS Location Map"
                                  className="px-1.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-0.5 text-[10px]"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">In Map</span>
                                </button>
                              )}
                              {rec.punch_out_latitude != null && (
                                <button
                                  onClick={() => setWorkforceMapModal({
                                    lat: rec.punch_out_latitude,
                                    lng: rec.punch_out_longitude,
                                    address: rec.punch_out_address || selectedProject.project,
                                    title: `${rec.employee_name} — Punch Out Location`
                                  })}
                                  title="View Punch Out GPS Location Map"
                                  className="px-1.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer flex items-center gap-0.5 text-[10px]"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">Out Map</span>
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {rec.is_flagged ? (
                              <Badge variant="destructive">Flagged</Badge>
                            ) : rec.status === 'present' ? (
                              <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                                Present
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{rec.status}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </>
        );
      })()}
    </Card>
  </div>
)}

      {/* ── Tab 5: Project BOQ & Estimation ── */}
      {activeTab === 'boq' && (
        <ProjectBOQModule selectedProject={selectedProject} />
      )}

      {/* ── Modal: Configure Site Geo-Fence ── */}
      <Dialog
        open={showGeofenceModal}
        onClose={() => setShowGeofenceModal(false)}
        title={`Configure Site Geo-Fence — ${selectedProject.project}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveGeofence} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Set the official GPS latitude and longitude for this site. Employees punching beyond the allowed radius will be blocked or flagged.
          </p>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Site Physical Address</label>
            <Input
              value={geofenceForm.site_address}
              onChange={(e) => setGeofenceForm({ ...geofenceForm, site_address: e.target.value })}
              placeholder="e.g. DLF Cyber City, Tower C, Gurugram"
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Latitude</label>
              <Input
                type="number"
                step="any"
                value={geofenceForm.latitude}
                onChange={(e) => setGeofenceForm({ ...geofenceForm, latitude: e.target.value })}
                placeholder="28.4985"
                required
                className="text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Longitude</label>
              <Input
                type="number"
                step="any"
                value={geofenceForm.longitude}
                onChange={(e) => setGeofenceForm({ ...geofenceForm, longitude: e.target.value })}
                placeholder="77.0928"
                required
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Radius (Metres)</label>
              <Input
                type="number"
                value={geofenceForm.radius_meters}
                onChange={(e) => setGeofenceForm({ ...geofenceForm, radius_meters: e.target.value })}
                placeholder="200"
                min="50"
                max="5000"
                required
                className="text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Enforcement</label>
              <select
                value={geofenceForm.is_mandatory}
                onChange={(e) => setGeofenceForm({ ...geofenceForm, is_mandatory: parseInt(e.target.value, 10) })}
                className="w-full text-xs p-2 rounded-xl bg-card border border-border"
              >
                <option value={1}>Mandatory (Block out-of-site)</option>
                <option value={0}>Flexible (Flag for review)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setShowGeofenceModal(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={savingGeofence} className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950">
              {savingGeofence ? 'Saving...' : 'Save Geofence'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal: Workforce Selfie Preview ── */}
      <Dialog
        open={!!workforceSelfieModal}
        onClose={() => setWorkforceSelfieModal(null)}
        title={workforceSelfieModal?.title || 'Attendance Selfie Photograph'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="aspect-4/3 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-border">
            {workforceSelfieModal?.src && (
              <img src={workforceSelfieModal.src} alt="Selfie" className="w-full h-full object-contain" />
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setWorkforceSelfieModal(null)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Modal: Workforce GPS Map Preview ── */}
      <Dialog
        open={!!workforceMapModal}
        onClose={() => setWorkforceMapModal(null)}
        title={workforceMapModal?.title || 'GPS Verification Map'}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {workforceMapModal && (() => {
            const numLat = Number(workforceMapModal.lat) || 0;
            const numLng = Number(workforceMapModal.lng) || 0;
            const minLng = (numLng - 0.005).toFixed(6);
            const minLat = (numLat - 0.005).toFixed(6);
            const maxLng = (numLng + 0.005).toFixed(6);
            const maxLat = (numLat + 0.005).toFixed(6);
            return (
              <>
                <div className="h-72 rounded-2xl overflow-hidden border border-border bg-muted">
                  <iframe
                    title="Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${numLat.toFixed(6)},${numLng.toFixed(6)}`}
                  />
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground">{workforceMapModal.address}</div>
                  <div className="text-muted-foreground font-mono text-[11px]">
                    Coordinates: {numLat.toFixed(6)}, {numLng.toFixed(6)}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${numLat},${numLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-500 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
                  </a>
                  <Button variant="outline" size="sm" onClick={() => setWorkforceMapModal(null)}>
                    Close
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      </Dialog>

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
