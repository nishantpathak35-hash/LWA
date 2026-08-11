import React, { useState, useEffect } from 'react';
import { useAppState } from '../../StateProvider';
import { Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '../../ui/core';
import { Receipt, Download, FilePlus, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';

export default function POInvoicesTab({ poNo, poValue = 0, vendorName = '' }) {
  const { call } = useAppState();
  const [data, setData] = useState({ invoices: [], total_invoiced: 0, total_approved: 0, remaining_balance: poValue });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm("Are you sure you want to delete this invoice line item? This will update the PO remaining balance.")) return;
    try {
      await call('deleteInvoice', invoiceId);
      await fetchPOInvoices();
    } catch (err) {
      alert("Delete failed: " + (err.message || err));
    }
  };

  // Upload Form State
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    subtotal: '',
    taxAmount: '',
    invoiceTotal: '',
    remarks: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchPOInvoices = async () => {
    if (!poNo) return;
    try {
      setLoading(true);
      setError(null);
      const res = await call('getPOInvoices', poNo);
      if (res) setData(res);
    } catch (err) {
      console.error('Failed to fetch PO invoices:', err);
      setError(err.message || 'Could not load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOInvoices();
  }, [poNo]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File exceeds 10MB limit. Please select a smaller file.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoiceNumber || !formData.invoiceTotal || !selectedFile) {
      alert("Invoice Number, Total Amount, and PDF Attachment are required.");
      return;
    }

    setSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = event.target.result.split(',')[1];
          await call('uploadInternalInvoice', {
            poNo,
            invoiceNumber: formData.invoiceNumber,
            invoiceDate: formData.invoiceDate,
            subtotal: Number(formData.subtotal || 0),
            taxAmount: Number(formData.taxAmount || 0),
            invoiceTotal: Number(formData.invoiceTotal),
            remarks: formData.remarks,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            fileData: base64Data
          });
          setUploadModalOpen(false);
          setFormData({
            invoiceNumber: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            subtotal: '',
            taxAmount: '',
            invoiceTotal: '',
            remarks: ''
          });
          setSelectedFile(null);
          await fetchPOInvoices();
        } catch (err) {
          alert("Upload failed: " + (err.message || err));
        } finally {
          setSubmitting(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      alert("Error reading file: " + err.message);
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Approved</Badge>;
    if (s === 'paid') return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Paid</Badge>;
    if (s === 'rejected') return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>;
    if (s === 'under review') return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Under Review</Badge>;
    return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">Submitted</Badge>;
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const getAttachmentDownloadUrl = (invoiceId) => {
    const token = localStorage.getItem('lx_auth_token');
    return `/api/attachments/${invoiceId}?token=${encodeURIComponent(token)}`;
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">PO Value</span>
          <p className="text-lg font-bold text-slate-200 mt-1">{formatCurrency(poValue)}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Invoiced</span>
          <p className="text-lg font-bold text-amber-400 mt-1">{formatCurrency(data.total_invoiced)}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Approved Invoices</span>
          <p className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(data.total_approved)}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Remaining Invoiceable</span>
          <p className="text-lg font-bold text-blue-400 mt-1">{formatCurrency(data.remaining_balance)}</p>
        </div>
      </div>

      {/* Header & Upload Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-gold" /> Linked Invoices ({data.invoices.length})
        </h3>
        <Button
          onClick={() => setUploadModalOpen(true)}
          className="bg-gold text-slate-950 hover:bg-amber-400 font-semibold text-xs h-8 flex items-center gap-1.5"
        >
          <FilePlus className="w-3.5 h-3.5" /> Upload Internal Invoice
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-xs text-slate-400 italic">Loading invoices...</div>
      ) : error ? (
        <div className="p-4 border border-red-900/40 rounded-xl text-center text-xs text-red-400">{error}</div>
      ) : data.invoices.length === 0 ? (
        <div className="p-8 border border-slate-800 border-dashed rounded-xl text-center text-xs text-slate-500">
          No invoices uploaded for this PO yet.
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs text-slate-400">Invoice No</TableHead>
                <TableHead className="text-xs text-slate-400">Date</TableHead>
                <TableHead className="text-xs text-slate-400 text-right">Amount</TableHead>
                <TableHead className="text-xs text-slate-400">Source</TableHead>
                <TableHead className="text-xs text-slate-400">Status</TableHead>
                <TableHead className="text-xs text-slate-400 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.map((inv) => (
                <TableRow key={inv.invoice_id} className="border-b border-slate-800/60 hover:bg-slate-900/80">
                  <TableCell className="font-semibold text-xs text-slate-200">{inv.invoice_number}</TableCell>
                  <TableCell className="text-xs text-slate-400">{inv.invoice_date}</TableCell>
                  <TableCell className="text-xs text-slate-200 font-medium text-right">{formatCurrency(inv.invoice_total)}</TableCell>
                  <TableCell className="text-xs text-slate-400">
                    <span className="capitalize">{inv.source ? inv.source.replace('_', ' ') : 'vendor portal'}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <a
                      href={getAttachmentDownloadUrl(inv.invoice_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mr-2"
                      title="View PDF"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteInvoice(inv.invoice_id)}
                      className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors p-1 hover:bg-rose-500/10 rounded"
                      title="Delete Invoice Line Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Manual Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <FilePlus className="w-4 h-4 text-gold" /> Upload Manual Invoice for PO: {poNo}
            </h3>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV/2026/001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
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
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Tax Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxAmount}
                    onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Total Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.invoiceTotal}
                    onChange={(e) => setFormData({ ...formData, invoiceTotal: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold font-semibold text-gold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice Document PDF *</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  required
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Remarks</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional notes or remarks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gold text-slate-950 hover:bg-amber-400 font-semibold text-xs flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {submitting ? 'Uploading to Cloudinary...' : 'Upload & Save Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
