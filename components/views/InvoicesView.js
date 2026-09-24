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
import SearchableVendorSelect from '../ui/SearchableVendorSelect';

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
      { label: 'S.No', key: 's_no', formatter: (v, r, idx) => idx + 1 },
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
      { 
        label: 'Invoice Received', 
        key: 'invoice_received', 
        formatter: (v, r) => {
          const poTotal = invoices
            .filter(i => i.po_no && String(i.po_no).trim().toLowerCase() === String(r.po_no || '').trim().toLowerCase() && String(i.status).toLowerCase() !== 'rejected')
            .reduce((sum, i) => sum + (Number(i.invoice_total) || 0), 0);
          return poTotal > 0 ? poTotal : Number(r.invoice_total || 0);
        }
      },
      { 
        label: 'Pending Invoice Collection', 
        key: 'pending_collection', 
        formatter: (v, r) => {
          const m = posList.find(p => String(p.po_no || p.poNo).trim().toLowerCase() === String(r.po_no || '').trim().toLowerCase());
          const poVal = m ? Number(m.po_value || m.poValue || 0) : 0;
          const poTotal = invoices
            .filter(i => i.po_no && String(i.po_no).trim().toLowerCase() === String(r.po_no || '').trim().toLowerCase() && String(i.status).toLowerCase() !== 'rejected')
            .reduce((sum, i) => sum + (Number(i.invoice_total) || 0), 0);
          const rcvd = poTotal > 0 ? poTotal : Number(r.invoice_total || 0);
          return poVal > 0 ? Math.max(0, poVal - rcvd) : 0;
        }
      },
      { label: 'Invoice Number', key: 'invoice_number' },
      { label: 'Invoice Date', key: 'invoice_date', formatter: (v) => formatDate(v) },
      { label: 'Status', key: 'status' }
    ];
    exportToCSV('Invoices_Ledger_Report.csv', columns, filteredInvoices);
  };

  const [aiLoading, setAiLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  const handleAiAutoFill = async (overrideFile) => {
    const file = overrideFile || selectedFile;
    if (!file) {
      toast.info('Please select or drag an invoice document first.');
      return;
    }
    setAiLoading(true);
    setOcrSuccess(false);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const res = e.target?.result;
          if (typeof res === 'string') {
            resolve(res.includes(',') ? res.split(',')[1] : res);
          } else {
            reject(new Error('Failed to read file data'));
          }
        };
        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsDataURL(file);
      });

      const token = localStorage.getItem('lx_auth_token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lwa-token': token || ''
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileType: file.type || 'application/pdf'
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
        throw new Error(result.error || 'OCR document reading failed');
      }

      const data = result.data || {};
      
      setUploadForm(prev => ({
        ...prev,
        invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
        invoiceDate: data.invoiceDate || prev.invoiceDate,
        subtotal: data.subtotal !== undefined && data.subtotal !== null ? String(data.subtotal) : prev.subtotal,
        taxAmount: data.taxAmount !== undefined && data.taxAmount !== null ? String(data.taxAmount) : prev.taxAmount,
        invoiceTotal: data.invoiceTotal !== undefined && data.invoiceTotal !== null ? String(data.invoiceTotal) : prev.invoiceTotal
      }));

      // Auto-match vendor if detected
      if (data.vendorName && !uploadVendorFilter) {
        const vNameLower = String(data.vendorName).toLowerCase();
        const matched = allAvailableVendors.find(v => 
          vNameLower.includes(String(v.name || '').toLowerCase()) ||
          (v.code && vNameLower.includes(String(v.code).toLowerCase()))
        );
        if (matched) {
          const matchedVal = matched.code || matched.name;
          setUploadVendorFilter(matchedVal);
          toast.info(`Auto-matched vendor: ${matched.name}`);
        }
      }

      setOcrSuccess(true);
      const fields = [];
      if (data.invoiceNumber) fields.push('Invoice #');
      if (data.invoiceDate) fields.push('Date');
      if (data.invoiceTotal) fields.push('Total');
      toast.success(`OCR auto-filled: ${fields.join(', ') || 'details'} successfully!`);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        toast.error('OCR scan timed out. Please enter invoice details manually.');
      } else {
        toast.error('OCR auto-fill failed: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setAiLoading(false);
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
    return validPOs.filter(p => {
      const code = String(p.vendor_code || p.vendorCode || '').trim().toLowerCase();
      const name = String(p.vendor_name || p.vendor || '').trim().toLowerCase();
      return code === vFilter || name === vFilter || code.includes(vFilter) || name.includes(vFilter);
    });
  }, [posList, uploadVendorFilter]);

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
      { label: 'S.No', key: 's_no', formatter: (v, r, idx) => idx + 1 },
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
      { 
        label: 'Invoice Received', 
        key: 'invoice_received', 
        formatter: (v, r) => {
          const poTotal = invoices
            .filter(i => i.po_no && String(i.po_no).trim().toLowerCase() === String(r.po_no || '').trim().toLowerCase() && String(i.status).toLowerCase() !== 'rejected')
            .reduce((sum, i) => sum + (Number(i.invoice_total) || 0), 0);
          return poTotal > 0 ? poTotal : Number(r.invoice_total || 0);
        }
      },
      { 
        label: 'Pending Invoice Collection', 
        key: 'pending_collection', 
        formatter: (v, r) => {
          const m = posList.find(p => String(p.po_no || p.poNo).trim().toLowerCase() === String(r.po_no || '').trim().toLowerCase());
          const poVal = m ? Number(m.po_value || m.poValue || 0) : 0;
          const poTotal = invoices
            .filter(i => i.po_no && String(i.po_no).trim().toLowerCase() === String(r.po_no || '').trim().toLowerCase() && String(i.status).toLowerCase() !== 'rejected')
            .reduce((sum, i) => sum + (Number(i.invoice_total) || 0), 0);
          const rcvd = poTotal > 0 ? poTotal : Number(r.invoice_total || 0);
          return poVal > 0 ? Math.max(0, poVal - rcvd) : 0;
        }
      },
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
          <option value="flat">Invoice list</option><option value="vendor">Group by vendor</option>
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
                  <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap text-center">S.No</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground min-w-[180px]">Vendor Name</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground whitespace-nowrap">P.O No</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground text-right whitespace-nowrap">P.O Value</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground text-right whitespace-nowrap">Invoice Received</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground text-right whitespace-nowrap">Pending Invoice Collection</th>
                  <th className="px-4 py-3.5 font-bold text-muted-foreground whitespace-nowrap">Invoice #</th>
                  <th className="px-3 py-3.5 font-bold text-muted-foreground whitespace-nowrap">Date</th>
                  <th className="px-3 py-3.5 font-bold text-muted-foreground text-center">Status</th>
                  <th className="px-3 py-3.5 font-bold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedInvoices.map((inv, idx) => {
                  const sNo = ((safeInvoicePage - 1) * invoicePageSize) + idx + 1;
                  const isSelected = selectedInvoiceIds.includes(inv.invoice_id);

                  // Lookup PO Data
                  const matchedPO = posList.find(p => 
                    inv.po_no && String(p.po_no || p.poNo).trim().toLowerCase() === String(inv.po_no).trim().toLowerCase()
                  );
                  const poVal = matchedPO ? Number(matchedPO.po_value || matchedPO.poValue || 0) : 0;

                  // Total invoices received against this PO
                  const poTotalInvoiced = invoices
                    .filter(i => i.po_no && String(i.po_no).trim().toLowerCase() === String(inv.po_no || '').trim().toLowerCase() && String(i.status).toLowerCase() !== 'rejected')
                    .reduce((sum, i) => sum + (Number(i.invoice_total) || 0), 0);

                  const invReceived = poTotalInvoiced > 0 ? poTotalInvoiced : Number(inv.invoice_total || 0);
                  const pendingCollection = poVal > 0 ? Math.max(0, poVal - invReceived) : 0;

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

                      {/* 1. S.No */}
                      <td className="px-3 py-3.5 text-center font-mono text-xs text-muted-foreground">
                        {sNo}
                      </td>

                      {/* 2. Vendor Name */}
                      <td className="px-4 py-3.5 min-w-[180px] max-w-[260px]">
                        <span className="block font-semibold text-foreground text-xs leading-snug">
                          {inv.vendor_name || 'Unassigned vendor'}
                        </span>
                        {inv.project && (
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {inv.project}
                          </span>
                        )}
                      </td>

                      {/* 3. P.O No */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {inv.po_no ? (
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/80 border border-border text-foreground">
                            {inv.po_no}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* 4. P.O Value */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-xs font-semibold text-foreground tabular-nums">
                        {poVal > 0 ? formatCurrency(poVal) : (inv.po_no ? '—' : 'N/A')}
                      </td>

                      {/* 5. Invoice Received */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                          {formatCurrency(invReceived)}
                        </span>
                        {poTotalInvoiced > 0 && poTotalInvoiced !== Number(inv.invoice_total) && (
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            (Bill: {formatCurrency(inv.invoice_total)})
                          </span>
                        )}
                      </td>

                      {/* 6. Pending Invoice Collection */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                        {poVal > 0 ? (
                          pendingCollection === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              Fully Invoiced
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(pendingCollection)}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Invoice # */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button 
                          type="button" 
                          onClick={() => { setDrawerTab('overview'); setInspectInvoice(inv); }} 
                          className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline text-left inline-flex items-center gap-1 cursor-pointer"
                        >
                          {inv.invoice_number || 'Unnumbered invoice'}
                          <ArrowUpRight className="w-3 h-3 opacity-60" />
                        </button>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3.5 whitespace-nowrap text-xs text-muted-foreground font-mono">
                        {inv.invoice_date ? formatDate(inv.invoice_date) : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        {getStatusBadge(inv.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setDrawerTab('overview'); setInspectInvoice(inv); }}
                            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                            title="Quick Inspect"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(inv.invoice_id, inv.file_name || `invoice-${inv.invoice_id}.pdf`)}
                            disabled={downloadingId === inv.invoice_id}
                            className="inline-flex items-center text-xs text-amber-600 dark:text-primary hover:underline p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
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
                        </div>
                      </td>
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

      {/* ── 6. Slide-Over Quick Inspection Panel (Zoho Books Style) ── */}
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
                <button
                  type="button"
                  onClick={() => window.open(`/api/attachments/${inspectInvoice.invoice_id}`, '_blank', 'width=900,height=1000')}
                  className="px-3 py-1.5 text-xs text-amber-600 dark:text-primary hover:bg-amber-500/10 font-bold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open invoice in side window to validate"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Side Window
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(inspectInvoice.invoice_id, inspectInvoice.file_name || `invoice-${inspectInvoice.invoice_id}.pdf`)}
                  disabled={downloadingId === inspectInvoice.invoice_id}
                  className="px-3 py-1.5 text-xs text-amber-600 dark:text-primary hover:bg-amber-500/10 font-bold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingId === inspectInvoice.invoice_id ? 'animate-pulse' : ''}`} />
                  {downloadingId === inspectInvoice.invoice_id ? 'Downloading...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => setInspectInvoice(null)}
                  aria-label="Close invoice details"
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
                    ? 'border-amber-500 text-amber-700 dark:text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Bill Overview & Taxes
              </button>

              <button
                onClick={() => setDrawerTab('po_health')}
                className={`py-3 border-b-2 transition-all cursor-pointer ${
                  drawerTab === 'po_health'
                    ? 'border-amber-500 text-amber-700 dark:text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                PO Budget Health
              </button>

              <button
                onClick={() => setDrawerTab('pdf')}
                className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  drawerTab === 'pdf'
                    ? 'border-amber-500 text-amber-700 dark:text-primary'
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
                  <div className="p-5 rounded-lg bg-muted/30 border border-border space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-amber-600 dark:text-primary" /> Tax & Amount Split
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

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Gross Invoice Payable</span>
                      <span className="text-xl font-bold text-amber-600 dark:text-primary font-mono">
                        {formatCurrency(inspectInvoice.invoice_total)}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-2">
                      <h5 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                        Vendor & PO References
                      </h5>
                      <p><span className="text-muted-foreground">Vendor:</span> <strong className="text-foreground">{inspectInvoice.vendor_name}</strong></p>
                      <p><span className="text-muted-foreground">Code:</span> <strong className="text-foreground font-mono">{inspectInvoice.vendor_code || '—'}</strong></p>
                      <p><span className="text-muted-foreground">PO Number:</span> <strong className="text-foreground font-mono">{inspectInvoice.po_no}</strong></p>
                      <p><span className="text-muted-foreground">Source:</span> <span className="capitalize">{inspectInvoice.source?.replace('_', ' ') || 'Internal Upload'}</span></p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-2">
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
                    <div className="p-4 rounded-lg bg-muted/20 border border-border text-xs space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">Internal Remarks / Notes</span>
                      <p className="text-foreground leading-relaxed">{inspectInvoice.remarks}</p>
                    </div>
                  )}

                  {/* Rejection Alert */}
                  {inspectInvoice.rejection_reason && (
                    <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs space-y-1 text-rose-600 dark:text-rose-400">
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
                  <div className="p-5 rounded-lg bg-muted/30 border border-border space-y-3 text-xs">
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-600 dark:text-primary" />
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
                <div className="h-[480px] rounded-lg overflow-hidden border border-border bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
              <iframe 
                    src={getAttachmentUrl(inspectInvoice.invoice_id, 'inline')} 
                    className="w-full h-full rounded-xl"
                    title="Invoice PDF Preview"
                  />
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-5 border-t border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setInvoiceToDelete(inspectInvoice)} className="text-xs rounded-xl text-rose-600 dark:text-rose-400">
                Delete invoice
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
                onChange={(val) => {
                  setUploadVendorFilter(val);
                  if (val && uploadForm.poNo) {
                    const currentPO = posList.find(p => String(p.po_no || p.poNo) === String(uploadForm.poNo));
                    if (currentPO) {
                      const vCode = String(currentPO.vendor_code || '').toLowerCase();
                      const vName = String(currentPO.vendor_name || currentPO.vendor || '').toLowerCase();
                      const selectedVal = String(val).toLowerCase();
                      if (vCode !== selectedVal && vName !== selectedVal) {
                        setUploadForm(prev => ({ ...prev, poNo: '' }));
                      }
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
                  if (selectedVal && !uploadVendorFilter) {
                    const matchedPO = posList.find(p => String(p.po_no || p.poNo) === String(selectedVal));
                    if (matchedPO) {
                      const vCode = matchedPO.vendor_code || matchedPO.vendor_name || matchedPO.vendor;
                      if (vCode) setUploadVendorFilter(vCode);
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

    </div>
  );
}
