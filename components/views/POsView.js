'use client';

import { toast } from '../ui/Toast';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, Button, Input, Select, Dialog, Textarea
} from '../ui/core';
import AttachmentsSection from '../ui/AttachmentsSection';
import { formatCurrency, formatDate } from '../../app/lib/utils';
import {
  PlusCircle, Search, Receipt, Send, ShieldAlert, Plus, Trash2, Edit2,
  Eye, CheckCircle, XCircle, Clock, History, Wallet, ChevronDown, ChevronUp,
  AlertTriangle, Copy, Download
} from 'lucide-react';

import POFilters from './purchase-orders/POFilters';
import POListTable from './purchase-orders/POListTable';
import POFormModal from './purchase-orders/POFormModal';
import POApprovalModal from './purchase-orders/POApprovalModal';
import POHistoryModal from './purchase-orders/POHistoryModal';
import POManualPaymentModal from './purchase-orders/POManualPaymentModal';
import { GST_RATES, TDS_SECTIONS, PAYMENT_MODES, UOM_OPTIONS } from './purchase-orders/po-constants';

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

function getVendorSelectValue(vendor, index = 0) {
  if (vendor?.recordId !== undefined && vendor?.recordId !== null) return `id:${vendor.recordId}`;
  return `legacy:${vendor?.code || ''}:${vendor?.name || ''}:${index}`;
}

function findVendorBySelection(vendors, selection) {
  const indexed = vendors.map((vendor, index) => ({ vendor, index }));
  return indexed.find(({ vendor, index }) => getVendorSelectValue(vendor, index) === selection)?.vendor || null;
}

function findVendorSelection(vendors, code, name) {
  const indexed = vendors.map((vendor, index) => ({ vendor, index }));
  const match = indexed.find(({ vendor }) => vendor.code === code && (!name || vendor.name === name || vendor.legalName === name))
    || indexed.find(({ vendor }) => name && (vendor.name === name || vendor.legalName === name))
    || indexed.find(({ vendor }) => vendor.code === code)
    || indexed[0];
  return match ? getVendorSelectValue(match.vendor, match.index) : '';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function POsView() {
  const { pos, setPos, vendors, projects, user, call, refreshData } = useAppState();
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
  const canApprove   = isDirector || isAdmin || isFinance || isProcurement;
  const canManualPay = isAccountant || isAdmin; // Manual Payment: Accountant role only (+ Admin)

  // ── Derived Totals ──
  const summaryTotals = items.reduce((acc, item) => {
    const { gross, gstAmt, total } = calcItem(item);
    return { subtotal: acc.subtotal + gross, gstTotal: acc.gstTotal + gstAmt, grandTotal: acc.grandTotal + total };
  }, { subtotal: 0, gstTotal: 0, grandTotal: 0 });

  const tdsAmount = Math.round(summaryTotals.subtotal * (tdsPct / 100));
  const netPayable = summaryTotals.grandTotal - tdsAmount;

  // ── Filtered POs ──
  // ── Filtered POs ──
  const filteredPOs = useMemo(() => {
    return pos.filter(po => {
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
  }, [pos, searchQuery, poDateSortDir]);

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
        const localPO = pos.find(p => p.po_no === poToLoad) || {};
        const [itemsRes, paymentsRes] = await Promise.all([
          call('getPOItems', poToLoad),
          call('getPOPayments', poToLoad)
        ]);
        const poDetails = { ...localPO, items: itemsRes || [] };
        if (poDetails) {
          setEditingPoNo(poToLoad);
          setEditingPO(poDetails);
          setPoNo(poDetails.po_no);
          setProject(poDetails.project || '');
          setVendorCode(findVendorSelection(vendors, poDetails.vendor_key || '', poDetails.vendor_name || ''));
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
      setVendorCode(findVendorSelection(vendors, vendors[0]?.code || '', vendors[0]?.name || ''));
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
      setPoNo('');
      setFormError(null);
      setModalOpen(true);
      call('getNextPONumber')
        .then(nextNo => setPoNo(nextNo || ''))
        .catch(() => setPoNo(''));
    }
  }, [call, projects, vendors]);

  // ── Keyboard shortcut: G → O → N opens New PO modal ──
  useEffect(() => {
    const handler = () => { if (canCreate) handleOpenModal(); };
    window.addEventListener('lx:new-po', handler);
    return () => window.removeEventListener('lx:new-po', handler);
  }, [canCreate, handleOpenModal]);

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
    if (!project) {
      setFormError('Please select a project.');
      return;
    }
    if (items.length === 0 || items.some(i => !i.description || Number(i.rate) <= 0)) {
      setFormError('All items must have a description and rate > 0.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const selectedVendor = findVendorBySelection(vendors, vendorCode);
      const selectedVendorCode = selectedVendor?.code || '';
      const payload = {
        poNo: poNo.trim(), project, poDate,
        expectedDeliveryDate: expectedDelivery,
        category, vendorCode: selectedVendorCode,
        vendor_key: selectedVendorCode,
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
        // Remove optimistic update for editing as well to be completely safe against render crashes
        result = await call('updatePOFull', editingPoNo, payload);
        let msg = `Purchase Order ${editingPoNo} updated.`;
        if (result?.newStatus && result.newStatus !== (editingPO?.approval_status || editingPO?.status)) {
          msg += `\n\nNote: PO value changed — status reset to ${result.newStatus} and requires re-approval.`;
        }
        toast(msg);
      } else {
        await call('savePO', payload);
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
      setVendorCode(findVendorSelection(vendors, details.vendor_key || '', details.vendor_name || ''));
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

  // Reloads the history trail in-place after a comment is added (no modal close needed)
  const handlePOCommentAdded = async (po) => {
    try {
      const h = await call('getPOApprovalHistory', po.po_no);
      setHistoryTrail(h || []);
    } catch (e) { console.error('Failed to reload PO history:', e); }
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
      {/* Header / Filters */}
      <POFilters
        canCreate={canCreate}
        filteredPOs={filteredPOs}
        handleExportPOs={handleExportPOs}
        handleOpenModal={handleOpenModal}
      />

      {/* PO Table */}
      <POListTable
        filteredPOs={filteredPOs}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        poDateSortDir={poDateSortDir} setPoDateSortDir={setPoDateSortDir}
        openActionMenuPoNo={openActionMenuPoNo} setOpenActionMenuPoNo={setOpenActionMenuPoNo}
        canCreate={canCreate} canApprove={canApprove} canManualPay={canManualPay} isAdmin={isAdmin}
        handleOpenModal={handleOpenModal} handleSubmitForApproval={handleSubmitForApproval}
        handleOpenApproval={handleOpenApproval} handleDuplicatePO={handleDuplicatePO} handleDeletePO={handleDeletePO}
        reloadPayments={reloadPayments} setMpDate={setMpDate} setMpAmount={setMpAmount}
        setMpMode={setMpMode} setMpUtr={setMpUtr} setMpBank={setMpBank} setMpRef={setMpRef}
        setMpRemarks={setMpRemarks} setMpError={setMpError} setManualPayModalOpen={setManualPayModalOpen}
        setEditingPoNo={setEditingPoNo}
        handleViewPOHistory={handleViewPOHistory}
        getStatusBadge={getStatusBadge} getPaymentStatusBadge={getPaymentStatusBadge}
      />


      <POFormModal
        modalOpen={modalOpen} setModalOpen={setModalOpen} editingPoNo={editingPoNo}
        projects={projects} editingPO={editingPO} calcItem={calcItem}
        tdsPct={tdsPct} setTdsPct={setTdsPct} getPaymentStatusBadge={getPaymentStatusBadge}
        poNo={poNo} setPoNo={setPoNo} project={project} setProject={setProject}
        vendorCode={vendorCode} setVendorCode={setVendorCode} vendors={vendors}
        poDate={poDate} setPoDate={setPoDate} expectedDelivery={expectedDelivery} setExpectedDelivery={setExpectedDelivery}
        category={category} setCategory={setCategory} items={items} handleItemChange={handleItemChange}
        handleRemoveItemLine={handleRemoveItemLine} handleAddItemLine={handleAddItemLine}
        tdsSection={tdsSection} handleTdsSectionChange={handleTdsSectionChange}
        gstMode={gstMode} setGstMode={setGstMode} terms={terms} setTerms={setTerms}
        notes={notes} setNotes={setNotes} formError={formError} submitting={submitting}
        handleSavePO={handleSavePO} summaryTotals={summaryTotals} tdsAmount={tdsAmount}
        netPayable={netPayable} showPayments={showPayments} setShowPayments={setShowPayments}
        loadingPayments={loadingPayments} paymentData={paymentData} getVendorSelectValue={getVendorSelectValue}
        findVendorBySelection={findVendorBySelection}
      />
      
      <POApprovalModal
        approvalModalOpen={approvalModalOpen} setApprovalModalOpen={setApprovalModalOpen}
        approvalTarget={approvalTarget} approvalAction={approvalAction}
        approvalRemarks={approvalRemarks} setApprovalRemarks={setApprovalRemarks}
        approvingPO={approvingPO} handleConfirmApproval={handleApprovalSubmit}
      />
      
      <POHistoryModal
        historyModalOpen={historyModalOpen} setHistoryModalOpen={setHistoryModalOpen}
        historyTarget={historyTarget} loadingHistory={loadingHistory} historyTrail={historyTrail}
        onCommentAdded={handlePOCommentAdded}
      />
      
      <POManualPaymentModal
        manualPayModalOpen={manualPayModalOpen} setManualPayModalOpen={setManualPayModalOpen}
        editingPoNo={editingPoNo} mpDate={mpDate} setMpDate={setMpDate}
        mpAmount={mpAmount} setMpAmount={setMpAmount} mpMode={mpMode} setMpMode={setMpMode}
        mpUtr={mpUtr} setMpUtr={setMpUtr} mpBank={mpBank} setMpBank={setMpBank}
        mpRef={mpRef} setMpRef={setMpRef} mpRemarks={mpRemarks} setMpRemarks={setMpRemarks}
        mpError={mpError} mpSubmitting={mpSubmitting} handleAddManualPayment={handleManualPaySubmit}
      />

    </div>
  );
}

