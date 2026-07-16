const fs = require('fs');
let content = fs.readFileSync('components/views/PaymentsView.js', 'utf8');
const retIdx = content.lastIndexOf('return (');
let hookCode = content.substring(0, retIdx);
hookCode = hookCode.replace('export default function PaymentsView() {', 'export function usePaymentsState() {');
hookCode += `  return {
    searchQuery, setSearchQuery, activeTab, setActiveTab,
    requestModalOpen, setRequestModalOpen, vendorCode, setVendorCode, poNo, setPoNo, grossAmount, setGrossAmount,
    tdsAmount, setTdsAmount, invoiceRef, setInvoiceRef, remarks, setRemarks, formError, setFormError, submitting, setSubmitting,
    viewModalOpen, setViewModalOpen, viewPayment, setViewPayment, actionModalOpen, setActionModalOpen, actionType, setActionType,
    actionRemarks, setActionRemarks, historyModalOpen, setHistoryModalOpen, approvalHistory, setApprovalHistory,
    holdModalOpen, setHoldModalOpen, holdRemarks, setHoldRemarks, remitModalOpen, setRemitModalOpen,
    remitUtr, setRemitUtr, remitDate, setRemitDate, remitBank, setRemitBank, deleteModalOpen, setDeleteModalOpen,
    deleteReason, setDeleteReason, emailModalOpen, setEmailModalOpen, emailOverride, setEmailOverride,
    bulkApproveModalOpen, setBulkApproveModalOpen, bulkSelectedIds, setBulkSelectedIds, bulkRemarks, setBulkRemarks,
    bulkRemitModalOpen, setBulkRemitModalOpen, bulkRemitUtr, setBulkRemitUtr, bulkRemitDate, setBulkRemitDate, bulkRemitBank, setBulkRemitBank,
    projectFilter, setProjectFilter, statusFilter, setStatusFilter, vendorFilter, setVendorFilter, dateRange, setDateRange,
    filteredPayments, filteredPending,
    handleOpenRequestModal, handleRequestSubmit, loadApprovalHistory, handleOpenViewModal, handleOpenActionModal,
    handleActionSubmit, handleOpenHoldModal, handleHoldSubmit, handleOpenRemitModal, handleRemitSubmit,
    handleOpenDeleteModal, handleDeleteSubmit, handleSendAdvice, handleBulkApproveSubmit, handleBulkRemitSubmit,
    toggleBulkSelection, isSelected,
    roles, isProcurement, isDirector, isFinance, isAccountant, isAdmin, canRequest, canApprove, canRemit
  };
}
`;
hookCode = hookCode.replace(/'\.\.\/ui\//g, "'../../ui/");
hookCode = hookCode.replace(/'\.\.\/StateProvider'/g, "'../../StateProvider'");
hookCode = hookCode.replace(/'\.\.\/\.\.\/app\/lib\//g, "'../../../app/lib/");
hookCode = hookCode.replace(/import \.\* from '\.\/payments\/.*';\n/g, '');

fs.writeFileSync('components/views/payments/usePaymentsState.js', hookCode);

let viewCode = `// PaymentsView Shell Component
'use client';

import { toast } from '../ui/Toast';
import React from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Select, Dialog } from '../ui/core';
import { formatCurrency, formatDate } from '../../app/lib/utils';
import { isPOEligibleForPayment } from '../../app/lib/poEligibility';
import { PlusCircle, Search, CreditCard, ShieldCheck, ShieldAlert, History, Ban, CheckSquare, Eye, Mail, AlertTriangle, Play, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import AttachmentsSection from '../ui/AttachmentsSection';

import PaymentsHeader from './payments/PaymentsHeader';
import PaymentFilters from './payments/PaymentFilters';
import PaymentListTable from './payments/PaymentListTable';
import PaymentFormModal from './payments/PaymentFormModal';
import PaymentApprovalModal from './payments/PaymentApprovalModal';
import PaymentHistoryModal from './payments/PaymentHistoryModal';
import { usePaymentsState } from './payments/usePaymentsState';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStageBadge(stage) {
  const s = String(stage || '').toLowerCase();
  if (s === 'remitted') return <Badge variant="success">Remitted</Badge>;
  if (s === 'approved') return <Badge variant="default" className="bg-blue-500/10 text-blue-400">Approved</Badge>;
  if (s === 'hold') return <Badge variant="warning">On Hold</Badge>;
  if (s === 'rejected') return <Badge variant="error">Rejected</Badge>;
  if (s === 'pending approval') return <Badge variant="warning">Pending Approval</Badge>;
  return <Badge variant="default">{stage || 'Draft'}</Badge>;
}

export default function PaymentsView() {
  const state = usePaymentsState();
  const { vendors, pos, projects } = useAppState();
  
  const {
    searchQuery, setSearchQuery, activeTab, setActiveTab,
    requestModalOpen, setRequestModalOpen, vendorCode, setVendorCode, poNo, setPoNo, grossAmount, setGrossAmount,
    tdsAmount, setTdsAmount, invoiceRef, setInvoiceRef, remarks, setRemarks, formError, setFormError, submitting, setSubmitting,
    viewModalOpen, setViewModalOpen, viewPayment, setViewPayment, actionModalOpen, setActionModalOpen, actionType, setActionType,
    actionRemarks, setActionRemarks, historyModalOpen, setHistoryModalOpen, approvalHistory, setApprovalHistory,
    holdModalOpen, setHoldModalOpen, holdRemarks, setHoldRemarks, remitModalOpen, setRemitModalOpen,
    remitUtr, setRemitUtr, remitDate, setRemitDate, remitBank, setRemitBank, deleteModalOpen, setDeleteModalOpen,
    deleteReason, setDeleteReason, emailModalOpen, setEmailModalOpen, emailOverride, setEmailOverride,
    bulkApproveModalOpen, setBulkApproveModalOpen, bulkSelectedIds, setBulkSelectedIds, bulkRemarks, setBulkRemarks,
    bulkRemitModalOpen, setBulkRemitModalOpen, bulkRemitUtr, setBulkRemitUtr, bulkRemitDate, setBulkRemitDate, bulkRemitBank, setBulkRemitBank,
    projectFilter, setProjectFilter, statusFilter, setStatusFilter, vendorFilter, setVendorFilter, dateRange, setDateRange,
    filteredPayments, filteredPending,
    handleOpenRequestModal, handleRequestSubmit, loadApprovalHistory, handleOpenViewModal, handleOpenActionModal,
    handleActionSubmit, handleOpenHoldModal, handleHoldSubmit, handleOpenRemitModal, handleRemitSubmit,
    handleOpenDeleteModal, handleDeleteSubmit, handleSendAdvice, handleBulkApproveSubmit, handleBulkRemitSubmit,
    toggleBulkSelection, isSelected,
    canRequest, canApprove, canRemit
  } = state;

  return (
`;
viewCode += content.substring(retIdx + 8);
fs.writeFileSync('components/views/PaymentsView.js', viewCode);
console.log('Successfully refactored PaymentsView.js');
