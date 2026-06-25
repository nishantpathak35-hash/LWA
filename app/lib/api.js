import { queryAll, queryGet, queryRun } from './db.js';
import { sendInviteEmail, sendPaymentAdviceEmail, sendPOEmail } from './email.js';
import { getPOPaymentIneligibilityReason, isPOEligibleForPayment } from './poEligibility.js';
import { calculateProjectOutflowSnapshots, calculateProjectPaymentSummaryForRequest } from './paymentCalculations.js';
import { VendorService } from '../../src/modules/vendors/services/VendorService';
import { POService } from '../../src/modules/purchase-orders/services/POService';
import { PaymentService } from '../../src/modules/payments/services/PaymentService';
import { PaymentRepository } from '../../src/modules/payments/repositories/PaymentRepository';
import { AuthService } from '../../src/modules/core/services/AuthService';
import { SettingsService } from '../../src/modules/core/services/SettingsService';
import { AuditService } from '../../src/modules/core/services/AuditService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
  }
  return secret;
}

function invalidateProjectCache(project) {
  return project;
}

const settingsCache = new Map();

// Promise singleton: all concurrent callers await the same migration run.
// A boolean flag is not concurrent-safe — two simultaneous requests would both
// run the expensive v3 backfill before either sets the flag to true.
let _settingsTablePromise = null;

function encryptToken(data) {
  const JWT_SECRET = getJwtSecret();
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
}

function decryptToken(token) {
  const JWT_SECRET = getJwtSecret();
  try {
    const key = Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0'));
    if (token && token.length >= 32) {
      try {
        const ivHex = token.slice(0, 32);
        const ciphertext = token.slice(32);
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
      } catch (err) {
        // Fall back to legacy format
      }
    }
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    throw new Error('Invalid token');
  }
}

function requireAuth(session) {
  AuthService.requireAuth(session);
}

export async function logAudit(user, actionType, details, department) {
  return AuditService.log(user, actionType, details, department);
}

function requireAdminConsole(session) {
  AuthService.requireAdminConsole(session);
}

function normalizeRoleName(role) {
  return AuthService.normalizeRoleName(role);
}

async function ensureSettingsTable() {
  // Return the existing promise so all concurrent callers share one migration run.
  if (_settingsTablePromise) return _settingsTablePromise;
  _settingsTablePromise = _runMigrations();
  return _settingsTablePromise;
}

async function _runMigrations() {

  await queryRun(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Ensure all required columns exist (idempotent)
  const poColumns = [
    'terms', 'approval_status', 'submitted_by', 'submitted_at',
    'approved_by', 'approved_at', 'approval_remarks',
    'tds_section', 'tds_pct', 'tds_amount', 'gst_total', 'gst_mode',
    'expected_delivery_date', 'notes', 'payment_status', 'category'
  ];
  const poItemColumns = ['unit'];
  const prColumns = ['remittance_ref', 'remittance_date', 'tds_amount', 'tds_percentage', 'tds_section', 'approved_amount'];

  await Promise.allSettled([
    ...poColumns.map(col => queryRun(`ALTER TABLE purchase_orders ADD COLUMN ${col} TEXT`)),
    ...poItemColumns.map(col => queryRun(`ALTER TABLE po_items ADD COLUMN ${col} TEXT`)),
    ...prColumns.map(col => queryRun(`ALTER TABLE payment_requests ADD COLUMN ${col} TEXT`))
  ]);
  // PO approval history table
  await queryRun(`
    CREATE TABLE IF NOT EXISTS po_approval_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_no TEXT NOT NULL,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      remarks TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Manual / system payments table — unified source of truth for all PO payments
  await queryRun(`
    CREATE TABLE IF NOT EXISTS manual_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_no TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Bank Transfer',
      utr_ref TEXT,
      bank_name TEXT,
      reference_no TEXT,
      remarks TEXT,
      payment_type TEXT DEFAULT 'manual',
      recorded_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Data recovery: restore po_date for any PO where it was accidentally wiped ──
  try {
    await queryRun(`
      UPDATE purchase_orders
      SET po_date = CASE
        WHEN created_at IS NOT NULL AND created_at != ''
          THEN substr(created_at, 1, 10)
        ELSE date('now')
      END
      WHERE (po_date IS NULL OR po_date = '')
    `);
  } catch (e) {
    console.error('po_date recovery migration failed (non-fatal):', e.message);
  }

  // ── CRITICAL MIGRATION v3: Backfill orphan PRs + recalculate all paid amounts ──
  // Step 1: Insert system_payments rows for any remitted PRs that don't have one
  //         (historical remittances before the mirroring logic was added).
  // Step 2: Recalculate legacy_paid for every PO using SUM(system_payments.amount)
  //         as the single source of truth — no more two-leg double-counting.
  try {
    const migKey = 'legacy_paid_recalc_v3';
    const alreadyRan = await queryGet(`SELECT value FROM app_settings WHERE key = ?`, [migKey]);
    if (!alreadyRan) {
      // Step 1: Backfill orphan remitted PRs into system_payments
      const orphanPRs = await queryAll(
        `SELECT pr.pr_id, pr.po_no, pr.amount_requested, pr.approved_amount, pr.tds_amount, pr.remittance_date
         FROM payment_requests pr
         WHERE (pr.stage = 'Remitted' OR pr.remittance = 'Remitted')
           AND CAST(pr.pr_id AS TEXT) NOT IN (
             SELECT pr_key FROM system_payments
             WHERE pr_key IS NOT NULL AND pr_key NOT LIKE 'MANUAL-%'
           )`
      );
      for (const pr of orphanPRs) {
        const paidAmt = Math.max(0, (Number(pr.approved_amount ?? pr.amount_requested) || 0) - (Number(pr.tds_amount) || 0));
        await queryRun(
          `INSERT OR IGNORE INTO system_payments (po_no, pr_key, amount, remitted_by, created_at) VALUES (?, ?, ?, ?, ?)`,
          [pr.po_no, String(pr.pr_id), paidAmt, 'migration-v3', pr.remittance_date || new Date().toISOString()]
        );
      }
      console.log(`[Migration v3] Backfilled ${orphanPRs.length} orphan remitted PRs into system_payments`);

      // Step 2: Recalculate all legacy_paid from system_payments.amount (single source)
      const allPOs = await queryAll(`SELECT po_no, po_value, revised_po_value FROM purchase_orders`);
      for (const po of allPOs) {
        const sysRow = await queryGet(
          `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total FROM system_payments WHERE po_no = ?`,
          [po.po_no]
        );
        const totalPaid = Number(sysRow?.total) || 0;
        const poVal = Number(po.revised_po_value || po.po_value || 0);
        const outstanding = Math.max(0, poVal - totalPaid);
        let paymentStatus = 'Unpaid';
        if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
        else if (totalPaid > 0) paymentStatus = 'Partially Paid';
        await queryRun(
          `UPDATE purchase_orders SET legacy_paid=?, final_payable=?, payment_status=? WHERE po_no=?`,
          [totalPaid, outstanding, paymentStatus, po.po_no]
        );
      }
      await queryRun(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
        [migKey, new Date().toISOString(), new Date().toISOString()]
      );
      console.log(`[Migration v3] Recalculated legacy_paid for ${allPOs.length} POs — single source of truth`);
    }
  } catch (e) {
    console.error('legacy_paid_recalc_v3 migration failed (non-fatal):', e.message);
  }

  // Migration complete — promise remains cached so future calls are instant no-ops.
}

async function getSetting(key, fallback = '') {
  if (settingsCache.has(key)) {
    return settingsCache.get(key);
  }
  let value = fallback;
  try {
    const row = await queryGet(`SELECT value FROM app_settings WHERE key = ?`, [key]);
    value = row?.value ?? fallback;
  } catch {
    value = fallback;
  }
  settingsCache.set(key, value);
  return value;
}

async function setSetting(key, value) {
  await ensureSettingsTable();
  await queryRun(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, new Date().toISOString()]
  );
  settingsCache.set(key, value);
}


// --- AUTH ---
export async function loginUser(email, password, meta = {}) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  const normEmail = String(email).trim().toLowerCase();
  const user = await queryGet(`SELECT * FROM users WHERE LOWER(email) = ?`, [normEmail]);
  if (!user) {
    throw new Error('Invalid credentials');
  }
  if (!user.active) {
    throw new Error('Account is inactive');
  }

  // Lazy initialize admin/invite password if password_hash is not yet set
  if (!user.password_hash) {
    if (user.invite_token) {
      throw new Error('Please accept the invitation email to set your password before logging in');
    }
    const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
    await queryRun(`UPDATE users SET password_hash = ? WHERE LOWER(email) = ?`, [hash, normEmail]);
    user.password_hash = hash;
  }

  let isValid = false;
  const storedHash = user.password_hash;
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    isValid = bcrypt.compareSync(password, storedHash);
  } else {
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    if (storedHash === legacyHash || storedHash === password) {
      isValid = true;
      const newBcryptHash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
      await queryRun(`UPDATE users SET password_hash = ? WHERE LOWER(email) = ?`, [newBcryptHash, normEmail]);
      user.password_hash = newBcryptHash;
    }
  }

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Clear invite token upon successful login if still present
  if (user.invite_token) {
    await queryRun(`UPDATE users SET invite_token = NULL WHERE LOWER(email) = ?`, [normEmail]);
  }

  // Update last login timestamp and meta
  const loginTimestamp = new Date().toISOString();
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login TEXT`); } catch (e) { /* column already exists */ }
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login_ip TEXT`); } catch (e) { /* column already exists */ }
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login_device TEXT`); } catch (e) { /* column already exists */ }
  
  await queryRun(
    `UPDATE users SET last_login = ?, last_login_ip = ?, last_login_device = ? WHERE LOWER(email) = ?`, 
    [loginTimestamp, meta.ip || null, meta.ua || null, normEmail]
  );

  // Log audit entry for login
  await logAudit(user.email, 'Login', `User logged in`, 'Auth');

  const tokenPayload = {
    email: user.email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  const token = encryptToken(tokenPayload);

  return { token };
}

export async function getMySession(token) {
  if (!token) throw new Error('AUTH:No token provided');
  
  try {
    const payload = decryptToken(token);
    if (payload.exp < Date.now()) {
      throw new Error('AUTH:Token expired');
    }
    
    const user = await queryGet(`SELECT * FROM users WHERE email = ?`, [payload.email]);
    if (!user) {
      throw new Error('AUTH:User not found');
    }
    if (!user.active) {
      throw new Error('AUTH:User inactive');
    }

    const rawRoles = JSON.parse(user.roles || '[]');
    const isSuperAdmin = user.email === 'admin@luxeworx.com';
    const roles = isSuperAdmin ? Array.from(new Set([...rawRoles, 'admin', 'director', 'finance', 'procurement', 'proc', 'accountant', 'maker'])) : rawRoles;

    return {
      email: user.email,
      name: user.name || user.email,
      roles: roles,
      active: true
    };
  } catch (e) {
    console.error('getMySession validation failed:', e);
    throw new Error('AUTH:Invalid or expired token');
  }
}

export async function getBootData(session) {
  requireAuth(session);
  return {
    user: session
  };
}

export async function getBootBundle(session) {
  requireAuth(session);
  // Ensure schema migrations (e.g. approved_amount column) run BEFORE parallel queries
  await ensureSettingsTable();
  const [kpis, master, payments, featurePermissions] = await Promise.all([
    getDashboardKPIs(session),
    getMasterData(session),
    listPaymentRequests(undefined, session),
    getFeaturePermissions(session)
  ]);
  
  return {
    user: session,
    session,
    kpis,
    master,
    payments,
    featurePermissions
  };
}

export async function clearCacheAndGetMaster(session) {
  requireAuth(session);
  return getMasterData(session);
}

// --- DASHBOARD ---
export async function getDashboardKPIs(session) {
  requireAuth(session);

  const [poResult, prResult, outflowRow, pendingRow] = await Promise.all([
    queryAll(`SELECT po_no, po_value FROM purchase_orders`),
    queryAll(`SELECT pr_id, amount_requested, approved_amount, tds_amount, stage, remittance FROM payment_requests`),
    // Authoritative total outflow — same logic as calculateProjectOutflowSnapshots:
    // system_payments linked to a PR → use net PR amount (after TDS); else use raw sp.amount
    queryGet(
      `SELECT COALESCE(SUM(
         CASE
           WHEN pr.pr_id IS NOT NULL
             THEN CASE WHEN COALESCE(pr.approved_amount, pr.amount_requested,0) - COALESCE(pr.tds_amount,0) < 0 THEN 0
                       ELSE COALESCE(pr.approved_amount, pr.amount_requested,0) - COALESCE(pr.tds_amount,0) END
           ELSE COALESCE(sp.amount, 0)
         END
       ), 0) AS total
       FROM system_payments sp
       LEFT JOIN payment_requests pr ON CAST(pr.pr_id AS TEXT) = CAST(sp.pr_key AS TEXT)`
    ),
    // Pending: non-remitted, non-rejected, non-cancelled payment requests
    queryGet(
      `SELECT COALESCE(SUM(COALESCE(approved_amount, amount_requested, 0)), 0) AS total
       FROM payment_requests
       WHERE LOWER(COALESCE(stage,'')) NOT LIKE '%remit%'
         AND LOWER(COALESCE(stage,'')) NOT LIKE '%reject%'
         AND LOWER(COALESCE(stage,'')) NOT LIKE '%cancel%'
         AND LOWER(COALESCE(remittance,'')) NOT LIKE '%remit%'`
    )
  ]);

  let totalPOValue = 0;
  poResult.forEach(p => { totalPOValue += Number(p.po_value) || 0; });

  const totalPaid   = Number(outflowRow?.total) || 0;
  const pendingApproval = Number(pendingRow?.total) || 0;

  // Payment stage breakdown for the pipeline chart
  const stageMap = { pendingProc: 0, pendingFinance: 0, pendingDirector: 0, readyToRemit: 0, remitted: 0, rejected: 0 };
  prResult.forEach(pr => {
    const stage = String(pr.stage || '').trim().toLowerCase();
    const amt = Number(pr.approved_amount ?? pr.amount_requested) || 0;
    if (stage.includes('remit')) stageMap.remitted += amt;
    else if (stage.includes('ready')) stageMap.readyToRemit += amt;
    else if (stage.includes('director')) stageMap.pendingDirector += amt;
    else if (stage.includes('finance')) stageMap.pendingFinance += amt;
    else if (stage.includes('reject') || stage.includes('cancel')) stageMap.rejected += amt;
    else stageMap.pendingProc += amt;
  });

  return {
    pos: poResult.length,
    prs: prResult.length,
    totalPOValue,
    totalPaid,
    pendingRemit: stageMap.readyToRemit,
    pendingApproval,
    payments: {
      total: prResult.length,
      pendingProc:    stageMap.pendingProc,
      pendingFinance: stageMap.pendingFinance,
      pendingDirector: stageMap.pendingDirector,
      readyToRemit:   stageMap.readyToRemit,
      remitted:       stageMap.remitted,
      rejected:       stageMap.rejected,
      sumPending:     pendingApproval,
      sumRemitted:    totalPaid
    }
  };
}

export async function getMasterData(session) {
  requireAuth(session);
  const vendors = await VendorService.getAllVendors();
  const pos = await POService.getAllPOs();
  
  // Extract unique projects and vendors from POs
  const projectSet = new Set();
  const poVendorMap = {};
  
  pos.forEach(p => { 
    if (p.project) projectSet.add(p.project); 
    if (p.vendor_name && p.vendor_name !== 'Unknown' && !poVendorMap[p.vendor_name]) {
      poVendorMap[p.vendor_name] = {
        code: p.vendor_key || '',
        vendorId: p.vendor_key || '',
        name: p.vendor_name,
        legalName: p.vendor_name,
        status: 'Active'
      };
    }
  });

  try {
    const pfRows = await queryAll(`SELECT project FROM project_financials`);
    pfRows.forEach(r => {
      if (r.project) projectSet.add(r.project);
    });
  } catch (e) { /* table might not exist yet */ }

  const masterVendors = vendors.map(v => ({ 
    recordId: v.id,
    code: v.vendor_code,
    vendorId: v.vendor_code, 
    name: v.legal_name || v.name || v.vendor_code, 
    legalName: v.legal_name || v.name || v.vendor_code, 
    status: v.status,
    gstin: v.gstin || '',
    address: v.address || ''
  }));
  
  masterVendors.forEach(v => {
    if (v.name) poVendorMap[v.name] = v;
  });

  return {
    vendors: Object.values(poVendorMap),
    projects: Array.from(projectSet).map(p => ({ name: p })),
    pos: pos.map(p => ({ 
      po_no: p.po_no, 
      vendor_key: p.vendor_key, 
      vendor_name: p.vendor_name, 
      project: p.project, 
      po_date: p.po_date || '',
      expected_delivery_date: p.expected_delivery_date || '',
      category: p.category || '',
      po_value: p.po_value, 
      paid: p.legacy_paid || 0,
      balance: (Number(p.po_value) || 0) - (Number(p.legacy_paid) || 0),
      status: p.approval_status || p.status || 'Draft',
      approval_status: p.approval_status || p.status || 'Draft',
      payment_eligible: isPOEligibleForPayment(p),
      terms: p.terms || '',
      tds_section: p.tds_section || '',
      tds_pct: Number(p.tds_pct) || 0,
      tds_amount: Number(p.tds_amount) || 0,
      gst_total: Number(p.gst_total) || 0,
      gst_mode: p.gst_mode || 'inter'
    })),
    categories: ['Goods', 'Services', 'Consulting', 'IT', 'Marketing', 'Admin', 'Capex', 'Opex', 'Other']
  };
}

// ── Financial Diagnostics: raw DB audit per project ─────────────────────────
export async function getFinancialDiagnostics(session) {
  requireAuth(session);
  const [spRows, prRows, poRows, mpRows] = await Promise.all([
    queryAll(
      `SELECT po.project,
              COUNT(sp.id) AS payment_count,
              COALESCE(SUM(sp.amount),0) AS sp_total_amount
       FROM system_payments sp
       JOIN purchase_orders po ON po.po_no = sp.po_no
       GROUP BY po.project ORDER BY sp_total_amount DESC`
    ),
    queryAll(
      `SELECT po.project,
              COUNT(pr.pr_id) AS pr_count,
              COALESCE(SUM(COALESCE(pr.approved_amount, pr.amount_requested)),0) AS pr_gross,
              COALESCE(SUM(COALESCE(pr.approved_amount, pr.amount_requested,0)-COALESCE(pr.tds_amount,0)),0) AS pr_net
       FROM payment_requests pr
       JOIN purchase_orders po ON po.po_no = pr.po_no
       WHERE (pr.stage='Remitted' OR pr.remittance='Remitted')
       GROUP BY po.project ORDER BY pr_gross DESC`
    ),
    queryAll(
      `SELECT project,
              COALESCE(SUM(po_value),0) AS po_value_total,
              COALESCE(SUM(legacy_paid),0) AS legacy_paid_total
       FROM purchase_orders WHERE project IS NOT NULL AND project != ''
       GROUP BY project ORDER BY legacy_paid_total DESC`
    ),
    // manual_payments count & sum per project
    queryAll(
      `SELECT po.project,
              COUNT(mp.id) AS mp_count,
              COALESCE(SUM(mp.amount),0) AS mp_total
       FROM manual_payments mp
       JOIN purchase_orders po ON po.po_no = mp.po_no
       GROUP BY po.project ORDER BY mp_total DESC`
    )
  ]);

  const projects = {};
  for (const r of spRows)  { projects[r.project] = { project: r.project, sp_count: r.payment_count, sp_amount: r.sp_total_amount, pr_count:0, pr_net:0, legacy_paid:0, po_value:0, mp_count:0, mp_amount:0 }; }
  for (const r of prRows)  { if (!projects[r.project]) projects[r.project] = { project:r.project, sp_count:0, sp_amount:0, mp_count:0, mp_amount:0 }; projects[r.project].pr_count=r.pr_count; projects[r.project].pr_net=r.pr_net; }
  for (const r of poRows)  { if (!projects[r.project]) projects[r.project] = { project:r.project, sp_count:0, sp_amount:0, mp_count:0, mp_amount:0 }; projects[r.project].legacy_paid=r.legacy_paid_total; projects[r.project].po_value=r.po_value_total; }
  for (const r of mpRows)  { if (!projects[r.project]) projects[r.project] = { project:r.project, sp_count:0, sp_amount:0, mp_count:0, mp_amount:0 }; projects[r.project].mp_count=r.mp_count; projects[r.project].mp_amount=r.mp_total; }

  return Object.values(projects).map(p => ({
    project: p.project,
    sp_count: p.sp_count || 0,
    sp_amount: p.sp_amount || 0,        // → current dashboard value
    mp_count: p.mp_count || 0,          // manual_payments rows
    mp_amount: p.mp_amount || 0,        // manual_payments total
    pr_net: p.pr_net || 0,
    legacy_paid: p.legacy_paid || 0,    // → export value
    sp_vs_mp_ratio: p.mp_amount > 0 ? ((p.sp_amount||0)/p.mp_amount).toFixed(3) : 'N/A',
    sp_vs_legacy_ratio: p.legacy_paid > 0 ? ((p.sp_amount||0)/p.legacy_paid).toFixed(3) : 'N/A'
  }));
}

export async function getSystemPaymentsDetail(project, session) {
  requireAuth(session);
  const rows = await queryAll(
    `SELECT sp.id, sp.po_no, sp.pr_key, sp.amount, sp.remitted_by, sp.created_at
     FROM system_payments sp
     JOIN purchase_orders po ON po.po_no = sp.po_no
     WHERE po.project LIKE ?
     ORDER BY sp.po_no, sp.pr_key, sp.id`,
    [`%${project || ''}%`]
  );
  const keyCount = {};
  for (const r of rows) {
    const k = `${r.po_no}|${r.pr_key}`;
    keyCount[k] = (keyCount[k] || 0) + 1;
  }
  return rows.map(r => ({
    id: r.id, po_no: r.po_no, pr_key: r.pr_key,
    amount: r.amount, remitted_by: r.remitted_by, created_at: r.created_at,
    is_duplicate: keyCount[`${r.po_no}|${r.pr_key}`] > 1
  }));
}

export async function deduplicateSystemPayments(session) {
  requireAuth(session);
  await ensureSettingsTable();
  const dupes = await queryAll(
    `SELECT po_no, pr_key, COUNT(*) as cnt, MIN(id) as keep_id
     FROM system_payments
     GROUP BY po_no, pr_key
     HAVING COUNT(*) > 1`
  );
  let deletedCount = 0;
  for (const d of dupes) {
    if (d.pr_key === null) {
      const res = await queryRun(
        `DELETE FROM system_payments WHERE po_no = ? AND pr_key IS NULL AND id != ?`,
        [d.po_no, d.keep_id]
      );
      deletedCount += (d.cnt - 1);
    } else {
      const res = await queryRun(
        `DELETE FROM system_payments WHERE po_no = ? AND pr_key = ? AND id != ?`,
        [d.po_no, d.pr_key, d.keep_id]
      );
      deletedCount += (d.cnt - 1);
    }
  }
  const affectedPOs = [...new Set(dupes.map(d => d.po_no))];
  for (const poNo of affectedPOs) {
    await updatePOPaymentStatus(poNo);
  }
  return {
    ok: true, duplicateGroups: dupes.length, rowsDeleted: deletedCount,
    posRecalculated: affectedPOs.length,
    summary: dupes.slice(0, 20).map(d => ({ po_no: d.po_no, pr_key: d.pr_key, dupeCount: d.cnt }))
  };
}

export async function getProjectDetails(session) {
  requireAuth(session);
  const [pos, outflowSnapshots] = await Promise.all([
    queryAll(`SELECT * FROM purchase_orders`),
    calculateProjectOutflowSnapshots()
  ]);

  const projectsMap = {};

  pos.forEach(po => {
    const name = po.project;
    if (!name) return;
    if (!projectsMap[name]) {
      projectsMap[name] = {
        project: name,
        name: name,
        projectValue: 0,
        inflow: 0,
        pendingInflow: 0,
        invoiceValue: 0,
        pendingInvoice: 0,
        bcs: 0,
        plannedGM: 0,
        plannedGMPct: 0,
        poIssued: 0,
        actualGM: 0,
        actualGMPct: 0,
        pendingOutflow: 0,
        balanceAvailable: 0,
        outflowLimit: 0,
        outflow: 0,
        vendorInvoiceBooked: 0,
        tds: 0
      };
    }
    const val = Number(po.po_value) || 0;
    projectsMap[name].poIssued += val;
    projectsMap[name].projectValue += val;
  });

  // Apply outflow AFTER all POs are summed so pendingOutflow is correct
  Object.keys(projectsMap).forEach(name => {
    const projectOutflow = Number(outflowSnapshots[name]?.outflow) || 0;
    projectsMap[name].outflow = projectOutflow;
    projectsMap[name].pendingOutflow = Math.max(0, projectsMap[name].poIssued - projectOutflow);
  });

  try {
    await queryRun(`
      CREATE TABLE IF NOT EXISTS project_financials (
        project TEXT PRIMARY KEY,
        project_value REAL DEFAULT 0,
        bcs REAL DEFAULT 0,
        inflow REAL DEFAULT 0,
        invoice_value REAL DEFAULT 0,
        tds REAL DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const overrides = await queryAll(`SELECT * FROM project_financials`);
    overrides.forEach(row => {
      const name = row.project;
      if (!name) return;
      if (!projectsMap[name]) {
        projectsMap[name] = {
          project: name,
          name,
          projectValue: 0,
          inflow: 0,
          pendingInflow: 0,
          invoiceValue: 0,
          pendingInvoice: 0,
          bcs: 0,
          plannedGM: 0,
          plannedGMPct: 0,
          poIssued: 0,
          actualGM: 0,
          actualGMPct: 0,
          pendingOutflow: 0,
          balanceAvailable: 0,
          outflowLimit: 0,
          outflow: 0,
          vendorInvoiceBooked: 0,
          tds: 0
        };
      }
      const projectValue = Number(row.project_value) || projectsMap[name].projectValue;
      const bcs = Number(row.bcs) || 0;
      const inflow = Number(row.inflow) || 0;
      const invoiceValue = Number(row.invoice_value) || 0;
      const tds = Number(row.tds) || 0;
      const outflow = Number(projectsMap[name].outflow) || 0;
      projectsMap[name] = {
        ...projectsMap[name],
        projectValue,
        bcs,
        inflow,
        invoiceValue,
        tds,
        pendingInflow: Math.max(0, projectValue - inflow),
        plannedGM: projectValue - bcs,
        plannedGMPct: projectValue ? (projectValue - bcs) / projectValue : 0,
        actualGM: inflow - outflow - tds,
        actualGMPct: inflow ? (inflow - outflow - tds) / inflow : 0,
        balanceAvailable: inflow - outflow - tds
      };
    });
  } catch (e) {
    console.error('Failed to apply project financial overrides:', e.message);
  }

  return Object.values(projectsMap).map(p => ({
    ...p,
    // Ensure outflow is always explicitly present for dashboard display
    outflow: Number(p.outflow) || 0
  }));
}

export async function addVendor(payload, session) {
  requireAuth(session);
  return VendorService.addVendor(payload, session?.email || 'admin@luxeworx.com');
}

export async function updateVendor(payload, session) {
  requireAuth(session);
  return VendorService.updateVendor(payload, session?.email || 'admin@luxeworx.com');
}

export async function getVendorByName(name, session) {
  requireAuth(session);
  const row = await queryGet(`SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?`, [name, name]);
  if (!row) return null;
  return {
    vendorId: row.vendor_code || '',
    legalName: row.legal_name || '',
    tradeName: row.trade_name || '',
    gstin: row.gstin || '',
    pan: row.pan || '',
    status: row.status || 'Active',
    address: row.address || '',
    stateCode: '',
    vendorType: row.vendor_type || '',
    email: row.email || '',
    mobile: '',
    bankName: '',
    bankBranch: '',
    accountNo: row.bank_account || '',
    ifsc: row.ifsc || ''
  };
}

export async function getVendorSummary(vendor = '', session) {
  requireAuth(session);
  let sql = `SELECT * FROM vendors`;
  let params = [];
  if (vendor) {
    sql += ` WHERE vendor_code = ? OR legal_name = ?`;
    params = [vendor, vendor];
  }
  const rows = await queryAll(sql, params);
  
  // Also get vendors from POs if they aren't in the vendors table
  const pos = await queryAll(`SELECT vendor_key, vendor_name FROM purchase_orders`);
  const poVendorMap = {};
  pos.forEach(p => {
    if (p.vendor_name) {
      poVendorMap[p.vendor_name] = {
        code: p.vendor_key || '-',
        vendor: p.vendor_name,
        status: 'Active',
        pan: '',
        gstin: ''
      };
    }
  });
  
  rows.forEach(r => {
    const name = r.legal_name || r.name || '';
    if (!name) return; // skip rows with no name
    poVendorMap[name] = {
      code: r.vendor_code || '',
      vendor: name,
      status: r.status || 'Active',
      pan: r.pan || '',
      gstin: r.gstin || '',
      address: r.address || '',
      email: r.email || ''
    };
  });
  
  return Object.values(poVendorMap);
}

export async function listPOsJson(filters = {}, session) {
  requireAuth(session);
  const rows = await queryAll(`SELECT * FROM purchase_orders ORDER BY date(COALESCE(po_date, '1900-01-01')) DESC, po_no DESC`);
  const results = rows.map(r => {
    const val = Number(r.po_value) || 0;
    const pd = Number(r.legacy_paid) || 0;
    return {
      poNo: r.po_no,
      vendor: r.vendor_name,
      project: r.project,
      poValue: val,
      revisedPOValue: val,
      status: r.status,
      poDate: r.po_date,
      amountPaid: pd,
      finalPayables: val - pd
    };
  });
  return JSON.stringify(results);
}

export async function getPOsByVendor(vendor, session) {
  requireAuth(session);
  let sql = `SELECT * FROM purchase_orders`;
  let params = [];
  if (vendor) {
    sql += ` WHERE vendor_key = ? OR vendor_name = ?`;
    params = [vendor, vendor];
  }
  sql += ` ORDER BY date(COALESCE(po_date, '1900-01-01')) DESC, po_no DESC`;
  const rows = await queryAll(sql, params);
  return rows.map(r => ({
    poNo: r.po_no,
    project: r.project,
    vendorCode: r.vendor_key,
    vendor: r.vendor_name,
    category: '',
    status: r.approval_status || r.status,
    approvalStatus: r.approval_status || r.status,
    paymentEligible: isPOEligibleForPayment(r),
    poValue: r.po_value,
    paid: r.legacy_paid,
    balance: Number(r.po_value) - Number(r.legacy_paid)
  }));
}

function getPRStatus(stage, remittance) {
  if (String(remittance || '').toLowerCase().includes('remitted') || String(stage || '').toLowerCase().includes('remitted')) {
    return 'approved';
  }
  if (String(stage || '').toLowerCase().includes('rejected')) {
    return 'rejected';
  }
  if (String(stage || '').toLowerCase().includes('ready to remit')) {
    return 'approved';
  }
  return 'pending';
}

export async function listPaymentRequests(filters = {}, session) {
  requireAuth(session);
  const query = `
    SELECT 
      pr.*,
      COALESCE(v.legal_name, po.vendor_name) as joined_vendor_name,
      po.project as po_project,
      po.category as po_category
    FROM payment_requests pr
    LEFT JOIN purchase_orders po ON pr.po_no = po.po_no
    LEFT JOIN vendors v ON (v.vendor_code = pr.vendor_code OR v.legal_name = po.vendor_name)
  `;
  const rows = await queryAll(query);

  return rows.map(r => {
    const stage = r.stage || 'Pending Procurement';
    const status = getPRStatus(stage, r.remittance);
    const gross = Number((r.approved_amount ?? r.amount_requested) || 0);
    const tds = Number(r.tds_amount || 0);
    const net = gross - tds;

    let vName = r.vendor_name;
    if (!vName || vName === 'Unknown') {
      vName = r.joined_vendor_name || 'Unknown';
    }

    return {
      id: r.pr_id,
      sNo: r.pr_id,
      pr_id: r.pr_id,
      rowNumber: r.pr_id,
      poNo: r.po_no,
      po_no: r.po_no,
      po_number: r.po_no,
      vendor: vName,
      vendor_name: vName,
      project: r.project || r.po_project,
      project_name: r.project || r.po_project,
      category: r.category || r.po_category || '',
      amountRequested: r.amount_requested,
      gross_amount: gross,
      amount_requested: r.amount_requested,
      approved_amount: r.approved_amount,
      tds_amount: tds,
      tds_percentage: r.tds_percentage || 0,
      tds_section: r.tds_section || '',
      net_payment_amount: net,
      net_amount: net,
      stage: stage,
      approval_stage: stage,
      status: status,
      approval_status: status,
      can_send_payment_advice: String(stage || '').toLowerCase() === 'remitted' || String(r.remittance || '').toLowerCase() === 'remitted',
      remittance: r.remittance || '',
      created_at: r.created_at,
      remarks: r.remarks || '',
      created_by: r.created_by || '',
      vendor_code: r.vendor_code || ''
    };
  });
}

export async function getApprovalQueue(filters = {}, session) {
  requireAuth(session);
  const roles = session?.roles || ['director', 'admin', 'finance', 'procurement', 'proc'];
  const all = await listPaymentRequests(filters, session);
  return all.filter(r => {
    const stage = r.stage || 'Pending Procurement';
    if ((roles.includes('procurement') || roles.includes('proc')) && stage === 'Pending Procurement') return true;
    if (roles.includes('finance') && stage === 'Pending Finance') return true;
    if (roles.includes('director') && stage === 'Pending Director') return true;
    return false;
  });
}

export async function getRemittanceQueue(filters = {}, session) {
  requireAuth(session);
  const all = await listPaymentRequests(filters, session);
  return all.filter(r => r.stage === 'Ready to Remit');
}

// --- ADMIN / SYSTEM ---
export async function getCommandCenter(session) {
  requireAuth(session);
  return { status: 'OK' };
}

export async function getMasterHealth(session) {
  requireAuth(session);
  return { status: 'OK' };
}

export async function savePO(payload, session) {
  requireAuth(session);
  return POService.createPO(payload, session?.email || 'admin@luxeworx.com');
}

export async function updatePOFull(poNo, payload, session) {
  requireAuth(session);
  // Determine if financial fields changed (requires re-approval)
  const existingStatus = String(existing?.approval_status || existing?.status || 'Draft').toLowerCase();
  const financiallyChanged = existing && (
    Math.abs(Number(existing.po_value) - totalVal) > 0.5 ||
    existing.vendor_name !== vendorName
  );
  // If approved PO has financial changes, demote back to Draft
  const newStatus = (existingStatus === 'approved' && financiallyChanged) ? 'Draft' : (existing ? (existing.approval_status || existing.status) : 'Draft');

  // Build audit diff
  const auditChanges = [];
  const trackFields = [
    ['po_no', 'PO Number', nextPoNo],
    ['vendor_name', 'Vendor', vendorName],
    ['project', 'Project', payload.project || ''],
    ['po_value', 'PO Value', totalVal],
    ['po_date', 'PO Date', payload.poDate || ''],
    ['terms', 'Terms', payload.terms || ''],
    ['expected_delivery_date', 'Expected Delivery', payload.expectedDeliveryDate || ''],
    ['notes', 'Notes', payload.notes || ''],
    ['tds_section', 'TDS Section', tdsSection],
    ['tds_pct', 'TDS %', tdsPct],
  ];
  if (existing) {
    for (const [field, label, newVal] of trackFields) {
      const oldVal = String(existing[field] ?? '');
      if (oldVal !== String(newVal)) {
        auditChanges.push(`${label}: "${oldVal}" → "${newVal}"`);
      }
    }
  }

  await queryRun(
    `UPDATE purchase_orders SET
      po_no = ?, vendor_key = ?, vendor_name = ?, project = ?, po_value = ?, revised_po_value = ?, po_date = ?, terms = ?,
      approval_status = ?, status = ?,
      tds_section = ?, tds_pct = ?, tds_amount = ?, gst_total = ?, gst_mode = ?,
      expected_delivery_date = ?, notes = ?, category = ?
     WHERE po_no = ?`,
    [nextPoNo,
     payload.vendorCode || payload.vendor_key || existing?.vendor_key || '',
     vendorName, payload.project || '', totalVal, totalVal,
     payload.poDate || existing?.po_date || '', payload.terms || '',
     newStatus, newStatus,
     tdsSection, tdsPct, tdsAmount, gstTotal, gstMode,
     payload.expectedDeliveryDate || existing?.expected_delivery_date || '', payload.notes || '',
     payload.category || existing?.category || 'Goods',
     originalPoNo]
  );
  if (nextPoNo !== originalPoNo) {
    const linkedTables = ['po_items', 'payment_requests', 'system_payments', 'manual_payments', 'po_approval_history'];
    for (const table of linkedTables) {
      await queryRun(`UPDATE ${table} SET po_no = ? WHERE po_no = ?`, [nextPoNo, originalPoNo]);
    }
  }

  await queryRun(`DELETE FROM po_items WHERE po_no = ?`, [nextPoNo]);
  if (payload.items && payload.items.length) {
    for (const item of payload.items) {
      const itemGstPct = Number(item.tax_pct || item.gstPct || item.tax || 0);
      const itemQty = Number(item.qty || item.quantity || 0);
      const itemRate = Number(item.rate || 0);
      const itemGross = itemQty * itemRate;
      const itemGstAmt = item.gst_amount !== undefined ? Number(item.gst_amount) : Math.round(itemGross * itemGstPct / 100);
      const itemTotal = item.amount !== undefined ? Number(item.amount) : (itemGross + itemGstAmt);
      await queryRun(
        `INSERT INTO po_items (po_no, description, hsn_sac, qty, unit, rate, disc_pct, tax_pct, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nextPoNo, item.description || item.desc || '', item.hsn_sac || item.hsn || '', itemQty, item.unit || item.uom || 'Nos', itemRate, 0, itemGstPct, itemTotal]
      );
    }
  }

  // Log PO edit to approval history
  const changesSummary = auditChanges.length ? auditChanges.join('; ') : 'No tracked field changes';
  await queryRun(
    `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [nextPoNo, 'PO Edited', session?.email || 'unknown', changesSummary, new Date().toISOString()]
  );
  if (financiallyChanged && existingStatus === 'approved') {
    await queryRun(
      `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [nextPoNo, 'Re-submitted to Draft (Financial Change)', session?.email || 'unknown', 'PO value or vendor changed - approval reset to Draft', new Date().toISOString()]
    );
  }
  await logAudit(session?.email || 'admin@luxeworx.com', 'PO Updated', `PO#${nextPoNo} edited. Changes: ${changesSummary}`, 'Procurement');
  return { ok: true, poNo: nextPoNo, oldPoNo: originalPoNo, newStatus, changesLogged: auditChanges };
}

export async function deletePOFull(poNo, session) {
  requireAuth(session);
  requireAdminConsole(session);
  await ensureSettingsTable();

  const targetPoNo = String(poNo || '').trim();
  if (!targetPoNo) throw new Error('PO Number missing');

  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [targetPoNo]);
  if (!po) {
    throw new Error(`Purchase Order not found: ${targetPoNo}`);
  }

  const paymentRequests = await queryAll(`SELECT pr_id FROM payment_requests WHERE po_no = ?`, [targetPoNo]);
  const requestIds = paymentRequests.map(pr => pr.pr_id).filter(id => id !== undefined && id !== null);

  await logAudit(
    session.email,
    'PO Deleted',
    `PO#${targetPoNo} deleted. Vendor: ${po.vendor_name || po.vendor_key || 'N/A'}, Project: ${po.project || 'N/A'}, Value: ${po.po_value || 0}`,
    'Procurement'
  );

  const safeDelete = async (sql, params = []) => {
    try {
      await queryRun(sql, params);
    } catch (err) {
      console.warn(`PO delete cleanup skipped: ${err.message}`);
    }
  };

  if (requestIds.length) {
    const placeholders = requestIds.map(() => '?').join(',');
    await safeDelete(`DELETE FROM system_payments WHERE pr_key IN (${placeholders})`, requestIds);
  }
  await safeDelete(`DELETE FROM system_payments WHERE po_no = ?`, [targetPoNo]);
  await safeDelete(`DELETE FROM manual_payments WHERE po_no = ?`, [targetPoNo]);
  await safeDelete(`DELETE FROM payment_requests WHERE po_no = ?`, [targetPoNo]);
  await safeDelete(`DELETE FROM po_approval_history WHERE po_no = ?`, [targetPoNo]);
  await safeDelete(`DELETE FROM po_items WHERE po_no = ?`, [targetPoNo]);
  await queryRun(`DELETE FROM purchase_orders WHERE po_no = ?`, [targetPoNo]);

  return { ok: true, poNo: targetPoNo };
}


// --- PO APPROVAL WORKFLOW ---
export async function submitPOForApproval(poNo, session) {
  requireAuth(session);
  if (!poNo) throw new Error('PO Number is required');
  await ensureSettingsTable();
  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) throw new Error('PO not found: ' + poNo);
  const st = String(po.approval_status || po.status || 'Draft').toLowerCase();
  if (st !== 'draft' && st !== 'rejected') {
    throw new Error(`PO is already in status "${po.approval_status || po.status}" and cannot be submitted again.`);
  }
  await queryRun(
    `UPDATE purchase_orders SET approval_status = 'Pending Approval', status = 'Pending Approval', submitted_by = ?, submitted_at = ? WHERE po_no = ?`,
    [session?.email || 'unknown', new Date().toISOString(), poNo]
  );
  await queryRun(
    `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [poNo, 'Submitted for Approval', session?.email || 'unknown', 'Submitted by creator', new Date().toISOString()]
  );
  await logAudit(session?.email || 'system', 'PO Submitted', 'PO#' + poNo + ' submitted for approval', 'Procurement');
  return { ok: true, poNo, status: 'Pending Approval' };
}

export async function approvePO(poNo, action, remarks, session) {
  requireAuth(session);
  if (!poNo) throw new Error('PO Number is required');
  if (!action || !['approve', 'reject'].includes(action)) throw new Error('Action must be approve or reject');
  await ensureSettingsTable();

  const roles = session?.roles || [];
  const canApprove = roles.includes('director') || roles.includes('admin') || roles.includes('finance');
  if (!canApprove) throw new Error('AUTH:Insufficient permissions to approve/reject POs');

  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) throw new Error('PO not found: ' + poNo);
  const st = String(po.approval_status || po.status || '').toLowerCase();
  if (st !== 'pending approval' && st !== 'pending_approval') {
    throw new Error(`PO is not pending approval (current status: ${po.approval_status || po.status})`);
  }

  const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
  const now = new Date().toISOString();

  await queryRun(
    `UPDATE purchase_orders SET approval_status = ?, status = ?, approved_by = ?, approved_at = ?, approval_remarks = ? WHERE po_no = ?`,
    [newStatus, newStatus, session?.email || 'unknown', now, remarks || '', poNo]
  );
  await queryRun(
    `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [poNo, newStatus, session?.email || 'unknown', remarks || '', now]
  );
  await logAudit(session?.email || 'system', 'PO ' + newStatus, 'PO#' + poNo + ' ' + newStatus + ' by ' + (session?.email || 'unknown'), 'Procurement');
  return { ok: true, poNo, status: newStatus };
}

export async function getPOApprovalHistory(poNo, session) {
  requireAuth(session);
  if (!poNo) return [];
  await ensureSettingsTable();
  const rows = await queryAll(`SELECT * FROM po_approval_history WHERE po_no = ? ORDER BY timestamp ASC`, [poNo]);
  return rows.map(r => ({
    action: r.action,
    performed_by: r.performed_by,
    remarks: r.remarks || '',
    timestamp: r.timestamp
  }));
}

// --- MANUAL PAYMENT ENTRY ---

async function updatePOPaymentStatus(poNo) {
  // Single source of truth: system_payments.amount is always the net paid amount.
  // Manual payments store net directly; workflow remittances store
  // (amount_requested - tds_amount) at remittance time.
  // Startup migration ensures any legacy orphan remitted PRs are backfilled.
  const sysSum = await queryGet(
    `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total
     FROM system_payments
     WHERE po_no = ?`,
    [poNo]
  );
  const totalPaid = Number(sysSum?.total) || 0;

  const po = await queryGet(`SELECT po_value, revised_po_value FROM purchase_orders WHERE po_no = ?`, [poNo]);
  const poVal = Number(po?.revised_po_value || po?.po_value || 0);
  const outstanding = Math.max(0, poVal - totalPaid);

  let paymentStatus = 'Unpaid';
  if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
  else if (totalPaid > 0) paymentStatus = 'Partially Paid';

  await queryRun(
    `UPDATE purchase_orders SET legacy_paid = ?, final_payable = ?, payment_status = ? WHERE po_no = ?`,
    [totalPaid, outstanding, paymentStatus, poNo]
  );
  return { totalPaid, outstanding, paymentStatus };
}

export async function addManualPayment(payload, session) {
  requireAuth(session);
  const roles = session?.roles || [];
  const isSuperAdmin = session?.email === 'admin@luxeworx.com';
  const canRecord = isSuperAdmin || roles.includes('accountant') || roles.includes('admin');
  if (!canRecord) throw new Error('AUTH:Only users with the Accountant or Admin role can record manual payments.');

  const amtNum = Number(payload.amount);
  if (!amtNum || amtNum <= 0) throw new Error('Amount must be greater than zero');
  if (!payload.poNo) throw new Error('PO Number is required');

  await ensureSettingsTable();

  // Validate against outstanding balance
  const { outstanding } = await updatePOPaymentStatus(payload.poNo);
  if (amtNum > outstanding + 0.01) {
    throw new Error(`Payment amount (₹${amtNum.toLocaleString('en-IN')}) exceeds outstanding balance (₹${outstanding.toLocaleString('en-IN')}).`);
  }

  await PaymentService.createManualPayment(payload, session?.email || 'unknown');
  
  // Recompute PO status
  const updated = await updatePOPaymentStatus(payload.poNo);
  
  return { ok: true, poNo: payload.poNo, ...updated };
}

export async function getPOPayments(poNo, session) {
  requireAuth(session);
  if (!poNo) return { payments: [], summary: {} };
  await ensureSettingsTable();

  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) return { payments: [], summary: {} };

  // Fetch manual payments
  const manual = await queryAll(`SELECT * FROM manual_payments WHERE po_no = ? ORDER BY payment_date DESC`, [poNo]);
  // Fetch remitted payment requests
  const remitted = await queryAll(
    `SELECT * FROM payment_requests WHERE po_no = ? AND (stage = 'Remitted' OR remittance = 'Remitted')`,
    [poNo]
  );

  const payments = [
    ...manual.map(p => ({
      id: `MP-${p.id}`,
      payment_date: p.payment_date,
      amount: Number(p.amount),
      payment_mode: p.payment_mode || 'Bank Transfer',
      utr_ref: p.utr_ref || '',
      bank_name: p.bank_name || '',
      reference_no: p.reference_no || '',
      remarks: p.remarks || '',
      payment_type: 'manual',
      recorded_by: p.recorded_by || '',
      created_at: p.created_at
    })),
    ...remitted.map(p => ({
      id: `PR-${p.pr_id}`,
      payment_date: p.remittance_date || p.created_at?.split('T')[0] || '',
      amount: Math.max(0, Number((p.approved_amount ?? p.amount_requested) || 0) - Number(p.tds_amount || 0)),
      payment_mode: 'Bank Transfer (Remittance)',
      utr_ref: p.remittance_ref || '',
      bank_name: '',
      reference_no: '',
      remarks: p.remarks || '',
      payment_type: 'remittance',
      recorded_by: '',
      created_at: p.created_at
    }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  let totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const legacyPaid = Number(po.legacy_paid || 0);

  // If there's a discrepancy (e.g. from manual legacy correction), add an audit row to the payments array
  if (legacyPaid > 0 && Math.abs(legacyPaid - totalPaid) > 0.01) {
     const diff = legacyPaid - totalPaid;
     payments.push({
       id: 'SYS-ADJ',
       payment_date: po.po_date || 'System Adjustment',
       amount: diff,
       payment_mode: 'System / Legacy Override',
       utr_ref: 'LEGACY-CORRECTION',
       bank_name: 'Adjustment',
       reference_no: '',
       remarks: 'Manual/Legacy amount correction discrepancy adjustment',
       payment_type: 'manual',
       recorded_by: 'System Administrator'
     });
     totalPaid = legacyPaid;
  }

  const poVal = Number(po.revised_po_value || po.po_value || 0);
  const outstanding = Math.max(0, poVal - totalPaid);
  let paymentStatus = 'Unpaid';
  if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
  else if (totalPaid > 0) paymentStatus = 'Partially Paid';

  return {
    payments,
    summary: {
      po_value: poVal,
      total_paid: totalPaid,
      outstanding,
      payment_status: po.payment_status || paymentStatus,
      count: payments.length
    }
  };
}

// --- USER MANAGEMENT & INVITES ---
export async function inviteUserAdmin(payload, session) {
  requireAdminConsole(session);

  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const normEmail = String(payload.email).trim().toLowerCase();
  const hash = payload.password ? bcrypt.hashSync(payload.password, bcrypt.genSaltSync(12)) : null;

  // Check if user already exists
  const existing = await queryGet(`SELECT email FROM users WHERE LOWER(email) = ?`, [normEmail]);
  if (existing) {
    // Update roles, reset token, and update password if re-invited
    if (hash) {
      await queryRun(
        `UPDATE users SET name = ?, roles = ?, invite_token = ?, password_hash = ? WHERE LOWER(email) = ?`,
        [payload.name || '', JSON.stringify(payload.roles || []), token, hash, normEmail]
      );
    } else {
      await queryRun(
        `UPDATE users SET name = ?, roles = ?, invite_token = ? WHERE LOWER(email) = ?`,
        [payload.name || '', JSON.stringify(payload.roles || []), token, normEmail]
      );
    }
  } else {
    await queryRun(
      `INSERT INTO users (email, name, roles, invite_token, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)`,
      [normEmail, payload.name || '', JSON.stringify(payload.roles || []), token, hash, true]
    );
  }

  const inviteUrl = `https://lwa-iota.vercel.app/?invite=${token}`;

  let emailSent = false;
  try {
    await sendInviteEmail({
      toEmail: normEmail,
      toName: payload.name || normEmail,
      inviteUrl,
      roles: payload.roles || []
    });
    emailSent = true;
  } catch (emailErr) {
    console.error('Invite email failed:', emailErr.message);
  }

  return { ok: true, inviteUrl, emailSent };
}

export async function sendInvite(payload, session) {
  requireAuth(session);
  return inviteUserAdmin(payload, session);
}

export async function listUsersAdmin(session) {
  requireAdminConsole(session);
  // Ensure last_login column exists (safe, idempotent)
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login TEXT`); } catch (e) { /* already exists */ }
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login_ip TEXT`); } catch (e) { /* already exists */ }
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login_device TEXT`); } catch (e) { /* already exists */ }
  const users = await queryAll(`SELECT email, name, roles, active, invite_token, password_hash, last_login, last_login_ip, last_login_device FROM users`);
  return users.map(u => ({
    email: u.email,
    name: u.name,
    roles: JSON.parse(u.roles || '[]'),
    active: u.active === 1 || u.active === true,
    hasPassword: u.password_hash ? true : false,
    hasToken: !!u.invite_token,
    lastLogin: u.last_login || null,
    lastLoginIp: u.last_login_ip || null,
    lastLoginDevice: u.last_login_device || null
  }));
}

export async function deleteUserAdmin(email, session) {
  requireAdminConsole(session);
  await queryRun(`DELETE FROM users WHERE email = ?`, [email]);
  return { ok: true };
}

export async function setUserActiveAdmin(email, active, session) {
  requireAdminConsole(session);
  await queryRun(`UPDATE users SET active = ? WHERE LOWER(email) = ?`, [active ? 1 : 0, String(email).trim().toLowerCase()]);
  await logAudit(session.email, active ? 'User Activated' : 'User Deactivated', String(email), 'Settings');
  return { ok: true };
}

export async function setUserRolesAdmin(email, roles, session) {
  requireAdminConsole(session);
  const cleanRoles = Array.from(new Set((roles || []).map(normalizeRoleName).filter(Boolean)));
  await queryRun(`UPDATE users SET roles = ? WHERE LOWER(email) = ?`, [JSON.stringify(cleanRoles), String(email).trim().toLowerCase()]);
  await logAudit(session.email, 'User Roles Updated', `${email}: ${cleanRoles.join(', ')}`, 'Settings');
  return { ok: true, roles: cleanRoles };
}

export async function resetUserPasswordAdmin(email, password, session) {
  requireAdminConsole(session);
  if (!password || String(password).length < 8) throw new Error('Password must be at least 8 characters');
  const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
  await queryRun(
    `UPDATE users SET password_hash = ?, invite_token = NULL WHERE LOWER(email) = ?`,
    [hash, String(email).trim().toLowerCase()]
  );
  await logAudit(session.email, 'User Password Reset', String(email), 'Settings');
  return { ok: true };
}

export async function addCustomRole(roleName, session) {
  requireAdminConsole(session);
  const role = normalizeRoleName(roleName);
  if (!role) throw new Error('Role name is required');
  const existing = JSON.parse(await getSetting('custom_roles', '[]') || '[]');
  const roles = Array.from(new Set([...existing, role]));
  await setSetting('custom_roles', JSON.stringify(roles));
  await logAudit(session.email, 'Custom Role Added', role, 'Settings');
  return { ok: true, role, roles };
}

export async function getPOPrefix(session) {
  requireAuth(session);
  return getSetting('po_prefix', '');
}

export async function getNextPONumber(session) {
  requireAuth(session);
  const prefix = await getSetting('po_prefix', '');

  // Fetch all existing PO numbers
  const rows = await queryAll(`SELECT po_no FROM purchase_orders ORDER BY po_no DESC`);
  const existing = rows.map(r => String(r.po_no || ''));

  if (!prefix) {
    // No prefix configured — use simple PO-NNN fallback
    let maxN = 0;
    for (const no of existing) {
      const m = no.match(/^PO-(\d+)$/i);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    return `PO-${String(maxN + 1).padStart(3, '0')}`;
  }

  // With a prefix like "LAIPL/PO/26-27/" — find the highest numeric suffix
  let maxSeq = 0;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}(\\d+)$`);

  for (const no of existing) {
    const m = no.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxSeq) maxSeq = n;
    }
  }

  // Determine padding width from existing numbers (default 3)
  let padLen = 3;
  for (const no of existing) {
    const m = no.match(re);
    if (m && m[1].length > padLen) padLen = m[1].length;
  }

  return `${prefix}${String(maxSeq + 1).padStart(padLen, '0')}`;
}

export async function setPOPrefix(prefix, session) {
  requireAdminConsole(session);
  const value = String(prefix || '').trim();
  await setSetting('po_prefix', value);
  await logAudit(session.email, 'PO Prefix Updated', value || '(default)', 'Settings');
  return { ok: true, prefix: value };
}

const DEFAULT_FEATURE_PERMISSIONS = {
  proc:       ['dashboard', 'payments', 'purchase_orders', 'vendors', 'create_payment', 'create_po'],
  finance:    ['dashboard', 'payments', 'vendors', 'reports', 'approve_payment', 'reject_payment', 'export_data'],
  accountant: ['dashboard', 'payments', 'purchase_orders', 'vendors', 'reports', 'create_payment', 'approve_payment', 'export_data', 'upload_document'],
  director:   ['dashboard', 'payments', 'purchase_orders', 'projects', 'vendors', 'settings', 'reports', 'manage_users', 'manage_settings', 'view_analytics', 'export_data', 'approve_po', 'approve_payment', 'reject_payment']
};

// Valid role keys accepted by the permissions system
const VALID_ROLE_KEYS = new Set(['proc', 'finance', 'accountant', 'director']);

export async function getFeaturePermissions(session) {
  requireAuth(session);
  const raw = await getSetting('feature_permissions', null);
  if (!raw) return { ...DEFAULT_FEATURE_PERMISSIONS };
  try {
    const saved = JSON.parse(raw);
    // Deep merge: default provides missing roles; saved value wins per-role
    const merged = { ...DEFAULT_FEATURE_PERMISSIONS };
    Object.keys(saved).forEach(role => {
      if (VALID_ROLE_KEYS.has(role)) {
        merged[role] = saved[role];
      }
    });
    return merged;
  } catch {
    return { ...DEFAULT_FEATURE_PERMISSIONS };
  }
}

export async function setFeaturePermissions(config, session) {
  requireAdminConsole(session);
  const sanitized = {};
  Object.entries(config || {}).forEach(([role, features]) => {
    // Only allow known role keys — no undefined function needed
    if (!VALID_ROLE_KEYS.has(role)) return;
    sanitized[role] = Array.from(new Set((features || []).map(f => String(f).trim()).filter(Boolean)));
  });
  await setSetting('feature_permissions', JSON.stringify(sanitized));
  await logAudit(session.email, 'Feature Permissions Updated', JSON.stringify(sanitized), 'Settings');
  return { ok: true, permissions: sanitized };
}

export async function clearAllCaches(session) {
  requireAuth(session);
  await logAudit(session.email, 'Cache Cleared', 'Application cache refresh requested', 'Settings');
  return { ok: true };
}

export async function logoutUser(token, session) {
  if (session?.email) {
    await logAudit(session.email, 'Logout', 'User logged out', 'Auth');
  }
  return { ok: true };
}

export async function updateProjectFinancials(payload, session) {
  requireAuth(session);
  if (!payload?.project) throw new Error('Project is required');
  await queryRun(`
    CREATE TABLE IF NOT EXISTS project_financials (
      project TEXT PRIMARY KEY,
      project_value REAL DEFAULT 0,
      bcs REAL DEFAULT 0,
      inflow REAL DEFAULT 0,
      invoice_value REAL DEFAULT 0,
      tds REAL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await queryRun(
    `INSERT INTO project_financials (project, project_value, bcs, inflow, invoice_value, tds, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(project) DO UPDATE SET
       project_value = excluded.project_value,
       bcs = excluded.bcs,
       inflow = excluded.inflow,
       invoice_value = excluded.invoice_value,
       tds = excluded.tds,
       updated_at = excluded.updated_at`,
    [
      String(payload.project),
      Number(payload.projectValue) || 0,
      Number(payload.bcs) || 0,
      Number(payload.inflow) || 0,
      Number(payload.clientDebit) || 0,
      Number(payload.tds) || 0,
      new Date().toISOString()
    ]
  );
  await logAudit(session.email, 'Project Financials Updated', String(payload.project), 'Projects');
  invalidateProjectCache(payload.project);
  return { ok: true, project: payload.project };
}

export async function acceptInvite(token, password) {
  const user = await queryGet(`SELECT * FROM users WHERE invite_token = ?`, [token]);
  if (!user) throw new Error("Invalid or expired invite token");
  
  const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
  await queryRun(
    `UPDATE users SET password_hash = ?, invite_token = NULL WHERE email = ?`,
    [hash, user.email]
  );
  
  return { ok: true, email: user.email };
}

// --- EMAIL ACTIONS ---
export async function sendPaymentAdvice(rowNumberOrId, emailOverride, session) {
  requireAuth(session);
  // rowNumberOrId can be a payment request id or row index
  const rows = await queryAll(`SELECT * FROM payment_requests`);
  const pr = rows.find(r => String(r.pr_id) === String(rowNumberOrId) || String(r.rowid) === String(rowNumberOrId)) || rows[Number(rowNumberOrId) - 1];
  if (!pr) throw new Error('Payment request not found');

  // CRITICAL: Block Payment Advice for Rejected payouts
  const stage = String(pr.stage || '').toLowerCase();
  if (stage === 'rejected') {
    throw new Error('Payment Advice cannot be generated for rejected payment requests.');
  }
  // Only allow for remitted (paid) payments
  const isRemitted = stage === 'remitted' || String(pr.remittance || '').toLowerCase() === 'remitted';
  if (!isRemitted) {
    throw new Error('Payment Advice can only be sent for successfully remitted payments.');
  }

  // Get vendor email from vendors table
  const vendor = await queryGet(`SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?`, [pr.vendor_name, pr.vendor_code]);
  const toEmail = emailOverride || vendor?.email || pr.vendor_email;
  if (!toEmail) throw new Error('No email address found for vendor: ' + (pr.vendor_name || ''));

  const baseAmt = Number((pr.approved_amount ?? pr.amount_requested) || 0);
  const tdsAmt = Number(pr.tds_amount || 0);
  const netAmt = Math.max(0, baseAmt - tdsAmt);

  await sendPaymentAdviceEmail({
    toEmail,
    vendorName: pr.vendor_name || 'Vendor',
    poNo: pr.po_no,
    project: pr.project,
    amount: netAmt,
    grossAmount: baseAmt,
    tdsAmount: tdsAmt,
    remittanceRef: pr.remittance_ref || pr.utr || '',
    paymentDate: pr.remittance_date || new Date().toLocaleDateString('en-IN')
  });

  return { ok: true, vendorEmail: toEmail };
}

export async function sendPOToVendor(poNo, emailOverride, session) {
  requireAuth(session);
  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) throw new Error('PO not found: ' + poNo);

  const vendor = await queryGet(`SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?`, [po.vendor_name, po.vendor_key]);
  const toEmail = emailOverride || vendor?.email || po.vendor_email;
  if (!toEmail) throw new Error('No email address provided for vendor');

  const items = await queryAll(`SELECT * FROM po_items WHERE po_no = ?`, [poNo]);
  
  // Fetch PO attachments
  const dbAttachments = await queryAll(`SELECT file_name, file_data FROM attachments WHERE entity_type = 'po' AND entity_id = ?`, [poNo]);
  const attachments = dbAttachments.map(a => ({
    filename: a.file_name,
    content: a.file_data // Base64
  }));

  await sendPOEmail({
    toEmail,
    vendorName: po.vendor_name || 'Vendor',
    poNo: po.po_no,
    project: po.project,
    poDate: po.po_date,
    items: items.map(it => ({ desc: it.description, qty: it.qty, unit: it.unit || 'Nos', rate: it.rate, amount: it.amount })),
    grandTotal: po.po_value,
    terms: po.terms || '',
    attachments
  });

  return { ok: true, email: toEmail };
}

export async function createPaymentRequest(payload, session) {
  requireAuth(session);
  return PaymentService.createPaymentRequest(payload, session?.email || 'admin@luxeworx.com');
}


export async function bulkApprovePayments(ids, approvalData, session) {
  requireAuth(session);
  const approvedIds = [];
  const failedIds = [];
  const errors = [];

  for (const id of ids) {
    try {
      await PaymentService.approvePaymentRequest(id, session?.email || 'admin@luxeworx.com', session?.roles || [], approvalData?.tds_configs?.[id] || {});
      approvedIds.push(id);
    } catch (e) {
      failedIds.push(id);
      errors.push(e.message);
    }
  }

  return {
    ok: failedIds.length === 0,
    approved: approvedIds.map(id => ({ id, ok: true })),
    failed: failedIds.map((id, idx) => ({ id, error: errors[idx] })),
    errors: errors,
    total_approved: approvedIds.length,
    total_failed: failedIds.length
  };
}

export async function bulkRejectPayments(ids, rejectionData, session) {
  requireAuth(session);
  const rejectedIds = [];
  const failedIds = [];
  const errors = [];

  for (const id of ids) {
    try {
      await PaymentService.rejectPaymentRequest(id, session?.email || 'admin@luxeworx.com', session?.roles || [], rejectionData?.remarks || '');
      rejectedIds.push(id);
    } catch (e) {
      failedIds.push(id);
      errors.push(e.message);
    }
  }

  return {
    ok: failedIds.length === 0,
    rejected: rejectedIds.map(id => ({ id, ok: true })),
    failed: failedIds.map((id, idx) => ({ id, error: errors[idx] })),
    errors: errors,
    total_rejected: rejectedIds.length,
    total_failed: failedIds.length
  };
}

export async function bulkRemitPayments(requestIds, remittanceData, session) {
  requireAuth(session);
  const remittedIds = [];
  const failedIds = [];
  const errors = [];
  const ids = Array.isArray(requestIds) ? requestIds : [requestIds];
  const affectedPoNos = [];

  const utrRef = remittanceData?.utr_ref || '';
  const today = new Date().toISOString().split('T')[0];

  for (const id of ids) {
    try {
      const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [id]);
      if (!pr) throw new Error(`Payment request not found: ${id}`);
      
      if (pr.po_no) affectedPoNos.push(pr.po_no);
      
      const paidAmount = Math.max(0, Number((pr.approved_amount ?? pr.amount_requested) || 0) - Number(pr.tds_amount || 0));
      
      await PaymentService.remitPaymentRequest(id, {
        amount: paidAmount,
        utrRef: utrRef,
        paymentDate: today,
        paymentMode: 'Bank Transfer'
      }, session?.email || 'admin@luxeworx.com');

      remittedIds.push(id);
      invalidateProjectCache(pr.project);
    } catch (e) {
      failedIds.push(id);
      errors.push(e.message);
    }
  }

  // Trigger reconciliation automatically for affected POs only
  const uniquePoNos = Array.from(new Set(affectedPoNos));
  for (const poNo of uniquePoNos) {
    try {
      await reconcileRemittedPaymentsToPOLedger(session, poNo);
    } catch (reconcileErr) {
      console.error(`Reconciliation error for PO# ${poNo} during bulk remittance:`, reconcileErr.message);
    }
  }

  if (remittedIds.length > 0) {
    await logAudit(
      session?.email || 'admin@luxeworx.com',
      'Bulk Remittance',
      'Completed bulk remittance of ' + remittedIds.length + ' payment(s)',
      'Finance'
    );
  }

  return {
    ok: failedIds.length === 0,
    remitted: remittedIds.length,
    failed: failedIds,
    errors: errors
  };
}

export async function approvePaymentWithChain(paymentId, session) {
  requireAuth(session);
  return bulkApprovePayments([paymentId], {}, session);
}

export async function transitionPaymentWorkflow(payload, session) {
  requireAuth(session);
  const rowNumber = payload.rowNumber || payload.paymentId;
  const action = payload.action || 'approve';
  let result;
  if (action === 'reject') {
    result = await bulkRejectPayments([rowNumber], payload, session);
  } else {
    result = await bulkApprovePayments([rowNumber], payload, session);
  }

  const all = await listPaymentRequests({}, session);
  const updated = all.find(p => String(p.id) === String(rowNumber));

  return {
    success: result.ok,
    payment: updated,
    previousState: '',
    newState: updated ? updated.stage : ''
  };
}

export async function setPaymentHold(payload, session) {
  requireAuth(session);
  const rowNumber = payload.rowNumber || payload.paymentId;
  await queryRun(
    `UPDATE payment_requests SET 
      tds_amount = ?, 
      remarks = ? 
     WHERE pr_id = ?`,
    [
      payload.tdsAmount || 0,
      payload.holdRemarks || '',
      rowNumber
    ]
  );
  return { ok: true };
}

export async function getApprovalHistory(requestId, session) {
  requireAuth(session);
  const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [requestId]);
  if (!pr) return [];
  
  // Try to get real history from audit_logs
  // Matches "(ID: 123)" (Create) and "payment ID 123 " (Approve/Remit)
  const logs = await queryAll(
    `SELECT * FROM audit_logs 
     WHERE details LIKE ? OR details LIKE ? 
     ORDER BY timestamp ASC`, 
    [`%(ID: ${requestId})%`, `%payment ID ${requestId} %`]
  );

  const history = [];

  if (logs && logs.length > 0) {
    for (const l of logs) {
      history.push({
        action_type: l.action_type,
        user: l.user,
        details: l.details,
        timestamp: l.timestamp
      });
    }
  } else {
    // Fallback to legacy reconstructed history if no audit logs exist
    if (pr.created_at) {
      history.push({
        action_type: 'Payment Request',
        user: pr.created_by || 'Unknown',
        details: `Requested ${pr.amount_requested} for PO#${pr.po_no}`,
        timestamp: pr.created_at
      });
    }
    if (pr.proc_approval) {
      history.push({
        action_type: 'Procurement Approval',
        user: 'Legacy User',
        details: `Action: ${pr.proc_approval}`,
        timestamp: pr.created_at || null
      });
    }
    if (pr.finance_approval) {
      history.push({
        action_type: 'Finance Approval',
        user: 'Legacy User',
        details: `Action: ${pr.finance_approval}`,
        timestamp: null
      });
    }
    if (pr.director_approval) {
      history.push({
        action_type: 'Director Approval',
        user: 'Legacy User',
        details: `Action: ${pr.director_approval}`,
        timestamp: null
      });
    }
    if (pr.remittance === 'Remitted') {
      history.push({
        action_type: 'Remittance',
        user: 'Legacy User',
        details: `Payment Remitted`,
        timestamp: null
      });
    }
  }
  return history;
}

export async function reconcileRemittedPaymentsToPOLedger(session, targetPoNo = null) {
  requireAuth(session);
  // Fetch all or specific purchase orders
  let pos = [];
  if (targetPoNo) {
    pos = await queryAll(`SELECT po_no, revised_po_value, po_value FROM purchase_orders WHERE po_no = ?`, [targetPoNo]);
  } else {
    pos = await queryAll(`SELECT po_no, revised_po_value, po_value FROM purchase_orders`);
  }
  let reconciledCount = 0;

  for (const po of pos) {
    const poNo = po.po_no;
    
    // Single leg: system_payments.amount is always the net paid amount
    const sysSumRow = await queryGet(
      `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total
       FROM system_payments WHERE po_no = ?`,
      [poNo]
    );
    const totalPaid = Number(sysSumRow?.total) || 0;
    const poVal = Number(po.revised_po_value || po.po_value || 0);
    const finalPayable = poVal - totalPaid;

    // Update PO ledger
    await queryRun(
      `UPDATE purchase_orders SET legacy_paid = ?, final_payable = ? WHERE po_no = ?`,
      [totalPaid, finalPayable, poNo]
    );
    
    reconciledCount++;
  }

  const remittedPRs = await queryAll(`SELECT pr_id FROM payment_requests WHERE stage = 'Remitted' OR remittance = 'Remitted'`);

  return {
    ok: true,
    reconciled: reconciledCount,
    total_posted: remittedPRs.length,
    total_reused: 0
  };
}

export async function listAuditLog(filters = {}, session) {
  requireAuth(session);
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(Math.max(1, Number(filters.pageSize) || Number(filters.limit) || 50), 500);
  const offset = (page - 1) * pageSize;

  let whereClause = '';
  const conditions = [];
  const params = [];

  if (filters.user) {
    conditions.push(`user = ?`);
    params.push(filters.user);
  }
  if (filters.actionType) {
    conditions.push(`action_type = ?`);
    params.push(filters.actionType);
  }
  if (filters.department) {
    conditions.push(`department = ?`);
    params.push(filters.department);
  }
  if (filters.startDate) {
    conditions.push(`timestamp >= ?`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`timestamp <= ?`);
    params.push(filters.endDate);
  }
  if (filters.search) {
    conditions.push(`(user LIKE ? OR action_type LIKE ? OR details LIKE ?)`);
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    whereClause = ` WHERE ${conditions.join(' AND ')}`;
  }

  const sortDir = String(filters.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Get total count for pagination
  const countResult = await queryGet(`SELECT COUNT(*) as total FROM audit_logs${whereClause}`, params);
  const total = Number(countResult?.total) || 0;

  const rows = await queryAll(
    `SELECT id, timestamp, user, action_type AS actionType, details, department FROM audit_logs${whereClause} ORDER BY timestamp ${sortDir} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}


export async function getPaymentReportRows(filters = {}, session) {
  requireAuth(session);
  const all = await listPaymentRequests({}, session);
  return all.filter(r => {
    const type = String(filters.type || 'All').toLowerCase();
    if (type === 'all' && r.status === 'pending') return false;
    if (filters.type && filters.type !== 'All') {
      if (type === 'approved' && r.status !== 'approved') return false;
      if (type === 'rejected' && r.status !== 'rejected') return false;
      if (type === 'remit') {
        const isReadyToRemit = String(r.stage).toLowerCase() === 'ready to remit';
        if (!isReadyToRemit) return false;
      }
      if (type === 'remitted') {
        const isRemitted = String(r.stage).toLowerCase() === 'remitted' || String(r.remittance).toLowerCase() === 'remitted';
        if (!isRemitted) return false;
      }
    }
    if (filters.vendor && r.vendor !== filters.vendor) return false;
    if (filters.project && r.project !== filters.project) return false;
    return true;
  });
}

export async function getTDSRegisterReport(startDate, endDate, session) {
  requireAuth(session);
  let query = `SELECT * FROM payment_requests WHERE tds_amount > 0`;
  const params = [];
  if (startDate) {
    query += ` AND created_at >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND created_at <= ?`;
    params.push(endDate);
  }
  const rows = await queryAll(query, params);

  const entries = rows.map(r => {
    const gross = Number((r.approved_amount ?? r.amount_requested) || 0);
    const tds = Number(r.tds_amount || 0);
    return {
      id: `TDS-${r.pr_id}`,
      project_id: r.project || '—',
      po_id: r.po_no || '—',
      vendor_id: r.vendor_name || '—',
      payment_request_id: r.pr_id,
      gross_amount: gross,
      amount_requested: r.amount_requested,
      approved_amount: r.approved_amount,
      tds_amount: tds,
      tds_percentage: Number(r.tds_percentage || 0),
      tds_section: r.tds_section || '194C',
      deducted_by: 'Finance User',
      deducted_at: r.created_at,
      government_payment_status: r.stage === 'Remitted' ? 'paid' : 'pending',
      government_payment_date: r.stage === 'Remitted' ? r.created_at : null,
      remarks: r.remarks || ''
    };
  });

  const summary = {};
  entries.forEach(e => {
    const sec = e.tds_section || 'Other';
    if (!summary[sec]) {
      summary[sec] = {
        section: sec,
        total_gross: 0,
        total_tds: 0,
        count: 0,
        paid: 0,
        pending: 0
      };
    }
    summary[sec].total_gross += e.gross_amount;
    summary[sec].total_tds += e.tds_amount;
    summary[sec].count++;
    if (e.government_payment_status === 'paid') {
      summary[sec].paid += e.tds_amount;
    } else {
      summary[sec].pending += e.tds_amount;
    }
  });

  return {
    entries,
    summary,
    total_entries: entries.length,
    total_tds_deducted: entries.reduce((sum, e) => sum + e.tds_amount, 0),
    total_tds_paid: entries.filter(e => e.government_payment_status === 'paid').reduce((sum, e) => sum + e.tds_amount, 0),
    total_tds_pending: entries.filter(e => e.government_payment_status !== 'paid').reduce((sum, e) => sum + e.tds_amount, 0)
  };
}

export async function getVendorTDSReport(startDate, endDate, session) {
  requireAuth(session);
  const report = await getTDSRegisterReport(startDate, endDate, session);
  const vendorMap = {};
  report.entries.forEach(e => {
    const v = e.vendor_id;
    if (!vendorMap[v]) {
      vendorMap[v] = {
        vendor_id: v,
        total_gross: 0,
        total_tds: 0,
        total_paid: 0,
        total_pending: 0,
        entries: []
      };
    }
    vendorMap[v].total_gross += e.gross_amount;
    vendorMap[v].total_tds += e.tds_amount;
    if (e.government_payment_status === 'paid') {
      vendorMap[v].total_paid += e.tds_amount;
    } else {
      vendorMap[v].total_pending += e.tds_amount;
    }
    vendorMap[v].entries.push(e);
  });
  return { vendors: Object.values(vendorMap) };
}

export async function getProjectTDSReport(startDate, endDate, session) {
  requireAuth(session);
  const report = await getTDSRegisterReport(startDate, endDate, session);
  const projMap = {};
  report.entries.forEach(e => {
    const p = e.project_id;
    if (!projMap[p]) {
      projMap[p] = {
        project_id: p,
        total_gross: 0,
        total_tds: 0,
        total_paid: 0,
        total_pending: 0,
        entries: []
      };
    }
    projMap[p].total_gross += e.gross_amount;
    projMap[p].total_tds += e.tds_amount;
    if (e.government_payment_status === 'paid') {
      projMap[p].total_paid += e.tds_amount;
    } else {
      projMap[p].total_pending += e.tds_amount;
    }
    projMap[p].entries.push(e);
  });
  return { projects: Object.values(projMap) };
}

export async function getApprovalAuditReport(startDate, endDate, session) {
  requireAuth(session);
  let query = `SELECT * FROM payment_requests`;
  const params = [];
  if (startDate) {
    query += ` WHERE created_at >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += startDate ? ` AND created_at <= ?` : ` WHERE created_at <= ?`;
    params.push(endDate);
  }
  const list = await queryAll(query, params);
  
  const summary = { total_count: 0, total_gross: 0, total_tds: 0, total_net: 0 };
  const entries = list.map(r => {
    const gross = Number((r.approved_amount ?? r.amount_requested) || 0);
    const tds = Number(r.tds_amount || 0);
    const net = gross - tds;
    
    // Only count approved or rejected items
    const status = getPRStatus(r.stage, r.remittance);
    if (status === 'pending') return null;

    summary.total_count++;
    summary.total_gross += gross;
    summary.total_tds += tds;
    summary.total_net += net;

    const performedBy = r.created_by || 'System';
    const action = r.stage === 'Rejected' ? 'reject' : 'approve';

    return {
      timestamp: r.created_at,
      action: action,
      performed_by: performedBy,
      project_id: r.project || '—',
      vendor_id: r.vendor_name || '—',
      gross_amount: gross,
      amount_requested: r.amount_requested,
      approved_amount: r.approved_amount,
      tds_amount: tds,
      net_amount: net,
      override_flag: false
    };
  }).filter(Boolean);

  return { entries, summary };
}

export async function getDayWiseApprovalReport(startDate, endDate, session) {
  requireAuth(session);
  const auditReport = await getApprovalAuditReport(startDate, endDate, session);
  const dayMap = {};
  
  auditReport.entries.forEach(e => {
    if (e.action !== 'approve') return;
    const dateStr = String(e.timestamp || '').split('T')[0];
    if (!dateStr) return;
    
    if (!dayMap[dateStr]) {
      dayMap[dateStr] = {
        displayDate: new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        count: 0,
        gross: 0,
        tds: 0,
        net: 0,
        entries: []
      };
    }
    
    dayMap[dateStr].count++;
    dayMap[dateStr].gross += e.gross_amount;
    dayMap[dateStr].tds += e.tds_amount;
    dayMap[dateStr].net += e.net_amount;
    dayMap[dateStr].entries.push({
      sNo: e.vendor_id + '-' + e.gross_amount,
      vendor: e.vendor_id,
      project: e.project_id,
      poNo: e.po_id,
      grossAmount: e.gross_amount,
      tdsAmount: e.tds_amount,
      netAmount: e.net_amount,
      approvedBy: e.performed_by,
      bankRef: '—'
    });
  });

  const dates = Object.keys(dayMap).sort().reverse().map(dateKey => dayMap[dateKey]);
  
  const summary = {
    total_count: dates.reduce((sum, d) => sum + d.count, 0),
    total_gross: dates.reduce((sum, d) => sum + d.gross, 0),
    total_tds: dates.reduce((sum, d) => sum + d.tds, 0),
    total_net: dates.reduce((sum, d) => sum + d.net, 0)
  };

  return { dates, summary };
}

export async function getPOFullDetails(poNo, session) {
  requireAuth(session);
  await ensureSettingsTable();
  const po = await POService.getPO(poNo);
  if (!po) return null;
  const items = await POService.getPOItems(poNo);
  return {
    ...po,
    vendor_key: po.vendor_key || '',
    approval_status: po.approval_status || po.status || 'Draft',
    status: po.approval_status || po.status || 'Draft',
    tds_section: po.tds_section || '',
    tds_pct: Number(po.tds_pct) || 0,
    tds_amount: Number(po.tds_amount) || 0,
    gst_total: Number(po.gst_total) || 0,
    gst_mode: po.gst_mode || 'inter',
    notes: po.notes || '',
    expected_delivery_date: po.expected_delivery_date || '',
    category: po.category || 'Goods',
    payment_status: po.payment_status || 'Unpaid',
    items: items.map(it => ({
      description: it.description,
      hsnSac: it.hsn_sac,
      hsn_sac: it.hsn_sac,
      quantity: it.qty,
      qty: it.qty,
      unit: it.unit || 'Nos',
      uom: it.unit || 'Nos',
      rate: it.rate,
      gstPct: Number(it.tax_pct) || 0,
      tax_pct: Number(it.tax_pct) || 0,
      amount: it.amount
    }))
  };
}

export async function getPOItems(poNo, session) {
  requireAuth(session);
  return POService.getPOItems(poNo);
}

export async function getCompanySettings(session) {
  requireAuth(session);
  return SettingsService.getCompanySettings();
}

export async function setCompanySettings(payload, session) {
  requireAdminConsole(session);
  await SettingsService.updateCompanySettings(payload);
  await logAudit(session.email, 'Company Settings Updated', `${payload?.name || ''}, ${payload?.gstin || ''}`, 'Settings');
  return { ok: true };
}

export async function getProjectFinancialSummary(requestId, session) {
  requireAuth(session);

  // 1. Fetch the payment request to identify the project and creator
  const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [requestId]);
  if (!pr) {
    throw new Error('Payment request not found');
  }

  // Check if the user is a super admin or director, or has 'approve_payment' or 'reject_payment' permissions
  const roles = session.roles || [];
  const isDirOrAdmin = roles.includes('director') || roles.includes('admin') || session.email === 'admin@luxeworx.com';

  // 2. Authorization check: Creator of the payment request must NOT be allowed to view the summary (unless Director/Admin)
  if (!isDirOrAdmin && session.email === pr.created_by) {
    throw new Error('AUTH:Unauthorized - Requester cannot view project financial summary');
  }
  
  let hasApprovalPermission = isDirOrAdmin;
  if (!hasApprovalPermission) {
    const raw = await getSetting('feature_permissions', null);
    let perms = { ...DEFAULT_FEATURE_PERMISSIONS };
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        Object.keys(saved).forEach(role => {
          if (VALID_ROLE_KEYS.has(role)) {
            perms[role] = saved[role];
          }
        });
      } catch (e) {}
    }
    for (const role of roles) {
      if (perms[role] && (perms[role].includes('approve_payment') || perms[role].includes('reject_payment'))) {
        hasApprovalPermission = true;
        break;
      }
    }
  }

  if (!hasApprovalPermission) {
    throw new Error('AUTH:Unauthorized - Approval permission required');
  }

  return calculateProjectPaymentSummaryForRequest(requestId);
}

export async function deleteRemittedPayment(prId, reason, session) {
  requireAuth(session);
  const roles = session.roles || [];
  const isDirOrAdmin = roles.includes('director') || roles.includes('admin') || session.email === 'admin@luxeworx.com';
  
  if (!isDirOrAdmin) {
    throw new Error('AUTH:Unauthorized - Only Director or Admin can delete remitted payments.');
  }

  // 1. Fetch the payment request
  const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [prId]);
  if (!pr) {
    throw new Error('Payment request not found.');
  }

  const poNo = pr.po_no;
  const vendor = pr.vendor;
  const grossAmount = pr.approved_amount ?? pr.amount_requested;

  // 2. Log pre-deletion audit
  await logAudit(
    session.email,
    'DELETE_REMITTED_PAYMENT',
    `Deleted PR #${prId} for PO: ${poNo}, Vendor: ${vendor}, Amount: ${grossAmount}. Reason: ${reason}`
  );

  // 3. Delete from system_payments if present
  await queryRun(`DELETE FROM system_payments WHERE pr_key = ?`, [prId]);

  // 4. Delete from payment_requests
  await queryRun(`DELETE FROM payment_requests WHERE pr_id = ?`, [prId]);

  // 5. Update PO Paid Amount
  await updatePOPaymentStatus(poNo);

  return { ok: true, message: 'Payment deleted successfully.' };
}

export async function correctLegacyPOPaidAmount(poNo, newPaidAmount, autoRecalculate, reason, session) {
  requireAuth(session);
  const roles = session.roles || [];
  const isAdmin = roles.includes('admin') || session.email === 'admin@luxeworx.com';
  const isDirector = roles.includes('director');
  
  if (!isAdmin && !isDirector) {
    throw new Error('AUTH:Unauthorized - Only Admin/Director can correct legacy payment records.');
  }

  // 1. Fetch the PO
  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) {
    throw new Error('Purchase order not found.');
  }

  const oldPaidAmount = po.legacy_paid;

  if (autoRecalculate) {
    // Just force the recalculation
    await updatePOPaymentStatus(poNo);
    await logAudit(
      session.email,
      'CORRECT_PO_PAYMENT_AUTO',
      `Auto-recalculated PO ${poNo} paid amount. Reason: ${reason}`
    );
  } else {
    // Manual override
    const poVal = Number(po.revised_po_value || po.po_value || 0);
    const finalPayable = poVal - Number(newPaidAmount);

    // Ensure system_payments reflects this exact total.
    // We delete all existing Legacy Import rows for this PO, calculate what the non-legacy sum is,
    // and insert a new Legacy Import row to make up the difference so the total perfectly matches newPaidAmount.
    await queryRun(`DELETE FROM system_payments WHERE po_no = ? AND remitted_by = 'Legacy Import'`, [poNo]);
    
    const sysSum = await queryGet(
      `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total FROM system_payments WHERE po_no = ?`,
      [poNo]
    );
    const nonLegacyTotal = Number(sysSum?.total) || 0;
    const legacyAdjustment = Math.max(0, Number(newPaidAmount) - nonLegacyTotal);

    if (legacyAdjustment > 0) {
      await queryRun(
        `INSERT INTO system_payments (po_no, amount, remitted_by, created_at) VALUES (?, ?, ?, ?)`,
        [poNo, legacyAdjustment, 'Legacy Import', new Date().toISOString()]
      );
    }

    await queryRun(
      `UPDATE purchase_orders SET legacy_paid = ?, final_payable = ? WHERE po_no = ?`,
      [newPaidAmount, finalPayable, poNo]
    );

    await logAudit(
      session.email,
      'CORRECT_PO_PAYMENT_MANUAL',
      `Manually corrected PO ${poNo} paid amount from ${oldPaidAmount} to ${newPaidAmount}. Reason: ${reason}`
    );
  }

  return { ok: true, message: 'Legacy payment corrected successfully.' };
}

export async function mergeProjects(targetProject, sourceProjects, session) {
  requireAuth(session);
  const roles = session.roles || [];
  const isAdmin = roles.includes('admin') || session.email === 'admin@luxeworx.com';
  const isDirector = roles.includes('director');
  
  if (!isAdmin && !isDirector) {
    throw new Error('AUTH:Unauthorized - Only Admin/Director can merge projects.');
  }

  if (!targetProject || typeof targetProject !== 'string') {
    throw new Error('Target project must be a valid string.');
  }

  if (!sourceProjects || !Array.isArray(sourceProjects) || sourceProjects.length === 0) {
    throw new Error('You must provide at least one source project to merge.');
  }

  // Prevent merging a project into itself
  const sourcesToMerge = sourceProjects.filter(sp => sp !== targetProject);
  if (sourcesToMerge.length === 0) {
    throw new Error('No valid source projects to merge into target project.');
  }

  // Generate placeholder string for the IN clause
  const placeholders = sourcesToMerge.map(() => '?').join(',');

  // Fetch financials of source projects to roll them up
  const sourceFinancials = await queryAll(
    `SELECT * FROM project_financials WHERE project IN (${placeholders})`,
    sourcesToMerge
  );

  let addedProjectValue = 0;
  let addedBcs = 0;
  let addedInflow = 0;
  let addedInvoiceValue = 0;
  let addedTds = 0;

  sourceFinancials.forEach(row => {
    addedProjectValue += Number(row.project_value || 0);
    addedBcs += Number(row.bcs || 0);
    addedInflow += Number(row.inflow || 0);
    addedInvoiceValue += Number(row.invoice_value || 0);
    addedTds += Number(row.tds || 0);
  });

  // Ensure target project exists in project_financials
  const targetRow = await queryGet(`SELECT * FROM project_financials WHERE project = ?`, [targetProject]);
  if (!targetRow) {
    await queryRun(
      `INSERT INTO project_financials (project, project_value, bcs, inflow, invoice_value, tds)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [targetProject, addedProjectValue, addedBcs, addedInflow, addedInvoiceValue, addedTds]
    );
  } else {
    await queryRun(
      `UPDATE project_financials 
       SET project_value = project_value + ?, 
           bcs = bcs + ?, 
           inflow = inflow + ?, 
           invoice_value = invoice_value + ?, 
           tds = tds + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE project = ?`,
      [addedProjectValue, addedBcs, addedInflow, addedInvoiceValue, addedTds, targetProject]
    );
  }

  // Update relational tables
  await queryRun(
    `UPDATE purchase_orders SET project = ? WHERE project IN (${placeholders})`,
    [targetProject, ...sourcesToMerge]
  );
  
  await queryRun(
    `UPDATE payment_requests SET project = ? WHERE project IN (${placeholders})`,
    [targetProject, ...sourcesToMerge]
  );

  // Delete source projects from project_financials
  await queryRun(
    `DELETE FROM project_financials WHERE project IN (${placeholders})`,
    sourcesToMerge
  );

  // Log the audit event
  await logAudit(
    session.email,
    'MERGE_PROJECTS',
    `Merged projects [${sourcesToMerge.join(', ')}] into ${targetProject}`
  );

  return { 
    ok: true, 
    message: `Successfully merged ${sourcesToMerge.length} project(s) into ${targetProject}.` 
  };
}

export async function uploadAttachment(payload, session) {
  requireAuth(session);
  const { entityType, entityId, fileName, fileType, fileSize, fileData } = payload;
  if (!entityType || !entityId || !fileName || !fileData) {
    throw new Error('Missing required attachment fields');
  }
  if (fileSize > 3.5 * 1024 * 1024) {
    throw new Error('File exceeds 3.5MB limit');
  }

  await queryRun(
    `INSERT INTO attachments (entity_type, entity_id, file_name, file_type, file_size, file_data, uploaded_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entityType, entityId, fileName, fileType, fileSize, fileData, session.email]
  );
  await logAudit(session.email, 'Attachment Uploaded', `Uploaded ${fileName} to ${entityType} ${entityId}`);
  return { ok: true };
}

export async function getAttachments(payload, session) {
  requireAuth(session);
  const { entityType, entityId } = payload;
  if (!entityType || !entityId) throw new Error('Missing entity details');
  
  // We do NOT return the heavy file_data in the list request
  return queryAll(
    `SELECT id, entity_type, entity_id, file_name, file_type, file_size, uploaded_by, created_at 
     FROM attachments 
     WHERE entity_type = ? AND entity_id = ? 
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );
}

export async function deleteAttachment(attachmentId, session) {
  requireAuth(session);
  if (!attachmentId) throw new Error('Missing attachment ID');
  
  const existing = await queryGet(`SELECT * FROM attachments WHERE id = ?`, [attachmentId]);
  if (!existing) throw new Error('Attachment not found');

  await queryRun(`DELETE FROM attachments WHERE id = ?`, [attachmentId]);
  await logAudit(session.email, 'Attachment Deleted', `Deleted ${existing.file_name} from ${existing.entity_type} ${existing.entity_id}`);
  
  return { ok: true };
}
