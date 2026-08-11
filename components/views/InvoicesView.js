'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, Input, Dialog, Textarea } from '../ui/core';
import { 
  Receipt, Search, Filter, Download, CheckCircle2, XCircle, Clock, FilePlus, 
  Loader2, CreditCard, Eye, Trash2, AlertTriangle, LayoutGrid, LayoutList, 
  FileText, Sparkles, Building, IndianRupee, RefreshCw, FileCheck, ShieldAlert, UploadCloud,
  ChevronDown, ChevronRight, Users, Calendar
} from 'lucide-react';
import { toast } from '../ui/Toast';
import { exportToCSV } from '../../app/lib/exportUtils';
import { formatDate } from '../../app/lib/utils';

export default function InvoicesView() {
  const { call, setActiveView } = useAppState();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View mode tab: 'vendor' (Vendor-Wise Grouped) | 'flat' (Detailed All Invoices Table)
  const [activeViewMode, setActiveViewMode] = useState('vendor');

  // Vendor View Expanded Accordion State: object mapping vendorKey -> boolean
  const [expandedVendors, setExpandedVendors] = useState({});

  // Inspection Drawer State
  const [inspectInvoice, setInspectInvoice] = useState(null);

  // Deletion State
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'
  const [sourceFilter, setSourceFilter] = useState('ALL');

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

      return matchesSearch && matchesTab && matchesSource;
    });
  }, [invoices, search, statusFilter, sourceFilter]);

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

    return Array.from(map.values());
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
    const approvedVal = invoices.filter(i => String(i.status || '').toLowerCase() === 'approved' || String(i.status || '').toLowerCase() === 'paid').reduce((acc, i) => acc + (Number(i.invoice_total) || 0), 0);

    return { total, pending, approved, paid, totalVal, approvedVal };
  }, [invoices]);

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const getAttachmentDownloadUrl = (invoiceId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lx_auth_token') : '';
    return `/api/attachments/${invoiceId}?token=${encodeURIComponent(token || '')}`;
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 text-[11px]">Approved</Badge>;
    if (s === 'paid') return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold px-2 py-0.5 text-[11px]">Paid</Badge>;
    if (s === 'rejected') return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold px-2 py-0.5 text-[11px]">Rejected</Badge>;
    if (s === 'under review') return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold px-2 py-0.5 text-[11px]">Under Review</Badge>;
    return <Badge className="bg-muted text-muted-foreground border border-border font-medium px-2 py-0.5 text-[11px]">Submitted</Badge>;
  };

  const selectedPOData = useMemo(() => {
    if (!uploadForm.poNo || !Array.isArray(posList)) return null;
    return posList.find(p => String(p.po_no || p.poNo) === String(uploadForm.poNo));
  }, [uploadForm.poNo, posList]);

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

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* ── 1. Header Card ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-5 rounded-xl shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-gold border border-amber-500/20 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Invoice Management Ledger
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vendor-grouped & financial detailed views for invoice processing and audit
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            className="text-xs font-semibold h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-amber-600 dark:text-gold' : 'text-muted-foreground'}`} />
            Sync
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs font-semibold h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Export CSV
          </Button>

          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold text-xs h-9 px-4 flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <FilePlus className="w-4 h-4" /> Upload Internal Invoice
          </Button>
        </div>
      </div>

      {/* ── 2. Metric KPI Cards Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card 
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer transition-all ${
            statusFilter === 'ALL' ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Invoices</span>
              <div className="p-1.5 rounded bg-muted text-muted-foreground">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums mt-1.5">{kpis.total}</p>
            <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">Total Invoiced: {formatCurrency(kpis.totalVal)}</span>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter('PENDING')}
          className={`cursor-pointer transition-all ${
            statusFilter === 'PENDING' ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Action Needed</span>
              <div className="p-1.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums mt-1.5">{kpis.pending}</p>
            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 block font-medium">Requires Admin Audit</span>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter('APPROVED')}
          className={`cursor-pointer transition-all ${
            statusFilter === 'APPROVED' ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</span>
              <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums mt-1.5">{kpis.approved}</p>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 block font-medium">Ready for Payment</span>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter('PAID')}
          className={`cursor-pointer transition-all ${
            statusFilter === 'PAID' ? 'border-blue-500/60 ring-1 ring-blue-500/30' : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Paid Invoices</span>
              <div className="p-1.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums mt-1.5">{kpis.paid}</p>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5 block font-medium">Settled Outflow</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Approved Value</span>
              <div className="p-1.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg font-bold tracking-tight text-foreground tabular-nums mt-1.5 truncate">{formatCurrency(kpis.approvedVal)}</p>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Committed Liability</span>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Mode Switcher Tabs & Filter Toolbar ── */}
      <div className="space-y-3">
        {/* Main View Mode Selector Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveViewMode('vendor')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeViewMode === 'vendor'
                  ? 'bg-amber-600 text-slate-950 shadow-xs'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Vendor Wise View ({vendorGroups.length} Vendors)</span>
            </button>

            <button
              onClick={() => setActiveViewMode('flat')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeViewMode === 'flat'
                  ? 'bg-amber-600 text-slate-950 shadow-xs'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>Detailed All Invoices Ledger ({filteredInvoices.length})</span>
            </button>
          </div>

          {activeViewMode === 'vendor' && vendorGroups.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Button variant="ghost" size="sm" onClick={() => toggleAllVendors(true)} className="text-xs text-muted-foreground h-7">
                Expand All
              </Button>
              <span className="text-border">|</span>
              <Button variant="ghost" size="sm" onClick={() => toggleAllVendors(false)} className="text-xs text-muted-foreground h-7">
                Collapse All
              </Button>
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 border border-border rounded-xl shadow-2xs">
          {/* Status Tab Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Statuses', count: kpis.total },
              { id: 'PENDING', label: 'Needs Action', count: kpis.pending },
              { id: 'APPROVED', label: 'Approved', count: kpis.approved },
              { id: 'PAID', label: 'Paid', count: kpis.paid },
              { id: 'REJECTED', label: 'Rejected' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-amber-500/15 text-amber-700 dark:text-gold font-bold border border-amber-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    statusFilter === tab.id ? 'bg-amber-500/20 text-amber-700 dark:text-gold' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right Search & Source Controls */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor, invoice #, PO..."
                className="pl-9 pr-7 py-1.5 h-8 text-xs bg-background border-border text-foreground"
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
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 h-8 text-xs font-semibold text-foreground focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="vendor_portal">Vendor Portal</option>
              <option value="internal_upload">Internal Upload</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. Main Views Renderer ── */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-gold">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <span className="font-semibold text-foreground">Loading invoices dataset...</span>
        </div>
      ) : error ? (
        <div className="p-6 border border-red-500/30 bg-red-500/10 rounded-xl text-center text-xs text-red-600 dark:text-red-400 font-semibold">
          {error}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-16 px-6 border border-border border-dashed rounded-xl text-center flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-gold flex items-center justify-center mb-3">
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
              <Card key={group.key} className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
                {/* Vendor Group Header Card */}
                <div 
                  onClick={() => toggleVendorExpanded(group.key)}
                  className="p-4 bg-muted/30 hover:bg-muted/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none border-b border-border/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-gold border border-amber-500/20 shrink-0">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {group.vendorName}
                        {group.vendorCode !== 'N/A' && (
                          <span className="text-xs text-muted-foreground font-mono font-normal">({group.vendorCode})</span>
                        )}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span><strong>{group.invoices.length}</strong> Invoices linked</span>
                        <span>•</span>
                        <span>Total Invoiced: <strong className="text-foreground">{formatCurrency(group.totalAmount)}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Status Counters */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {group.pendingCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                          {group.pendingCount} Pending
                        </span>
                      )}
                      {group.approvedCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                          {group.approvedCount} Approved
                        </span>
                      )}
                      {group.paidCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
                          {group.paidCount} Paid
                        </span>
                      )}
                    </div>

                    <div className="p-1 rounded text-muted-foreground hover:text-foreground">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Vendor Invoices Table */}
                {isExpanded && (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-slate-50/50 dark:bg-slate-900/30 text-[11px]">
                        <TableHead className="font-semibold text-muted-foreground">Entered Date</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">Invoice Number</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">PO Number</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">Invoice Date</TableHead>
                        <TableHead className="font-semibold text-muted-foreground text-right">Basic Value</TableHead>
                        <TableHead className="font-semibold text-muted-foreground text-right">Tax</TableHead>
                        <TableHead className="font-semibold text-muted-foreground text-right">Total Amount</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.invoices.map((inv) => {
                        const sub = Number(inv.subtotal || (Number(inv.invoice_total || 0) - Number(inv.tax_amount || 0)));
                        const tax = Number(inv.tax_amount || 0);
                        const tot = Number(inv.invoice_total || 0);

                        return (
                          <TableRow key={inv.invoice_id} className="border-b border-border/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {getEnteredDateString(inv)}
                            </TableCell>
                            <TableCell className="font-bold text-xs font-mono text-foreground">
                              <button 
                                onClick={() => setInspectInvoice(inv)}
                                className="hover:text-amber-600 dark:hover:text-gold hover:underline text-left font-mono"
                              >
                                {inv.invoice_number}
                              </button>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{inv.po_no}</TableCell>
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
                            <TableCell>{getStatusBadge(inv.status)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap space-x-1">
                              <button
                                type="button"
                                onClick={() => setInspectInvoice(inv)}
                                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                                title="Inspect Invoice"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={getAttachmentDownloadUrl(inv.invoice_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-amber-600 dark:text-gold hover:underline p-1 hover:bg-amber-500/10 rounded transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>

                              {String(inv.status).toLowerCase() === 'submitted' || String(inv.status).toLowerCase() === 'under review' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedInvoice(inv); setStatusAction('Approved'); }}
                                    className="inline-flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedInvoice(inv); setStatusAction('Rejected'); }}
                                    className="inline-flex items-center text-[11px] text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-500/30 hover:bg-red-500/10 cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : null}

                              {String(inv.status).toLowerCase() === 'approved' ? (
                                <button
                                  type="button"
                                  onClick={() => handleCreatePaymentRequest(inv)}
                                  className="inline-flex items-center text-[11px] bg-amber-600 hover:bg-amber-700 dark:bg-gold text-slate-950 font-bold px-2 py-0.5 rounded cursor-pointer"
                                >
                                  Pay
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => setInvoiceToDelete(inv)}
                                className="inline-flex items-center text-xs text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                title="Delete Invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            );
          })}
        </div>

      ) : (

        /* ── DETAILED ALL INVOICES TABLE VIEW ── */
        <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-slate-50/80 dark:bg-slate-900/50">
                <TableHead className="text-xs font-semibold text-muted-foreground">Entered Date</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Vendor Name</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Invoice Date</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">P.O Number</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Invoice Number</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Basic Value</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Tax</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Total Amount</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
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
                      <span className="font-semibold">{inv.vendor_name || 'Unassigned'}</span>
                      {inv.vendor_code && (
                        <span className="block text-[10px] text-muted-foreground font-mono">{inv.vendor_code}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{inv.invoice_date || '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{inv.po_no}</TableCell>
                    <TableCell className="font-bold text-xs font-mono text-foreground">
                      <button 
                        onClick={() => setInspectInvoice(inv)}
                        className="hover:text-amber-600 dark:hover:text-gold hover:underline transition-colors text-left font-mono"
                      >
                        {inv.invoice_number}
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
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap space-x-1.5">
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

                      {String(inv.status).toLowerCase() === 'submitted' || String(inv.status).toLowerCase() === 'under review' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => { setSelectedInvoice(inv); setStatusAction('Approved'); }}
                            className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold px-2 py-1 rounded-md border border-emerald-500/30 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedInvoice(inv); setStatusAction('Rejected'); }}
                            className="inline-flex items-center text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 font-bold px-2 py-1 rounded-md border border-red-500/30 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </button>
                        </>
                      ) : null}

                      {String(inv.status).toLowerCase() === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => handleCreatePaymentRequest(inv)}
                          className="inline-flex items-center text-xs bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                          title="Create Payment Request from Invoice"
                        >
                          <CreditCard className="w-3 h-3 mr-1" /> Pay Request
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setInvoiceToDelete(inv)}
                        className="inline-flex items-center text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Invoice Line Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── 5. Detailed Inspection Modal ── */}
      {inspectInvoice && (
        <Dialog open={true} onClose={() => setInspectInvoice(null)} title={`Invoice Inspection — ${inspectInvoice.invoice_number}`} maxWidth="max-w-2xl">
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
                <h4 className="font-bold text-amber-600 dark:text-amber-400 border-b border-border pb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Vendor & PO Metadata
                </h4>
                <p><span className="text-muted-foreground">Vendor Name:</span> <strong className="text-foreground">{inspectInvoice.vendor_name}</strong></p>
                <p><span className="text-muted-foreground">Vendor Code:</span> <strong className="text-foreground font-mono">{inspectInvoice.vendor_code || '—'}</strong></p>
                <p><span className="text-muted-foreground">PO Number:</span> <strong className="text-foreground font-mono">{inspectInvoice.po_no}</strong></p>
                <p><span className="text-muted-foreground">Project:</span> <strong className="text-foreground">{inspectInvoice.project || '—'}</strong></p>
                <p><span className="text-muted-foreground">Entered Date:</span> <span className="text-foreground font-medium">{getEnteredDateString(inspectInvoice)}</span></p>
              </div>

              <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2">
                <h4 className="font-bold text-amber-600 dark:text-amber-400 border-b border-border pb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" /> Financial & Tax Breakdown
                </h4>
                <p><span className="text-muted-foreground">Basic Value:</span> <strong className="text-foreground font-mono">{formatCurrency(inspectInvoice.subtotal || (inspectInvoice.invoice_total - (inspectInvoice.tax_amount || 0)))}</strong></p>
                <p><span className="text-muted-foreground">Tax Amount:</span> <strong className="text-foreground font-mono">{formatCurrency(inspectInvoice.tax_amount || 0)}</strong></p>
                <p><span className="text-muted-foreground">Invoice Total:</span> <strong className="text-amber-600 dark:text-amber-400 font-bold font-mono text-sm">{formatCurrency(inspectInvoice.invoice_total)}</strong></p>
                <p><span className="text-muted-foreground">Status:</span> {getStatusBadge(inspectInvoice.status)}</p>
              </div>
            </div>

            {inspectInvoice.remarks && (
              <div className="p-3 bg-muted/20 border border-border rounded-xl text-xs space-y-1">
                <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">Internal Remarks / Notes</span>
                <p className="text-foreground leading-relaxed">{inspectInvoice.remarks}</p>
              </div>
            )}

            {inspectInvoice.rejection_reason && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs space-y-1 text-red-600 dark:text-red-400">
                <span className="font-bold uppercase text-[10px] tracking-wider block flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Rejection Reason
                </span>
                <p className="leading-relaxed">{inspectInvoice.rejection_reason}</p>
              </div>
            )}

            <div className="p-4 bg-muted/30 border border-border rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Invoice Document File</span>
              </div>
              <a
                href={getAttachmentDownloadUrl(inspectInvoice.invoice_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 text-xs text-amber-600 dark:text-gold hover:bg-amber-500/10 font-bold rounded-lg border border-amber-500/30 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> View / Download PDF
              </a>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setInspectInvoice(null)} className="text-xs">
                Close
              </Button>

              <div className="flex items-center gap-2">
                {String(inspectInvoice.status).toLowerCase() === 'submitted' || String(inspectInvoice.status).toLowerCase() === 'under review' ? (
                  <>
                    <Button
                      onClick={() => { setSelectedInvoice(inspectInvoice); setStatusAction('Rejected'); }}
                      variant="outline"
                      className="text-xs border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Invoice
                    </Button>
                    <Button
                      onClick={() => { setSelectedInvoice(inspectInvoice); setStatusAction('Approved'); }}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Invoice
                    </Button>
                  </>
                ) : null}

                {String(inspectInvoice.status).toLowerCase() === 'approved' ? (
                  <Button
                    onClick={() => handleCreatePaymentRequest(inspectInvoice)}
                    className="text-xs bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1" /> Create Payment Request
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── 6. Status Review Confirmation Modal ── */}
      {selectedInvoice && (
        <Dialog open={true} onClose={() => { setSelectedInvoice(null); setStatusAction(null); }} title={`Confirm ${statusAction} — ${selectedInvoice.invoice_number}`} maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="text-xs text-foreground space-y-1 bg-muted/40 p-3.5 rounded-xl border border-border">
              <p><strong className="text-muted-foreground">Vendor:</strong> {selectedInvoice.vendor_name}</p>
              <p><strong className="text-muted-foreground">PO Number:</strong> {selectedInvoice.po_no}</p>
              <p><strong className="text-muted-foreground">Invoice Total:</strong> <span className="text-amber-600 dark:text-amber-400 font-bold">{formatCurrency(selectedInvoice.invoice_total)}</span></p>
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
                  className="bg-background border-border text-xs"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => { setSelectedInvoice(null); setStatusAction(null); }} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdateSubmit}
                disabled={actionLoading}
                className={`text-xs font-bold ${statusAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
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
        <Dialog open={true} onClose={() => setUploadModalOpen(false)} title="Upload Internal Manual Invoice" maxWidth="max-w-lg">
          <form onSubmit={handleManualUploadSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Select Approved Purchase Order *</label>
              <select
                required
                value={uploadForm.poNo}
                onChange={(e) => setUploadForm({ ...uploadForm, poNo: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
              >
                <option value="">-- Choose Approved PO --</option>
                {Array.isArray(posList) && posList.map(p => (
                  <option key={p.po_no || p.poNo} value={p.po_no || p.poNo}>
                    {p.po_no || p.poNo} — {p.vendor_name || p.vendor} ({formatCurrency(p.po_value || p.poValue)})
                  </option>
                ))}
              </select>

              {selectedPOData && (
                <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 space-y-1">
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
                  className="bg-background border-border text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Invoice Date *</label>
                <Input
                  type="date"
                  required
                  value={uploadForm.invoiceDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, invoiceDate: e.target.value })}
                  className="bg-background border-border text-xs"
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
                  className="bg-background border-border text-xs font-mono"
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
                  className="bg-background border-border text-xs font-mono"
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
                  className="bg-background border-border text-xs font-bold text-amber-600 dark:text-amber-400 font-mono"
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
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                  dragActive ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-background hover:border-muted-foreground'
                }`}
              >
                <UploadCloud className="w-7 h-7 text-amber-600 dark:text-amber-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-foreground">Drag & drop invoice PDF or image here</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">or choose a file from your computer</p>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  required={!selectedFile}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-3 text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-600 dark:file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
                />
                {selectedFile && (
                  <div className="mt-2.5 flex flex-col items-center gap-2">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                    <Button
                      type="button"
                      onClick={handleAiAutoFill}
                      disabled={aiLoading}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
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
                className="bg-background border-border text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setUploadModalOpen(false)} disabled={uploading} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 px-4"
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
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Invoice Line Item</h3>
                <p className="text-xs text-muted-foreground">Confirm permanent deletion of invoice record</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-foreground space-y-1">
              <p><strong className="text-muted-foreground">Invoice #:</strong> <span className="font-mono font-bold text-foreground">{invoiceToDelete.invoice_number}</span></p>
              <p><strong className="text-muted-foreground">PO #:</strong> <span className="font-mono text-foreground">{invoiceToDelete.po_no}</span></p>
              <p><strong className="text-muted-foreground">Vendor:</strong> <span className="text-foreground">{invoiceToDelete.vendor_name}</span></p>
              <p><strong className="text-muted-foreground">Total:</strong> <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{formatCurrency(invoiceToDelete.invoice_total)}</span></p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setInvoiceToDelete(null)} disabled={deleting} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteInvoiceConfirm}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
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
