        });
      });
    }
  }
}

// ─── SETTINGS — Users & Access (director-only) ───────────────────────────────
async function renderSettings(seq){
  seq = seq || S._renderSeq;
  var roles=(S.user&&S.user.roles)||[];
  if(roles.indexOf('director')<0){
    el('content').innerHTML='<div style="padding:40px;text-align:center;color:var(--fog)">'
      +'<div style="font-size:18px;color:var(--bright);margin-bottom:10px">Director access required</div>'
      +'Only the director can manage users.</div>';
    return;
  }

  // Settings tabs
  var activeTab = S.settingsTab || 'users';
  var html=''
    +'<div class="section-head"><div class="card-title">Settings</div></div>'
    +'<div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">'
    +'<button class="btn '+ (activeTab==='users'?'btn-primary':'btn-ghost')+' btn-sm" id="tabUsers">Users &amp; Access</button>'
    +'<button class="btn '+ (activeTab==='permissions'?'btn-primary':'btn-ghost')+' btn-sm" id="tabPermissions">Feature Permissions</button>'
    +'<button class="btn '+ (activeTab==='system'?'btn-primary':'btn-ghost')+' btn-sm" id="tabSystem">⚙ System</button>'
    +'</div>';

  if(activeTab === 'users'){
    el('content').innerHTML = html + '<div class="section-head" style="align-items:center"><div class="card-title">Users &amp; Access</div></div>' + skeletonTable(6);
    html += await renderUsersTab(seq);
  } else if(activeTab === 'permissions'){
    el('content').innerHTML = html + '<div class="section-head" style="align-items:center"><div class="card-title">Feature Permissions</div></div>' + skeletonTable(8);
    html += await renderPermissionsTab(seq);
  } else if(activeTab === 'system'){
    html += renderSystemTab();
  }

  el('content').innerHTML=html;

  // Tab switching
  el('tabUsers').addEventListener('click', function(){ S.settingsTab='users'; renderSettings(); });
  el('tabPermissions').addEventListener('click', function(){ S.settingsTab='permissions'; renderSettings(); });
  el('tabSystem').addEventListener('click', function(){ S.settingsTab='system'; renderSettings(); });

  if(activeTab === 'users'){
    wireUsersTab();
  } else if(activeTab === 'permissions'){
    wirePermissionsTab();
  } else if(activeTab === 'system'){
    wireSystemTab();
  }
  hideLoading();
}

function renderSystemTab(){
  return ''
    +'<div class="card">'
    +'<div class="card-head"><span class="card-title">System Utilities</span></div>'
    +'<div class="card-body" style="display:flex;flex-direction:column;gap:18px">'

    // PO Number Series Prefix
    +'<div style="display:flex;flex-direction:column;gap:8px;padding:16px;background:var(--ink-3);border-radius:var(--r);border:1px solid var(--line)">'
    +'<div style="font-weight:700;color:var(--bright)">PO Number Series Prefix</div>'
    +'<div style="font-size:12px;color:var(--fog)">Specify a custom prefix series to generate PO numbers (e.g., <code>LA/2627/</code>). Leave blank to use default Financial Year prefix.</div>'
    +'<div style="display:flex;gap:12px;margin-top:4px">'
    +'<input class="inp" id="poPrefixInput" placeholder="LA/2627/" style="width:250px" value="">'
    +'<button class="btn btn-primary btn-sm" id="btnSavePOPrefix">Save Prefix</button>'
    +'</div>'
    +'</div>'

    // Clear Cache
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:var(--ink-3);border-radius:var(--r);border:1px solid var(--line)">'
    +'<div>'
    +'<div style="font-weight:700;color:var(--bright);margin-bottom:4px">Clear Server Cache</div>'
    +'<div style="font-size:12px;color:var(--fog)">Clears all cached data (vendors, KPIs, master data, POs). Use this if vendors or projects are not showing up in forms.</div>'
    +'</div>'
    +'<button class="btn btn-primary btn-sm" id="btnClearCache" style="flex-shrink:0;margin-left:20px">Clear Cache</button>'
    +'</div>'

    // Refresh Master Data
    +'<div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:var(--ink-3);border-radius:var(--r);border:1px solid var(--line)">'
    +'<div>'
    +'<div style="font-weight:700;color:var(--bright);margin-bottom:4px">Reload All Data</div>'
    +'<div style="font-size:12px;color:var(--fog)">Clears cache and reloads vendors, projects, KPIs and master data from the spreadsheet.</div>'
    +'</div>'
    +'<button class="btn btn-ghost btn-sm" id="btnReloadAll" style="flex-shrink:0;margin-left:20px">Reload All</button>'
    +'</div>'

    +'</div></div>';
}

function wireSystemTab(){
  // Load current prefix
  (async function() {
    try {
      var prefix = await call('getPOPrefix', {});
      var inp = el('poPrefixInput');
      if (inp) inp.value = prefix || '';
    } catch(e) {
      console.error('Failed to load PO prefix:', e);
    }
  })();

  var btnSavePref = el('btnSavePOPrefix');
  if(btnSavePref) btnSavePref.addEventListener('click', async function(){
    btnSavePref.disabled = true;
    var originalText = btnSavePref.textContent;
    btnSavePref.textContent = 'Saving…';
    try {
      var prefixVal = el('poPrefixInput').value;
      await call('setPOPrefix', prefixVal);
      toast('PO number series prefix saved successfully.', 'ok');
      btnSavePref.textContent = '✓ Saved';
      setTimeout(function(){
        btnSavePref.disabled = false;
        btnSavePref.textContent = originalText;
      }, 1500);
    } catch(e) {
      toast('Failed: ' + errMsg(e), 'err');
      btnSavePref.disabled = false;
      btnSavePref.textContent = originalText;
    }
  });

  var btnCC = el('btnClearCache');
  if(btnCC) btnCC.addEventListener('click', async function(){
    btnCC.disabled = true;
    btnCC.textContent = 'Clearing…';
    try{
      await call('clearAllCaches');
      // Also clear frontend state
      S.master = null; S.kpis = null; S.vendors = null;
      S.pos = null; S.payments = null; S.projects = null;
      toast('Cache cleared. Reload the page to see fresh data.', 'ok');
      btnCC.textContent = '✓ Cleared';
    } catch(e){
      toast('Failed: ' + errMsg(e), 'err');
      btnCC.disabled = false;
      btnCC.textContent = 'Clear Cache';
    }
  });

  var btnRA = el('btnReloadAll');
  if(btnRA) btnRA.addEventListener('click', async function(){
    btnRA.disabled = true;
    btnRA.textContent = 'Reloading…';
    try{
      await call('clearAllCaches');
      S.master = null; S.kpis = null; S.vendors = null;
      S.pos = null; S.payments = null; S.projects = null;
      toast('Reloading data…', 'ok');
      setTimeout(function(){ location.reload(); }, 1000);
    } catch(e){
      toast('Failed: ' + errMsg(e), 'err');
      btnRA.disabled = false;
      btnRA.textContent = 'Reload All';
    }
  });
}

async function renderUsersTab(seq){
  var users=[];
  try{ users=await call('listUsersAdmin'); }
  catch(e){ return '<div style="padding:20px"><div class="err-box"><strong>Error loading users</strong><br>'+esc(errMsg(e))+'</div></div>'; }
  if(seq !== S._renderSeq) return '';

  var roleOptions = getAllRoles();
  function roleChip(r){
    var cls = (r==='director') ? 'b-gold' : 'b-grey';
    return '<span class="badge '+cls+'">'+esc(r)+'</span>';
  }
  var q=(S.filters.users || '').trim().toLowerCase();
  var rows=users.filter(function(u){
    if(!q) return true;
    return (u.email||'').toLowerCase().indexOf(q)>=0 || (u.name||'').toLowerCase().indexOf(q)>=0;
  });
  var html=''
    +'<div class="section-head" style="align-items:center"><div class="card-title">Users &amp; Access</div>'
    +'<input class="inp" id="uQ" placeholder="Search Users…" value="'+esc(q)+'" style="width:200px;margin-left:16px">'
    +'<button class="btn btn-primary btn-sm" id="btnSearchUsr" style="margin-left:8px">Search</button>'
    +'<div style="flex:1"></div>'
    +'<button class="btn btn-ghost btn-sm" id="btnExportUsr" style="margin-right:12px">Export CSV</button>'
    +'<button class="btn btn-gold btn-sm" id="uInvBtn">+ Invite User</button></div>'
    +'<div class="card"><div class="table-wrap"><table id="tblUsers"><thead><tr>'
    +'<th>Email</th><th>Name</th><th>Access</th><th>Status</th>'
    +'<th>Last Login</th><th style="text-align:right">Actions</th>'
    +'</tr></thead><tbody>';
  if(!rows.length){
    html+=emptyState('No Users Found', 'There are no registered users in the system.');
  }else{
    html+=rows.map(function(u){
      var status=u.locked?'<span class="badge b-red">locked</span>':(u.active?'<span class="badge b-green">active</span>':'<span class="badge b-grey">inactive</span>');
      var rs = (u.roles && u.roles.length) ? u.roles.slice() : (u.role ? [u.role] : []);
      var access = rs.length ? rs.map(roleChip).join(' ') : '<span class="badge b-grey" style="opacity:.6">none</span>';
      return '<tr>'
        +'<td style="font-weight:600;color:var(--bright)">'+esc(u.email)+'</td>'
        +'<td>'+esc(u.name||'—')+'</td>'
        +'<td>'+access+'</td>'
        +'<td>'+status+'</td>'
        +'<td style="font-size:11px;color:var(--fog)">'+(u.lastLogin?new Date(u.lastLogin).toLocaleString():'never')+'</td>'
        +'<td style="text-align:right;white-space:nowrap">'
        +'  <button class="btn btn-ghost btn-xs u_access" data-email="'+esc(u.email)+'" data-roles="'+esc(rs.join(','))+'">Edit Access</button> '
        +'  <button class="btn btn-ghost btn-xs u_reset" data-email="'+esc(u.email)+'">Reset Pwd</button> '
        +'  <button class="btn btn-ghost btn-xs u_toggle" data-email="'+esc(u.email)+'" data-active="'+u.active+'">'
        +    (u.active?'Deactivate':'Activate')+'</button>'
        +'  <button class="btn btn-red btn-xs u_delete" data-email="'+esc(u.email)+'">Delete</button>'
        +'</td></tr>';
    }).join('');
  }
  html+='</tbody></table></div></div>';

  html+='<div class="card" style="margin-top:24px"><div class="card-head"><span class="card-title">Add Custom Access Role</span></div>'
    +'<div class="card-body"><div class="form-grid" style="grid-template-columns:1fr auto;gap:12px;align-items:end">'
    +'<div class="field"><label>New Role Name</label><input class="inp" id="newRoleName" placeholder="e.g. auditor, manager"></div>'
    +'<button class="btn btn-gold" id="btnAddRole" style="height:42px">Add Role</button>'
    +'</div><div style="font-size:11px;color:var(--fog);margin-top:8px">Registered Roles: ' + getAllRoles().join(', ') + '</div></div></div>';

  return html;
}

function wireUsersTab(){
  var btnSearchUsr = el('btnSearchUsr');
  if(!btnSearchUsr) return;
  btnSearchUsr.addEventListener('click', function(){
    S.filters.users = el('uQ').value;
    renderSettings();
  });
  el('uQ').addEventListener('keydown', function(e){ if(e.key==='Enter') el('btnSearchUsr').click(); });
  var btnExportUsr = el('btnExportUsr');
  btnExportUsr.addEventListener('click', function(){ exportTableToCSV(el('tblUsers'), 'Users'); });

  // Wire actions
  var uInvBtn = el('uInvBtn');
  uInvBtn.addEventListener('click', openInviteUserModal);
  document.querySelectorAll('.u_access').forEach(function(b){
    b.addEventListener('click', function(){
      var rs = String(b.dataset.roles||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
      openAccessModal(b.dataset.email, rs);
    });
  });
  document.querySelectorAll('.u_toggle').forEach(function(b){
    b.addEventListener('click', async function(){
      var active = b.dataset.active==='true';
      try{ await call('setUserActiveAdmin', b.dataset.email, !active); toast('User '+(!active?'activated':'deactivated')+'.','ok'); renderSettings(); }
      catch(e){ toast(errMsg(e),'err'); }
    });
  });
  document.querySelectorAll('.u_reset').forEach(function(b){
    b.addEventListener('click', function(){ openResetPwdModal(b.dataset.email); });
  });
  document.querySelectorAll('.u_delete').forEach(function(b){
    b.addEventListener('click', async function(){
      var email = b.dataset.email;
      if (!confirm('Are you absolutely sure you want to delete user ' + email + '? This action cannot be undone.')) {
        return;
      }
      try{ 
        await call('deleteUserAdmin', email); 
        toast('User deleted successfully.','ok'); 
        renderSettings(); 
      }
      catch(e){ toast(errMsg(e),'err'); }
    });
  });

  var btnAddRole = el('btnAddRole');
  if(btnAddRole) {
    btnAddRole.addEventListener('click', async function(){
      var name = el('newRoleName').value.trim();
      if(!name) { toast('Please enter a role name.', 'err'); return; }
      btnAddRole.disabled = true;
      try {
        var res = await call('addCustomRole', name);
        if(res && res.ok) {
          toast('Role "' + name + '" registered successfully!', 'ok');
          if(S.user && S.user.config) S.user.config[name.toLowerCase()] = [];
          renderSettings();
        }
      } catch(e) {
        toast(errMsg(e), 'err');
      } finally {
        btnAddRole.disabled = false;
      }
    });
  }
}

async function renderPermissionsTab(seq){
  var permissions={};
  try{ permissions=await call('getFeaturePermissions'); }
  catch(e){ return '<div style="padding:20px"><div class="err-box"><strong>Error loading permissions</strong><br>'+esc(errMsg(e))+'</div></div>'; }
  if(seq !== S._renderSeq) return '';

  var featureLabels = {
    'dashboard': 'Dashboard View',
    'payments': 'Payment Requests',
    'purchase_orders': 'Purchase Orders',
    'goods_receipt': 'Goods Receipt Notes',
    'projects': 'Projects',
    'vendors': 'Vendors',
    'budgets': 'Budget Tracking',
    'documents': 'Document Storage',
    'notifications': 'Notifications',
    'settings': 'Settings',
    'reports': 'Reports',
    'create_payment': 'Create Payment Request',
    'approve_payment': 'Approve Payments',
    'reject_payment': 'Reject Payments',
    'create_po': 'Create Purchase Order',
    'approve_po': 'Approve Purchase Order',
    'upload_document': 'Upload Documents',
    'manage_users': 'Manage Users',
    'manage_settings': 'Manage Settings',
    'export_data': 'Export Data',
    'view_analytics': 'View Analytics'
  };

  var roleKeys = ['proc', 'finance', 'director'];
  var roleLabels = { 'proc': 'Procurement', 'finance': 'Finance', 'director': 'Director' };

  var html=''
    +'<div class="section-head" style="align-items:center"><div class="card-title">Feature Permissions</div>'
    +'<div style="flex:1"></div>'
    +'<button class="btn btn-gold btn-sm" id="btnSavePerms">Save Changes</button></div>'
    +'<div class="card"><div class="table-wrap"><table id="tblPermissions"><thead><tr>'
    +'<th style="width:200px">Feature</th>'
    +roleKeys.map(function(r){ return '<th style="text-align:center">'+esc(roleLabels[r])+'</th>'; }).join('')
    +'</tr></thead><tbody>';

  Object.keys(featureLabels).forEach(function(key){
    html+='<tr><td style="font-weight:500;color:var(--bright)">'+esc(featureLabels[key])+'</td>';
    roleKeys.forEach(function(role){
      var checked = permissions[role] && permissions[role].indexOf(key) >= 0 ? ' checked' : '';
      html+='<td style="text-align:center"><input type="checkbox" class="perm-check" data-role="'+esc(role)+'" data-feature="'+esc(key)+'"'+checked+'></td>';
    });
    html+='</tr>';
  });

  html+='</tbody></table></div></div>';
  return html;
}

function wirePermissionsTab(){
  var btnSavePerms = el('btnSavePerms');
  if(!btnSavePerms) return;
  btnSavePerms.addEventListener('click', async function(){
    var checkboxes = document.querySelectorAll('.perm-check');
    var newConfig = { proc: [], finance: [], director: [] };
    checkboxes.forEach(function(cb){
      if(cb.checked){
        newConfig[cb.dataset.role].push(cb.dataset.feature);
      }
    });
    try{
      await call('setFeaturePermissions', newConfig);
      toast('Feature permissions saved successfully.', 'ok');
    } catch(e){
      toast(errMsg(e), 'err');
    }
  });
}

function openAccessModal(email, roles){
  // ── DOM construction — no innerHTML, no el() lookups, zero stale-ref risk ──
  var roleOptions = ['proc', 'finance', 'director'];
  var set = {};
  (roles||[]).forEach(function(r){ set[String(r||'').trim().toLowerCase()] = true; });

  var body = document.createElement('div');

  var title = document.createElement('div');
  title.className = 'card-title';
  title.style.marginBottom = '14px';
  title.textContent = 'Edit Access';
  body.appendChild(title);

  var subtitle = document.createElement('div');
  subtitle.style.cssText = 'font-size:12.5px;color:var(--fog);margin-bottom:14px';
  subtitle.innerHTML = 'User: <span style="color:var(--bright);font-weight:600">'+esc(email)+'</span>';
  body.appendChild(subtitle);

  var rolesGrid = document.createElement('div');
  rolesGrid.style.cssText = 'display:grid;gap:10px;margin-bottom:16px';

  // Keep direct references to each checkbox — never query the DOM again
  var checkboxes = {};
  roleOptions.forEach(function(r){
    var label = document.createElement('label');
    label.className = 'opt-card';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = r;
    cb.checked = !!set[r];
    cb.style.cssText = 'width:16px;height:16px';
    var span = document.createElement('span');
    span.style.cssText = 'font-weight:700;color:var(--bright)';
    span.textContent = r;
    label.appendChild(cb);
    label.appendChild(span);
    rolesGrid.appendChild(label);
    checkboxes[r] = cb;
  });
  body.appendChild(rolesGrid);

  var errDiv = document.createElement('div');
  errDiv.style.cssText = 'display:none;color:var(--red);font-size:12px;margin-bottom:10px';
  body.appendChild(errDiv);

  var footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-ghost btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function(){ closeModal(); };
  footer.appendChild(cancelBtn);

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-gold btn-sm';
  saveBtn.textContent = 'Save';
  footer.appendChild(saveBtn);

  body.appendChild(footer);

  // ── Listener closes over DOM nodes directly — never uses el() ──
  saveBtn.addEventListener('click', async function(){
    var selected = roleOptions.filter(function(r){ return checkboxes[r].checked; });
    errDiv.style.display = 'none';
    errDiv.textContent = '';
    if(!selected.length){
      errDiv.textContent = 'Select at least one access role.';
      errDiv.style.display = '';
      return;
    }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try{
      await call('setUserRolesAdmin', email, selected);
      closeModal(); toast('Access updated.','ok'); renderSettings();
    }catch(e){
      errDiv.textContent = errMsg(e); errDiv.style.display = '';
      saveBtn.disabled = false; saveBtn.textContent = 'Save';
    }
  });

  // Use legacy openModal with the constructed node
  var modalBox = el('modalBox');
  modalBox.innerHTML = '';
  modalBox.appendChild(body);
  var mb = el('modalBack');
  mb.style.display = 'flex';
  mb.offsetHeight;
  mb.className = 'modal-back open';
}

function openProjectEditModal(projectName){
  if(!hasRole('finance') && !hasRole('director')){
    toast('Finance or Director role required to edit projects','err');
    return;
  }
  var p = (S.projects||[]).filter(function(x){return x.project===projectName;})[0];
  if(!p){ toast('Project not found','err'); return; }

  // ── DOM construction — direct refs, zero stale el() risk ──
  var INP_STYLE = 'width:100%;padding:10px;background:var(--ink-3);border:1px solid var(--line);border-radius:6px;color:var(--text);font-family:DM Mono,monospace';
  var LBL_STYLE = 'display:block;font-size:11px;color:var(--fog);margin-bottom:4px';

  function makeNumField(labelText, defaultVal) {
    var wrap = document.createElement('div');
    var lbl  = document.createElement('label');
    lbl.style.cssText = LBL_STYLE;
    lbl.textContent   = labelText;
    var inp = document.createElement('input');
    inp.type = 'number'; inp.step = 'any'; inp.min = '0';
    inp.value = defaultVal || 0;
    inp.style.cssText = INP_STYLE;
    wrap.appendChild(lbl); wrap.appendChild(inp);
    return { wrap: wrap, inp: inp };
  }

  var body = document.createElement('div');

  var title = document.createElement('div');
  title.className = 'card-title'; title.style.marginBottom = '14px';
  title.textContent = 'Edit Project Financials';
  body.appendChild(title);

  var sub = document.createElement('div');
  sub.style.cssText = 'font-size:12px;color:var(--fog);margin-bottom:14px';
  sub.innerHTML = 'Project: <strong style="color:var(--bright)">'+esc(p.project)+'</strong>';
  body.appendChild(sub);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;gap:12px';

  var boqF    = makeNumField('Total Project Value / BOQ (₹)',  p.projectValue||0);
  var bcsF    = makeNumField('Budgeted Cost Summary (BCS) (₹)', p.bcs||0);
  var inflowF = makeNumField('Total Inflow Received (₹)',       p.inflow||0);
  var debitF  = makeNumField('Client Debit / Invoice Value (₹)',p.invoiceValue||0);
  var tdsF    = makeNumField('Total TDS (₹)',                   p.tds||0);

  [boqF, bcsF, inflowF, debitF, tdsF].forEach(function(f){ grid.appendChild(f.wrap); });

  var errDiv = document.createElement('div');
  errDiv.style.cssText = 'display:none;color:var(--red);font-size:12px';
  grid.appendChild(errDiv);

  var foot = document.createElement('div');
  foot.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:6px';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-ghost btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function(){ closeModal(); };

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary btn-sm';
  saveBtn.textContent = 'Save Changes';

  foot.appendChild(cancelBtn); foot.appendChild(saveBtn);
  grid.appendChild(foot);
  body.appendChild(grid);

  // ── Listener closes over DOM nodes directly ──
  saveBtn.addEventListener('click', async function(){
    errDiv.style.display = 'none'; errDiv.textContent = '';
    var payload = {
      project:      p.project,
      projectValue: boqF.inp.value,
      bcs:          bcsF.inp.value,
      inflow:       inflowF.inp.value,
      clientDebit:  debitF.inp.value,
      tds:          tdsF.inp.value
    };
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try{
      await call('updateProjectFinancials', payload);
      toast('Project updated successfully', 'ok');
      closeModal();
      S.projects = null; S.kpis = null;
      if(S.view === 'dashboard') renderDashboard(S._renderSeq);
      else renderProjects(S._renderSeq);
    }catch(e){
      errDiv.textContent = errMsg(e); errDiv.style.display = '';
      saveBtn.disabled = false; saveBtn.textContent = 'Save Changes';
    }
  });

  var modalBox = el('modalBox');
  modalBox.innerHTML = '';
  modalBox.appendChild(body);
  var mb = el('modalBack');
  mb.style.display = 'flex'; mb.offsetHeight;
  mb.className = 'modal-back open';
  boqF.inp.focus();
}

function openInviteUserModal(){
  // ── DOM construction — direct refs, zero stale el() risk ──
  var roleOptions = getAllRoles();

  var body = document.createElement('div');

  var title = document.createElement('div');
  title.className = 'card-title'; title.style.marginBottom = '14px';
  title.textContent = 'Invite User';
  body.appendChild(title);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;gap:10px';

  var INP_STYLE = 'width:100%;padding:10px;background:var(--ink-3);border:1px solid var(--line);border-radius:6px;color:var(--text)';
  var LBL_STYLE = 'display:block;font-size:11px;color:var(--fog);margin-bottom:4px';

  function makeField(labelText, inputType, placeholder) {
    var wrap = document.createElement('div');
    var lbl  = document.createElement('label');
    lbl.style.cssText = LBL_STYLE; lbl.textContent = labelText;
    var inp = document.createElement('input');
    inp.type = inputType || 'text';
    if (placeholder) inp.placeholder = placeholder;
    inp.style.cssText = INP_STYLE;
    wrap.appendChild(lbl); wrap.appendChild(inp);
    return { wrap: wrap, inp: inp };
  }

  var emailF = makeField('Email', 'email', 'user@company.com');
  var nameF  = makeField('Name', 'text', 'Full name');
  grid.appendChild(emailF.wrap);
  grid.appendChild(nameF.wrap);

  // Access checkboxes — keep direct node refs
  var accessWrap = document.createElement('div');
  var accessLbl  = document.createElement('label');
  accessLbl.style.cssText = LBL_STYLE; accessLbl.textContent = 'Access';
  accessWrap.appendChild(accessLbl);
  var cbGrid = document.createElement('div');
  cbGrid.style.cssText = 'display:grid;gap:8px';
  var checkboxes = {};
  roleOptions.forEach(function(r){
    var label = document.createElement('label');
    label.className = 'opt-card';
    var cb = document.createElement('input');
    cb.type = 'checkbox'; cb.value = r;
    cb.checked = (r === 'finance');
    cb.style.cssText = 'width:16px;height:16px';
    var span = document.createElement('span');
    span.style.cssText = 'font-weight:700;color:var(--bright)';
    span.textContent = r;
    label.appendChild(cb); label.appendChild(span);
    cbGrid.appendChild(label);
    checkboxes[r] = cb;
  });
  accessWrap.appendChild(cbGrid);
  grid.appendChild(accessWrap);

  var pwdF = makeField('Temporary Password (8+ chars)', 'text');
  pwdF.inp.value = 'ChangeMe123!';
  pwdF.inp.style.fontFamily = 'DM Mono,monospace';
  grid.appendChild(pwdF.wrap);

  var errDiv = document.createElement('div');
  errDiv.style.cssText = 'display:none;color:var(--red);font-size:12px';
  grid.appendChild(errDiv);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:var(--fog)';
  hint.textContent = 'Share the email + temp password with the user. They should change it on first login.';
  grid.appendChild(hint);

  var foot = document.createElement('div');
  foot.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:6px';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-ghost btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function(){ closeModal(); };
  var createBtn = document.createElement('button');
  createBtn.className = 'btn btn-gold btn-sm';
  createBtn.textContent = 'Create User';
  foot.appendChild(cancelBtn); foot.appendChild(createBtn);
  grid.appendChild(foot);
  body.appendChild(grid);

  // ── Listener — reads from direct node refs, validates before dispatch ──
  createBtn.addEventListener('click', async function(){
    var email = emailF.inp.value.trim().toLowerCase();
    var name  = nameF.inp.value.trim();
    var roles = roleOptions.filter(function(r){ return checkboxes[r].checked; });
    var pwd   = pwdF.inp.value;

    errDiv.style.display = 'none'; errDiv.textContent = '';

    if (!email || email.indexOf('@') < 0) {
      errDiv.textContent = 'Please enter a valid email address.';
      errDiv.style.display = ''; return;
    }
    if (!roles.length) {
      errDiv.textContent = 'Select at least one access role.';
      errDiv.style.display = ''; return;
    }
    if (!pwd || pwd.length < 8) {
      errDiv.textContent = 'Password must be at least 8 characters.';
      errDiv.style.display = ''; return;
    }

    createBtn.disabled = true; createBtn.textContent = 'Creating…';
    try{
      var res = await call('inviteUserAdmin', { email: email, name: name, roles: roles, password: pwd });
      closeModal();
      if (res && res.emailSent) {
        toast('✅ User created & invite email sent to '+email,'ok');
        renderSettings();
      } else {
        var inviteUrl = (res && res.inviteUrl) ? res.inviteUrl : 'https://lwa-iota.vercel.app/';
        var mb = el('modalBox'); var mbk = el('modalBack');
        mb.innerHTML =
          '<div class="modal-head"><div class="modal-title">User Created</div></div>'
          +'<div class="modal-body" style="display:grid;gap:14px">'
          +'<div style="display:flex;align-items:center;gap:10px;padding:14px;background:rgba(61,214,140,.1);border-radius:8px;border:1px solid rgba(61,214,140,.3)">'
          +'<span style="font-size:20px">✅</span>'
          +'<div><div style="color:var(--green);font-weight:700">User Created Successfully</div>'
          +'<div style="color:var(--fog);font-size:12px">'+esc(email)+'</div></div></div>'
          +'<div style="padding:14px;background:rgba(251,191,36,.08);border-radius:8px;border:1px solid rgba(251,191,36,.3)">'
          +'<div style="color:var(--amber);font-weight:700;margin-bottom:8px">⚠ Email not sent — share invite link manually</div>'
          +'<div style="color:var(--fog);font-size:12px;margin-bottom:10px">Copy this link and send it to the user:</div>'
          +'<div style="display:flex;gap:8px;align-items:center">'
          +'<input class="inp" id="inviteLinkBox" value="'+esc(inviteUrl)+'" readonly style="flex:1;font-size:11px;font-family:monospace">'
          +'<button class="btn btn-primary btn-sm" onclick="var b=el(\'inviteLinkBox\');b.select();document.execCommand(\'copy\');toast(\'Link copied!\',\'ok\')">Copy</button>'
          +'</div></div></div>'
          +'<div class="modal-foot"><button class="btn btn-primary" onclick="closeModal();renderSettings()">Done</button></div>';
        mb.style.display=''; mbk.style.display='';
      }
    }catch(e){
      errDiv.textContent = errMsg(e); errDiv.style.display = '';
      createBtn.disabled = false; createBtn.textContent = 'Create User';
    }
  });

  var modalBox = el('modalBox');
  modalBox.innerHTML = '';
  modalBox.appendChild(body);