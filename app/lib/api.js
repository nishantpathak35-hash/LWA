// api.js — Barrel re-exporter
// All domain functions are split into app/lib/api/<domain>.js
// This file provides a unified import surface for backward compatibility.

export { logAudit } from './api/core.js';
export { loginUser, getMySession, inviteUserAdmin, sendInvite, listUsersAdmin, deleteUserAdmin, setUserActiveAdmin, setUserRolesAdmin, resetUserPasswordAdmin, addCustomRole, logoutUser, acceptInvite } from './api/auth.js';
export { getBootData, getBootBundle, clearCacheAndGetMaster, getDashboardKPIs, getMasterData, getFinancialDiagnostics, getSystemPaymentsDetail, deduplicateSystemPayments, getMasterHealth } from './api/dashboard.js';
export { getProjectDetails, updateProjectFinancials, getProjectFinancialSummary, mergeProjects } from './api/projects.js';
export { addVendor, updateVendor, getVendorByName, getVendorSummary } from './api/vendors.js';
export { listPOsJson, getPOsByVendor, savePO, updatePOFull, deletePOFull, submitPOForApproval, approvePO, addPOComment, getPOApprovalHistory, addManualPayment, getPOPayments, getPOPrefix, getNextPONumber, setPOPrefix, sendPOToVendor, getPOFullDetails, getPOItems, correctLegacyPOPaidAmount } from './api/purchase-orders.js';
export { listPaymentRequests, getApprovalQueue, getRemittanceQueue, getCommandCenter, sendPaymentAdvice, createPaymentRequest, bulkApprovePayments, bulkRejectPayments, bulkRemitPayments, approvePaymentWithChain, transitionPaymentWorkflow, setPaymentHold, getApprovalHistory, reconcileRemittedPaymentsToPOLedger, deleteRemittedPayment, addPaymentComment } from './api/payments.js';
export { getFeaturePermissions, setFeaturePermissions, clearAllCaches, getCompanySettings, setCompanySettings } from './api/settings.js';
export { listAuditLog, getPaymentReportRows, getTDSRegisterReport, getVendorTDSReport, getProjectTDSReport, getApprovalAuditReport, getDayWiseApprovalReport } from './api/reports.js';
export { uploadAttachment, getAttachments, deleteAttachment } from './api/attachments.js';