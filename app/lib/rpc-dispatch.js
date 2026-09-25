import { RPC_CONTRACT } from './rpc-contract.js';

const ADMIN_METHODS = new Set([
  'mergeProjects', 'inviteUserAdmin', 'sendInvite', 'listUsersAdmin', 'deleteUserAdmin',
  'setUserActiveAdmin', 'setUserRolesAdmin', 'updateUserDetailsAdmin', 'resetUserPasswordAdmin',
  'addCustomRole', 'setFeaturePermissions', 'setCompanySettings', 'setPOPrefix',
  'setDefaultPOGeneralTerms', 'setDefaultCCRecipients', 'setControlPolicies', 'updateProjectFinancials',
  'createApprovalWorkflow', 'updateApprovalWorkflow', 'deleteApprovalWorkflow',
  'cloneApprovalWorkflow', 'activateApprovalWorkflow', 'deactivateApprovalWorkflow', 'reorderWorkflowStages',
  'updateNumberSeriesConfig', 'createTDSSection', 'updateTDSSection', 'deleteTDSSection',
  'setDefaultTDS', 'toggleTDSStatus', 'setDefaultTDSConfig', 'inviteVendorPortalUserAdmin',
  'deduplicateSystemPayments', 'correctLegacyPOPaidAmount'
]);

function fail(message, status) {
  throw Object.assign(new Error(message), { status });
}

export async function dispatchRpc(api, body, request) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Invalid request body', 400);
  const { method, args = [] } = body;
  if (typeof method !== 'string' || !Object.hasOwn(RPC_CONTRACT, method)) fail('Method not allowed', 403);
  const contract = RPC_CONTRACT[method];
  if (!Array.isArray(args) || args.length > contract.args) fail('Invalid method arguments', 400);
  if (typeof api[method] !== 'function') fail('Method unavailable', 404);

  let session = null;
  const cookieToken = request.cookies?.get?.('lx_auth_token')?.value
    || (request.headers.get('cookie') || '').match(/(?:^|;\s*)lx_auth_token=([^;]*)/)?.[1];
  const token = request.headers.get('x-lwa-token')
    || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    || (cookieToken ? decodeURIComponent(cookieToken) : null);
  if (contract.access !== 'public') {
    if (!token) fail('AUTH:Not signed in', 401);
    try { session = await api.getMySession(token); }
    catch {
      try { session = await api.getVendorPortalSession(token); }
      catch { fail('AUTH:Invalid or expired token', 401); }
    }
    if (!session?.email || session.active === false) fail('AUTH:Invalid or expired token', 401);
    const vendor = session.user_type === 'vendor';
    if ((contract.access === 'internal' && vendor) || (contract.access === 'vendor' && !vendor)) {
      fail('AUTH:Forbidden for this account type', 403);
    }
    if (ADMIN_METHODS.has(method) && !(session.roles || []).some(role => role === 'admin' || role === 'director')) {
      fail('AUTH:Unauthorized - Admin/Director required', 403);
    }
  }

  const input = Array.from({ length: contract.args }, (_, index) => args[index]);
  if (contract.identity) { input[0] = session.email; input[1] = session.roles || []; }
  if (contract.replaceUser) input[0] = session;
  else if (contract.sessionIndex >= 0) input.splice(contract.sessionIndex, 0, session);
  if (contract.meta) input.push({
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'Unknown',
    ua: request.headers.get('user-agent') || 'Unknown'
  });
  if (method === 'logoutUser') input[0] = token;
  return api[method](...input);
}
