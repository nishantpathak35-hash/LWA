'use client';

import React, { useState, useCallback } from 'react';
import { useAppState } from '../StateProvider';
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, Button, Input, Select, Dialog
} from '../ui/core';
import { formatCurrency, formatDate } from '../../app/lib/utils';
import {
  PlusCircle, Search, Receipt, Send, ShieldAlert, Plus, Trash2, Edit2,
  Eye, CheckCircle, XCircle, Clock, History, Wallet, ChevronDown, ChevronUp,
  AlertTriangle, Copy, Download
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const GST_RATES = [0, 5, 12, 18, 28];

const TDS_SECTIONS = [
  { code: '', label: 'None (No TDS)', rate: 0 },
  { code: '194C', label: '194C – Contractors (1%/2%)', rate: 2 },
  { code: '194J', label: '194J – Professional Services (10%)', rate: 10 },
  { code: '194I', label: '194I – Rent (10%)', rate: 10 },
  { code: '194H', label: '194H – Commission (5%)', rate: 5 },
  { code: '194A', label: '194A – Interest (10%)', rate: 10 },
  { code: '194B', label: '194B – Lottery / Winnings (30%)', rate: 30 },
  { code: '194Q', label: '194Q – Purchase of Goods (0.1%)', rate: 0.1 },
];

const PAYMENT_MODES = [
  'Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'DD', 'Cash', 'Other'
];

const UOM_OPTIONS = [
  { value: 'sqft', label: 'Sq Ft' },
  { value: 'sqm', label: 'Sq M' },
  { value: 'Nos', label: 'Nos' },
  { value: 'Pieces', label: 'Pieces' },
  { value: 'Kg', label: 'Kg' },
  { value: 'Ton', label: 'Ton' },
  { value: 'Meter', label: 'Meter' },
  { value: 'Running Meter', label: 'Running Meter' },
  { value: 'Box', label: 'Box' },
  { value: 'Lot', label: 'Lot' }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved')                          return <Badge variant="success">Approved</Badge>;
  if (s === 'pending approval' || s === 'pending_approval') return <Badge variant="warning">Pending Approval</Badge>;
  if (s === 'rejected')                          return <Badge variant="error">Rejected</Badge>;
  return <Badge variant="default">{status || 'Draft'}</Badge>;
}

function getPaymentStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'fully paid')      return <Badge variant="success">Fully Paid</Badge>;
  if (s === 'partially paid')  return <Badge variant="warning">Partially Paid</Badge>;
  return <Badge variant="default">Unpaid</Badge>;
}

function calcItem(item) {
  const qty  = Number(item.quantity || item.qty) || 0;
  const rate = Number(item.rate) || 0;
  const gst  = Number(item.gstPct) || 0;
  const gross = qty * rate;
  const gstAmt = Math.round(gross * gst / 100);
  return { gross, gstAmt, total: gross + gstAmt };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function POsView() {
  const { pos, vendors, projects, user, call, refreshData } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionMenuPoNo, setOpenActionMenuPoNo] = useState(null);
  const [poDateSortDir, setPoDateSortDir] = useState('desc');

  // ── PO Form Modal ──
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingPoNo, setEditingPoNo]   = useState(null);
  const [editingPO, setEditingPO]       = useState(null); // full PO data when editing

  // PO form fields
  const [poNo, setPoNo]                 = useState('');
  const [project, setProject]           = useState('');
  const [vendorCode, setVendorCode]     = useState('');
  const [poDate, setPoDate]             = useState(new Date().toISOString().substring(0, 10));
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [category, setCategory]         = useState('Goods');
  const [gstMode, setGstMode]           = useState('inter');
  const [items, setItems]               = useState([{ description: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: 0, gstPct: 18 }]);
  const [tdsSection, setTdsSection]     = useState('');
  const [tdsPct, setTdsPct]             = useState(0);
  const [terms, setTerms]               = useState('');
  const [notes, setNotes]               = useState('');
  const [formError, setFormError]       = useState(null);
  const [submitting, setSubmitting]     = useState(false);

  // ── Approval Modal ──
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalTarget, setApprovalTarget]       = useState(null);
  const [approvalAction, setApprovalAction]       = useState('approve');
  const [approvalRemarks, setApprovalRemarks]     = useState('');
  const [approvingPO, setApprovingPO]             = useState(false);

  // ── History Modal ──
  const [historyModalOpen, setHistoryModalOpen]   = useState(false);
  const [historyTrail, setHistoryTrail]           = useState([]);
  const [loadingHistory, setLoadingHistory]       = useState(false);
  const [historyTarget, setHistoryTarget]         = useState(null);

  // ── Payment Panel (inside Edit Modal) ──
  const [paymentData, setPaymentData]             = useState(null); // { payments, summary }
  const [loadingPayments, setLoadingPayments]     = useState(false);
  const [showPayments, setShowPayments]           = useState(false);

  // ── Manual Payment Modal ──
  const [manualPayModalOpen, setManualPayModalOpen] = useState(false);
  const [mpDate, setMpDate]     = useState(new Date().toISOString().substring(0, 10));
  const [mpAmount, setMpAmount] = useState('');
  const [mpMode, setMpMode]     = useState('Bank Transfer');
  const [mpUtr, setMpUtr]       = useState('');
  const [mpBank, setMpBank]     = useState('');
  const [mpRef, setMpRef]       = useState('');
  const [mpRemarks, setMpRemarks] = useState('');
  const [mpError, setMpError]   = useState(null);
  const [mpSubmitting, setMpSubmitting] = useState(false);

  // ── User Roles ──
  const roles        = user?.roles || [];
  const isProcurement = roles.some(role => ['proc', 'procurement', 'maker'].includes(role));
  const isAdmin      = roles.includes('admin');
  const isDirector   = roles.includes('director');
  const isFinance    = roles.includes('finance');
  const isAccountant = roles.includes('accountant');
  const canCreate    = isProcurement || isAdmin || isDirector;
  const canApprove   = isDirector || isAdmin || isFinance;
  const canManualPay = isAccountant || isAdmin; // Manual Payment: Accountant role only (+ Admin)

  // ── Derived Totals ──
  const summaryTotals = items.reduce((acc, item) => {
    const { gross, gstAmt, total } = calcItem(item);
    return { subtotal: acc.subtotal + gross, gstTotal: acc.gstTotal + gstAmt, grandTotal: acc.grandTotal + total };
  }, { subtotal: 0, gstTotal: 0, grandTotal: 0 });

  const tdsAmount = Math.round(summaryTotals.subtotal * (tdsPct / 100));
  const netPayable = summaryTotals.grandTotal - tdsAmount;

  // ── Filtered POs ──
  const filteredPOs = pos.filter(po => {
    const q = searchQuery.toLowerCase();
    return (po.po_no || '').toLowerCase().includes(q) ||
           (po.vendor_name || '').toLowerCase().includes(q) ||
           (po.project || '').toLowerCase().includes(q);
  }).sort((a, b) => {
    const aTime = new Date(a.po_date || '1900-01-01').getTime() || 0;
    const bTime = new Date(b.po_date || '1900-01-01').getTime() || 0;
    if (aTime === bTime) return String(b.po_no || '').localeCompare(String(a.po_no || ''));
    return poDateSortDir === 'desc' ? bTime - aTime : aTime - bTime;
  });

  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const handleExportPOs = async () => {
    const headers = [
      'PO No',
      'Project',
      'Vendor',
      'Status',
      'Payment Status',
      'PO Value',
      'Paid',
      'Balance',
      'PO Date',
      'Expected Delivery',
      'Category',
      'Line Items'
    ];
    const rows = await Promise.all(filteredPOs.map(async po => {
      const poValue = Number(po.po_value || 0);
      const paid = Number(po.paid || 0);
      let lineItems = '';
      try {
        const details = await call('getPOFullDetails', po.po_no);
        lineItems = (details?.items || [])
          .map(item => `${item.description || ''} (${item.quantity || item.qty || 0} ${item.unit || item.uom || 'Nos'})`)
          .join('; ');
      } catch {
        lineItems = '';
      }
      return [
        po.po_no || '',
        po.project || '',
        po.vendor_name || po.vendor_key || '',
        po.status || po.approval_status || 'Draft',
        po.payment_status || 'Unpaid',
        poValue,
        paid,
        Math.max(0, poValue - paid),
        po.po_date || '',
        po.expected_delivery_date || '',
        po.category || '',
        lineItems
      ];
    }));

    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Purchase_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Open Create / Edit Modal ──────────────────────────────────────────────
  const handleOpenModal = useCallback(async (existingPoNo = null) => {
    const poToLoad = typeof existingPoNo === 'string' ? existingPoNo : null;

    if (poToLoad) {
      setSubmitting(true);
      try {
        const [poDetails, paymentsRes] = await Promise.all([
          call('getPOFullDetails', poToLoad),
          call('getPOPayments', poToLoad)
        ]);
        if (poDetails) {
          setEditingPoNo(poToLoad);
          setEditingPO(poDetails);
          setPoNo(poDetails.po_no);
          setProject(poDetails.project || '');
          setVendorCode(poDetails.vendor_key || '');
          setPoDate(poDetails.po_date || new Date().toISOString().substring(0, 10));
          setExpectedDelivery(poDetails.expected_delivery_date || '');
          setCategory(poDetails.category || 'Goods');
          setGstMode(poDetails.gst_mode || 'inter');
          setItems(poDetails.items?.length
            ? poDetails.items.map(it => ({
                description: it.description || '',
                hsnSac: it.hsnSac || it.hsn_sac || '',
                quantity: it.quantity || it.qty || 1,
                unit: it.unit || it.uom || 'Nos',
                rate: it.rate || 0,
                gstPct: Number(it.gstPct || it.tax_pct) || 18
              }))
            : [{ description: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: 0, gstPct: 18 }]
          );
          setTdsSection(poDetails.tds_section || '');
          setTdsPct(Number(poDetails.tds_pct) || 0);
          setTerms(poDetails.terms || '');
          setNotes(poDetails.notes || '');
          setPaymentData(paymentsRes || null);
          setShowPayments(false);
          setFormError(null);
          setModalOpen(true);
        }
      } catch (err) {
        toast.error('Failed to load PO: ' + err.message);
      } finally {
        setSubmitting(false);
      }
    } else {
      setEditingPoNo(null);
      setEditingPO(null);
      setProject(projects[0]?.name || '');
      setVendorCode(vendors[0]?.code || '');
      setPoDate(new Date().toISOString().substring(0, 10));
      setExpectedDelivery('');
      setCategory('Goods');
      setGstMode('inter');
      setItems([{ description: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: 0, gstPct: 18 }]);
      setTdsSection('');
      setTdsPct(0);
      setTerms('');
      setNotes('');
      setPaymentData(null);
      setShowPayments(false);
      setFormError(null);
      setModalOpen(true);
      call('getPOPrefix').then(prefix => {
        setPoNo(prefix ? `${prefix}${Math.floor(100000 + Math.random() * 900000)}` : `PO-${Math.floor(100000 + Math.random() * 900000)}`);
      }).catch(() => setPoNo(`PO-${Math.floor(100000 + Math.random() * 900000)}`));
    }
  }, [call, projects, vendors]);

  // ─── Item Handlers ────────────────────────────────────────────────────────
  const handleAddItemLine    = () => setItems([...items, { description: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: 0, gstPct: 18 }]);
  const handleRemoveItemLine = (idx) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };
  const handleItemChange     = (idx, field, value) => {
    const n = [...items]; n[idx] = { ...n[idx], [field]: value }; setItems(n);
  };
  const handleTdsSectionChange = (code) => {
    setTdsSection(code);
    setTdsPct(TDS_SECTIONS.find(s => s.code === code)?.rate || 0);
  };

  // ─── Send Email ───────────────────────────────────────────────────────────
  const handleSendVendorEmail = async (poNumber) => {
    const po = pos.find(p => p.po_no === poNumber);
    const vendor = vendors.find(v => v.code === po?.vendor_key || v.name === po?.vendor_name);
    const email = prompt("Enter vendor's email address:", vendor?.email || '');
    if (!email) return;
    try {
      await call('sendPOToVendor', poNumber, email.trim());
      toast(`PO ${poNumber} sent to ${email.trim()}.`);
      await refreshData();
    } catch (e) { toast.error(`Failed: ${e.message}`); }
  };

  // ─── Save PO ──────────────────────────────────────────────────────────────
  const handleSavePO = async (e) => {
    e.preventDefault();
    if (!poNo) { setFormError('PO Number is required.'); return; }
    if (items.some(i => !i.description || Number(i.rate) <= 0)) {
      setFormError('All items must have a description and rate > 0.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const selectedVendor = vendors.find(v => v.code === vendorCode);
      const payload = {
        poNo: poNo.trim(), project, poDate,
        expectedDeliveryDate: expectedDelivery,
        category, vendorCode,
        vendor_key: vendorCode,
        vendorName: selectedVendor?.name || '',
        vendor: selectedVendor?.name || '',
        poValue: netPayable, grandTotal: netPayable,
        subtotal: summaryTotals.subtotal,
        gst_total: summaryTotals.gstTotal,
        tds_section: tdsSection, tdsSection,
        tds_pct: tdsPct, tdsPct,
        tds_amount: tdsAmount,
        gst_mode: gstMode,
        terms: terms.trim(),
        notes: notes.trim(),
        status: 'Draft',
        items: items.map(item => {
          const { gstAmt, total } = calcItem(item);
          return {
            description: item.description,
            hsn_sac: item.hsnSac,
            qty: Number(item.quantity), unit: item.unit || 'Nos', rate: Number(item.rate),
            tax_pct: Number(item.gstPct), gst_amount: gstAmt, amount: total
          };
        })
      };

      let result;
      if (editingPoNo) {
        result = await call('updatePOFull', editingPoNo, payload);
        let msg = `Purchase Order ${editingPoNo} updated.`;
        if (result?.newStatus && result.newStatus !== (editingPO?.approval_status || editingPO?.status)) {
          msg += `\n\nNote: PO value changed — status reset to ${result.newStatus} and requires re-approval.`;
        }
        toast(msg);
      } else {
        await call('createPOFull', payload);
        toast('Purchase Order created as Draft. Submit for approval from the PO list.');
      }
      await refreshData();
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save Purchase Order.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Approval handlers ────────────────────────────────────────────────────
  const handleOpenApproval = (po, action) => {
    setApprovalTarget(po); setApprovalAction(action);
    setApprovalRemarks(''); setApprovalModalOpen(true);
  };

  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    if (!approvalTarget) return;
    setApprovingPO(true);
    try {
      await call('approvePO', approvalTarget.po_no, approvalAction, approvalRemarks);
      await refreshData();
      setApprovalModalOpen(false);
      toast(`PO ${approvalTarget.po_no} has been ${approvalAction === 'approve' ? 'Approved' : 'Rejected'}.`);
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setApprovingPO(false); }
  };

  const handleSubmitForApproval = async (poNumber) => {
    if (!window.confirm(`Submit PO ${poNumber} for approval?`)) return;
    try {
      await call('submitPOForApproval', poNumber);
      await refreshData();
      toast(`PO ${poNumber} submitted for approval.`);
    } catch (err) { toast.error('Failed: ' + err.message); }
  };

  const handleDeletePO = async (poNumber) => {
    if (!window.confirm(`Are you sure you want to delete PO ${poNumber}? This action is irreversible.`)) return;
    try {
      await call('deletePOFull', poNumber);
      await refreshData();
      toast(`PO ${poNumber} deleted.`);
    } catch (err) { toast.error('Failed: ' + err.message); }
  };

  const handleDuplicatePO = async (po) => {
    try {
      const details = await call('getPOFullDetails', po.po_no);
      if (!details) throw new Error("Could not load PO details");
      setEditingPoNo(null);
      setEditingPO(null);
      setPoNo(`${po.po_no}-DUP`);
      setProject(details.project || '');
      setVendorCode(details.vendor_key || '');
      setPoDate(new Date().toISOString().substring(0, 10));
      setExpectedDelivery(details.expected_delivery_date || '');
      setCategory(details.category || 'Goods');
      setGstMode(details.gst_mode || 'inter');
      setTerms(details.terms || '');
      setNotes(details.notes || '');
      setItems(details.items.map(it => ({
        description: it.description || '',
        hsnSac: it.hsn_sac || '',
        quantity: it.qty || 1,
        unit: it.unit || 'Nos',
        rate: it.rate || 0,
        gstPct: it.tax_pct || 18
      })));
      setTdsSection(details.tds_section || '');
      setTdsPct(details.tds_pct || 0);
      setFormError(null);
      setModalOpen(true);
    } catch (err) {
      toast.error("Failed to duplicate PO: " + err.message);
    }
  };

  // ─── History ──────────────────────────────────────────────────────────────
  const handleViewPOHistory = async (po) => {
    setHistoryTarget(po); setLoadingHistory(true);
    setHistoryTrail([]); setHistoryModalOpen(true);
    try {
      const h = await call('getPOApprovalHistory', po.po_no);
      setHistoryTrail(h || []);
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

  // ─── Reload Payments (inside modal) ──────────────────────────────────────
  const reloadPayments = useCallback(async (poNumber) => {
    if (!poNumber) return;
    setLoadingPayments(true);
    try {
      const res = await call('getPOPayments', poNumber);
      setPaymentData(res);
    } catch (e) { console.error(e); }
    finally { setLoadingPayments(false); }
  }, [call]);

  // ─── Manual Payment Submit ────────────────────────────────────────────────
  const handleManualPaySubmit = async (e) => {
    e.preventDefault();
    if (!mpAmount || Number(mpAmount) <= 0) { setMpError('Amount must be greater than zero.'); return; }
    if (!mpDate) { setMpError('Payment date is required.'); return; }
    setMpSubmitting(true); setMpError(null);
    try {
      await call('addManualPayment', {
        poNo: editingPoNo,
        paymentDate: mpDate,
        amount: Number(mpAmount),
        paymentMode: mpMode,
        utrRef: mpUtr.trim(),
        bankName: mpBank.trim(),
        referenceNo: mpRef.trim(),
        remarks: mpRemarks.trim()
      });
      await reloadPayments(editingPoNo);
      await refreshData();
      setManualPayModalOpen(false);
      // Reset fields
      setMpDate(new Date().toISOString().substring(0, 10));
      setMpAmount(''); setMpMode('Bank Transfer');
      setMpUtr(''); setMpBank(''); setMpRef(''); setMpRemarks('');
    } catch (err) {
      setMpError(err.message || 'Failed to record payment.');
    } finally { setMpSubmitting(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gold/10 text-gold"><Receipt className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-light text-slate-100 font-serif">Purchase Orders</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Full PO lifecycle — create, approve, edit, and track payments.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExportPOs} disabled={filteredPOs.length === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          {canCreate && (
            <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
              <PlusCircle className="w-4 h-4" /> Create Purchase Order
            </Button>
          )}
        </div>
      </div>

      {/* PO Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4">
          <CardTitle className="text-sm font-semibold text-slate-400">PO DATABASE ({filteredPOs.length})</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input type="text" placeholder="Search PO, Project, Vendor..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pl-9 text-xs py-1.5 h-8 bg-slate-950/40" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPOs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-light">No purchase orders found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO No</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => setPoDateSortDir(dir => dir === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-1 text-left uppercase"
                    >
                      P.O. Date {poDateSortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    </button>
                  </TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">PO Value</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po, idx) => {
                  const st = String(po.status || po.approval_status || 'Draft').toLowerCase();
                  const isDraft    = st === 'draft';
                  const isPending  = st === 'pending approval' || st === 'pending_approval';
                  const isApproved = st === 'approved' || st === 'active';
                  const isRejected = st === 'rejected';
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-slate-200">{po.po_no}</TableCell>
                      <TableCell className="text-slate-300">{formatDate(po.po_date)}</TableCell>
                      <TableCell>{po.project}</TableCell>
                      <TableCell>{po.vendor_name || po.vendor_key}</TableCell>
                      <TableCell>{getStatusBadge(po.status || po.approval_status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(po.payment_status)}</TableCell>
                      <TableCell className="text-right font-medium text-slate-200">{formatCurrency(Number(po.po_value || 0))}</TableCell>
                      <TableCell className="text-right text-emerald-400">{formatCurrency(Number(po.paid || 0))}</TableCell>
                      <TableCell className="text-right text-gold">{formatCurrency(Math.max(0, Number(po.po_value || 0) - Number(po.paid || 0)))}</TableCell>
                      <TableCell className="text-center relative">
                        <div className="flex justify-center">
                          <div className="relative inline-block text-left">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuPoNo(openActionMenuPoNo === po.po_no ? null : po.po_no);
                              }}
                              className="flex items-center gap-1 h-7 text-xs px-2.5 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-900/60 rounded-md"
                            >
                              Actions <ChevronDown className="w-3 h-3 text-slate-400" />
                            </Button>
                            {openActionMenuPoNo === po.po_no && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuPoNo(null)} />
                                <div className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-800 bg-slate-950 shadow-2xl py-1 z-20 animate-fade-in flex flex-col">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuPoNo(null);
                                      window.open(`/po/${encodeURIComponent(po.po_no)}`, '_blank');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-900 transition-colors text-left font-sans"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-400" /> Print / View PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuPoNo(null);
                                      handleSendVendorEmail(po.po_no);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-900 transition-colors text-left font-sans"
                                  >
                                    <Send className="w-3.5 h-3.5 text-slate-400" /> Email PO
                                  </button>
                                  {!isPending && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        handleOpenModal(po.po_no);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-900 transition-colors text-left font-sans"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit PO
                                    </button>
                                  )}
                                  {canCreate && (isDraft || isRejected) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        handleSubmitForApproval(po.po_no);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-900 transition-colors text-left font-sans"
                                    >
                                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Submit Approval
                                    </button>
                                  )}
                                  {canApprove && isPending && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuPoNo(null);
                                          handleOpenApproval(po, 'approve');
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-slate-900 transition-colors text-left font-sans"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Approve PO
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuPoNo(null);
                                          handleOpenApproval(po, 'reject');
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-slate-900 transition-colors text-left font-sans"
                                      >
                                        <XCircle className="w-3.5 h-3.5 text-red-500" /> Reject PO
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuPoNo(null);
                                      handleDuplicatePO(po);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-900 transition-colors text-left border-t border-slate-900/60 font-sans"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicate
                                  </button>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        handleDeletePO(po.po_no);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-slate-900 transition-colors text-left font-sans"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete PO
                                    </button>
                                  )}
                                  {canManualPay && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        setEditingPoNo(po.po_no);
                                        reloadPayments(po.po_no);
                                        setMpDate(new Date().toISOString().substring(0, 10));
                                        setMpAmount(''); setMpMode('Bank Transfer');
                                        setMpUtr(''); setMpBank(''); setMpRef(''); setMpRemarks('');
                                        setMpError(null);
                                        setManualPayModalOpen(true);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-gold hover:text-gold-hover hover:bg-slate-900 transition-colors text-left border-t border-slate-900/60 font-sans"
                                    >
                                      <Wallet className="w-3.5 h-3.5 text-gold" /> Add Manual Payment
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuPoNo(null);
                                      handleViewPOHistory(po);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors text-left border-t border-slate-900/40 font-sans"
                                  >
                                    <History className="w-3.5 h-3.5 text-slate-500" /> View History
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Edit PO Dialog ────────────────────────────────────────── */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingPoNo ? `Edit Purchase Order — ${editingPoNo}` : 'Create Purchase Order'}>
        <form onSubmit={handleSavePO} className="space-y-6">

          {/* Status warning for approved PO edits */}
          {editingPO && String(editingPO.approval_status || editingPO.status || '').toLowerCase() === 'approved' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>This PO is <strong>Approved</strong>. Editing financial fields (value, vendor, line items) will reset it to <strong>Draft</strong> and require re-approval.</span>
            </div>
          )}

          {/* Header row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PO NUMBER *</label>
              <Input type="text" required value={poNo} onChange={e => setPoNo(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PROJECT *</label>
              <Select value={project} onChange={e => setProject(e.target.value)}>
                {projects.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR *</label>
              <Select value={vendorCode} onChange={e => setVendorCode(e.target.value)}>
                {vendors.map((v, i) => <option key={i} value={v.code}>{v.name} ({v.code})</option>)}
              </Select>
            </div>
          </div>

          {/* Header row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PO DATE</label>
              <Input type="date" required value={poDate} onChange={e => setPoDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">EXPECTED DELIVERY</label>
              <Input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">CATEGORY</label>
              <Select value={category} onChange={e => setCategory(e.target.value)}>
                {['Goods','Services','Consulting','IT','Marketing','Admin','Capex','Opex'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">GST TYPE</label>
              <Select value={gstMode} onChange={e => setGstMode(e.target.value)}>
                <option value="inter">Inter-State (IGST)</option>
                <option value="intra">Intra-State (CGST+SGST)</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TERMS & CONDITIONS</label>
              <Input type="text" value={terms} onChange={e => setTerms(e.target.value)} placeholder="e.g. 50% advance, balance on delivery" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">NOTES / REMARKS</label>
              <Input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes or special instructions" />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">Line Items</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddItemLine} className="h-7 text-xs text-gold">
                <Plus className="w-3.5 h-3.5" /> Add Line
              </Button>
            </div>

            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[1fr_80px_60px_96px_90px_70px_90px_36px] gap-2 px-1">
              {['Description *','HSN/SAC','Qty','UOM','Rate (₹)','GST %','Amount',''].map((h,i) => (
                <span key={i} className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {items.map((item, idx) => {
              const { total } = calcItem(item);
              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_80px_60px_96px_90px_70px_90px_36px] gap-2 items-center p-2 rounded-lg bg-slate-950/20 border border-slate-900/60">
                  <Input required type="text" value={item.description}
                    onChange={e => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Item description" className="h-8 text-xs" />
                  <Input type="text" value={item.hsnSac}
                    onChange={e => handleItemChange(idx, 'hsnSac', e.target.value)}
                    placeholder="Code" className="h-8 text-xs" />
                  <Input type="number" required min="0.001" step="0.001" value={item.quantity}
                    onChange={e => handleItemChange(idx, 'quantity', e.target.value)} className="h-8 text-xs" />
                  <Select value={item.unit || 'Nos'} onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    className="h-8 text-xs py-0">
                    {UOM_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </Select>
                  <Input type="number" required min="0" step="0.01" value={item.rate}
                    onChange={e => handleItemChange(idx, 'rate', e.target.value)} className="h-8 text-xs" />
                  <Select value={item.gstPct} onChange={e => handleItemChange(idx, 'gstPct', Number(e.target.value))}
                    className="h-8 text-xs py-0">
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </Select>
                  <div className="h-8 flex items-center px-2 text-xs font-semibold text-gold">
                    {formatCurrency(total)}
                  </div>
                  {items.length > 1
                    ? <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveItemLine(idx)} className="h-8 w-8">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    : <div />
                  }
                </div>
              );
            })}
          </div>

          {/* TDS */}
          <div className="p-4 bg-slate-900/20 border border-slate-900/60 rounded-xl space-y-3">
            <span className="text-[10px] font-semibold text-gold tracking-wider uppercase block">TDS Deduction</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS SECTION</label>
                <Select value={tdsSection} onChange={e => handleTdsSectionChange(e.target.value)}>
                  {TDS_SECTIONS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS RATE (%)</label>
                <Input type="number" min="0" max="100" step="0.1" value={tdsPct}
                  onChange={e => setTdsPct(Number(e.target.value))} className="h-9 text-xs" />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block mb-3">Order Summary</span>
            <div className="space-y-2 text-sm font-light">
              <div className="flex justify-between border-b border-slate-900/60 pb-2">
                <span className="text-slate-400">Subtotal:</span>
                <span>{formatCurrency(summaryTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 pb-2">
                <span className="text-slate-400">GST ({gstMode === 'intra' ? 'CGST+SGST' : 'IGST'}):</span>
                <span>+{formatCurrency(summaryTotals.gstTotal)}</span>
              </div>
              {tdsAmount > 0 && (
                <div className="flex justify-between border-b border-slate-900/60 pb-2 text-red-400">
                  <span>TDS ({tdsSection} @ {tdsPct}%):</span>
                  <span>−{formatCurrency(tdsAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-semibold">
                <span className="text-slate-200">Net PO Value:</span>
                <span className="text-gold">{formatCurrency(netPayable)}</span>
              </div>
            </div>
          </div>

          {/* ── Payment Summary (Edit Mode only) ──────────────────────────── */}
          {editingPoNo && paymentData && (
            <div className="border border-slate-900 rounded-xl overflow-hidden">
              <button type="button"
                onClick={() => setShowPayments(p => !p)}
                className="w-full flex items-center justify-between p-4 bg-slate-900/20 hover:bg-slate-900/40 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-gold" />
                  <span className="text-sm font-medium text-slate-200">Payment Summary</span>
                  {paymentData.summary && (
                    <span className="ml-2">{getPaymentStatusBadge(paymentData.summary.payment_status)}</span>
                  )}
                </div>
                {showPayments ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {showPayments && (
                <div className="p-4 space-y-4">
                  {/* KPI chips */}
                  {paymentData.summary && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'PO Value', value: paymentData.summary.po_value, color: 'text-slate-200' },
                        { label: 'Total Paid', value: paymentData.summary.total_paid, color: 'text-emerald-400' },
                        { label: 'Outstanding', value: paymentData.summary.outstanding, color: 'text-amber-400' },
                      ].map(kpi => (
                        <div key={kpi.label} className="p-3 bg-slate-900/30 rounded-lg border border-slate-900/60 text-center">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{kpi.label}</div>
                          <div className={`text-sm font-semibold ${kpi.color}`}>{formatCurrency(kpi.value)}</div>
                        </div>
                      ))}
                    </div>
                  )}



                  {/* Payment history table */}
                  {loadingPayments ? (
                    <div className="text-center text-slate-500 text-sm py-4">Loading...</div>
                  ) : paymentData.payments?.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-900/60">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900/40 text-slate-500 uppercase tracking-wider">
                          <tr>
                            {['Date','Amount','Mode','UTR / Ref','Type','By'].map(h => (
                              <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/60">
                          {paymentData.payments.map((p, i) => (
                            <tr key={i} className="hover:bg-slate-900/20">
                              <td className="px-3 py-2">{p.payment_date}</td>
                              <td className="px-3 py-2 font-semibold text-emerald-400">{formatCurrency(p.amount)}</td>
                              <td className="px-3 py-2">{p.payment_mode}</td>
                              <td className="px-3 py-2 font-mono text-slate-400">{p.utr_ref || p.reference_no || '—'}</td>
                              <td className="px-3 py-2">
                                <Badge variant={p.payment_type === 'manual' ? 'info' : 'success'}>
                                  {p.payment_type === 'manual' ? 'Manual' : 'Remittance'}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-slate-500">{p.recorded_by || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 text-sm py-4">No payments recorded yet.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" /><span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (editingPoNo ? 'Saving...' : 'Creating...') : (editingPoNo ? 'Save Changes' : 'Create PO')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Approval Dialog ────────────────────────────────────────────────── */}
      <Dialog open={approvalModalOpen} onClose={() => setApprovalModalOpen(false)}
        title={approvalAction === 'approve' ? 'Approve Purchase Order' : 'Reject Purchase Order'}>
        <form onSubmit={handleApprovalSubmit} className="space-y-5">
          <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl space-y-2 text-sm font-light">
            <p className="text-slate-400">PO Number: <strong className="text-slate-200">{approvalTarget?.po_no}</strong></p>
            <p className="text-slate-400">Vendor: <strong className="text-slate-200">{approvalTarget?.vendor_name}</strong></p>
            <p className="text-slate-400">PO Value: <strong className="text-gold font-semibold">{formatCurrency(Number(approvalTarget?.po_value || 0))}</strong></p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REMARKS</label>
            <Input type="text" value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)}
              placeholder={approvalAction === 'reject' ? 'Reason for rejection (required)' : 'Approval notes (optional)'}
              required={approvalAction === 'reject'} />
          </div>
          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setApprovalModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant={approvalAction === 'approve' ? 'primary' : 'destructive'} disabled={approvingPO}>
              {approvingPO ? 'Processing...' : approvalAction === 'approve' ? '✓ Approve PO' : '✗ Reject PO'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── History Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={historyModalOpen} onClose={() => setHistoryModalOpen(false)}
        title={`Audit Trail — ${historyTarget?.po_no}`}>
        {loadingHistory ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading...</div>
        ) : historyTrail.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-light">No history logged for this PO.</div>
        ) : (
          <div className="relative border-l border-slate-900 pl-6 ml-3 space-y-8 py-3 text-sm font-light">
            {historyTrail.map((h, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-gold border border-slate-950 ring-4 ring-slate-950" />
                <p className="text-[11px] text-slate-500">{h.timestamp}</p>
                <p className="text-slate-200 font-medium mt-1 uppercase text-xs tracking-wider">
                  {h.action} · <span className="text-slate-400 normal-case font-light text-xs">{h.performed_by}</span>
                </p>
                {h.remarks && <p className="text-slate-400 mt-1 bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 leading-relaxed text-xs">{h.remarks}</p>}
              </div>
            ))}
          </div>
        )}
      </Dialog>

      {/* ── Manual Payment Dialog ──────────────────────────────────────────── */}
      <Dialog open={manualPayModalOpen} onClose={() => setManualPayModalOpen(false)}
        title={`Add Manual Payment — ${editingPoNo}`}>
        <form onSubmit={handleManualPaySubmit} className="space-y-5">

          {/* Outstanding balance info */}
          {paymentData?.summary && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/30 rounded-xl border border-slate-900">
              {[
                { label: 'PO Value',    value: paymentData.summary.po_value,    color: 'text-slate-200' },
                { label: 'Paid So Far', value: paymentData.summary.total_paid,  color: 'text-emerald-400' },
                { label: 'Outstanding', value: paymentData.summary.outstanding, color: 'text-amber-400' },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{k.label}</div>
                  <div className={`text-sm font-semibold ${k.color}`}>{formatCurrency(k.value)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PAYMENT DATE *</label>
              <Input type="date" required value={mpDate} onChange={e => setMpDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">AMOUNT PAID (₹) *</label>
              <Input type="number" required min="1" step="0.01" value={mpAmount}
                onChange={e => setMpAmount(e.target.value)} placeholder="Enter amount" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PAYMENT MODE *</label>
              <Select value={mpMode} onChange={e => setMpMode(e.target.value)}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TRANSACTION / UTR / CHEQUE NO</label>
              <Input type="text" value={mpUtr} onChange={e => setMpUtr(e.target.value)}
                placeholder="e.g. UTR123456789" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">BANK NAME (optional)</label>
              <Input type="text" value={mpBank} onChange={e => setMpBank(e.target.value)}
                placeholder="e.g. HDFC Bank" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REFERENCE NUMBER</label>
              <Input type="text" value={mpRef} onChange={e => setMpRef(e.target.value)}
                placeholder="Internal reference" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REMARKS</label>
            <Input type="text" value={mpRemarks} onChange={e => setMpRemarks(e.target.value)}
              placeholder="Payment notes or description" />
          </div>

          {mpError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" /><span>{mpError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setManualPayModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={mpSubmitting}>
              {mpSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
