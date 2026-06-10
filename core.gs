/**
 * Luxeworx Atelier — Payment Tracker
 * core.gs  (v6.0 — Production Hardening Pass)
 *
 * Owns: config, constants, sheet helpers, CacheService layer,
 *       validators, shared utilities, transaction scaffold,
 *       perf timing, structured responses, boot bundle.
 *
 * NOTHING in this file should import from other modules.
 * Everything else may import from here.
 */

// ─── Sheet-name registry ──────────────────────────────────────────────────────
var SHEETS = {
  SUMMARY:      'Summary',
  PO:           'PO Wise Details',
  DUMP:         'Dump',
  RANGE:        'Range',
  INVOICE:      'Invoice Sheet',
  PAYMENT:      'Payment Request',
  PROJECT:      'Project Wise Detail',
  PR:           'Payment Tracker',
  USERS:        '_Users',
  SYS_PAY:      '_SystemPayments',
  PO_BASE:      '_POPaidBaseline',
  VENDORS:      '_Vendors',
  AUDIT:        '_AuditLogs',
  APPROVAL_LOGS:'_ApprovalLogs',
  TDS_LEDGER:   '_TDSLedger',
  INVITES:      '_Invites'
};

var DASHBOARD_HTML_FILE = 'Dashboard';

// ─── Structured Response Helpers ──────────────────────────────────────────────
function _response(success, data, error, metadata) {
  return { success: success, data: data || null, error: error || null,
           metadata: metadata || {}, timestamp: new Date().toISOString() };
}
function _successResponse(data, metadata) { return _response(true, data, null, metadata); }
function _errorResponse(error, metadata)  { return _response(false, null, String(error), metadata); }

// ─── Performance Timer ────────────────────────────────────────────────────────
function _perf(startOrEnd, label) {
  if (arguments.length === 0) return Date.now();
  if (arguments.length === 1) return Date.now() - startOrEnd;
  var elapsed = Date.now() - startOrEnd;
  Logger.log('PERF: ' + label + ' — ' + elapsed + 'ms');
  return elapsed;
}

// ─── Logging ──────────────────────────────────────────────────────────────────
var LogLevel = { DEBUG:'DEBUG', INFO:'INFO', WARN:'WARN', ERROR:'ERROR' };

function _log(level, message, context) {
  var ts = new Date().toISOString();
  Logger.log('[' + ts + '] [' + level + '] ' + message +
             (context ? ' | ' + JSON.stringify(context) : ''));
  if (level === LogLevel.ERROR) {
    try {
      var sh = _ss().getSheetByName(SHEETS.AUDIT);
      if (sh) sh.appendRow([ts, level, message, JSON.stringify(context || {}), 'SYSTEM']);
    } catch (e) {}
  }
}
function _logDebug(m, c) { _log(LogLevel.DEBUG, m, c); }
function _logInfo(m, c)  { _log(LogLevel.INFO,  m, c); }
function _logWarn(m, c)  { _log(LogLevel.WARN,  m, c); }
function _logError(m, c) { _log(LogLevel.ERROR, m, c); }

// ─── Retry with exponential back-off ─────────────────────────────────────────
function _retryWithBackoff(fn, maxRetries, baseDelay) {
  maxRetries = maxRetries || 3;
  baseDelay  = baseDelay  || 1000;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try { return fn(); }
    catch (e) {
      if (attempt === maxRetries) throw e;
      var msg = String(e.message || e);
      if (msg.indexOf('Service') < 0 && msg.indexOf('timeout') < 0 &&
          msg.indexOf('busy') < 0     && msg.indexOf('limit')   < 0) throw e;
      Utilities.sleep(baseDelay * Math.pow(2, attempt));
    }
  }
}

// ─── Spreadsheet Access ───────────────────────────────────────────────────────
// Module-level cache — one Spreadsheet object per execution.
var _cachedSpreadsheet = null;

function _ss() {
  if (_cachedSpreadsheet) return _cachedSpreadsheet;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (id) {
    try { _cachedSpreadsheet = SpreadsheetApp.openById(id); return _cachedSpreadsheet; }
    catch (e) { throw new Error('Cannot open spreadsheet (SHEET_ID=' + id + '): ' + e.message); }
  }
  var ss = SpreadsheetApp.getActive();
  if (ss) { _cachedSpreadsheet = ss; return ss; }
  throw new Error('Spreadsheet not found. Set SHEET_ID in Script Properties, or run from the bound sheet.');
}

function _sheet(name, required) {
  var sh = _ss().getSheetByName(name);
  if (!sh) {
    if (required === false) return null;
    throw new Error('Sheet not found: "' + name + '".');
  }
  return sh;
}

function _sheetExists_(ss, name) { return !!(ss || _ss()).getSheetByName(name); }

function _ensureSheet_(name, headers) {
  var ss = _ss(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length) { sh.appendRow(headers); sh.setFrozenRows(1); }
  }
  return sh;
}

// ─── Health Check ─────────────────────────────────────────────────────────────
function _assertRequiredSheets_() {
  var ss;
  try { ss = _ss(); } catch (e) {
    return [{ sheet: 'SPREADSHEET', severity: 'CRITICAL', msg: e.message }];
  }
  var critical = [SHEETS.SUMMARY, SHEETS.PO, SHEETS.PROJECT, SHEETS.VENDORS];
  var optional  = [SHEETS.RANGE,  SHEETS.PR, SHEETS.AUDIT,   SHEETS.PAYMENT];
  var missing   = [];
  critical.forEach(function(n) {
    if (!ss.getSheetByName(n)) {
      missing.push({ sheet: n, severity: 'CRITICAL' });
      Logger.log('[HEALTH] CRITICAL — missing: "' + n + '"');
    }
  });
  optional.forEach(function(n) {
    if (!ss.getSheetByName(n)) missing.push({ sheet: n, severity: 'WARN' });
  });
  return missing;
}

// ─── Header Utilities ─────────────────────────────────────────────────────────
// Per-execution header-index cache — avoids repeated sheet reads.
var _headerCache_ = {};

function _headerMap(sheet, headerRow) {
  headerRow = headerRow || 1;
  var key   = sheet.getSheetId() + ':' + headerRow;
  if (_headerCache_[key]) return _headerCache_[key];
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  var hdrs = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var map  = {};
  hdrs.forEach(function(h, i) {
    var k = String(h == null ? '' : h).trim();
    if (k) map[k] = i + 1;
  });
  _headerCache_[key] = map;
  return map;
}

function _invalidateHeaderCache_(sheet) {
  if (!sheet) { _headerCache_ = {}; return; }
  var prefix = sheet.getSheetId() + ':';
  Object.keys(_headerCache_).forEach(function(k) {
    if (k.indexOf(prefix) === 0) delete _headerCache_[k];
  });
}

function _findCol(headerMap, candidates) {
  var norm = {};
  Object.keys(headerMap).forEach(function(k) {
    var nk = String(k).toLowerCase().replace(/\./g,'').replace(/\s+/g,' ').trim();
    norm[nk] = headerMap[k];
  });
  for (var i = 0; i < candidates.length; i++) {
    var key = String(candidates[i]).toLowerCase().replace(/\./g,'').replace(/\s+/g,' ').trim();
    if (norm[key]) return norm[key];
  }
  return 0;
}

function _findColContains(headerMap, includeTerms, excludeTerms) {
  includeTerms = (includeTerms||[]).map(function(s){return String(s||'').toLowerCase().trim();}).filter(Boolean);
  excludeTerms = (excludeTerms||[]).map(function(s){return String(s||'').toLowerCase().trim();}).filter(Boolean);
  if (!includeTerms.length) return 0;
  var best = { col:0, score:-1 };
  Object.keys(headerMap).forEach(function(k){
    var nk = String(k).toLowerCase().replace(/\s+/g,' ').trim();
    for (var i=0;i<excludeTerms.length;i++) { if (nk.indexOf(excludeTerms[i])>=0) return; }
    var score = 0;
    for (var j=0;j<includeTerms.length;j++) { if (nk.indexOf(includeTerms[j])>=0) score++; }
    if (score > best.score) best = {col: headerMap[k], score: score};
  });
  return best.score > 0 ? best.col : 0;
}

function _requireCol_(headerMap, candidates, label) {
  var col = _findCol(headerMap, candidates);
  if (!col) throw new Error('Required column missing: ' + (label || candidates[0]));
  return col;
}

function _requireIndex_(idx, label) {
  if (idx < 0 || idx === undefined || idx === null)
    throw new Error('Required column missing: ' + label);
  return idx;
}

function _detectHeaderRow(sheet, includeTerms, excludeTerms, maxRows) {
  includeTerms = (includeTerms||[]).map(function(s){return String(s||'').toLowerCase().trim();}).filter(Boolean);
  excludeTerms = (excludeTerms||[]).map(function(s){return String(s||'').toLowerCase().trim();}).filter(Boolean);
  maxRows = maxRows || 10;
  var cacheKey = 'DHR_' + sheet.getSheetId() + '_' + includeTerms.slice().sort().join(',');
  try {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached !== null) return parseInt(cached) || 1;
  } catch (e) {}
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return 1;
  var scan = Math.min(maxRows, lastRow);
  var rows = sheet.getRange(1, 1, scan, lastCol).getValues();
  var bestRow = 1, bestScore = -1;
  for (var r=0; r<rows.length; r++) {
    var score = 0;
    for (var c=0; c<rows[r].length; c++) {
      var cell = String(rows[r][c]==null?'':rows[r][c]).toLowerCase().replace(/\s+/g,' ').trim();
      if (!cell) continue;
      var excluded = false;
      for (var e=0;e<excludeTerms.length;e++) {
        if (cell.indexOf(excludeTerms[e])>=0) { excluded=true; break; }
      }
      if (excluded) continue;
      for (var i=0;i<includeTerms.length;i++) { if (cell.indexOf(includeTerms[i])>=0) score++; }
    }
    if (score > bestScore) { bestScore=score; bestRow=r+1; }
  }
  var result = bestScore>0 ? bestRow : 1;
  try { CacheService.getScriptCache().put(cacheKey, String(result), 21600); } catch(e) {}
  return result;
}

function _readColumns(sheet, headerNames, startRow, headerRow) {
  startRow  = startRow  || 2;
  headerRow = headerRow || 1;
  var lastCol = sheet.getLastColumn(), lastRow = sheet.getLastRow();
  if (lastRow < startRow || lastCol === 0) return { rows:[], indexMap:{} };
  var hmap = _headerMap(sheet, headerRow);
  var colIdx = headerNames.map(function(n) {
    var cands = Array.isArray(n) ? n : [n];
    var col = _findCol(hmap, cands);
    return col ? (col-1) : -1;
  });
  var all = sheet.getRange(startRow, 1, lastRow-startRow+1, lastCol).getValues();
  var indexMap = {};
  headerNames.forEach(function(n,i) {
    indexMap[Array.isArray(n)?n[0]:n] = colIdx[i];
  });
  return { rows:all, indexMap:indexMap };
}

// ─── Validators ───────────────────────────────────────────────────────────────
function _num(v) {
  if (v==null||v==='') return 0;
  if (typeof v==='number') return v;
  var s = String(v).replace(/[₹,]/g,'').trim();
  if (s.indexOf('%')>=0) return (parseFloat(s.replace('%',''))||0)/100;
  return parseFloat(s)||0;
}

function safeString(value) {
  return String(value==null?'':value).replace(/\s+/g,' ').trim();
}

function safeNumber(value, fieldName) {
  if (value==null||value==='') return 0;
  var n = _num(value);
  if (isNaN(n)) throw new Error((fieldName||'Number')+' must be a valid number.');
  return n;
}

function requireField(value, fieldName) {
  var s = safeString(value);
  if (!s) throw new Error((fieldName||'Required field')+' is required.');
  return s;
}

function validateAmount(value, fieldName) {
  var n = safeNumber(value, fieldName||'Amount');
  if (n<=0) throw new Error((fieldName||'Amount')+' must be greater than 0.');
  return n;
}

function validatePO(value) {
  var po = requireField(value,'PO number');
  if (po.length>80) throw new Error('PO number is too long.');
  return po;
}

function validateGST(value) {
  var s = safeString(value);
  if (!s) return s;
  // GST: 15-char alphanumeric (simple pattern)
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(s))
    throw new Error('Invalid GSTIN format: ' + s);
  return s.toUpperCase();
}

function validatePAN(value) {
  var s = safeString(value);
  if (!s) return s;
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(s))
    throw new Error('Invalid PAN format: ' + s);
  return s.toUpperCase();
}

function normalizeVendorName(name) {
  return safeString(name)
    .toLowerCase()
    .replace(/[().,&\-_/\\]/g,' ')
    .replace(/\b(private|pvt|limited|ltd|llp|inc|co|company)\b/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

function _vendorIdentityKey_(name) {
  return normalizeVendorName(name).replace(/[^a-z0-9]/g,'');
}

// ─── CacheService Layer ───────────────────────────────────────────────────────
var _CACHE_TTL_ = {
  VENDORS:  120,   // 2 min
  KPI:       60,   // 1 min
  MASTER:    90,   // 1.5 min
  PROJECTS:  90,
  PO:        60,
  BOOT:      30
};

function _cacheGet_(key) {
  try {
    var raw = CacheService.getScriptCache().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function _cacheSet_(key, value, ttl) {
  try { CacheService.getScriptCache().put(key, JSON.stringify(value), ttl || 60); } catch (e) {}
}

function _cacheDel_(key) {
  try { CacheService.getScriptCache().remove(key); } catch (e) {}
}

function _invalidateAllCaches_() {
  var keys = [
    'KPI_DATA','MASTER_DATA','VENDORS_LIST','PROJECT_DETAILS',
    'LIST_POS_ALL','PO_BASELINE_MAP','PO_SYSTEM_PAID_MAP','PO_COMMITMENT_MAP'
  ];
  keys.forEach(function(k) { _cacheDel_(k); });
  _invalidateHeaderCache_();   // also purge in-memory header map
  // Purge current user's boot bundle key if possible
  try {
    var u = getCurrentUser();
    if (u && u.email) {
      _cacheDel_('BOOT_' + String(u.email).replace(/[^a-zA-Z0-9]/g,'_'));
    }
  } catch (e) {}
}

// Keep old name for backward compatibility
function _invalidateBootCache() { _invalidateAllCaches_(); }

// ─── Transaction Scaffold ─────────────────────────────────────────────────────
var Transaction = (function() {
  var active = {};
  function begin(id) {
    if (!id) id = 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
    active[id] = { startTime: Date.now(), operations: [] };
    return id;
  }
  function rollback(id) {
    var txn = active[id];
    if (!txn) return false;
    var ss = _ss();
    try {
      for (var i=txn.operations.length-1; i>=0; i--) {
        var op  = txn.operations[i]||{};
        var sh  = ss.getSheetByName(op.sheetName);
        if (!sh) throw new Error('Rollback sheet missing: '+op.sheetName);
        if (op.type==='restoreRange')
          sh.getRange(op.row,op.col,op.values.length,op.values[0].length).setValues(op.values);
        else if (op.type==='deleteRow') sh.deleteRow(op.row);
        else throw new Error('Unsupported rollback op: '+op.type);
      }
    } catch(e) { _logError('Rollback failed: '+id, {error:e.message}); return false; }
    finally { delete active[id]; }
    return true;
  }
  function commit(id) { delete active[id]; return true; }
  function addOperation(id, op) {
    if (!active[id]) throw new Error('Transaction not active: '+id);
    active[id].operations.push(op);
  }
  function rememberRange(id, sheet, row, col, numRows, numCols) {
    addOperation(id, {
      type:'restoreRange', sheetName:sheet.getName(), row:row, col:col,
      values: sheet.getRange(row,col,numRows,numCols).getValues()
    });
  }
  function rememberAppendedRow(id, sheet, row) {
    addOperation(id, { type:'deleteRow', sheetName:sheet.getName(), row:row });
  }
  function getActiveTransactions() { return Object.keys(active); }
  return { begin:begin, rollback:rollback, commit:commit,
           addOperation:addOperation, rememberRange:rememberRange,
           rememberAppendedRow:rememberAppendedRow,
           getActiveTransactions:getActiveTransactions };
})();

// ─── Audit Log ────────────────────────────────────────────────────────────────
function _logAudit(userEmail, actionType, details, department) {
  try {
    var sh = _ensureSheet_(SHEETS.AUDIT, ['Timestamp','User','Department','Action Type','Details','IP']);
    var lastCol = sh.getLastColumn();
    var hdr = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var row = new Array(lastCol);
    for(var i=0; i<row.length; i++) row[i] = '';
    
    var hmap = {};
    hdr.forEach(function(h, i){ hmap[String(h).trim().toLowerCase()] = i; });
    
    function setV(colNames, val) {
      for(var i=0; i<colNames.length; i++) {
        var n = colNames[i].toLowerCase();
        if (hmap[n] !== undefined) { row[hmap[n]] = val; return; }
      }
    }
    
    setV(['Timestamp','Time','Date'], new Date());
    setV(['User','Email','User Name'], String(userEmail||''));
    setV(['Action','Action Type'], String(actionType||''));
    setV(['Details','Description'], String(details||''));
    setV(['Department','Dept'], String(department||''));
    
    sh.appendRow(row);
  } catch (e) { Logger.log('Audit log failed: ' + e.message); }
}

// ─── Boot Bundle ──────────────────────────────────────────────────────────────
/**
 * Single round-trip boot: returns user, KPIs, master data, permissions.
 * Results cached per user for BOOT TTL seconds to survive rapid re-opens.
 */
function getBootBundle() {
  var t0   = _perf();
  var user = getCurrentUser();
  var bKey = 'BOOT_' + String(user.email||'unknown').replace(/[^a-zA-Z0-9]/g,'_');

  var cached = _cacheGet_(bKey);
  if (cached) {
    cached.user        = user;
    cached.permissions = getUserPermissions(user.email);
    return cached;
  }

  var kpis = null, master = null;
  // Ensure legacy vendors are migrated on first boot/load
  try { _runSafeInitialMigrationOnlyOnce(); } catch(e) { Logger.log('boot migration: '+e); }
  try { kpis   = _getKPIs();   } catch (e) { Logger.log('boot kpis: '+e); }
  try { master = _getMaster(); } catch (e) { Logger.log('boot master: '+e); }
  var permissions = getUserPermissions(user.email);
  var sheetWarnings = _assertRequiredSheets_();

  var result = {
    user: user, kpis: kpis, master: master,
    permissions: permissions, _bootMs: _perf(t0),
    _sheetWarnings: sheetWarnings
  };
  _cacheSet_(bKey, result, _CACHE_TTL_.BOOT);
  _perf(t0, 'getBootBundle TOTAL');
  return result;
}

function getBootData() {
  try { return { user: getCurrentUser(), kpis: null, master: null }; }
  catch (e) { throw new Error('Initial load failed: ' + e.message); }
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────
function clearAllCaches() {
  _invalidateAllCaches_();
  return { ok: true };
}

function clearCacheAndGetMaster() {
  _invalidateAllCaches_();
  return getMasterData();
}

function healthCheck() {
  return { ok: true, ts: new Date().toISOString(), warnings: _assertRequiredSheets_() };
}

function testConnection() { return { ok: true }; }
