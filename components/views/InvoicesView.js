'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import { Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '../ui/core';
import { 
  Receipt, Search, Filter, Download, CheckCircle2, XCircle, Clock, FilePlus, 
  Loader2, CreditCard, Eye, Trash2, AlertTriangle, LayoutGrid, LayoutList, 
  FileText, Sparkles, ChevronRight, Building, IndianRupee, ArrowUpRight, 
  RefreshCw, Check, X, ShieldAlert, FileCheck
} from 'lucide-react';
import { toast } from '../ui/Toast';

export default function InvoicesView() {
  const { call, setActiveView } = useAppState();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View mode & selection
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [inspectInvoice, setInspectInvoice] = useState(null); // Detail drawer modal

  // Deletion state
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Status Review Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusAction, setStatusAction] = useState(null); // 'Approved' | 'Rejected' | 'Under Review'
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Manual Upload Modal State
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

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await call('listInvoices', {});
      setInvoices(data || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError(err.message || 'Failed to load invoices dataset');
    } fontally {
      setLoading(false);
    }
  };

  const fetchPOs = async () => {
    try {
      const res = await call('getPOsOnly');
      // Fix: getPOsOnly returns { pos: [...] }, extract array safely
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
      
      // Update inspect modal state if currently inspecting
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
      toast.error("Error reading document file: " + err.message);
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

  // Filtered List
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const s = search.toLowerCase();
      const matchesSearch = !s || 
        String(inv.invoice_number || '').toLowerCase().includes(s) ||
        String(inv.vendor_name || '').toLowerCase().includes(s) ||
        String(inv.po_no || '').toLowerCase().includes(s) ||
        String(inv.invoice_id || '').toLowerCase().includes(s);

      const matchesStatus = statusFilter === 'ALL' || String(inv.status || '').toLowerCase() === statusFilter.toLowerCase();
      const matchesSource = sourceFilter === 'ALL' || String(inv.source || '').toLowerCase() === sourceFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [invoices, search, statusFilter, sourceFilter]);

  const kpis = useMemo(() => ({
    total: invoices.length,
    underReview: invoices.filter(i => String(i.status || '').toLowerCase() === 'submitted' || String(i.status || '').toLowerCase() === 'under review').length,
    approved: invoices.filter(i => String(i.status || '').toLowerCase() === 'approved').length,
    paid: invoices.filter(i => String(i.status || '').toLowerCase() === 'paid').length,
    totalValue: invoices.reduce((acc, i) => acc + (Number(i.invoice_total) || 0), 0)
  }), [invoices]);

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const getAttachmentDownloadUrl = (invoiceId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lx_auth_token') : '';
    return `/api/attachments/${invoiceId}?token=${encodeURIComponent(token || '')}`;
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold">Approved</Badge>;
    if (s === 'paid') return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold">Paid</Badge>;
    if (s === 'rejected') return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold">Rejected</Badge>;
    if (s === 'under review') return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold">Under Review</Badge>;
    return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 font-medium">Submitted</Badge>;
  };

  // Selected PO details for the upload modal
  const selectedPOData = useMemo(() => {
    if (!uploadForm.poNo || !Array.isArray(posList)) return null;
    return posList.find(p => String(p.po_no || p.poNo) === String(uploadForm.poNo));
  }, [uploadForm.poNo, posList]);

  // Auto-calculate subtotal + tax = total in upload modal
  const handleAmountChange = (field, val) => {
    const nextForm = { ...uploadForm, [field]: val };
    const sub = Number(nextForm.subtotal || 0);
    const tax = Number(nextForm.taxAmount || 0);
    if (field === 'subtotal' || field === 'taxAmount') {
      nextForm.invoiceTotal = (sub + tax).toFixed(2);
    }
    setUploadForm(nextForm);
  };

  return (
    <div className="space-y-6 select-none animate-fade-in pb-10">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                Invoice Management Ledger
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit vendor portal invoices & upload internal billings against approved purchase orders
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            className="text-xs font-semibold h-9 border-border bg-card hover:bg-muted text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-amber-500' : 'text-muted-foreground'}`} />
            Sync
          </Button>

          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-4 flex items-center gap-2 shadow-sm transition-all"
          >
            <FilePlus className="w-4 h-4" /> Upload Internal Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-card border-amber-500/50 shadow-xs' : 'bg-card/60 border-border hover:border-border/80'}`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Invoices</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-foreground tracking-tight">{kpis.total}</span>
            <Receipt className="w-4 h-4 text-muted-foreground/40" />
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('submitted')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'submitted' ? 'bg-card border-amber-500 shadow-xs' : 'bg-card/60 border-border hover:border-border/80'}`}
        >
          <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">Under Review</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-500 tracking-tight">{kpis.underReview}</span>
            <Clock className="w-4 h-4 text-amber-500/50" />
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'approved' ? 'bg-card border-emerald-500 shadow-xs' : 'bg-card/60 border-border hover:border-border/80'}`}
        >
          <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Approved</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-500 tracking-tight">{kpis.approved}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('paid')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'paid' ? 'bg-card border-blue-500 shadow-xs' : 'bg-card/60 border-border hover:border-border/80'}`}
        >
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Paid Invoices</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-blue-400 tracking-tight">{kpis.paid}</span>
            <FileCheck className="w-4 h-4 text-blue-400/50" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card/60 border border-border">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Value</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-black text-amber-500 tracking-tight truncate">{formatCurrency(kpis.totalValue)}</span>
            <IndianRupee className="w-4 h-4 text-amber-500/50" />
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 border border-border rounded-xl shadow-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, vendor, PO number..."
            className="w-full bg-muted/40 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs">
              ×
            </button>
          )}
        </div>

        {/* Filters & View Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Sources</option>
              <option value="vendor_portal">Vendor Portal</option>
              <option value="internal_upload">Internal Upload</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-muted/60 border border-border rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table' ? 'bg-card text-amber-500 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'grid' ? 'bg-card text-amber-500 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <span className="font-medium">Loading invoices ledger dataset...</span>
        </div>
      ) : error ? (
        <div className="p-6 border border-rose-500/30 bg-rose-500/5 rounded-xl text-center text-xs text-rose-400 font-medium">
          {error}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-16 px-6 border border-border border-dashed rounded-xl text-center text-xs text-muted-foreground flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-3 shadow-2xs">
            <Receipt className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-foreground tracking-tight">No Invoices Found</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            No invoices match the selected status or search query. Upload an internal invoice or adjust filter criteria.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Dense Table View */
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40">
                <TableHead className="text-xs font-bold text-muted-foreground">Invoice No</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Vendor Name</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">PO Number</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Date</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Invoice Total</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Source</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.invoice_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                  <TableCell className="font-bold text-xs text-foreground font-mono">
                    <button 
                      onClick={() => setInspectInvoice(inv)}
                      className="hover:text-amber-500 hover:underline transition-colors text-left"
                    >
                      {inv.invoice_number}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    <span className="font-semibold">{inv.vendor_name}</span>
                    {inv.vendor_code && (
                      <span className="block text-[10px] text-muted-foreground font-mono">{inv.vendor_code}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{inv.po_no}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{inv.invoice_date}</TableCell>
                  <TableCell className="text-xs text-foreground font-bold text-right whitespace-nowrap font-mono">
                    {formatCurrency(inv.invoice_total)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    <span className="capitalize px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-medium text-muted-foreground">
                      {inv.source ? inv.source.replace('_', ' ') : 'vendor portal'}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setInspectInvoice(inv)}
                      className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-medium p-1 hover:bg-muted rounded transition-colors"
                      title="Inspect Invoice Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={getAttachmentDownloadUrl(inv.invoice_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-amber-500 hover:text-amber-400 font-medium p-1 hover:bg-amber-500/10 rounded transition-colors"
                      title="Download PDF Document"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {String(inv.status).toLowerCase() === 'submitted' || String(inv.status).toLowerCase() === 'under review' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setSelectedInvoice(inv); setStatusAction('Approved'); }}
                          className="inline-flex items-center text-xs text-emerald-500 hover:bg-emerald-500/10 font-bold px-2 py-1 rounded border border-emerald-500/30 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedInvoice(inv); setStatusAction('Rejected'); }}
                          className="inline-flex items-center text-xs text-rose-500 hover:bg-rose-500/10 font-bold px-2 py-1 rounded border border-rose-500/30 transition-colors"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </button>
                      </>
                    ) : null}

                    {String(inv.status).toLowerCase() === 'approved' ? (
                      <button
                        type="button"
                        onClick={() => handleCreatePaymentRequest(inv)}
                        className="inline-flex items-center text-xs text-amber-500 hover:bg-amber-500/10 font-bold px-2 py-1 rounded border border-amber-500/30 transition-colors"
                        title="Create Payment Request from Invoice"
                      >
                        <CreditCard className="w-3 h-3 mr-1" /> Pay Request
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setInvoiceToDelete(inv)}
                      className="inline-flex items-center text-xs text-rose-400 hover:text-rose-300 font-medium p-1 hover:bg-rose-500/10 rounded transition-colors"
                      title="Delete Invoice Record"
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
        /* Card / Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((inv) => (
            <div key={inv.invoice_id} className="bg-card border border-border hover:border-amber-500/50 rounded-xl p-4 space-y-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block">Invoice Number</span>
                    <button 
                      onClick={() => setInspectInvoice(inv)}
                      className="text-sm font-bold text-foreground hover:text-amber-500 transition-colors text-left font-mono"
                    >
                      {inv.invoice_number}
                    </button>
                  </div>
                  {getStatusBadge(inv.status)}
                </div>

                <div className="p-2.5 bg-muted/30 border border-border/60 rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor:</span>
                    <span className="font-semibold text-foreground truncate max-w-[170px]">{inv.vendor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PO Number:</span>
                    <span className="font-mono text-foreground font-semibold">{inv.po_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span className="text-foreground">{inv.invoice_date}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Invoice Total</span>
                  <span className="text-lg font-black text-amber-500 font-mono">{formatCurrency(inv.invoice_total)}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border/60 gap-2">
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setInspectInvoice(inv)} 
                    className="h-7 text-xs border-border text-foreground hover:bg-muted font-medium"
                  >
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                  <a
                    href={getAttachmentDownloadUrl(inv.invoice_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 px-2.5 text-xs text-amber-500 hover:bg-amber-500/10 font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" /> PDF
                  </a>
                </div>

                <div className="flex items-center gap-1">
                  {String(inv.status).toLowerCase() === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => handleCreatePaymentRequest(inv)}
                      className="h-7 text-[11px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                    >
                      <CreditCard className="w-3 h-3 mr-1" /> Pay Request
                    </Button>
                  )}
                  <button
                    onClick={() => setInvoiceToDelete(inv)}
                    className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
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

      {/* Detailed Inspection Side Modal / Drawer */}
      {inspectInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Invoice #{inspectInvoice.invoice_number}
                  </h3>
                  <p className="text-xs text-muted-foreground">ID: {inspectInvoice.invoice_id}</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectInvoice(null)} 
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Key Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-2">
                <h4 className="font-bold text-amber-500 border-b border-border/60 pb-1 text-[11px] uppercase tracking-wider">
                  Vendor & PO Reference
                </h4>
                <p><span className="text-muted-foreground">Vendor:</span> <strong className="text-foreground">{inspectInvoice.vendor_name}</strong></p>
                <p><span className="text-muted-foreground">Vendor Code:</span> <strong className="text-foreground font-mono">{inspectInvoice.vendor_code || '—'}</strong></p>
                <p><span className="text-muted-foreground">PO Number:</span> <strong className="text-foreground font-mono">{inspectInvoice.po_no}</strong></p>
                <p><span className="text-muted-foreground">Project:</span> <strong className="text-foreground">{inspectInvoice.project || '—'}</strong></p>
              </div>

              <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-2">
                <h4 className="font-bold text-amber-500 border-b border-border/60 pb-1 text-[11px] uppercase tracking-wider">
                  Financial Breakdown
                </h4>
                <p><span className="text-muted-foreground">Subtotal:</span> <strong className="text-foreground font-mono">{formatCurrency(inspectInvoice.subtotal)}</strong></p>
                <p><span className="text-muted-foreground">Tax Amount:</span> <strong className="text-foreground font-mono">{formatCurrency(inspectInvoice.tax_amount)}</strong></p>
                <p><span className="text-muted-foreground">Invoice Total:</span> <strong className="text-amber-500 font-bold font-mono text-sm">{formatCurrency(inspectInvoice.invoice_total)}</strong></p>
                <p><span className="text-muted-foreground">Status:</span> {getStatusBadge(inspectInvoice.status)}</p>
              </div>
            </div>

            {/* Remarks / Rejection Reason */}
            {inspectInvoice.remarks && (
              <div className="p-3 bg-muted/20 border border-border rounded-xl text-xs space-y-1">
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">Remarks</span>
                <p className="text-foreground leading-relaxed">{inspectInvoice.remarks}</p>
              </div>
            )}

            {inspectInvoice.rejection_reason && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs space-y-1 text-rose-400">
                <span className="font-bold uppercase text-[10px] tracking-wider block flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Rejection Reason
                </span>
                <p className="text-rose-300 leading-relaxed">{inspectInvoice.rejection_reason}</p>
              </div>
            )}

            {/* PDF Attachment Actions */}
            <div className="p-4 bg-muted/30 border border-border rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-foreground">Attached Document PDF</span>
              </div>
              <a
                href={getAttachmentDownloadUrl(inspectInvoice.invoice_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs text-amber-500 hover:bg-amber-500/10 font-bold rounded-lg border border-amber-500/30 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> View / Download Document
              </a>
            </div>

            {/* Modal Workflow Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button variant="ghost" onClick={() => setInspectInvoice(null)} className="text-xs">
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
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
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
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1" /> Create Payment Request
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Review Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              {statusAction === 'Approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
              Confirm {statusAction} Invoice #{selectedInvoice.invoice_number}
            </h3>

            <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 p-3 rounded-lg border border-border">
              <p><strong className="text-foreground">Vendor:</strong> {selectedInvoice.vendor_name}</p>
              <p><strong className="text-foreground">PO Number:</strong> {selectedInvoice.po_no}</p>
              <p><strong className="text-foreground">Invoice Total:</strong> <span className="text-amber-500 font-bold">{formatCurrency(selectedInvoice.invoice_total)}</span></p>
            </div>

            {statusAction === 'Rejected' ? (
              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-semibold">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this invoice is rejected..."
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-rose-500"
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
                className={`text-xs font-bold ${statusAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirm {statusAction}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Manual Internal Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-amber-500" /> Upload Internal Manual Invoice
              </h3>
              <button 
                onClick={() => setUploadModalOpen(false)} 
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualUploadSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-semibold">Select Approved Purchase Order *</label>
                <select
                  required
                  value={uploadForm.poNo}
                  onChange={(e) => setUploadForm({ ...uploadForm, poNo: e.target.value })}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="">-- Select Purchase Order --</option>
                  {Array.isArray(posList) && posList.map(p => (
                    <option key={p.po_no || p.poNo} value={p.po_no || p.poNo}>
                      {p.po_no || p.poNo} — {p.vendor_name || p.vendor} ({formatCurrency(p.po_value || p.poValue)})
                    </option>
                  ))}
                </select>

                {selectedPOData && (
                  <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-500 flex justify-between font-medium">
                    <span>Vendor: <strong>{selectedPOData.vendor_name || selectedPOData.vendor}</strong></span>
                    <span>PO Value: <strong>{formatCurrency(selectedPOData.po_value || selectedPOData.poValue)}</strong></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-semibold">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.invoiceNumber}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-2026-0092"
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-semibold">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={uploadForm.invoiceDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceDate: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-semibold">Subtotal (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadForm.subtotal}
                    onChange={(e) => handleAmountChange('subtotal', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-semibold">Tax Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadForm.taxAmount}
                    onChange={(e) => handleAmountChange('taxAmount', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-semibold">Invoice Total (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={uploadForm.invoiceTotal}
                    onChange={(e) => handleAmountChange('invoiceTotal', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-amber-500 focus:outline-none focus:border-amber-500 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-semibold">Invoice File Attachment (PDF / Image) *</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-500 hover:file:bg-amber-500/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-semibold">Remarks</label>
                <textarea
                  rows={2}
                  value={uploadForm.remarks}
                  onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
                  placeholder="Optional internal notes..."
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setUploadModalOpen(false)} disabled={uploading} className="text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploading}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {uploading ? 'Uploading Document...' : 'Submit Internal Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Invoice Line Item</h3>
                <p className="text-xs text-muted-foreground">Confirm permanent deletion of invoice record</p>
              </div>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 space-y-1">
              <p>Invoice #: <strong className="font-mono text-foreground">{invoiceToDelete.invoice_number}</strong></p>
              <p>PO #: <strong className="font-mono text-foreground">{invoiceToDelete.po_no}</strong></p>
              <p>Vendor: <strong className="text-foreground">{invoiceToDelete.vendor_name}</strong></p>
              <p>Total: <strong className="text-amber-500 font-mono">{formatCurrency(invoiceToDelete.invoice_total)}</strong></p>
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
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
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
