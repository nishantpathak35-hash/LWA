/**
 * Luxeworx Atelier — Payment Tracker
 * payments.gs  (v6.0 — Production Hardening Pass)
 *
 * Owns: payment request CRUD, approval workflow transitions,
 *       remittance, hold logic, duplicate detection,
 *       approval/remittance queues, bulk operations.
 *
 * All sheet I/O goes through a single _prLoadAll() call per request
 * and is never re-read within the same execution scope.
 */

// ─── Payment Tracker Schema (1-based column indices) ─────────────────────────
var _PRC = {
  ID:1, SNO:2, CREATED_AT:3, CREATED_BY:4,
  VENDOR:5, VENDOR_CODE:6, PROJECT:7, PO_NO:8, CATEGORY:9,
  PO_VALUE:10, AMT_REQ:11, REMARKS:12,
  PROC_APR:13, PROC_BY:14, PROC_AT:15, PROC_AMT:16,
  FIN_APR:17,  FIN_BY:18,  FIN_AT:19,  FIN_AMT:20,
  DIR_APR:21,  DIR_BY:22,  DIR_AT:23,  DIR_AMT:24,
  REMIT:25, REMIT_BY:26, REMIT_AT:27,
  GST_HOLD:28, TDS_HOLD:29, HOLD_REMARKS:30,
  APPROVAL_CHAIN:31, STAGE:32, UPDATED_AT:33
};
var _PR_NCOLS = 33;
var _PR_HEADERS = [
  'ID','S.No','Created At','Created By',
  'Vendor','Vendor Code','Project','PO No','Category',
  'PO Value','Amount Requested','Remarks',
  'Proc Approval','Proc By','Proc At','Proc Amt',
  'Finance Approval','Finance By','Finance At','Finance Amt',
  'Director Approval','Director By','Director At','Director Amt',
  'Remittance','Remitted By','Remitted At',
  'GST Hold','TDS Hold','Hold Remarks',
  'Approval Chain','Stage','Updated At'
];

// ─── PR Sheet Bootstrap ───────────────────────────────────────────────────────
function _prSheet() {
  var ss = _ss(), sh = ss.getSheetByName(SHEETS.PR);
  if (!sh) {
    sh = ss.insertSheet(SHEETS.PR);
    sh.getRange(1,1,1,_PR_NCOLS).setValues([_PR_HEADERS]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,_PR_NCOLS).setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold');
  }
  try { sh.showSheet(); } catch(e){}
  return sh;
}

// ─── Row Converters ───────────────────────────────────────────────────────────
function _prRowToObj(row) {
  function s(c) { return String(row[c-1]||''); }
  function n(c) { return _num(row[c-1]); }
  return {
    id:row[_PRC.ID-1], sNo:row[_PRC.SNO-1],
    createdAt:s(_PRC.CREATED_AT), createdBy:s(_PRC.CREATED_BY),
    vendor:s(_PRC.VENDOR), vendorCode:s(_PRC.VENDOR_CODE),
    project:s(_PRC.PROJECT), poNo:s(_PRC.PO_NO), category:s(_PRC.CATEGORY),
    poValue:n(_PRC.PO_VALUE), amountRequested:n(_PRC.AMT_REQ), remarks:s(_PRC.REMARKS),
    procApproval:s(_PRC.PROC_APR), procBy:s(_PRC.PROC_BY), procAt:s(_PRC.PROC_AT), procAmt:n(_PRC.PROC_AMT),
    financeApproval:s(_PRC.FIN_APR), finBy:s(_PRC.FIN_BY), finAt:s(_PRC.FIN_AT), finAmt:n(_PRC.FIN_AMT),
    directorApproval:s(_PRC.DIR_APR), dirBy:s(_PRC.DIR_BY), dirAt:s(_PRC.DIR_AT), dirAmt:n(_PRC.DIR_AMT),
    remittance:s(_PRC.REMIT), remittedBy:s(_PRC.REMIT_BY), remittedAt:s(_PRC.REMIT_AT),
    gstHold:s(_PRC.GST_HOLD)==='Yes'||n(_PRC.GST_HOLD)>0, gstAmount:n(_PRC.GST_HOLD),
    tdsHold:s(_PRC.TDS_HOLD)==='Yes'||n(_PRC.TDS_HOLD)>0, tdsAmount:n(_PRC.TDS_HOLD),
    holdRemarks:s(_PRC.HOLD_REMARKS),
    approvalChain:s(_PRC.APPROVAL_CHAIN), stage:s(_PRC.STAGE), updatedAt:s(_PRC.UPDATED_AT)
  };
}

function _prObjToRow(obj) {
  var row = new Array(_PR_NCOLS).fill('');
  row[_PRC.ID-1]          = obj.id||'';
  row[_PRC.SNO-1]         = obj.sNo||'';
  row[_PRC.CREATED_AT-1]  = obj.createdAt||'';
  row[_PRC.CREATED_BY-1]  = obj.createdBy||'';
  row[_PRC.VENDOR-1]      = obj.vendor||'';
  row[_PRC.VENDOR_CODE-1] = obj.vendorCode||'';
  row[_PRC.PROJECT-1]     = obj.project||'';
  row[_PRC.PO_NO-1]       = obj.poNo||'';
  row[_PRC.CATEGORY-1]    = obj.category||'';
  row[_PRC.PO_VALUE-1]    = obj.poValue||0;
  row[_PRC.AMT_REQ-1]     = obj.amountRequested||obj.amtReq||0;
  row[_PRC.REMARKS-1]     = obj.remarks||'';
  row[_PRC.PROC_APR-1]    = obj.procApproval||'';
  row[_PRC.PROC_BY-1]     = obj.procBy||'';
  row[_PRC.PROC_AT-1]     = obj.procAt||'';
  row[_PRC.PROC_AMT-1]    = obj.procAmt||0;
  row[_PRC.FIN_APR-1]     = obj.financeApproval||'';
  row[_PRC.FIN_BY-1]      = obj.finBy||'';
  row[_PRC.FIN_AT-1]      = obj.finAt||'';
  row[_PRC.FIN_AMT-1]     = obj.finAmt||0;
  row[_PRC.DIR_APR-1]     = obj.directorApproval||'';
  row[_PRC.DIR_BY-1]      = obj.dirBy||'';
  row[_PRC.DIR_AT-1]      = obj.dirAt||'';
  row[_PRC.DIR_AMT-1]     = obj.dirAmt||0;
  row[_PRC.REMIT-1]       = obj.remittance||'';
  row[_PRC.REMIT_BY-1]    = obj.remittedBy||'';
  row[_PRC.REMIT_AT-1]    = obj.remittedAt||'';
  row[_PRC.GST_HOLD-1]    = obj.gstAmount||'';
  row[_PRC.TDS_HOLD-1]    = obj.tdsAmount||'';
  row[_PRC.HOLD_REMARKS-1]= obj.holdRemarks||'';
  row[_PRC.APPROVAL_CHAIN-1]=obj.approvalChain||'';
  row[_PRC.STAGE-1]       = obj.stage||'';
  row[_PRC.UPDATED_AT-1]  = obj.updatedAt||'';
  return row;
}

// ─── Workflow State Machine ───────────────────────────────────────────────────
function _isApproved(v) { return String(v||'').indexOf('Approved')===0; }
function _isRejected(v) { return String(v||'').indexOf('Rejected')===0; }

function _prStage(r) {
  if (r.remittance==='Remitted')                  return 'Remitted';
  if (_isRejected(r.procApproval)||_isRejected(r.financeApproval)||_isRejected(r.directorApproval))
    return 'Rejected';
  if (!r.procApproval)                            return 'Pending Procurement';
  if (!r.financeApproval)                         return 'Pending Finance';
  if (!r.directorApproval)                        return 'Pending Director';
  return 'Ready to Remit';
}

function _prStatus(r) {
  var st = _prStage(r);
  if (st==='Rejected') return 'rejected';
  if (st==='Remitted'||st==='Ready to Remit') return 'approved';
  return 'pending';
}

// ─── Bulk Load (single sheet read) ───────────────────────────────────────────
/**
 * _prLoadAll — reads ALL rows once and returns them as objects.
 * Use this as the single data access point for any operation
 * that doesn't need to write immediately.
 */
function _prLoadAll() {
  var sh = _prSheet(), last = sh.getLastRow();
  if (last<2) return [];
  var data = sh.getRange(2,1,last-1,_PR_NCOLS).getValues();
  return data.map(function(r,i){
    var obj = _prRowToObj(r);
    obj._sheetRow = i+2;
    return obj;
  });
}

// ─── Payment Request CRUD ─────────────────────────────────────────────────────
function createPaymentRequest(payload, _session) {
  requireFeaturePermission('create_payment', _session);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy. Try again.'); }
  try {
    payload = payload||{};
    requireField(payload.vendor,'Vendor name');
    requireField(payload.poNo,  'PO number');
    var reqAmt = validateAmount(payload.amountRequested,'Amount Requested');

    var sh   = _prSheet();
    var u    = getCurrentUser(_session);
    var last = sh.getLastRow();
    var newId = 1, newSNo = 1;

    if (last>=2) {
      var existing = sh.getRange(2,_PRC.ID,last-1,2).getValues();
      existing.forEach(function(r){
        var id=_num(r[0]), sno=_num(r[1]);
        if (id  > newId -1) newId  = id +1;
        if (sno > newSNo-1) newSNo = sno+1;
      });

      // Duplicate detection: same PO, same amount, same day
      var allRows = sh.getRange(2,1,last-1,_PR_NCOLS).getValues();
      var today = new Date().toISOString().split('T')[0];
      for (var i=0;i<allRows.length;i++) {
        var r = _prRowToObj(allRows[i]);
        if (r.poNo.toLowerCase()!==String(payload.poNo).trim().toLowerCase()) continue;
        var cd = r.createdAt instanceof Date
          ? r.createdAt.toISOString().split('T')[0]
          : String(r.createdAt||'').split('T')[0];
        if (_num(r.amountRequested)===reqAmt && cd===today && r.remittance!=='Remitted')
          throw new Error('Duplicate: A request for '+reqAmt+' on PO#'+payload.poNo+' already exists today.');
      }
    }

    var now = new Date().toISOString();
    var row = new Array(_PR_NCOLS).fill('');
    row[_PRC.ID         -1] = newId;
    row[_PRC.SNO        -1] = newSNo;
    row[_PRC.CREATED_AT -1] = now;
    row[_PRC.CREATED_BY -1] = u.email||'';
    row[_PRC.VENDOR     -1] = String(payload.vendor).trim();
    row[_PRC.VENDOR_CODE-1] = payload.vendorCode||'';
    row[_PRC.PROJECT    -1] = payload.project   ||'';
    row[_PRC.PO_NO      -1] = String(payload.poNo).trim();
    row[_PRC.CATEGORY   -1] = payload.category  ||'';
    row[_PRC.PO_VALUE   -1] = _num(payload.poValue);
    row[_PRC.AMT_REQ    -1] = reqAmt;
    row[_PRC.REMARKS    -1] = payload.remarks   ||'';
    row[_PRC.STAGE      -1] = 'Pending Procurement';
    row[_PRC.UPDATED_AT -1] = now;
    sh.appendRow(row);

    var rowNum = sh.getLastRow();
    _invalidateAllCaches_();
    _logAudit(u.email,'Payment Request','Requested '+reqAmt+' for PO#'+payload.poNo,'Procurement');
    return { ok:true, sNo:newSNo, id:newId, rowNumber:rowNum };
  } finally { try { lock.releaseLock(); } catch(_){} }
}

function _mapPRForFrontend(r) {
  var stage = _prStage(r);
  var status = _prStatus(r);
  var gross = r.amountRequested || 0;
  var tds = r.tdsAmount || 0;
  var net = gross - tds;
  return Object.assign({}, r, {
    stage: stage,
    status: status,
    vendor_name: r.vendor,
    project_name: r.project,
    po_number: r.poNo,
    invoice_number: '',
    gross_amount: gross,
    tds_amount: tds,
    net_payment_amount: net,
    approval_status: status,
    approval_stage: stage
  });
}

function listPaymentRequests(filters, _session) {
  filters = filters||{};
  var all = _prLoadAll();
  var u   = getCurrentUser(_session);

  // Non-directors only see their own requests
  if (!_hasMinRole_('finance', _session)) {
    all = all.filter(function(r){ return r.createdBy===u.email; });
  }

  return all.map(_mapPRForFrontend);
}

function approvePaymentRequest(rowNumber, stage, approvedAmount, action, _session) {
  requireFeaturePermission('approve_payment', _session);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy. Try again.'); }
  try {
    var sh      = _prSheet();
    var u       = getCurrentUser(_session);
    var shRow   = Number(rowNumber);
    if (!shRow || shRow<2) throw new Error('Invalid row number.');

    var rowData = sh.getRange(shRow,1,1,_PR_NCOLS).getValues()[0];
    var r       = _prRowToObj(rowData);
    var now     = new Date().toISOString();
    var amt     = _num(approvedAmount)||r.amountRequested;
    var isApprove = String(action||'approve').toLowerCase()!=='reject';
    var verdict   = isApprove ? 'Approved' : 'Rejected';

    if (stage==='proc') {
      rowData[_PRC.PROC_APR-1] = verdict;
      rowData[_PRC.PROC_BY -1] = u.email;
      rowData[_PRC.PROC_AT -1] = now;
      rowData[_PRC.PROC_AMT-1] = isApprove ? amt : 0;
    } else if (stage==='finance') {
      if (!_isApproved(r.procApproval)) throw new Error('Procurement approval required first.');
      rowData[_PRC.FIN_APR-1] = verdict;
      rowData[_PRC.FIN_BY -1] = u.email;
      rowData[_PRC.FIN_AT -1] = now;
      rowData[_PRC.FIN_AMT-1] = isApprove ? amt : 0;
    } else if (stage==='director') {
      if (!_isApproved(r.financeApproval)) throw new Error('Finance approval required first.');
      rowData[_PRC.DIR_APR-1] = verdict;
      rowData[_PRC.DIR_BY -1] = u.email;
      rowData[_PRC.DIR_AT -1] = now;
      rowData[_PRC.DIR_AMT-1] = isApprove ? amt : 0;
    } else {
      throw new Error('Invalid approval stage: '+stage);
    }
    rowData[_PRC.UPDATED_AT-1] = now;
    rowData[_PRC.STAGE-1] = _prStage(_prRowToObj(rowData));
    sh.getRange(shRow,1,1,_PR_NCOLS).setValues([rowData]);
    _invalidateAllCaches_();
    _logAudit(u.email, verdict+' Payment', 'Row '+shRow+' stage:'+stage, stage);
    return { ok:true, stage:stage, action:verdict };
  } finally { try { lock.releaseLock(); } catch(_){} }
}

function transitionPaymentWorkflow(payload, _session) {
  payload = payload||{};
  var rowNumber = payload.rowNumber || payload.paymentId;
  
  var sh = _prSheet();
  var last = sh.getLastRow();
  var rowIdx = -1;
  if (last >= 2) {
    var ids = sh.getRange(2, _PRC.ID, last-1, 1).getValues();
    var physicalRow = Number(rowNumber);
    if (physicalRow >= 2 && physicalRow <= last) {
      rowIdx = physicalRow;
    } else {
      var targetId = String(rowNumber).trim();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === targetId) {
          rowIdx = i + 2;
          break;
        }
      }
    }
  }
  
  if (rowIdx < 2) throw new Error('Invalid row number or payment ID: ' + rowNumber);

  var rowData = sh.getRange(rowIdx, 1, 1, _PR_NCOLS).getValues()[0];
  var r = _prRowToObj(rowData);
  var stage = payload.stage || _prStage(r);
  
  var stageCode = '';
  var stageStr = String(stage).toLowerCase();
  if (stageStr.indexOf('proc') >= 0) stageCode = 'proc';
  else if (stageStr.indexOf('finance') >= 0) stageCode = 'finance';
  else if (stageStr.indexOf('director') >= 0) stageCode = 'director';
  else stageCode = stage;

  var action = String(payload.action || 'approve').toLowerCase();
  var approvedAmount = payload.approvedAmount !== undefined ? payload.approvedAmount : payload.amount;
  
  var res = approvePaymentRequest(rowIdx, stageCode, approvedAmount, action, _session);
  
  var updatedRowData = sh.getRange(rowIdx, 1, 1, _PR_NCOLS).getValues()[0];
  var updatedPR = _mapPRForFrontend(_prRowToObj(updatedRowData));
  
  return {
    success: true,
    payment: updatedPR,
    previousState: r.stage,
    newState: updatedPR.stage
  };
}

function setPaymentHold(payload, _session) {
  requireFeaturePermission('approve_payment', _session);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy.'); }
  try {
    var sh    = _prSheet();
    var u     = getCurrentUser(_session);
    var shRow = Number(payload.rowNumber);
    if (!shRow||shRow<2) throw new Error('Invalid row number.');
    var now = new Date().toISOString();
    sh.getRange(shRow, _PRC.GST_HOLD).setValue(payload.gstAmount||'');
    sh.getRange(shRow, _PRC.TDS_HOLD).setValue(payload.tdsAmount||'');
    sh.getRange(shRow, _PRC.HOLD_REMARKS).setValue(payload.holdRemarks||'');
    sh.getRange(shRow, _PRC.UPDATED_AT).setValue(now);
    _invalidateAllCaches_();
    _logAudit(u.email,'Payment Hold','Row '+shRow,'Finance');
    return { ok:true };
  } finally { try { lock.releaseLock(); } catch(_){} }
}

// ─── Approval Queue ───────────────────────────────────────────────────────────
function getApprovalQueue(filters, _session) {
  filters = filters||{};
  var u    = getCurrentUser(_session);
  var roles = u.roles||[];
  var all  = _prLoadAll();

  return all.filter(function(r) {
    var stage = _prStage(r);
    if (roles.indexOf('proc')>=0     && stage==='Pending Procurement') return true;
    if (roles.indexOf('finance')>=0  && stage==='Pending Finance')     return true;
    if (roles.indexOf('director')>=0 && stage==='Pending Director')    return true;
    return false;
  }).map(_mapPRForFrontend);
}

function getRemittanceQueue(filters, _session) {
  return _prLoadAll()
    .filter(function(r){ return _prStage(r)==='Ready to Remit'; })
    .map(_mapPRForFrontend);
}

function getApprovalChain(entityType, entityId, _session) {
  return { entityType:entityType, entityId:entityId, chain:[] };
}

function approvePaymentWithChain(paymentId, _session) {
  var all  = _prLoadAll();
  var rec  = null;
  for (var i=0;i<all.length;i++) {
    if (String(all[i].id)===String(paymentId)) { rec=all[i]; break; }
  }
  if (!rec) throw new Error('Payment not found: '+paymentId);
  var u     = getCurrentUser(_session);
  var roles = u.roles||[];
  var stage = _prStage(rec);
  var approvalStage = '';
  if (stage==='Pending Procurement' && roles.indexOf('proc')>=0)    approvalStage='proc';
  if (stage==='Pending Finance'     && roles.indexOf('finance')>=0) approvalStage='finance';
  if (stage==='Pending Director'    && roles.indexOf('director')>=0) approvalStage='director';
  if (!approvalStage) throw new Error('You cannot approve at the current stage ('+stage+').');
  return approvePaymentRequest(rec._sheetRow, approvalStage, rec.amountRequested, 'approve', _session);
}

function checkApprovalAuthority(payload, _session) {
  var u = getCurrentUser(_session);
  return { canApprove: _hasMinRole_('proc', _session), roles: u.roles };
}

// ─── Remittance ───────────────────────────────────────────────────────────────
function bulkRemitPayments(requestIds, remittanceData, _session) {
  requireFeaturePermission('remit_payment', _session);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch(_){ throw new Error('System busy.'); }
  try {
    var sh  = _prSheet();
    var u   = getCurrentUser(_session);
    var all = _prLoadAll();
    var now = new Date().toISOString();
    var ids = Array.isArray(requestIds) ? requestIds.map(String) : [String(requestIds)];
    var done = 0;
    all.forEach(function(r) {
      if (ids.indexOf(String(r.id))<0) return;
      if (_prStage(r)!=='Ready to Remit') return;
      var shRow = r._sheetRow;
      sh.getRange(shRow,_PRC.REMIT).setValue('Remitted');
      sh.getRange(shRow,_PRC.REMIT_BY).setValue(u.email);
      sh.getRange(shRow,_PRC.REMIT_AT).setValue(now);
      sh.getRange(shRow,_PRC.STAGE).setValue('Remitted');
      sh.getRange(shRow,_PRC.UPDATED_AT).setValue(now);
      done++;
    });
    _invalidateAllCaches_();
    if (done > 0) {
      try { recalculateProjectOutflows(_session); } catch(e) { Logger.log('Error recalculating outflows: ' + e); }
    }
    _logAudit(u.email,'Bulk Remittance','Remitted '+done+' payments','Finance');
    return { ok:true, remitted:done };
  } finally { try { lock.releaseLock(); } catch(_){} }
}

function bulkApprovePayments(ids, approvalData, _session) {
  requireFeaturePermission('approve_payment', _session);
  var results = [], errs = [];
  (Array.isArray(ids)?ids:[]).forEach(function(id) {
    try {
      var all  = _prLoadAll();
      var rec  = null;
      for (var i=0;i<all.length;i++) { if (String(all[i].id)===String(id)) { rec=all[i]; break; } }
      if (!rec) { errs.push({id:id,error:'Not found'}); return; }
      var stage = _prStage(rec);
      var u     = getCurrentUser(_session);
      var rs = u.roles||[];
      var approvalStage = null;
      if (stage==='Pending Procurement' && rs.indexOf('proc')>=0)    approvalStage='proc';
      if (stage==='Pending Finance'     && rs.indexOf('finance')>=0) approvalStage='finance';
      if (stage==='Pending Director'    && rs.indexOf('director')>=0) approvalStage='director';
      if (!approvalStage) { errs.push({id:id,error:'No permission at current stage'}); return; }
      var res = approvePaymentRequest(rec._sheetRow, approvalStage,
        (approvalData&&approvalData.amount)||rec.amountRequested, 'approve', _session);
      results.push({id:id, result:res});
    } catch(e) { errs.push({id:id, error:e.message}); }
  });
  return { ok:true, processed:results, errors:errs };
}

function bulkRejectPayments(ids, rejectionData, _session) {
  requireFeaturePermission('approve_payment', _session);
  var results = [], errs = [];
  (Array.isArray(ids)?ids:[]).forEach(function(id) {
    try {
      var all = _prLoadAll();
      var rec = null;
      for (var i=0;i<all.length;i++) { if (String(all[i].id)===String(id)){rec=all[i];break;} }
      if (!rec) { errs.push({id:id,error:'Not found'}); return; }
      var stage = _prStage(rec);
      var u     = getCurrentUser(_session);
      var rs    = u.roles||[];
      var approvalStage = null;
      if (stage==='Pending Procurement' && rs.indexOf('proc')>=0)    approvalStage='proc';
      if (stage==='Pending Finance'     && rs.indexOf('finance')>=0) approvalStage='finance';
      if (stage==='Pending Director'    && rs.indexOf('director')>=0) approvalStage='director';
      if (!approvalStage) { errs.push({id:id,error:'No permission'}); return; }
      var res = approvePaymentRequest(rec._sheetRow, approvalStage, 0, 'reject', _session);
      results.push({id:id,result:res});
    } catch(e) { errs.push({id:id,error:e.message}); }
  });
  return { ok:true, processed:results, errors:errs };
}

// ─── Misc Payment Queries ─────────────────────────────────────────────────────
function detectDuplicatePayment(poNo, amount, _session) {
  var all = _prLoadAll(), today = new Date().toISOString().split('T')[0];
  var dup = all.filter(function(r){
    var cd = String(r.createdAt||'').split('T')[0];
    return r.poNo.toLowerCase()===(poNo||'').toLowerCase() &&
           _num(r.amountRequested)===_num(amount) && cd===today &&
           r.remittance!=='Remitted';
  });
  return { isDuplicate: dup.length>0, count:dup.length };
}

function getPaymentReportRows(filters, _session) { return listPaymentRequests(filters, _session); }

function updatePaymentInline(payload, _session) {
  requireFeaturePermission('approve_payment', _session);
  var sh    = _prSheet();
  var shRow = Number(payload.rowNumber);
  if (!shRow||shRow<2) throw new Error('Invalid row number.');
  var rowData = sh.getRange(shRow,1,1,_PR_NCOLS).getValues()[0];
  if (payload.remarks!==undefined)  rowData[_PRC.REMARKS-1]   = payload.remarks;
  if (payload.category!==undefined) rowData[_PRC.CATEGORY-1]  = payload.category;
  rowData[_PRC.UPDATED_AT-1] = new Date().toISOString();
  sh.getRange(shRow,1,1,_PR_NCOLS).setValues([rowData]);
  _invalidateAllCaches_();
  return { ok:true };
}

function reconcileRemittedPaymentsToPOLedger(_session) {
  if (!_hasMinRole_('finance', _session)) throw new Error('Finance role required.');
  
  var prList = _prLoadAll().filter(function(r) { return r.remittance === 'Remitted'; });
  
  var poPaidMap = {};
  prList.forEach(function(r) {
    var key = _poKey_(r.poNo);
    if (key) {
      poPaidMap[key] = (poPaidMap[key] || 0) + (r.amountRequested || 0);
    }
  });
  
  var sh = _sheet(SHEETS.PO);
  var hdrRow = _detectHeaderRow(sh, ['po', 'vendor', 'value', 'paid'], [], 10);
  var hmap = _headerMap(sh, hdrRow);
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow <= hdrRow) return { ok: true, reconciled: 0, total_posted: 0 };
  
  var poCol = _findCol(hmap, ['PO No.', 'PO No', 'PO Number', 'P.O No']);
  var paidCol = _findCol(hmap, ['Amount Paid', 'Paid', 'Paid Amount']);
  var revisedCol = _findCol(hmap, ['Revised PO Value', 'Revised Value', 'Revised Amount']);
  var valCol = _findCol(hmap, ['PO Value', 'PO Amount', 'Amount', 'Value']);
  var balCol = _findCol(hmap, ['Balance', 'PO Balance']);
  
  if (!poCol || !paidCol) {
    throw new Error('Required columns (PO No or Amount Paid) missing in PO sheet.');
  }
  
  var data = sh.getRange(hdrRow + 1, 1, lastRow - hdrRow, lastCol).getValues();
  var updatedCount = 0;
  
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_) { throw new Error('System busy.'); }
  
  try {
    for (var i = 0; i < data.length; i++) {
      var poNo = safeString(data[i][poCol - 1]);
      var key = _poKey_(poNo);
      if (!key) continue;
      
      var totalPaid = poPaidMap[key] || 0;
      var rowNum = hdrRow + 1 + i;
      
      sh.getRange(rowNum, paidCol).setValue(totalPaid);
      
      if (balCol > 0) {
        var poVal = valCol > 0 ? _num(data[i][valCol - 1]) : 0;
        var revisedVal = revisedCol > 0 ? _num(data[i][revisedCol - 1]) : poVal;
        sh.getRange(rowNum, balCol).setValue(revisedVal - totalPaid);
      }
      updatedCount++;
    }
    try { recalculateProjectOutflows(_session); } catch(e) { Logger.log('Error recalculating outflows: ' + e); }
    _invalidateAllCaches_();
    return { ok: true, reconciled: updatedCount, total_posted: prList.length };
  } finally {
    try { lock.releaseLock(); } catch(_) {}
  }
}

function getFinancialImpactSummary(_session) {
  var all = _prLoadAll();
  var totalRequested=0, totalApproved=0, totalRemitted=0, pending=0;
  all.forEach(function(r){
    totalRequested += r.amountRequested;
    var finalAmt = r.dirAmt||r.finAmt||r.procAmt||r.amountRequested;
    if (r.remittance==='Remitted') { totalRemitted+=finalAmt; totalApproved+=finalAmt; }
    else if (_isApproved(r.directorApproval)) { totalApproved+=finalAmt; }
    else { pending+=r.amountRequested; }
  });
  return { totalRequested:totalRequested, totalApproved:totalApproved,
           totalRemitted:totalRemitted, pending:pending };
}

function getApprovalHistory(entityId, _session) {
  var all = _prLoadAll();
  var rec = all.filter(function(r){return String(r.id)===String(entityId);})[0];
  if (!rec) return [];
  var history = [];
  if (rec.procApproval) history.push({stage:'proc',  verdict:rec.procApproval, by:rec.procBy, at:rec.procAt});
  if (rec.financeApproval) history.push({stage:'finance',verdict:rec.financeApproval,by:rec.finBy,at:rec.finAt});
  if (rec.directorApproval) history.push({stage:'director',verdict:rec.directorApproval,by:rec.dirBy,at:rec.dirAt});
  if (rec.remittance==='Remitted') history.push({stage:'remit',verdict:'Remitted',by:rec.remittedBy,at:rec.remittedAt});
  return history;
}

function repairPaymentRequestData(_session) {
  if (!_hasMinRole_('director',_session)) throw new Error('Director required.');
  var sh = _prSheet(), last = sh.getLastRow();
  if (last<2) return { ok:true, repaired:0 };
  var data = sh.getRange(2,1,last-1,_PR_NCOLS).getValues();
  var repaired = 0;
  data.forEach(function(row,i){
    var r = _prRowToObj(row);
    var stage = _prStage(r);
    if (row[_PRC.STAGE-1]!==stage) {
      sh.getRange(i+2,_PRC.STAGE).setValue(stage);
      repaired++;
    }
  });
  _invalidateAllCaches_();
  return { ok:true, repaired:repaired };
}

function recalculateProjectOutflows(_session) {
  var prList = _prLoadAll().filter(function(r) { return r.remittance === 'Remitted'; });
  var outflowByProj = {};
  prList.forEach(function(r) {
    var projName = String(r.project || '').trim().toLowerCase();
    if (!projName) return;
    var amt = r.dirAmt || r.finAmt || r.procAmt || r.amountRequested || 0;
    outflowByProj[projName] = (outflowByProj[projName] || 0) + amt;
  });

  var sh = _sheet(SHEETS.PROJECT, false);
  if (!sh) return;
  var last = sh.getLastRow();
  if (last < 3) return;
  var lastCol = sh.getLastColumn();
  var hdrs = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || '').trim(); });
  
  var projColIdx = -1;
  var outflowColIdx = -1;
  
  for (var i = 0; i < hdrs.length; i++) {
    var h = hdrs[i].toLowerCase();
    if (h === 'project name' || h === 'project') projColIdx = i + 1;
    if (h === 'outflow') outflowColIdx = i + 1;
  }
  
  if (projColIdx === -1 || outflowColIdx === -1) {
    Logger.log('Could not find Project or Outflow columns on Project Wise Detail sheet.');
    return;
  }

  var data = sh.getRange(3, 1, last - 2, lastCol).getValues();
  for (var j = 0; j < data.length; j++) {
    var projName = String(data[j][projColIdx - 1] || '').trim().toLowerCase();
    var remittedOutflow = outflowByProj[projName] || 0;
    var rowNumber = j + 3;
    sh.getRange(rowNumber, outflowColIdx).setValue(remittedOutflow);
  }
  _invalidateAllCaches_();
}
