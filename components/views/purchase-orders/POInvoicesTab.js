import React, { useState, useEffect } from 'react';
import { useAppState } from '../../StateProvider';
import { Card, CardContent, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Dialog, Input, Textarea } from '../../ui/core';
import { Receipt, Download, FilePlus, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Trash2, FileText, UploadCloud, Sparkles } from 'lucide-react';
import { toast } from '../../ui/Toast';

export default function POInvoicesTab({ poNo, poValue = 0, vendorName = '' }) {
  const { call } = useAppState();
  const [data, setData] = useState({ invoices: [], total_invoiced: 0, total_approved: 0, remaining_balance: poValue });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Upload Form State
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    subtotal: '',
    taxAmount: '',
    invoiceTotal: '',
    remarks: ''
  });
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
          
          setFormData(prev => ({
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

  const handleDeleteInvoiceConfirm = async () => {
    if (!invoiceToDelete) return;
    setDeleting(true);
    try {
      await call('deleteInvoice', invoiceToDelete.invoice_id);
      toast.success(`Invoice #${invoiceToDelete.invoice_number} deleted`);
      setInvoiceToDelete(null);
      await fetchPOInvoices();
    } catch (err) {
      toast.error("Delete failed: " + (err.message || err));
    } finally {
      setDeleting(false);
    }
  };

  const handleAmountChange = (field, val) => {
    const nextForm = { ...formData, [field]: val };
    const sub = Number(nextForm.subtotal || 0);
    const tax = Number(nextForm.taxAmount || 0);
    if (field === 'subtotal' || field === 'taxAmount') {
      nextForm.invoiceTotal = (sub + tax).toFixed(2);
    }
    setFormData(nextForm);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit. Please select a smaller file.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoiceNumber || !formData.invoiceTotal || !selectedFile) {
      toast.error("Invoice Number, Total Amount, and PDF Attachment are required.");
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
          toast.success(`Invoice #${formData.invoiceNumber} uploaded successfully!`);
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
          toast.error("Upload failed: " + (err.message || err));
        } finally {
          setSubmitting(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      toast.error("Error reading file: " + err.message);
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 text-[11px]">Approved</Badge>;
    if (s === 'paid') return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold px-2 py-0.5 text-[11px]">Paid</Badge>;
    if (s === 'rejected') return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold px-2 py-0.5 text-[11px]">Rejected</Badge>;
    if (s === 'under review') return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold px-2 py-0.5 text-[11px]">Under Review</Badge>;
    return <Badge className="bg-muted text-muted-foreground border border-border font-medium px-2 py-0.5 text-[11px]">Submitted</Badge>;
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const getAttachmentDownloadUrl = (invoiceId) => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('lx_auth_token') || '') : '';
    return `/api/attachments/${invoiceId}?token=${encodeURIComponent(token)}`;
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border border-border p-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">PO Value</span>
          <p className="text-lg font-bold text-foreground mt-1 tabular-nums">{formatCurrency(poValue)}</p>
        </Card>

        <Card className="bg-card border border-border p-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Total Invoiced</span>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{formatCurrency(data.total_invoiced)}</p>
        </Card>

        <Card className="bg-card border border-border p-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Approved Invoices</span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{formatCurrency(data.total_approved)}</p>
        </Card>

        <Card className="bg-card border border-border p-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Remaining Balance</span>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">{formatCurrency(data.remaining_balance)}</p>
        </Card>
      </div>

      {/* Header & Upload Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-600 dark:text-gold" /> Linked Invoices ({(data.invoices || []).length})
        </h3>
        <Button
          onClick={() => setUploadModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 flex items-center gap-1.5 cursor-pointer"
        >
          <FilePlus className="w-3.5 h-3.5" /> Upload Internal Invoice
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-xs text-muted-foreground italic flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600 dark:text-gold" />
          <span>Loading invoices...</span>
        </div>
      ) : error ? (
        <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-xl text-center text-xs text-red-600 dark:text-red-400">{error}</div>
      ) : (data.invoices || []).length === 0 ? (
        <div className="p-8 border border-border border-dashed rounded-xl text-center text-xs text-muted-foreground">
          No invoices uploaded for this PO yet.
        </div>
      ) : (
        <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-slate-50/80 dark:bg-slate-900/50">
                <TableHead className="text-xs font-semibold text-muted-foreground">Invoice No</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Date</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Amount</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Source</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.invoices || []).map((inv) => (
                <TableRow key={inv.invoice_id} className="border-b border-border/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <TableCell className="font-bold text-xs font-mono text-foreground">{inv.invoice_number}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{inv.invoice_date}</TableCell>
                  <TableCell className="text-xs text-foreground font-bold text-right whitespace-nowrap font-mono tabular-nums">{formatCurrency(inv.invoice_total)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="capitalize px-2 py-0.5 rounded text-[10px] bg-muted border border-border">
                      {inv.source ? inv.source.replace('_', ' ') : 'vendor portal'}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap space-x-2">
                    <a
                      href={getAttachmentDownloadUrl(inv.invoice_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-amber-600 dark:text-gold hover:underline font-semibold p-1 hover:bg-amber-500/10 rounded transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> PDF
                    </a>
                    <button
                      onClick={() => setInvoiceToDelete(inv)}
                      className="inline-flex items-center text-xs text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Upload Internal Invoice Modal */}
      {uploadModalOpen && (
        <Dialog open={true} onClose={() => setUploadModalOpen(false)} title={`Upload Internal Invoice — PO ${poNo}`} maxWidth="max-w-md">
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300">
              <p><span className="text-muted-foreground">Target Vendor:</span> <strong>{vendorName || 'Selected Vendor'}</strong></p>
              <p><span className="text-muted-foreground">PO Total Value:</span> <strong className="font-mono">{formatCurrency(poValue)}</strong></p>
              <p><span className="text-muted-foreground">Remaining Invoiceable:</span> <strong className="font-mono text-blue-600 dark:text-blue-400">{formatCurrency(data.remaining_balance)}</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Invoice Number *</label>
                <Input
                  type="text"
                  required
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-2026-0092"
                  className="bg-background border-border text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Invoice Date *</label>
                <Input
                  type="date"
                  required
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="bg-background border-border text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Subtotal (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.subtotal}
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
                  value={formData.taxAmount}
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
                  value={formData.invoiceTotal}
                  onChange={(e) => handleAmountChange('invoiceTotal', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-bold text-amber-600 dark:text-amber-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Invoice Attachment PDF *</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                required
                onChange={handleFileChange}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-600 dark:file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
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

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Remarks</label>
              <Textarea
                rows={2}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional internal notes..."
                className="bg-background border-border text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setUploadModalOpen(false)} disabled={submitting} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 px-4"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {submitting ? 'Uploading...' : 'Submit Invoice'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {invoiceToDelete && (
        <Dialog open={true} onClose={() => setInvoiceToDelete(null)} title="Delete Invoice Line Item" maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-foreground space-y-1">
              <p><strong className="text-muted-foreground">Invoice #:</strong> <span className="font-mono font-bold text-foreground">{invoiceToDelete.invoice_number}</span></p>
              <p><strong className="text-muted-foreground">Amount:</strong> <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{formatCurrency(invoiceToDelete.invoice_total)}</span></p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this invoice? This will restore the PO remaining balance.
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
