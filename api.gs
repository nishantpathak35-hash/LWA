/**
 * Luxeworx Atelier — Payment Tracker
 * api.gs  (v6.0 — Production Hardening Pass)
 *
 * Owns: HTTP entry points (doGet), Apps Script menu, token-gated
 *       API dispatcher, health/diagnostic runners.
 *
 * Auth contract (concurrency-safe):
 *   api(token, method, args)
 *     → _requireSession_(token)  [validates + returns session object]
 *     → fn.apply(null, args.concat([session]))
 *
 * NO global _CURRENT_AUTH_SESSION ever. Session is threaded as an
 * explicit last argument into every function that needs it.
 */

// ─── Web Entry Point ──────────────────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile(DASHBOARD_HTML_FILE)
    .setTitle('Luxeworx Atelier — Payment Tracker');
}

// ─── Spreadsheet Menu ─────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Luxeworx')
    .addItem('Open Dashboard',           'openDashboard')
    .addItem('New Payment Request',      'openNewPaymentRequest')
    .addSeparator()
    .addItem('Migrate Vendor Master',    'initializeVendorMasterMigrationMenu')
    .addItem('Health Check (log)',       'testSetup')
    .addItem('Migrate old PR data',      'migratePRStoreMenu')
    .addToUi();
}

function showDashboard() { return openDashboard(); }

function openDashboard() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile(DASHBOARD_HTML_FILE)
      .setTitle('Payment Tracker').setWidth(1600).setHeight(900),
    'Payment Tracking Dashboard'
  );
}

function openNewPaymentRequest() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile(DASHBOARD_HTML_FILE)
      .append('<script>window.__INITIAL_VIEW="newPayment";<\/script>')
      .setTitle('New Payment Request').setWidth(1400).setHeight(800),
    'New Payment Request'
  );
}

function migratePRStoreMenu() {
  try {
    var res = migratePRStore();
    SpreadsheetApp.getUi().alert(res.msg||'Done.');
  } catch(e) { SpreadsheetApp.getUi().alert('Migration error: ' + e.message); }
}

function initializeVendorMasterMigrationMenu() {
  try {
    var res = initializeVendorMasterMigration();
    SpreadsheetApp.getUi().alert(res.msg||'Done.');
  } catch(e) { SpreadsheetApp.getUi().alert('Migration error: ' + e.message); }
}

function install() {
  var ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error('Open your sheet first.');
  Logger.log('OK: ' + ss.getName());
  return 'OK — reload sheet and click Luxeworx → Open Dashboard';
}

// ─── Editor Diagnostics ───────────────────────────────────────────────────────
function ping() {
  Logger.log('pong — script loaded and authorized');
}

function testSetup() {
  var ss;
  try {
    ss = _ss();
    Logger.log('[OK]  Spreadsheet: ' + ss.getName() + ' (' + ss.getId() + ')');
  } catch(e) {
    Logger.log('[FAIL] Spreadsheet: ' + e.message);
    return;
  }

  [SHEETS.PO, SHEETS.RANGE, SHEETS.USERS].forEach(function(name) {
    var sh = ss.getSheetByName(name);
    sh ? Logger.log('[OK]  Sheet: "'+name+'" ('+Math.max(0,sh.getLastRow()-1)+' rows)')
       : Logger.log('[WARN] Sheet missing: "'+name+'"');
  });

  var prSh = ss.getSheetByName(SHEETS.PR);
  Logger.log(prSh
    ? '[OK]  Payment Tracker: '+(Math.max(0,prSh.getLastRow()-1))+' records'
    : '[INFO] Payment Tracker sheet not yet created — will be auto-created on first use.');

  var props = PropertiesService.getScriptProperties().getProperties();
  Logger.log('[INFO] SHEET_ID='+(props['SHEET_ID']?'set':'not set')+
             '  ROLES='+(props['ROLES']?'set':'not set')+
             '  PR_STORE(legacy)='+(props['PR_STORE']?'PRESENT — run migratePRStore()':'absent'));

  try {
    var uSh = _ensureUsersSheet_();
    Logger.log('[OK]  Users: '+uSh.getName()+' ('+(Math.max(0,uSh.getLastRow()-1))+' users)');
  } catch(e) { Logger.log('[WARN] Users: '+e.message); }

  try {
    var poSh = _sheet(SHEETS.PO);
    var hdr  = _detectHeaderRow(poSh,['po','vendor','value','paid'],[],10);
    Logger.log('[OK]  PO header row: '+hdr);
  } catch(e) { Logger.log('[WARN] PO header: '+e.message); }

  Logger.log('════ testSetup complete. Deploy → Manage deployments → copy /exec URL.');
}

// ─── API Allowlist ────────────────────────────────────────────────────────────
var API_ALLOWLIST = {
  // Boot
  getBootData:true, getBootBundle:true,
  // Dashboard
  getDashboardKPIs:true, getMasterData:true, getProjectDetails:true,
  updateProjectFinancials:true, getCommandCenter:true, getMasterHealth:true,
  // Vendors
  getVendorsList:true, getAllVendors:true, getVendorSummary:true,
  getVendorByName:true, getVendorByPO:true, getPOsByVendor:true,
  addVendor:true, updateVendor:true,
  findVendorMasterRecord:true, migrateLegacyVendor:true,
  initializeVendorMasterMigration:true,
  detectDuplicatePO:true,
  // Payments
  createPaymentRequest:true, listPaymentRequests:true,
  approvePaymentRequest:true, transitionPaymentWorkflow:true,
  setPaymentHold:true, updatePaymentInline:true,
  deletePaymentRequest:true,
  detectDuplicatePayment:true, getPaymentReportRows:true,
  repairPaymentRequestData:true,
  // Approval workflow
  getApprovalQueue:true, getRemittanceQueue:true,
  approvePaymentWithChain:true, getApprovalChain:true,
  checkApprovalAuthority:true, getApprovalHistory:true,
  bulkApprovePayments:true, bulkRejectPayments:true,
  bulkRemitPayments:true,
  reconcileRemittedPaymentsToPOLedger:true, getFinancialImpactSummary:true,
  // POs
  listPOs:true, listPOsJson:true, diagPOs:true, getPODetails:true,
  createPO:true, generatePOPdf:true, sendPOToVendor:true,
  createPOFull:true, updatePOFull:true, getPOFull:true, listPOFullHeaders:true,
  // Projects
  setProjectBudget:true, getProjectBudgets:true, checkBudgetAlert:true,
  // Invoices
  listInvoices:true, matchInvoiceToPO:true,
  // GRN
  createGRN:true, listGRNs:true,
  // Users / Auth (self)
  getCurrentUser:true, getRoleConfig:true, getUserPermissions:true,
  changeMyPassword:true,
  // Reports
  getTDSRegisterReport:true, getVendorTDSReport:true, getProjectTDSReport:true,
  getApprovalAuditReport:true, getDayWiseApprovalReport:true,
  // Audit / logs
  listAuditLog:true, getWorkflowTimeline:true,
  // Notifications / comments
  getLiveUpdates:true, getUpdates:true, getNotificationCenter:true,
  addComment:true, getComments:true, deleteComment:true,
  getVersionHistory:true, restoreVersion:true,
  // Documents
  listDocumentLinks:true, addDocumentLink:true,
  uploadDocument:true, listDocuments:true, deleteDocument:true,
  // Permissions
  getFeaturePermissions:true, setFeaturePermissions:true,
  addCustomRole:true,
  // Misc
  getZohoApiStatus:true, diagnoseImport:true,
  sendEmailNotification:true, sendSMSNotification:true,
  sendPaymentAdvice:true,
  enable2FA:true, verify2FA:true, disable2FA:true,
  addIPWhitelist:true,
  addIndirectCategory:true, listIndirectCategories:true,
  createIndirectPayment:true, listIndirectPayments:true,
  getIndirectPaymentsBundle:true, approveIndirectPayment:true,
  sendInvite:true, acceptInvite:true,
  // Column config / diagnostics
  getSheetDiagnostics:true, getColumnConfig:true, setColumnConfig:true,
  clearAllCaches:true, clearCacheAndGetMaster:true,
  healthCheck:true, testConnection:true,
  migratePRStore:true,
  // Admin (director-only; each *Admin fn enforces its own _requireAdmin_ check)
  listUsersAdmin:true, inviteUserAdmin:true, deleteUserAdmin:true,
  setUserRolesAdmin:true, setUserRoleAdmin:true,
  setUserActiveAdmin:true, resetUserPasswordAdmin:true,
  unlockAccountAdmin:true, cleanupExpiredSessions:true,
  setRoleConfig:true, getPOPrefix:true, setPOPrefix:true
};

// ─── Token-Gated Dispatcher ───────────────────────────────────────────────────
/**
 * api(token, method, args)
 *
 * Concurrency-safe: _requireSession_(token) creates a LOCAL session object
 * that is passed explicitly into every function. No global mutable auth state.
 *
 * Admin methods (name ends in "Admin") AND changeMyPassword receive the raw
 * token as their first argument so they can re-validate inside themselves.
 * All other methods receive (…args, session) — session is always the LAST arg.
 */
function api(token, method, args) {
  // 1 — Auth
  var session;
  try { session = _requireSession_(token); }
  catch (e) { throw new Error('AUTH:' + e.message); }

  // 2 — Allowlist
  if (!API_ALLOWLIST[method])
    throw new Error('Unknown or disallowed method: ' + method);

  // 3 — Resolve function
  args = Array.isArray(args) ? args : [];
  var fn = this[method];
  if (typeof fn !== 'function')
    throw new Error('Method not implemented: ' + method);

  // 4 — Dispatch
  try {
    if (/Admin$/.test(method) || method === 'changeMyPassword') {
      // Admin methods: (token, …args, session)
      return fn.apply(null, [token].concat(args).concat([session]));
    } else {
      // Regular methods: (…args, session)
      return fn.apply(null, args.concat([session]));
    }
  } catch (e) {
    _logError('api() method "'+method+'" failed', { error: e.message });
    throw e;
  }
}
