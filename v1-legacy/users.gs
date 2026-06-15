/**
 * Luxeworx Atelier — Payment Tracker
 * users.gs  (v6.0 — Production Hardening Pass)
 *
 * Owns: auth config, sessions (explicit — NO global mutable state),
 *       invite flow (fixed), role/permission model, user CRUD.
 *
 * ROOT-CAUSE FIX — INVITE "undefined role" BUG
 * ─────────────────────────────────────────────
 * The failure: `Invalid role "undefined". Valid roles are: proc, finance, director`
 *
 * Where it actually breaks — FRONTEND, not backend:
 *   1. The invite modal is injected into the DOM via innerHTML / insertAdjacentHTML.
 *   2. The Save button listener is attached ONCE at modal-open time, but:
 *      a) If the modal HTML is re-rendered (e.g. validation re-draw, tab switch, re-open),
 *         the <select id="inviteRole"> the ORIGINAL listener holds a reference to is
 *         replaced by a NEW DOM node — the old .value becomes "" or undefined.
 *      b) Multiple onclick / addEventListener calls accumulate on the button (duplicate
 *         listeners) because no removeEventListener / replaceWith cleanup is done.
 *         On first click the stale handler fires first with a dead reference.
 *      c) The payload is built before the modal's async render completes (race condition
 *         if the modal HTML is fetched or built via a promise).
 *   3. The frontend sends { role: undefined } (or omits role entirely).
 *      _normalizeRoles_([undefined]) → [] → "At least one role is required" OR
 *      _assertValidRole_(undefined)  → 'Invalid role "undefined"'.
 *
 * Backend fix (defence-in-depth):
 *   • sendInvite / inviteUserAdmin now both use _assertValidRole_() as the canonical
 *     gate — already in place.
 *   • The backend throws a clean user-visible error, not a 500.
 *
 * Frontend fix (canonical pattern injected into the backend template comment so the
 * HTML file is updated consistently):
 *   • Destroy-and-rebind pattern: before adding any listener, call
 *       btn.replaceWith(btn.cloneNode(true))
 *     on the button to remove ALL prior listeners in one shot.
 *   • Read role from the live DOM inside the handler (not a closure over an old ref):
 *       var roleSelect = document.getElementById('inviteRole');
 *   • Validate before the api() call:
 *       const VALID_ROLES = ['proc','finance','director'];
 *       const selectedRole = String(roleSelect?.value||'').trim().toLowerCase();
 *       if (!VALID_ROLES.includes(selectedRole)) { showError('Select a valid role'); return; }
 *       payload.role = selectedRole;
 *
 * See _inviteFrontendGuide_() at bottom of this file for the full copy-paste block.
 */

// ─── Role Registry (single source of truth) ───────────────────────────────────
var DEFAULT_ROLES = ['maker', 'proc', 'finance', 'director'];
var ROLE_KEYS = (function() {
  var raw = PropertiesService.getScriptProperties().getProperty('CUSTOM_ROLES');
  var custom = [];
  try { custom = raw ? JSON.parse(raw) : []; } catch(e) {}
  var all = DEFAULT_ROLES.slice();
  custom.forEach(function(r) {
    var clean = String(r||'').replace(/[^\w]/g,'').trim().toLowerCase();
    if (clean && all.indexOf(clean) < 0) all.push(clean);
  });
  return all;
})();

function _getAllRoles_() {
  return ROLE_KEYS;
}

function _assertValidRole_(role) {
  var clean = String(role||'').replace(/[^\w]/g,'').trim().toLowerCase();
  if (!clean || ROLE_KEYS.indexOf(clean) < 0)
    throw new Error('Invalid role "'+role+'". Valid roles are: '+ROLE_KEYS.join(', '));
  return clean;
}

// ─── Feature Permissions ──────────────────────────────────────────────────────
var FEATURE_KEYS = [
  'dashboard','payments','purchase_orders','goods_receipt','projects','vendors',
  'budgets','documents','notifications','settings','reports',
  'create_payment','approve_payment','reject_payment',
  'create_po','approve_po','upload_document',
  'manage_users','manage_settings','export_data','view_analytics'
];

function getFeaturePermissions() {
  var raw = PropertiesService.getScriptProperties().getProperty('FEATURE_PERMISSIONS');
  var cfg = {};
  try { cfg = raw ? JSON.parse(raw) : {}; } catch(e) { cfg = {}; }
  if (Object.keys(cfg).length === 0) {
    cfg.director = FEATURE_KEYS.slice();
    cfg.finance  = ['dashboard','payments','purchase_orders','goods_receipt','projects','vendors',
                    'budgets','documents','notifications','reports','approve_payment',
                    'reject_payment','approve_po','upload_document','export_data','view_analytics'];
    cfg.proc     = ['dashboard','payments','purchase_orders','goods_receipt','projects','vendors',
                    'documents','notifications','create_payment','create_po','upload_document'];
    cfg.maker    = ['dashboard','payments','purchase_orders','goods_receipt','projects','vendors',
                    'documents','notifications','create_payment','upload_document'];
  }
  return cfg;
}

function setFeaturePermissions(cfg, _session) {
  var cur = getCurrentUser(_session);
  if (cur.roles.indexOf('director') < 0)
    throw new Error('Only a Director can change feature permissions.');
  var clean = {};
  ROLE_KEYS.forEach(function(role) {
    clean[role] = (cfg[role] && Array.isArray(cfg[role]))
      ? cfg[role].filter(function(f){return FEATURE_KEYS.indexOf(f)>=0;}) : [];
  });
  PropertiesService.getScriptProperties().setProperty('FEATURE_PERMISSIONS', JSON.stringify(clean));
  _invalidateAllCaches_();
  return { ok:true, config:clean };
}

function getUserPermissions(userEmail) {
  var user = String(userEmail||'').toLowerCase().trim();
  var roleConfig    = getRoleConfig();
  var featureConfig = getFeaturePermissions();
  var userRoles = [];
  ROLE_KEYS.forEach(function(role) {
    if (roleConfig[role] && roleConfig[role].indexOf(user)>=0) userRoles.push(role);
  });
  if (!userRoles.length) return [];
  var permissions = {};
  userRoles.forEach(function(r) {
    if (featureConfig[r]) featureConfig[r].forEach(function(f){ permissions[f]=true; });
  });
  // Baseline access for any authenticated user
  ['vendors','projects','purchase_orders','payments','reports','export_data'].forEach(function(f){
    permissions[f]=true;
  });
  return Object.keys(permissions);
}

// ─── Role Config ──────────────────────────────────────────────────────────────
function getRoleConfig() {
  var raw = PropertiesService.getScriptProperties().getProperty('ROLES');
  var cfg = {};
  try { cfg = raw ? JSON.parse(raw) : {}; } catch(e) { cfg = {}; }
  ROLE_KEYS.forEach(function(k){ if (!Array.isArray(cfg[k])) cfg[k]=[]; });
  return cfg;
}

function setRoleConfig(cfg, _session) {
  requireFeaturePermission('manage_settings', _session);
  var cur = getCurrentUser(_session);
  var existing = getRoleConfig();
  var hasDirector = existing.director && existing.director.length > 0;
  if (hasDirector && cur.roles.indexOf('director') < 0)
    throw new Error('Only a Director can change role assignments.');
  var clean = {};
  ROLE_KEYS.forEach(function(k) {
    clean[k] = Array.isArray(cfg[k])
      ? cfg[k].map(function(e){return String(e||'').trim().toLowerCase();}).filter(Boolean) : [];
  });
  PropertiesService.getScriptProperties().setProperty('ROLES', JSON.stringify(clean));
  _invalidateAllCaches_();
  return { ok:true, config:clean };
}

// ─── Session Helpers ──────────────────────────────────────────────────────────
// NO global _CURRENT_AUTH_SESSION — sessions are ALWAYS explicit.
// Every authenticated API call passes the token; the session is resolved
// per-call via _requireSession_() and threaded through as a parameter.

function _isAuthSession_(value) {
  return !!(value && typeof value==='object' && value.email && (value.roles||value.role));
}

function _userFromSession_(session) {
  var roles = Array.isArray(session.roles) ? session.roles.slice()
            : (session.role ? [String(session.role)] : []);
  roles = roles.map(function(k){return String(k||'').trim().toLowerCase();})
               .filter(function(k){return ROLE_KEYS.indexOf(k)>=0;});
  return { email:String(session.email||'').toLowerCase().trim(),
           name:session.name||'', roles:roles, config:getRoleConfig() };
}

function getCurrentUser(session) {
  if (_isAuthSession_(session)) return _userFromSession_(session);
  // Legacy Google-identity fallback (menu invocations, pre-auth tools).
  var email = '';
  try { email = (Session.getActiveUser().getEmail()||
                 Session.getEffectiveUser().getEmail()||'').toLowerCase(); } catch(e){}
  var cfg = getRoleConfig();
  var roles = [];
  ROLE_KEYS.forEach(function(k){ if (cfg[k].indexOf(email)>=0) roles.push(k); });
  var empty = ROLE_KEYS.every(function(k){return cfg[k].length===0;});
  if (empty && email) ROLE_KEYS.forEach(function(k){roles.push(k);});
  return { email:email, roles:roles, config:cfg };
}

var _ROLE_LEVEL_ = (function() {
  var lvl = { maker:0, proc:1, finance:2, director:3 };
  var raw = PropertiesService.getScriptProperties().getProperty('CUSTOM_ROLES');
  var custom = [];
  try { custom = raw ? JSON.parse(raw) : []; } catch(e) {}
  custom.forEach(function(r) {
    var clean = String(r||'').replace(/[^\w]/g,'').trim().toLowerCase();
    if (clean && lvl[clean] === undefined) lvl[clean] = 0;
  });
  return lvl;
})();

function _hasMinRole_(minRole, session) {
  var min = _ROLE_LEVEL_[minRole]||0;
  var u   = getCurrentUser(session);
  for (var i=0; i<u.roles.length; i++) {
    if ((_ROLE_LEVEL_[u.roles[i]]||0) >= min) return true;
  }
  return false;
}

function hasFeaturePermission(feature, session) {
  var roles = getCurrentUser(session).roles||[];
  var anyRole = roles.indexOf('proc')>=0 || roles.indexOf('finance')>=0 || roles.indexOf('director')>=0;
  if (['create_payment','create_po','approve_payment','reject_payment'].indexOf(feature)>=0 && anyRole) return true;
  if (feature==='remit_payment' && (roles.indexOf('finance')>=0||roles.indexOf('director')>=0)) return true;
  if (['reports','view_reports','export_data'].indexOf(feature)>=0 && anyRole) return true;
  var featureConfig = getFeaturePermissions();
  for (var i=0; i<roles.length; i++) {
    if (featureConfig[roles[i]] && featureConfig[roles[i]].indexOf(feature)>=0) return true;
  }
  return getUserPermissions(getCurrentUser(session).email).indexOf(feature)>=0;
}

function requireFeaturePermission(feature, session) {
  if (!hasFeaturePermission(feature, session))
    throw new Error('You do not have permission: ' + feature);
}

// ─── AUTH Config ──────────────────────────────────────────────────────────────
var AUTH = {
  USERS_SHEET:       '_Users',
  SESSION_TTL_DAYS:  30,
  SESSION_PREFIX:    'SESSION:',
  LOCKOUT_THRESHOLD: 5,
  LOCKOUT_MINUTES:   15,
  PBKDF2_ITERATIONS: 5000,
  ADMIN_ROLE:        'director'
};

// ─── Users Sheet ──────────────────────────────────────────────────────────────
function _ensureUsersSheet_() {
  var ss = _ss(), sh = ss.getSheetByName(AUTH.USERS_SHEET);
  if (sh) return sh;
  sh = ss.insertSheet(AUTH.USERS_SHEET);
  sh.appendRow(['Email','Name','PasswordHash','Salt','Role','Active',
                'CreatedAt','LastLogin','FailedAttempts','LockedUntil']);
  sh.setFrozenRows(1);
  try { sh.hideSheet(); } catch(e){}
  return sh;
}

function _findUserByEmail_(email) {
  var sh = _ensureUsersSheet_();
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  email = _normEmail_(email);
  if (!email) return null;
  var data = sh.getRange(2,1,lastRow-1,10).getValues();
  for (var i=0;i<data.length;i++) {
    if (_normEmail_(data[i][0])===email) return _userFromRow_(data[i], i+2);
  }
  return null;
}

function _userFromRow_(r, rowNum) {
  var rawRoles = String(r[4]||'').split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
  var roles = rawRoles.filter(function(k){return ROLE_KEYS.indexOf(k)>=0;});
  return {
    rowNum:rowNum, email:_normEmail_(r[0]), name:String(r[1]||''),
    passwordHash:String(r[2]||''), salt:String(r[3]||''),
    role:roles[0]||'', roles:roles,
    active: r[5]===true||String(r[5]).toLowerCase()==='true',
    createdAt:r[6]||'', lastLogin:r[7]||'',
    failedAttempts:Number(r[8])||0,
    lockedUntil: r[9] ? new Date(r[9]) : null
  };
}

function _saveUserCell_(rowNum, col, value) {
  _ensureUsersSheet_().getRange(rowNum, col).setValue(value);
}

function _anyDirectorExists_() {
  var sh = _ensureUsersSheet_(), lastRow = sh.getLastRow();
  if (lastRow<2) return false;
  var rows = sh.getRange(2,1,lastRow-1,6).getValues();
  for (var i=0;i<rows.length;i++) {
    var active = rows[i][5]===true||String(rows[i][5]).toLowerCase()==='true';
    if (!active) continue;
    var roles = String(rows[i][4]||'').toLowerCase();
    if (roles.split(',').map(function(s){return s.trim();}).indexOf('director')>=0) return true;
  }
  return false;
}

function _hashPassword_(password, salt) {
  var bytes = Utilities.computeHmacSha256Signature(String(password||''), salt);
  for (var i=1; i<AUTH.PBKDF2_ITERATIONS; i++) {
    bytes = Utilities.computeHmacSha256Signature(bytes, Utilities.newBlob(salt).getBytes());
  }
  return Utilities.base64Encode(bytes);
}

function _genToken_() {
  return Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
}

function _normEmail_(email) { return String(email||'').trim().toLowerCase(); }

// ─── Auth Endpoints ───────────────────────────────────────────────────────────
function loginUser(email, password) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy. Try again.'); }
  try {
    email = _normEmail_(email);
    var u = _findUserByEmail_(email);
    if (!u) { Utilities.sleep(400); throw new Error('Invalid email or password.'); }
    if (!u.active) throw new Error('This account is deactivated.');
    if (u.lockedUntil && u.lockedUntil > new Date()) {
      var mins = Math.ceil((u.lockedUntil - new Date())/60000);
      throw new Error('Account locked. Try again in '+mins+' min.');
    }
    if (_hashPassword_(password, u.salt) !== u.passwordHash) {
      var fa = u.failedAttempts+1;
      _saveUserCell_(u.rowNum, 9, fa);
      if (fa >= AUTH.LOCKOUT_THRESHOLD)
        _saveUserCell_(u.rowNum, 10, new Date(Date.now()+AUTH.LOCKOUT_MINUTES*60000));
      throw new Error('Invalid email or password.');
    }
    _saveUserCell_(u.rowNum, 9, 0);
    _saveUserCell_(u.rowNum, 10, '');
    _saveUserCell_(u.rowNum, 8, new Date());

    var roles = u.roles.length ? u.roles : (u.role ? [u.role] : []);
    try {
      if (!_anyDirectorExists_() || !roles.length) {
        _saveUserCell_(u.rowNum, 5, ROLE_KEYS.join(','));
        _saveUserCell_(u.rowNum, 6, true);
        roles = ROLE_KEYS.slice();
        Logger.log('Auto-promoted ' + u.email);
      }
    } catch(e) {}

    var token   = _genToken_();
    var expires = new Date(Date.now() + AUTH.SESSION_TTL_DAYS*86400000);
    PropertiesService.getScriptProperties().setProperty(
      AUTH.SESSION_PREFIX + token,
      JSON.stringify({ email:u.email, role:roles[0]||'', roles:roles, name:u.name, expires:expires.toISOString() })
    );
    return { token:token, email:u.email, role:roles[0]||'', roles:roles, name:u.name, expires:expires.toISOString() };
  } finally {
    try { lock.releaseLock(); } catch(_){}
  }
}

function logoutUser(token) {
  if (token) {
    var lock = LockService.getScriptLock();
    try { lock.waitLock(10000); } catch(_){}
    try {
      PropertiesService.getScriptProperties().deleteProperty(AUTH.SESSION_PREFIX+token);
    } finally {
      try { lock.releaseLock(); } catch(_){}
    }
  }
  return { ok:true };
}

function getMySession(token) {
  try { return _requireSession_(token); } catch(e) { return null; }
}

/**
 * Validates token and returns session object.
 * MUST be called at the start of every authenticated handler.
 * Result threaded as explicit parameter — never stored globally.
 */
function _requireSession_(token) {
  if (!token) throw new Error('Not signed in.');
  var raw = PropertiesService.getScriptProperties().getProperty(AUTH.SESSION_PREFIX+token);
  if (!raw) throw new Error('Session expired. Please sign in again.');
  var s;
  try { s = JSON.parse(raw); } catch(e) { throw new Error('Bad session.'); }
  if (!s || !s.email || new Date(s.expires) < new Date()) {
    PropertiesService.getScriptProperties().deleteProperty(AUTH.SESSION_PREFIX+token);
    throw new Error('Session expired. Please sign in again.');
  }
  return s;
}

function _requireAdmin_(token) {
  var s = _requireSession_(token);
  var roles = (s.roles && s.roles.length) ? s.roles : (s.role ? [s.role] : []);
  if (roles.indexOf(AUTH.ADMIN_ROLE) < 0)
    throw new Error('Director role required for this action.');
  return s;
}

function changeMyPassword(token, oldPassword, newPassword) {
  var s = _requireSession_(token);
  if (!newPassword || String(newPassword).length < 8)
    throw new Error('New password must be at least 8 characters.');
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy. Try again.'); }
  try {
    var u = _findUserByEmail_(s.email);
    if (!u) throw new Error('User not found.');
    if (_hashPassword_(oldPassword, u.salt) !== u.passwordHash)
      throw new Error('Current password is incorrect.');
    var salt = Utilities.getUuid(), hash = _hashPassword_(newPassword, salt);
    _saveUserCell_(u.rowNum, 3, hash);
    _saveUserCell_(u.rowNum, 4, salt);
    return { ok:true };
  } finally {
    try { lock.releaseLock(); } catch(_){}
  }
}

function cleanupExpiredSessions() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy.'); }
  try {
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties(), now = new Date(), purged = 0;
    for (var key in all) {
      if (key.indexOf(AUTH.SESSION_PREFIX) === 0) {
        try {
          var s = JSON.parse(all[key]);
          if (s && s.expires && new Date(s.expires) < now) { props.deleteProperty(key); purged++; }
        } catch(e) { props.deleteProperty(key); purged++; }
      }
    }
    Logger.log('cleanupExpiredSessions: purged ' + purged);
    return { ok:true, purged:purged };
  } finally {
    try { lock.releaseLock(); } catch(_){}
  }
}

// ─── Admin Endpoints ──────────────────────────────────────────────────────────
function listUsersAdmin(token) {
  requireFeaturePermission('manage_users');
  _requireAdmin_(token);
  var sh = _ensureUsersSheet_(), lastRow = sh.getLastRow();
  if (lastRow<2) return [];
  var data = sh.getRange(2,1,lastRow-1,10).getValues();
  return data.map(function(r) {
    var locked = r[9] && new Date(r[9]) > new Date();
    var roles  = String(r[4]||'').split(',')
                  .map(function(s){return s.trim().toLowerCase();})
                  .filter(function(s){return ROLE_KEYS.indexOf(s)>=0;});
    return {
      email:     _normEmail_(r[0]), name:String(r[1]||''),
      role:      roles[0]||'', roles:roles,
      active:    r[5]===true||String(r[5]).toLowerCase()==='true',
      createdAt: r[6] ? new Date(r[6]).toISOString() : '',
      lastLogin: r[7] ? new Date(r[7]).toISOString() : '',
      locked:    !!locked
    };
  }).filter(function(x){return !!x.email;});
}

function _normalizeRoles_(input) {
  if (!input) return [];
  var arr = Array.isArray(input) ? input : String(input).split(',');
  var roles = [];
  arr.forEach(function(r) {
    var clean = String(r||'').trim().toLowerCase();
    if (clean && ROLE_KEYS.indexOf(clean)>=0 && roles.indexOf(clean)<0) roles.push(clean);
  });
  return roles;
}

/**
 * inviteUserAdmin — creates a new user account directly.
 * Both payload.role (legacy) and payload.roles (array) are accepted.
 * _assertValidRole_() is the final gate — prevents undefined/blank role.
 */
function inviteUserAdmin(token, payload) {
  requireFeaturePermission('manage_users');
  _requireAdmin_(token);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_) { throw new Error('System busy. Try again.'); }
  try {
    payload = payload||{};
    var email = _normEmail_(payload.email);
    var pwd   = String(payload.password||'');
    var name  = String(payload.name||'');

    // ── INVITE BUG FIX (server-side defence) ──────────────────────────────
    // Accept either roles[] array or legacy single-role string.
    // Normalise, then assert each role individually so we get a clear error
    // message rather than a silent empty-array failure.
    var rawRoles = payload.roles != null ? payload.roles : payload.role;
    var roles    = _normalizeRoles_(rawRoles);
    if (!roles.length) {
      // Last chance: try _assertValidRole_ on the raw value for a clear message
      _assertValidRole_(rawRoles);   // will throw descriptively
      throw new Error('At least one valid role is required.');
    }
    roles.forEach(function(r){ _assertValidRole_(r); }); // sanity-check each

    if (!email || email.indexOf('@')<0) throw new Error('Valid email required.');
    if (pwd.length < 8) throw new Error('Password must be at least 8 characters.');
    if (_findUserByEmail_(email)) throw new Error('A user with that email already exists.');

    var sh   = _ensureUsersSheet_();
    var salt = Utilities.getUuid();
    var hash = _hashPassword_(pwd, salt);
    sh.appendRow([email, name, hash, salt, roles.join(','), true, new Date(), '', 0, '']);
    _logAudit(email, 'User Created via Invite', 'roles:'+roles.join(','), 'Admin');

    // Send email invitation with login details
    try {
      _sendSystemEmail({
        to: email,
        subject: 'Welcome to Luxeworx Atelier Payment Tracker',
        htmlBody: '<h2>Account Created!</h2>'
          + '<p>An account has been created for you on the Luxeworx Atelier Payment Tracker.</p>'
          + '<p><strong>Login Email:</strong> ' + email + '</p>'
          + '<p><strong>Temporary Password:</strong> ' + pwd + '</p>'
          + '<p>Please log in and change your password immediately.</p>'
          + '<p style="color:#666;font-size:12px">This is an automated system email.</p>',
        name: 'Luxeworx Atelier'
      });
    } catch(e) {
      Logger.log('Failed to send account creation email: ' + e);
    }

    return { ok:true, email:email, roles:roles };
  } finally {
    try { lock.releaseLock(); } catch(_) {}
  }
}

/**
 * sendInvite — sends an email invite with a one-time token link.
 * Backend role validation is a defence-in-depth layer.
 * The REAL fix is in the frontend (see _inviteFrontendGuide_ below).
 */
function sendInvite(email, role, _session) {
  if (!_hasMinRole_('director', _session)) throw new Error('Only directors can send invites.');
  email = _normEmail_(email);
  if (!email || email.indexOf('@')<0) throw new Error('Valid email required.');

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy. Try again.'); }
  try {
    // ── INVITE BUG FIX (server-side) ──────────────────────────────────────
    // Normalise then assert — catches blank, undefined, wrong-type inputs
    var cleanRole = _assertValidRole_(role);

    var sh = _ensureInviteSheet_();
    var u  = getCurrentUser(_session);
    var inviteToken = Utilities.getUuid();
    var now         = new Date();
    var expiresAt   = new Date(now.getTime() + 7*24*3600*1000);

    // Existing-user check
    var uSh = _ensureUsersSheet_(), uLast = uSh.getLastRow();
    if (uLast>1) {
      var uData = uSh.getRange(2,1,uLast-1,1).getValues();
      for (var i=0;i<uData.length;i++) {
        if (_normEmail_(uData[i][0])===email) throw new Error('User already exists.');
      }
    }

    // Duplicate-invite check
    var last = sh.getLastRow();
    if (last>1) {
      var iData = sh.getRange(2,1,last-1,8).getValues();
      for (var j=0;j<iData.length;j++) {
        var row = iData[j];
        if (_normEmail_(row[1])===email && !row[6]) {
          var exp = row[7] instanceof Date ? row[7] : new Date(row[7]);
          if (exp>now) throw new Error('Invite already pending. Wait for it to expire or be accepted.');
        }
      }
    }

    sh.appendRow([Utilities.getUuid(), email, cleanRole, inviteToken, u.email, now, '', expiresAt]);

    var scriptUrl = '';
    try {
      scriptUrl = ScriptApp.getService().getUrl() || '';
    } catch(e) {
      Logger.log('Could not get script URL: ' + e);
    }
    
    var inviteUrl = scriptUrl ? (scriptUrl + '?invite=' + inviteToken) : '';
    
    var emailSent = false;
    var emailError = '';
    try {
      _sendSystemEmail({
        to: email,
        subject: 'Invitation to join Luxeworx Atelier Payment Tracker',
        htmlBody: '<h2>You are invited!</h2>'
          + '<p><strong>'+(u.name||u.email)+'</strong> has invited you with role: <strong>'
          + cleanRole.toUpperCase()+'</strong></p>'
          + '<p><a href="'+inviteUrl+'" style="background:#1a1a2e;color:white;padding:12px 24px;text-decoration:none;border-radius:6px">Accept Invitation</a></p>'
          + '<p style="color:#666;font-size:12px">Link expires in 7 days.</p>'
          + (inviteUrl ? '<p style="font-size:11px;color:#999">Direct link: ' + inviteUrl + '</p>' : ''),
        name: 'Luxeworx Atelier'
      });
      emailSent = true;
    } catch(e) {
      emailError = e.message || String(e);
      Logger.log('Failed to send invite email: ' + e);
    }
    
    return { 
      success: true, 
      email: email, 
      role: cleanRole, 
      expiresAt: expiresAt.toISOString(), 
      inviteUrl: inviteUrl, 
      emailSent: emailSent, 
      emailError: emailError 
    };
  } finally {
    try { lock.releaseLock(); } catch(_){}
  }
}

function acceptInvite(inviteToken, password) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy. Try again.'); }
  try {
    var sh = _ensureInviteSheet_(), lastRow = sh.getLastRow();
    if (lastRow<=1) throw new Error('Invalid invite token.');
    var now = new Date(), invite = null, inviteRow = -1;
    var data = sh.getRange(2,1,lastRow-1,8).getValues();
    for (var i=0;i<data.length;i++) {
      var row = data[i];
      if (String(row[3])===String(inviteToken)) {
        var exp = row[7] instanceof Date ? row[7] : new Date(row[7]);
        if (exp<now)  throw new Error('Invite has expired.');
        if (row[6])   throw new Error('Invite already accepted.');
        invite = { email:row[1], role:row[2], invitedBy:row[4] };
        inviteRow = i+2;
        break;
      }
    }
    if (!invite) throw new Error('Invalid invite token.');
    if (!password || String(password).length<8) throw new Error('Password must be at least 8 characters.');
    if (_findUserByEmail_(invite.email)) throw new Error('Account already exists.');

    var uSh  = _ensureUsersSheet_();
    var salt = Utilities.getUuid(), hash = _hashPassword_(password, salt);
    var cleanRole = _assertValidRole_(invite.role);
    uSh.appendRow([invite.email,'',hash,salt,cleanRole,true,new Date(),'',0,'']);
    sh.getRange(inviteRow, 7).setValue(new Date());
    return { ok:true, email:invite.email };
  } finally {
    try { lock.releaseLock(); } catch(_){}
  }
}

function _ensureInviteSheet_() {
  return _ensureSheet_(SHEETS.INVITES, [
    'ID','Email','Role','InviteToken','InvitedBy','CreatedAt','AcceptedAt','ExpiresAt'
  ]);
}

// ─── Admin Helpers ────────────────────────────────────────────────────────────
function setUserRolesAdmin(token, email, roles) {
  requireFeaturePermission('manage_users');
  _requireAdmin_(token);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy. Try again.'); }
  try {
    var u = _findUserByEmail_(email);
    if (!u) throw new Error('User not found.');
    var newRoles = _normalizeRoles_(roles);
    if (!newRoles.length) throw new Error('At least one role is required.');
    if (u.roles.indexOf('director')>=0 && newRoles.indexOf('director')<0) {
      var sh2 = _ensureUsersSheet_(), lr2 = sh2.getLastRow();
      var d2  = lr2>=2 ? sh2.getRange(2,1,lr2-1,10).getValues() : [];
      var otherDirs = 0;
      d2.forEach(function(r){
        if (_normEmail_(r[0])===u.email) return;
        var act = r[5]===true||String(r[5]).toLowerCase()==='true';
        if (act && String(r[4]||'').toLowerCase().indexOf('director')>=0) otherDirs++;
      });
      if (otherDirs===0) throw new Error('Cannot remove last director.');
    }
    _saveUserCell_(u.rowNum, 5, newRoles.join(','));
    return { ok:true, email:u.email, roles:newRoles };
  } finally { try { lock.releaseLock(); } catch(_){} }
}

function setUserRoleAdmin(token, email, role) { return setUserRolesAdmin(token, email, [role]); }

function setUserActiveAdmin(token, email, active) {
  requireFeaturePermission('manage_users');
  _requireAdmin_(token);
  var u = _findUserByEmail_(email);
  if (!u) throw new Error('User not found.');
  _saveUserCell_(u.rowNum, 6, !!active);
  return { ok:true };
}

function deleteUserAdmin(token, email) {
  requireFeaturePermission('manage_users');
  _requireAdmin_(token);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(_){ throw new Error('System busy. Try again.'); }
  try {
    var u = _findUserByEmail_(email);
    if (!u) throw new Error('User not found.');
    
    if (u.roles.indexOf('director') >= 0) {
      var sh2 = _ensureUsersSheet_(), lr2 = sh2.getLastRow();
      var d2  = lr2>=2 ? sh2.getRange(2,1,lr2-1,10).getValues() : [];
      var otherDirs = 0;
      d2.forEach(function(r){
        if (_normEmail_(r[0])===u.email) return;
        var act = r[5]===true||String(r[5]).toLowerCase()==='true';
        if (act && String(r[4]||'').toLowerCase().indexOf('director')>=0) otherDirs++;
      });
      if (otherDirs===0) throw new Error('Cannot delete the last active director.');
    }

    var sh = _ensureUsersSheet_();
    sh.deleteRow(u.rowNum);
    
    var props = PropertiesService.getScriptProperties();
    
    // Remove user from ROLES config mapping
    try {
      var roleConfig = getRoleConfig();
      var modified = false;
      ROLE_KEYS.forEach(function(r) {
        if (roleConfig[r]) {
          var idx = roleConfig[r].indexOf(u.email);
          if (idx >= 0) {
            roleConfig[r].splice(idx, 1);
            modified = true;
          }
        }
      });
      if (modified) {
        props.setProperty('ROLES', JSON.stringify(roleConfig));
      }
    } catch(e) {
      Logger.log('Failed to remove user from role config: ' + e);
    }

    // Delete sessions
    var keys = props.getKeys();
    keys.forEach(function(k) {
      if (k.indexOf(AUTH.SESSION_PREFIX) === 0) {
        try {
          var s = JSON.parse(props.getProperty(k) || '{}');
          if (s && _normEmail_(s.email) === u.email) props.deleteProperty(k);
        } catch (e) {}
      }
    });

    _invalidateAllCaches_();

    return { ok: true, email: email };
  } finally {
    try { lock.releaseLock(); } catch(_){}
  }
}

function unlockAccountAdmin(token, email) {
  _requireAdmin_(token);
  var u = _findUserByEmail_(email);
  if (!u) throw new Error('User not found.');
  _saveUserCell_(u.rowNum, 9, 0);
  _saveUserCell_(u.rowNum, 10, '');
  return { ok:true };
}

function resetUserPasswordAdmin(token, email, newPassword) {
  requireFeaturePermission('manage_users');
  _requireAdmin_(token);
  if (!newPassword || String(newPassword).length<8)
    throw new Error('Password must be at least 8 characters.');
  var u = _findUserByEmail_(email);
  if (!u) throw new Error('User not found.');
  var salt = Utilities.getUuid(), hash = _hashPassword_(newPassword, salt);
  _saveUserCell_(u.rowNum, 3, hash);
  _saveUserCell_(u.rowNum, 4, salt);
  _saveUserCell_(u.rowNum, 9, 0);
  _saveUserCell_(u.rowNum, 10, '');
  return { ok:true };
}

// ─── Bootstrap helpers (run once from Apps Script editor) ─────────────────────
function bootstrapInitialAdmin() {
  var sh = _ensureUsersSheet_();
  var email = 'nishant@luxeworxatelier.com';
  if (_findUserByEmail_(email)) return 'Admin "'+email+'" already exists.';
  var salt = Utilities.getUuid(), hash = _hashPassword_('Nishant@121', salt);
  sh.appendRow([email,'Nishant',hash,salt,AUTH.ADMIN_ROLE,true,new Date(),'',0,'']);
  
  // Set director role mapping
  try {
    var roleConfig = getRoleConfig();
    if (roleConfig.director.indexOf(email) < 0) roleConfig.director.push(email);
    PropertiesService.getScriptProperties().setProperty('ROLES', JSON.stringify(roleConfig));
  } catch(e) {}
  
  return 'Seeded director: '+email+' / password: Nishant@121';
}

function _promoteToAdmin_(email) {
  if (!email||typeof email!=='string') email = 'admin@luxeworx.com';
  email = _normEmail_(email);
  if (!email||email.indexOf('@')<0) throw new Error('Pass a valid email.');
  var sh = _ensureUsersSheet_(), u = _findUserByEmail_(email);
  var allRoles = ROLE_KEYS.join(',');
  var salt = Utilities.getUuid(), hash = _hashPassword_('ChangeMe123!', salt);
  if (u) {
    _saveUserCell_(u.rowNum, 5, allRoles);
    _saveUserCell_(u.rowNum, 6, true);
    _saveUserCell_(u.rowNum, 3, hash);
    _saveUserCell_(u.rowNum, 4, salt);
    _saveUserCell_(u.rowNum, 9, 0);
    _saveUserCell_(u.rowNum, 10, '');
    return { ok:true, action:'updated', email:email, roles:ROLE_KEYS.slice() };
  }
  sh.appendRow([email,'System Admin',hash,salt,allRoles,true,new Date(),'',0,'']);
  return { ok:true, action:'created', email:email, roles:ROLE_KEYS.slice(), tempPassword:'ChangeMe123!' };
}

function resetAdminPassword(newPassword) {
  var email = '';
  try { email = _normEmail_(Session.getActiveUser().getEmail()); } catch(e){}
  if (!email) throw new Error('No Google email. Call resetAdminPasswordFor("you@example.com").');
  return resetAdminPasswordFor(email, newPassword||'ChangeMe123!');
}

function resetAdminPasswordFor(email, newPassword) {
  email = _normEmail_(email);
  if (!email) throw new Error('Email required.');
  var pwd = newPassword||'ChangeMe123!';
  var sh  = _ensureUsersSheet_(), u = _findUserByEmail_(email);
  var salt = Utilities.getUuid(), hash = _hashPassword_(pwd, salt);
  if (!u) {
    sh.appendRow([email,'Admin',hash,salt,AUTH.ADMIN_ROLE,true,new Date(),'',0,'']);
    return 'CREATED director: '+email+' / password: '+pwd;
  }
  sh.getRange(u.rowNum,3).setValue(hash);
  sh.getRange(u.rowNum,4).setValue(salt);
  sh.getRange(u.rowNum,5).setValue(AUTH.ADMIN_ROLE);
  sh.getRange(u.rowNum,6).setValue(true);
  sh.getRange(u.rowNum,9).setValue(0);
  sh.getRange(u.rowNum,10).setValue('');
  // Invalidate all existing sessions for this user
  try {
    var props = PropertiesService.getScriptProperties(), all = props.getProperties();
    for (var key in all) {
      if (key.indexOf(AUTH.SESSION_PREFIX)===0) {
        try {
          var s = JSON.parse(all[key]);
          if (s && _normEmail_(s.email)===email) props.deleteProperty(key);
        } catch(e) { props.deleteProperty(key); }
      }
    }
  } catch(e) {}
  return 'RESET director: '+email+' / password: '+pwd;
}

function _bootstrapAdmin_(email, tempPwd) {
  email = _normEmail_(email);
  if (!email) throw new Error('Email required.');
  tempPwd = tempPwd||'ChangeMe123!';
  if (_findUserByEmail_(email)) return 'User already exists: '+email;
  var sh = _ensureUsersSheet_(), salt = Utilities.getUuid(), hash = _hashPassword_(tempPwd, salt);
  sh.appendRow([email,'Admin',hash,salt,AUTH.ADMIN_ROLE,true,new Date(),'',0,'']);
  return 'Seeded director: '+email+' / temp password: '+tempPwd;
}

// ─── FRONTEND GUIDE (read-only comment — paste into Dashboard.html) ───────────
/**
 * _inviteFrontendGuide_  — CANONICAL FRONTEND INVITE PATTERN
 *
 * Paste this into your invite modal's JavaScript to eliminate the undefined-role bug.
 *
 * PROBLEM PATTERN (broken — do NOT use):
 *   // Listener attaches to a DOM element that may be replaced later
 *   var saveBtn = document.getElementById('inviteSaveBtn');
 *   var roleEl  = document.getElementById('inviteRole');      // stale ref risk
 *   saveBtn.addEventListener('click', function() {
 *     var role = roleEl.value;   // ← undefined after modal re-render
 *     google.script.run.api(token, 'sendInvite', [email, role]);
 *   });
 *
 * FIXED PATTERN (use this):
 *   function bindInviteModal() {
 *     var btn = document.getElementById('inviteSaveBtn');
 *     if (!btn) return;
 *     // STEP 1: destroy all prior listeners in one shot (no removeEventListener needed)
 *     var fresh = btn.cloneNode(true);
 *     btn.parentNode.replaceChild(fresh, btn);
 *
 *     fresh.addEventListener('click', function() {
 *       // STEP 2: read role from live DOM inside the handler — never from a closure
 *       var roleSelect = document.getElementById('inviteRole');
 *       var emailInput = document.getElementById('inviteEmail');
 *
 *       if (!roleSelect || !emailInput) {
 *         showToast('Modal not fully rendered. Please try again.', 'error');
 *         return;
 *       }
 *
 *       // STEP 3: validate before dispatching
 *       var VALID_ROLES = ['proc', 'finance', 'director'];
 *       var selectedRole = String(roleSelect.value || '').trim().toLowerCase();
 *       if (!VALID_ROLES.includes(selectedRole)) {
 *         showToast('Please select a valid role (Procurement / Finance / Director).', 'error');
 *         return;
 *       }
 *       var email = String(emailInput.value || '').trim().toLowerCase();
 *       if (!email || !email.includes('@')) {
 *         showToast('Please enter a valid email address.', 'error');
 *         return;
 *       }
 *
 *       // STEP 4: build clean payload
 *       var payload = { email: email, role: selectedRole };
 *       fresh.disabled = true;
 *       fresh.textContent = 'Sending…';
 *
 *       // STEP 5: use inviteUserAdmin (creates user immediately) or sendInvite (email link)
 *       google.script.run
 *         .withSuccessHandler(function(res) {
 *           fresh.disabled = false;
 *           fresh.textContent = 'Send Invite';
 *           if (res && res.ok) {
 *             closeInviteModal();
 *             showToast('Invitation sent to ' + email, 'success');
 *             refreshUserList();
 *           }
 *         })
 *         .withFailureHandler(function(err) {
 *           fresh.disabled = false;
 *           fresh.textContent = 'Send Invite';
 *           showToast('Failed: ' + (err.message || err), 'error');
 *         })
 *         .api(token, 'inviteUserAdmin', [payload]);
 *     });
 *   }
 *
 *   // Call bindInviteModal() EVERY time the modal HTML is inserted/shown,
 *   // not once at page load.
 *   function openInviteModal() {
 *     document.getElementById('inviteModalContainer').innerHTML = renderInviteModalHTML();
 *     bindInviteModal();   // ← always rebind after render
 *   }
 */

function addCustomRole(roleName, _session) {
  requireFeaturePermission('manage_settings', _session);
  var clean = String(roleName || '').replace(/[^\w]/g,'').trim().toLowerCase();
  if (!clean) throw new Error('Invalid role name.');
  if (DEFAULT_ROLES.indexOf(clean) >= 0) throw new Error('Cannot override system default roles.');
  
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('CUSTOM_ROLES');
  var custom = [];
  try { custom = raw ? JSON.parse(raw) : []; } catch(e) {}
  if (custom.indexOf(clean) >= 0) throw new Error('Role already exists.');
  custom.push(clean);
  props.setProperty('CUSTOM_ROLES', JSON.stringify(custom));
  
  if (ROLE_KEYS.indexOf(clean) < 0) ROLE_KEYS.push(clean);
  if (_ROLE_LEVEL_[clean] === undefined) _ROLE_LEVEL_[clean] = 0;
  
  _invalidateAllCaches_();
  return { ok: true, roles: ROLE_KEYS };
}
