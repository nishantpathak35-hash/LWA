// api.js — Barrel re-exporter
// All domain functions are split into app/lib/api/<domain>.js
// This file provides a unified import surface for backward compatibility.

export { logAudit } from './api/core.js';
export { loginUser, getMySession, inviteUserAdmin, sendInvite, listUsersAdmin, listActiveUsers, deleteUserAdmin, setUserActiveAdmin, setUserRolesAdmin, resetUserPasswordAdmin, addCustomRole, logoutUser, acceptInvite } from './api/auth.js';
export { getBootData, getBootBundle, clearCacheAndGetMaster, getDashboardKPIs, getMasterData, getFinancialDiagnostics, getSystemPaymentsDetail, deduplicateSystemPayments, getMasterHealth } from './api/dashboard.js';
export { getProjectDetails, updateProjectFinancials, getProjectFinancialSummary, mergeProjects } from './api/projects.js';
export { addVendor, updateVendor, getVendorByName, getVendorSummary } from './api/vendors.js';
export { listPOsJson, getPOsByVendor, savePO, updatePOFull, deletePOFull, submitPOForApproval, approvePO, addPOComment, getPOApprovalHistory, addManualPayment, getPOPayments, getPOPrefix, getNextPONumber, setPOPrefix, sendPOToVendor, sendPOToVendorWhatsApp, getPOFullDetails, getPOItems, correctLegacyPOPaidAmount } from './api/purchase-orders.js';
export { listPaymentRequests, getApprovalQueue, getRemittanceQueue, getCommandCenter, sendPaymentAdvice, sendPaymentAdviceWhatsApp, createPaymentRequest, updatePaymentRequest, bulkApprovePayments, bulkRejectPayments, bulkRemitPayments, approvePaymentWithChain, transitionPaymentWorkflow, setPaymentHold, getApprovalHistory, reconcileRemittedPaymentsToPOLedger, deleteRemittedPayment, addPaymentComment } from './api/payments.js';
export { getFeaturePermissions, setFeaturePermissions, clearAllCaches, getCompanySettings, setCompanySettings, getDefaultCCRecipients, setDefaultCCRecipients } from './api/settings.js';
export { getAuditLogs, getPaymentReportRows, getTDSRegisterReport, getVendorTDSReport, getProjectTDSReport, getApprovalAuditReport, getDayWiseApprovalReport } from './api/reports.js';
export { uploadAttachment, getAttachments, deleteAttachment } from './api/attachments.js';
export { getInvoices, saveInvoice } from './api/invoices.js';
export { setUserWhatsAppAdmin, updateUserDetailsAdmin } from './api/auth.js';
export { sendInternalWhatsApp, whatsappPO, whatsappPaymentAdvice } from './api/whatsappService.js';
export { getApprovalWorkflows, getApprovalWorkflow, createApprovalWorkflow, updateApprovalWorkflow, deleteApprovalWorkflow, cloneApprovalWorkflow, activateApprovalWorkflow, deactivateApprovalWorkflow, reorderWorkflowStages } from './api/workflow.js';
export { getNumberSeriesConfig, getAllNumberSeriesConfigs, updateNumberSeriesConfig, previewNumberSeries, getNextSeriesNumber } from './api/number-series.js';
export { getTDSSections, getAllTDSSections, createTDSSection, updateTDSSection, deleteTDSSection, setDefaultTDS, toggleTDSStatus, getDefaultTDSConfig, setDefaultTDSConfig } from './api/tds.js';
