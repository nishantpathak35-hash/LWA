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
  // Clear all caches first to ensure fresh data
  try {
    _invalidateAllCaches_();
    Logger.log('[OK] Caches cleared.');
  } catch(e) { Logger.log('[WARN] Cache clearing failed: ' + e.message); }

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
    var hdr  = _detectHeaderRow(poSh,['po','vendor'],[],10);
    Logger.log('[OK]  PO header row: '+hdr);
    
    // Log all sheet names in spreadsheet
    var sheets = ss.getSheets();
    var sheetNames = sheets.map(function(s) { return s.getName(); });
    Logger.log('[DIAG] Sheets in spreadsheet: ' + sheetNames.join(', '));
    
    // Log headers and first 2 rows of _SystemPayments if it exists
    var sysSh = ss.getSheetByName('_SystemPayments') || ss.getSheetByName('System Payments');
    if (sysSh) {
      Logger.log('[DIAG] Found System Payments sheet: ' + sysSh.getName() + ' (' + sysSh.getLastRow() + ' rows)');
      if (sysSh.getLastRow() >= 1) {
        var sampleRows = sysSh.getRange(1, 1, Math.min(3, sysSh.getLastRow()), Math.min(10, sysSh.getLastColumn())).getValues();
        Logger.log('[DIAG] System Payments sample (rows 1-3): ' + JSON.stringify(sampleRows));
      }
    } else {
      Logger.log('[DIAG] No System Payments sheet found!');
    }
    
    // ── Payment Tracker column diagnostic ──────────────────────────────────
    try {
      var ptSh = ss.getSheetByName(SHEETS.PR);
      if (ptSh && ptSh.getLastColumn() > 0) {
        var ptHeaders = ptSh.getRange(1, 1, 1, ptSh.getLastColumn()).getValues()[0];
        Logger.log('[DIAG] Payment Tracker has ' + ptSh.getLastColumn() + ' columns (expected ' + _PR_NCOLS + ')');
        Logger.log('[DIAG] PT Headers: ' + ptHeaders.map(function(h,i){return (i+1)+':'+h;}).join(' | '));

        // Find where Remittance and Stage columns actually are
        var remCol = -1, stageCol = -1;
        ptHeaders.forEach(function(h, i) {
          var hn = String(h||'').trim();
          if (/remit/i.test(hn) && remCol === -1) remCol = i + 1;
          if (/stage|status/i.test(hn) && stageCol === -1) stageCol = i + 1;
        });
        Logger.log('[DIAG] PT Remittance column: actual=' + remCol + ' (schema expects ' + _PRC.REMIT + ')');
        Logger.log('[DIAG] PT Stage column: actual=' + stageCol + ' (schema expects ' + _PRC.STAGE + ')');

        // Count remitted PRs using the resolved column positions
        var allPRs = _prLoadAll();
        var remittedPRs = allPRs.filter(function(r){ return r.remittance === 'Remitted'; });
        Logger.log('[DIAG] Total PRs: ' + allPRs.length + ' | Remitted: ' + remittedPRs.length);
        remittedPRs.slice(0, 5).forEach(function(r) {
          var amt = r.dirAmt || r.finAmt || r.procAmt || r.amountRequested || 0;
          Logger.log('  [DIAG] Remitted PR: Vendor=' + r.vendor + ' PO=' + r.poNo + ' Amt=' + amt + ' PoKey=' + _poKey_(r.poNo));
        });
      } else {
        Logger.log('[DIAG] Payment Tracker sheet not found or empty!');
      }
    } catch(e) { Logger.log('[WARN] PT diagnostic failed: ' + e.message); }
  } catch(e) { Logger.log('[WARN] PO diagnostic failed: '+e.message); }

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

function runForensicDiag() {
  Logger.log('=== START FORENSIC DIAGNOSTICS ===');
  var ss = _ss();
  
  // 1. Log all sheet names
  var sheets = ss.getSheets();
  var sheetNames = sheets.map(function(s) { return s.getName(); });
  Logger.log('Sheet Names: ' + sheetNames.join(', '));
  
  // 2. Scan Payment Tracker
  var prList = (typeof _prLoadAll === 'function') ? _prLoadAll() : [];
  Logger.log('Payment Tracker records count: ' + prList.length);
  prList.forEach(function(pr) {
    if (pr.id == 1 || pr.id == 2) {
      Logger.log('[DIAG_PR_DETAIL] ' + JSON.stringify(pr));
    } else {
      Logger.log('PR: ID=' + pr.id + ' | Vendor=' + pr.vendor + ' | PO=' + pr.poNo + ' | Remit=' + pr.remittance);
    }
  });
  
  // 3. Scan System Payments
  var sysSh = ss.getSheetByName('_SystemPayments') || ss.getSheetByName('System Payments');
  if (sysSh) {
    Logger.log('Found System Payments: ' + sysSh.getName() + ' (' + sysSh.getLastRow() + ' rows)');
    if (sysSh.getLastRow() >= 1) {
      var data = sysSh.getRange(1, 1, sysSh.getLastRow(), sysSh.getLastColumn()).getValues();
      Logger.log('System Payments Headers: ' + JSON.stringify(data[0]));
      data.forEach(function(row, idx) {
        var rowStr = JSON.stringify(row);
        if (rowStr.indexOf('Aarvi') >= 0 || rowStr.indexOf('Co-offiz') >= 0 || rowStr.indexOf('Annapurna') >= 0 || 
            rowStr.indexOf('072') >= 0 || rowStr.indexOf('010') >= 0 || rowStr.indexOf('PR#') >= 0) {
          Logger.log('Row ' + (idx + 1) + ': ' + rowStr);
        }
      });
    }
  } else {
    Logger.log('System Payments sheet NOT found!');
  }
  
  // 4. Scan Baseline map
  var baseSh = ss.getSheetByName('POPaidBaseline') || ss.getSheetByName('_POPaidBaseline');
  if (baseSh) {
    Logger.log('Found Baseline Sheet: ' + baseSh.getName() + ' (' + baseSh.getLastRow() + ' rows)');
    var data = baseSh.getRange(1, 1, baseSh.getLastRow(), Math.min(5, baseSh.getLastColumn())).getValues();
    data.forEach(function(row, idx) {
      var rowStr = JSON.stringify(row);
      if (rowStr.indexOf('072') >= 0 || rowStr.indexOf('010') >= 0) {
        Logger.log('Baseline Row ' + (idx + 1) + ': ' + rowStr);
      }
    });
  }
  
  // 5. Run getVendorSummary
  Logger.log('Source of getVendorSummary: ' + getVendorSummary.toString());
  Logger.log('Source of getPOsByVendor: ' + getPOsByVendor.toString());
  
  var summary = getVendorSummary();
  summary.forEach(function(v) {
    if (v.vendorName.indexOf('Aarvi') >= 0 || v.vendorName.indexOf('Co-offiz') >= 0 || v.vendorName.indexOf('Annapurna') >= 0) {
      Logger.log('Vendor Summary for ' + v.vendorName + ':');
      Logger.log('  Total PO Value: ' + v.totalPOValue);
      Logger.log('  Total Paid: ' + v.totalPaid);
      Logger.log('  Total Payable: ' + v.totalPayable);
      Logger.log('  POs: ' + JSON.stringify(v.pos));
    }
  });
  
  Logger.log('=== END FORENSIC DIAGNOSTICS ===');
}
