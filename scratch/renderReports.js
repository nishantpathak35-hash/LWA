  boot();
  resetIdleTimer();
});

// ─── REPORTS VIEW ─────────────────────────────────────────────────────────────
// Shows Rejected and Remitted (completed) payment requests.
// Rejected items are routed here instead of the approval queue.

async function renderReports(seq){
  seq = seq || S._renderSeq;
  var f=S.filters.reports||(S.filters.reports={type:'All',vendor:'',project:'',startDate:'',endDate:''});
  
  // Load report data based on type
  if(f.type === 'TDS_Register' && !S.tdsRegisterReport){
    showLoading('Loading TDS Register…');
    try{ S.tdsRegisterReport = await call('getTDSRegisterReport', f.startDate, f.endDate); }
    catch(e){
      console.error('Failed to load TDS Register report:', e);
      showErr(errMsg(e));
      S.tdsRegisterReport = []; // Fail-open: degrade gracefully
    }
    if(seq !== S._renderSeq) return;
  }
  if(f.type === 'Vendor_TDS' && !S.vendorTDSReport){
    showLoading('Loading Vendor TDS Report…');
    try{ S.vendorTDSReport = await call('getVendorTDSReport', f.startDate, f.endDate); }
    catch(e){
      console.error('Failed to load Vendor TDS report:', e);
      showErr(errMsg(e));
      S.vendorTDSReport = []; // Fail-open: degrade gracefully
    }
    if(seq !== S._renderSeq) return;
  }
  if(f.type === 'Project_TDS' && !S.projectTDSReport){
    showLoading('Loading Project TDS Report…');
    try{ S.projectTDSReport = await call('getProjectTDSReport', f.startDate, f.endDate); }
    catch(e){
      console.error('Failed to load Project TDS report:', e);
      showErr(errMsg(e));
      S.projectTDSReport = []; // Fail-open: degrade gracefully
    }
    if(seq !== S._renderSeq) return;
  }
  if(f.type === 'Approval_Audit' && !S.approvalAuditReport){
    showLoading('Loading Approval Audit Report…');
    try{ S.approvalAuditReport = await call('getApprovalAuditReport', f.startDate, f.endDate); }
    catch(e){
      console.error('Failed to load Approval Audit report:', e);
      showErr(errMsg(e));
      S.approvalAuditReport = []; // Fail-open: degrade gracefully
    }
    if(seq !== S._renderSeq) return;
  }
  if(f.type === 'Day_Wise' && !S.dayWiseReport){
    showLoading('Loading Day-Wise Approval Report…');
    try{ S.dayWiseReport = await call('getDayWiseApprovalReport', f.startDate, f.endDate); }
    catch(e){
      console.error('Failed to load Day-Wise report:', e);
      showErr(errMsg(e));
      S.dayWiseReport = []; // Fail-open: degrade gracefully
    }
    if(seq !== S._renderSeq) return;
  }

  // Legacy payment reports
  if(['All','Approved','Rejected','Remitted'].indexOf(f.type) >= 0){
    showLoading('Loading reports…');
    var reportKey = [f.type || 'All', f.vendor || '', f.project || ''].join('|');
    try{
      if(S.paymentReportKey !== reportKey || !S.paymentReportRows){
        S.paymentReportRows = await call('getPaymentReportRows', {
          type: f.type,
          vendor: f.vendor || '',
          project: f.project || '',
          limit: 300
        });
        S.paymentReportKey = reportKey;
      }
    }
    catch(e){
      console.error('Failed to load payment requests for reports:', e);
      showErr(errMsg(e));
      S.paymentReportRows = []; // Fail-open: degrade gracefully
      S.paymentReportKey = reportKey;
    }
    hideLoading();
    if (seq !== S._renderSeq) return;
  }

  var html='<div class="card">'
    +'<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:20px">'
    +'<div style="display:flex;gap:8px">'
    +['All','Approved','Rejected','Remitted','Day_Wise','TDS_Register','Vendor_TDS','Project_TDS','Approval_Audit'].map(function(t){
       var label = t === 'TDS_Register' ? 'TDS Register' :
                   t === 'Vendor_TDS' ? 'Vendor TDS' :
                   t === 'Project_TDS' ? 'Project TDS' :
                   t === 'Approval_Audit' ? 'Approval Audit' :
                   t === 'Day_Wise' ? 'Day-Wise Approval' :
                   t === 'Rejected' ? 'Rejected' :
                   t === 'Approved' ? 'Approved' :
                   t === 'Remitted' ? 'Remitted' : 'All';
       return '<button class="btn '+(f.type===t?'btn-primary':'btn-ghost')+' btn-sm" id="rpt_'+t+'">'+label+'</button>';
     }).join('')
    +'</div>'
    +'<input class="inp" id="rpt_start" type="date" value="'+esc(f.startDate||'')+'" style="width:140px;margin-left:auto" placeholder="Start Date">'
    +'<input class="inp" id="rpt_end" type="date" value="'+esc(f.endDate||'')+'" style="width:140px" placeholder="End Date">'
    +'<button class="btn btn-ghost btn-sm" id="btnExportRpt" style="margin-left:12px">Export CSV</button>'
    +'</div>';
  
  // Render based on report type
  if(f.type === 'TDS_Register'){
    var report = S.tdsRegisterReport || { entries: [], summary: {} };
    html+='<div class="table-wrap"><table id="tblReports"><thead><tr>'
      +'<th>ID</th><th>Project</th><th>PO</th><th>Vendor</th><th class="num">Gross Amount</th><th class="num">TDS Amount</th><th class="num">TDS %</th><th>TDS Section</th><th>Govt Status</th><th>Deducted At</th>'
      +'</tr></thead><tbody>';
    if(report.entries.length){
      html+=report.entries.map(function(e){
        return '<tr>'
          +'<td style="color:var(--gold);font-weight:600">'+esc(e.id)+'</td>'
          +'<td>'+esc(e.project_id)+'</td>'
          +'<td class="mono" style="font-size:11px">'+esc(e.po_id)+'</td>'
          +'<td>'+esc(e.vendor_id)+'</td>'
          +'<td class="num">'+fmtLakhs(e.gross_amount)+'</td>'
          +'<td class="num" style="color:var(--violet)">'+fmtLakhs(e.tds_amount)+'</td>'
          +'<td class="num">'+e.tds_percentage.toFixed(1)+'%</td>'
          +'<td><span class="badge b-grey">'+esc(e.tds_section)+'</span></td>'
          +'<td><span class="badge '+(e.government_payment_status==='paid'?'b-green':'b-amber')+'">'+esc(e.government_payment_status)+'</span></td>'
          +'<td style="font-size:11px;color:var(--fog)">'+(e.deducted_at?new Date(e.deducted_at).toLocaleDateString():'')+'</td>'
          +'</tr>';
      }).join('');
    } else {
      html+='<tr><td colspan="10">'+emptyState('No TDS Entries Found', 'There are no TDS deductions recorded.')+'</td></tr>';
    }
    html+='</tbody></table></div>';
    
    // Summary section
    html+='<div style="margin-top:16px;padding:16px;background:var(--ink-3);border-radius:8px;border:1px solid var(--line)">'
      +'<h4 style="margin-bottom:12px;color:var(--gold)">TDS Summary by Section</h4>';
    var summaryKeys = Object.keys(report.summary);
    if(summaryKeys.length){
      html+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">';
      summaryKeys.forEach(function(section){
        var s = report.summary[section];
        html+='<div style="padding:12px;background:var(--ink-4);border-radius:6px;border:1px solid var(--line-2)">'
          +'<div style="font-weight:700;color:var(--bright)">'+esc(s.section)+'</div>'
          +'<div style="font-size:12px;color:var(--fog);margin-top:4px">Count: '+s.count+'</div>'
          +'<div style="font-size:12px;color:var(--fog)">Total TDS: '+fmtLakhs(s.total_tds)+'</div>'
          +'<div style="font-size:12px;color:var(--green)">Paid: '+fmtLakhs(s.paid)+'</div>'
          +'<div style="font-size:12px;color:var(--amber)">Pending: '+fmtLakhs(s.pending)+'</div>'
          +'</div>';
      });
      html+='</div>';
    } else {
      html+='<div style="color:var(--fog)">No summary data available</div>';
    }
    html+='</div>';
  }
  else if(f.type === 'Vendor_TDS'){
    var report = S.vendorTDSReport || { vendors: [] };
    html+='<div class="table-wrap"><table id="tblReports"><thead><tr>'
      +'<th>Vendor</th><th class="num">Total Gross</th><th class="num">Total TDS</th><th class="num">Total Paid</th><th class="num">Total Pending</th><th>Entries</th>'
      +'</tr></thead><tbody>';
    if(report.vendors.length){
      html+=report.vendors.map(function(v){
        return '<tr>'
          +'<td style="font-weight:700;color:var(--bright)">'+esc(v.vendor_id)+'</td>'
          +'<td class="num">'+fmtLakhs(v.total_gross)+'</td>'
          +'<td class="num" style="color:var(--violet)">'+fmtLakhs(v.total_tds)+'</td>'
          +'<td class="num" style="color:var(--green)">'+fmtLakhs(v.total_paid)+'</td>'
          +'<td class="num" style="color:var(--amber)">'+fmtLakhs(v.total_pending)+'</td>'
          +'<td class="num">'+v.entries.length+'</td>'
          +'</tr>';
      }).join('');
    } else {
      html+='<tr><td colspan="6">'+emptyState('No Vendor TDS Data Found', 'There are no TDS deductions by vendor.')+'</td></tr>';
    }
    html+='</tbody></table></div>';
  }
  else if(f.type === 'Project_TDS'){
    var report = S.projectTDSReport || { projects: [] };
    html+='<div class="table-wrap"><table id="tblReports"><thead><tr>'
      +'<th>Project</th><th class="num">Total Gross</th><th class="num">Total TDS</th><th class="num">Total Paid</th><th class="num">Total Pending</th><th>Entries</th>'
      +'</tr></thead><tbody>';
    if(report.projects.length){
      html+=report.projects.map(function(p){
        return '<tr>'
          +'<td style="font-weight:700;color:var(--bright)">'+esc(p.project_id)+'</td>'
          +'<td class="num">'+fmtLakhs(p.total_gross)+'</td>'
          +'<td class="num" style="color:var(--violet)">'+fmtLakhs(p.total_tds)+'</td>'
          +'<td class="num" style="color:var(--green)">'+fmtLakhs(p.total_paid)+'</td>'
          +'<td class="num" style="color:var(--amber)">'+fmtLakhs(p.total_pending)+'</td>'
          +'<td class="num">'+p.entries.length+'</td>'
          +'</tr>';
      }).join('');
    } else {
      html+='<tr><td colspan="6">'+emptyState('No Project TDS Data Found', 'There are no TDS deductions by project.')+'</td></tr>';
    }
    html+='</tbody></table></div>';
  }
  else if(f.type === 'Approval_Audit'){
    var report = S.approvalAuditReport || { entries: [], summary: {} };
    html+='<div class="table-wrap"><table id="tblReports"><thead><tr>'
      +'<th>Timestamp</th><th>Action</th><th>Performed By</th><th>Project</th><th>Vendor</th><th class="num">Gross Amount</th><th class="num">TDS</th><th class="num">Net</th><th>Override</th>'
      +'</tr></thead><tbody>';
    if(report.entries.length){
      html+=report.entries.map(function(e){
        var actionBadge = e.action === 'approve' ? '<span class="badge b-green">Approved</span>' :
                          e.action === 'reject' ? '<span class="badge b-red">Rejected</span>' :
                          '<span class="badge b-grey">'+esc(e.action)+'</span>';
        return '<tr>'
          +'<td style="font-size:11px;color:var(--fog)">'+(e.timestamp?new Date(e.timestamp).toLocaleString():'')+'</td>'
          +'<td>'+actionBadge+'</td>'
          +'<td>'+esc(e.performed_by)+'</td>'
          +'<td>'+esc(e.project_id)+'</td>'
          +'<td>'+esc(e.vendor_id)+'</td>'
          +'<td class="num">'+fmtLakhs(e.gross_amount)+'</td>'
          +'<td class="num" style="color:var(--violet)">'+fmtLakhs(e.tds_amount)+'</td>'
          +'<td class="num" style="color:var(--green)">'+fmtLakhs(e.net_amount)+'</td>'
          +'<td>'+(e.override_flag?'<span class="badge b-amber">Yes</span>':'—')+'</td>'
          +'</tr>';
      }).join('');
    } else {
      html+='<tr><td colspan="9">'+emptyState('No Audit Entries Found', 'There are no approval audit records.')+'</td></tr>';
    }
    html+='</tbody></table></div>';
  }
  else if(f.type === 'Day_Wise'){
    var report = S.dayWiseReport || { dates: [], entries: [], summary: { total_count: 0, total_gross: 0, total_tds: 0, total_net: 0 } };
    html+='<div style="margin-bottom:16px;padding:16px;background:var(--ink-3);border-radius:8px;border:1px solid var(--line)">';
    html+='<div style="display:flex;gap:24px;flex-wrap:wrap">'
      +'<div><div style="font-size:11px;color:var(--fog)">Total Approved</div><div style="font-size:20px;font-weight:700;color:var(--bright)">'+report.summary.total_count+'</div></div>'
      +'<div><div style="font-size:11px;color:var(--fog)">Total Gross</div><div style="font-size:20px;font-weight:700;color:var(--bright)">'+fmtRupees(report.summary.total_gross)+'</div></div>'
      +'<div><div style="font-size:11px;color:var(--fog)">Total TDS</div><div style="font-size:20px;font-weight:700;color:var(--violet)">'+fmtRupees(report.summary.total_tds)+'</div></div>'
      +'<div><div style="font-size:11px;color:var(--fog)">Total Net Payable</div><div style="font-size:20px;font-weight:700;color:var(--green)">'+fmtRupees(report.summary.total_net)+'</div></div>'
      +'</div>';
    html+='</div>';

    if(report.dates.length){
      report.dates.forEach(function(day){
        html+='<div style="margin-bottom:20px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--ink-4);border-radius:8px 8px 0 0;border:1px solid var(--line);border-bottom:none">'
          +'<div style="font-weight:700;color:var(--gold);font-size:14px">'+esc(day.displayDate)+'</div>'
          +'<div style="display:flex;gap:16px;font-size:12px">'
          +'<span style="color:var(--fog)">'+day.count+' entries</span>'
          +'<span style="color:var(--bright);font-weight:600">Gross: '+fmtRupees(day.gross)+'</span>'
          +'<span style="color:var(--violet);font-weight:600">TDS: '+fmtRupees(day.tds)+'</span>'
          +'<span style="color:var(--green);font-weight:600">Net: '+fmtRupees(day.net)+'</span>'
          +'</div>'
          +'</div>'
          +'<div class="table-wrap" style="border-radius:0 0 8px 8px">'
          +'<table><thead><tr>'
          +'<th>S.No</th><th>Vendor</th><th>Project</th><th>PO</th><th class="num">Gross</th><th class="num">TDS</th><th class="num">Net</th><th>Approved By</th><th>Bank Ref</th>'
          +'</tr></thead><tbody>';
        day.entries.forEach(function(e){
          html+='<tr>'
            +'<td style="color:var(--gold);font-weight:600">'+esc(e.sNo)+'</td>'
            +'<td>'+esc(e.vendor)+'</td>'
            +'<td style="color:var(--mist)">'+esc(e.project)+'</td>'
            +'<td class="mono" style="font-size:11px">'+esc(e.poNo)+'</td>'
            +'<td class="num" style="font-weight:700;color:var(--bright)">'+fmtRupees(e.grossAmount)+'</td>'
            +'<td class="num" style="color:var(--violet)">'+fmtRupees(e.tdsAmount)+'</td>'
            +'<td class="num" style="font-weight:700;color:var(--green)">'+fmtRupees(e.netAmount)+'</td>'
            +'<td style="font-size:11px">'+esc(e.approvedBy)+'</td>'
            +'<td class="mono" style="font-size:11px">'+esc(e.bankRef)+'</td>'
            +'</tr>';
        });
        html+='</tbody></table></div></div>';
      });
    } else {
      html+='<div style="padding:48px 20px;text-align:center;color:var(--fog)"><div style="font-size:16px;font-weight:600;margin-bottom:8px">No Approved Payments Found</div><div style="font-size:13px">There are no director-approved payments in the selected date range.</div></div>';
    }
  }
  else {
    // Legacy payment reports
    var rows=(S.paymentReportRows||[]);

    if(f.vendor)  rows=rows.filter(function(p){return String(p.vendor).toLowerCase().indexOf(f.vendor.toLowerCase())>=0;});
    if(f.project) rows=rows.filter(function(p){return String(p.project).toLowerCase().indexOf(f.project.toLowerCase())>=0;});

    var show=rows.slice(0, 200);
    if (seq !== S._renderSeq) return;
    
    html+='<div class="table-wrap"><table id="tblReports"><thead><tr>'
      +'<th>ID</th><th>Vendor</th><th>Project</th><th>PO</th><th class="num">Gross Amount</th><th class="num">TDS</th><th class="num">Net Payment</th>'
      +'<th>Status</th><th>Workflow</th><th>Rejected By</th><th></th>'
      +'</tr></thead><tbody>'
      +(show.length?show.map(function(p){
        var rejBy=p.rejectedBy?({proc:'Procurement',finance:'Finance',director:'Director'}[p.rejectedBy]||p.rejectedBy):'—';
        var gross = num(p.amountRequested);
        var tds = num(p.tdsAmount || p.tds_amount || 0);
        var net = gross - tds;
        return '<tr data-pr="'+p.rowNumber+'">'
          +'<td style="color:var(--gold);font-weight:600">'+esc(p.sNo)+'</td>'
          +'<td><div style="color:var(--bright);font-weight:600">'+esc(p.vendor)+'</div></td>'
          +'<td style="color:var(--mist)">'+esc(p.project||'—')+'</td>'
          +'<td class="mono" style="font-size:11px">'+esc(p.poNo||'—')+'</td>'
          +'<td class="num" style="font-weight:700;color:var(--bright)">'+fmtRupees(gross)+'</td>'
          +'<td class="num" style="color:var(--violet)">'+fmtRupees(tds)+'</td>'
          +'<td class="num" style="font-weight:700;color:var(--green)">'+fmtRupees(net)+'</td>'
          +'<td>'+stageBadge(p.stage)+'</td>'
          +'<td>'+wfSteps(p)+'</td>'
          +'<td style="color:'+(p.rejectedBy?'var(--red)':'var(--fog)')+'">'+rejBy+'</td>'
          +'<td><div style="display:flex;gap:4px">'
          +'<button class="btn btn-ghost btn-xs" onclick="openPaymentModal('+p.rowNumber+')">View</button>'
          +((Permissions.hasRole('admin') || Permissions.hasRole('finance')) ? '<button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="_deletePayment('+p.id+')">Delete</button>' : '')
          +'</div></td>'
          +'</tr>';
      }).join(''):emptyState('No Records Found', 'There are no items matching your current filters.'))
      +'</tbody></table></div>';
  }
  
  html+='</div>';
  hideLoading();
  el('content').innerHTML = html;
  if(S._lastReportsInId){ setTimeout(function(){ S._lastReportsInId=0; }, 400); }

  // Wire type toggle buttons
  ['All','Approved','Rejected','Remitted','Day_Wise','TDS_Register','Vendor_TDS','Project_TDS','Approval_Audit'].forEach(function(t){
    var btn=el('rpt_'+t); if(!btn)return;
    btn.addEventListener('click',function(){
      S.filters.reports={type:t,vendor:el('rpt_ven')?el('rpt_ven').value:'',project:el('rpt_prj')?el('rpt_prj').value:'',startDate:el('rpt_start').value,endDate:el('rpt_end').value};
      // Clear cached reports when switching types
      S.tdsRegisterReport = null;
      S.vendorTDSReport = null;
      S.projectTDSReport = null;
      S.approvalAuditReport = null;
      S.dayWiseReport = null;
      renderReports(S._renderSeq);
    });
  });
  
  // Wire date filters
  ['rpt_start','rpt_end'].forEach(function(id){
    el(id).addEventListener('change',function(){
      S.filters.reports.startDate = el('rpt_start').value;
      S.filters.reports.endDate = el('rpt_end').value;
      // Clear cached reports
      S.tdsRegisterReport = null;
      S.vendorTDSReport = null;
      S.projectTDSReport = null;
      S.approvalAuditReport = null;
      S.dayWiseReport = null;
      renderReports(S._renderSeq);
    });
  });
  
  var btnExportRpt = el('btnExportRpt');
  btnExportRpt.addEventListener('click', function(){ exportTableToCSV(el('tblReports'), 'Reports'); });
}

</script>
</body>
</html>
