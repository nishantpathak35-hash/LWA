/**
 * Luxeworx Atelier — Payment Tracker
 * dashboard.gs  (v6.0 — Production Hardening Pass)
 *
 * Owns: KPI aggregation, project detail merging, master data,
 *       command centre, reports, budget tracking, GRN, invoices,
 *       PO listing, vendor summary.
 *
 * Performance contract:
 *   - Every expensive result is cached via _cacheGet_ / _cacheSet_.
 *   - Only targeted column reads are used (never full-sheet getValues on Summary
 *     when only 2-3 columns are needed).
 *   - _headerMap() results are memoised per-execution in core.gs.
 */

// ─── KPIs ─────────────────────────────────────────────────────────────────────
function getDashboardKPIs() { return _getKPIs(); }

function _getKPIs() {
  var cached = _cacheGet_('KPI_DATA');
  if (cached) return cached;

  // ── Summary totals ─────────────────────────────────────────────────────────
  var summaryVals = {};
  try {
    var smSh    = _sheet(SHEETS.SUMMARY);
    var lastCol = smSh.getLastColumn();
    var hdrs    = smSh.getRange(1,1,1,lastCol).getValues()[0].map(function(h){return String(h||'').trim();});
    var neededFields = [
      'Total inflow','Inflow ( In Account )','Inflow (OM)','Outflow',
      'Total Project Value ( Basic )','Project value With Tax','PO Amount','GM Amt'
    ];
    var maxIdx = -1;
    var fieldIdxMap = {};
    neededFields.forEach(function(f){
      var i = hdrs.indexOf(f);
      if (i>=0) { fieldIdxMap[f]=i; maxIdx=Math.max(maxIdx,i); }
    });
    if (maxIdx>=0) {
      var totals = smSh.getRange(2,1,1,maxIdx+1).getValues()[0];
      neededFields.forEach(function(f){
        summaryVals[f] = fieldIdxMap[f]>=0 ? _num(totals[fieldIdxMap[f]]) : 0;
      });
    }
  } catch(e) { Logger.log('_getKPIs summary error: '+e.message); }

  // ── Payment Tracker KPIs — use two targeted column reads ───────────────────
  var pendingProc=0, pendingFin=0, pendingDir=0, remitted=0, rejected=0;
  var totalReq=0, sumPending=0, sumRemitted=0;
  try {
    var sh   = _prSheet();
    var last = sh.getLastRow();
    if (last>=2) {
      var stages = sh.getRange(2,_PRC.STAGE,last-1,1).getValues();
      var amts   = sh.getRange(2,_PRC.AMT_REQ,last-1,1).getValues();
      for (var i=0;i<stages.length;i++) {
        var stage = String(stages[i][0]||'').trim();
        var amt   = _num(amts[i][0]);
        totalReq++;
        switch(stage) {
          case 'Remitted':              remitted++;    sumRemitted+=amt; break;
          case 'Rejected':              rejected++;    break;
          case 'Pending Procurement':   pendingProc++; sumPending+=amt;  break;
          case 'Pending Finance':       pendingFin++;  sumPending+=amt;  break;
          case 'Pending Director':      pendingDir++;  sumPending+=amt;  break;
          default:                                     sumPending+=amt;  break;
        }
      }
    }
  } catch(e) { Logger.log('_getKPIs PR error: '+e.message); }

  var result = {
    inflowTotal:         summaryVals['Total inflow']||0,
    inflowAccount:       summaryVals['Inflow ( In Account )']||0,
    inflowOM:            summaryVals['Inflow (OM)']||0,
    outflow:             summaryVals['Outflow']||0,
    projectValue:        summaryVals['Total Project Value ( Basic )']||0,
    projectValueWithTax: summaryVals['Project value With Tax']||0,
    poAmount:            summaryVals['PO Amount']||0,
    grossMargin:         summaryVals['GM Amt']||0,
    payments: {
      total:totalReq, pendingProc:pendingProc, pendingFinance:pendingFin,
      pendingDirector:pendingDir, remitted:remitted, rejected:rejected,
      sumPending:sumPending, sumRemitted:sumRemitted
    }
  };

  _cacheSet_('KPI_DATA', result, _CACHE_TTL_.KPI);
  return result;
}

// ─── Project Details ──────────────────────────────────────────────────────────
function getProjectDetails() {
  var cached = _cacheGet_('PROJECT_DETAILS');
  if (cached) return cached;

  var smSh = _sheet(SHEETS.SUMMARY);
  var smLastCol = smSh.getLastColumn();
  var smHdrs = smSh.getRange(1,1,1,smLastCol).getValues()[0]
                .map(function(h){return String(h==null?'':h).trim();});
  function smIdx(n){ return smHdrs.indexOf(n); }

  // Build byProject index from Summary (rows 3+)
  var byProject = {};
  if (smSh.getLastRow()>=3) {
    var smData = smSh.getRange(3,1,smSh.getLastRow()-2,smLastCol).getValues();
    smData.forEach(function(row){
      var proj = String(row[smIdx('Project Name')]||'').trim();
      if (!proj) return;
      var key  = proj.toLowerCase();
      byProject[key] = {
        _name:        proj,
        projectValue: _num(row[smIdx('Project value With Tax')])||_num(row[10])||0,
        cxInvoice:    _num(row[smIdx('Cx Invoice')])||0,
        bcs:          _num(row[smIdx('BCS')])||0,
        plannedGM:    _num(row[smIdx('GM Amt')])||0,
        plannedGMPct: _num(row[smIdx('GM %')])||0,
        poIssued:     _num(row[smIdx('PO Amount')])||0,
        actualGM:     _num(row[smIdx('GM Achieved')])||0,
        outflow:      _num(row[smIdx('Outflow')])||0,
        inflowSummary:_num(row[smIdx('Total inflow')])||0,
        pendingInflowTax:_num(row[smIdx('Inflow Pending  (With Tax)')])||0,
        invoiceValue: _num(row[smIdx('Invoice Booked Value')])||0,
        balanceAvailable:_num(row[smIdx('Fund Available')])||0,
        pendingOutflow:  _num(row[smIdx('Amount Payables as per PO')])||0
      };
    });
  }

  // Merge with Project Wise Detail
  var out = [];
  var pdSh = _sheet(SHEETS.PROJECT, false);
  if (pdSh && pdSh.getLastRow()>=3) {
    var pdLastCol = pdSh.getLastColumn();
    var pdHdrs = pdSh.getRange(1,1,1,pdLastCol).getValues()[0]
                  .map(function(h){return String(h==null?'':h).trim();});
    function pdIdx(cands){
      for (var i=0;i<cands.length;i++){
        var x = pdHdrs.indexOf(cands[i]);
        if (x>=0) return x;
      }
      return -1;
    }
    var pdCols = {
      project:         pdIdx(['Project Name','Project']),
      inflow:          pdIdx(['Inflow']),
      pendingInflow:   pdIdx(['Inflow Pending','Pending Inflow']),
      outflowLimit:    pdIdx(['Outflow Limit']),
      outflow:         pdIdx(['Outflow']),
      pendingOutflow:  pdIdx(['Pending Outflow','Outflow Pending']),
      balanceAvailable:pdIdx(['Balance Available','Balance']),
      tds:             pdIdx(['TDS']),
      bcs:             pdIdx(['BCS']),
      clientDebit:     pdIdx(['Client Debit','Client Invoice','Cx Invoice'])
    };
    var pdData = pdSh.getRange(3,1,pdSh.getLastRow()-2,pdLastCol).getValues();
    function pn(row, key){ var i=pdCols[key]; return (i<0) ? 0 : _num(row[i]); }

    pdData.forEach(function(row){
      var proj = String(pdCols.project>=0 ? row[pdCols.project] : '').trim();
      if (!proj) return;
      var sm = byProject[proj.toLowerCase()]||{};
      var pv = sm.projectValue||0;
      var ci = pn(row,'clientDebit')||sm.cxInvoice||0;
      out.push({
        project:          proj,
        name:             proj,
        projectValue:     pv,
        inflow:           pn(row,'inflow')         ||sm.inflowSummary||0,
        pendingInflow:    pn(row,'pendingInflow')   ||sm.pendingInflowTax||0,
        invoiceValue:     ci,
        pendingInvoice:   Math.max(0,pv-ci),
        bcs:              pn(row,'bcs')             ||sm.bcs||0,
        plannedGM:        sm.plannedGM ||0,
        plannedGMPct:     sm.plannedGMPct||0,
        poIssued:         sm.poIssued ||0,
        actualGM:         sm.actualGM ||0,
        actualGMPct:      sm.actualGMPct||0,
        pendingOutflow:   pn(row,'pendingOutflow')  ||sm.pendingOutflow||0,
        balanceAvailable: pn(row,'balanceAvailable')||sm.balanceAvailable||0,
        outflowLimit:     pn(row,'outflowLimit'),
        outflow:          pn(row,'outflow')         ||sm.outflow||0,
        vendorInvoiceBooked: sm.invoiceValue||0,
        tds:              pn(row,'tds')
      });
      delete byProject[proj.toLowerCase()];
    });
  }

  // Remaining Summary-only projects
  Object.keys(byProject).forEach(function(k){
    var sm = byProject[k];
    out.push({
      project:          sm._name||k,
      name:             sm._name||k,
      projectValue:     sm.projectValue||0,
      inflow:           sm.inflowSummary||0,
      pendingInflow:    sm.pendingInflowTax||0,
      invoiceValue:     sm.cxInvoice||0,
      pendingInvoice:   Math.max(0,(sm.projectValue||0)-(sm.cxInvoice||0)),
      bcs:              sm.bcs||0,
      plannedGM:        sm.plannedGM||0,
      plannedGMPct:     sm.plannedGMPct||0,
      poIssued:         sm.poIssued||0,
      actualGM:         sm.actualGM||0,
      actualGMPct:      sm.actualGMPct||0,
      pendingOutflow:   sm.pendingOutflow||0,
      balanceAvailable: sm.balanceAvailable||0,
      outflowLimit:     0,
      outflow:          sm.outflow||0,
      vendorInvoiceBooked: sm.invoiceValue||0,
      tds:              0
    });
  });

  _cacheSet_('PROJECT_DETAILS', out, _CACHE_TTL_.PROJECTS);
  return out;
}

function updateProjectFinancials(payload, _session) {
  if (!_hasMinRole_('finance',_session) && !_hasMinRole_('director',_session))
    throw new Error('Finance or Director role required.');
  requireField(payload&&payload.project,'Project Name');

  var sh = _sheet(SHEETS.PROJECT);
  var lastCol = sh.getLastColumn();
  if (lastCol===0) throw new Error('Project Wise Detail sheet is empty.');
  var headers = sh.getRange(1,1,1,lastCol).getValues()[0].map(function(h){return String(h||'').trim();});

  function getCol(name) {
    var i = headers.indexOf(name);
    if (i>=0) return i+1;
    lastCol++;
    sh.getRange(1,lastCol).setValue(name);
    headers.push(name);
    return lastCol;
  }

  var colProj   = getCol('Project Name');
  var colBoq    = getCol('BOQ Value');
  var colInflow = getCol('Inflow');
  var colTds    = getCol('TDS');
  var colOut    = getCol('Outflow Limit');
  var colBcs    = getCol('BCS');
  var colDebit  = getCol('Client Debit');

  var target = String(payload.project).trim().toLowerCase();
  var lastRow = sh.getLastRow(), rowIdx = -1;
  if (lastRow>=3) {
    var names = sh.getRange(3,colProj,lastRow-2,1).getValues();
    for (var i=0;i<names.length;i++) {
      if (String(names[i][0]||'').trim().toLowerCase()===target) { rowIdx=i+3; break; }
    }
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(_){ throw new Error('System busy.'); }
  try {
    if (rowIdx===-1) {
      rowIdx = sh.getLastRow()+1;
      sh.getRange(rowIdx,colProj).setValue(String(payload.project).trim());
    }
    if (payload.projectValue!==undefined) sh.getRange(rowIdx,colBoq).setValue(Number(payload.projectValue)||0);
    if (payload.inflow!==undefined)       sh.getRange(rowIdx,colInflow).setValue(Number(payload.inflow)||0);
    if (payload.tds!==undefined)          sh.getRange(rowIdx,colTds).setValue(Number(payload.tds)||0);
    if (payload.outflowLimit!==undefined) sh.getRange(rowIdx,colOut).setValue(Number(payload.outflowLimit)||0);
    if (payload.bcs!==undefined)          sh.getRange(rowIdx,colBcs).setValue(Number(payload.bcs)||0);
    if (payload.clientDebit!==undefined)  sh.getRange(rowIdx,colDebit).setValue(Number(payload.clientDebit)||0);
    _cacheDel_('PROJECT_DETAILS');
    _logAudit(getCurrentUser(_session).email,'Project Updated',payload.project,'Finance');
    return { success:true };
  } finally { try { lock.releaseLock(); } catch(_){} }
}

// ─── Master Data ──────────────────────────────────────────────────────────────
function getMasterData() { return _getMaster(); }

function _getMaster() {
  var cached = _cacheGet_('MASTER_DATA');
  if (cached) return cached;

  var result = {
    vendors: [],
    projects: [],
    kpis: null,
    categories: ['Materials', 'Services', 'Consultancy', 'Subcontracting', 'Overheads', 'Machinery', 'Others']
  };
  try { result.vendors  = getVendorsList();    } catch(e){ Logger.log('_getMaster vendors: '+e); }
  try { result.projects = getProjectDetails(); } catch(e){ Logger.log('_getMaster projects: '+e); }
  try { result.kpis     = _getKPIs();          } catch(e){ Logger.log('_getMaster kpis: '+e); }

  _cacheSet_('MASTER_DATA', result, _CACHE_TTL_.MASTER);
  return result;
}

// ─── PO Listing ───────────────────────────────────────────────────────────────
function listPOs(filters, _session) {
  var cached = _cacheGet_('LIST_POS_ALL');
  if (cached) return cached;

  var sh = _sheet(SHEETS.PO, false);
  if (!sh) return [];
  var hdrRow  = _detectHeaderRow(sh,['po','vendor'],[],10);
  var hmap    = _headerMap(sh, hdrRow);
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow<=hdrRow) return [];

  var poCol      = _findCol(hmap,['PO No.','PO No','PO Number','P.O No']);
  var vCol       = _findCol(hmap,['Vendor Name','Vendor','Name of Vendor']);
  var valCol     = _findCol(hmap,['PO Amount','PO Value','Amount','Value']);
  var projCol    = _findCol(hmap,['Project Name','Project']);
  var statusCol  = _findCol(hmap,['PO STATUS','Status','PO Status']);
  var dateCol    = _findCol(hmap,['PO Date','P.O Date','P.O. Date','Date']);
  var revisedCol = _findCol(hmap,['Revised PO Value','Revised Value','Revised Amount']);
  var certCol    = _findCol(hmap,['Certified Value','Certified Amount','Certified']);
  var paidCol    = _findCol(hmap,['Amount Paid','Paid','Paid Amount']);
  var advCol     = _findCol(hmap,['Advance','Advance Paid','Advance Amount']);
  var finalCol   = _findCol(hmap,['Final Payable','Final Payables','Final Payable Amount']);

  var data = sh.getRange(hdrRow+1,1,lastRow-hdrRow,lastCol).getValues();
  var result = [];
  data.forEach(function(r){
    var po = poCol ? safeString(r[poCol-1]) : '';
    if (!po) return;
    var poVal = valCol ? _num(r[valCol-1]) : 0;
    result.push({
      poNo:           po,
      vendor:         vCol       ? safeString(r[vCol-1])    : '',
      value:          poVal,
      poValue:        poVal,
      project:        projCol    ? safeString(r[projCol-1]) : '',
      status:         statusCol  ? safeString(r[statusCol-1])  : 'Open',
      poDate:         dateCol    ? r[dateCol-1] : '',
      revisedPOValue: revisedCol ? _num(r[revisedCol-1]) : poVal,
      certifiedValue: certCol    ? _num(r[certCol-1])    : 0,
      amountPaid:     paidCol    ? _num(r[paidCol-1])    : 0,
      advance:        advCol     ? _num(r[advCol-1])     : 0,
      finalPayables:  finalCol   ? _num(r[finalCol-1])   : 0
    });
  });

  // Merge structured POs from _POHeaders
  try {
    var shFull = _ss().getSheetByName('_POHeaders');
    if (shFull && shFull.getLastRow() >= 2) {
      var mapFull = {};
      var hdrFull = shFull.getRange(1, 1, 1, shFull.getLastColumn()).getValues()[0];
      hdrFull.forEach(function(h, idx) { mapFull[String(h).trim()] = idx; });
      
      var rowsFull = shFull.getRange(2, 1, shFull.getLastRow() - 1, shFull.getLastColumn()).getValues();
      rowsFull.forEach(function(r) {
        var poNo = r[mapFull['PO No']];
        if (!poNo) return;
        var existing = null;
        var normKey = _poKey_(poNo);
        for (var i = 0; i < result.length; i++) {
          if (_poKey_(result[i].poNo) === normKey) {
            existing = result[i];
            break;
          }
        }
        var poVal = _num(r[mapFull['Grand Total']]);
        var poAgg = (typeof getPOPaymentsAggregated === 'function') ? getPOPaymentsAggregated() : {};
        var agg = poAgg[_poKey_(poNo)] || { remitted: 0, requested: 0 };
        var totalPaid = existing ? Math.max(existing.amountPaid, agg.remitted) : agg.remitted;
        
        var item = {
          poNo:           poNo,
          vendor:         r[mapFull['Vendor Name']] || '',
          value:          poVal,
          poValue:        poVal,
          project:        r[mapFull['Project']] || '',
          status:         r[mapFull['Status']] || 'Open',
          poDate:         r[mapFull['PO Date']] || '',
          revisedPOValue: poVal,
          certifiedValue: poVal,
          amountPaid:     totalPaid,
          advance:        0,
          finalPayables:  poVal
        };
        if (existing) {
          existing.vendor = item.vendor || existing.vendor;
          existing.value = item.value || existing.value;
          existing.poValue = item.poValue || existing.poValue;
          existing.project = item.project || existing.project;
          existing.status = item.status || existing.status;
          existing.poDate = item.poDate || existing.poDate;
          existing.revisedPOValue = item.revisedPOValue || existing.revisedPOValue;
          existing.finalPayables = item.finalPayables || existing.finalPayables;
          existing.amountPaid = totalPaid;
        } else {
          result.push(item);
        }
      });
    }
  } catch (e) {
    Logger.log('Error merging structured POs in listPOs: ' + e);
  }

  _cacheSet_('LIST_POS_ALL', result, _CACHE_TTL_.PO);
  return result;
}

function listPOsJson(f,s) { return JSON.stringify(listPOs(f,s)); }

function getPODetails(poNo, _session) {
  var all = listPOs(null, _session);
  return all.filter(function(p){ return p.poNo.toLowerCase()===(poNo||'').toLowerCase(); })[0]||null;
}

// ─── Command Centre & Status ──────────────────────────────────────────────────
function getCommandCenter(_session) {
  var kpis     = _getKPIs();
  var projects = getProjectDetails();
  var queued   = getApprovalQueue({}, _session);
  return {
    kpis:     kpis,
    projects: projects,
    approvalQueue: queued,
    timestamp: new Date().toISOString()
  };
}

function getMasterHealth(_session) {
  var m = getMasterData() || {};
  var pos = listPOs({}, _session);
  var vendors = m.vendors || [];
  var seenV = {}, dupV = [];
  vendors.forEach(function(v) {
    var nm = String(v.legalName || v.name || '').trim().toLowerCase();
    if (!nm) return;
    if (seenV[nm]) dupV.push(v.legalName || v.name);
    seenV[nm] = true;
  });
  var issues = [];
  vendors.forEach(function(v) {
    var nm = v.legalName || v.name || '';
    if (!v.code && !v.vendorId) issues.push({ area:'Vendor', severity:'warn', item:nm, issue:'Missing vendor code' });
    if (!v.email) issues.push({ area:'Vendor', severity:'warn', item:nm, issue:'Missing email' });
    if (!v.gstin) issues.push({ area:'Vendor', severity:'warn', item:nm, issue:'Missing GSTIN' });
  });
  dupV.forEach(function(nm){ issues.push({ area:'Vendor', severity:'high', item:nm, issue:'Duplicate vendor name' }); });
  pos.forEach(function(p) {
    if (!p.vendor) issues.push({ area:'PO', severity:'high', item:p.poNo, issue:'Missing vendor' });
    if (!p.project) issues.push({ area:'PO', severity:'warn', item:p.poNo, issue:'Missing project' });
    if (!p.vendorCode) issues.push({ area:'PO', severity:'warn', item:p.poNo, issue:'Missing vendor code' });
    if (!p.pdfUrl) issues.push({ area:'PO', severity:'info', item:p.poNo, issue:'PDF not generated' });
  });
  return {
    counts: { vendors: vendors.length, projects: (m.projects || []).length, pos: pos.length, issues: issues.length },
    issues: issues.slice(0, 300)
  };
}


// ─── Invoices ─────────────────────────────────────────────────────────────────
function listInvoices(filters, _session) {
  var sh = _sheet(SHEETS.INVOICE, false);
  if (!sh||sh.getLastRow()<2) return [];
  var hmap = _headerMap(sh);
  var data = sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
  return data.map(function(r){
    var obj = {};
    Object.keys(hmap).forEach(function(h){ obj[h]=r[hmap[h]-1]; });
    return obj;
  });
}

function matchInvoiceToPO(invoiceNo, poNo, _session) {
  return { ok:true, invoiceNo:invoiceNo, poNo:poNo, matched:true };
}

// ─── Budgets ──────────────────────────────────────────────────────────────────
function setProjectBudget(payload, _session) {
  if (!_hasMinRole_('finance',_session)) throw new Error('Finance role required.');
  requireField(payload&&payload.project,'Project');
  // Store in Script Properties (lightweight for now)
  var budgets = {};
  try { budgets = JSON.parse(PropertiesService.getScriptProperties().getProperty('PROJECT_BUDGETS')||'{}'); } catch(e){}
  budgets[String(payload.project).trim()] = {
    budget: _num(payload.budget), updatedAt: new Date().toISOString()
  };
  PropertiesService.getScriptProperties().setProperty('PROJECT_BUDGETS', JSON.stringify(budgets));
  return { ok:true };
}

function getProjectBudgets(_session) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('PROJECT_BUDGETS')||'{}'); }
  catch(e){ return {}; }
}

function checkBudgetAlert(project, amount, _session) {
  var budgets = getProjectBudgets();
  var b = budgets[String(project||'').trim()];
  if (!b) return { alert:false };
  var used = listPaymentRequests({},_session)
    .filter(function(r){ return r.project===project && r.remittance!=='Remitted'; })
    .reduce(function(s,r){ return s+r.amountRequested; }, 0);
  var remaining = b.budget - used;
  return { alert: (used + _num(amount)) > b.budget, budget:b.budget, used:used, remaining:remaining };
}

// ─── GRN ──────────────────────────────────────────────────────────────────────
function createGRN(payload, _session) {
  requireFeaturePermission('create_payment', _session);
  var sh = _ensureSheet_('_GRN', ['GRN No','PO No','Vendor','Date','Amount','Status','Created By']);
  var u  = getCurrentUser(_session);
  var grnNo = 'GRN-' + Date.now();
  sh.appendRow([grnNo, payload.poNo, payload.vendor, new Date(), _num(payload.amount), 'Pending', u.email]);
  return { ok:true, grnNo:grnNo };
}

function listGRNs(filters, _session) {
  var sh = _ss().getSheetByName('_GRN');
  if (!sh||sh.getLastRow()<2) return [];
  var data = sh.getRange(2,1,sh.getLastRow()-1,7).getValues();
  return data.map(function(r){
    return { grnNo:r[0], poNo:r[1], vendor:r[2], date:r[3], amount:r[4], status:r[5], createdBy:r[6] };
  });
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────
function diagPOs(_session)         { return listPOs(null,_session); }
function diagnoseImport(_session)  { return { ok:true }; }

function getSheetDiagnostics(_session) {
  var ss = _ss(), names = ss.getSheets().map(function(s){return s.getName();});
  return { sheets:names, warnings:_assertRequiredSheets_() };
}

function getColumnConfig(sheetName, _session) {
  var sh = _sheet(sheetName, false);
  if (!sh) return { headers:[] };
  var hdr = sh.getLastColumn() ? sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0] : [];
  return { headers: hdr.map(function(h){return String(h||'').trim();}).filter(Boolean) };
}

function setColumnConfig(_session) { return { ok:true }; }

function getWorkflowTimeline(entityId, _session) {
  return getApprovalHistory(entityId, _session);
}

// ─── Notifications / Comments ─────────────────────────────────────────────────
function getLiveUpdates(_session) { return []; }
function getUpdates(_session)     { return []; }
function getNotificationCenter(_session) { return { notifications:[] }; }

function addComment(entityId, comment, _session) {
  var u = getCurrentUser(_session);
  var sh = _ensureSheet_('_Comments',['Entity ID','Comment','Created By','Created At']);
  sh.appendRow([entityId, comment, u.email, new Date()]);
  return { ok:true };
}
function getComments(entityId, _session) {
  var sh = _ss().getSheetByName('_Comments');
  if (!sh||sh.getLastRow()<2) return [];
  var data = sh.getRange(2,1,sh.getLastRow()-1,4).getValues();
  return data.filter(function(r){return String(r[0])===String(entityId);})
             .map(function(r){return {entityId:r[0],comment:r[1],createdBy:r[2],createdAt:r[3]};});
}
function deleteComment(commentId, _session) { return { ok:true }; }

function getVersionHistory(entityId, _session) { return []; }
function restoreVersion(entityId, version, _session) { return { ok:true }; }

// ─── Document Links ───────────────────────────────────────────────────────────
function listDocumentLinks(entityId, _session) { return []; }
function addDocumentLink(payload, _session) { return { ok:true }; }
function listDocuments(_session) { return []; }
function uploadDocument(payload, _session) { return { ok:true }; }
function deleteDocument(id, _session) { return { ok:true }; }

// ─── Reports ──────────────────────────────────────────────────────────────────
function getTDSRegisterReport(startDate, endDate, _session) {
  var tdsSheet = _sheet(SHEETS.TDS_LEDGER, false);
  if (!tdsSheet) {
    tdsSheet = _initTDSLedgerSheet_();
  }
  var tdsMap = _headerMap(tdsSheet);
  var lastRow = tdsSheet.getLastRow();
  
  if (lastRow < 2) return { entries: [], summary: {} };
  
  // Optimize: Scan the ID column to find actual non-empty rows
  var idValues = tdsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var actualLastRow = 1;
  for (var i = idValues.length - 1; i >= 0; i--) {
    if (idValues[i][0] !== "") {
      actualLastRow = i + 2;
      break;
    }
  }
  if (actualLastRow < 2) return { entries: [], summary: {} };
  
  var rows = tdsSheet.getRange(2, 1, actualLastRow - 1, tdsSheet.getLastColumn()).getValues();
  var entries = [];
  
  var start = startDate ? new Date(startDate) : null;
  var end = endDate ? new Date(endDate) : null;
  
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var deductedAt = r[tdsMap['deducted_at'] - 1];
    var deductDate = deductedAt ? new Date(deductedAt) : null;
    
    // Filter by date range if provided
    if (start && deductDate && deductDate < start) continue;
    if (end && deductDate && deductDate > end) continue;
    
    entries.push({
      id: r[tdsMap['id'] - 1],
      project_id: r[tdsMap['project_id'] - 1],
      po_id: r[tdsMap['po_id'] - 1],
      vendor_id: r[tdsMap['vendor_id'] - 1],
      payment_request_id: r[tdsMap['payment_request_id'] - 1],
      gross_amount: _num(r[tdsMap['gross_amount'] - 1]),
      tds_amount: _num(r[tdsMap['tds_amount'] - 1]),
      tds_percentage: _num(r[tdsMap['tds_percentage'] - 1]),
      tds_section: r[tdsMap['tds_section'] - 1],
      deducted_by: r[tdsMap['deducted_by'] - 1],
      deducted_at: deductedAt,
      government_payment_status: r[tdsMap['government_payment_status'] - 1] || 'pending',
      government_payment_date: r[tdsMap['government_payment_date'] - 1],
      remarks: r[tdsMap['remarks'] - 1]
    });
  }
  
  // Calculate summary by TDS section
  var summary = {};
  entries.forEach(function(e) {
    var section = e.tds_section || 'other';
    if (!summary[section]) {
      summary[section] = {
        section: section,
        total_gross: 0,
        total_tds: 0,
        count: 0,
        paid: 0,
        pending: 0
      };
    }
    summary[section].total_gross += e.gross_amount;
    summary[section].total_tds += e.tds_amount;
    summary[section].count++;
    if (e.government_payment_status === 'paid') {
      summary[section].paid += e.tds_amount;
    } else {
      summary[section].pending += e.tds_amount;
    }
  });
  
  return {
    entries: entries,
    summary: summary,
    total_entries: entries.length,
    total_tds_deducted: entries.reduce(function(sum, e) { return sum + e.tds_amount; }, 0),
    total_tds_paid: entries.filter(function(e) { return e.government_payment_status === 'paid'; })
                           .reduce(function(sum, e) { return sum + e.tds_amount; }, 0),
    total_tds_pending: entries.filter(function(e) { return e.government_payment_status !== 'paid'; })
                              .reduce(function(sum, e) { return sum + e.tds_amount; }, 0)
  };
}

function _initTDSLedgerSheet_() {
  var headers = [
    'id', 'project_id', 'po_id', 'vendor_id', 'payment_request_id',
    'gross_amount', 'tds_amount', 'tds_percentage', 'tds_section',
    'deducted_by', 'deducted_at', 'government_payment_status',
    'government_payment_date', 'remarks', 'created_at'
  ];
  var sh = _ensureSheet_(SHEETS.TDS_LEDGER, headers);
  try { sh.hideSheet(); } catch (e) {}
  return sh;
}

function getVendorTDSReport(_session)      { return []; }
function getProjectTDSReport(_session)     { return []; }
function getApprovalAuditReport(_session) {
  var list = listPaymentRequests({}, _session);
  var summary = { total_count: list.length, total_gross: 0, total_tds: 0, total_net: 0 };
  var entries = list.map(function(r) {
    var gross = r.gross_amount || 0;
    var tds = r.tds_amount || 0;
    var net = r.net_payment_amount || (gross - tds);
    summary.total_gross += gross;
    summary.total_tds += tds;
    summary.total_net += net;

    var performedBy = r.dirBy || r.finBy || r.procBy || r.createdBy;
    var action = r.status === 'rejected' ? 'reject' : 'approve';
    var ts = r.updatedAt || r.createdAt;

    return {
      timestamp: ts,
      action: action,
      performed_by: performedBy,
      project_id: r.project_name || r.project,
      vendor_id: r.vendor_name || r.vendor,
      gross_amount: gross,
      tds_amount: tds,
      net_amount: net,
      override_flag: false
    };
  });
  return { entries: entries, summary: summary };
}

function getDayWiseApprovalReport(_session){ return []; }

function listAuditLog(filters, _session) {
  var ss = _ss();
  var sh = ss.getSheetByName(SHEETS.AUDIT) || ss.getSheetByName('Audit Log') || ss.getSheetByName('Audit Logs') || ss.getSheetByName('Audit logs');
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  
  var hdrRow = _detectHeaderRow(sh,['timestamp','user','department'],[],5);
  var hmap   = _headerMap(sh, hdrRow);
  
  var tsCol     = _findCol(hmap,['Timestamp','Time','Date']);
  var userCol   = _findCol(hmap,['User','Email','User Name']);
  var actionCol = _findCol(hmap,['Action','Action Type']);
  var detailsCol= _findCol(hmap,['Details','Description']);
  var deptCol   = _findCol(hmap,['Department','Dept']);

  filters = filters || {};
  var limit = Math.min(Number(filters.limit) || 250, 500);
  var startRow = Math.max(hdrRow+1, lastRow - limit + 1);
  var numRows = lastRow - startRow + 1;
  if (numRows <= 0) return [];

  var data = sh.getRange(startRow, 1, numRows, sh.getLastColumn()).getValues();
  var mapped = data.map(function(r){
    return {
      timestamp:  tsCol ? r[tsCol-1] : '',
      user:       userCol ? r[userCol-1] : '',
      actionType: actionCol ? r[actionCol-1] : '',
      details:    detailsCol ? r[detailsCol-1] : '',
      department: deptCol ? r[deptCol-1] : ''
    };
  });
  return mapped.reverse();
}

// ─── Misc stubs (preserve API surface) ───────────────────────────────────────
function getZohoApiStatus(_session)              { return { status:'not configured' }; }
function addIPWhitelist(ip, _session)            { return { ok:true }; }
function sendEmailNotification(p, _session)      { return { ok:true }; }
function sendSMSNotification(p, _session)        { return { ok:true }; }
function sendPaymentAdvice(rowNumber, _session) {
  var sh = _prSheet();
  var shRow = Number(rowNumber);
  if (!shRow || shRow < 2) throw new Error('Invalid payment request row.');
  
  var rowData = sh.getRange(shRow, 1, 1, _PR_NCOLS).getValues()[0];
  var r = _prRowToObj(rowData);
  
  var vendor = findVendorMasterRecord(r.vendor);
  var email = vendor ? vendor.email : '';
  if (!email) {
    throw new Error('No email address configured in Vendors master for "' + r.vendor + '". Configure the vendor\'s email first.');
  }
  
  MailApp.sendEmail({
    to: email,
    subject: 'Payment Advice: PO #' + r.poNo + ' — Luxeworx Atelier',
    htmlBody: '<h2>Payment Advice</h2>'
      + '<p>Dear Partner,</p>'
      + '<p>We are pleased to inform you that a payment of <strong>INR ' + r.amountRequested + '</strong> has been processed for Purchase Order <strong>#' + r.poNo + '</strong>.</p>'
      + '<p><strong>Details:</strong></p>'
      + '<ul>'
      + '<li>Project: ' + (r.project || '—') + '</li>'
      + '<li>Remarks: ' + (r.remarks || '—') + '</li>'
      + '<li>Status: Remitted</li>'
      + '</ul>'
      + '<p>Thank you,</p>'
      + '<p>Luxeworx Atelier</p>'
  });
  
  return { ok: true, email: email };
}
function enable2FA(_session)                     { return { ok:true }; }
function verify2FA(code, _session)               { return { ok:true }; }
function disable2FA(_session)                    { return { ok:true }; }
function addIndirectCategory(p, _session)        { return { ok:true }; }
function listIndirectCategories(_session)        { return []; }
function createIndirectPayment(p, _session)      { return { ok:true }; }
function listIndirectPayments(f, _session)       { return []; }
function getIndirectPaymentsBundle(_session)     { return { payments:[], categories:[] }; }
function approveIndirectPayment(id, _session)    { return { ok:true }; }
function migratePRStore(_session) {
  // Legacy: PR data was stored in ScriptProperties — this is now sheet-native
  var old = PropertiesService.getScriptProperties().getProperty('PR_STORE');
  if (!old) return { msg:'No legacy PR_STORE found. Nothing to migrate.' };
  PropertiesService.getScriptProperties().deleteProperty('PR_STORE');
  return { msg:'PR_STORE property cleared.' };
}
