/**
 * Luxeworx Atelier — Payment Tracker
 * vendors.gs  (v6.0 — Production Hardening Pass)
 *
 * Owns: vendor CRUD, one-time master migration from PO Wise Details,
 *       normalization, dedup detection, vendor cache, lookup utilities.
 *
 * _Vendors is the SINGLE SOURCE OF TRUTH after migration.
 * PO Wise Details becomes transactional-only.
 */

// ─── Required Schema ──────────────────────────────────────────────────────────
var VENDOR_HEADERS = [
  'Vendor ID','Legal Name','Trade Name','GSTIN','PAN','Status',
  'Address','State Code','Vendor Type',
  'Bank Name','Bank Branch','Account No','IFSC',
  'Email','Mobile','Contact Person','Phone',
  'Created At','Created By',
  'Migrated From','Legacy PO References','Normalized Vendor Key',
  'Source','Is Legacy','Updated At','Updated By'
];

// ─── Sheet Bootstrap ──────────────────────────────────────────────────────────
function _ensureVendorsSheet_() {
  var ss = _ss(), sh = ss.getSheetByName(SHEETS.VENDORS);
  if (!sh) {
    sh = ss.insertSheet(SHEETS.VENDORS);
    sh.appendRow(VENDOR_HEADERS);
    sh.setFrozenRows(1);
    return sh;
  }
  // Ensure all required columns exist (additive — never removes existing data)
  var lastCol = sh.getLastColumn();
  var existing = lastCol ? sh.getRange(1,1,1,lastCol).getValues()[0] : [];
  var existingMap = {};
  existing.forEach(function(h,i){ existingMap[String(h||'').trim()] = i+1; });
  VENDOR_HEADERS.forEach(function(h) {
    if (!existingMap[h]) {
      sh.getRange(1, sh.getLastColumn()+1).setValue(h);
      _invalidateHeaderCache_(sh);
    }
  });
  sh.setFrozenRows(1);
  return sh;
}

function _vendorIdx_() {
  var sh  = _ensureVendorsSheet_();
  var hdr = sh.getLastColumn() ? sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0] : [];
  var idx = {};
  hdr.forEach(function(h,i){ idx[String(h||'').trim()] = i; });
  return { sheet:sh, idx:idx };
}

// ─── Next Vendor ID (stable, never row-number based) ─────────────────────────
function _nextVendorId_() {
  var meta = _vendorIdx_(), sh = meta.sheet, idx = meta.idx;
  _requireIndex_(idx['Vendor ID'], 'Vendor ID');
  var max = 0, last = sh.getLastRow();
  if (last >= 2) {
    var ids = sh.getRange(2, idx['Vendor ID']+1, last-1, 1).getValues();
    ids.forEach(function(r) {
      var m = String(r[0]||'').match(/VEN-(\d+)/i);
      if (m) max = Math.max(max, parseInt(m[1],10)||0);
    });
  }
  return 'VEN-' + String(max+1).padStart(4,'0');
}

// ─── Row → Object ─────────────────────────────────────────────────────────────
function _vendorRowToObj_(r, idx, rowNumber) {
  function g(f) { return idx[f]!==undefined ? r[idx[f]] : ''; }
  var legalName = safeString(g('Legal Name'));
  var tradeName = safeString(g('Trade Name'));
  var name = legalName || tradeName;
  return {
    rowNumber:    rowNumber||0,
    vendorId:     safeString(g('Vendor ID')),
    vendorName:   name,  name:name,
    legalName:    legalName||name, tradeName:tradeName,
    gstin:        safeString(g('GSTIN')),
    pan:          safeString(g('PAN')),
    status:       safeString(g('Status')),
    address:      safeString(g('Address')),
    stateCode:    safeString(g('State Code')),
    vendorType:   safeString(g('Vendor Type')),
    bankName:     safeString(g('Bank Name')),
    bankBranch:   safeString(g('Bank Branch')),
    accountNo:    safeString(g('Account No')),
    ifsc:         safeString(g('IFSC')),
    email:        safeString(g('Email')),
    mobile:       safeString(g('Mobile')),
    contactPerson:safeString(g('Contact Person')),
    phone:        safeString(g('Phone')),
    migratedFrom: safeString(g('Migrated From')),
    legacyPOReferences: safeString(g('Legacy PO References')),
    normalizedKey: safeString(g('Normalized Vendor Key')),
    source:       safeString(g('Source'))||'vendors_master',
    isLegacy:     g('Is Legacy')===true||String(g('Is Legacy')).toLowerCase()==='true',
    createdAt:    g('Created At') ? new Date(g('Created At')).toISOString() : '',
    createdBy:    safeString(g('Created By'))
  };
}

// ─── Vendor Cache ─────────────────────────────────────────────────────────────
function _vendorCacheKey_() { return 'VENDORS_LIST'; }

function _invalidateVendorCache_() {
  _cacheDel_(_vendorCacheKey_());
  _invalidateAllCaches_();
}

// ─── Core CRUD ────────────────────────────────────────────────────────────────
function getVendorsList() {
  try { _runSafeInitialMigrationOnlyOnce(); } catch(e) { Logger.log('getVendorsList migration: '+e); }

  var cached = _cacheGet_(_vendorCacheKey_());
  if (cached) return cached;

  var sh = _ensureVendorsSheet_(), last = sh.getLastRow();
  if (last<2) return [];
  var lastCol = sh.getLastColumn();
  var hdr = sh.getRange(1,1,1,lastCol).getValues()[0];
  var idx = {};
  hdr.forEach(function(h,i){ idx[String(h||'').trim()] = i; });
  _requireIndex_(idx['Vendor ID'],   'Vendor ID');
  _requireIndex_(idx['Legal Name'],  'Legal Name');

  var data = sh.getRange(2,1,last-1,lastCol).getValues();
  var result = data.map(function(r,i){
    return _vendorRowToObj_(r, idx, i+2);
  }).filter(function(v){ return !!v.legalName; });

  _cacheSet_(_vendorCacheKey_(), result, _CACHE_TTL_.VENDORS);
  return result;
}

function getVendorByName(legalName) {
  var key = _vendorIdentityKey_(legalName);
  if (!key) return null;
  return getVendorsList().filter(function(v) {
    return _vendorIdentityKey_(v.legalName)===key ||
           _vendorIdentityKey_(v.tradeName)===key;
  })[0] || null;
}

function findVendorMasterRecord(vendorName) { return getVendorByName(vendorName); }

/**
 * getAllVendors — returns master vendors PLUS any names found in PO Wise Details
 * that don't yet have a master record (isLegacy=true).
 * After migration, the legacy fallback list should be empty.
 */
function getAllVendors() {
  var byKey = {};
  getVendorsList().forEach(function(v) {
    var key = _vendorIdentityKey_(v.legalName||v.tradeName||v.vendorName);
    if (key) byKey[key] = v;
  });
  // Legacy fallback scan (removed after initializeVendorMasterMigration runs)
  var sh = _sheet(SHEETS.PO, false);
  if (sh && sh.getLastRow()>1 && sh.getLastColumn()>0) {
    var hdrRow    = _detectHeaderRow(sh,['po','vendor'],[],10);
    var hmap      = _headerMap(sh, hdrRow);
    var vendorCol = _requireCol_(hmap,['Vendor Name','Vendor'],'Vendor Name');
    var poCol     = _findCol(hmap,['PO No.','PO No','PO Number','P.O No']);
    var data      = sh.getRange(hdrRow+1,1,sh.getLastRow()-hdrRow,sh.getLastColumn()).getValues();
    data.forEach(function(r) {
      var vn  = safeString(r[vendorCol-1]);
      var key = _vendorIdentityKey_(vn);
      if (!key||byKey[key]) return;
      byKey[key] = {
        vendorId:'', vendorName:vn, name:vn, legalName:vn, tradeName:'',
        source:'po_legacy', isLegacy:true,
        legacyPOReferences: poCol ? safeString(r[poCol-1]) : ''
      };
    });
  }
  return Object.keys(byKey).map(function(k){return byKey[k];})
    .sort(function(a,b){ return String(a.legalName).localeCompare(String(b.legalName)); });
}

function addVendor(payload, options) {
  options = options||{};
  payload = payload||{};
  var legalName = requireField(payload.legalName||payload.vendorName||payload.name,'Legal Name');

  // Duplicate detection
  var dupCheck = _detectDuplicateVendor_(legalName, payload.gstin, payload.pan);
  if (dupCheck && !options.force) {
    throw new Error('Duplicate vendor detected: "'+dupCheck.legalName+'" ('+dupCheck.vendorId+'). Use force:true to override.');
  }

  var meta = _vendorIdx_(), sh = meta.sheet, idx = meta.idx;
  var vendorId = payload.vendorId || _nextVendorId_();
  var now = new Date(), u = getCurrentUser();

  var gstin = payload.gstin ? validateGST(payload.gstin)  : '';
  var pan   = payload.pan   ? validatePAN(payload.pan)     : '';

  var row = new Array(VENDOR_HEADERS.length).fill('');
  function set(field, val) { if (idx[field]!==undefined) row[idx[field]] = val||''; }

  set('Vendor ID',             vendorId);
  set('Legal Name',            legalName);
  set('Trade Name',            safeString(payload.tradeName));
  set('GSTIN',                 gstin);
  set('PAN',                   pan);
  set('Status',                payload.status||'Active');
  set('Address',               safeString(payload.address));
  set('State Code',            safeString(payload.stateCode));
  set('Vendor Type',           safeString(payload.vendorType));
  set('Bank Name',             safeString(payload.bankName));
  set('Bank Branch',           safeString(payload.bankBranch));
  set('Account No',            safeString(payload.accountNo));
  set('IFSC',                  safeString(payload.ifsc));
  set('Email',                 safeString(payload.email));
  set('Mobile',                safeString(payload.mobile));
  set('Contact Person',        safeString(payload.contactPerson));
  set('Phone',                 safeString(payload.phone));
  set('Created At',            now);
  set('Created By',            u.email);
  set('Migrated From',         safeString(payload.migratedFrom));
  set('Legacy PO References',  safeString(payload.legacyPOReferences));
  set('Normalized Vendor Key', _vendorIdentityKey_(legalName));
  set('Source',                payload.source||'app');
  set('Is Legacy',             !!(payload.isLegacy));
  set('Updated At',            now);
  set('Updated By',            u.email);

  sh.appendRow(row);
  _invalidateVendorCache_();
  _logAudit(u.email, 'Vendor Added', vendorId+' '+legalName, 'Vendors');
  return { ok:true, vendorId:vendorId, legalName:legalName };
}

function updateVendor(payload) {
  payload = payload||{};
  var vendorId = requireField(payload.vendorId,'Vendor ID');
  var meta = _vendorIdx_(), sh = meta.sheet, idx = meta.idx;
  _requireIndex_(idx['Vendor ID'], 'Vendor ID');
  var lastRow = sh.getLastRow();
  if (lastRow<2) throw new Error('Vendor not found: '+vendorId);
  var ids = sh.getRange(2, idx['Vendor ID']+1, lastRow-1, 1).getValues();
  var targetRow = -1;
  for (var i=0;i<ids.length;i++) {
    if (safeString(ids[i][0])===vendorId) { targetRow=i+2; break; }
  }
  if (targetRow<0) throw new Error('Vendor not found: '+vendorId);

  var row = sh.getRange(targetRow,1,1,sh.getLastColumn()).getValues()[0];
  function upd(field, val) { if (idx[field]!==undefined && val!==undefined) row[idx[field]]=val; }

  if (payload.legalName)   upd('Legal Name',  requireField(payload.legalName,'Legal Name'));
  if (payload.tradeName)   upd('Trade Name',  safeString(payload.tradeName));
  if (payload.gstin)       upd('GSTIN',       validateGST(payload.gstin));
  if (payload.pan)         upd('PAN',         validatePAN(payload.pan));
  if (payload.status)      upd('Status',      payload.status);
  if (payload.address)     upd('Address',     safeString(payload.address));
  if (payload.bankName)    upd('Bank Name',   safeString(payload.bankName));
  if (payload.accountNo)   upd('Account No',  safeString(payload.accountNo));
  if (payload.ifsc)        upd('IFSC',        safeString(payload.ifsc));
  if (payload.email)       upd('Email',       safeString(payload.email));
  if (payload.mobile)      upd('Mobile',      safeString(payload.mobile));

  var now = new Date(), u = getCurrentUser();
  upd('Updated At', now);
  upd('Updated By', u.email);
  if (idx['Legal Name']!==undefined)
    row[idx['Normalized Vendor Key']] = _vendorIdentityKey_(row[idx['Legal Name']]);

  sh.getRange(targetRow,1,1,row.length).setValues([row]);
  _invalidateVendorCache_();
  _logAudit(u.email, 'Vendor Updated', vendorId, 'Vendors');
  return { ok:true, vendorId:vendorId };
}

function getVendorByPO(poNumber) {
  poNumber = safeString(poNumber);
  if (!poNumber) return null;
  var sh = _sheet(SHEETS.PO, false);
  if (!sh) return null;
  var hdrRow  = _detectHeaderRow(sh,['po','vendor'],[],10);
  var hmap    = _headerMap(sh, hdrRow);
  var vendorCol = _findCol(hmap, ['Vendor Name','Vendor']);
  var poCol     = _findCol(hmap, ['PO No.','PO No','PO Number','P.O No']);
  if (!vendorCol||!poCol) return null;
  var data = sh.getRange(hdrRow+1,1,sh.getLastRow()-hdrRow,sh.getLastColumn()).getValues();
  for (var i=0;i<data.length;i++) {
    if (safeString(data[i][poCol-1]).toLowerCase()===poNumber.toLowerCase()) {
      var vn = safeString(data[i][vendorCol-1]);
      if (vn) return findVendorMasterRecord(vn) || { legalName:vn, source:'po_legacy' };
    }
  }
  return null;
}

function getPOsByVendor(vendorName) {
  vendorName = safeString(vendorName);
  if (!vendorName) return [];
  var key = _vendorIdentityKey_(vendorName);
  var sh  = _sheet(SHEETS.PO, false);
  var data = [];
  var poCol=0, vendorCol=0, valCol=0, revisedCol=0, projCol=0, statusCol=0, paidCol=0, balCol=0, catCol=0, codeCol=0;

  if (sh) {
    var hdrRow = _detectHeaderRow(sh,['po','vendor'],[],10);
    if (hdrRow > 0) {
      var hmap   = _headerMap(sh, hdrRow);
      poCol       = _findCol(hmap,['PO No.','PO No','PO Number','P.O No']);
      vendorCol   = _findCol(hmap,['Vendor Name','Vendor']);
      valCol      = _findCol(hmap,['PO Value','PO Amount','Amount','Value']);
      revisedCol  = _findCol(hmap,['Revised PO Value','Revised Value','Revised Amount']);
      projCol     = _findCol(hmap,['Project Name','Project']);
      statusCol   = _findCol(hmap,['PO STATUS','Status','PO Status']);
      paidCol     = _findCol(hmap,['Amount Paid','Paid']);
      balCol      = _findCol(hmap,['Balance','PO Balance']);
      catCol      = _findCol(hmap,['Category']);
      codeCol     = _findCol(hmap,['Vendor Code','Vendor code']);

      var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
      if (lastRow > hdrRow) {
        data = sh.getRange(hdrRow+1,1,lastRow-hdrRow,lastCol).getValues();
      }
    }
  }
  
  var filtered = data.filter(function(r){
    return vendorCol > 0 && _vendorIdentityKey_(safeString(r[vendorCol-1]))===key;
  });
  
  var poAgg = null;
  var result = filtered.map(function(r) {
    var poVal = valCol > 0 ? _num(r[valCol-1]) : 0;
    var revVal = revisedCol > 0 ? _num(r[revisedCol-1]) : poVal;
    var paid = paidCol > 0 ? _num(r[paidCol-1]) : 0;
    var poNo = poCol > 0 ? safeString(r[poCol-1]) : '';
    
    if (!poAgg) poAgg = (typeof getPOPaymentsAggregated === 'function') ? getPOPaymentsAggregated() : {};
    var sysMap = (typeof _loadSystemPaidMap_ === 'function') ? _loadSystemPaidMap_() : {};
    
    var poKeyStr = typeof _poKey_ === 'function' ? _poKey_(poNo) : String(poNo).toUpperCase();
    var agg = poAgg[poKeyStr] || { remitted: 0, requested: 0 };
    var sysPaid = sysMap[poKeyStr] || 0;
    
    paid = Math.max(paid, agg.remitted + sysPaid);
    var bal = revVal - paid - agg.requested;
    
    return {
      poNo: poNo,
      vendor: vendorCol > 0 ? safeString(r[vendorCol-1]) : '',
      vendorCode: codeCol > 0 ? safeString(r[codeCol-1]) : '',
      project: projCol > 0 ? safeString(r[projCol-1]) : '',
      category: catCol > 0 ? safeString(r[catCol-1]) : '',
      status: statusCol > 0 ? safeString(r[statusCol-1]) : 'Open',
      poValue: poVal,
      revisedPOValue: revVal,
      paid: paid,
      balance: bal
    };
  });

  try {
    var shFull = _ss().getSheetByName('_POHeaders');
    if (shFull && shFull.getLastRow() >= 2) {
      var mapFull = {};
      var hdrFull = shFull.getRange(1, 1, 1, shFull.getLastColumn()).getValues()[0];
      hdrFull.forEach(function(h, idx) { mapFull[String(h).trim()] = idx; });
      var rowsFull = shFull.getRange(2, 1, shFull.getLastRow() - 1, shFull.getLastColumn()).getValues();
      var poAgg = null;
      rowsFull.forEach(function(r) {
        if (_vendorIdentityKey_(safeString(r[mapFull['Vendor Name']])) === key) {
          var poNo = safeString(r[mapFull['PO No']]);
          if (!poNo) return;
          var existing = null;
          for (var j = 0; j < result.length; j++) {
            if (_poKey_(result[j].poNo) === _poKey_(poNo)) { existing = result[j]; break; }
          }
          var poVal = _num(r[mapFull['Grand Total']]);
          
          if (!poAgg) poAgg = (typeof getPOPaymentsAggregated === 'function') ? getPOPaymentsAggregated() : {};
          var sysMap = (typeof _loadSystemPaidMap_ === 'function') ? _loadSystemPaidMap_() : {};
          var poKeyStr = typeof _poKey_ === 'function' ? _poKey_(poNo) : String(poNo).toUpperCase();
          var agg = poAgg[poKeyStr] || { remitted: 0, requested: 0 };
          var sysPaid = sysMap[poKeyStr] || 0;
          
          if (existing) {
             existing.vendorCode = existing.vendorCode || safeString(r[mapFull['Vendor Code']]);
             existing.category = existing.category || safeString(r[mapFull['Category']]);
             existing.status = safeString(r[mapFull['Status']]) || existing.status;
             existing.poValue = poVal;
             existing.revisedPOValue = poVal;
             existing.paid = Math.max(existing.paid, agg.remitted + sysPaid);
             existing.balance = poVal - existing.paid - agg.requested;
          } else {
            result.push({
              poNo: poNo,
              vendor: safeString(r[mapFull['Vendor Name']]),
              vendorCode: safeString(r[mapFull['Vendor Code']]),
              project: safeString(r[mapFull['Project']]),
              category: safeString(r[mapFull['Category']]),
              status: safeString(r[mapFull['Status']]) || 'Open',
              poValue: poVal,
              revisedPOValue: poVal,
              paid: agg.remitted + sysPaid,
              balance: poVal - (agg.remitted + sysPaid) - agg.requested
            });
          }
        }
      });
    }
  } catch(e) { Logger.log('Error merging structured POs in getPOsByVendor: ' + e); }

  return result;
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────
function _detectDuplicateVendor_(legalName, gstin, pan) {
  var key   = _vendorIdentityKey_(legalName);
  var gstIn = safeString(gstin).toUpperCase();
  var panIn = safeString(pan).toUpperCase();
  var list  = getVendorsList();
  for (var i=0;i<list.length;i++) {
    var v = list[i];
    if (_vendorIdentityKey_(v.legalName)===key) return v;
    if (gstIn && v.gstin && safeString(v.gstin).toUpperCase()===gstIn) return v;
    if (panIn && v.pan   && safeString(v.pan).toUpperCase()===panIn)  return v;
  }
  return null;
}

function detectDuplicatePO(poNo, vendorName) {
  var sh = _sheet(SHEETS.PO, false);
  if (!sh) return { isDuplicate:false };
  var hdrRow = _detectHeaderRow(sh,['po','vendor'],[],10);
  var hmap   = _headerMap(sh, hdrRow);
  var poCol     = _findCol(hmap,['PO No.','PO No','PO Number']);
  var vendorCol = _findCol(hmap,['Vendor Name','Vendor']);
  if (!poCol) return { isDuplicate:false };
  var data = sh.getRange(hdrRow+1,1,sh.getLastRow()-hdrRow,sh.getLastColumn()).getValues();
  var poNorm = safeString(poNo).toLowerCase();
  var vkNorm = _vendorIdentityKey_(vendorName);
  for (var i=0;i<data.length;i++) {
    if (safeString(data[i][poCol-1]).toLowerCase()!==poNorm) continue;
    if (!vendorCol||!vkNorm) return { isDuplicate:true, poNo:poNo };
    if (_vendorIdentityKey_(safeString(data[i][vendorCol-1]))===vkNorm)
      return { isDuplicate:true, poNo:poNo, vendor:safeString(data[i][vendorCol-1]) };
  }
  return { isDuplicate:false };
}

// ─── migrateLegacyVendor (single name) ───────────────────────────────────────
function migrateLegacyVendor(vendorName) {
  requireField(vendorName,'Vendor name');
  var existing = findVendorMasterRecord(vendorName);
  if (existing) return existing;
  // Collect any PO references for this vendor
  var pos = getPOsByVendor(vendorName);
  var poRefs = pos.map(function(r){return safeString(r.poNo || r[0]);}).filter(Boolean).slice(0,20).join(', ');
  var result = addVendor({
    legalName: safeString(vendorName),
    status: 'Active',
    source: 'migrated',
    isLegacy: true,
    migratedFrom: 'PO Wise Details',
    legacyPOReferences: poRefs
  });
  return getVendorByName(vendorName);
}

// ─── ONE-TIME VENDOR MASTER MIGRATION ────────────────────────────────────────
/**
 * initializeVendorMasterMigration()
 *
 * Run once (admin-only) to:
 *   1. Scan all vendor names from PO Wise Details (full history).
 *   2. Normalise each name for identity matching.
 *   3. Skip any already in _Vendors (by normalised key OR GST/PAN).
 *   4. Create _Vendors records for every new unique vendor with a stable
 *      VEN-XXXX code and back-references to the PO rows.
 *   5. After migration, ALL dropdowns / searches use _Vendors exclusively.
 *
 * Safe to call multiple times — idempotent (skips already-migrated vendors).
 */
function initializeVendorMasterMigration(_session) {
  if (_session !== undefined && !_hasMinRole_('director', _session))
    throw new Error('Director role required for vendor migration.');

  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch(_){ throw new Error('System busy. Try again later.'); }

  try {
    var u         = getCurrentUser(_session);
    var poSh      = _sheet(SHEETS.PO, false);
    if (!poSh) return { ok:true, migrated:0, skipped:0, msg:'PO Wise Details sheet not found — nothing to migrate.' };

    var hdrRow    = _detectHeaderRow(poSh,['po','vendor'],[],10);
    var hmap      = _headerMap(poSh, hdrRow);
    var vendorCol = _requireCol_(hmap,['Vendor Name','Vendor','Name of Vendor','Payee'],'Vendor Name');
    var poCol     = _findCol(hmap,['PO No.','PO No','PO Number','P.O No','P.O No.']);
    var gstCol    = _findCol(hmap,['GSTIN','GST','GST No','GST Number']);
    var panCol    = _findCol(hmap,['PAN','PAN No']);

    var lastRow  = poSh.getLastRow(), lastCol = poSh.getLastColumn();
    if (lastRow <= hdrRow) return { ok:true, migrated:0, skipped:0, msg:'PO sheet is empty.' };

    var data = poSh.getRange(hdrRow+1,1,lastRow-hdrRow,lastCol).getValues();

    // Build a map of normalised key → { legalName, poRefs[], gstin, pan }
    var vendorMap = {};
    data.forEach(function(r) {
      var vn  = safeString(r[vendorCol-1]);
      if (!vn) return;
      var key = _vendorIdentityKey_(vn);
      if (!key) return;
      if (!vendorMap[key]) {
        vendorMap[key] = {
          legalName: vn,
          poRefs:    [],
          gstin:     gstCol ? safeString(r[gstCol-1]) : '',
          pan:       panCol ? safeString(r[panCol-1]) : ''
        };
      }
      if (poCol) {
        var poRef = safeString(r[poCol-1]);
        if (poRef && vendorMap[key].poRefs.indexOf(poRef)<0) vendorMap[key].poRefs.push(poRef);
      }
      // Prefer first non-empty GST/PAN
      if (!vendorMap[key].gstin && gstCol) vendorMap[key].gstin = safeString(r[gstCol-1]);
      if (!vendorMap[key].pan   && panCol) vendorMap[key].pan   = safeString(r[panCol-1]);
    });

    // Pre-load existing vendor keys for fast dedup check
    var existing = getVendorsList();
    var existingKeys = {};
    var existingGST  = {};
    var existingPAN  = {};
    existing.forEach(function(v) {
      existingKeys[_vendorIdentityKey_(v.legalName)] = true;
      if (v.gstin) existingGST[safeString(v.gstin).toUpperCase()] = true;
      if (v.pan)   existingPAN[safeString(v.pan).toUpperCase()]   = true;
    });

    var migrated = 0, skipped = 0;
    var batchRows = [];
    var meta = _vendorIdx_(), sh = meta.sheet, idx = meta.idx;
    var nextId = 0;
    // Determine current max ID once
    var lastVRow = sh.getLastRow();
    if (lastVRow>=2) {
      var ids = sh.getRange(2,idx['Vendor ID']+1,lastVRow-1,1).getValues();
      ids.forEach(function(r){
        var m = String(r[0]||'').match(/VEN-(\d+)/i);
        if (m) nextId = Math.max(nextId, parseInt(m[1],10)||0);
      });
    }

    Object.keys(vendorMap).forEach(function(key) {
      var v = vendorMap[key];
      // Skip if already exists by normalised name, GST, or PAN
      if (existingKeys[key]) { skipped++; return; }
      if (v.gstin && existingGST[v.gstin.toUpperCase()]) { skipped++; return; }
      if (v.pan   && existingPAN[v.pan.toUpperCase()])   { skipped++; return; }

      nextId++;
      var vendorId = 'VEN-' + String(nextId).padStart(4,'0');
      var now = new Date();
      var row = new Array(VENDOR_HEADERS.length).fill('');
      function set(field, val) { if (idx[field]!==undefined) row[idx[field]] = val||''; }
      set('Vendor ID',             vendorId);
      set('Legal Name',            v.legalName);
      set('GSTIN',                 v.gstin||'');
      set('PAN',                   v.pan||'');
      set('Status',                'Active');
      set('Created At',            now);
      set('Created By',            u.email);
      set('Migrated From',         'PO Wise Details');
      set('Legacy PO References',  v.poRefs.slice(0,50).join(', '));
      set('Normalized Vendor Key', key);
      set('Source',                'migration');
      set('Is Legacy',             true);
      set('Updated At',            now);
      set('Updated By',            u.email);
      batchRows.push(row);
      migrated++;
    });

    // Batch-write all new rows (single API call instead of appendRow per vendor)
    if (batchRows.length) {
      var startRow = sh.getLastRow()+1;
      sh.getRange(startRow,1,batchRows.length,VENDOR_HEADERS.length).setValues(batchRows);
    }

    _invalidateVendorCache_();
    _logAudit(u.email,'Vendor Migration','Migrated '+migrated+', skipped '+skipped,'Admin');

    return {
      ok:      true,
      migrated: migrated,
      skipped:  skipped,
      msg:     'Migration complete. Migrated ' + migrated + ' new vendor(s). ' + skipped + ' already existed.'
    };

  } finally {
    try { lock.releaseLock(); } catch(_) {}
  }
}

// ─── Vendor Summary / Lookup ──────────────────────────────────────────────────
function getVendorSummary(query) {
  // Safe initial migration check
  try { _runSafeInitialMigrationOnlyOnce(); } catch(e) { Logger.log('getVendorSummary migration: '+e); }

  var vendors = getVendorsList();
  var poSh = _sheet(SHEETS.PO, false);
  
  // 1. Gather all live payment data
  var prList = (typeof _prLoadAll === 'function') ? _prLoadAll() : [];
  var vendorPRs = {};
  prList.forEach(function(pr) {
    var vk = _vendorIdentityKey_(pr.vendor);
    if (!vk) return;
    if (!vendorPRs[vk]) vendorPRs[vk] = { remitted: 0, requested: 0 };
    var amt = pr.dirAmt || pr.finAmt || pr.procAmt || pr.amountRequested || 0;
    var isRemitted = /Remitted/i.test(String(pr.remittance||''));
    var isRejected = /Rejected/i.test(String(pr.procApproval||'')) || 
                     /Rejected/i.test(String(pr.financeApproval||'')) || 
                     /Rejected/i.test(String(pr.directorApproval||''));
    if (isRemitted) {
      vendorPRs[vk].remitted += amt;
    } else if (!isRejected) {
      vendorPRs[vk].requested += amt;
    }
  });

  // 1b. Map PR Keys from Payment Tracker
  var prVendorMap = {};
  prList.forEach(function(pr) {
    if (pr.vendor && pr.id) {
      var vKey = _vendorIdentityKey_(pr.vendor);
      prVendorMap["PR#" + pr.id] = vKey;
      prVendorMap[String(pr.id)] = vKey;
    }
  });

  // 1c. Read _SystemPayments directly via PR Key
  var sysSh = _ss().getSheetByName('_SystemPayments');
  if (sysSh && sysSh.getLastRow() >= 2) {
    var sysHmap = _headerMap(sysSh, 1);
    var sysAmtCol = sysHmap['Amount'] || 3;
    var sysPrCol = sysHmap['PR Key'] || 4;
    
    var sysData = sysSh.getRange(2, 1, sysSh.getLastRow()-1, sysSh.getLastColumn()).getValues();
    sysData.forEach(function(r) {
      var amt = _num(r[sysAmtCol-1]);
      var prKey = safeString(r[sysPrCol-1]);
      if (prKey && amt > 0) {
        var vKey = prVendorMap[prKey];
        if (vKey) {
          if (!vendorPRs[vKey]) vendorPRs[vKey] = { remitted: 0, requested: 0, systemPRPaid: 0 };
          vendorPRs[vKey].systemPRPaid = (vendorPRs[vKey].systemPRPaid || 0) + amt;
        }
      }
    });
  }

  // 2. Gather PO details
  var poMap = {};
  var baselineMap = (typeof _loadBaselinePaidMap_ === 'function') ? _loadBaselinePaidMap_() : {};
  var systemMap   = (typeof _loadSystemPaidMap_ === 'function') ? _loadSystemPaidMap_() : {};
    if (poSh) {
    var hdrRow = _detectHeaderRow(poSh,['po','vendor'],[],10);
    var hmap   = _headerMap(poSh, hdrRow);
    var poCol       = _findCol(hmap,['PO No.','PO No','PO Number','P.O No']);
    var vendorCol   = _findCol(hmap,['Vendor Name','Vendor']);
    var valCol      = _findCol(hmap,['PO Value','PO Amount','Amount','Value']);
    var revisedCol  = _findCol(hmap,['Revised PO Value','Revised Value','Revised Amount']);
    var projCol     = _findCol(hmap,['Project Name','Project']);
    var statusCol   = _findCol(hmap,['PO STATUS','Status','PO Status']);
    var paidCol     = _findCol(hmap,['Amount Paid','Paid']);
    var vCodeCol    = _findCol(hmap,['Vendor Code']);
    var vGstCol     = _findCol(hmap,['GSTIN']);
    var vPanCol     = _findCol(hmap,['PAN']);
    
    var lastRow = poSh.getLastRow(), lastCol = poSh.getLastColumn();
    if (lastRow > hdrRow) {
      var remainingPayments = Object.assign({}, systemMap); // Clone for fuzzy matching
      var data = poSh.getRange(hdrRow+1,1,lastRow-hdrRow,lastCol).getValues();
      data.forEach(function(r) {
        var vn = vendorCol > 0 ? safeString(r[vendorCol-1]) : '';
        if (!vn) return;
        var key = _vendorIdentityKey_(vn);
        if (!poMap[key]) poMap[key] = [];
        
        var poVal = valCol > 0 ? _num(r[valCol-1]) : 0;
        var revVal = revisedCol > 0 ? _num(r[revisedCol-1]) : poVal;
        var paid = paidCol > 0 ? _num(r[paidCol-1]) : 0;
        
        var pNo = poCol > 0 ? safeString(r[poCol-1]) : '';
        var poKeyStr = (typeof _poKey_ === 'function') ? _poKey_(pNo) : String(pNo||'').toUpperCase();
        var basePaid = (baselineMap[poKeyStr] !== undefined) ? baselineMap[poKeyStr] : paid;
        var sysPaid = systemMap[poKeyStr] || 0;
        
        if (systemMap[poKeyStr] !== undefined) delete remainingPayments[poKeyStr];
        
        var truePaid = basePaid + sysPaid;
        
        poMap[key].push({
          poNo: pNo,
          project: projCol > 0 ? safeString(r[projCol-1]) : '',
          status: statusCol > 0 ? safeString(r[statusCol-1]) : 'Open',
          poValue: poVal,
          revisedPOValue: revVal,
          paid: truePaid,
          poKeyStr: poKeyStr // Keep for fuzzy matcher
        });
      });

      // Fuzzy Matcher: Assign broken POs to the closest Vendor
      Object.keys(remainingPayments).forEach(function(remKey) {
        var amt = remainingPayments[remKey];
        if (amt <= 0) return;
        
        var matchedVendor = null;
        var matchedPO = null;
        Object.keys(poMap).forEach(function(vKey) {
          if (matchedPO) return;
          poMap[vKey].forEach(function(p) {
            if (matchedPO) return;
            if (p.poKeyStr.indexOf(remKey) >= 0 || remKey.indexOf(p.poKeyStr) >= 0) {
              matchedVendor = vKey;
              matchedPO = p;
            }
          });
        });
        if (matchedPO) {
          matchedPO.paid += amt;
          delete remainingPayments[remKey];
        }
      });
    }
  }

  // 3. Build summary
  var list = vendors.map(function(v) {
    var key = _vendorIdentityKey_(v.legalName);
    var vPOs = poMap[key] || [];
    var prs = vendorPRs[key] || { remitted: 0, requested: 0 };
    
    var totalPOValue = 0;
    var legacyTotalPaid = 0;
    
    vPOs.forEach(function(p) {
      totalPOValue += p.revisedPOValue || p.poValue;
      legacyTotalPaid += p.paid;
    });
    
    // Combine Legacy PO Paid, Live Payment Tracker, and _SystemPayments via PR
    var totalPaid = Math.max(legacyTotalPaid, prs.remitted);
    var totalRequested = prs.requested;
    var sysPaid = prs.systemPRPaid || 0;
    
    // Total true payments includes the manually injected system amounts linked via PR
    var trueTotalPaid = totalPaid + sysPaid;
    var totalPayable = totalPOValue - trueTotalPaid - totalRequested;
    
    // Ensure pos array reflects the updated live balances
    var poAgg = (typeof getPOPaymentsAggregated === 'function') ? getPOPaymentsAggregated() : {};
    var updatedPOs = vPOs.map(function(p) {
      var agg = poAgg[typeof _poKey_ === 'function' ? _poKey_(p.poNo) : String(p.poNo||'').toUpperCase()] || { remitted: 0, requested: 0 };
      var pPaid = Math.max(p.paid, agg.remitted);
      
      // If we have floating system payment money for this vendor, start attaching it to the oldest POs
      if (sysPaid > 0) {
         var bal = (p.revisedPOValue || p.poValue) - pPaid;
         var apply = Math.min(sysPaid, bal);
         pPaid += apply;
         sysPaid -= apply;
      }
      
      var pBal = (p.revisedPOValue || p.poValue) - pPaid - agg.requested;
      p.paid = pPaid;
      p.payable = Math.max(0, pBal);
      p.requested = agg.requested;
      return p;
    });

    // Add summary fields to the vendor object
    return {
      rowNumber: v.rowNumber,
      vendorId: v.vendorId,
      code: v.vendorId,
      vendorName: v.legalName || v.vendorName || v.name,
      vendor: v.legalName || v.vendorName || v.name,
      legalName: v.legalName,
      tradeName: v.tradeName,
      gstin: v.gstin,
      pan: v.pan,
      status: v.status,
      address: v.address,
      email: v.email,
      mobile: v.mobile,
      poCount: updatedPOs.length,
      totalPOValue: totalPOValue,
      totalPaid: trueTotalPaid,
      totalRequested: totalRequested,
      totalPayable: Math.max(0, totalPayable),
      pos: updatedPOs
    };
  });

  var cacheKey = 'VEND_SUM_V5_' + (query||'ALL');
  if (query) {
    var q = safeString(query).toLowerCase();
    list = list.filter(function(v) {
      return (v.name||'').toLowerCase().indexOf(q)>=0 ||
             (v.code||'').toLowerCase().indexOf(q)>=0;
    });
  }

  var debugStr = Object.keys(systemMap).map(function(k) { return k + ':' + systemMap[k]; }).slice(0, 10).join(' | ');
  list.unshift({
    vendor: 'DEBUG: systemMap size = ' + Object.keys(systemMap).length,
    code: 'SYS-MAP',
    totalPOValue: Object.keys(systemMap).length,
    totalPaid: 0,
    totalPayable: 0,
    pos: [{ poNo: 'KEYS -> ' + debugStr, status: 'Debug', poValue: 0, paid: 0, payable: 0, project: '' }]
  });

  _cacheSet_(cacheKey, list, 30);
  return list.sort(function(a,b) { 
    if (a.code === 'SYS-MAP') return -1;
    if (b.code === 'SYS-MAP') return 1;
    return b.totalPayable - a.totalPayable; 
  });
}

/**
 * _runSafeInitialMigrationOnlyOnce()
 * Programmatic check called on boot. Runs initializeVendorMasterMigration
 * exactly once across all users/triggers, stored in ScriptProperties.
 */
function _runSafeInitialMigrationOnlyOnce() {
  var sh = _sheet(SHEETS.VENDORS, false);
  var isEmpty = !sh || sh.getLastRow() < 2;

  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('VENDOR_MIGRATION_V6_DONE') === 'true' && !isEmpty) {
    return;
  }
  var lock = LockService.getScriptLock();
  try {
    if (lock.tryLock(5000)) {
      if (props.getProperty('VENDOR_MIGRATION_V6_DONE') === 'true' && !isEmpty) {
        return;
      }
      Logger.log('[Init] Running auto-migration for legacy vendors...');
      var res = initializeVendorMasterMigration();
      Logger.log('[Init] Auto-migration result: ' + JSON.stringify(res));
      props.setProperty('VENDOR_MIGRATION_V6_DONE', 'true');
    }
  } catch (e) {
    Logger.log('[Init] Auto-migration error: ' + e.message);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

