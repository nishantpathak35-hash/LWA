import { NextResponse } from 'next/server';
import * as api from '../../lib/api.js';

const ALLOWED_METHODS = new Set([
  'mergeProjects',
  'loginUser',
  'getMySession',
  'getBootData',
  'getBootBundle',
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
  'createPOFull',
  'updatePOFull',
  'deletePOFull',
  'submitPOForApproval',
  'approvePO',
  'getPOApprovalHistory',
  'addManualPayment',
  'getPOPayments',
  'inviteUserAdmin',
  'sendInvite',
  'listUsersAdmin',
  'deleteUserAdmin',
  'setUserActiveAdmin',
  'setUserRolesAdmin',
  'resetUserPasswordAdmin',
  'addCustomRole',
  'getPOPrefix',
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
  'getFinancialDiagnostics',
  'getSystemPaymentsDetail',
  'deduplicateSystemPayments'
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
      'getRemittanceQueue'
    ]);
    if (twoParamMethods.has(method) && args.length === 0) {
      args.push(undefined);
    }

    // Invoke the requested method with resolved session
    const result = await api[method](...args, session);
    return NextResponse.json(result);

  } catch (error) {
    console.error('RPC Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
