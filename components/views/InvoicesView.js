'use client';

import { mergeOcrFields } from '../../app/lib/invoiceOcrFields';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, Input, Dialog, Textarea } from '../ui/core';
import { 
  Receipt, Search, Filter, Download, CheckCircle2, XCircle, Clock, FilePlus, 
  Loader2, CreditCard, Eye, Trash2, AlertTriangle, LayoutGrid, LayoutList, 
  FileText, Sparkles, Building, IndianRupee, RefreshCw, FileCheck, ShieldAlert, UploadCloud,
  ChevronDown, ChevronRight, Users, Calendar, ArrowUpRight, ExternalLink, Percent, ShieldCheck,
  Check, Copy, X, SlidersHorizontal, Edit2, Paperclip, Printer
} from 'lucide-react';
import { toast } from '../ui/Toast';
import { exportToCSV } from '../../app/lib/exportUtils';
import { formatDate } from '../../app/lib/utils';
import SearchableVendorSelect from '../ui/SearchableVendorSelect';
import { prepareInvoiceForOcr } from '../../app/lib/invoiceOcrClient';

export default function InvoicesView() {
  const { call, setActiveView, vendors = [] } = useAppState();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View mode tab: 'vendor' (Vendor-Wise Grouped) | 'flat' (Detailed Table) | 'pending_queue' (Review Queue)
  const [activeViewMode, setActiveViewMode] = useState('flat');
  const [showSummary, setShowSummary] = useState(true);
  const [invoiceSort, setInvoiceSort] = useState('date_desc');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(25);

  // Vendor View Expanded Accordion State: object mapping vendorKey -> boolean
  const [expandedVendors, setExpandedVendors] = useState({});

  // Slide-Over Inspection Drawer State
    const [inspectInvoice, setInspectInvoice] = useState(null);
  const [inspectFullData, setInspectFullData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [showPdfView, setShowPdfView] = useState(false);
  const [attachmentsPopoverOpen, setAttachmentsPopoverOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview' | 'pdf' | 'po_health'

  // Deletion State
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Multi-Select State
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  // Edit Invoice State
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFilePreviewUrl, setEditFilePreviewUrl] = useState(null);
  const [editSelectedFile, setEditSelectedFile] = useState(null);
  const [editForm, setEditForm] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    subtotal: '',
    taxAmount: '',
    invoiceTotal: '',
    remarks: ''
  });

  // Credit Note (CN) State
  const [creditNotesList, setCreditNotesList] = useState([]);
  const [cnLoading, setCnLoading] = useState(false);
  const [cnModalOpen, setCnModalOpen] = useState(false);
  const [cnSubmitting, setCnSubmitting] = useState(false);
  const [cnFile, setCnFile] = useState(null);
  const [cnVendorFilter, setCnVendorFilter] = useState('');
  const [cnToDelete, setCnToDelete] = useState(null);
  const [cnDeleting, setCnDeleting] = useState(false);
  const [cnForm, setCnForm] = useState({
    poNo: '',
    invoiceId: '',
    cnNumber: '',
    cnDate: new Date().toISOString().split('T')[0],
    subtotal: '',
    taxAmount: '',
    totalAmount: '',
    reason: 'Rate Difference',
    remarks: ''
  });

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
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [posList, setPosList] = useState([]);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('');
  const [uploadVendorFilter, setUploadVendorFilter] = useState('');
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

  const fetchCreditNotes = async () => {
    try {
      setCnLoading(true);
      const res = await call('listCreditNotes', {});
      const list = Array.isArray(res) ? res : (res?.data || []);
      setCreditNotesList(list);
    } catch (err) {
      console.warn('Failed to fetch credit notes:', err);
      setCreditNotesList([]);
    } finally {
      setCnLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchPOs();
    fetchCreditNotes();
  }, []);

  const getInvoiceDueDate = (inv) => {
    if (!inv) return null;
    if (inv.due_date) return new Date(inv.due_date);
    if (!inv.invoice_date) return null;
    const d = new Date(inv.invoice_date);
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + 30);
    return d;
  };

  const getInvoiceOverdueInfo = (inv) => {
    if (!inv) return { isOverdue: false, days: 0, label: '', type: 'default' };
    const isPaid = String(inv.status).toLowerCase() === 'paid';
    if (isPaid) return { isOverdue: false, days: 0, label: 'PAID', type: 'paid' };

    const dueDate = getInvoiceDueDate(inv);
    if (!dueDate) return { isOverdue: false, days: 0, label: String(inv.status || 'SUBMITTED').toUpperCase(), type: 'default' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return { isOverdue: true, days: diffDays, label: `OVERDUE BY ${diffDays} DAYS`, type: 'overdue' };
    }
    if (String(inv.status).toLowerCase() === 'approved') {
      return { isOverdue: false, days: 0, label: 'APPROVED', type: 'approved' };
    }
    return { isOverdue: false, days: 0, label: 'AWAITING REVIEW', type: 'pending' };
  };

  const handleOpenInspect = async (inv) => {
    setInspectInvoice(inv);
    setDrawerTab('overview');
    setShowPdfView(false);
    setAttachmentsPopoverOpen(false);
    setInspectLoading(true);
    try {
      const full = await call('getInvoice', inv.invoice_id || inv.id);
      setInspectFullData(full);
    } catch (err) {
      console.warn('Failed to load full invoice details:', err);
      setInspectFullData(inv);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleUploadAdditionalAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !inspectInvoice) return;
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const base64Data = evt.target.result.split(',')[1];
          await call('uploadAttachment', {
            entityType: 'invoice',
            entityId: inspectInvoice.invoice_id,
            fileName: file.name,
            fileType: file.type || 'application/pdf',
            fileSize: file.size,
            fileData: base64Data
          });
          toast.success(`Attachment "${file.name}" uploaded successfully!`);
          const full = await call('getInvoice', inspectInvoice.invoice_id);
          setInspectFullData(full);
        } catch (err) {
          toast.error('Upload failed: ' + (err.message || err));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Error reading file: ' + err.message);
    }
  };

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
      if (inspectInvoice && (inspectInvoice.invoice_id === invoiceToEdit.invoice_id)) {
        setInspectInvoice(prev => ({
          ...prev,
          invoice_number: payload.invoiceNumber,
          invoice_date: payload.invoiceDate,
          subtotal: payload.subtotal,
          tax_amount: payload.taxAmount,
          invoice_total: payload.invoiceTotal,
          remarks: payload.remarks
        }));
      }
      await fetchInvoices();
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
    if (!cnForm.poNo || !cnForm.cnNumber || !cnForm.totalAmount) {
      toast.error("PO Number, Credit Note Number, and Total Amount are required.");
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
        poNo: cnForm.poNo,
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
      setCnVendorFilter('');
      setCnForm({
        poNo: '',
        invoiceId: '',
        cnNumber: '',
        cnDate: new Date().toISOString().split('T')[0],
        subtotal: '',
        taxAmount: '',
        totalAmount: '',
        reason: 'Rate Difference',
        remarks: ''
      });
      await fetchCreditNotes();
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
      await fetchCreditNotes();
    } catch (err) {
      toast.error(err.message || 'Failed to delete Credit Note');
    } finally {
      setCnDeleting(false);
    }
  };

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
          setUploadVendorFilter('');
          setOcrSuccess(false);
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
      { label: 'Vendor Name', key: 'vendor_name' },
      { label: 'P.O No', key: 'po_no' },
      { 
        label: 'P.O Value', 
        key: 'po_value', 
        formatter: (v, r) => {
          const m = posList.find(p => String(p.po_no || p.poNo).trim().toLowerCase() === String(r.po_no || '').trim().toLowerCase());
          return m ? Number(m.po_value || m.poValue || 0) : 0;
        } 
      },
      { label: 'Invoice Amount', key: 'invoice_total', formatter: v => Number(v || 0) },

      { label: 'Invoice Number', key: 'invoice_number' },
      { label: 'Invoice Date', key: 'invoice_date', formatter: (v) => formatDate(v) },
      { label: 'Status', key: 'status' }
    ];
    exportToCSV('Invoices_Ledger_Report.csv', columns, filteredInvoices);
  };

  const [aiLoading, setAiLoading] = useState(false);
  const scanSequence = useRef(0);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  const handleAiAutoFill = async (overrideFile) => {
    const file = overrideFile || selectedFile;
    if (!file) {
      toast.info('Please select or drag an invoice document first.');
      return;
    }
    setAiLoading(true);
    const scanId = ++scanSequence.current;
    setOcrSuccess(false);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      // Preprocess file for OCR (renders PDF page 1 to crisp ~200KB image or downscales large photo)
      const { fileData, fileType, additionalImages } = await prepareInvoiceForOcr(file);

      const token = localStorage.getItem('lx_auth_token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lwa-token': token || ''
        },
        body: JSON.stringify({
          fileData,
          additionalImages,
          fileType
        }),
        signal: controller.signal
      });

      const rawText = await res.text();
      let result;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error('Server returned invalid response. Please enter invoice details manually.');
      }

      if (!res.ok || result.error) {
        throw new Error(result.error || 'OCR document reading failed');
      }

      const data = result.data || {};
      if (scanId !== scanSequence.current) return;
      if (result.isEmpty) { toast.warning(result.warning || 'No invoice fields detected. Existing entries were kept.'); return; }
      
      setUploadForm(prev => mergeOcrFields(prev, data));

      // 1. Auto-match PO Number if detected
      let matchedPO = null;
      if (data.poNumber) {
        const poClean = String(data.poNumber).toLowerCase().replace(/[^a-z0-9]/g, '');
        matchedPO = posList.find(p => {
          const pNo = String(p.po_no || p.poNo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return pNo && (pNo.includes(poClean) || poClean.includes(pNo));
        });
        if (matchedPO) {
          const finalPoNo = matchedPO.po_no || matchedPO.poNo;
          setUploadForm(prev => ({ ...prev, poNo: finalPoNo }));
          toast.info(`Auto-matched PO: ${finalPoNo}`);
        }
      }

      // 2. Auto-match vendor if detected or from matched PO
      if (matchedPO) {
        const vCode = matchedPO.vendor_code || matchedPO.vendor_key || matchedPO.vendor_name || matchedPO.vendor;
        if (vCode) {
          setUploadVendorFilter(vCode);
          toast.info(`Auto-selected Vendor: ${matchedPO.vendor_name || matchedPO.vendor}`);
        }
      } else if (data.vendorName) {
        const vNameClean = String(data.vendorName).toLowerCase().replace(/[^a-z0-9]/g, '');
        let matched = allAvailableVendors.find(v => {
          const vName = String(v.name || v.legal_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const vCode = String(v.code || v.vendor_code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const vTrade = String(v.trade_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!vName && !vCode) return false;
          return (vName && (vNameClean.includes(vName) || vName.includes(vNameClean))) ||
                 (vCode && (vNameClean.includes(vCode) || vCode.includes(vNameClean))) ||
                 (vTrade && (vNameClean.includes(vTrade) || vTrade.includes(vNameClean)));
        });

        if (!matched && vNameClean.length >= 4) {
          const stopWords = ['pvt', 'ltd', 'limited', 'private', 'enterprises', 'associates', 'llp', 'sons', 'and', 'the', 'india', 'solutions', 'works', 'decor'];
          const words = String(data.vendorName).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !stopWords.includes(w));
          if (words.length > 0) {
            matched = allAvailableVendors.find(v => {
              const targetStr = (String(v.name || '') + ' ' + String(v.legal_name || '') + ' ' + String(v.trade_name || '')).toLowerCase();
              return words.some(w => targetStr.includes(w));
            });
          }
        }

        if (matched) {
          const matchedVal = matched.code || matched.name;
          setUploadVendorFilter(matchedVal);
          toast.info(`Auto-matched Vendor: ${matched.name || matched.legal_name}`);

          // Auto-select PO if vendor has open/approved POs
          const targetCode = String(matched.code || matched.vendor_code || '').toLowerCase();
          const targetName = String(matched.name || matched.legal_name || '').toLowerCase();
          const vendorPOs = posList.filter(p => {
            const st = String(p.status || p.approval_status || '').toLowerCase();
            if (['rejected', 'cancelled', 'canceled'].includes(st)) return false;
            const pCode = String(p.vendor_code || p.vendor_key || '').toLowerCase();
            const pName = String(p.vendor_name || p.vendor || '').toLowerCase();
            return (targetCode && pCode === targetCode) || (targetName && pName === targetName) || (targetName && (pName.includes(targetName) || targetName.includes(pName)));
          });

          if (vendorPOs.length === 1) {
            const autoPo = vendorPOs[0].po_no || vendorPOs[0].poNo;
            setUploadForm(prev => ({ ...prev, poNo: autoPo }));
            toast.info(`Auto-selected PO: ${autoPo}`);
          }
        }
      }

      const hasAnyData = Boolean(
        data.invoiceNumber || 
        (data.invoiceTotal && Number(data.invoiceTotal) > 0) || 
        data.vendorName
      );

      if (result.isEmpty || !hasAnyData) {
        setOcrSuccess(false);
        toast.warning(result.warning || 'Could not auto-read invoice fields from this document. Please enter details manually.');
        return;
      }

      setOcrSuccess(true);
      const fields = [];
      if (data.vendorName) fields.push('Vendor');
      if (data.invoiceNumber) fields.push(`Invoice #${data.invoiceNumber}`);
      if (data.invoiceDate) fields.push('Date');
      if (data.invoiceTotal) fields.push(`Total (₹${Number(data.invoiceTotal).toLocaleString('en-IN')})`);
      if (data.poNumber) fields.push('PO');
      toast.success(`OCR auto-filled ${fields.join(', ')} successfully!`);
    } catch (err) {
      clearTimeout(timeoutId);
      if (scanId !== scanSequence.current) return;
      if (err.name === 'AbortError') {
        toast.error('OCR scan timed out. Please enter invoice details manually.');
      } else {
        toast.error('OCR auto-fill failed: ' + (err.message || 'Unknown error'));
      }
    } finally {
      clearTimeout(timeoutId);
      if (scanId === scanSequence.current) setAiLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Combined list of vendors across master vendors, POs and invoices
  const allAvailableVendors = useMemo(() => {
    const map = new Map();
    if (Array.isArray(vendors)) {
      vendors.forEach(v => {
        const code = (v.code || v.vendor_code || v.vendorId || '').trim();
        const name = (v.name || v.legal_name || v.legalName || '').trim();
        const key = (code || name).toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, {
            code: code,
            name: name || key,
            trade_name: v.trade_name || v.tradeName || '',
            recordId: v.recordId || v.id || key
          });
        }
      });
    }
    if (Array.isArray(posList)) {
      posList.forEach(p => {
        const code = (p.vendor_code || p.vendorCode || '').trim();
        const name = (p.vendor_name || p.vendor || '').trim();
        const key = (code || name).toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, {
            code: code,
            name: name || key,
            trade_name: '',
            recordId: key
          });
        }
      });
    }
    if (Array.isArray(invoices)) {
      invoices.forEach(inv => {
        const code = (inv.vendor_code || '').trim();
        const name = (inv.vendor_name || '').trim();
        const key = (code || name).toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, {
            code: code,
            name: name || key,
            trade_name: '',
            recordId: key
          });
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [vendors, posList, invoices]);

  // Filtered POs for internal invoice upload modal based on selected vendor
  const availableUploadPOs = useMemo(() => {
    if (!Array.isArray(posList)) return [];
    const validPOs = posList.filter(p => {
      const st = String(p.status || p.approval_status || '').toLowerCase();
      return !['rejected', 'cancelled', 'canceled'].includes(st);
    });
    if (!uploadVendorFilter) return validPOs;
    const vFilter = uploadVendorFilter.trim().toLowerCase();
    const cleanFilter = vFilter.replace(/[^a-z0-9]/g, '');

    const vObj = allAvailableVendors.find(v => {
      const vc = String(v.code || v.vendor_code || '').trim().toLowerCase();
      const vn = String(v.name || v.legal_name || '').trim().toLowerCase();
      return (vc && vc === vFilter) || (vn && vn === vFilter) || 
             (vc && cleanFilter.includes(vc.replace(/[^a-z0-9]/g, ''))) ||
             (vn && cleanFilter.includes(vn.replace(/[^a-z0-9]/g, '')));
    });

    const targetCode = vObj ? String(vObj.code || vObj.vendor_code || '').trim().toLowerCase() : '';
    const targetName = vObj ? String(vObj.name || vObj.legal_name || '').trim().toLowerCase() : '';

    const filtered = validPOs.filter(p => {
      const code = String(p.vendor_code || p.vendorCode || p.vendor_key || '').trim().toLowerCase();
      const name = String(p.vendor_name || p.vendor || '').trim().toLowerCase();
      const cleanCode = code.replace(/[^a-z0-9]/g, '');
      const cleanName = name.replace(/[^a-z0-9]/g, '');

      if (code && (code === vFilter || cleanCode === cleanFilter || cleanFilter.includes(cleanCode) || cleanCode.includes(cleanFilter))) return true;
      if (name && (name === vFilter || cleanName === cleanFilter || cleanFilter.includes(cleanName) || cleanName.includes(cleanFilter))) return true;
      if (targetCode && code && (code === targetCode || cleanCode === targetCode.replace(/[^a-z0-9]/g, ''))) return true;
      if (targetName && name && (name === targetName || cleanName === targetName.replace(/[^a-z0-9]/g, ''))) return true;
      return false;
    });

    return filtered.length > 0 ? filtered : validPOs;
  }, [posList, uploadVendorFilter, allAvailableVendors]);

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

      const matchesVendor = !selectedVendorFilter ||
        String(inv.vendor_code || '').toLowerCase() === selectedVendorFilter.toLowerCase() ||
        String(inv.vendor_name || '').toLowerCase() === selectedVendorFilter.toLowerCase();

      let matchesQuick = true;
      if (quickFilter === 'HIGH_VALUE') {
        matchesQuick = Number(inv.invoice_total || 0) >= 100000;
      } else if (quickFilter === 'THIS_MONTH') {
        const invDate = new Date(inv.invoice_date || inv.created_at || Date.now());
        const now = new Date();
        matchesQuick = invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      }

      return matchesSearch && matchesTab && matchesSource && matchesQuick && matchesVendor;
    }).sort((a, b) => {
      if (invoiceSort === 'vendor') return String(a.vendor_name || '').localeCompare(String(b.vendor_name || ''));
      if (invoiceSort === 'amount_desc') return Number(b.invoice_total || 0) - Number(a.invoice_total || 0);
      const first = Date.parse(a.invoice_date || a.created_at || '') || 0;
      const second = Date.parse(b.invoice_date || b.created_at || '') || 0;
      return invoiceSort === 'date_asc' ? first - second : second - first;
    });
  }, [invoices, search, statusFilter, sourceFilter, quickFilter, invoiceSort, selectedVendorFilter]);

  const invoicePageCount = Math.max(1, Math.ceil(filteredInvoices.length / invoicePageSize));
  const safeInvoicePage = Math.min(invoicePage, invoicePageCount);
  const pagedInvoices = filteredInvoices.slice((safeInvoicePage - 1) * invoicePageSize, safeInvoicePage * invoicePageSize);
  useEffect(() => {
    setInvoicePage(1);
    setSelectedInvoiceIds([]);
  }, [search, statusFilter, sourceFilter, quickFilter, invoiceSort, invoicePageSize, activeViewMode, selectedVendorFilter]);

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

  const zohoKpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let msmeUnpaidCount = 0;
    let totalOutstanding = 0;
    let dueToday = 0;
    let dueWithin30 = 0;
    let overdueCount = 0;
    let overdueTotal = 0;

    invoices.forEach(inv => {
      const isPaid = String(inv.status).toLowerCase() === 'paid';
      const isRejected = String(inv.status).toLowerCase() === 'rejected';
      if (isPaid || isRejected) return;

      const total = Number(inv.invoice_total || 0);
      totalOutstanding += total;

      if (inv.invoice_date) {
        const invDate = new Date(inv.invoice_date);
        if (!isNaN(invDate.getTime())) {
          const daysOld = Math.floor((today - invDate) / (1000 * 60 * 60 * 24));
          if (daysOld >= 40) {
            msmeUnpaidCount += 1;
          }

          const dueDate = new Date(invDate);
          dueDate.setDate(dueDate.getDate() + 30);
          const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntilDue < 0) {
            overdueCount += 1;
            overdueTotal += total;
          } else if (daysUntilDue === 0) {
            dueToday += total;
          } else if (daysUntilDue <= 30) {
            dueWithin30 += total;
          }
        }
      }
    });

    return {
      msmeUnpaidCount,
      totalOutstanding,
      dueToday,
      dueWithin30,
      overdueCount,
      overdueTotal
    };
  }, [invoices]);

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

  const getAttachmentUrl = (invoiceId, disposition = 'inline') => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('lx_auth_token') || localStorage.getItem('auth_token') || '') : '';
    return `/api/attachments/${encodeURIComponent(invoiceId)}?token=${encodeURIComponent(token)}&disposition=${disposition}`;
  };

  // Fetch attachment as blob and trigger a real browser download
  const [downloadingId, setDownloadingId] = useState(null);
  const handleDownloadAttachment = async (invoiceId, fileName) => {
    if (!invoiceId) { toast.error('No attachment found for this invoice.'); return; }
    setDownloadingId(invoiceId);
    try {
      const url = getAttachmentUrl(invoiceId, 'attachment');
      const token = typeof window !== 'undefined' ? (localStorage.getItem('lx_auth_token') || localStorage.getItem('auth_token') || '') : '';
      const res = await fetch(url, {
        headers: {
          'x-lwa-token': token
        }
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName || `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success('Download started');
    } catch (err) {
      toast.error('Download failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          Approved
        </span>
      );
    }
    if (s === 'paid') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 whitespace-nowrap shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          Paid
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 whitespace-nowrap shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          Rejected
        </span>
      );
    }
    if (s === 'under review') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          Under Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20 whitespace-nowrap shadow-xs">
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

  // Multi-Select Derived Data & Actions
  const selectedInvoicesData = useMemo(() => {
    return invoices.filter(inv => selectedInvoiceIds.includes(inv.invoice_id));
  }, [invoices, selectedInvoiceIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedInvoicesData.reduce((sum, inv) => sum + Number(inv.invoice_total || 0), 0);
  }, [selectedInvoicesData]);

  const pendingSelectedCount = useMemo(() => {
    return selectedInvoicesData.filter(inv => {
      const s = String(inv.status || '').toLowerCase();
      return s === 'submitted' || s === 'under review' || s === 'pending';
    }).length;
  }, [selectedInvoicesData]);

  const allFilteredSelected = filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceIds.includes(inv.invoice_id));

  const handleToggleSelectInvoice = (id) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllInvoices = (checked) => {
    if (checked) {
      setSelectedInvoiceIds(filteredInvoices.map(inv => inv.invoice_id));
    } else {
      setSelectedInvoiceIds([]);
    }
  };

  const handleBulkApproveSelected = async () => {
    if (selectedInvoiceIds.length === 0) return;
    const pendingSelected = selectedInvoicesData.filter(inv => {
      const s = String(inv.status || '').toLowerCase();
      return s === 'submitted' || s === 'under review' || s === 'pending';
    });
    if (pendingSelected.length === 0) {
      toast.info('None of the selected invoices are pending review.');
      return;
    }
    setBulkActionLoading(true);
    try {
      let count = 0;
      for (const inv of pendingSelected) {
        await call('updateInvoiceStatus', inv.invoice_id, 'Approved');
        count++;
      }
      toast.success(`Successfully approved ${count} invoice(s)!`);
      await fetchInvoices();
      setSelectedInvoiceIds([]);
    } catch (err) {
      toast.error('Bulk approve failed: ' + (err.message || 'Error updating invoices'));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRejectSelectedConfirm = async () => {
    if (selectedInvoiceIds.length === 0) return;
    const pendingSelected = selectedInvoicesData.filter(inv => {
      const s = String(inv.status || '').toLowerCase();
      return s === 'submitted' || s === 'under review' || s === 'pending';
    });
    if (pendingSelected.length === 0) {
      toast.info('None of the selected invoices are pending review.');
      setBulkRejectModalOpen(false);
      return;
    }
    if (!bulkRejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setBulkActionLoading(true);
    try {
      let count = 0;
      for (const inv of pendingSelected) {
        await call('updateInvoiceStatus', inv.invoice_id, 'Rejected', bulkRejectReason);
        count++;
      }
      toast.success(`Successfully rejected ${count} invoice(s).`);
      await fetchInvoices();
      setSelectedInvoiceIds([]);
      setBulkRejectModalOpen(false);
      setBulkRejectReason('');
    } catch (err) {
      toast.error('Bulk reject failed: ' + (err.message || 'Error rejecting invoices'));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDeleteSelectedConfirm = async () => {
    if (selectedInvoiceIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      let count = 0;
      for (const id of selectedInvoiceIds) {
        await call('deleteInvoice', id);
        count++;
      }
      toast.success(`Successfully deleted ${count} invoice(s).`);
      await fetchInvoices();
      setSelectedInvoiceIds([]);
      setBulkDeleteModalOpen(false);
    } catch (err) {
      toast.error('Bulk delete failed: ' + (err.message || 'Error deleting invoices'));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkExportSelected = () => {
    if (selectedInvoicesData.length === 0) return;
    const columns = [
      { label: 'Vendor Name', key: 'vendor_name' },
      { label: 'P.O No', key: 'po_no' },
      { 
        label: 'P.O Value', 
        key: 'po_value', 
        formatter: (v, r) => {
          const m = posList.find(p => String(p.po_no || p.poNo).trim().toLowerCase() === String(r.po_no || '').trim().toLowerCase());
          return m ? Number(m.po_value || m.poValue || 0) : 0;
        } 
      },
      { label: 'Invoice Amount', key: 'invoice_total', formatter: v => Number(v || 0) },

      { label: 'Invoice Number', key: 'invoice_number' },
      { label: 'Invoice Date', key: 'invoice_date', formatter: (v) => formatDate(v) },
      { label: 'Status', key: 'status' }
    ];
    exportToCSV('Selected_Invoices_Report.csv', columns, selectedInvoicesData);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">

      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Vendor invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Review bills, track approvals and prepare payments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchInvoices} disabled={loading} aria-label="Refresh invoices"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={loading || !filteredInvoices.length}><Download size={15} className="mr-2" />Export</Button>
          <Button size="sm" onClick={() => setUploadModalOpen(true)}><FilePlus size={16} className="mr-2" />New invoice</Button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-3">
          <span className="sr-only">Invoice status</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-card text-foreground text-lg font-semibold border border-border rounded-lg px-3 py-2">
            <option value="ALL">All invoices</option><option value="PENDING">Awaiting review</option><option value="APPROVED">Approved</option><option value="PAID">Paid</option><option value="REJECTED">Rejected</option>
          </select>
          <span className="text-xs text-muted-foreground">{filteredInvoices.length} records</span>
        </label>
        <button type="button" onClick={() => setShowSummary(value => !value)} className="text-xs text-muted-foreground hover:text-foreground">{showSummary ? 'Hide summary' : 'Show summary'}</button>
      </div>

      {showSummary && !error && <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl bg-muted/30 border border-border overflow-hidden">
        {[
          { key: 'ALL', label: 'Total invoice value', count: kpis.total, value: kpis.totalVal },
          { key: 'PENDING', label: 'Awaiting review', count: kpis.pending, value: invoices.filter(inv => ['submitted', 'under review'].includes(String(inv.status).toLowerCase())).reduce((sum, inv) => sum + (Number(inv.invoice_total) || 0), 0) },
          { key: 'APPROVED', label: 'Approved invoice value', count: kpis.approved, value: kpis.approvedVal },
          { key: 'PAID', label: 'Marked paid', count: kpis.paid, value: kpis.paidVal },
        ].map(item => <button key={item.key} type="button" onClick={() => setStatusFilter(item.key)} aria-pressed={statusFilter === item.key} className={`text-left p-5 border-r border-border last:border-r-0 hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${statusFilter === item.key ? 'bg-muted/60' : ''}`}>
          <span className="block text-xs text-muted-foreground">{item.label}</span>
          <span className="block mt-2 text-xl font-semibold tabular-nums text-foreground">{loading ? '—' : formatCurrency(item.value)}</span>
          <span className="block text-xs text-muted-foreground mt-1">{loading ? 'Loading…' : `${item.count} invoices`}</span>
        </button>)}
      </div>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <Input aria-label="Search invoices" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice number, vendor or PO…" className="pl-9 h-10" />
        </div>
        <div className="w-[210px] shrink-0">
          <SearchableVendorSelect
            vendors={allAvailableVendors}
            value={selectedVendorFilter}
            onChange={(val) => setSelectedVendorFilter(val)}
            placeholder="All Vendors (Filter)"
          />
        </div>
        <select aria-label="Invoice source" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm">
          <option value="ALL">All sources</option><option value="vendor_portal">Vendor portal</option><option value="internal_upload">Internal upload</option>
        </select>
        <select aria-label="Invoice view" value={activeViewMode} onChange={e => setActiveViewMode(e.target.value)} className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm">
          <option value="flat">Invoice list</option><option value="vendor">Group by vendor</option><option value="credit_notes">Credit Notes ({creditNotesList.length})</option>
        </select>
        <select aria-label="Sort invoices" value={invoiceSort} onChange={e => setInvoiceSort(e.target.value)} className="h-10 rounded-lg border border-border bg-card text-foreground px-3 text-sm">
          <option value="date_desc">Newest invoice first</option><option value="date_asc">Oldest invoice first</option><option value="amount_desc">Highest amount first</option><option value="vendor">Vendor A–Z</option>
        </select>
        {(search || statusFilter !== 'ALL' || sourceFilter !== 'ALL' || selectedVendorFilter) && <button type="button" className="text-xs text-blue-600 dark:text-blue-400" onClick={() => { setSearch(''); setStatusFilter('ALL'); setSourceFilter('ALL'); setQuickFilter('ALL'); setSelectedVendorFilter(''); }}>Clear filters</button>}
      </div>

      {/* ── 4. Main Views Content ── */}
      {loading ? (
        <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-primary shadow-inner">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <span className="font-semibold text-foreground">Loading invoices ledger...</span>
        </div>
      ) : error ? (
        <div className="p-6 border border-rose-500/30 bg-rose-500/10 rounded-lg text-center text-xs text-rose-600 dark:text-rose-400 font-semibold">
          {error}
          <button type="button" onClick={fetchInvoices} className="block mx-auto mt-3 underline">Retry loading invoices</button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-20 px-6 border border-border border-dashed rounded-lg text-center flex flex-col items-center justify-center max-w-md mx-auto bg-card">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-primary flex items-center justify-center mb-3 shadow-inner">
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
              <div key={group.key} className="border border-border rounded-lg overflow-hidden bg-card shadow-xs transition-all">
                {/* Vendor Group Header Card */}
                <div 
                  onClick={() => toggleVendorExpanded(group.key)}
                  className="p-4 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 cursor-pointer select-none border-b border-border"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-700 dark:text-primary border border-amber-500/30 font-bold text-sm flex items-center justify-center shrink-0 shadow-inner">
                      {getVendorInitials(group.vendorName)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {group.vendorName}
                        {group.vendorCode !== 'N/A' && (
                          <span className="text-[11px] text-muted-foreground font-mono font-medium bg-muted px-2 py-0.5 rounded-md border border-border">
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
                          <TableHead className="w-10 text-center py-3 px-2 font-semibold text-muted-foreground">
                            <span className="sr-only">Select</span>
                          </TableHead>
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
                          const isSelected = selectedInvoiceIds.includes(inv.invoice_id);

                          return (
                            <TableRow key={inv.invoice_id} className={`border-b border-border/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-amber-500/5' : ''}`}>
                              <TableCell className="w-10 text-center py-3 px-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectInvoice(inv.invoice_id)}
                                  className="rounded border-border text-amber-600 focus:ring-amber-500/30 cursor-pointer"
                                />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {getEnteredDateString(inv)}
                              </TableCell>
                              <TableCell className="font-bold text-xs font-mono text-foreground">
                                <button 
                                  onClick={() => setInspectInvoice(inv)}
                                  className="hover:text-amber-600 dark:hover:text-primary hover:underline text-left font-mono inline-flex items-center gap-1"
                                >
                                  {inv.invoice_number}
                                  <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-60" />
                                </button>
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground font-medium">
                                <span className="bg-muted px-2 py-0.5 rounded border border-border">
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

                                  <button
                                    type="button"
                                    onClick={() => handleDownloadAttachment(inv.invoice_id, inv.file_name || `invoice-${inv.invoice_id}.pdf`)}
                                    disabled={downloadingId === inv.invoice_id}
                                    className="inline-flex items-center text-xs text-amber-600 dark:text-primary hover:underline p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50"
                                    title="Download Invoice PDF"
                                  >
                                    <Download className={`w-3.5 h-3.5 ${downloadingId === inv.invoice_id ? 'animate-pulse' : ''}`} />
                                  </button>

                                  {(String(inv.status).toLowerCase() === 'submitted' || String(inv.status).toLowerCase() === 'under review') && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => { setSelectedInvoice(inv); setStatusAction('Approved'); }}
                                        className="inline-flex items-center text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-1 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors cursor-pointer shadow-xs"
                                      >
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setSelectedInvoice(inv); setStatusAction('Rejected'); }}
                                        className="inline-flex items-center text-[11px] text-rose-700 dark:text-rose-400 font-semibold px-2 py-1 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer shadow-xs"
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
                                    onClick={() => handleOpenEditModal(inv)}
                                    className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Invoice"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
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

      ) : activeViewMode === 'credit_notes' ? (

        /* ── CREDIT NOTES (CN) VIEW ── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl bg-muted/30 border border-border p-4">
            <div>
              <span className="block text-xs text-muted-foreground">Total Credit Notes</span>
              <span className="block mt-1 text-xl font-bold font-mono text-foreground">{filteredCreditNotes.length} records</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Total Credit Adjustment</span>
              <span className="block mt-1 text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {formatCurrency(totalCnAmount)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Average Adjustment</span>
              <span className="block mt-1 text-xl font-bold font-mono text-foreground">
                {filteredCreditNotes.length ? formatCurrency(totalCnAmount / filteredCreditNotes.length) : '₹0'}
              </span>
            </div>
          </div>

          {cnLoading ? (
            <div className="py-20 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span>Loading Credit Notes ledger...</span>
            </div>
          ) : filteredCreditNotes.length === 0 ? (
            <div className="p-12 border border-border border-dashed rounded-xl text-center text-xs text-muted-foreground space-y-3">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground text-sm">No Credit Notes found</p>
              <p>Record a credit note against any PO or invoice to log rate adjustments, damages, or returns.</p>
              <Button size="sm" onClick={() => setCnModalOpen(true)} className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                <Receipt size={14} className="mr-1.5" /> + Record Credit Note
              </Button>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap text-center">S.No</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap">CN Number</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap">Date</th>
                      <th className="px-4 py-3.5 font-bold text-muted-foreground min-w-[180px]">Vendor</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap">PO #</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap">Linked Invoice</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap">Reason</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground text-right whitespace-nowrap">Subtotal</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground text-right whitespace-nowrap">Tax</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground text-right whitespace-nowrap">Total CN Value</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground text-center whitespace-nowrap">Doc</th>
                      <th className="px-3 py-3.5 font-bold text-muted-foreground text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans">
                    {filteredCreditNotes.map((cn, idx) => (
                      <tr key={cn.cn_id || cn.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3.5 text-center text-xs text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="px-3 py-3.5 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {cn.cn_number}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-xs text-muted-foreground font-mono">
                          {cn.cn_date ? formatDate(cn.cn_date) : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-foreground text-xs">{cn.vendor_name}</div>
                          {cn.vendor_code && <span className="text-[10px] text-muted-foreground font-mono">{cn.vendor_code}</span>}
                        </td>
                        <td className="px-3 py-3.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                          {cn.po_no}
                        </td>
                        <td className="px-3 py-3.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {cn.invoice_number || 'General / None'}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold">
                            {cn.reason || 'Adjustment'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3.5 text-right text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatCurrency(cn.subtotal || 0)}
                        </td>
                        <td className="px-3 py-3.5 text-right text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatCurrency(cn.tax_amount || 0)}
                        </td>
                        <td className="px-3 py-3.5 text-right text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {formatCurrency(cn.total_amount)}
                        </td>
                        <td className="px-3 py-3.5 text-center whitespace-nowrap">
                          {cn.file_url ? (
                            <a
                              href={cn.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline p-1.5 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                              title="View Document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setCnToDelete(cn)}
                            className="inline-flex items-center text-xs text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Credit Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      ) : (

        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-3 py-3.5 w-10 text-center">
                    <input 
                      type="checkbox" 
                      aria-label="Select all filtered invoices" 
                      checked={allFilteredSelected} 
                      onChange={e => handleSelectAllInvoices(e.target.checked)} 
                      className="rounded border-border text-amber-600 focus:ring-amber-500/30 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap">DATE</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground whitespace-nowrap">BILL#</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground whitespace-nowrap">REFERENCE NUMBER</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground min-w-[180px]">VENDOR NAME</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground whitespace-nowrap">STATUS</th>
                  <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap">DUE DATE</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground text-right whitespace-nowrap">AMOUNT</th>
                  <th className="px-3 py-3.5 font-bold text-muted-foreground text-right whitespace-nowrap">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedInvoices.map((inv, idx) => {
                  const sNo = ((safeInvoicePage - 1) * invoicePageSize) + idx + 1;
                  const isSelected = selectedInvoiceIds.includes(inv.invoice_id);

                  return (
                    <tr 
                      key={inv.invoice_id} 
                      className={`hover:bg-muted/40 transition-colors ${isSelected ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          aria-label={`Select invoice ${inv.invoice_number}`} 
                          checked={isSelected} 
                          onChange={() => handleToggleSelectInvoice(inv.invoice_id)} 
                          className="rounded border-border text-amber-600 focus:ring-amber-500/30 cursor-pointer"
                        />
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap text-xs text-muted-foreground">{inv.invoice_date ? formatDate(inv.invoice_date) : '—'}</td>
                      <td className="px-4 py-3.5"><button type="button" onClick={() => { setDrawerTab('overview'); setInspectInvoice(inv); }} className="font-semibold text-sm text-blue-600 dark:text-blue-400 hover:underline">{inv.invoice_number || 'Unnumbered invoice'}</button></td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{inv.po_no || '—'}</td>
                      <td className="px-4 py-3.5"><span className="block text-sm font-medium">{inv.vendor_name || 'Unassigned vendor'}</span><span className="text-xs text-muted-foreground">{inv.project}</span></td>
                      <td className="px-4 py-3.5">{getStatusBadge(inv.status)}</td>
                      <td className="px-3 py-3.5 text-xs">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{formatCurrency(inv.invoice_total)}</td>
                      <td className="px-3 py-3.5 text-right"><button type="button" onClick={() => { setDrawerTab('overview'); setInspectInvoice(inv); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View / review</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <span>{(safeInvoicePage - 1) * invoicePageSize + 1}–{Math.min(safeInvoicePage * invoicePageSize, filteredInvoices.length)} of {filteredInvoices.length} invoices · select-all includes all filtered results</span>
            <div className="flex items-center gap-3">
              <select aria-label="Invoices per page" value={invoicePageSize} onChange={e => setInvoicePageSize(Number(e.target.value))} className="rounded border border-border bg-card text-foreground px-2 py-1"><option value={25}>25 per page</option><option value={50}>50 per page</option><option value={100}>100 per page</option></select>
              <button type="button" disabled={safeInvoicePage === 1} onClick={() => setInvoicePage(safeInvoicePage - 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Previous</button>
              <span>{safeInvoicePage} / {invoicePageCount}</span>
              <button type="button" disabled={safeInvoicePage >= invoicePageCount} onClick={() => setInvoicePage(safeInvoicePage + 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </footer>
        </div>
      )}

      {/* ── 5. Sticky Floating Multi-Select Action Ribbon ── */}
      {selectedInvoiceIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 animate-slide-up">
          <div className="bg-slate-900/95 dark:bg-slate-900/95 border border-amber-500/50 shadow-2xl backdrop-blur-xl rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 shadow-inner">
                <Sparkles className="w-3.5 h-3.5" />
                {selectedInvoiceIds.length} Selected
              </span>
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Selected Gross</span>
                <strong className="text-amber-400 font-mono font-bold">{formatCurrency(selectedTotalAmount)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {pendingSelectedCount > 0 && (
                <>
                  <Button
                    onClick={handleBulkApproveSelected}
                    disabled={bulkActionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve ({pendingSelectedCount})
                  </Button>

                  <Button
                    onClick={() => setBulkRejectModalOpen(true)}
                    disabled={bulkActionLoading}
                    className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject ({pendingSelectedCount})
                  </Button>
                </>
              )}

              <Button
                onClick={() => setBulkDeleteModalOpen(true)}
                disabled={bulkActionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedInvoiceIds.length})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExportSelected}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs h-9 px-3.5 rounded-xl border-slate-700"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
              </Button>

              <button
                onClick={() => setSelectedInvoiceIds([])}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Zoho Books Style Bill Inspector Drawer / Modal ── */}
      {inspectInvoice && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-5xl bg-background border-l border-border h-full flex flex-col shadow-2xl animate-slide-left overflow-hidden">
            
            {/* Top Bar (Matches Screenshot 2 & 3) */}
            <div className="px-6 py-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold font-mono text-foreground tracking-tight">
                  {inspectInvoice.invoice_number || 'Unnumbered Bill'}
                </h2>
                {(() => {
                  const ov = getInvoiceOverdueInfo(inspectInvoice);
                  if (ov.type === 'overdue') {
                    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase font-mono">{ov.label}</span>;
                  }
                  if (ov.type === 'paid') {
                    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">PAID</span>;
                  }
                  if (ov.type === 'approved') {
                    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-mono">APPROVED</span>;
                  }
                  if (String(inspectInvoice.status).toLowerCase() === 'rejected') {
                    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-mono">REJECTED</span>;
                  }
                  return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">AWAITING REVIEW</span>;
                })()}
              </div>

              {/* Action Buttons: Edit, PDF/Print, Record Payment, Attachments, Close */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEditModal(inspectInvoice)}
                  className="h-8 text-xs font-semibold rounded-lg hover:bg-muted"
                >
                  <Edit2 size={13} className="mr-1.5 text-muted-foreground" /> Edit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getAttachmentUrl(inspectInvoice.invoice_id, 'inline'), '_blank')}
                  className="h-8 text-xs font-semibold rounded-lg hover:bg-muted"
                >
                  <Printer size={13} className="mr-1.5 text-muted-foreground" /> PDF/Print
                </Button>

                {String(inspectInvoice.status).toLowerCase() !== 'paid' && (
                  <Button
                    size="sm"
                    onClick={() => handleCreatePaymentRequest(inspectInvoice)}
                    className="h-8 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    <CreditCard size={13} className="mr-1.5" /> Record Payment
                  </Button>
                )}

                {/* Attachments Dropdown Popover (Matching Screenshot 3) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAttachmentsPopoverOpen(!attachmentsPopoverOpen)}
                    className="h-8 px-2.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                    title="View & manage attachments"
                  >
                    <Paperclip size={14} />
                    <span className="font-mono">{(inspectFullData?.attachments || []).length || (inspectInvoice.file_name ? 1 : 0)}</span>
                  </button>

                  {attachmentsPopoverOpen && (
                    <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 p-4 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-bold text-foreground">
                          Attachments ({(inspectFullData?.attachments || []).length || (inspectInvoice.file_name ? 1 : 0)})
                        </span>
                        <button onClick={() => setAttachmentsPopoverOpen(false)} className="text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(inspectFullData?.attachments && inspectFullData.attachments.length > 0) ? (
                          inspectFullData.attachments.map((att, attIdx) => (
                            <div key={att.id || attIdx} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/70 border border-border text-xs transition-colors">
                              <div className="flex items-center gap-2 truncate">
                                <FileText size={16} className="text-rose-500 shrink-0" />
                                <div className="truncate">
                                  <a
                                    href={getAttachmentUrl(inspectInvoice.invoice_id, 'inline')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-foreground hover:underline truncate block"
                                  >
                                    {att.file_name || `Invoice-Doc-${attIdx + 1}.pdf`}
                                  </a>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : 'Attached file'}
                                  </span>
                                </div>
                              </div>
                              <a
                                href={getAttachmentUrl(inspectInvoice.invoice_id, 'attachment')}
                                download
                                className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                                title="Download Document"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          ))
                        ) : inspectInvoice.file_name ? (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/70 border border-border text-xs transition-colors">
                            <div className="flex items-center gap-2 truncate">
                              <FileText size={16} className="text-rose-500 shrink-0" />
                              <div className="truncate">
                                <a
                                  href={getAttachmentUrl(inspectInvoice.invoice_id, 'inline')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-foreground hover:underline truncate block"
                                >
                                  {inspectInvoice.file_name}
                                </a>
                                <span className="text-[10px] text-muted-foreground font-mono">Primary document</span>
                              </div>
                            </div>
                            <a
                              href={getAttachmentUrl(inspectInvoice.invoice_id, 'attachment')}
                              download
                              className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                              title="Download Document"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic py-2">No attachments found.</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border">
                        <label className="w-full py-2 px-3 border border-border border-dashed rounded-lg flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer transition-colors font-medium">
                          <UploadCloud size={14} />
                          <span>Upload your Files</span>
                          <input type="file" accept="application/pdf,image/*" onChange={handleUploadAdditionalAttachment} className="hidden" />
                        </label>
                        <span className="text-[10px] text-muted-foreground block text-center mt-1">You can upload a maximum of 5 files, 10MB each</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setInspectInvoice(null)}
                  aria-label="Close invoice details"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-muted/20">
              
              {/* WHAT'S NEXT? Banner (Matching Screenshot 2) */}
              <div className="p-3.5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>
                    <strong className="text-purple-700 dark:text-purple-300">WHAT'S NEXT?</strong>{' '}
                    {String(inspectInvoice.status).toLowerCase() === 'paid'
                      ? 'Payment for this bill has been recorded and settled in full.'
                      : getInvoiceOverdueInfo(inspectInvoice).isOverdue
                      ? 'Payment for this bill is overdue. You can record the payment for this bill if paid.'
                      : (String(inspectInvoice.status).toLowerCase() === 'submitted' || String(inspectInvoice.status).toLowerCase() === 'under review')
                      ? 'This bill is awaiting internal review and approval.'
                      : 'Bill approved. Ready for payment scheduling.'}
                  </span>
                </div>
                {String(inspectInvoice.status).toLowerCase() !== 'paid' && (
                  <Button
                    size="sm"
                    onClick={() => handleCreatePaymentRequest(inspectInvoice)}
                    className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg px-3 shrink-0 shadow-xs"
                  >
                    Record Payment
                  </Button>
                )}
              </div>

              {/* Purchase Orders Link Accordion */}
              {inspectInvoice.po_no && (
                <div className="p-3 bg-card border border-border rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-foreground">Purchase Orders</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold font-mono text-[11px] border border-blue-500/20">
                      1
                    </span>
                    <span className="font-mono font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                      {inspectInvoice.po_no}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-4">
                    <span>
                      PO Value: <strong className="text-foreground font-mono font-semibold">{formatCurrency(inspectFullData?.po?.revised_po_value || inspectFullData?.po?.po_value || inspectPOData?.po_value || 0)}</strong>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInspectInvoice(null);
                        setActiveView('purchase_orders');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('lx:open-po', { detail: { poNo: inspectInvoice.po_no } }));
                        }, 100);
                      }}
                      className="h-6 text-[11px] text-blue-600 dark:text-blue-400 hover:underline p-0"
                    >
                      View PO Details &rarr;
                    </Button>
                  </div>
                </div>
              )}

              {/* View Switch: Show PDF View Toggle (Screenshot 2 & 3) */}
              <div className="flex items-center justify-end gap-2.5 py-1">
                <span className="text-xs font-semibold text-foreground">Show PDF View</span>
                <button
                  type="button"
                  onClick={() => setShowPdfView(!showPdfView)}
                  aria-pressed={showPdfView}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${showPdfView ? 'bg-blue-600' : 'bg-muted border border-border'}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform block absolute top-1 ${showPdfView ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Document Rendering */}
              {showPdfView ? (
                /* LIVE PDF EMBED VIEW */
                <div className="h-[620px] rounded-xl overflow-hidden border border-border bg-slate-900 flex flex-col shadow-inner">
                  <div className="p-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-mono">Live PDF Preview — #{inspectInvoice.invoice_number}</span>
                    <button
                      type="button"
                      onClick={() => window.open(getAttachmentUrl(inspectInvoice.invoice_id, 'inline'), '_blank', 'width=900,height=1000')}
                      className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Side Window
                    </button>
                  </div>
                  <iframe
                    src={getAttachmentUrl(inspectInvoice.invoice_id, 'inline')}
                    className="w-full h-full rounded-b-xl"
                    title="Invoice PDF Preview"
                  />
                </div>
              ) : (
                /* ZOHO BOOKS BILL TEMPLATE (Screenshot 2 & 3) */
                <div className="relative bg-card border border-border rounded-xl p-8 shadow-sm space-y-6 overflow-hidden">
                  
                  {/* Slanted Ribbon in Corner (Zoho style) */}
                  {(() => {
                    const ov = getInvoiceOverdueInfo(inspectInvoice);
                    let color = 'from-amber-500 to-amber-600';
                    let text = 'Overdue';
                    if (ov.type === 'paid') {
                      color = 'from-emerald-500 to-emerald-600';
                      text = 'Paid';
                    } else if (ov.type === 'approved') {
                      color = 'from-blue-500 to-blue-600';
                      text = 'Approved';
                    } else if (String(inspectInvoice.status).toLowerCase() === 'rejected') {
                      color = 'from-rose-500 to-rose-600';
                      text = 'Rejected';
                    }
                    return (
                      <div className="absolute -top-7 -left-7 w-28 h-28 pointer-events-none overflow-hidden">
                        <div className={`bg-gradient-to-r ${color} text-white font-bold text-[10px] uppercase py-1 text-center shadow-md transform -rotate-45 translate-y-9 -translate-x-2 w-32`}>
                          {text}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Header: Luxeworx Atelier Logo & Address + Bill Title */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b border-border pb-6 pt-2">
                    <div className="space-y-1.5 pl-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-serif font-bold text-amber-600 text-sm">
                          LA
                        </div>
                        <span className="font-serif tracking-widest text-xs uppercase font-bold text-amber-700 dark:text-amber-400">
                          LUXEWORX ATELIER
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-foreground uppercase tracking-tight">
                        LUXEWORX ATELIER INTERIORS PRIVATE LIMITED
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        8th Floor, Magnum Towers-1<br />
                        Golf Course Ext Rd<br />
                        Gurugram Haryana 122001<br />
                        <span className="font-mono text-[11px] font-semibold text-foreground">GSTIN 06AAGCL1112M1ZP</span>
                      </p>
                    </div>

                    <div className="text-right sm:pr-2">
                      <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">Bill</h1>
                      <p className="font-mono font-bold text-sm text-muted-foreground mt-1">
                        Bill# {inspectInvoice.invoice_number}
                      </p>
                      <div className="mt-3">
                        <span className="text-[11px] text-muted-foreground block font-medium">Balance Due</span>
                        <strong className="text-2xl font-bold font-mono text-foreground">
                          {String(inspectInvoice.status).toLowerCase() === 'paid' ? '₹0.00' : formatCurrency(inspectInvoice.invoice_total)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Bill Info Grid: Bill From, Order Number, Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-border pb-6">
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider block">Bill From</span>
                      <strong className="text-sm font-bold text-blue-600 dark:text-blue-400 block">
                        {inspectInvoice.vendor_name}
                      </strong>
                      {inspectInvoice.vendor_code && (
                        <p className="font-mono text-[11px] text-muted-foreground">Code: {inspectInvoice.vendor_code}</p>
                      )}
                      {inspectFullData?.vendor?.address && (
                        <p className="text-muted-foreground leading-relaxed">{inspectFullData.vendor.address}</p>
                      )}
                      {inspectFullData?.vendor?.gstin && (
                        <p className="font-mono text-muted-foreground">GSTIN: {inspectFullData.vendor.gstin}</p>
                      )}
                    </div>

                    <div className="space-y-2 sm:text-right">
                      <div className="flex justify-between sm:justify-end gap-6">
                        <span className="text-muted-foreground">Order Number :</span>
                        <strong className="font-mono text-foreground font-bold">{inspectInvoice.po_no || '—'}</strong>
                      </div>
                      <div className="flex justify-between sm:justify-end gap-6">
                        <span className="text-muted-foreground">Bill Date :</span>
                        <strong className="font-mono text-foreground font-bold">{inspectInvoice.invoice_date ? formatDate(inspectInvoice.invoice_date) : '—'}</strong>
                      </div>
                      <div className="flex justify-between sm:justify-end gap-6">
                        <span className="text-muted-foreground">DueDate :</span>
                        <strong className="font-mono text-foreground font-bold">
                          {(() => {
                            const d = getInvoiceDueDate(inspectInvoice);
                            return d ? formatDate(d) : (inspectInvoice.invoice_date ? formatDate(inspectInvoice.invoice_date) : '—');
                          })()}
                        </strong>
                      </div>
                      {inspectInvoice.project && (
                        <div className="flex justify-between sm:justify-end gap-6">
                          <span className="text-muted-foreground">Project :</span>
                          <span className="font-medium text-foreground">{inspectInvoice.project}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Itemized Line Items Table (Actual Item Values from po_items) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Itemized Line Items
                      </h4>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {(inspectFullData?.items || []).length > 0 ? `${inspectFullData.items.length} line items as per Purchase Order` : 'Invoice Line Items'}
                      </span>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                          <tr>
                            <th className="px-3 py-2.5 w-10 text-center">#</th>
                            <th className="px-3 py-2.5 min-w-[220px]">Item & Description</th>
                            <th className="px-3 py-2.5 whitespace-nowrap text-center">HSN/SAC</th>
                            <th className="px-3 py-2.5 text-right whitespace-nowrap">Qty</th>
                            <th className="px-3 py-2.5 text-right whitespace-nowrap">Rate</th>
                            <th className="px-3 py-2.5 text-right whitespace-nowrap">Tax %</th>
                            <th className="px-3 py-2.5 text-right whitespace-nowrap">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-sans">
                          {(inspectFullData?.items && inspectFullData.items.length > 0) ? (
                            inspectFullData.items.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                                <td className="px-3 py-2.5 text-center text-muted-foreground font-mono">{idx + 1}</td>
                                <td className="px-3 py-2.5">
                                  <span className="font-semibold text-foreground block leading-snug">{item.description}</span>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">{item.hsn_sac || '—'}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-medium whitespace-nowrap">
                                  {item.qty} {item.unit || ''}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                                  {formatCurrency(item.rate)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground whitespace-nowrap">
                                  {item.tax_pct ? `${item.tax_pct}%` : '18%'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                                  {formatCurrency(item.amount)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            /* Fallback line item */
                            <tr className="hover:bg-muted/20">
                              <td className="px-3 py-2.5 text-center text-muted-foreground font-mono">1</td>
                              <td className="px-3 py-2.5 font-semibold text-foreground">
                                Goods / Services rendered against Bill #{inspectInvoice.invoice_number}
                              </td>
                              <td className="px-3 py-2.5 text-center text-muted-foreground font-mono">—</td>
                              <td className="px-3 py-2.5 text-right font-mono">1 Lot</td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                {formatCurrency(inspectInvoice.subtotal || (Number(inspectInvoice.invoice_total || 0) - Number(inspectInvoice.tax_amount || 0)))}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">18%</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                                {formatCurrency(inspectInvoice.subtotal || (Number(inspectInvoice.invoice_total || 0) - Number(inspectInvoice.tax_amount || 0)))}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals & Tax Calculation Breakdown */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-border">
                    <div className="space-y-2 max-w-sm text-xs">
                      {inspectInvoice.remarks && (
                        <div>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Notes / Remarks</span>
                          <p className="text-foreground mt-0.5 leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border">
                            {inspectInvoice.remarks}
                          </p>
                        </div>
                      )}
                      {inspectInvoice.rejection_reason && (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                          <span className="font-bold text-[11px] uppercase tracking-wider block">Rejection Reason</span>
                          <p className="mt-0.5 leading-relaxed">{inspectInvoice.rejection_reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="w-full sm:w-72 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Subtotal</span>
                        <strong className="font-mono text-foreground">
                          {formatCurrency(inspectInvoice.subtotal || (Number(inspectInvoice.invoice_total || 0) - Number(inspectInvoice.tax_amount || 0)))}
                        </strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">GST / Tax Amount</span>
                        <strong className="font-mono text-foreground">
                          {formatCurrency(inspectInvoice.tax_amount || 0)}
                        </strong>
                      </div>
                      <div className="flex justify-between py-2 border-b-2 border-border text-sm">
                        <span className="font-bold text-foreground">Total Bill Value</span>
                        <strong className="font-mono font-bold text-foreground">
                          {formatCurrency(inspectInvoice.invoice_total)}
                        </strong>
                      </div>
                      <div className="flex justify-between py-2 bg-muted/40 p-2.5 rounded-lg border border-border">
                        <span className="font-bold text-foreground">Balance Due</span>
                        <strong className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {String(inspectInvoice.status).toLowerCase() === 'paid' ? '₹0.00' : formatCurrency(inspectInvoice.invoice_total)}
                        </strong>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setInvoiceToDelete(inspectInvoice)}
                  className="text-xs rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 size={13} className="mr-1.5" /> Delete Bill
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenEditModal(inspectInvoice)}
                  className="text-xs rounded-lg font-semibold"
                >
                  <Edit2 size={13} className="mr-1.5" /> Edit Bill
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {(String(inspectInvoice.status).toLowerCase() === 'submitted' || String(inspectInvoice.status).toLowerCase() === 'under review') && (
                  <>
                    <Button
                      onClick={() => { setSelectedInvoice(inspectInvoice); setStatusAction('Rejected'); }}
                      variant="outline"
                      className="text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold rounded-lg"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                    <Button
                      onClick={() => { setSelectedInvoice(inspectInvoice); setStatusAction('Approved'); }}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Bill
                    </Button>
                  </>
                )}

                {String(inspectInvoice.status).toLowerCase() !== 'paid' && (
                  <Button
                    onClick={() => handleCreatePaymentRequest(inspectInvoice)}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1" /> Record Payment
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
            <div className="text-xs text-foreground space-y-1 bg-muted/40 p-4 rounded-lg border border-border">
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
        <Dialog open={true} onClose={() => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl); setFilePreviewUrl(null); setUploadModalOpen(false); setUploadVendorFilter(''); setOcrSuccess(false); }} title="Upload Internal Invoice" maxWidth={filePreviewUrl ? "max-w-6xl" : "max-w-lg"}>
          <form onSubmit={handleManualUploadSubmit} className="space-y-4">
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
                  <div className="flex-1 min-h-[540px] w-full rounded-xl overflow-hidden border border-border bg-neutral-900 flex items-center justify-center">
                    {selectedFile?.type === 'application/pdf' ? (
                      <iframe
                        src={filePreviewUrl}
                        title="Invoice Document Preview"
                        className="w-full h-full min-h-[540px] rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[540px] overflow-auto flex items-center justify-center p-2">
                        <img
                          src={filePreviewUrl}
                          alt="Invoice Preview"
                          className="max-w-full max-h-[520px] object-contain rounded-lg shadow-md"
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
            {/* ── 1. OCR Document Dropzone ── */}
            <div className="bg-muted/30 border border-border/80 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs text-foreground font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>Invoice Document (Instant OCR Auto-Fill) *</span>
                </label>
                {ocrSuccess && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ✓ Auto-filled by OCR
                  </span>
                )}
              </div>

              <div 
                onDragEnter={handleDrag} 
                onDragLeave={handleDrag} 
                onDragOver={handleDrag} 
                onDrop={(e) => {
                  handleDrop(e);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const dropped = e.dataTransfer.files[0];
                    setSelectedFile(dropped);
                    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
                    setFilePreviewUrl(URL.createObjectURL(dropped));
                    handleAiAutoFill(dropped);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                  dragActive ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-border/80'
                }`}
              >
                <UploadCloud className="w-7 h-7 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-foreground">Upload Invoice PDF or Image</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Drag & drop or browse — OCR will auto-read numbers & amounts</p>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  required={!selectedFile}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setSelectedFile(f);
                    if (f) {
                      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
                      setFilePreviewUrl(URL.createObjectURL(f));
                      handleAiAutoFill(f);
                    }
                  }}
                  className="mt-2 text-xs text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-600 dark:file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
                />

                {selectedFile && (
                  <div className="mt-2.5 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1.5 truncate max-w-[240px]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleAiAutoFill(selectedFile)}
                      disabled={aiLoading}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 px-3 py-1 rounded-xl shadow-xs cursor-pointer ml-auto"
                    >
                      {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {aiLoading ? 'Reading with OCR...' : '⚡ Re-scan with OCR'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground block mb-1 font-bold">
                Vendor Partner (Type to search)
              </label>
              <SearchableVendorSelect
                vendors={allAvailableVendors}
                value={uploadVendorFilter}
                onChange={(val, vendorObj) => {
                  setUploadVendorFilter(val);
                  if (val && uploadForm.poNo) {
                    const currentPO = posList.find(p => String(p.po_no || p.poNo) === String(uploadForm.poNo));
                    if (currentPO) {
                      const vCode = String(currentPO.vendor_code || currentPO.vendor_key || '').toLowerCase();
                      const vName = String(currentPO.vendor_name || currentPO.vendor || '').toLowerCase();
                      const selectedVal = String(val).toLowerCase();
                      const selName = vendorObj ? String(vendorObj.name || vendorObj.legal_name || '').toLowerCase() : '';
                      const isMatch = (vCode && vCode === selectedVal) || (vName && vName === selectedVal) ||
                                      (selName && vName && (vName.includes(selName) || selName.includes(vName))) ||
                                      (vCode && selectedVal && (vCode.includes(selectedVal) || selectedVal.includes(vCode)));
                      if (!isMatch) {
                        setUploadForm(prev => ({ ...prev, poNo: '' }));
                      }
                    }
                  } else if (val && !uploadForm.poNo) {
                    const vObj = vendorObj || allAvailableVendors.find(v => String(v.code || '').toLowerCase() === String(val).toLowerCase() || String(v.name || '').toLowerCase() === String(val).toLowerCase());
                    const targetCode = vObj ? String(vObj.code || vObj.vendor_code || '').toLowerCase() : '';
                    const targetName = vObj ? String(vObj.name || vObj.legal_name || '').toLowerCase() : '';
                    const vendorPOs = posList.filter(p => {
                      const st = String(p.status || p.approval_status || '').toLowerCase();
                      if (['rejected', 'cancelled', 'canceled'].includes(st)) return false;
                      const pCode = String(p.vendor_code || p.vendor_key || '').toLowerCase();
                      const pName = String(p.vendor_name || p.vendor || '').toLowerCase();
                      return (targetCode && pCode === targetCode) || (targetName && pName === targetName) || (targetName && (pName.includes(targetName) || targetName.includes(pName)));
                    });
                    if (vendorPOs.length === 1) {
                      setUploadForm(prev => ({ ...prev, poNo: vendorPOs[0].po_no || vendorPOs[0].poNo }));
                    }
                  }
                }}
                placeholder="Type vendor name or code to filter..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-foreground font-bold">Select Purchase Order (Open / Approved) *</label>
                {uploadVendorFilter && (
                  <span className="text-[10px] text-muted-foreground">
                    Filtered by vendor ({availableUploadPOs.length} PO{availableUploadPOs.length === 1 ? '' : 's'})
                  </span>
                )}
              </div>
              <select
                required
                value={uploadForm.poNo}
                onChange={(e) => {
                  const selectedVal = e.target.value;
                  setUploadForm(prev => ({ ...prev, poNo: selectedVal }));
                  if (selectedVal) {
                    const matchedPO = posList.find(p => String(p.po_no || p.poNo) === String(selectedVal));
                    if (matchedPO) {
                      const vCode = matchedPO.vendor_code || matchedPO.vendor_key || '';
                      const vName = matchedPO.vendor_name || matchedPO.vendor || '';
                      const foundV = allAvailableVendors.find(v => {
                        const vc = String(v.code || v.vendor_code || '').toLowerCase();
                        const vn = String(v.name || v.legal_name || '').toLowerCase();
                        return (vCode && vc === vCode.toLowerCase()) || (vName && vn === vName.toLowerCase());
                      });
                      const finalV = foundV ? (foundV.code || foundV.name) : (vCode || vName);
                      if (finalV) setUploadVendorFilter(finalV);
                    }
                  }
                }}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 font-medium cursor-pointer shadow-xs"
              >
                <option value="">
                  {availableUploadPOs.length > 0 
                    ? `-- Choose Purchase Order (${availableUploadPOs.length} available) --` 
                    : '-- No open or approved POs found for this vendor --'}
                </option>
                {availableUploadPOs.map(p => {
                  const poStatus = p.approval_status || p.status || 'Open';
                  return (
                    <option key={p.po_no || p.poNo} value={p.po_no || p.poNo}>
                      {p.po_no || p.poNo} — {p.vendor_name || p.vendor} ({formatCurrency(p.po_value || p.poValue)}) [{poStatus}]
                    </option>
                  );
                })}
              </select>

              {selectedPOData && (
                <div className="mt-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <p><span className="text-muted-foreground">Vendor:</span> <strong>{selectedPOData.vendor_name || selectedPOData.vendor}</strong></p>
                  <p><span className="text-muted-foreground">PO Value:</span> <strong className="font-mono">{formatCurrency(selectedPOData.po_value || selectedPOData.poValue)}</strong></p>
                  <p><span className="text-muted-foreground">PO Status:</span> <strong className="uppercase font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">{selectedPOData.approval_status || selectedPOData.status || 'Open'}</strong></p>
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
              <label className="text-xs text-foreground block mb-1 font-bold">Internal Remarks</label>
              <Textarea
                rows={2}
                value={uploadForm.remarks}
                onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
                placeholder="Optional internal notes..."
                className="bg-background border-border text-xs rounded-xl"
              />
            </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl); setFilePreviewUrl(null); setUploadModalOpen(false); setUploadVendorFilter(''); setOcrSuccess(false); }} disabled={uploading} className="text-xs rounded-xl">
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

            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-foreground space-y-1">
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

      {/* ── 9. Bulk Delete Invoices Confirmation Modal ── */}
      {bulkDeleteModalOpen && (
        <Dialog open={true} onClose={() => setBulkDeleteModalOpen(false)} title="Bulk Delete Invoices" maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Bulk Delete {selectedInvoiceIds.length} Invoices</h3>
                <p className="text-xs text-muted-foreground">Permanent deletion of selected invoice records</p>
              </div>
            </div>

            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-foreground space-y-1">
              <p><strong className="text-muted-foreground">Selected Count:</strong> <span className="font-bold text-foreground">{selectedInvoiceIds.length} Invoices</span></p>
              <p><strong className="text-muted-foreground">Total Value:</strong> <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{formatCurrency(selectedTotalAmount)}</span></p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete all {selectedInvoiceIds.length} selected invoices? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setBulkDeleteModalOpen(false)} disabled={bulkActionLoading} className="text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkDeleteSelectedConfirm}
                disabled={bulkActionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 rounded-xl shadow-xs"
              >
                {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {bulkActionLoading ? 'Deleting...' : `Confirm Delete (${selectedInvoiceIds.length})`}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── 10. Bulk Reject Invoices Modal ── */}
      {bulkRejectModalOpen && (
        <Dialog open={true} onClose={() => setBulkRejectModalOpen(false)} title="Bulk Reject Invoices" maxWidth="max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); handleBulkRejectSelectedConfirm(); }} className="space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Reject {pendingSelectedCount} Pending Invoices</h3>
                <p className="text-xs text-muted-foreground">Mark selected invoices as Rejected</p>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border border-border rounded-lg text-xs text-foreground space-y-1">
              <p><strong className="text-muted-foreground">Pending Invoices:</strong> <span className="font-bold text-foreground">{pendingSelectedCount} Invoices</span></p>
              <p><strong className="text-muted-foreground">Gross Value:</strong> <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{formatCurrency(selectedTotalAmount)}</span></p>
            </div>

            <div>
              <label className="text-xs text-foreground font-bold block mb-1">Reason for Rejection *</label>
              <Textarea
                rows={3}
                required
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
                placeholder="Enter rejection remarks (e.g. Invalid PO reference, GST mismatch)..."
                className="bg-background border-border text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setBulkRejectModalOpen(false)} disabled={bulkActionLoading} className="text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bulkActionLoading || !bulkRejectReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 rounded-xl shadow-xs"
              >
                {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                {bulkActionLoading ? 'Rejecting...' : `Confirm Reject (${pendingSelectedCount})`}
              </Button>
            </div>
          </form>
        </Dialog>
      )}


      {/* ── Edit Invoice Modal ── */}
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
          title={`Edit Invoice Details — #${invoiceToEdit.invoice_number}`}
          maxWidth={editFilePreviewUrl ? "max-w-5xl" : "max-w-lg"}
        >
          <form onSubmit={handleEditInvoiceSubmit} className="space-y-4">
            <div className="p-3 bg-muted/30 border border-border rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor:</span>
                <span className="font-bold text-foreground">{invoiceToEdit.vendor_name} ({invoiceToEdit.vendor_code})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PO Number:</span>
                <span className="font-mono font-bold text-foreground">{invoiceToEdit.po_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Status:</span>
                <span className="font-semibold text-foreground">{invoiceToEdit.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">Invoice Number *</label>
                <Input
                  type="text"
                  required
                  value={editForm.invoiceNumber}
                  onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-2026-001"
                  className="bg-background border-border text-xs font-mono rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">Invoice Date *</label>
                <Input
                  type="date"
                  required
                  value={editForm.invoiceDate}
                  onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                  className="bg-background border-border text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">Subtotal (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.subtotal}
                  onChange={(e) => handleEditAmountChange('subtotal', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-mono rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">Tax Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.taxAmount}
                  onChange={(e) => handleEditAmountChange('taxAmount', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-mono rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">Total Amount (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={editForm.invoiceTotal}
                  onChange={(e) => handleEditAmountChange('invoiceTotal', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-bold text-amber-600 dark:text-amber-400 font-mono rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground font-bold block mb-1">Replace Attachment File (Optional)</label>
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
              <label className="text-xs text-foreground font-bold block mb-1">Remarks</label>
              <Textarea
                rows={2}
                value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                placeholder="Optional notes or reason for edit..."
                className="bg-background border-border text-xs rounded-xl"
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
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 rounded-xl px-4 shadow-xs"
              >
                {editSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ── Create Credit Note (CN) Modal ── */}
      {cnModalOpen && (
        <Dialog
          open={true}
          onClose={() => {
            setCnModalOpen(false);
            setCnFile(null);
            setCnVendorFilter('');
          }}
          title="Record Credit Note (CN)"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreateCnSubmit} className="space-y-4">
            {/* Vendor Filter */}
            <div>
              <label className="text-xs text-foreground font-bold block mb-1">Select Vendor (To Filter POs)</label>
              <SearchableVendorSelect
                vendors={allAvailableVendors}
                value={cnVendorFilter}
                onChange={(val) => {
                  setCnVendorFilter(val);
                  // Reset PO and Invoice if vendor changed
                  setCnForm(prev => ({ ...prev, poNo: '', invoiceId: '' }));
                }}
                placeholder="All Vendors (Select to narrow POs)"
              />
            </div>

            {/* Target PO Selection */}
            <div>
              <label className="text-xs text-foreground font-bold block mb-1">Target PO Number *</label>
              <select
                required
                value={cnForm.poNo}
                onChange={(e) => {
                  const selPo = e.target.value;
                  setCnForm(prev => ({ ...prev, poNo: selPo, invoiceId: '' }));
                }}
                className="w-full h-9 rounded-xl border border-border bg-background text-foreground px-3 text-xs"
              >
                <option value="">-- Choose PO --</option>
                {posList
                  .filter(p => !cnVendorFilter || String(p.vendor_name || '').toLowerCase() === cnVendorFilter.toLowerCase())
                  .map(p => (
                    <option key={p.po_no || p.poNo} value={p.po_no || p.poNo}>
                      {p.po_no || p.poNo} — {p.vendor_name || 'Vendor'} (Val: ₹{Number(p.revised_po_value || p.po_value || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
              </select>
            </div>

            {/* Optional Linked Invoice */}
            {cnForm.poNo && (
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">Linked Invoice (Optional)</label>
                <select
                  value={cnForm.invoiceId}
                  onChange={(e) => setCnForm({ ...cnForm, invoiceId: e.target.value })}
                  className="w-full h-9 rounded-xl border border-border bg-background text-foreground px-3 text-xs"
                >
                  <option value="">General Adjustment / No specific invoice</option>
                  {invoices
                    .filter(inv => String(inv.po_no || '').trim().toLowerCase() === String(cnForm.poNo).trim().toLowerCase())
                    .map(inv => (
                      <option key={inv.invoice_id} value={inv.invoice_id}>
                        Invoice #{inv.invoice_number} — ₹{Number(inv.invoice_total || 0).toLocaleString('en-IN')} ({inv.status})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">Credit Note # *</label>
                <Input
                  type="text"
                  required
                  value={cnForm.cnNumber}
                  onChange={(e) => setCnForm({ ...cnForm, cnNumber: e.target.value })}
                  placeholder="e.g. CN-2026-001"
                  className="bg-background border-border text-xs font-mono rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">CN Date *</label>
                <Input
                  type="date"
                  required
                  value={cnForm.cnDate}
                  onChange={(e) => setCnForm({ ...cnForm, cnDate: e.target.value })}
                  className="bg-background border-border text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground font-bold block mb-1">Reason for Credit Note *</label>
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
                <label className="text-xs text-foreground font-bold block mb-1">Subtotal (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cnForm.subtotal}
                  onChange={(e) => handleCnAmountChange('subtotal', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-mono rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">Tax (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cnForm.taxAmount}
                  onChange={(e) => handleCnAmountChange('taxAmount', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-mono rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-foreground font-bold block mb-1">Total CN (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={cnForm.totalAmount}
                  onChange={(e) => handleCnAmountChange('totalAmount', e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-foreground font-bold block mb-1">Credit Note Document (PDF / Image)</label>
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
              <label className="text-xs text-foreground font-bold block mb-1">Remarks</label>
              <Textarea
                rows={2}
                value={cnForm.remarks}
                onChange={(e) => setCnForm({ ...cnForm, remarks: e.target.value })}
                placeholder="Optional adjustment notes..."
                className="bg-background border-border text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCnModalOpen(false);
                  setCnFile(null);
                  setCnVendorFilter('');
                }}
                disabled={cnSubmitting}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={cnSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 rounded-xl px-4 shadow-xs"
              >
                {cnSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                {cnSubmitting ? 'Recording CN...' : 'Record Credit Note'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ── Delete Credit Note Modal ── */}
      {cnToDelete && (
        <Dialog open={true} onClose={() => setCnToDelete(null)} title="Delete Credit Note" maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Delete Credit Note #{cnToDelete.cn_number}?</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  PO: {cnToDelete.po_no} | Value: {formatCurrency(cnToDelete.total_amount)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this credit note? This will restore the vendor balance and remove all associated attachments.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setCnToDelete(null)} disabled={cnDeleting} className="text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteCnConfirm}
                disabled={cnDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 rounded-xl shadow-xs"
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
