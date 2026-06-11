/**
 * Luxeworx Atelier — Payment Tracker
 * pos.gs  (v6.0 — Production Hardening Pass)
 *
 * Owns: PO creation/upsert on PO Wise Details, PO Full schema,
 *       Zoho CSV import, baseline/system-paid maps, project add,
 *       duplicate PO detection.
 *
 * After initializeVendorMasterMigration() runs, createPO enforces
 * that every vendor is registered in _Vendors before a PO can be created.
 */

// ─── PO Sheet Helpers ─────────────────────────────────────────────────────────
function _poKey_(poNo) {
  var k = String(poNo || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (k.indexOf('laiplpo') === 0) k = k.substring(7);
  else if (k.indexOf('po') === 0) k = k.substring(2);
  if (/^(2425|2526|2627|2728|2829)/.test(k)) k = k.substring(4);
  return k.replace(/^0+/, '');
}

function _poCurrentUserEmail_(_session) {
  try { return getCurrentUser(_session).email; } catch(e){ return 'unknown'; }
}

// ─── Baseline & System-Paid Maps (cached) ────────────────────────────────────
function _loadBaselinePaidMap_() {
  var cached = _cacheGet_('PO_BASE_MAP_V3');
  if (cached) return cached;
  
  var ss = _ss();
  var sheets = ss.getSheets();
  var sh = null;
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName().toLowerCase().replace(/[^a-z]/g, '');
    if (n.indexOf('popaidbaseline') >= 0 || n.indexOf('baseline') >= 0) { sh = sheets[i]; break; }
  }
  
  var map = {};
  if (sh && sh.getLastRow() >= 2) {
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    data.forEach(function(r){ var k=_poKey_(r[0]); if(k) map[k]=_num(r[1]); });
  }
  _cacheSet_('PO_BASE_MAP_V3', map, 120);
  return map;
}

function _loadSystemPaidMap_() {
  var cached = _cacheGet_('PO_SYS_PAID_V6');
  if (cached) return cached;
  
  var ss = _ss();
  var sheets = ss.getSheets();
  var map = {};
  
  // Aggressively scan EVERY sheet that might be system payments and merge their data
  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName().toLowerCase().replace(/[^a-z]/g, '');
    if (n.indexOf('systempayment') >= 0 || n.indexOf('syspay') >= 0) {
      var sh = sheets[i];
      if (sh.getLastRow() >= 2) {
        var maxCol = Math.max(3, sh.getLastColumn());
        var headers = sh.getRange(1, 1, 1, maxCol).getValues()[0];
        var poIdx = 1, amtIdx = 2; 
        
        for (var c = 0; c < headers.length; c++) {
          var h = String(headers[c]).toLowerCase().replace(/[^a-z]/g, '');
          if (h === 'pono' || h === 'ponumber' || h === 'po' || h === 'bill' || h === 'billno' || h === 'order') poIdx = c;
          if (h === 'amount' || h === 'paid' || h === 'paidamount' || h === 'value') amtIdx = c;
        }
        
        var data = sh.getRange(2, 1, sh.getLastRow() - 1, maxCol).getValues();
        data.forEach(function(r) {
          var k = _poKey_(r[poIdx]); 
          if (k) map[k] = (_num(map[k])||0) + _num(r[amtIdx]); 
        });
      }
    }
  }
  
  // Cache busting: change key slightly to force fresh load
  _cacheSet_('PO_SYS_PAID_V7', map, 120);
  return map;
}

// ─── Upsert PO Row ────────────────────────────────────────────────────────────
/**
 * _upsertPOToMainSheet_ — writes or updates a single PO row on "PO Wise Details".
 * Uses header-map lookup (cached) so column order doesn't matter.
 */
function _upsertPOToMainSheet_(po) {
  var sh      = _sheet(SHEETS.PO);
  var hdrRow  = _detectHeaderRow(sh,['po','vendor','value','paid'],[],10);
  var hmap    = _headerMap(sh, hdrRow);
  var lastRow = sh.getLastRow();

  // Column resolver — returns 1-based col or 0
  function col(cands) { return _findCol(hmap, Array.isArray(cands)?cands:[cands]); }

  var poCol      = col(['PO No.','PO No','PO Number','P.O No']);
  var vendorCol  = col(['Vendor Name','Vendor']);
  var valCol     = col(['PO Value','PO Amount','Amount','Value']);
  var projCol    = col(['Project Name','Project']);
  var statusCol  = col(['PO STATUS','Status','PO Status']);
  var paidCol    = col(['Amount Paid','Paid']);
  var catCol     = col(['Category']);
  var codeCol    = col(['Vendor Code','Vendor code']);
  var revisedCol = col(['Revised PO Value','Revised Value','Revised Amount']);
  var certCol    = col(['Certified Value','Certified Amount','Certified']);
  var advCol     = col(['Advance','Advance Paid','Advance Amount']);
  var finalCol   = col(['Final Payable','Final Payables','Final Payable Amount']);

  // Find existing row by PO No
  var targetRow = -1;
  if (poCol && lastRow > hdrRow) {
    var poValues = sh.getRange(hdrRow+1, poCol, lastRow-hdrRow, 1).getValues();
    var normNew  = _poKey_(po.poNo);
    for (var i=0;i<poValues.length;i++) {
      if (_poKey_(poValues[i][0])===normNew) { targetRow=hdrRow+1+i; break; }
    }
  }

  function setCell(c, v) { if (c>0) sh.getRange(targetRow||lastRow+1, c).setValue(v); }

  if (targetRow < 0) {
    // New row — append
    targetRow = lastRow+1;
    var newRow = new Array(sh.getLastColumn()||20).fill('');
    if (poCol>0)      newRow[poCol-1]      = po.poNo;
    if (vendorCol>0)  newRow[vendorCol-1]  = po.vendor;
    if (valCol>0)     newRow[valCol-1]     = po.poValue;
    if (projCol>0)    newRow[projCol-1]    = po.project||'';
    if (statusCol>0)  newRow[statusCol-1]  = po.status||'Open';
    if (paidCol>0)    newRow[paidCol-1]    = po.amountPaid||0;
    if (catCol>0)     newRow[catCol-1]     = po.category||'';
    if (codeCol>0)    newRow[codeCol-1]    = po.vendorCode||'';
    if (revisedCol>0) newRow[revisedCol-1] = po.revisedPOValue||po.poValue;
    if (certCol>0)    newRow[certCol-1]    = po.certifiedValue||0;
    if (advCol>0)     newRow[advCol-1]     = po.advance||0;
    if (finalCol>0)   newRow[finalCol-1]   = po.finalPayables||0;
    sh.appendRow(newRow);
    _invalidateAllCaches_();
    return { rowNumber: targetRow, action:'created' };
  }

  // Update existing row selectively
  if (valCol>0)     setCell(valCol,     po.poValue);
  if (statusCol>0)  setCell(statusCol,  po.status||'Open');
  if (projCol>0)    setCell(projCol,    po.project||'');
  if (vendorCol>0)  setCell(vendorCol,  po.vendor);
  if (codeCol>0)    setCell(codeCol,    po.vendorCode||'');
  if (catCol>0)     setCell(catCol,     po.category||'');
  if (revisedCol>0) setCell(revisedCol, po.revisedPOValue||po.poValue);
  if (certCol>0)    setCell(certCol,    po.certifiedValue||0);
  if (advCol>0)     setCell(advCol,     po.advance||0);
  if (finalCol>0)   setCell(finalCol,   po.finalPayables||0);
  _invalidateAllCaches_();
  return { rowNumber: targetRow, action:'updated' };
}


// ─── createPO ─────────────────────────────────────────────────────────────────
function createPO(payload, _session) {
  if (!_hasMinRole_('proc', _session))
    throw new Error('Procurement role or above required.');

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy. Try again.'); }
  try {
    payload = payload||{};
    var poNo   = requireField(payload.poNo,    'PO Number');
    var vendor = requireField(payload.vendor,  'Vendor');
    var poVal  = validateAmount(payload.poValue,'PO Value');

    // Vendor onboarding check
    if (!findVendorMasterRecord(vendor))
      throw new Error('Vendor "'+vendor+'" is not in _Vendors master. Onboard the vendor first.');

    // Duplicate PO check
    var dup = detectDuplicatePO(poNo, vendor);
    if (dup.isDuplicate)
      throw new Error('Duplicate PO: PO#'+poNo+' already exists for vendor "'+vendor+'".');

    // Budget availability check
    if (payload.project) {
      var pDetails = getProjectDetails();
      for (var j=0;j<pDetails.length;j++) {
        var pd = pDetails[j];
        if (pd.project.toLowerCase()===String(payload.project).toLowerCase()) {
          if (pd.outflowLimit>0 && poVal>pd.balanceAvailable)
            throw new Error('Budget exceeded: PO value '+poVal+
              ' > available balance '+pd.balanceAvailable+' for project '+payload.project+'.');
          break;
        }
      }
    }

    var u = getCurrentUser(_session);
    var upsert = _upsertPOToMainSheet_({
      fy:             payload.fy||'',
      location:       payload.location||'',
      month:          payload.month||'',
      poNo:           poNo,
      status:         payload.status||'Open',
      type:           payload.type||'',
      poValue:        poVal,
      variation:      _num(payload.variation),
      revisedPOValue: _num(payload.revisedPOValue||payload.poValue),
      certifiedValue: _num(payload.certifiedValue),
      project:        payload.project||'',
      vendor:         vendor,
      vendorCode:     payload.vendorCode||'',
      category:       payload.category||'',
      amountPaid:     _num(payload.amountPaid),
      finalPayables:  payload.finalPayables!==undefined ? _num(payload.finalPayables) : undefined
    });

    _logAudit(u.email,'PO Created','PO#'+poNo+' vendor:'+vendor+' value:'+poVal,'Procurement');
    return { ok:true, poNo:poNo, rowNumber:upsert.rowNumber };
  } finally { try { lock.releaseLock(); } catch(_){} }
}

// ─── Project Management ───────────────────────────────────────────────────────
function addProject(payload, _session) {
  if (!_hasMinRole_('proc',_session)) throw new Error('Procurement role required.');
  var sh = _sheet(SHEETS.PROJECT, false);
  if (!sh) throw new Error('Project Wise Detail sheet not found.');
  var name = requireField(payload&&payload.name||payload&&payload.project,'Project Name');
  sh.appendRow([name]);
  _cacheDel_('PROJECT_DETAILS');
  _logAudit(getCurrentUser(_session).email,'Project Added',name,'Admin');
  return { ok:true, name:name };
}


// ==========================================
// PO Full (Structured PO with Line Items)
// Imported from Production Features GS
// ==========================================

var SHEETS_PO = {
  HEADERS:  '_POHeaders',
  ITEMS:    '_POItems',
  UNMAPPED: '_UnmappedPayments'
};

var PO_PDF_FOLDER_NAME = 'Luxeworx_PO_PDFs';
var COMPANY_NAME_FULL  = 'LUXEWORX ATELIER INTERIORS PRIVATE LIMITED';
var COMPANY_ADDRESS_FULL = '8th Floor, Magnum Towers-1\nGolf Course Ext Rd\nGurugram Haryana 122001';
var COMPANY_GST_NO = '06AAGCL1112M1ZP';
var COMPANY_PAN_NO = 'AAGCL1112M';
var COMPANY_LOGO_DATA_URI = 'data:image/jpeg;base64,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';

function _poCompanyConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    name: COMPANY_NAME_FULL,
    address: props.getProperty('COMPANY_ADDRESS_FULL') || COMPANY_ADDRESS_FULL || '',
    gst: props.getProperty('COMPANY_GST_NO') || COMPANY_GST_NO || '',
    pan: props.getProperty('COMPANY_PAN_NO') || COMPANY_PAN_NO || '',
    logoDataUri: COMPANY_LOGO_DATA_URI || ''
  };
}
// SHEET BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════

function _ensurePOHeadersSheet_() {
  var ss = _ss();
  var sh = ss.getSheetByName(SHEETS_PO.HEADERS);
  if (sh) return sh;
  sh = ss.insertSheet(SHEETS_PO.HEADERS);
  sh.appendRow([
    'PO No', 'Status', 'Vendor Name', 'Vendor Code', 'Vendor Address', 'Vendor GSTIN',
    'Project', 'Location', 'FY', 'Month', 'Category', 'Type',
    'PO Date', 'Expected Delivery', 'Payment Terms', 'Notes',
    'Bill To', 'Ship To',
    'GST Mode', // 'intra' (CGST+SGST) or 'inter' (IGST)
    'Subtotal', 'CGST', 'SGST', 'IGST', 'Round Off', 'Grand Total',
    'PDF URL', 'PDF File ID',
    'Created By', 'Created At', 'Updated By', 'Updated At',
    'Approved By', 'Approved At', 'Published At'
  ]);
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('@');  // PO No as text
  return sh;
}

function _ensurePOItemsSheet_() {
  var ss = _ss();
  var sh = ss.getSheetByName(SHEETS_PO.ITEMS);
  if (sh) return sh;
  sh = ss.insertSheet(SHEETS_PO.ITEMS);
  sh.appendRow([
    'PO No', 'Line No', 'Description', 'HSN/SAC',
    'Qty', 'Unit', 'Rate', 'Discount %',
    'Taxable', 'GST %', 'Tax Amount', 'Total'
  ]);
  sh.setFrozenRows(1);
  return sh;
}

function _ensureUnmappedSheet_() {
  var ss = _ss();
  var sh = ss.getSheetByName(SHEETS_PO.UNMAPPED);
  if (sh) return sh;
  sh = ss.insertSheet(SHEETS_PO.UNMAPPED);
  sh.appendRow([
    'ID', 'Date', 'Amount', 'Narration', 'UTR/Ref', 'Bank',
    'Status',             // Unmapped | Partial | Mapped | Ignored
    'Mapped To POs',      // JSON array of {poNo, amount}
    'Mapped Amount',      // sum
    'Mapped By', 'Mapped At',
    'Ignore Reason',
    'Created By', 'Created At'
  ]);
  sh.setFrozenRows(1);
  return sh;
}

function _getPOPdfFolder_() {
  var folders = DriveApp.getFoldersByName(PO_PDF_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(PO_PDF_FOLDER_NAME);
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function _poCurrentUserEmail_() {
  try { return getCurrentUser().email || ''; } catch (e) { return ''; }
}

function _poHasRole_(role, _session) {
  try {
    return _hasMinRole_(role, _session);
  } catch (e) { return false; }
}

function _poRequireAnyRole_(roles, _session) {
  var u = getCurrentUser(_session);
  roles = Array.isArray(roles) ? roles : [roles];
  roles = roles.map(function(r) { return String(r || '').trim(); }).filter(Boolean);
  if (!roles.length) throw new Error('Permission denied.');
  var minRole = roles[0];
  var minLvl = _ROLE_LEVEL_[minRole] || 0;
  for (var i = 1; i < roles.length; i++) {
    var r = roles[i];
    var lvl = _ROLE_LEVEL_[r] || 0;
    if (lvl && (!minLvl || lvl < minLvl)) { minLvl = lvl; minRole = r; }
  }
  if (minRole && _hasMinRole_(minRole, _session)) return u;
  throw new Error('Permission denied. Requires ' + roles.join(' or ') + ' (or higher).');
}

function _poFinancialYear_(date) {
  date = date || new Date();
  var m = date.getMonth() + 1;
  var y = date.getFullYear();
  // India FY: Apr–Mar. e.g. Apr 2025 – Mar 2026 → "2526"
  var startY = (m >= 4) ? y : y - 1;
  var endY   = startY + 1;
  return String(startY).slice(-2) + String(endY).slice(-2);
}

function _poGenerateNumber_() {
  var sh = _ensurePOHeadersSheet_();
  var prefix = PropertiesService.getScriptProperties().getProperty('PO_NUM_PREFIX') || '';
  if (!prefix) {
    var fy = _poFinancialYear_();
    prefix = 'LA/' + fy + '/';
  }
  var last = sh.getLastRow();
  var max = 0;
  if (last >= 2) {
    var nums = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < nums.length; i++) {
      var p = String(nums[i][0] || '');
      if (p.indexOf(prefix) === 0) {
        var n = parseInt(p.substring(prefix.length).replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    }
  }
  return prefix + String(max + 1).padStart(4, '0');
}

function _poHeaderMap_(sh) {
  var hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var m = {};
  hdr.forEach(function(h, i) { m[String(h).trim()] = i + 1; });
  return m;
}

function _poFindHeaderRow_(poNo) {
  var sh = _ensurePOHeadersSheet_();
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var col = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]) === String(poNo)) return i + 2;
  }
  return 0;
}

function _poRound_(n) { return Math.round(Number(n || 0) * 100) / 100; }
function _poMoney_(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function _poKey_(value) {
  var k = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  if (k.indexOf('laiplpo') === 0) k = k.substring(7);
  else if (k.indexOf('laipl') === 0) k = k.substring(5);
  else if (k.indexOf('po') === 0) k = k.substring(2);
  return k;
}


function _poComputeTotals_(items, gstMode) {
  items = Array.isArray(items) ? items : [];
  var subtotal = 0, totalTax = 0;
  var computed = items.map(function(it, idx) {
    var qty    = Number(it.qty)        || 0;
    var rate   = Number(it.rate)       || 0;
    var disc   = Number(it.discount)   || 0;  // percent
    var gstPct = Number(it.gstPct)     || 0;
    var gross  = qty * rate;
    var taxable = _poRound_(gross * (1 - disc / 100));
    var taxAmt  = _poRound_(taxable * gstPct / 100);
    var total   = _poRound_(taxable + taxAmt);
    subtotal += taxable;
    totalTax += taxAmt;
    return {
      lineNo: idx + 1,
      description: String(it.description || ''),
      hsn: String(it.hsn || ''),
      qty: qty,
      unit: String(it.unit || 'Nos'),
      rate: rate,
      discount: disc,
      gstPct: gstPct,
      taxable: taxable,
      taxAmount: taxAmt,
      total: total
    };
  });
  subtotal = _poRound_(subtotal);
  totalTax = _poRound_(totalTax);
  var cgst = (gstMode === 'intra') ? _poRound_(totalTax / 2) : 0;
  var sgst = (gstMode === 'intra') ? _poRound_(totalTax / 2) : 0;
  var igst = (gstMode === 'inter') ? totalTax : 0;
  var preRound = subtotal + cgst + sgst + igst;
  var grand = Math.round(preRound);
  var roundOff = _poRound_(grand - preRound);
  return {
    items: computed,
    subtotal: subtotal,
    cgst: cgst,
    sgst: sgst,
    igst: igst,
    roundOff: roundOff,
    grandTotal: grand,
    gstMode: gstMode
  };
}

function createPOFull(payload, _session) {
  requireFeaturePermission('create_po', _session);
  _poRequireAnyRole_(['proc', 'director'], _session);
  payload = payload || {};
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error('System busy, please retry.');
  try {
    var sh = _ensurePOHeadersSheet_();
    _ensurePOItemsSheet_();
    var poNo = _poGenerateNumber_();
    var totals = _poComputeTotals_(payload.items || [], payload.gstMode || 'intra');
    var now = new Date();
    var me = _poCurrentUserEmail_(_session);

    sh.appendRow([
      poNo, 'Draft',
      payload.vendorName || '', payload.vendorCode || '',
      payload.vendorAddress || '', payload.vendorGSTIN || '',
      payload.project || '', payload.location || '',
      payload.fy || _poFinancialYear_(),
      payload.month ? new Date(payload.month) : '',
      payload.category || '', payload.type || '',
      payload.poDate ? new Date(payload.poDate) : now,
      payload.expectedDelivery ? new Date(payload.expectedDelivery) : '',
      payload.paymentTerms || '', payload.notes || '',
      payload.billTo || '', payload.shipTo || '',
      payload.gstMode || 'intra',
      totals.subtotal, totals.cgst, totals.sgst, totals.igst,
      totals.roundOff, totals.grandTotal,
      '', '',            // PDF URL, File ID
      me, now, me, now,
      '', '', ''         // Approved By/At, Published At
    ]);

    var rowNumber = sh.getLastRow();
    var map = _poHeaderMap_(sh);
    if (!map['General Terms']) {
      var lc = sh.getLastColumn() + 1;
      sh.getRange(1, lc).setValue('General Terms');
      map['General Terms'] = lc;
    }
    sh.getRange(rowNumber, map['General Terms']).setValue(payload.generalTerms || '');

    _poWriteItems_(poNo, totals.items);
    
    _logAudit(me, 'PO Created', 'Draft PO created: ' + poNo + ' for vendor ' + payload.vendorName, 'Procurement');

    try { _invalidateBootCache(); } catch(_){}  // C6
    try { CacheService.getScriptCache().remove('LIST_POS_ALL'); } catch(_){}
    return { ok: true, poNo: poNo, rowNumber: rowNumber, totals: totals };
  } finally { lock.releaseLock(); }
}

function updatePOFull(poNo, payload, _session) {
  _poRequireAnyRole_(['proc', 'director'], _session);
  payload = payload || {};
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) throw new Error('System busy, please retry.');
  try {
    var sh = _ensurePOHeadersSheet_();
    var row = _poFindHeaderRow_(poNo);
    if (!row) throw new Error('PO not found: ' + poNo);
    var map = _poHeaderMap_(sh);
    var cur = sh.getRange(row, map['Status']).getValue();
    if (cur === 'Cancelled')
      throw new Error('Cannot edit a cancelled PO.');

    var totals = _poComputeTotals_(payload.items || [], payload.gstMode || 'intra');
    var now = new Date();
    var me = _poCurrentUserEmail_(_session);

    function setH(name, v) { if (map[name]) sh.getRange(row, map[name]).setValue(v); }
    
    if (!map['General Terms']) {
      var lc = sh.getLastColumn() + 1;
      sh.getRange(1, lc).setValue('General Terms');
      map['General Terms'] = lc;
    }

    setH('Vendor Name', payload.vendorName || '');
    setH('Vendor Code', payload.vendorCode || '');
    setH('Vendor Address', payload.vendorAddress || '');
    setH('Vendor GSTIN', payload.vendorGSTIN || '');
    setH('Project', payload.project || '');
    setH('Location', payload.location || '');
    setH('FY', payload.fy || _poFinancialYear_());
    setH('Month', payload.month ? new Date(payload.month) : '');
    setH('Category', payload.category || '');
    setH('Type', payload.type || '');
    setH('PO Date', payload.poDate ? new Date(payload.poDate) : '');
    setH('Expected Delivery', payload.expectedDelivery ? new Date(payload.expectedDelivery) : '');
    setH('Payment Terms', payload.paymentTerms || '');
    setH('General Terms', payload.generalTerms || '');
    setH('Notes', payload.notes || '');
    setH('Bill To', payload.billTo || '');
    setH('Ship To', payload.shipTo || '');
    setH('GST Mode', payload.gstMode || 'intra');
    setH('Subtotal', totals.subtotal);
    setH('CGST', totals.cgst);
    setH('SGST', totals.sgst);
    setH('IGST', totals.igst);
    setH('Round Off', totals.roundOff);
    setH('Grand Total', totals.grandTotal);
    if (map['PDF URL']) sh.getRange(row, map['PDF URL']).setValue('');
    if (map['PDF File ID']) sh.getRange(row, map['PDF File ID']).setValue('');
    setH('Updated By', me);
    setH('Updated At', now);

    _poDeleteItems_(poNo);
    _poWriteItems_(poNo, totals.items);
    if (cur === 'Approved' || cur === 'Published') {
      _upsertPOToMainSheet_({
        fy: payload.fy || _poFinancialYear_(),
        location: payload.location || '',
        month: payload.month || '',
        poNo: poNo,
        status: cur,
        type: payload.type || '',
        poValue: totals.grandTotal,
        revisedPOValue: totals.grandTotal,
        certifiedValue: totals.grandTotal,
        project: payload.project || '',
        vendor: payload.vendorName || '',
        vendorCode: payload.vendorCode || '',
        category: payload.category || '',
        finalPayables: totals.grandTotal
      });
    }

    try { _invalidateBootCache(); } catch(_){}
    try { CacheService.getScriptCache().remove('LIST_POS_ALL'); } catch(_){}

    return { ok: true, poNo: poNo, totals: totals };
  } finally { lock.releaseLock(); }
}

function approvePOFull(poNo, _session) {
  requireFeaturePermission('approve_po', _session);
  _poRequireAnyRole_(['director'], _session);
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(15000)) throw new Error('System busy, please retry.');
  try {
    var sh = _ensurePOHeadersSheet_();
    var row = _poFindHeaderRow_(poNo);
    if (!row) throw new Error('PO not found: ' + poNo);
    var map = _poHeaderMap_(sh);
    var cur = sh.getRange(row, map['Status']).getValue();
    if (cur !== 'Draft' && cur !== 'Submitted')
      throw new Error('Cannot approve a PO in status: ' + cur);

    var now = new Date();
    var me = _poCurrentUserEmail_(_session);
    sh.getRange(row, map['Status']).setValue('Approved');
    sh.getRange(row, map['Approved By']).setValue(me);
    sh.getRange(row, map['Approved At']).setValue(now);

    var full = getPOFull(poNo, _session);
    var h = full.header;
    try {
      _upsertPOToMainSheet_({
        fy:             h['FY'],
        location:       h['Location'],
        month:          h['Month'],
        poNo:           poNo,
        status:         'Approved',
        type:           h['Type'],
        poValue:        h['Grand Total'],
        revisedPOValue: h['Grand Total'],
        certifiedValue: h['Grand Total'],
        project:        h['Project'],
        vendor:         h['Vendor Name'],
        vendorCode:     h['Vendor Code'],
        category:       h['Category'],
        amountPaid:     0,
        finalPayables:  h['Grand Total']
      });
    } catch (e) {
      Logger.log('Publish to PO sheet failed for ' + poNo + ': ' + e);
    }
    sh.getRange(row, map['Published At']).setValue(new Date());

    // Generate PDF
    var pdfUrl = '', pdfId = '';
    try {
      var r = generatePOPdf(poNo, _session);
      pdfUrl = r.url;
      pdfId = r.fileId;
      sh.getRange(row, map['PDF URL']).setValue(pdfUrl);
      sh.getRange(row, map['PDF File ID']).setValue(pdfId);
    } catch (e) {
      Logger.log('PDF generation failed for ' + poNo + ': ' + e);
    }
    
    _logAudit(me, 'PO Approved', 'Approved PO: ' + poNo + ' for ' + h['Grand Total'], 'Director');

    try { _invalidateBootCache(); } catch(_){}
    try { CacheService.getScriptCache().remove('LIST_POS_ALL'); } catch(_){}

    return { ok: true, poNo: poNo, status: 'Approved', pdfUrl: pdfUrl };
  } finally { lock.releaseLock(); }
}


function _poWriteItems_(poNo, items) {
  var sh = _ensurePOItemsSheet_();
  if (!items || !items.length) return;
  var rows = items.map(function(it) {
    return [
      poNo, it.lineNo, it.description, it.hsn,
      it.qty, it.unit, it.rate, it.discount,
      it.taxable, it.gstPct, it.taxAmount, it.total
    ];
  });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function _poDeleteItems_(poNo) {
  var sh = _ensurePOItemsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return;
  var vals = sh.getRange(2, 1, last - 1, 1).getValues();
  var toDelete = [];
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(poNo)) toDelete.push(i + 2);
  }
  // Delete bottom-up to preserve row numbers
  toDelete.reverse().forEach(function(r) { sh.deleteRow(r); });
}

/**
 * Fetch a full PO by number. Returns { header, items, totals }.
 */
function getPOFull(poNo, _session) {
  var sh = _ensurePOHeadersSheet_();
  var row = _poFindHeaderRow_(poNo);
  if (!row) {
    var details = getPODetails(poNo, _session);
    if (!details) throw new Error('PO not found: ' + poNo);
    var header = {
      'PO No': details.poNo,
      'Status': details.status || 'Open',
      'Vendor Name': details.vendor,
      'Vendor Code': details.vendorCode || '',
      'Vendor Address': '',
      'Vendor GSTIN': '',
      'Project': details.project || '',
      'Location': '',
      'FY': '',
      'Month': '',
      'Category': details.category || '',
      'Type': '',
      'PO Date': '',
      'Expected Delivery': '',
      'Payment Terms': '',
      'General Terms': '',
      'Notes': '',
      'Bill To': '',
      'Ship To': '',
      'GST Mode': 'intra',
      'Subtotal': details.poValue,
      'CGST': 0,
      'SGST': 0,
      'IGST': 0,
      'Round Off': 0,
      'Grand Total': details.poValue
    };
    var items = [{
      lineNo: 1,
      description: details.category ? ('Category: ' + details.category) : 'Purchase Order Value',
      hsn: '',
      qty: 1,
      unit: 'Nos',
      rate: details.poValue,
      discount: 0,
      taxable: details.poValue,
      gstPct: 0,
      taxAmount: 0,
      total: details.poValue
    }];
    return {
      header: header,
      items: items,
      totals: {
        subtotal: details.poValue,
        cgst: 0,
        sgst: 0,
        igst: 0,
        roundOff: 0,
        grandTotal: details.poValue,
        gstMode: 'intra'
      }
    };
  }
  var map = _poHeaderMap_(sh);
  var hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var vals = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
  var header = {};
  hdr.forEach(function(h, i) { header[String(h)] = vals[i]; });

  // Items
  var ish = _ensurePOItemsSheet_();
  var iLast = ish.getLastRow();
  var items = [];
  if (iLast >= 2) {
    var rows = ish.getRange(2, 1, iLast - 1, ish.getLastColumn()).getValues();
    rows.forEach(function(r) {
      if (String(r[0]) !== String(poNo)) return;
      items.push({
        lineNo:      r[1],
        description: r[2],
        hsn:         r[3],
        qty:         Number(r[4]) || 0,
        unit:        r[5],
        rate:        Number(r[6]) || 0,
        discount:    Number(r[7]) || 0,
        taxable:     Number(r[8]) || 0,
        gstPct:      Number(r[9]) || 0,
        taxAmount:   Number(r[10]) || 0,
        total:       Number(r[11]) || 0
      });
    });
    items.sort(function(a, b) { return a.lineNo - b.lineNo; });
  }

  return {
    header: header,
    items: items,
    totals: {
      subtotal:   Number(header['Subtotal']) || 0,
      cgst:       Number(header['CGST']) || 0,
      sgst:       Number(header['SGST']) || 0,
      igst:       Number(header['IGST']) || 0,
      roundOff:   Number(header['Round Off']) || 0,
      grandTotal: Number(header['Grand Total']) || 0,
      gstMode:    header['GST Mode'] || 'intra'
    }
  };
}

function listPOFullHeaders(filters, _session) {
  filters = filters || {};
  var sh = _ensurePOHeadersSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var idx = {};
  hdr.forEach(function(h, i) { idx[String(h)] = i; });
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var obj = {
      rowNumber:   i + 2,
      poNo:        r[idx['PO No']],
      status:      r[idx['Status']],
      vendor:      r[idx['Vendor Name']],
      vendorCode:  r[idx['Vendor Code']],
      project:     r[idx['Project']],
      category:    r[idx['Category']],
      poDate:      r[idx['PO Date']],
      grandTotal:  Number(r[idx['Grand Total']]) || 0,
      pdfUrl:      r[idx['PDF URL']],
      createdBy:   r[idx['Created By']],
      createdAt:   r[idx['Created At']]
    };
    if (filters.status && filters.status !== 'All' && obj.status !== filters.status) continue;
    if (filters.vendor && String(obj.vendor).toLowerCase().indexOf(String(filters.vendor).toLowerCase()) < 0) continue;
    if (filters.q) {
      var q = String(filters.q).toLowerCase();
      var hay = (obj.poNo + ' ' + obj.vendor + ' ' + obj.project).toLowerCase();
      if (hay.indexOf(q) < 0) continue;
    }
    out.push(obj);
  }
  out.reverse();
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// PDF GENERATION — Luxeworx Atelier branded template
// ═══════════════════════════════════════════════════════════════════════

function generatePOPdf(poNo, _session) {
  var full = getPOFull(poNo, _session);
  var html = _poRenderPdfHtml_(full);
  var blob = Utilities.newBlob(html, 'text/html').getAs('application/pdf')
                .setName('PO_' + String(poNo).replace(/[\/\\]/g, '_') + '.pdf');
  var folder = _getPOPdfFolder_();
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  try {
    var sh = _ensurePOHeadersSheet_();
    var row = _poFindHeaderRow_(poNo);
    var map = _poHeaderMap_(sh);
    if (row && map['PDF URL']) sh.getRange(row, map['PDF URL']).setValue(file.getUrl());
    if (row && map['PDF File ID']) sh.getRange(row, map['PDF File ID']).setValue(file.getId());
  } catch (e) {
    Logger.log('Could not save PDF URL for ' + poNo + ': ' + e);
  }
  _logAudit(_poCurrentUserEmail_(_session), 'PO PDF Generated', 'Generated PDF for PO ' + poNo, 'Procurement');
  return { ok: true, poNo: poNo, url: file.getUrl(), fileId: file.getId() };
}

function sendPOToVendor(poNo, email, _session) {
  _poRequireAnyRole_(['proc', 'director'], _session);
  if (!poNo) throw new Error('PO number is required.');

  // C13-c: serialise concurrent sends.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Another send is in progress. Try again in a few seconds.');
  try {
    var full = getPOFull(poNo, _session);
    var h    = full.header;

    // Resolve recipient.
    if (email && typeof email === 'object') {
      email = '';
    }
    var to = String(email || '').trim();
    if (!to) {
      var vendors = getVendorsList();
      var name = String(h['Vendor Name'] || '').trim().toLowerCase();
      for (var i = 0; i < vendors.length; i++) {
        var vn = String(vendors[i].legalName || vendors[i].tradeName || '').trim().toLowerCase();
        if (vn === name && vendors[i].email) {
          to = String(vendors[i].email).trim();
          break;
        }
      }
    }
    if (!to)
      throw new Error('Vendor email not found. Open Vendors → ' + (h['Vendor Name']||'') + ' and set the Email field. (If the row looks broken, run repairVendorRows() once.)');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))
      throw new Error('Vendor email "' + to + '" is not a valid address.');

    if (MailApp.getRemainingDailyQuota() < 1)
      throw new Error('Daily email quota exhausted. Try again after 00:00 PT.');

    // C13-b: reuse existing PDF when present; only regenerate if missing/deleted.
    var fileId = String(h['PDF File ID'] || '').trim();
    var file = null;
    if (fileId) {
      try { file = DriveApp.getFileById(fileId); } catch(_){ file = null; }
    }
    if (!file) {
      var pdf = generatePOPdf(poNo, _session);
      file = DriveApp.getFileById(pdf.fileId);
    }

    var blob = file.getBlob();
    var size = blob.getBytes().length;
    var SAFE_LIMIT = 20 * 1024 * 1024;   // C13-d: stay below MailApp 25 MB ceiling.

    var subject = 'Purchase Order ' + poNo + ' - ' + COMPANY_NAME_FULL;
    var bodyHtml = 'Dear Vendor,<br><br>Please find ' +
      (size > SAFE_LIMIT
        ? 'your Purchase Order at this link: <a href="' + file.getUrl() + '">' + _poFmt_(poNo) + '</a> (file too large to attach).'
        : 'attached Purchase Order <b>' + _poFmt_(poNo) + '</b>.') +
      '<br><br>Regards,<br>' + _poFmt_(COMPANY_NAME_FULL);

    var mailOpts = { to: to, subject: subject, htmlBody: bodyHtml };
    if (size <= SAFE_LIMIT) mailOpts.attachments = [blob];

    var sendErr = null;
    try { MailApp.sendEmail(mailOpts); }
    catch(e) { sendErr = e; }

    _logAudit(
      _poCurrentUserEmail_(_session),
      sendErr ? 'PO Email Failed' : 'PO Emailed',
      (sendErr ? 'FAILED: ' + sendErr.message + ' — ' : '') +
      'PO ' + poNo + ' → ' + to + ' (size ' + size + ' bytes' + (size > SAFE_LIMIT ? ', link-only' : ', attached') + ')',
      'Procurement'
    );
    if (sendErr) throw sendErr;

    return { ok:true, poNo:poNo, email:to, pdfUrl:file.getUrl(), attached: size <= SAFE_LIMIT };
  } finally {
    try { lock.releaseLock(); } catch(_){}
  }
}

function _poFmt_(v) {
  if (v == null || v === '') return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _poAttr_(v) {
  if (v == null || v === '') return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function _poDate_(d) {
  if (!d) return '';
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Kolkata', 'dd MMM yyyy');
}

function _poRenderPdfHtml_(full) {
  var h = full.header, items = full.items, t = full.totals;
  var isIntra = (t.gstMode || 'intra') === 'intra';
  var company = _poCompanyConfig_();
  var companyDetails = [];
  if (company.address) companyDetails.push('<div class="co-line">' + _poFmt_(company.address).replace(/\n/g, '<br>') + '</div>');
  if (company.gst) companyDetails.push('<div class="co-line"><strong>GST:</strong> ' + _poFmt_(company.gst) + '</div>');
  if (company.pan) companyDetails.push('<div class="co-line"><strong>PAN:</strong> ' + _poFmt_(company.pan) + '</div>');

  var itemsRows = items.map(function(it, idx) {
    return '<tr>' +
      '<td style="text-align:center">' + (idx + 1) + '</td>' +
      '<td>' + _poFmt_(it.description) + '</td>' +
      '<td style="text-align:center">' + _poFmt_(it.hsn) + '</td>' +
      '<td style="text-align:right">' + Number(it.qty).toLocaleString('en-IN') + '</td>' +
      '<td style="text-align:center">' + _poFmt_(it.unit) + '</td>' +
      '<td style="text-align:right">' + Number(it.rate).toLocaleString('en-IN', {minimumFractionDigits:2}) + '</td>' +
      '<td style="text-align:right">' + (it.discount ? it.discount + '%' : '—') + '</td>' +
      '<td style="text-align:right">' + it.gstPct + '%</td>' +
      '<td style="text-align:right">' + Number(it.taxable).toLocaleString('en-IN', {minimumFractionDigits:2}) + '</td>' +
      '<td style="text-align:right">' + Number(it.total).toLocaleString('en-IN', {minimumFractionDigits:2}) + '</td>' +
    '</tr>';
  }).join('');

  var taxRows = isIntra
    ? '<tr><td>CGST</td><td style="text-align:right">' + _poMoney_(t.cgst) + '</td></tr>' +
      '<tr><td>SGST</td><td style="text-align:right">' + _poMoney_(t.sgst) + '</td></tr>'
    : '<tr><td>IGST</td><td style="text-align:right">' + _poMoney_(t.igst) + '</td></tr>';

  var customTerms = h['General Terms'];
  var termsHtml = '';
  if (customTerms && String(customTerms).trim() !== '') {
    var lines = String(customTerms).split('\n');
    var linesHtml = lines.map(function(l) {
      if (l.trim() === '') return '<br>';
      return '<p>' + _poFmt_(l) + '</p>';
    }).join('');
    termsHtml = '<h3>Terms &amp; Conditions</h3>' + linesHtml;
  } else {
    termsHtml = '<h3>Terms &amp; Conditions</h3>' +
      '<p><strong>1. General:</strong> Material must match specifications exactly; any deviations require written approval prior to dispatch.</p>' +
      '<p><strong>2. Delivery:</strong> Delivery to be completed on or before the Expected Delivery Date specified above. Delays may attract penalty.</p>' +
      '<p><strong>3. Invoicing:</strong> Invoice must reference this Purchase Order number and should be sent to the billing address.</p>' +
      '<p><strong>4. Payment:</strong> Payment will be processed strictly as per the Payment Terms agreed (' + _poFmt_(h['Payment Terms'] || 'Standard') + ').</p>' +
      '<p><strong>5. Jurisdiction:</strong> All disputes are subject to Mumbai jurisdiction.</p>';
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{color:#111;font-family:Georgia,"Times New Roman",serif;font-size:12px;line-height:1.35;padding:12px 16px}' +
    '.po-top{width:100%;border-collapse:collapse;border:1px solid #999;margin-bottom:0}' +
    '.po-top td{border:1px solid #999;padding:6px 8px;vertical-align:middle}' +
    '.po-logo{width:33%;text-align:center;vertical-align:middle}' +
    '.po-company{width:42%}' +
    '.po-title{text-align:center;font-family:Georgia,serif;font-size:32px;font-weight:700;color:#000;margin:16px 0 8px}' +
    '.po-meta{width:100%;border-collapse:collapse;border-left:1px solid #999;border-right:1px solid #999;border-bottom:1px solid #999;margin-bottom:22px}' +
    '.po-meta td{border:1px solid #999;padding:5px 8px;font-size:13px}' +
    '.logo-img{display:block;max-width:235px;max-height:105px;object-fit:contain;margin:0 auto}' +
    '.logo{font-family:Georgia,serif;font-size:70px;color:#C9A961;letter-spacing:2px;line-height:1;margin-bottom:4px}' +
    '.company{font-family:Georgia,serif;font-size:21px;font-weight:800;color:#111;line-height:1.02;text-transform:uppercase}' +
    '.co-line{font-size:13px;color:#111;line-height:1.45;margin-top:2px}' +
    'h3{font-size:12px;color:#111;letter-spacing:.2px;margin-bottom:6px;font-weight:700;border-bottom:1px solid #999;padding-bottom:3px;display:inline-block}' +
    '.parties{display:table;width:100%;margin:10px 0 24px}' +
    '.party{display:table-cell;width:50%;vertical-align:top;padding-right:20px}' +
    '.party-name{font-size:14px;font-weight:bold;color:#111;margin-bottom:6px}' +
    '.party-box{background:#fff;border:1px solid #999;padding:10px;min-height:95px}' +
    '.meta{display:table;width:100%;margin-bottom:18px;background:#fff;border:1px solid #999}' +
    '.meta-cell{display:table-cell;padding:12px 16px;border-right:1px solid #ddd}' +
    '.meta-cell:last-child{border-right:none}' +
    '.meta-cell .lbl{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:0.5px}' +
    '.meta-cell .val{font-size:12px;font-weight:600;color:#222;margin-top:4px}' +
    'table.items{width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #999}' +
    'table.items th{background:#f3f3f3;color:#111;padding:7px 6px;font-size:10px;text-align:left;font-weight:700;border:1px solid #999}' +
    'table.items th.num{text-align:right}' +
    'table.items td{padding:7px 6px;border:1px solid #999;vertical-align:top;font-size:11px}' +
    '.totals-wrap{display:table;width:100%;margin-bottom:24px}' +
    '.totals-notes{display:table-cell;width:55%;padding-right:24px;vertical-align:top}' +
    '.totals-box{display:table-cell;width:45%;vertical-align:top;background:#fff;border:1px solid #999}' +
    'table.totals{width:100%;border-collapse:collapse}' +
    'table.totals td{padding:8px 12px;font-size:12px}' +
    'table.totals tr.grand{background:#f3f3f3;color:#111;font-weight:bold;font-size:14px;border-top:1px solid #999}' +
    'table.totals tr.grand td{padding:12px}' +
    '.amount-words{margin-top:16px;padding:10px 14px;background:#fcf8f2;border-left:4px solid #C9A961;font-size:11px;color:#444}' +
    '.terms{margin-top:24px;font-size:10px;color:#555;line-height:1.6}' +
    '.terms p{margin-top:4px}' +
    '.sign{margin-top:60px;display:table;width:100%}' +
    '.sign-cell{display:table-cell;vertical-align:bottom;width:50%}' +
    '.sign-box{border-top:1px solid #333;padding-top:8px;display:inline-block;min-width:200px}' +
    '.sign-title{font-weight:bold;font-size:12px;color:#111}' +
    '.sign-sub{font-size:10px;color:#777;margin-top:2px}' +
    '.foot{margin-top:40px;text-align:center;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:12px}' +
    '</style></head><body>' +

    '<table class="po-top"><tr>' +
      '<td class="po-logo">' + (company.logoDataUri ? '<img class="logo-img" src="' + _poAttr_(company.logoDataUri) + '" alt="Company Logo">' : '<div class="logo">LA</div>') + '</td>' +
      '<td class="po-company"><div class="company">' + _poFmt_(company.name) + '</div>' + companyDetails.join('') + '</td>' +
    '</tr></table>' +
    '<div class="po-title">Purchase Order</div>' +
    '<table class="po-meta">' +
      '<tr><td style="width:24%">Purchase Order#</td><td style="width:27%"><strong>: ' + _poFmt_(h['PO No']) + '</strong></td><td style="width:24%">Place Of Supply</td><td><strong>: ' + _poFmt_(h['Location'] || '') + '</strong></td></tr>' +
      '<tr><td>Date</td><td><strong>: ' + _poDate_(h['PO Date']) + '</strong></td><td></td><td></td></tr>' +
    '</table>' +

    '<div class="parties">' +
      '<div class="party">' +
        '<h3>Vendor / Supplier</h3>' +
        '<div class="party-box">' +
          '<div class="party-name">' + _poFmt_(h['Vendor Name']) + '</div>' +
          (h['Vendor Code'] ? '<div style="margin-bottom:2px"><strong>Vendor Code:</strong> ' + _poFmt_(h['Vendor Code']) + '</div>' : '') +
          (h['Vendor GSTIN'] ? '<div style="margin-bottom:2px"><strong>GSTIN:</strong> ' + _poFmt_(h['Vendor GSTIN']) + '</div>' : '') +
          (h['Vendor Address'] ? '<div style="margin-top:6px;white-space:pre-line;color:#555">' + _poFmt_(h['Vendor Address']) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="party" style="padding-right:0">' +
        '<h3>Shipping Address</h3>' +
        '<div class="party-box">' +
          '<div class="party-name">' + _poFmt_(h['Project'] || COMPANY_NAME_FULL) + '</div>' +
          '<div style="white-space:pre-line;color:#555;margin-top:6px">' + _poFmt_(h['Ship To'] || h['Location'] || '') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="meta">' +
      '<div class="meta-cell"><div class="lbl">Project Reference</div><div class="val">' + _poFmt_(h['Project']) + '</div></div>' +
      '<div class="meta-cell"><div class="lbl">Category</div><div class="val">' + _poFmt_(h['Category']) + '</div></div>' +
      '<div class="meta-cell"><div class="lbl">Expected Delivery</div><div class="val">' + _poDate_(h['Expected Delivery']) + '</div></div>' +
      '<div class="meta-cell"><div class="lbl">Payment Terms</div><div class="val">' + _poFmt_(h['Payment Terms'] || 'As per standard terms') + '</div></div>' +
    '</div>' +

    '<table class="items">' +
      '<thead><tr>' +
        '<th style="width:4%">#</th>' +
        '<th style="width:32%">Item & Description</th>' +
        '<th style="width:8%">HSN/SAC</th>' +
        '<th class="num" style="width:7%">Qty</th>' +
        '<th style="width:6%">Unit</th>' +
        '<th class="num" style="width:10%">Rate</th>' +
        '<th class="num" style="width:7%">Disc</th>' +
        '<th class="num" style="width:6%">GST</th>' +
        '<th class="num" style="width:10%">Taxable</th>' +
        '<th class="num" style="width:10%">Total</th>' +
      '</tr></thead>' +
      '<tbody>' + itemsRows + '</tbody>' +
    '</table>' +

    '<div class="totals-wrap">' +
      '<div class="totals-notes">' +
        (h['Notes'] ? '<div style="margin-bottom:16px"><h3>Remarks / Notes</h3><div style="white-space:pre-line;color:#444;font-size:11px;background:#f9f9f9;padding:10px;border-radius:4px;border:1px solid #eaeaea">' + _poFmt_(h['Notes']) + '</div></div>' : '') +
        '<div class="amount-words"><strong>Total in Words:</strong><br>' + _poFmt_(_poAmountInWords_(t.grandTotal)) + ' only.</div>' +
      '</div>' +
      '<div class="totals-box">' +
        '<table class="totals">' +
          '<tr><td>Sub Total (Taxable)</td><td style="text-align:right;font-weight:600">' + _poMoney_(t.subtotal) + '</td></tr>' +
          taxRows +
          (t.roundOff ? '<tr><td>Round Off</td><td style="text-align:right">' + _poMoney_(t.roundOff) + '</td></tr>' : '') +
          '<tr class="grand"><td>Grand Total</td><td style="text-align:right">' + _poMoney_(t.grandTotal) + '</td></tr>' +
        '</table>' +
      '</div>' +
    '</div>' +

    '<div class="terms">' +
      termsHtml +
    '</div>' +

    '<div class="sign">' +
      '<div class="sign-cell" style="text-align:left">' +
        '<div class="sign-box">' +
          '<div class="sign-title">Vendor Acceptance</div>' +
          '<div class="sign-sub">Signature &amp; Company Seal</div>' +
        '</div>' +
      '</div>' +
      '<div class="sign-cell" style="text-align:right">' +
        '<div class="sign-box" style="text-align:left">' +
          '<div class="sign-title">Authorised Signatory</div>' +
          '<div class="sign-sub">For ' + COMPANY_NAME_FULL + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div style="margin-top:24px;text-align:center;font-size:11px;color:#666;font-style:italic">' +
      '<strong>Authorised Signatory Stamp:</strong> This document is valid only when signed by an authorised signatory and stamped with the company seal.' +
    '</div>' +

    '<div class="foot">' + COMPANY_NAME_FULL + ' · System Generated Purchase Order</div>' +

    '</body></html>';
}

/**
 * Convert a number to Indian-style words (lakh/crore). e.g. 125432 → "One Lakh Twenty Five Thousand Four Hundred Thirty Two Rupees".
 */
function _poAmountInWords_(n) {
  n = Math.round(Number(n) || 0);
  if (n === 0) return 'Zero Rupees';
  var ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
                'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  var tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function twoD(x) {
    if (x < 20) return ones[x];
    return tens[Math.floor(x/10)] + (x%10 ? ' ' + ones[x%10] : '');
  }
  function threeD(x) {
    var h = Math.floor(x/100), r = x%100;
    return (h ? ones[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? twoD(r) : '');
  }
  var out = '';
  var crore = Math.floor(n / 10000000); n %= 10000000;
  var lakh  = Math.floor(n / 100000);   n %= 100000;
  var thou  = Math.floor(n / 1000);     n %= 1000;
  var hund  = n;
  if (crore) out += threeD(crore) + ' Crore ';
  if (lakh)  out += twoD(lakh) + ' Lakh ';
  if (thou)  out += twoD(thou) + ' Thousand ';
  if (hund)  out += threeD(hund);
  return out.trim() + ' Rupees';
}

// ─── Zoho PO Import ───────────────────────────────────────────────────────────
function syncZohoPOsNow(_session) {
  Logger.log('syncZohoPOsNow called — Zoho integration not configured.');
  return { ok:true, synced:0, msg:'Zoho integration not configured.' };
}

function uploadZohoPOCsv(csvText, _session) {
  if (!csvText) throw new Error('CSV text required.');
  var rows = Utilities.parseCsv(csvText);
  if (!rows||rows.length<2) return { ok:true, imported:0 };
  var headers = rows[0].map(function(h){return String(h||'').trim();});
  var imported = 0;
  for (var i=1;i<rows.length;i++) {
    var r = rows[i];
    var obj = {};
    headers.forEach(function(h,j){ obj[h]=r[j]||''; });
    try {
      var poNo = obj['PO No']||obj['PO Number']||obj['po_number']||'';
      if (!poNo) continue;
      _upsertPOToMainSheet_({
        poNo: poNo,
        vendor: obj['Vendor Name']||obj['vendor_name']||'',
        poValue: _num(obj['Amount']||obj['PO Value']||obj['po_value']),
        project: obj['Project']||obj['project_name']||'',
        status: obj['Status']||'Open'
      });
      imported++;
    } catch(e) { Logger.log('uploadZohoPOCsv row '+i+': '+e.message); }
  }
  _invalidateAllCaches_();
  return { ok:true, imported:imported };
}

function promoteDumpToPOWise(_session) {
  if (!_hasMinRole_('director',_session)) throw new Error('Director role required.');
  var dumpSh = _sheet(SHEETS.DUMP, false);
  if (!dumpSh||dumpSh.getLastRow()<2) return { ok:true, promoted:0 };
  var lastCol = dumpSh.getLastColumn();
  var data    = dumpSh.getRange(2,1,dumpSh.getLastRow()-1,lastCol).getValues();
  var hmap    = _headerMap(dumpSh);
  var poCol   = _findCol(hmap,['PO No.','PO No','PO Number']);
  if (!poCol) throw new Error('PO column not found in Dump sheet.');
  var promoted = 0;
  data.forEach(function(r){
    var poNo = safeString(r[poCol-1]);
    if (!poNo) return;
    try {
      _upsertPOToMainSheet_({
        poNo: poNo,
        vendor: safeString(r[(_findCol(hmap,['Vendor Name','Vendor'])||1)-1]),
        poValue: _num(r[(_findCol(hmap,['PO Value','Value','Amount'])||1)-1]),
        project: safeString(r[(_findCol(hmap,['Project','Project Name'])||1)-1]),
        status: 'Open'
      });
      promoted++;
    } catch(e) { Logger.log('promoteDump: '+e.message); }
  });
  return { ok:true, promoted:promoted };
}

// ─── Budget / PO Commitment Map ───────────────────────────────────────────────
function _loadCommitmentMap_() {
  var cached = _cacheGet_('PO_COMMITMENT_MAP');
  if (cached) return cached;
  var all = listPaymentRequests({});
  var map = {};
  all.forEach(function(r){
    var k = _poKey_(r.poNo);
    if (!k) return;
    map[k] = (map[k]||0) + r.amountRequested;
  });
  _cacheSet_('PO_COMMITMENT_MAP', map, 60);
  return map;
}

function suggestNextPONumber(prefix, _session) {
  var configuredPrefix = PropertiesService.getScriptProperties().getProperty('PO_NUM_PREFIX') || '';
  if (configuredPrefix) prefix = configuredPrefix;
  var sh   = _sheet(SHEETS.PO);
  var last = sh.getLastRow();
  if (last<3) return (prefix||'PO')+'/001';
  var hmap  = _headerMap(sh, _detectHeaderRow(sh,['po','vendor'],[],10));
  var poCol = _findCol(hmap,['PO No.','PO No','PO Number']);
  if (!poCol) return (prefix||'PO')+'/001';
  var pos = sh.getRange(3,poCol,last-2,1).getValues()
               .map(function(r){return String(r[0]||'');}).filter(Boolean);
  var max = 0;
  pos.forEach(function(p){
    if (!prefix||p.indexOf(prefix)===0) {
      var n = parseInt(p.replace(/\D/g,''),10);
      if (!isNaN(n)&&n>max) max=n;
    }
  });
  return (prefix||'PO')+'/'+String(max+1).padStart(3,'0');
}

function getPOPrefix(_session) {
  _poRequireAnyRole_(['proc', 'director'], _session);
  return PropertiesService.getScriptProperties().getProperty('PO_NUM_PREFIX') || '';
}

function setPOPrefix(prefix, _session) {
  _poRequireAnyRole_(['director'], _session);
  prefix = String(prefix || '').trim();
  if (prefix) {
    if (/[^a-zA-Z0-9\/\-]/.test(prefix)) {
      throw new Error('Prefix contains invalid characters. Use alphanumeric, / or -');
    }
  }
  PropertiesService.getScriptProperties().setProperty('PO_NUM_PREFIX', prefix);
  return { ok: true, prefix: prefix };
}
