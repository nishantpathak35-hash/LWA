const fs = require('fs');
let content = fs.readFileSync('components/views/POsView.js', 'utf8');
const retIdx = content.lastIndexOf('return (');
let hookCode = content.substring(0, retIdx);
hookCode = hookCode.replace('export default function POsView() {', 'export function usePOsState() {');
hookCode += `  return {
    searchQuery, setSearchQuery, openActionMenuPoNo, setOpenActionMenuPoNo, poDateSortDir, setPoDateSortDir,
    modalOpen, setModalOpen, editingPoNo, setEditingPoNo, editingPO, setEditingPO,
    poNo, setPoNo, project, setProject, vendorCode, setVendorCode, poDate, setPoDate, expectedDelivery, setExpectedDelivery,
    category, setCategory, gstMode, setGstMode, items, setItems, tdsSection, setTdsSection, tdsPct, setTdsPct,
    terms, setTerms, notes, setNotes, formError, setFormError, submitting, setSubmitting,
    approvalModalOpen, setApprovalModalOpen, approvalTarget, setApprovalTarget, approvalAction, setApprovalAction,
    approvalRemarks, setApprovalRemarks, approvingPO, setApprovingPO,
    historyModalOpen, setHistoryModalOpen, historyTrail, setHistoryTrail, loadingHistory, setLoadingHistory, historyTarget, setHistoryTarget,
    paymentData, setPaymentData, loadingPayments, setLoadingPayments, showPayments, setShowPayments,
    manualPayModalOpen, setManualPayModalOpen, mpDate, setMpDate, mpAmount, setMpAmount, mpMode, setMpMode,
    mpUtr, setMpUtr, mpBank, setMpBank, mpRef, setMpRef, mpRemarks, setMpRemarks, mpError, setMpError, mpSubmitting, setMpSubmitting,
    summaryTotals, tdsAmount, netPayable, filteredPOs, handleExportPOs, handleOpenModal, handleDeletePO, handleOpenApproval,
    handleOpenHistory, handleApproveSubmit, requestPayment, handleOpenManualPay, handleManualPaySubmit, sendToVendor,
    addItemRow, removeItemRow, handleItemChange, handleSubmit,
    roles, isProcurement, isAdmin, isDirector, isFinance, isAccountant, canCreate, canApprove, canManualPay
  };
}
`;
// Fix relative imports in hook
hookCode = hookCode.replace(/'\.\.\/ui\//g, "'../../ui/");
hookCode = hookCode.replace(/'\.\.\/StateProvider'/g, "'../../StateProvider'");
hookCode = hookCode.replace(/'\.\.\/\.\.\/app\/lib\//g, "'../../../app/lib/");
fs.writeFileSync('components/views/purchase-orders/usePOsState.js', hookCode);

// Now for POsView.js
let viewCode = `// POsView Shell Component
'use client';

import React from 'react';
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
import { usePOsState } from './purchase-orders/usePOsState';

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

export default function POsView() {
  const state = usePOsState();
  const { vendors, projects } = useAppState();
  
  const {
    searchQuery, setSearchQuery, openActionMenuPoNo, setOpenActionMenuPoNo, poDateSortDir, setPoDateSortDir,
    modalOpen, setModalOpen, editingPoNo, setEditingPoNo, editingPO, setEditingPO,
    poNo, setPoNo, project, setProject, vendorCode, setVendorCode, poDate, setPoDate, expectedDelivery, setExpectedDelivery,
    category, setCategory, gstMode, setGstMode, items, setItems, tdsSection, setTdsSection, tdsPct, setTdsPct,
    terms, setTerms, notes, setNotes, formError, setFormError, submitting, setSubmitting,
    approvalModalOpen, setApprovalModalOpen, approvalTarget, setApprovalTarget, approvalAction, setApprovalAction,
    approvalRemarks, setApprovalRemarks, approvingPO, setApprovingPO,
    historyModalOpen, setHistoryModalOpen, historyTrail, setHistoryTrail, loadingHistory, setLoadingHistory, historyTarget, setHistoryTarget,
    paymentData, setPaymentData, loadingPayments, setLoadingPayments, showPayments, setShowPayments,
    manualPayModalOpen, setManualPayModalOpen, mpDate, setMpDate, mpAmount, setMpAmount, mpMode, setMpMode,
    mpUtr, setMpUtr, mpBank, setMpBank, mpRef, setMpRef, mpRemarks, setMpRemarks, mpError, setMpError, mpSubmitting, setMpSubmitting,
    summaryTotals, tdsAmount, netPayable, filteredPOs, handleExportPOs, handleOpenModal, handleDeletePO, handleOpenApproval,
    handleOpenHistory, handleApproveSubmit, requestPayment, handleOpenManualPay, handleManualPaySubmit, sendToVendor,
    addItemRow, removeItemRow, handleItemChange, handleSubmit,
    canCreate, canApprove, canManualPay
  } = state;

  return (
`;
viewCode += content.substring(retIdx + 8);
fs.writeFileSync('components/views/POsView.js', viewCode);
console.log('Successfully refactored POsView.js');
