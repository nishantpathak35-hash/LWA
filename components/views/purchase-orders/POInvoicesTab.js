import React, { useState, useEffect } from 'react';
import { useAppState } from '../../StateProvider';
import { Card, CardContent, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Dialog, Input, Textarea } from '../../ui/core';
import { Receipt, Download, FilePlus, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Trash2, Edit2, FileText, UploadCloud, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from '../../ui/Toast';
import { prepareInvoiceForOcr } from '../../../app/lib/invoiceOcrClient';

export default function POInvoicesTab({ poNo, poValue = 0, vendorName = '' }) {
  const { call } = useAppState();
  const [data, setData] = useState({ invoices: [], total_invoiced: 0, total_approved: 0, remaining_balance: poValue });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
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
  const [selectedFile, setSelectedFile] = useState(null);
  // Credit Notes State
  const [creditNotes, setCreditNotes] = useState([]);
  const [cnModalOpen, setCnModalOpen] = useState(false);
  const [cnSubmitting, setCnSubmitting] = useState(false);
  const [cnFile, setCnFile] = useState(null);
  const [cnToDelete, setCnToDelete] = useState(null);
  const [cnDeleting, setCnDeleting] = useState(false);
  const [cnForm, setCnForm] = useState({
    invoiceId: '',
    cnNumber: '',
    cnDate: new Date().toISOString().split('T')[0],
    subtotal: '',
    taxAmount: '',
    totalAmount: '',
    reason: 'Rate Difference',
    remarks: ''
  });

  // Edit Invoice State
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSelectedFile, setEditSelectedFile] = useState(null);
  const [editFilePreviewUrl, setEditFilePreviewUrl] = useState(null);
  const [editForm, setEditForm] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    subtotal: '',
    taxAmount: '',
    invoiceTotal: '',
    remarks: ''
  });
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiAutoFill = async () => {
    if (!selectedFile) return;
    setAiLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      // Preprocess file for OCR (renders PDF page 1 to crisp ~200KB image or downscales large photo)
      const { fileData, fileType } = await prepareInvoiceForOcr(selectedFile);

      const token = localStorage.getItem('lx_auth_token');
      const res = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lwa-token': token || ''
        },
        body: JSON.stringify({
          fileData,
          fileType
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const rawText = await res.text();
      let result;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error('Server returned invalid response. Please enter invoice details manually.');
      }

      if (!res.ok || result.error) {
        throw new Error(result.error || 'AI parsing failed');
      }
      const data = result.data || {};
      
      setFormData(prev => ({
        ...prev,
        invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
        invoiceDate: data.invoiceDate || prev.invoiceDate,
        subtotal: data.subtotal ? String(data.subtotal) : prev.subtotal,
        taxAmount: data.taxAmount ? String(data.taxAmount) : prev.taxAmount,
        invoiceTotal: data.invoiceTotal ? String(data.invoiceTotal) : prev.invoiceTotal
      }));
      const hasAnyData = Boolean(data.invoiceNumber || (data.invoiceTotal && Number(data.invoiceTotal) > 0));
      if (result.isEmpty || !hasAnyData) {
        toast.warning(result.warning || 'Could not auto-read fields from this document. Please enter details manually.');
      } else {
        toast.success("OCR auto-filled invoice details successfully!");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        toast.error('OCR scan timed out. Please enter invoice details manually.');
      } else {
        toast.error("AI parsing failed: " + (err.message || 'Unknown error'));
      }
    } finally {
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

  const totalCreditNotes = (creditNotes || []).reduce((sum, cn) => sum + (Number(cn.total_amount) || 0), 0);
  const effectiveRemainingBalance = Math.max(0, poValue - ((data.total_approved || 0) - totalCreditNotes));

  const handleOpenEditModal = (inv) => {
    setInvoiceToEdit(inv);
    setEditForm({
      invoiceNumber: inv.invoice_number || '',
      invoiceDate: inv.invoice_date ? String(inv.invoice_date).split('T')[0] : new Date().toISOString().split('T')[0],
      subtotal: inv.subtotal != null ? String(inv.subtotal) : '',
      taxAmount: inv.tax_amount != null ? String(inv.tax_amount) : '',
      invoiceTotal: inv.invoice_total != null ? String(inv.invoice_total) : '',
      remarks: inv.remarks || ''
    });
    setEditSelectedFile(null);
    if (editFilePreviewUrl) URL.revokeObjectURL(editFilePreviewUrl);
    setEditFilePreviewUrl(null);
    setEditModalOpen(true);
  };

  const handleEditAmountChange = (field, val) => {
    const updated = { ...editForm, [field]: val };
    const s = parseFloat(field === 'subtotal' ? val : updated.subtotal) || 0;
    const t = parseFloat(field === 'taxAmount' ? val : updated.taxAmount) || 0;
    if (field !== 'invoiceTotal' && s > 0) {
      updated.invoiceTotal = (s + t).toFixed(2);
    }
    setEditForm(updated);
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editFilePreviewUrl) URL.revokeObjectURL(editFilePreviewUrl);
    setEditSelectedFile(file);
    const url = URL.createObjectURL(file);
    setEditFilePreviewUrl(url);
  };

  const handleEditInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceToEdit) return;
    if (!editForm.invoiceNumber || !editForm.invoiceTotal) {
      toast.error("Invoice Number and Total Amount are required.");
      return;
    }

    setEditSubmitting(true);
    try {
      let fileData = null;
      let fileName = null;
      let fileType = null;
      let fileSize = null;

      if (editSelectedFile) {
        fileName = editSelectedFile.name;
        fileType = editSelectedFile.type;
        fileSize = editSelectedFile.size;
        fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(editSelectedFile);
        });
      }

      const payload = {
        invoiceNumber: editForm.invoiceNumber.trim(),
        invoiceDate: editForm.invoiceDate,
        subtotal: editForm.subtotal ? Number(editForm.subtotal) : 0,
        taxAmount: editForm.taxAmount ? Number(editForm.taxAmount) : 0,
        invoiceTotal: Number(editForm.invoiceTotal),
        remarks: editForm.remarks,
        fileName,
        fileData,
        fileType,
        fileSize
      };

      await call('updateInvoice', invoiceToEdit.invoice_id || invoiceToEdit.id, payload);
      toast.success(`Invoice #${payload.invoiceNumber} updated successfully!`);
      if (editFilePreviewUrl) URL.revokeObjectURL(editFilePreviewUrl);
      setEditFilePreviewUrl(null);
      setEditSelectedFile(null);
      setEditModalOpen(false);
      setInvoiceToEdit(null);
      await fetchPOInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to update invoice');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCnAmountChange = (field, val) => {
    const updated = { ...cnForm, [field]: val };
    const s = parseFloat(field === 'subtotal' ? val : updated.subtotal) || 0;
    const t = parseFloat(field === 'taxAmount' ? val : updated.taxAmount) || 0;
    if (field !== 'totalAmount' && s > 0) {
      updated.totalAmount = (s + t).toFixed(2);
    }
    setCnForm(updated);
  };

  const handleCreateCnSubmit = async (e) => {
    e.preventDefault();
    if (!cnForm.cnNumber || !cnForm.totalAmount) {
      toast.error("Credit Note Number and Total Amount are required.");
      return;
    }

    setCnSubmitting(true);
    try {
      let fileData = null;
      let fileName = null;
      let fileType = null;
      let fileSize = null;

      if (cnFile) {
        fileName = cnFile.name;
        fileType = cnFile.type;
        fileSize = cnFile.size;
        fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(cnFile);
        });
      }

      await call('createCreditNote', {
        cnNumber: cnForm.cnNumber.trim(),
        cnDate: cnForm.cnDate,
        poNo,
        invoiceId: cnForm.invoiceId || null,
        subtotal: cnForm.subtotal ? Number(cnForm.subtotal) : 0,
        taxAmount: cnForm.taxAmount ? Number(cnForm.taxAmount) : 0,
        totalAmount: Number(cnForm.totalAmount),
        reason: cnForm.reason,
        remarks: cnForm.remarks,
        fileName,
        fileData,
        fileType,
        fileSize
      });

      toast.success(`Credit Note #${cnForm.cnNumber} recorded successfully!`);
      setCnModalOpen(false);
      setCnFile(null);
      setCnForm({
        invoiceId: '',
        cnNumber: '',
        cnDate: new Date().toISOString().split('T')[0],
        subtotal: '',
        taxAmount: '',
        totalAmount: '',
        reason: 'Rate Difference',
        remarks: ''
      });
      await fetchPOInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to create Credit Note');
    } finally {
      setCnSubmitting(false);
    }
  };

  const handleDeleteCnConfirm = async () => {
    if (!cnToDelete) return;
    setCnDeleting(true);
    try {
      await call('deleteCreditNote', cnToDelete.cn_id || cnToDelete.id);
      toast.success(`Credit Note #${cnToDelete.cn_number} deleted successfully`);
      setCnToDelete(null);
      await fetchPOInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to delete Credit Note');
    } finally {
      setCnDeleting(false);
    }
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
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Credit Notes (CN)</span>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
            {totalCreditNotes > 0 ? `-${formatCurrency(totalCreditNotes)}` : formatCurrency(0)}
          </p>
        </Card>

        <Card className="bg-card border border-border p-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Net Remaining Balance</span>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">{formatCurrency(effectiveRemainingBalance)}</p>
        </Card>
      </div>

      {/* Header & Upload Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-600 dark:text-primary" /> Linked Invoices ({(data.invoices || []).length})
        </h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCnModalOpen(true)}
            variant="outline"
            className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-bold text-xs h-8 flex items-center gap-1.5 cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" /> + Credit Note (CN)
          </Button>
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 dark:bg-gold dark:hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 flex items-center gap-1.5 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" /> Upload Internal Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-xs text-muted-foreground italic flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600 dark:text-primary" />
          <span>Loading invoices...</span>
        </div>
      ) : error ? (
        <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-xl text-center text-xs text-red-600 dark:text-red-400">{error}</div>
      ) : (data.invoices || []).length === 0 ? (
        <div className="p-8 border border-border border-dashed rounded-xl text-center text-xs text-muted-foreground">
          No invoices uploaded for this PO yet.
        </div>
      ) : (
        <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
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
                      className="inline-flex items-center text-xs text-amber-600 dark:text-primary hover:underline font-semibold p-1 hover:bg-amber-500/10 rounded transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(inv)}
                      className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 p-1 hover:bg-blue-500/10 rounded transition-colors cursor-pointer"
                      title="Edit Invoice"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Credit Notes (CN) Section for this PO */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Credit Notes (CN) Deductions ({creditNotes.length})
          </h3>
          {creditNotes.length > 0 && (
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
              Total Adjustment: {formatCurrency(totalCreditNotes)}
            </span>
          )}
        </div>

        {creditNotes.length === 0 ? (
          <div className="p-5 border border-border border-dashed rounded-xl text-center text-xs text-muted-foreground">
            No Credit Notes recorded against PO {poNo}. Click "+ Credit Note (CN)" to record a price adjustment or return.
          </div>
        ) : (
          <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-slate-50/80 dark:bg-slate-900/50">
                  <TableHead className="text-xs font-semibold text-muted-foreground">CN Number</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Linked Invoice</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Reason</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">CN Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditNotes.map((cn) => (
                  <TableRow key={cn.cn_id || cn.id} className="border-b border-border/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <TableCell className="font-bold text-xs font-mono text-indigo-600 dark:text-indigo-400">{cn.cn_number}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{cn.cn_date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{cn.invoice_number || 'General Adjustment'}</TableCell>
                    <TableCell>
                      <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px]">
                        {cn.reason || 'Adjustment'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-indigo-600 dark:text-indigo-400 font-bold text-right whitespace-nowrap font-mono tabular-nums">
                      {formatCurrency(cn.total_amount)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap space-x-2">
                      {cn.file_url && (
                        <a
                          href={cn.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold p-1 hover:bg-indigo-500/10 rounded transition-colors"
                          title="View CN Document"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> Doc
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setCnToDelete(cn)}
                        className="inline-flex items-center text-xs text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                        title="Delete Credit Note"
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
      </div>

      {/* Upload Internal Invoice Modal */}
      {uploadModalOpen && (
        <Dialog open={true} onClose={() => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl); setFilePreviewUrl(null); setUploadModalOpen(false); }} title={`Upload Internal Invoice — PO ${poNo}`} maxWidth={filePreviewUrl ? "max-w-6xl" : "max-w-md"}>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className={`grid ${filePreviewUrl ? 'grid-cols-1 lg:grid-cols-12 gap-5' : 'grid-cols-1'}`}>
              {filePreviewUrl && (
                <div className="lg:col-span-6 flex flex-col space-y-2 border border-border/80 rounded-2xl p-3 bg-muted/20">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>Live Invoice Preview</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => window.open(filePreviewUrl, '_blank', 'width=900,height=1000')}
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      title="Open invoice in side window"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in Side Window
                    </button>
                  </div>
                  <div className="flex-1 min-h-[520px] w-full rounded-xl overflow-hidden border border-border bg-neutral-900 flex items-center justify-center">
                    {selectedFile?.type === 'application/pdf' ? (
                      <iframe
                        src={filePreviewUrl}
                        title="Invoice Document Preview"
                        className="w-full h-full min-h-[520px] rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[520px] overflow-auto flex items-center justify-center p-2">
                        <img
                          src={filePreviewUrl}
                          alt="Invoice Preview"
                          className="max-w-full max-h-[500px] object-contain rounded-lg shadow-md"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Inspect document here or pop out in a side window to cross-check fields while validating.
                  </p>
                </div>
              )}
              <div className={filePreviewUrl ? 'lg:col-span-6 space-y-4' : 'space-y-4'}>
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
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    {aiLoading ? 'Reading Document...' : 'Auto-fill from Invoice'}
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

            </div>
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

      {/* Edit Invoice Dialog */}
      {editModalOpen && invoiceToEdit && (
        <Dialog
          open={true}
          onClose={() => {
            if (editFilePreviewUrl) URL.revokeObjectURL(editFilePreviewUrl);
            setEditFilePreviewUrl(null);
            setEditSelectedFile(null);
            setEditModalOpen(false);
            setInvoiceToEdit(null);
          }}
          title={`Edit Invoice #${invoiceToEdit.invoice_number}`}
          maxWidth={editFilePreviewUrl ? "max-w-5xl" : "max-w-md"}
        >
          <form onSubmit={handleEditInvoiceSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Invoice Number *</label>
                <Input
                  type="text"
                  required
                  value={editForm.invoiceNumber}
                  onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-2026-0092"
                  className="bg-background border-border text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Invoice Date *</label>
                <Input
                  type="date"
                  required
                  value={editForm.invoiceDate}
                  onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
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
                  value={editForm.subtotal}
                  onChange={(e) => handleEditAmountChange('subtotal', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Tax Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.taxAmount}
                  onChange={(e) => handleEditAmountChange('taxAmount', e.target.value)}
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
                  value={editForm.invoiceTotal}
                  onChange={(e) => handleEditAmountChange('invoiceTotal', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-bold text-amber-600 dark:text-amber-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Replace Attachment PDF (Optional)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleEditFileChange}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-600 dark:file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
              />
              {editSelectedFile && (
                <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  ✓ Selected: {editSelectedFile.name} ({(editSelectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Remarks</label>
              <Textarea
                rows={2}
                value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                placeholder="Optional edit remarks..."
                className="bg-background border-border text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (editFilePreviewUrl) URL.revokeObjectURL(editFilePreviewUrl);
                  setEditFilePreviewUrl(null);
                  setEditSelectedFile(null);
                  setEditModalOpen(false);
                  setInvoiceToEdit(null);
                }}
                disabled={editSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 px-4"
              >
                {editSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Record Credit Note Modal */}
      {cnModalOpen && (
        <Dialog open={true} onClose={() => { setCnModalOpen(false); setCnFile(null); }} title={`Record Credit Note (CN) — PO ${poNo}`} maxWidth="max-w-md">
          <form onSubmit={handleCreateCnSubmit} className="space-y-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs space-y-1">
              <p><span className="text-muted-foreground">Target Vendor:</span> <strong>{vendorName || 'Selected Vendor'}</strong></p>
              <p><span className="text-muted-foreground">PO Number:</span> <strong className="font-mono">{poNo}</strong></p>
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Linked Invoice (Optional)</label>
              <select
                value={cnForm.invoiceId}
                onChange={(e) => setCnForm({ ...cnForm, invoiceId: e.target.value })}
                className="w-full h-9 rounded-xl border border-border bg-background text-foreground px-3 text-xs"
              >
                <option value="">General Adjustment / No specific invoice</option>
                {(data.invoices || []).map((inv) => (
                  <option key={inv.invoice_id} value={inv.invoice_id}>
                    Invoice #{inv.invoice_number} — ₹{Number(inv.invoice_total || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Credit Note # *</label>
                <Input
                  type="text"
                  required
                  value={cnForm.cnNumber}
                  onChange={(e) => setCnForm({ ...cnForm, cnNumber: e.target.value })}
                  placeholder="e.g. CN-001"
                  className="bg-background border-border text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">CN Date *</label>
                <Input
                  type="date"
                  required
                  value={cnForm.cnDate}
                  onChange={(e) => setCnForm({ ...cnForm, cnDate: e.target.value })}
                  className="bg-background border-border text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Reason for Credit Note *</label>
              <select
                value={cnForm.reason}
                onChange={(e) => setCnForm({ ...cnForm, reason: e.target.value })}
                className="w-full h-9 rounded-xl border border-border bg-background text-foreground px-3 text-xs"
              >
                <option value="Rate Difference / Price Correction">Rate Difference / Price Correction</option>
                <option value="Damaged / Defective Goods">Damaged / Defective Goods</option>
                <option value="Quantity Shortage / Return">Quantity Shortage / Return</option>
                <option value="Discount / Commercial Rebate">Discount / Commercial Rebate</option>
                <option value="Invoice Cancellation / Re-issue">Invoice Cancellation / Re-issue</option>
                <option value="Other Adjustment">Other Adjustment</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Subtotal (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cnForm.subtotal}
                  onChange={(e) => handleCnAmountChange('subtotal', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Tax (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cnForm.taxAmount}
                  onChange={(e) => handleCnAmountChange('taxAmount', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-foreground block mb-1 font-bold">Total CN (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={cnForm.totalAmount}
                  onChange={(e) => handleCnAmountChange('totalAmount', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Credit Note PDF (Optional)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setCnFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-indigo-500/10 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-500/20 cursor-pointer"
              />
              {cnFile && (
                <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                  ✓ Attached: {cnFile.name} ({(cnFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">Remarks</label>
              <Textarea
                rows={2}
                value={cnForm.remarks}
                onChange={(e) => setCnForm({ ...cnForm, remarks: e.target.value })}
                placeholder="Optional notes..."
                className="bg-background border-border text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => { setCnModalOpen(false); setCnFile(null); }} disabled={cnSubmitting} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={cnSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 px-4"
              >
                {cnSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                {cnSubmitting ? 'Recording...' : 'Record Credit Note'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Delete Credit Note Dialog */}
      {cnToDelete && (
        <Dialog open={true} onClose={() => setCnToDelete(null)} title="Delete Credit Note" maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs space-y-1">
              <p><strong className="text-muted-foreground">CN #:</strong> <span className="font-mono font-bold text-foreground">{cnToDelete.cn_number}</span></p>
              <p><strong className="text-muted-foreground">Value:</strong> <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{formatCurrency(cnToDelete.total_amount)}</span></p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this credit note? This will restore the PO remaining balance.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setCnToDelete(null)} disabled={cnDeleting} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteCnConfirm}
                disabled={cnDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {cnDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {cnDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
