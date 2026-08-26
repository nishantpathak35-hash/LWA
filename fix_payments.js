const fs = require('fs');

let content = fs.readFileSync('components/views/PaymentsView.js', 'utf8');
const retIdx = content.lastIndexOf('return (');
let hookCode = content.substring(0, retIdx);

hookCode = hookCode.replace('export default function PaymentsView() {', 'export function usePaymentsState() {');

// Add the return object
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
    canRequest, canApprove, canRemit
  };
}
`;

// Now strip ALL imports from hookCode since we'll prepend them manually.
hookCode = hookCode.replace(/^import\s+.*?;\n/gm, '');
hookCode = hookCode.replace(/^import\s+{[\s\S]*?}\s+from\s+.*?;\n/gm, '');

// Prepend the correct imports
hookCode = `import { toast } from '../../ui/Toast';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppState } from '../../StateProvider';
import { isPOEligibleForPayment } from '../../../app/lib/poEligibility';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
` + hookCode;

fs.writeFileSync('components/views/payments/usePaymentsState.js', hookCode);
console.log('Fixed usePaymentsState.js');
