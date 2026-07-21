import { NextResponse } from 'next/server';
import * as api from '../../lib/api.js';

const ALLOWED_METHODS = new Set([
  'mergeProjects',
  'loginUser',
  'getMySession',
  'getBootData',
  'getBootBundle',
  'getVendorsOnly',
  'getPOsOnly',
  'getPaymentsOnly',
  'clearCacheAndGetMaster',
  'getDashboardKPIs',
  'getMasterData',
  'getProjectDetails',
  'addVendor',
  'updateVendor',
  'getVendorByName',
  'getVendorSummary',
  'listPOsJson',
  'getPOsByVendor',
  'listPaymentRequests',
  'getApprovalQueue',
  'getRemittanceQueue',
  'getCommandCenter',
  'getMasterHealth',
  'updatePOFull',
  'deletePOFull',
  'submitPOForApproval',
  'approvePO',
  'addPOComment',
  'getPOApprovalHistory',
  'addManualPayment',
  'addPaymentComment',
  'getPOPayments',
  'inviteUserAdmin',
  'sendInvite',
  'listUsersAdmin',
  'listActiveUsers',
  'deleteUserAdmin',
  'setUserActiveAdmin',
  'setUserRolesAdmin',
  'updateUserDetailsAdmin',
  'resetUserPasswordAdmin',
  'addCustomRole',
  'getPOPrefix',
  'getNextPONumber',
  'setPOPrefix',
  'getCompanySettings',
  'setCompanySettings',
  'getFeaturePermissions',
  'setFeaturePermissions',
  'clearAllCaches',
  'logoutUser',
  'updateProjectFinancials',
  'acceptInvite',
  'sendPaymentAdvice',
  'sendPOToVendor',
  'createPaymentRequest',
  'bulkApprovePayments',
  'bulkRejectPayments',
  'bulkRemitPayments',
  'approvePaymentWithChain',
  'updatePaymentRequest',
  'getDefaultCCRecipients',
  'setDefaultCCRecipients',
  'transitionPaymentWorkflow',
  'setPaymentHold',
  'getApprovalHistory',
  'getProjectFinancialSummary',
  'reconcileRemittedPaymentsToPOLedger',
  'listAuditLog',
  'getPaymentReportRows',
  'getTDSRegisterReport',
  'getVendorTDSReport',
  'getProjectTDSReport',
  'getApprovalAuditReport',
  'getDayWiseApprovalReport',
  'getPOFullDetails',
  'getPOItems',
  'correctLegacyPOPaidAmount',
  'deleteRemittedPayment',
  'deletePaymentRequest',
  'getFinancialDiagnostics',
  'getSystemPaymentsDetail',
  'deduplicateSystemPayments',
  'savePO',
  'uploadAttachment',
  'getAttachments',
  'deleteAttachment',
  'getApprovalWorkflows',
  'getApprovalWorkflow',
  'createApprovalWorkflow',
  'updateApprovalWorkflow',
  'deleteApprovalWorkflow',
  'cloneApprovalWorkflow',
  'activateApprovalWorkflow',
  'deactivateApprovalWorkflow',
  'reorderWorkflowStages',
  'acquireDocumentLock',
  'releaseDocumentLock',
  'getActiveLocks',
  'getNumberSeriesConfig',
  'getAllNumberSeriesConfigs',
  'updateNumberSeriesConfig',
  'previewNumberSeries',
  'getNextSeriesNumber',
  'getTDSSections',
  'getAllTDSSections',
  'createTDSSection',
  'updateTDSSection',
  'deleteTDSSection',
  'setDefaultTDS',
  'toggleTDSStatus',
  'getDefaultTDSConfig',
  'setDefaultTDSConfig',
  'submitDPR',
  'listDPRs',
  'getDPR',
  'updateDPR',
  'deleteDPR',
  'listTemplates',
  'createTemplate',
  'updateTemplate',
  'deleteTemplate',
  'getDPRSettings',
  'saveDPRSettings',
  'listSchedules',
  'saveSchedule',
  'getWPRAggregation',
  'createWPRReport',
  'listWPRReports',
  'getWPRReport',
  'deleteWPRReport'
]);

export async function POST(request) {
  try {
    const body = await request.json();
    const { method, args = [] } = body;

    if (!method) {
      return NextResponse.json({ error: `Method missing` }, { status: 400 });
    }

    if (!ALLOWED_METHODS.has(method)) {
      console.warn(`Blocked call to forbidden or untracked method: ${method}`);
      return NextResponse.json({ error: `Method not allowed` }, { status: 403 });
    }

    if (typeof api[method] !== 'function') {
      console.warn(`Unimplemented method requested: ${method}`);
      return NextResponse.json({ error: `Unknown method: ${method}` }, { status: 404 });
    }

    // Resolve user session from custom header (to avoid Vercel SSO Authorization override)
    let session = null;
    try {
      let token = request.headers.get('x-lwa-token') || request.headers.get('X-LWA-Token');
      
      // Fallback to Bearer token if present and not overwritten by Vercel SSO JWT
      if (!token) {
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const possibleToken = authHeader.substring(7);
          if (!possibleToken.startsWith('eyJ')) {
            token = possibleToken;
          }
        }
      }

      if (token) {
        session = await api.getMySession(token);
      }
    } catch (e) {
      console.error('RPC session lookup failed. Token resolution error:', e);
    }

    // Pad arguments for 2-parameter methods if client didn't supply filters/payload
    const twoParamMethods = new Set([
      'listPaymentRequests',
      'getVendorSummary',
      'listPOsJson',
      'listAuditLog',
      'getPaymentReportRows',
      'getApprovalQueue',
      'getRemittanceQueue',
      'getVendorsOnly',
      'getPOsOnly',
      'getPaymentsOnly'
    ]);
    if (twoParamMethods.has(method) && args.length === 0) {
      args.push(undefined);
    }

    if (method === 'loginUser') {
      const ip = request.headers.get('x-forwarded-for') || request.ip || 'Unknown';
      const ua = request.headers.get('user-agent') || 'Unknown';
      args.push({ ip, ua });
    }

    // Invoke the requested method with resolved session
    const result = await api[method](...args, session);
    return NextResponse.json(result === undefined ? { success: true } : result);

  } catch (error) {
    console.error('RPC Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
