'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, Input, Dialog, Textarea } from '../ui/core';
import { 
  Receipt, Search, Filter, Download, CheckCircle2, XCircle, Clock, FilePlus, 
  Loader2, CreditCard, Eye, Trash2, AlertTriangle, LayoutGrid, LayoutList, 
  FileText, Sparkles, Building, IndianRupee, RefreshCw, FileCheck, ShieldAlert, UploadCloud,
  ChevronDown, ChevronRight, Users, Calendar, ArrowUpRight, ExternalLink, Percent, ShieldCheck,
  Check, Copy, X, SlidersHorizontal
} from 'lucide-react';
import { toast } from '../ui/Toast';
import { exportToCSV } from '../../app/lib/exportUtils';
import { formatDate } from '../../app/lib/utils';

export default function InvoicesView() {
  const { call, setActiveView } = useAppState();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View mode tab: 'vendor' (Vendor-Wise Grouped) | 'flat' (Detailed Table) | 'pending_queue' (Review Queue)
  const [activeViewMode, setActiveViewMode] = useState('vendor');

  // Vendor View Expanded Accordion State: object mapping vendorKey -> boolean
  const [expandedVendors, setExpandedVendors] = useState({});

  // Slide-Over Inspection Drawer State
  const [inspectInvoice, setInspectInvoice] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview' | 'pdf' | 'po_health'

  // Deletion State
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState('ALL'); // 'ALL' | 'HIGH_VALUE' | 'THIS_MONTH'

  // Status Review Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusAction, setStatusAction] = useState(null); // 'Approved' | 'Rejected'
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Manual Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [posList, setPosList] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    poNo: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    subtotal: '',
    taxAmount: '',
    invoiceTotal: '',
    remarks: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await call('listInvoices', {});
      const list = Array.isArray(data) ? data : [];
      setInvoices(list);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError(err.message || 'Failed to load invoices dataset');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPOs = async () => {
    try {
      const res = await call('getPOsOnly');
      const list = Array.isArray(res) ? res : (res?.pos || []);
      setPosList(list);
    } catch (err) {
      console.error('Failed to fetch PO list:', err);
      setPosList([]);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchPOs();
  }, []);

  const handleDeleteInvoiceConfirm = async () => {
    if (!invoiceToDelete) return;
    setDeleting(true);
    try {
      await call('deleteInvoice', invoiceToDelete.invoice_id || invoiceToDelete.id);
      toast.success(`Invoice #${invoiceToDelete.invoice_number} deleted successfully`);
      setInvoiceToDelete(null);
      if (inspectInvoice?.invoice_id === invoiceToDelete.invoice_id) setInspectInvoice(null);
      await fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !statusAction) return;

    if (statusAction === 'Rejected' && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejecting the invoice.");
      return;
    }

    setActionLoading(true);
    try {
      await call('updateInvoiceStatus', selectedInvoice.invoice_id, statusAction, rejectionReason);
      toast.success(`Invoice #${selectedInvoice.invoice_number} updated to ${statusAction}`);
      
      if (inspectInvoice && inspectInvoice.invoice_id === selectedInvoice.invoice_id) {
        setInspectInvoice(prev => ({ ...prev, status: statusAction, rejection_reason: rejectionReason }));
      }

      setSelectedInvoice(null);
      setStatusAction(null);
      setRejectionReason('');
      await fetchInvoices();
    } catch (err) {
      toast.error("Failed to update status: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.poNo || !uploadForm.invoiceNumber || !uploadForm.invoiceTotal || !selectedFile) {
      toast.error("PO Number, Invoice Number, Total Amount, and Document File are required.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = event.target.result.split(',')[1];
          await call('uploadInternalInvoice', {
            poNo: uploadForm.poNo,
            invoiceNumber: uploadForm.invoiceNumber,
            invoiceDate: uploadForm.invoiceDate,
            subtotal: Number(uploadForm.subtotal || 0),
            taxAmount: Number(uploadForm.taxAmount || 0),
            invoiceTotal: Number(uploadForm.invoiceTotal),
            remarks: uploadForm.remarks,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            fileData: base64Data
          });
          toast.success(`Internal Invoice #${uploadForm.invoiceNumber} uploaded successfully!`);
          setUploadModalOpen(false);
          setUploadForm({
            poNo: '',
            invoiceNumber: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            subtotal: '',
            taxAmount: '',
            invoiceTotal: '',
            remarks: ''
          });
          setSelectedFile(null);
          await fetchInvoices();
        } catch (err) {
          toast.error("Upload failed: " + (err.message || err));
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      toast.error("Error reading file: " + err.message);
      setUploading(false);
    }
  };

  const handleCreatePaymentRequest = (inv) => {
    setActiveView('payments');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('lx:new-payment-request', {
        detail: {
          poNo: inv.po_no,
          vendor: inv.vendor_name,
          vendorCode: inv.vendor_code,
          gross_amount: inv.invoice_total,
          amountRequested: inv.invoice_total,
          invoice_id: inv.invoice_id,
          remarks: `Payment request for Invoice #${inv.invoice_number}`
        }
      }));
    }, 150);
  };

  const handleExportCSV = () => {
    const columns = [
      { label: 'Entered Date', key: 'created_at', formatter: (v, r) => formatDate(v || r.submitted_at || r.invoice_date) },
      { label: 'Vendor Name', key: 'vendor_name' },
      { label: 'Invoice Date', key: 'invoice_date', formatter: (v) => formatDate(v) },
      { label: 'P.O Number', key: 'po_no' },
      { label: 'Invoice Number', key: 'invoice_number' },
      { label: 'Basic Value', key: 'subtotal', formatter: (v, r) => Number(v || (r.invoice_total - (r.tax_amount || 0)) || 0) },
      { label: 'Tax', key: 'tax_amount', formatter: (v) => Number(v || 0) },
      { label: 'Total', key: 'invoice_total', formatter: (v) => Number(v || 0) },
      { label: 'Status', key: 'status' }
    ];
    exportToCSV('Invoices_Ledger_Report.csv', columns, filteredInvoices);
  };

  const [aiLoading, setAiLoading] = useState(false);

  const handleAiAutoFill = async () => {
    if (!selectedFile) return;
    setAiLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = event.target.result.split(',')[1];
          const token = localStorage.getItem('lx_auth_token');
          const res = await fetch('/api/ai/parse-invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-lwa-token': token || ''
            },
            body: JSON.stringify({
              fileData: base64Data,
              fileType: selectedFile.type
            })
          });
          const result = await res.json();
          if (!res.ok || result.error) {
            throw new Error(result.error || 'AI parsing failed');
          }
          const data = result.data;
          
          setUploadForm(prev => ({
            ...prev,
            invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
            invoiceDate: data.invoiceDate || prev.invoiceDate,
            subtotal: data.subtotal ? String(data.subtotal) : prev.subtotal,
            taxAmount: data.taxAmount ? String(data.taxAmount) : prev.taxAmount,
            invoiceTotal: data.invoiceTotal ? String(data.invoiceTotal) : prev.invoiceTotal
          }));
          toast.success("AI auto-filled invoice details successfully!");
        } catch (err) {
          toast.error("AI parsing failed: " + err.message);
        } finally {
          setAiLoading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      toast.error("Error reading file: " + err.message);
      setAiLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered List
  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    return invoices.filter(inv => {
      const s = search.toLowerCase().trim();
      const matchesSearch = !s || 
        String(inv.invoice_number || '').toLowerCase().includes(s) ||
        String(inv.vendor_name || '').toLowerCase().includes(s) ||
        String(inv.vendor_code || '').toLowerCase().includes(s) ||
        String(inv.po_no || '').toLowerCase().includes(s) ||
        String(inv.invoice_id || '').toLowerCase().includes(s);

      const st = String(inv.status || '').toLowerCase();
      let matchesTab = true;
      if (statusFilter === 'PENDING') matchesTab = st === 'submitted' || st === 'under review';
      else if (statusFilter === 'APPROVED') matchesTab = st === 'approved';
      else if (statusFilter === 'PAID') matchesTab = st === 'paid';
      else if (statusFilter === 'REJECTED') matchesTab = st === 'rejected';

      const matchesSource = sourceFilter === 'ALL' || String(inv.source || '').toLowerCase() === sourceFilter.toLowerCase();

      let matchesQuick = true;
      if (quickFilter === 'HIGH_VALUE') {
        matchesQuick = Number(inv.invoice_total || 0) >= 100000;
      } else if (quickFilter === 'THIS_MONTH') {
        const invDate = new Date(inv.invoice_date || inv.created_at || Date.now());
        const now = new Date();
        matchesQuick = invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      }

      return matchesSearch && matchesTab && matchesSource && matchesQuick;
    });
  }, [invoices, search, statusFilter, sourceFilter, quickFilter]);

  // Grouped by Vendor
  const vendorGroups = useMemo(() => {
    const map = new Map();
    filteredInvoices.forEach(inv => {
      const vName = inv.vendor_name || 'Unassigned Vendor';
      const vCode = inv.vendor_code || 'N/A';
      const key = `${vName}||${vCode}`;
      
      if (!map.has(key)) {
        map.set(key, {
          key,
          vendorName: vName,
          vendorCode: vCode,
          invoices: [],
          totalAmount: 0,
          pendingCount: 0,
          approvedCount: 0,
          paidCount: 0
        });
      }
      const group = map.get(key);
      group.invoices.push(inv);
      group.totalAmount += Number(inv.invoice_total || 0);

      const st = String(inv.status || '').toLowerCase();
      if (st === 'submitted' || st === 'under review') group.pendingCount++;
      else if (st === 'approved') group.approvedCount++;
      else if (st === 'paid') group.paidCount++;
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredInvoices]);

  const toggleVendorExpanded = (key) => {
    setExpandedVendors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllVendors = (expand) => {
    const next = {};
    vendorGroups.forEach(g => { next[g.key] = expand; });
    setExpandedVendors(next);
  };

  const kpis = useMemo(() => {
    const total = invoices.length;
    const pending = invoices.filter(i => {
      const s = String(i.status || '').toLowerCase();
      return s === 'submitted' || s === 'under review';
    }).length;
    const approved = invoices.filter(i => String(i.status || '').toLowerCase() === 'approved').length;
    const paid = invoices.filter(i => String(i.status || '').toLowerCase() === 'paid').length;
    const totalVal = invoices.reduce((acc, i) => acc + (Number(i.invoice_total) || 0), 0);
    const approvedVal = invoices.filter(i => String(i.status || '').toLowerCase() === 'approved').reduce((acc, i) => acc + (Number(i.invoice_total) || 0), 0);
    const paidVal = invoices.filter(i => String(i.status || '').toLowerCase() === 'paid').reduce((acc, i) => acc + (Number(i.invoice_total) || 0), 0);

    const paidPercent = totalVal > 0 ? Math.round((paidVal / totalVal) * 100) : 0;

    return { total, pending, approved, paid, totalVal, approvedVal, paidVal, paidPercent };
  }, [invoices]);

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const getAttachmentDownloadUrl = (invoiceId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lx_auth_token') : '';
    return `/api/attachments/${invoiceId}?token=${encodeURIComponent(token || '')}`;
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          Approved
        </span>
      );
    }
    if (s === 'paid') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          Paid
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          Rejected
        </span>
      );
    }
    if (s === 'under review') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          Under Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        Submitted
      </span>
    );
  };

  const selectedPOData = useMemo(() => {
    if (!uploadForm.poNo || !Array.isArray(posList)) return null;
    return posList.find(p => String(p.po_no || p.poNo) === String(uploadForm.poNo));
  }, [uploadForm.poNo, posList]);

  // Inspect invoice PO data
  const inspectPOData = useMemo(() => {
    if (!inspectInvoice?.po_no || !Array.isArray(posList)) return null;
    return posList.find(p => String(p.po_no || p.poNo) === String(inspectInvoice.po_no));
  }, [inspectInvoice?.po_no, posList]);

  const handleAmountChange = (field, val) => {
    const nextForm = { ...uploadForm, [field]: val };
    const sub = Number(nextForm.subtotal || 0);
    const tax = Number(nextForm.taxAmount || 0);
    if (field === 'subtotal' || field === 'taxAmount') {
      nextForm.invoiceTotal = (sub + tax).toFixed(2);
    }
    setUploadForm(nextForm);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const getEnteredDateString = (inv) => {
    const raw = inv.created_at || inv.submitted_at || inv.created_date || inv.invoice_date;
    if (!raw) return '—';
    try {
      return formatDate(raw);
    } catch {
      return String(raw).split('T')[0];
    }
  };

  const getVendorInitials = (name) => {
    if (!name) return 'VN';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">

      {/* ── 1. Financial Command Bar Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-card via-card to-amber-500/5 border border-border/80 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-gold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Procurement & Accounts Ledger
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground font-medium">Zoho Books Enterprise Grade</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-gold border border-amber-500/30 shrink-0 shadow-inner">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Invoices & Bill Audit
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reconcile vendor invoices against Purchase Orders, TDS schedules, and payment workflows
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInvoices}
              className="text-xs font-semibold h-9 rounded-xl border-border/80 hover:bg-muted/80 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-amber-600 dark:text-gold' : 'text-muted-foreground'}`} />
              Sync Ledger
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs font-semibold h-9 rounded-xl border-border/80 hover:bg-muted/80 transition-all"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              Export Report
            </Button>

            <Button
              onClick={() => setUploadModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <FilePlus className="w-4 h-4" /> Upload Internal Invoice
            </Button>
          </div>
        </div>

        {/* Financial Progress Bar */}
        <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-2/3">
            <span className="text-muted-foreground font-medium whitespace-nowrap text-[11px]">Settlement Progress:</span>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${kpis.paidPercent}%` }}
                title={`Paid: ${kpis.paidPercent}%`}
              />
            </div>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-[11px] whitespace-nowrap">
              {kpis.paidPercent}% Settled
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span>Gross: <strong className="text-foreground font-mono font-semibold">{formatCurrency(kpis.totalVal)}</strong></span>
            <span>•</span>
            <span>Liability: <strong className="text-amber-600 dark:text-amber-400 font-mono font-semibold">{formatCurrency(kpis.approvedVal)}</strong></span>
          </div>
        </div>
      </div>

      {/* ── 2. Metric KPI Cards Bar (Zoho / Linear Minimalist) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer transition-all rounded-2xl ${
            statusFilter === 'ALL' ? 'border-amber-500/70 ring-1 ring-amber-500/30 bg-amber-500/5 shadow-xs' : 'border-border/80 hover:border-slate-300 dark:hover:border-slate-700 bg-card'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Invoices</span>
              <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">{kpis.total}</p>
              <span className="text-xs font-semibold text-foreground font-mono tabular-nums">{formatCurrency(kpis.totalVal)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Total Invoiced Billed</span>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter('PENDING')}
          className={`cursor-pointer transition-all rounded-2xl ${
            statusFilter === 'PENDING' ? 'border-amber-500/70 ring-1 ring-amber-500/30 bg-amber-500/5 shadow-xs' : 'border-border/80 hover:border-slate-300 dark:hover:border-slate-700 bg-card'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Action Needed</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 font-mono tabular-nums">{kpis.pending}</p>
              {kpis.pending > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending Audit
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Requires Finance / Admin Review</span>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter('APPROVED')}
          className={`cursor-pointer transition-all rounded-2xl ${
            statusFilter === 'APPROVED' ? 'border-emerald-500/70 ring-1 ring-emerald-500/30 bg-emerald-500/5 shadow-xs' : 'border-border/80 hover:border-slate-300 dark:hover:border-slate-700 bg-card'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Approved & Ready</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">{kpis.approved}</p>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">{formatCurrency(kpis.approvedVal)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Ready for Payment Request Creation</span>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter('PAID')}
          className={`cursor-pointer transition-all rounded-2xl ${
            statusFilter === 'PAID' ? 'border-blue-500/70 ring-1 ring-blue-500/30 bg-blue-500/5 shadow-xs' : 'border-border/80 hover:border-slate-300 dark:hover:border-slate-700 bg-card'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Settled & Remitted</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-400 font-mono tabular-nums">{kpis.paid}</p>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 font-mono tabular-nums">{formatCurrency(kpis.paidVal)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">Completed Payments</span>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Segmented Navigation & Filter Toolbar ── */}
      <div className="space-y-3">
        {/* Main View Mode Selector Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/80">
            <button
              onClick={() => setActiveViewMode('vendor')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeViewMode === 'vendor'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4 text-amber-600 dark:text-gold" />
              <span>Vendor Grouped ({vendorGroups.length})</span>
            </button>

            <button
              onClick={() => setActiveViewMode('flat')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeViewMode === 'flat'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutList className="w-4 h-4 text-amber-600 dark:text-gold" />
              <span>All Invoices Ledger ({filteredInvoices.length})</span>
            </button>
          </div>

          {/* Expand/Collapse Controls for Vendor View */}
          {activeViewMode === 'vendor' && vendorGroups.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Button variant="ghost" size="sm" onClick={() => toggleAllVendors(true)} className="text-xs text-muted-foreground h-8 rounded-lg">
                Expand All
              </Button>
              <span className="text-border">|</span>
              <Button variant="ghost" size="sm" onClick={() => toggleAllVendors(false)} className="text-xs text-muted-foreground h-8 rounded-lg">
                Collapse All
              </Button>
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3.5 border border-border/80 rounded-2xl shadow-xs">
          {/* Status Tab Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Bills', count: kpis.total },
              { id: 'PENDING', label: 'Needs Action', count: kpis.pending },
              { id: 'APPROVED', label: 'Approved', count: kpis.approved },
              { id: 'PAID', label: 'Paid', count: kpis.paid },
              { id: 'REJECTED', label: 'Rejected' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-amber-500/15 text-amber-700 dark:text-gold font-bold border border-amber-500/30 shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    statusFilter === tab.id ? 'bg-amber-500/20 text-amber-700 dark:text-gold' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Quick Preset Chips & Search Controls */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor, invoice #, PO..."
                className="pl-9 pr-7 py-1.5 h-8 text-xs bg-background border-border text-foreground rounded-xl"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs">
                  ×
                </button>
              )}
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-1.5 h-8 text-xs font-semibold text-foreground focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Sources</option>
              <option value="vendor_portal">Vendor Portal</option>
              <option value="internal_upload">Internal Upload</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. Main Views Content ── */}
      {loading ? (
        <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-gold shadow-inner">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <span className="font-semibold text-foreground">Loading invoices ledger...</span>
        </div>
      ) : error ? (
        <div className="p-6 border border-rose-500/30 bg-rose-500/10 rounded-2xl text-center text-xs text-rose-600 dark:text-rose-400 font-semibold">
          {error}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-20 px-6 border border-border/80 border-dashed rounded-2xl text-center flex flex-col items-center justify-center max-w-md mx-auto bg-card">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-gold flex items-center justify-center mb-3 shadow-inner">
            <Receipt className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-foreground tracking-tight">No Invoices Found</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            No invoice records match the selected search or status criteria.
          </p>
        </div>
      ) : activeViewMode === 'vendor' ? (

        /* ── VENDOR-WISE GROUPED VIEW ── */
        <div className="space-y-4">
          {vendorGroups.map((group) => {
            const isExpanded = expandedVendors[group.key] !== false; // expanded by default

            return (
              <div key={group.key} className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs transition-all">
                {/* Vendor Group Header Card */}
                <div 
                  onClick={() => toggleVendorExpanded(group.key)}
                  className="p-4 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 cursor-pointer select-none border-b border-border/60"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-700 dark:text-gold border border-amber-500/30 font-bold text-sm flex items-center justify-center shrink-0 shadow-inner">
                      {getVendorInitials(group.vendorName)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {group.vendorName}
                        {group.vendorCode !== 'N/A' && (
                          <span className="text-[11px] text-muted-foreground font-mono font-medium bg-muted px-2 py-0.5 rounded-md border border-border/60">
                            {group.vendorCode}
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span><strong>{group.invoices.length}</strong> Bills Linked</span>
                        <span>•</span>
                        <span>Total Invoiced: <strong className="text-foreground font-mono font-semibold">{formatCurrency(group.totalAmount)}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Status Counters */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {group.pendingCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {group.pendingCount} Review
                        </span>
                      )}
                      {group.approvedCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                          {group.approvedCount} Approved
                        </span>
                      )}
                      {group.paidCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-bold">
                          {group.paidCount} Paid
                        </span>
                      )}
                    </div>

                    <div className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground bg-muted/40">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Vendor Invoices Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border bg-slate-50/50 dark:bg-slate-900/30 text-[11px] uppercase tracking-wider">
                          <TableHead className="font-semibold text-muted-foreground">Entered Date</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Invoice #</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">PO Ref</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Invoice Date</TableHead>
                          <TableHead className="font-semibold text-muted-foreground text-right">Basic (₹)</TableHead>
                          <TableHead className="font-semibold text-muted-foreground text-right">Tax (₹)</TableHead>
                          <TableHead className="font-semibold text-muted-foreground text-right">Total Amount (₹)</TableHead>
                          <TableHead className="font-semibold text-muted-foreground text-center">Status</TableHead>
                          <TableHead className="font-semibold text-muted-foreground text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.invoices.map((inv) => {
                          const sub = Number(inv.subtotal || (Number(inv.invoice_total || 0) - Number(inv.tax_amount || 0)));
                          const tax = Number(inv.tax_amount || 0);
                          const tot = Number(inv.invoice_total || 0);

                          return (
                            <TableRow key={inv.invoice_id} className="border-b border-border/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {getEnteredDateString(inv)}
                              </TableCell>
                              <TableCell className="font-bold text-xs font-mono text-foreground">
                                <button 
                                  onClick={() => setInspectInvoice(inv)}
                                  className="hover:text-amber-600 dark:hover:text-gold hover:underline text-left font-mono inline-flex items-center gap-1"
                                >
                                  {inv.invoice_number}
                                  <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-60" />
                                </button>
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground font-medium">
                                <span className="bg-muted px-2 py-0.5 rounded border border-border/60">
                                  {inv.po_no}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{inv.invoice_date || '—'}</TableCell>
                              <TableCell className="text-xs text-foreground text-right font-mono tabular-nums">
                                {formatCurrency(sub)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground text-right font-mono tabular-nums">
                                {formatCurrency(tax)}
                              </TableCell>
                              <TableCell className="text-xs text-foreground font-bold text-right font-mono tabular-nums">
                                {formatCurrency(tot)}
                              </TableCell>
                              <TableCell className="text-center">{getStatusBadge(inv.status)}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setInspectInvoice(inv)}
                                    className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                                    title="Quick Inspect"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  <a
                                    href={getAttachmentDownloadUrl(inv.invoice_id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-xs text-amber-600 dark:text-gold hover:underline p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors"
                                    title="Download PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>

                                  {(String(inv.status).toLowerCase() === 'submitted' || String(inv.status).toLowerCase() === 'under review') && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => { setSelectedInvoice(inv); setStatusAction('Approved'); }}
                                        className="inline-flex items-center text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-1 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setSelectedInvoice(inv); setStatusAction('Rejected'); }}
                                        className="inline-flex items-center text-[11px] text-rose-700 dark:text-rose-400 font-semibold px-2 py-1 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <XCircle className="w-3 h-3 mr-1" /> Reject
                                      </button>
                                    </>
                                  )}

                                  {String(inv.status).toLowerCase() === 'approved' && (
                                    <button
                                      type="button"
                                      onClick={() => handleCreatePaymentRequest(inv)}
                                      className="inline-flex items-center text-[11px] bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
                                      title="Create Payment Request"
                                    >
                                      <CreditCard className="w-3 h-3 mr-1" /> Pay Request
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setInvoiceToDelete(inv)}
                                    className="inline-flex items-center text-xs text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Invoice"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      ) : (

        /* ── DETAILED ALL INVOICES TABLE VIEW ── */
        <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-slate-50/80 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider">
                  <TableHead className="font-semibold text-muted-foreground">Entered Date</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Vendor Name</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Invoice Date</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">P.O Number</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Invoice Number</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right">Basic (₹)</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right">Tax (₹)</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right">Total Amount (₹)</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-center">Status</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => {
                  const sub = Number(inv.subtotal || (Number(inv.invoice_total || 0) - Number(inv.tax_amount || 0)));
                  const tax = Number(inv.tax_amount || 0);
                  const tot = Number(inv.invoice_total || 0);

                  return (
                    <TableRow key={inv.invoice_id} className="border-b border-border/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {getEnteredDateString(inv)}
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        <span className="font-semibold block">{inv.vendor_name || 'Unassigned'}</span>
                        {inv.vendor_code && (
                          <span className="text-[10px] text-muted-foreground font-mono">{inv.vendor_code}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{inv.invoice_date || '—'}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        <span className="bg-muted px-2 py-0.5 rounded border border-border/60 font-medium">
                          {inv.po_no}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-xs font-mono text-foreground">
                        <button 
                          onClick={() => setInspectInvoice(inv)}
                          className="hover:text-amber-600 dark:hover:text-gold hover:underline transition-colors text-left font-mono inline-flex items-center gap-1"
                        >
                          {inv.invoice_number}
                          <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-60" />
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-foreground text-right font-mono tabular-nums">
                        {formatCurrency(sub)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right font-mono tabular-nums">
                        {formatCurrency(tax)}
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-bold text-right whitespace-nowrap font-mono tabular-nums">
                        {formatCurrency(tot)}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectInvoice(inv)}
                            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-medium p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                            title="Inspect Invoice Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={getAttachmentDownloadUrl(inv.invoice_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-amber-600 dark:text-gold hover:underline font-medium p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Download Invoice PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {(String(inv.status).toLowerCase() === 'submitted' || String(inv.status).toLowerCase() === 'under review') && (
                            <>
                              <button
                                type="button"
                                onClick={() => { setSelectedInvoice(inv); setStatusAction('Approved'); }}
                                className="inline-flex items-center text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold px-2 py-1 rounded-lg border border-emerald-500/30 transition-colors cursor-pointer shadow-2xs"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => { setSelectedInvoice(inv); setStatusAction('Rejected'); }}
                                className="inline-flex items-center text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 font-semibold px-2 py-1 rounded-lg border border-rose-500/30 transition-colors cursor-pointer shadow-2xs"
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </button>
                            </>
                          )}

                          {String(inv.status).toLowerCase() === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleCreatePaymentRequest(inv)}
                              className="inline-flex items-center text-xs bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
                              title="Create Payment Request from Invoice"
                            >
                              <CreditCard className="w-3 h-3 mr-1" /> Pay Request
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setInvoiceToDelete(inv)}
                            className="inline-flex items-center text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Invoice Line Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── 5. Slide-Over Quick Inspection Panel (Zoho Books Style) ── */}
      {inspectInvoice && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-slide-left">
            {/* Drawer Top Header */}
            <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">
                    #{inspectInvoice.invoice_number}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(inspectInvoice.invoice_number, 'inv_no')}
                    className="text-muted-foreground hover:text-foreground"
                    title="Copy Invoice Number"
                  >
                    {copiedId === 'inv_no' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <span>•</span>
                  {getStatusBadge(inspectInvoice.status)}
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {inspectInvoice.vendor_name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getAttachmentDownloadUrl(inspectInvoice.invoice_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs text-amber-600 dark:text-gold hover:bg-amber-500/10 font-bold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </a>
                <button
                  onClick={() => setInspectInvoice(null)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center border-b border-border px-5 gap-4 text-xs font-semibold">
              <button
                onClick={() => setDrawerTab('overview')}
                className={`py-3 border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'overview'
                    ? 'border-amber-500 text-amber-700 dark:text-gold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Bill Overview & Taxes
              </button>

              <button
                onClick={() => setDrawerTab('po_health')}
                className={`py-3 border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'po_health'
                    ? 'border-amber-500 text-amber-700 dark:text-gold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                PO Budget Health
              </button>

              <button
                onClick={() => setDrawerTab('pdf')}
                className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  drawerTab === 'pdf'
                    ? 'border-amber-500 text-amber-700 dark:text-gold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Live PDF Preview
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {drawerTab === 'overview' && (
                <>
                  {/* Financial Summary Card */}
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border/80 space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> Tax & Amount Split
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Taxable Basic Value</span>
                        <strong className="text-base font-bold font-mono text-foreground">
                          {formatCurrency(inspectInvoice.subtotal || (Number(inspectInvoice.invoice_total || 0) - Number(inspectInvoice.tax_amount || 0)))}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">GST / Tax Amount</span>
                        <strong className="text-base font-bold font-mono text-foreground">
                          {formatCurrency(inspectInvoice.tax_amount || 0)}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/80 flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Gross Invoice Payable</span>
                      <span className="text-xl font-bold text-amber-600 dark:text-gold font-mono">
                        {formatCurrency(inspectInvoice.invoice_total)}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-2">
                      <h5 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                        Vendor & PO References
                      </h5>
                      <p><span className="text-muted-foreground">Vendor:</span> <strong className="text-foreground">{inspectInvoice.vendor_name}</strong></p>
                      <p><span className="text-muted-foreground">Code:</span> <strong className="text-foreground font-mono">{inspectInvoice.vendor_code || '—'}</strong></p>
                      <p><span className="text-muted-foreground">PO Number:</span> <strong className="text-foreground font-mono">{inspectInvoice.po_no}</strong></p>
                      <p><span className="text-muted-foreground">Source:</span> <span className="capitalize">{inspectInvoice.source?.replace('_', ' ') || 'Internal Upload'}</span></p>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-2">
                      <h5 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                        Dates & Audit
                      </h5>
                      <p><span className="text-muted-foreground">Invoice Date:</span> <strong className="text-foreground">{inspectInvoice.invoice_date || '—'}</strong></p>
                      <p><span className="text-muted-foreground">Entered Date:</span> <span className="text-foreground">{getEnteredDateString(inspectInvoice)}</span></p>
                      <p><span className="text-muted-foreground">Project:</span> <strong className="text-foreground">{inspectInvoice.project || '—'}</strong></p>
                    </div>
                  </div>

                  {/* Remarks / Notes */}
                  {inspectInvoice.remarks && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 text-xs space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">Internal Remarks / Notes</span>
                      <p className="text-foreground leading-relaxed">{inspectInvoice.remarks}</p>
                    </div>
                  )}

                  {/* Rejection Alert */}
                  {inspectInvoice.rejection_reason && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1 text-rose-600 dark:text-rose-400">
                      <span className="font-bold uppercase text-[10px] tracking-wider block flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" /> Rejection Reason
                      </span>
                      <p className="leading-relaxed">{inspectInvoice.rejection_reason}</p>
                    </div>
                  )}
                </>
              )}

              {drawerTab === 'po_health' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-muted/30 border border-border/80 space-y-3 text-xs">
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-600 dark:text-gold" />
                      PO #{inspectInvoice.po_no} Financial Health
                    </h4>
                    
                    {inspectPOData ? (
                      <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Original PO Value:</span>
                          <strong className="text-foreground font-mono text-sm">{formatCurrency(inspectPOData.po_value || inspectPOData.poValue)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">This Invoice Value:</span>
                          <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{formatCurrency(inspectInvoice.invoice_total)}</strong>
                        </div>

                        <div className="p-3 bg-card rounded-xl border border-border flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          <p className="text-[11px] text-muted-foreground">
                            This bill is linked to valid Purchase Order <strong className="text-foreground font-mono">{inspectInvoice.po_no}</strong>.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Purchase Order details loaded from master registry.</p>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'pdf' && (
                <div className="h-[480px] rounded-2xl overflow-hidden border border-border bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                  <iframe 
                    src={getAttachmentDownloadUrl(inspectInvoice.invoice_id)} 
                    className="w-full h-full rounded-xl"
                    title="Invoice PDF Preview"
                  />
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-5 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setInspectInvoice(null)} className="text-xs rounded-xl">
                Close
              </Button>

              <div className="flex items-center gap-2.5">
                {(String(inspectInvoice.status).toLowerCase() === 'submitted' || String(inspectInvoice.status).toLowerCase() === 'under review') && (
                  <>
                    <Button
                      onClick={() => { setSelectedInvoice(inspectInvoice); setStatusAction('Rejected'); }}
                      variant="outline"
                      className="text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold rounded-xl"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                    <Button
                      onClick={() => { setSelectedInvoice(inspectInvoice); setStatusAction('Approved'); }}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Bill
                    </Button>
                  </>
                )}

                {String(inspectInvoice.status).toLowerCase() === 'approved' && (
                  <Button
                    onClick={() => handleCreatePaymentRequest(inspectInvoice)}
                    className="text-xs bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1" /> Create Payment Request
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Status Review Confirmation Modal ── */}
      {selectedInvoice && (
        <Dialog open={true} onClose={() => { setSelectedInvoice(null); setStatusAction(null); }} title={`Confirm ${statusAction} — ${selectedInvoice.invoice_number}`} maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="text-xs text-foreground space-y-1 bg-muted/40 p-4 rounded-2xl border border-border">
              <p><strong className="text-muted-foreground">Vendor:</strong> {selectedInvoice.vendor_name}</p>
              <p><strong className="text-muted-foreground">PO Number:</strong> {selectedInvoice.po_no}</p>
              <p><strong className="text-muted-foreground">Invoice Total:</strong> <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">{formatCurrency(selectedInvoice.invoice_total)}</span></p>
            </div>

            {statusAction === 'Rejected' ? (
              <div>
                <label className="text-xs text-foreground block mb-1.5 font-bold">Reason for Rejection *</label>
                <Textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this invoice is rejected..."
                  className="bg-background border-border text-xs rounded-xl"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => { setSelectedInvoice(null); setStatusAction(null); }} className="text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdateSubmit}
                disabled={actionLoading}
                className={`text-xs font-bold rounded-xl ${statusAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirm {statusAction}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── 7. Internal Invoice Upload Modal ── */}
      {uploadModalOpen && (
        <Dialog open={true} onClose={() => setUploadModalOpen(false)} title="Upload Internal Invoice" maxWidth="max-w-lg">
          <form onSubmit={handleManualUploadSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Select Approved Purchase Order *</label>
              <select
                required
                value={uploadForm.poNo}
                onChange={(e) => setUploadForm({ ...uploadForm, poNo: e.target.value })}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-medium cursor-pointer shadow-2xs"
              >
                <option value="">-- Choose Approved PO --</option>
                {Array.isArray(posList) && posList.map(p => (
                  <option key={p.po_no || p.poNo} value={p.po_no || p.poNo}>
                    {p.po_no || p.poNo} — {p.vendor_name || p.vendor} ({formatCurrency(p.po_value || p.poValue)})
                  </option>
                ))}
              </select>

              {selectedPOData && (
                <div className="mt-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <p><span className="text-muted-foreground">Vendor:</span> <strong>{selectedPOData.vendor_name || selectedPOData.vendor}</strong></p>
                  <p><span className="text-muted-foreground">PO Value:</span> <strong className="font-mono">{formatCurrency(selectedPOData.po_value || selectedPOData.poValue)}</strong></p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Invoice Number *</label>
                <Input
                  type="text"
                  required
                  value={uploadForm.invoiceNumber}
                  onChange={(e) => setUploadForm({ ...uploadForm, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-2026-0092"
                  className="bg-background border-border text-xs font-mono rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Invoice Date *</label>
                <Input
                  type="date"
                  required
                  value={uploadForm.invoiceDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, invoiceDate: e.target.value })}
                  className="bg-background border-border text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Subtotal / Basic (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={uploadForm.subtotal}
                  onChange={(e) => handleAmountChange('subtotal', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-mono rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Tax Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={uploadForm.taxAmount}
                  onChange={(e) => handleAmountChange('taxAmount', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-mono rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Total Amount (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={uploadForm.invoiceTotal}
                  onChange={(e) => handleAmountChange('invoiceTotal', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-bold text-amber-600 dark:text-amber-400 font-mono rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Invoice Document File *</label>
              <div 
                onDragEnter={handleDrag} 
                onDragLeave={handleDrag} 
                onDragOver={handleDrag} 
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                  dragActive ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-background hover:border-muted-foreground'
                }`}
              >
                <UploadCloud className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-foreground">Drag & drop invoice PDF or image here</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">or select a file from your computer</p>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  required={!selectedFile}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-3 text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-600 dark:file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
                />
                {selectedFile && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                    <Button
                      type="button"
                      onClick={handleAiAutoFill}
                      disabled={aiLoading}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {aiLoading ? 'AI Reading Document...' : '✨ AI Auto-Fill Invoice Details'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Internal Remarks</label>
              <Textarea
                rows={2}
                value={uploadForm.remarks}
                onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
                placeholder="Optional internal notes..."
                className="bg-background border-border text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setUploadModalOpen(false)} disabled={uploading} className="text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 px-4 rounded-xl shadow-xs"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {uploading ? 'Uploading...' : 'Submit Internal Invoice'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ── 8. Delete Invoice Modal ── */}
      {invoiceToDelete && (
        <Dialog open={true} onClose={() => setInvoiceToDelete(null)} title="Delete Invoice Record" maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Invoice Record</h3>
                <p className="text-xs text-muted-foreground">Confirm permanent deletion of invoice record</p>
              </div>
            </div>

            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-foreground space-y-1">
              <p><strong className="text-muted-foreground">Invoice #:</strong> <span className="font-mono font-bold text-foreground">{invoiceToDelete.invoice_number}</span></p>
              <p><strong className="text-muted-foreground">PO #:</strong> <span className="font-mono text-foreground">{invoiceToDelete.po_no}</span></p>
              <p><strong className="text-muted-foreground">Vendor:</strong> <span className="text-foreground">{invoiceToDelete.vendor_name}</span></p>
              <p><strong className="text-muted-foreground">Total:</strong> <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{formatCurrency(invoiceToDelete.invoice_total)}</span></p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setInvoiceToDelete(null)} disabled={deleting} className="text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteInvoiceConfirm}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 rounded-xl shadow-xs"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

    </div>
  );
}
