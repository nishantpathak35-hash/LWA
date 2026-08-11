'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import { Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '../ui/core';
import { 
  Receipt, Search, Filter, Download, CheckCircle2, XCircle, Clock, FilePlus, 
  Loader2, CreditCard, Eye, Trash2, AlertTriangle, LayoutGrid, LayoutList, 
  FileText, Sparkles, ChevronRight, Building, IndianRupee, ArrowUpRight, 
  RefreshCw, Check, X, ShieldAlert, FileCheck, ExternalLink, SlidersHorizontal,
  PieChart, BarChart2, CheckCircle, HelpCircle, UploadCloud
} from 'lucide-react';
import { toast } from '../ui/Toast';
import { exportToCSV } from '../../app/lib/exportUtils';

export default function InvoicesView() {
  const { call, setActiveView } = useAppState();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View modes: 'table' | 'grid' | 'analytics'
  const [viewMode, setViewMode] = useState('table');
  const [inspectInvoice, setInspectInvoice] = useState(null); // Detail Inspection Drawer

  // Deletion State
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'
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
      setInvoices(data || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError(err.message || 'Failed to load invoices dataset');
    } finally {
      setLoading(false);
    }
  };

  const fetchPOs = async () => {
    try {
      const res = await call('getPOsOnly');
      // Extract array safely from getPOsOnly response { pos: [...] }
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
      { label: 'Invoice Number', key: 'invoice_number' },
      { label: 'Vendor Name', key: 'vendor_name' },
      { label: 'Vendor Code', key: 'vendor_code' },
      { label: 'PO Number', key: 'po_no' },
      { label: 'Invoice Date', key: 'invoice_date' },
      { label: 'Subtotal', key: 'subtotal' },
      { label: 'Tax Amount', key: 'tax_amount' },
      { label: 'Invoice Total', key: 'invoice_total' },
      { label: 'Source', key: 'source' },
      { label: 'Status', key: 'status' }
    ];
    exportToCSV('Invoices_Ledger_Report.csv', columns, filteredInvoices);
  };

  // Filtered List
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const s = search.toLowerCase().trim();
      const matchesSearch = !s || 
        String(inv.invoice_number || '').toLowerCase().includes(s) ||
        String(inv.vendor_name || '').toLowerCase().includes(s) ||
        String(inv.po_no || '').toLowerCase().includes(s) ||
        String(inv.invoice_id || '').toLowerCase().includes(s);

      const st = String(inv.status || '').toLowerCase();
      let matchesTab = true;
      if (activeTab === 'PENDING') matchesTab = st === 'submitted' || st === 'under review';
      else if (activeTab === 'APPROVED') matchesTab = st === 'approved';
      else if (activeTab === 'PAID') matchesTab = st === 'paid';
      else if (activeTab === 'REJECTED') matchesTab = st === 'rejected';

      const matchesSource = sourceFilter === 'ALL' || String(inv.source || '').toLowerCase() === sourceFilter.toLowerCase();

      return matchesSearch && matchesTab && matchesSource;
    });
  }, [invoices, search, activeTab, sourceFilter]);

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
    if (s === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 text-[11px]">Approved</Badge>;
    if (s === 'paid') return <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold px-2 py-0.5 text-[11px]">Paid</Badge>;
    if (s === 'rejected') return <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold px-2 py-0.5 text-[11px]">Rejected</Badge>;
    if (s === 'under review') return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 text-[11px]">Under Review</Badge>;
    return <Badge className="bg-slate-500/10 text-slate-300 border border-slate-700 font-medium px-2 py-0.5 text-[11px]">Submitted</Badge>;
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

  return (
    <div className="space-y-6 select-none animate-fade-in pb-12">

      {/* ── 1. Reimagined Hero Banner Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border border-amber-500/20 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 animate-pulse" /> Enterprise Invoice Hub
              </span>
              <span className="text-xs text-slate-400 font-mono">v2.4 Live Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight flex items-center gap-3">
              Invoice Management Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Automated vendor portal invoice processing, PO match auditing, internal billing capture, and real-time payment readiness ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInvoices}
              className="text-xs font-semibold h-10 border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              Sync Data
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs font-semibold h-10 border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200"
            >
              <Download className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Export CSV
            </Button>

            <Button
              onClick={() => setUploadModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs h-10 px-5 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <FilePlus className="w-4 h-4 stroke-[2.5]" /> Upload Internal Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Metric KPI Cards Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        
        {/* Total Invoices */}
        <div 
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'ALL' ? 'bg-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/5' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Invoices</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-100 tracking-tight mt-2">{kpis.total}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Total Invoiced: {formatCurrency(kpis.totalVal)}</span>
        </div>

        {/* Needs Review */}
        <div 
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'PENDING' ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Action Needed</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-400 tracking-tight mt-2">{kpis.pending}</p>
          <span className="text-[10px] text-amber-400/80 mt-1 block">Requires Admin Audit</span>
        </div>

        {/* Approved */}
        <div 
          onClick={() => setActiveTab('APPROVED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'APPROVED' ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-400 tracking-tight mt-2">{kpis.approved}</p>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">Ready for Payment</span>
        </div>

        {/* Paid */}
        <div 
          onClick={() => setActiveTab('PAID')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'PAID' ? 'bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/10' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Paid</span>
            <FileCheck className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-blue-400 tracking-tight mt-2">{kpis.paid}</p>
          <span className="text-[10px] text-blue-400/80 mt-1 block">Settled Outflow</span>
        </div>

        {/* Approved Value */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved Total</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <p className="text-lg font-black text-amber-400 tracking-tight mt-2 truncate">{formatCurrency(kpis.approvedVal)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Committed Liability</span>
        </div>

      </div>

      {/* ── 3. Filters & View Switcher Toolbar ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 border border-slate-800/80 rounded-2xl shadow-xl">
        
        {/* Status Tab Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Invoices', count: kpis.total },
            { id: 'PENDING', label: 'Needs Action', count: kpis.pending, highlight: true },
            { id: 'APPROVED', label: 'Approved', count: kpis.approved },
            { id: 'PAID', label: 'Paid', count: kpis.paid },
            { id: 'REJECTED', label: 'Rejected' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right Controls: Search, Source Filter, View Toggle */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          
          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, vendor, PO..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs">
                ×
              </button>
            )}
          </div>

          {/* Source Selector */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Sources</option>
            <option value="vendor_portal">Vendor Portal</option>
            <option value="internal_upload">Internal Upload</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ── 4. Main View Renderer ── */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="p-3.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <span className="font-semibold text-slate-300">Loading invoice ledger dataset...</span>
        </div>
      ) : error ? (
        <div className="p-6 border border-rose-500/30 bg-rose-500/10 rounded-2xl text-center text-xs text-rose-400 font-semibold">
          {error}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-20 px-6 border border-slate-800 border-dashed rounded-2xl text-center flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 shadow-lg">
            <Receipt className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-100 tracking-tight">No Invoices Found</h4>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            No invoice records match the selected status or search filter. Upload an internal invoice or clear search criteria.
          </p>
        </div>
      ) : viewMode === 'table' ? (

        /* ── Dense ERP Table View ── */
        <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/50 shadow-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-800 bg-slate-950/60">
                <TableHead className="text-xs font-bold text-slate-400">Invoice No</TableHead>
                <TableHead className="text-xs font-bold text-slate-400">Vendor Name</TableHead>
                <TableHead className="text-xs font-bold text-slate-400">PO Number</TableHead>
                <TableHead className="text-xs font-bold text-slate-400">Date</TableHead>
                <TableHead className="text-xs font-bold text-slate-400 text-right">Invoice Total</TableHead>
                <TableHead className="text-xs font-bold text-slate-400">Source</TableHead>
                <TableHead className="text-xs font-bold text-slate-400">Status</TableHead>
                <TableHead className="text-xs font-bold text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.invoice_id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                  <TableCell className="font-bold text-xs font-mono text-slate-100">
                    <button 
                      onClick={() => setInspectInvoice(inv)}
                      className="hover:text-amber-400 hover:underline transition-colors text-left flex items-center gap-1.5"
                    >
                      {inv.invoice_number}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-slate-200">
                    <span className="font-semibold">{inv.vendor_name}</span>
                    {inv.vendor_code && (
                      <span className="block text-[10px] text-slate-400 font-mono">{inv.vendor_code}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-400">{inv.po_no}</TableCell>
                  <TableCell className="text-xs text-slate-400 whitespace-nowrap">{inv.invoice_date}</TableCell>
                  <TableCell className="text-xs text-amber-400 font-bold text-right whitespace-nowrap font-mono">
                    {formatCurrency(inv.invoice_total)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    <span className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      inv.source === 'internal_upload'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    }`}>
                      {inv.source ? inv.source.replace('_', ' ') : 'vendor portal'}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setInspectInvoice(inv)}
                      className="inline-flex items-center text-xs text-slate-300 hover:text-white font-medium p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Inspect Invoice & Preview Attachment"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <a
                      href={getAttachmentDownloadUrl(inv.invoice_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-amber-400 hover:text-amber-300 font-medium p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors"
                      title="Download Invoice PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {String(inv.status).toLowerCase() === 'submitted' || String(inv.status).toLowerCase() === 'under review' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setSelectedInvoice(inv); setStatusAction('Approved'); }}
                          className="inline-flex items-center text-xs text-emerald-400 hover:bg-emerald-500/20 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedInvoice(inv); setStatusAction('Rejected'); }}
                          className="inline-flex items-center text-xs text-rose-400 hover:bg-rose-500/20 font-bold px-2.5 py-1 rounded-lg border border-rose-500/30 transition-colors"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </button>
                      </>
                    ) : null}

                    {String(inv.status).toLowerCase() === 'approved' ? (
                      <button
                        type="button"
                        onClick={() => handleCreatePaymentRequest(inv)}
                        className="inline-flex items-center text-xs text-slate-950 bg-amber-500 hover:bg-amber-400 font-black px-2.5 py-1 rounded-lg transition-all shadow-sm"
                        title="Create Payment Request from Invoice"
                      >
                        <CreditCard className="w-3 h-3 mr-1 stroke-[2.5]" /> Pay Request
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setInvoiceToDelete(inv)}
                      className="inline-flex items-center text-xs text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete Invoice Line Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

      ) : (

        /* ── Rich Card Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((inv) => (
            <div 
              key={inv.invoice_id} 
              className="bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">Invoice Number</span>
                    <button 
                      onClick={() => setInspectInvoice(inv)}
                      className="text-base font-black text-slate-100 group-hover:text-amber-400 transition-colors text-left font-mono"
                    >
                      {inv.invoice_number}
                    </button>
                  </div>
                  {getStatusBadge(inv.status)}
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vendor:</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[180px]">{inv.vendor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PO Number:</span>
                    <span className="font-mono text-slate-300 font-semibold">{inv.po_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="text-slate-300">{inv.invoice_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Source:</span>
                    <span className="capitalize text-slate-400 text-[10px]">{inv.source ? inv.source.replace('_', ' ') : 'vendor portal'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Invoice Amount</span>
                  <span className="text-xl font-black text-amber-400 font-mono">{formatCurrency(inv.invoice_total)}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                <div className="flex items-center gap-1.5">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setInspectInvoice(inv)} 
                    className="h-8 text-xs border-slate-800 text-slate-300 hover:bg-slate-800 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" /> View Details
                  </Button>
                  <a
                    href={getAttachmentDownloadUrl(inv.invoice_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-2.5 text-xs text-amber-400 hover:bg-amber-500/10 font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </a>
                </div>

                <div className="flex items-center gap-1">
                  {String(inv.status).toLowerCase() === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => handleCreatePaymentRequest(inv)}
                      className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1 stroke-[2.5]" /> Pay
                    </Button>
                  )}
                  <button
                    onClick={() => setInvoiceToDelete(inv)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 5. Detailed Split-Screen Inspection & PDF Drawer ── */}
      {inspectInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full space-y-6 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-sm">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    Invoice #{inspectInvoice.invoice_number}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">System ID: {inspectInvoice.invoice_id}</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectInvoice(null)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Split Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Left Column: Vendor & PO Reference */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2.5">
                <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Vendor & PO Metadata
                </h4>
                <p><span className="text-slate-400">Vendor Legal Name:</span> <strong className="text-slate-100">{inspectInvoice.vendor_name}</strong></p>
                <p><span className="text-slate-400">Vendor Code:</span> <strong className="text-slate-200 font-mono">{inspectInvoice.vendor_code || '—'}</strong></p>
                <p><span className="text-slate-400">PO Number:</span> <strong className="text-slate-200 font-mono">{inspectInvoice.po_no}</strong></p>
                <p><span className="text-slate-400">Linked Project:</span> <strong className="text-slate-200">{inspectInvoice.project || '—'}</strong></p>
                <p><span className="text-slate-400">Submission Source:</span> <span className="capitalize text-slate-300 font-semibold">{inspectInvoice.source ? inspectInvoice.source.replace('_', ' ') : 'vendor portal'}</span></p>
              </div>

              {/* Right Column: Financial Calculation */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2.5">
                <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" /> Billing & Tax Breakdown
                </h4>
                <p><span className="text-slate-400">Invoice Subtotal:</span> <strong className="text-slate-200 font-mono">{formatCurrency(inspectInvoice.subtotal)}</strong></p>
                <p><span className="text-slate-400">Tax Amount (GST):</span> <strong className="text-slate-200 font-mono">{formatCurrency(inspectInvoice.tax_amount)}</strong></p>
                <p><span className="text-slate-400">Gross Total Amount:</span> <strong className="text-amber-400 font-black font-mono text-base">{formatCurrency(inspectInvoice.invoice_total)}</strong></p>
                <p><span className="text-slate-400">Current Status:</span> {getStatusBadge(inspectInvoice.status)}</p>
                {inspectInvoice.submitted_at && (
                  <p><span className="text-slate-400">Submitted At:</span> <span className="text-slate-300">{new Date(inspectInvoice.submitted_at).toLocaleString('en-IN')}</span></p>
                )}
              </div>

            </div>

            {/* Remarks / Rejection Notice */}
            {inspectInvoice.remarks && (
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Internal Remarks / Notes</span>
                <p className="text-slate-200 leading-relaxed">{inspectInvoice.remarks}</p>
              </div>
            )}

            {inspectInvoice.rejection_reason && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs space-y-1.5 text-rose-300">
                <span className="font-bold uppercase text-[10px] tracking-wider block flex items-center gap-1 text-rose-400">
                  <ShieldAlert className="w-4 h-4" /> Reason for Rejection
                </span>
                <p className="leading-relaxed">{inspectInvoice.rejection_reason}</p>
              </div>
            )}

            {/* Document Viewer Box */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Invoice Document File</span>
                </div>
                <a
                  href={getAttachmentDownloadUrl(inspectInvoice.invoice_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 font-bold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF / Document
                </a>
              </div>
              <p className="text-[11px] text-slate-400">
                Document is stored securely. Click &quot;Download PDF / Document&quot; to inspect or open in a new tab.
              </p>
            </div>

            {/* Action Bar Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setInspectInvoice(null)} className="text-xs text-slate-400">
                Close
              </Button>

              <div className="flex items-center gap-2">
                {String(inspectInvoice.status).toLowerCase() === 'submitted' || String(inspectInvoice.status).toLowerCase() === 'under review' ? (
                  <>
                    <Button
                      onClick={() => { setSelectedInvoice(inspectInvoice); setStatusAction('Rejected'); }}
                      variant="outline"
                      className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Invoice
                    </Button>
                    <Button
                      onClick={() => { setSelectedInvoice(inspectInvoice); setStatusAction('Approved'); }}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Invoice
                    </Button>
                  </>
                ) : null}

                {String(inspectInvoice.status).toLowerCase() === 'approved' ? (
                  <Button
                    onClick={() => handleCreatePaymentRequest(inspectInvoice)}
                    className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1 stroke-[2.5]" /> Create Payment Request
                  </Button>
                ) : null}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 6. Status Review Confirmation Modal ── */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
              {statusAction === 'Approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
              Confirm {statusAction} Invoice #{selectedInvoice.invoice_number}
            </h3>

            <div className="text-xs text-slate-300 space-y-1 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <p><strong className="text-slate-400">Vendor:</strong> {selectedInvoice.vendor_name}</p>
              <p><strong className="text-slate-400">PO Number:</strong> {selectedInvoice.po_no}</p>
              <p><strong className="text-slate-400">Invoice Total:</strong> <span className="text-amber-400 font-bold">{formatCurrency(selectedInvoice.invoice_total)}</span></p>
            </div>

            {statusAction === 'Rejected' ? (
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-bold">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this invoice is rejected..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <Button variant="ghost" onClick={() => { setSelectedInvoice(null); setStatusAction(null); }} className="text-xs text-slate-400">
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdateSubmit}
                disabled={actionLoading}
                className={`text-xs font-bold ${statusAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirm {statusAction}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Enhanced Internal Invoice Upload Modal ── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-amber-400" /> Upload Internal Manual Invoice
              </h3>
              <button 
                onClick={() => setUploadModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualUploadSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Select Approved Purchase Order *</label>
                <select
                  required
                  value={uploadForm.poNo}
                  onChange={(e) => setUploadForm({ ...uploadForm, poNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="">-- Choose Approved PO --</option>
                  {Array.isArray(posList) && posList.map(p => (
                    <option key={p.po_no || p.poNo} value={p.po_no || p.poNo}>
                      {p.po_no || p.poNo} — {p.vendor_name || p.vendor} ({formatCurrency(p.po_value || p.poValue)})
                    </option>
                  ))}
                </select>

                {selectedPOData && (
                  <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
                    <p><span className="text-slate-400">Vendor:</span> <strong>{selectedPOData.vendor_name || selectedPOData.vendor}</strong></p>
                    <p><span className="text-slate-400">PO Value:</span> <strong className="font-mono">{formatCurrency(selectedPOData.po_value || selectedPOData.poValue)}</strong></p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-bold">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.invoiceNumber}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-2026-0092"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-bold">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={uploadForm.invoiceDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-bold">Subtotal (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadForm.subtotal}
                    onChange={(e) => handleAmountChange('subtotal', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-bold">Tax Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadForm.taxAmount}
                    onChange={(e) => handleAmountChange('taxAmount', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-bold">Total Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={uploadForm.invoiceTotal}
                    onChange={(e) => handleAmountChange('invoiceTotal', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 focus:outline-none focus:border-amber-500 font-black font-mono"
                  />
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Invoice Document File *</label>
                <div 
                  onDragEnter={handleDrag} 
                  onDragLeave={handleDrag} 
                  onDragOver={handleDrag} 
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                    dragActive ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-200">Drag & drop invoice PDF or image here</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">or choose a file from your computer</p>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    required={!selectedFile}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30 cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="mt-2 text-xs text-emerald-400 font-mono font-bold">
                      ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold">Internal Remarks</label>
                <textarea
                  rows={2}
                  value={uploadForm.remarks}
                  onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
                  placeholder="Optional internal notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setUploadModalOpen(false)} disabled={uploading} className="text-xs text-slate-400">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 px-5"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {uploading ? 'Uploading Document...' : 'Submit Internal Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. Delete Invoice Modal ── */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Delete Invoice Record</h3>
                <p className="text-xs text-slate-400">Confirm permanent deletion of invoice line item</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300 space-y-1">
              <p>Invoice #: <strong className="font-mono text-white">{invoiceToDelete.invoice_number}</strong></p>
              <p>PO #: <strong className="font-mono text-white">{invoiceToDelete.po_no}</strong></p>
              <p>Vendor: <strong className="text-white">{invoiceToDelete.vendor_name}</strong></p>
              <p>Total: <strong className="text-amber-400 font-mono">{formatCurrency(invoiceToDelete.invoice_total)}</strong></p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setInvoiceToDelete(null)} disabled={deleting} className="text-xs text-slate-400">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteInvoiceConfirm}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
