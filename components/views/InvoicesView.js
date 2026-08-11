import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '../ui/core';
import { Receipt, Search, Filter, Download, CheckCircle2, XCircle, Clock, FilePlus, Loader2, CreditCard, Eye, Trash2, AlertTriangle } from 'lucide-react';

export default function InvoicesView() {
  const { call, setActiveView } = useAppState();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteInvoiceConfirm = async () => {
    if (!invoiceToDelete) return;
    setDeleting(true);
    try {
      await call('deleteInvoice', invoiceToDelete.invoice_id || invoiceToDelete.id);
      setInvoiceToDelete(null);
      await fetchInvoices();
    } catch (err) {
      setError(err.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Status Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusAction, setStatusAction] = useState(null); // 'Approved' or 'Rejected'
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
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchPOs = async () => {
    try {
      const pos = await call('getPOsOnly');
      setPosList(pos || []);
    } catch (err) {
      console.error('Failed to fetch PO list:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchPOs();
  }, []);

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !statusAction) return;

    if (statusAction === 'Rejected' && !rejectionReason.trim()) {
      alert("Please provide a reason for rejecting the invoice.");
      return;
    }

    setActionLoading(true);
    try {
      await call('updateInvoiceStatus', selectedInvoice.invoice_id, statusAction, rejectionReason);
      setSelectedInvoice(null);
      setStatusAction(null);
      setRejectionReason('');
      await fetchInvoices();
    } catch (err) {
      alert("Failed to update status: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.poNo || !uploadForm.invoiceNumber || !uploadForm.invoiceTotal || !selectedFile) {
      alert("PO Number, Invoice Number, Total Amount, and Document File are required.");
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
          alert("Upload failed: " + (err.message || err));
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      alert("Error reading file: " + err.message);
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
  const filteredInvoices = invoices.filter(inv => {
    const s = search.toLowerCase();
    const matchesSearch = !s || 
      String(inv.invoice_number).toLowerCase().includes(s) ||
      String(inv.vendor_name).toLowerCase().includes(s) ||
      String(inv.po_no).toLowerCase().includes(s) ||
      String(inv.invoice_id).toLowerCase().includes(s);

    const matchesStatus = statusFilter === 'ALL' || String(inv.status).toLowerCase() === statusFilter.toLowerCase();
    const matchesSource = sourceFilter === 'ALL' || String(inv.source).toLowerCase() === sourceFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSource;
  });

  const kpis = {
    total: invoices.length,
    underReview: invoices.filter(i => String(i.status).toLowerCase() === 'submitted' || String(i.status).toLowerCase() === 'under review').length,
    approved: invoices.filter(i => String(i.status).toLowerCase() === 'approved').length,
    totalValue: invoices.reduce((acc, i) => acc + (Number(i.invoice_total) || 0), 0)
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const getAttachmentDownloadUrl = (invoiceId) => {
    const token = localStorage.getItem('lx_auth_token');
    return `/api/attachments/${invoiceId}?token=${encodeURIComponent(token)}`;
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Approved</Badge>;
    if (s === 'paid') return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Paid</Badge>;
    if (s === 'rejected') return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>;
    if (s === 'under review') return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Under Review</Badge>;
    return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">Submitted</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gold" /> Invoice Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">Review vendor-submitted and internal invoices against purchase orders</p>
        </div>
        <Button
          onClick={() => setUploadModalOpen(true)}
          className="bg-gold text-slate-950 hover:bg-amber-400 font-semibold text-xs h-9 flex items-center gap-2 shadow-lg shadow-gold/10"
        >
          <FilePlus className="w-4 h-4" /> Upload Internal Invoice
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Invoices</span>
          <p className="text-2xl font-black text-slate-100 mt-1">{kpis.total}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Pending Review</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{kpis.underReview}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Approved Invoices</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{kpis.approved}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Invoiced Value</span>
          <p className="text-2xl font-black text-gold mt-1">{formatCurrency(kpis.totalValue)}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 border border-slate-800 rounded-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, vendor, PO..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-gold"
            >
              <option value="ALL">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-gold"
          >
            <option value="ALL">All Sources</option>
            <option value="vendor_portal">Vendor Portal</option>
            <option value="internal_upload">Internal Upload</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 italic">Loading invoices dataset...</div>
      ) : error ? (
        <div className="p-6 border border-red-900/40 rounded-xl text-center text-xs text-red-400">{error}</div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-12 border border-slate-800 border-dashed rounded-xl text-center text-xs text-slate-500">
          No invoices found matching the search criteria.
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50 shadow-xl">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs text-slate-400">Invoice No</TableHead>
                <TableHead className="text-xs text-slate-400">Vendor</TableHead>
                <TableHead className="text-xs text-slate-400">PO No</TableHead>
                <TableHead className="text-xs text-slate-400">Date</TableHead>
                <TableHead className="text-xs text-slate-400 text-right">Amount</TableHead>
                <TableHead className="text-xs text-slate-400">Source</TableHead>
                <TableHead className="text-xs text-slate-400">Status</TableHead>
                <TableHead className="text-xs text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.invoice_id} className="border-b border-slate-800/60 hover:bg-slate-900/80">
                  <TableCell className="font-semibold text-xs text-slate-100">{inv.invoice_number}</TableCell>
                  <TableCell className="text-xs text-slate-300">
                    <span className="font-medium">{inv.vendor_name}</span>
                    <span className="block text-[10px] text-slate-500">{inv.vendor_code}</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300 font-mono">{inv.po_no}</TableCell>
                  <TableCell className="text-xs text-slate-400 whitespace-nowrap">{inv.invoice_date}</TableCell>
                  <TableCell className="text-xs text-slate-100 font-bold text-right whitespace-nowrap">
                    {formatCurrency(inv.invoice_total)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                    <span className="capitalize px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                      {inv.source ? inv.source.replace('_', ' ') : 'vendor portal'}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap space-x-2">
                    <a
                      href={getAttachmentDownloadUrl(inv.invoice_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors p-1"
                      title="Download PDF Document"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {String(inv.status).toLowerCase() === 'submitted' || String(inv.status).toLowerCase() === 'under review' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setSelectedInvoice(inv); setStatusAction('Approved'); }}
                          className="inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedInvoice(inv); setStatusAction('Rejected'); }}
                          className="inline-flex items-center text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded bg-red-500/10 border border-red-500/20"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </button>
                      </>
                    ) : null}

                    {String(inv.status).toLowerCase() === 'approved' ? (
                      <button
                        type="button"
                        onClick={() => handleCreatePaymentRequest(inv)}
                        className="inline-flex items-center text-xs text-gold hover:text-amber-300 font-semibold px-2 py-1 rounded bg-gold/10 border border-gold/20"
                        title="Create Payment Request from Invoice"
                      >
                        <CreditCard className="w-3 h-3 mr-1" /> Pay Request
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setInvoiceToDelete(inv)}
                      className="inline-flex items-center text-xs text-rose-400 hover:text-rose-300 font-medium p-1 hover:bg-rose-500/10 rounded transition-colors"
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
      )}

      {/* Status Review Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              {statusAction === 'Approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
              Confirm {statusAction} Invoice #{selectedInvoice.invoice_number}
            </h3>

            <div className="text-xs text-slate-300 space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <p><strong>Vendor:</strong> {selectedInvoice.vendor_name}</p>
              <p><strong>PO Number:</strong> {selectedInvoice.po_no}</p>
              <p><strong>Invoice Total:</strong> {formatCurrency(selectedInvoice.invoice_total)}</p>
            </div>

            {statusAction === 'Rejected' ? (
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this invoice is rejected..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => { setSelectedInvoice(null); setStatusAction(null); }} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdateSubmit}
                disabled={actionLoading}
                className={`text-xs font-semibold ${statusAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirm {statusAction}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <FilePlus className="w-4 h-4 text-gold" /> Upload Internal Manual Invoice
            </h3>

            <form onSubmit={handleManualUploadSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Select Approved Purchase Order *</label>
                <select
                  required
                  value={uploadForm.poNo}
                  onChange={(e) => setUploadForm({ ...uploadForm, poNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                >
                  <option value="">-- Choose PO --</option>
                  {posList.map(p => (
                    <option key={p.po_no} value={p.po_no}>
                      {p.po_no} - {p.vendor_name} ({formatCurrency(p.po_value)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.invoiceNumber}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-0092"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={uploadForm.invoiceDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Subtotal (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadForm.subtotal}
                    onChange={(e) => setUploadForm({ ...uploadForm, subtotal: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Tax Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadForm.taxAmount}
                    onChange={(e) => setUploadForm({ ...uploadForm, taxAmount: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice Total (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={uploadForm.invoiceTotal}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceTotal: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold font-bold text-gold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice File Attachment *</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Remarks</label>
                <textarea
                  rows={2}
                  value={uploadForm.remarks}
                  onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
                  placeholder="Optional internal remarks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setUploadModalOpen(false)} disabled={uploading} className="text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploading}
                  className="bg-gold text-slate-950 hover:bg-amber-400 font-semibold text-xs flex items-center gap-1.5"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {uploading ? 'Uploading to Cloudinary...' : 'Submit Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Delete Invoice Record</h3>
                <p className="text-xs text-slate-400">Confirm deletion of invoice line item</p>
              </div>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs text-rose-300 space-y-1">
              <p>Invoice #: <strong className="font-mono text-white">{invoiceToDelete.invoice_number}</strong></p>
              <p>PO #: <strong className="font-mono text-white">{invoiceToDelete.po_no}</strong></p>
              <p>Vendor: <strong className="text-white">{invoiceToDelete.vendor_name}</strong></p>
              <p>Total: <strong className="text-emerald-400">{formatCurrency(invoiceToDelete.invoice_total)}</strong></p>
            </div>

            <p className="text-xs text-slate-400">
              Are you sure you want to delete this invoice? This action cannot be undone and will update the remaining balance on PO <strong className="font-mono text-slate-200">{invoiceToDelete.po_no}</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
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
