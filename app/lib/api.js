import { queryAll, queryGet, queryRun } from './db.js';
import { sendInviteEmail, sendPaymentAdviceEmail, sendPOEmail } from './email.js';
import { getPOPaymentIneligibilityReason, isPOEligibleForPayment } from './poEligibility.js';
import { calculateProjectOutflowSnapshots, calculateProjectPaymentSummaryForRequest } from './paymentCalculations.js';
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
  if (!session || !session.email) {
    throw new Error('AUTH:Unauthorized');
  }
}


export async function logAudit(user, actionType, details, department) {
  try {
    await queryRun(
      `INSERT INTO audit_logs (user, action_type, details, department, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [user || 'System', actionType, details, department || 'System', new Date().toISOString()]
    );
  } catch (e) {
    console.error('Failed to log audit:', e.message);
  }
}

function requireAdminConsole(session) {
  if (session?.email === 'admin@luxeworx.com') return;
  const roles = session?.roles || [];
  if (!session || (!roles.includes('admin') && !roles.includes('director'))) {
    throw new Error('AUTH:Unauthorized');
  }
}

function normalizeRoleName(role) {
  return String(role || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

async function ensureSettingsTable() {
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
    'expected_delivery_date', 'notes', 'payment_status'
  ];
  for (const col of poColumns) {
    try { await queryRun(`ALTER TABLE purchase_orders ADD COLUMN ${col} TEXT`); } catch (e) { /* already exists */ }
  }
  const prColumns = ['remittance_ref', 'remittance_date'];
  for (const col of prColumns) {
    try { await queryRun(`ALTER TABLE payment_requests ADD COLUMN ${col} TEXT`); } catch (e) { /* already exists */ }
  }
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
}

async function getSetting(key, fallback = '') {
  await ensureSettingsTable();
  const row = await queryGet(`SELECT value FROM app_settings WHERE key = ?`, [key]);
  return row?.value ?? fallback;
}

async function setSetting(key, value) {
  await ensureSettingsTable();
  await queryRun(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, new Date().toISOString()]
  );
}


// --- AUTH ---
export async function loginUser(email, password) {
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
    await queryRun(`UPDATE users SET password_hash = ? WHERE email = ?`, [hash, user.email]);
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
      await queryRun(`UPDATE users SET password_hash = ? WHERE email = ?`, [newBcryptHash, user.email]);
      user.password_hash = newBcryptHash;
    }
  }

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Clear invite token upon successful login if still present
  if (user.invite_token) {
    await queryRun(`UPDATE users SET invite_token = NULL WHERE email = ?`, [user.email]);
  }

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
  const bootData = await getBootData(session);
  const kpis = await getDashboardKPIs(session);
  const master = await getMasterData(session);
  
  return {
    user: bootData.user,
    session: bootData.user,
    kpis: kpis,
    master: master
  };
}

export async function clearCacheAndGetMaster(session) {
  requireAuth(session);
  return getMasterData(session);
}

// --- DASHBOARD ---
export async function getDashboardKPIs(session) {
  requireAuth(session);
  // Query actual SQLite DB
  const [poResult, prResult, sysResult] = await Promise.all([
    queryAll(`SELECT * FROM purchase_orders`),
    queryAll(`SELECT * FROM payment_requests`),
    queryAll(`SELECT * FROM system_payments`)
  ]);

  let totalPOValue = 0;
  let totalPaid = 0;
  let pendingRemit = 0;
  let pendingApproval = 0;

  poResult.forEach(p => {
    totalPOValue += Number(p.po_value) || 0;
  });

  sysResult.forEach(s => {
    totalPaid += Number(s.amount) || 0;
  });

  prResult.forEach(pr => {
    const isRemitted = String(pr.remittance || '').toLowerCase().includes('remitted');
    const amt = Number(pr.amount_requested) || 0;
    if (isRemitted) totalPaid += amt;
    else pendingApproval += amt;
  });

  return {
    pos: poResult.length,
    prs: prResult.length,
    totalPOValue,
    totalPaid,
    pendingRemit,
    pendingApproval,
    payments: {
      total: prResult.length,
      pendingProc: 0,
      pendingFinance: 0,
      pendingDirector: 0,
      remitted: 0,
      rejected: 0,
      sumPending: pendingApproval,
      sumRemitted: totalPaid
    }
  };
}

export async function getMasterData(session) {
  requireAuth(session);
  const vendors = await queryAll(`SELECT * FROM vendors`);
  const pos = await queryAll(`SELECT * FROM purchase_orders`);
  
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

  const masterVendors = vendors.map(v => ({ 
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
    const projectOutflow = Number(outflowSnapshots[name]?.outflow) || 0;
    projectsMap[name].poIssued += val;
    projectsMap[name].projectValue += val;
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

  return Object.values(projectsMap);
}

export async function addVendor(payload, session) {
  requireAuth(session);
  const code = `VEN-${Date.now()}`;
  await queryRun(
    `INSERT INTO vendors (legal_name, trade_name, vendor_code, vendor_type, pan, gstin, status, address, email, bank_account, ifsc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.legalName,
      payload.tradeName || '',
      code,
      payload.vendorType || '',
      payload.pan || '',
      payload.gstin || '',
      payload.status || 'Active',
      payload.address || '',
      payload.email || '',
      payload.accountNo || '',
      payload.ifsc || ''
    ]
  );
  await logAudit(session?.email || 'admin@luxeworx.com', 'Vendor Added', code + ' ' + payload.legalName, 'Vendors');
  return { ok: true, code };
}

export async function updateVendor(payload, session) {
  requireAuth(session);
  if (!payload.vendorId) throw new Error("Vendor ID is required");
  
  const existing = await queryGet(`SELECT id FROM vendors WHERE vendor_code = ?`, [payload.vendorId]);
  if (!existing) {
    await queryRun(
      `INSERT INTO vendors (legal_name, trade_name, vendor_code, vendor_type, pan, gstin, status, address, email, bank_account, ifsc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.legalName || '',
        payload.tradeName || '',
        payload.vendorId,
        payload.vendorType || '',
        payload.pan || '',
        payload.gstin || '',
        payload.status || 'Active',
        payload.address || '',
        payload.email || '',
        payload.accountNo || '',
        payload.ifsc || ''
      ]
    );
  }

  await queryRun(
    `UPDATE vendors SET 
      legal_name = ?, 
      trade_name = ?, 
      gstin = ?, 
      pan = ?, 
      status = ?, 
      address = ?, 
      vendor_type = ?, 
      email = ?, 
      bank_account = ?, 
      ifsc = ?
     WHERE vendor_code = ?`,
    [
      payload.legalName || '',
      payload.tradeName || '',
      payload.gstin || '',
      payload.pan || '',
      payload.status || 'Active',
      payload.address || '',
      payload.vendorType || '',
      payload.email || '',
      payload.accountNo || '',
      payload.ifsc || '',
      payload.vendorId
    ]
  );
  await logAudit(session?.email || 'admin@luxeworx.com', 'Vendor Updated', payload.vendorId, 'Vendors');
  return { ok: true, vendorId: payload.vendorId };
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
  const rows = await queryAll(`SELECT * FROM purchase_orders`);
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
  const rows = await queryAll(`SELECT * FROM payment_requests`);
  const vendors = await queryAll(`SELECT * FROM vendors`);
  const pos = await queryAll(`SELECT * FROM purchase_orders`);

  return rows.map(r => {
    const stage = r.stage || 'Pending Procurement';
    const status = getPRStatus(stage, r.remittance);
    const gross = Number(r.amount_requested || 0);
    const tds = Number(r.tds_amount || 0);
    const net = gross - tds;

    let vName = r.vendor_name;
    if (!vName || vName === 'Unknown') {
      if (r.vendor_code) {
        const found = vendors.find(v => v.vendor_code === r.vendor_code);
        if (found) vName = found.legal_name || found.name;
      }
      if ((!vName || vName === 'Unknown') && r.po_no) {
        const foundPO = pos.find(p => p.po_no === r.po_no);
        if (foundPO && foundPO.vendor_name && foundPO.vendor_name !== 'Unknown') {
          vName = foundPO.vendor_name;
        }
      }
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
      project: r.project,
      project_name: r.project,
      category: r.category || '',
      amountRequested: gross,
      gross_amount: gross,
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

// --- PO CREATION & UPDATING ---
export async function createPOFull(payload, session) {
  requireAuth(session);
  await ensureSettingsTable();
  const poNo = payload.poNo || `PO-${Date.now()}`;

  // Compute totals from per-item GST if not provided
  let totalVal = payload.grandTotal || payload.poValue || 0;
  let gstTotal = Number(payload.gst_total) || 0;
  if (!totalVal && payload.items && payload.items.length) {
    let subt = 0;
    let gstSum = 0;
    payload.items.forEach(item => {
      const q = Number(item.qty) || 0;
      const r = Number(item.rate) || 0;
      const tPct = Number(item.tax_pct || item.gstPct || item.tax || 0);
      const gross = q * r;
      const gstAmt = Math.round(gross * tPct / 100);
      subt += gross;
      gstSum += gstAmt;
    });
    gstTotal = gstSum;
    const tdsPct = Number(payload.tds_pct || payload.tdsPct || 0);
    const tdsAmt = Math.round(subt * tdsPct / 100);
    totalVal = subt + gstSum - tdsAmt;
  }

  const vendorName = payload.vendorName || payload.vendor || 'Unknown';
  const vendorKey = payload.vendorCode || payload.vendor_key || 'UNKNOWN';
  const tdsSection = payload.tds_section || payload.tdsSection || '';
  const tdsPct = Number(payload.tds_pct || payload.tdsPct || 0);
  const tdsAmount = Number(payload.tds_amount || 0);
  const gstMode = payload.gst_mode || payload.gstMode || 'inter';

  await queryRun(
    `INSERT INTO purchase_orders 
       (po_no, vendor_key, vendor_name, project, po_value, revised_po_value, approval_status, status, po_date, terms, tds_section, tds_pct, tds_amount, gst_total, gst_mode) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [poNo, vendorKey, vendorName, payload.project || '',
     totalVal, totalVal, 'Draft', 'Draft',
     payload.poDate || new Date().toISOString().split('T')[0],
     payload.terms || '', tdsSection, tdsPct, tdsAmount, gstTotal, gstMode]
  );

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
        [poNo, item.description || item.desc || '', item.hsn_sac || item.hsn || '', itemQty, item.unit || '', itemRate, item.disc_pct || item.disc || item.discount || 0, itemGstPct, itemTotal]
      );
    }
  }

  await logAudit(session?.email || 'admin@luxeworx.com', 'PO Created', 'PO#' + poNo + ' vendor:' + vendorName + ' value:' + totalVal, 'Procurement');
  return { ok: true, poNo };
}

export async function updatePOFull(poNo, payload, session) {
  requireAuth(session);
  if (!poNo) throw new Error("PO Number missing");
  await ensureSettingsTable();

  // Fetch existing PO for audit diff and status check
  const existing = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (existing) {
    const st = String(existing.approval_status || existing.status || 'Draft').toLowerCase();
    // Approved POs: only allow editing non-financial fields (notes, terms, expected_delivery_date)
    // Financial edits require re-draft (handled by resetting to Draft on financial change)
    if (st === 'pending approval' || st === 'pending_approval') {
      throw new Error(`Cannot edit a PO that is Pending Approval. Withdraw or wait for approval decision first.`);
    }
  }

  let totalVal = payload.grandTotal || payload.poValue || 0;
  let gstTotal = Number(payload.gst_total) || 0;
  if (!totalVal && payload.items && payload.items.length) {
    let subt = 0;
    let gstSum = 0;
    payload.items.forEach(item => {
      const q = Number(item.qty || item.quantity) || 0;
      const r = Number(item.rate) || 0;
      const tPct = Number(item.tax_pct || item.gstPct || 0);
      const gross = q * r;
      const gstAmt = Math.round(gross * tPct / 100);
      subt += gross;
      gstSum += gstAmt;
    });
    gstTotal = gstSum;
    const tdsPctCalc = Number(payload.tds_pct || 0);
    const tdsAmtCalc = Math.round(subt * tdsPctCalc / 100);
    totalVal = subt + gstSum - tdsAmtCalc;
  }

  const vendorName = payload.vendorName || payload.vendor || existing?.vendor_name || 'Unknown';
  const tdsSection = payload.tds_section || payload.tdsSection || '';
  const tdsPct = Number(payload.tds_pct || payload.tdsPct || 0);
  const tdsAmount = Number(payload.tds_amount || 0);
  const gstMode = payload.gst_mode || payload.gstMode || 'inter';

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
      vendor_name = ?, project = ?, po_value = ?, revised_po_value = ?, po_date = ?, terms = ?,
      approval_status = ?, status = ?,
      tds_section = ?, tds_pct = ?, tds_amount = ?, gst_total = ?, gst_mode = ?,
      expected_delivery_date = ?, notes = ?
     WHERE po_no = ?`,
    [vendorName, payload.project || '', totalVal, totalVal,
     payload.poDate || '', payload.terms || '',
     newStatus, newStatus,
     tdsSection, tdsPct, tdsAmount, gstTotal, gstMode,
     payload.expectedDeliveryDate || '', payload.notes || '',
     poNo]
  );

  await queryRun(`DELETE FROM po_items WHERE po_no = ?`, [poNo]);
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
        [poNo, item.description || item.desc || '', item.hsn_sac || item.hsn || '', itemQty, item.unit || '', itemRate, 0, itemGstPct, itemTotal]
      );
    }
  }

  // Log PO edit to approval history
  const changesSummary = auditChanges.length ? auditChanges.join('; ') : 'No tracked field changes';
  await queryRun(
    `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [poNo, 'PO Edited', session?.email || 'unknown', changesSummary, new Date().toISOString()]
  );
  if (financiallyChanged && existingStatus === 'approved') {
    await queryRun(
      `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [poNo, 'Re-submitted to Draft (Financial Change)', session?.email || 'unknown', 'PO value or vendor changed — approval reset to Draft', new Date().toISOString()]
    );
  }
  await logAudit(session?.email || 'admin@luxeworx.com', 'PO Updated', `PO#${poNo} edited. Changes: ${changesSummary}`, 'Procurement');
  return { ok: true, poNo, newStatus, changesLogged: auditChanges };
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
  // Recompute total paid from manual_payments + system_payments + remitted payment_requests
  const manualSum = await queryGet(`SELECT COALESCE(SUM(amount), 0) AS total FROM manual_payments WHERE po_no = ?`, [poNo]);
  const sysSum = await queryGet(`SELECT COALESCE(SUM(amount), 0) AS total FROM system_payments WHERE po_no = ?`, [poNo]);
  const prSum = await queryGet(
    `SELECT COALESCE(SUM(amount_requested), 0) AS total FROM payment_requests
     WHERE po_no = ? AND (stage = 'Remitted' OR remittance = 'Remitted')
     AND pr_id NOT IN (SELECT pr_key FROM system_payments WHERE pr_key IS NOT NULL)`,
    [poNo]
  );
  const totalPaid = (Number(manualSum?.total) || 0) + (Number(sysSum?.total) || 0) + (Number(prSum?.total) || 0);

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
  // Role check — only accountant or admin (as per business requirement)
  const roles = session?.roles || [];
  const isSuperAdmin = session?.email === 'admin@luxeworx.com';
  const canRecord = isSuperAdmin || roles.includes('accountant') || roles.includes('admin');
  if (!canRecord) throw new Error('AUTH:Only users with the Accountant or Admin role can record manual payments.');

  const { poNo, paymentDate, amount, paymentMode, utrRef, bankName, referenceNo, remarks } = payload;
  if (!poNo) throw new Error('PO Number is required');
  if (!paymentDate) throw new Error('Payment Date is required');
  const amtNum = Number(amount);
  if (!amtNum || amtNum <= 0) throw new Error('Amount must be greater than zero');

  await ensureSettingsTable();

  // Validate against outstanding balance
  const { outstanding } = await updatePOPaymentStatus(poNo);
  if (amtNum > outstanding + 0.01) {
    throw new Error(`Payment amount (₹${amtNum.toLocaleString('en-IN')}) exceeds outstanding balance (₹${outstanding.toLocaleString('en-IN')}).`);
  }

  // Insert into manual_payments
  await queryRun(
    `INSERT INTO manual_payments (po_no, payment_date, amount, payment_mode, utr_ref, bank_name, reference_no, remarks, payment_type, recorded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
    [poNo, paymentDate, amtNum, paymentMode || 'Bank Transfer', utrRef || '', bankName || '', referenceNo || '', remarks || '', session?.email || 'unknown', new Date().toISOString()]
  );

  // Mirror in system_payments for unified reconciliation
  await queryRun(
    `INSERT INTO system_payments (po_no, pr_key, amount, remitted_by, created_at) VALUES (?, ?, ?, ?, ?)`,
    [poNo, `MANUAL-${Date.now()}`, amtNum, session?.email || 'unknown', new Date().toISOString()]
  );

  // Recompute PO status
  const updated = await updatePOPaymentStatus(poNo);

  // Log in approval history for full audit trail
  await queryRun(
    `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [poNo, 'Manual Payment Recorded', session?.email || 'unknown', `₹${amtNum.toLocaleString('en-IN')} via ${paymentMode || 'Bank Transfer'}. UTR: ${utrRef || 'N/A'}. ${remarks || ''}`.trim(), new Date().toISOString()]
  );
  await logAudit(
    session?.email || 'unknown',
    'Manual Payment',
    `Manual payment of ₹${amtNum} recorded for PO# ${poNo}. Mode: ${paymentMode || 'Bank Transfer'}. UTR: ${utrRef || 'N/A'}`,
    'Finance'
  );

  return { ok: true, poNo, ...updated };
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
      amount: Number(p.amount_requested),
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

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
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
  const users = await queryAll(`SELECT email, name, roles, active, invite_token FROM users`);
  return users.map(u => ({
    email: u.email,
    name: u.name,
    roles: JSON.parse(u.roles || '[]'),
    active: u.active === 1 || u.active === true,
    hasPassword: u.password_hash ? true : false,
    hasToken: !!u.invite_token
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

  await sendPaymentAdviceEmail({
    toEmail,
    vendorName: pr.vendor_name || 'Vendor',
    poNo: pr.po_no,
    project: pr.project,
    amount: pr.amount_requested,
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

  await sendPOEmail({
    toEmail,
    vendorName: po.vendor_name || 'Vendor',
    poNo: po.po_no,
    project: po.project,
    poDate: po.po_date,
    items: items.map(it => ({ desc: it.description, qty: it.qty, rate: it.rate, amount: it.amount })),
    grandTotal: po.po_value,
    terms: po.terms || ''
  });

  return { ok: true, email: toEmail };
}

export async function createPaymentRequest(payload, session) {
  requireAuth(session);
  if (!payload.vendor || payload.vendor === 'Unknown') {
    if (payload.vendorCode) {
      const vendor = await queryGet(`SELECT * FROM vendors WHERE vendor_code = ?`, [payload.vendorCode]);
      if (vendor) {
        payload.vendor = vendor.legal_name || vendor.name;
      }
    }
  }
  if (!payload.vendor || payload.vendor === 'Unknown') {
    if (payload.poNo) {
      const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [payload.poNo]);
      if (po && po.vendor_name && po.vendor_name !== 'Unknown') {
        payload.vendor = po.vendor_name;
      }
    }
  }
  if (!payload.vendor) throw new Error("Vendor name is required");
  if (!payload.poNo) throw new Error("PO number is required");

  const linkedPO = await queryGet(`SELECT approval_status, status FROM purchase_orders WHERE po_no = ?`, [payload.poNo]);
  if (!linkedPO) {
    throw new Error(`Purchase order not found: ${payload.poNo}`);
  }
  if (!isPOEligibleForPayment(linkedPO)) {
    throw new Error(getPOPaymentIneligibilityReason({ ...linkedPO, po_no: payload.poNo }));
  }
  const reqAmt = Number(payload.amountRequested || payload.gross_amount);
  if (isNaN(reqAmt) || reqAmt <= 0) {
    throw new Error("Amount Requested must be greater than zero");
  }

  const today = new Date().toISOString().split('T')[0];
  const normalizedPoNo = String(payload.poNo).trim().toLowerCase();

  // Duplicate check
  const existingPRs = await queryAll(
    `SELECT * FROM payment_requests WHERE LOWER(TRIM(po_no)) = ? AND amount_requested = ? AND (remittance IS NULL OR remittance != 'Remitted')`,
    [normalizedPoNo, reqAmt]
  );

  for (const pr of existingPRs) {
    const prDate = String(pr.created_at || '').split('T')[0];
    if (prDate === today) {
      throw new Error(`Duplicate: A request for ₹${reqAmt.toLocaleString('en-IN')} on PO# ${payload.poNo} already exists today.`);
    }
  }

  const now = new Date().toISOString();

  const result = await queryRun(
    `INSERT INTO payment_requests (
      po_no, vendor_name, project, category, amount_requested, stage, remittance, created_at, remarks, created_by, vendor_code
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.poNo,
      payload.vendor,
      payload.project || '',
      payload.category || '',
      reqAmt,
      'Pending Procurement',
      '',
      now,
      payload.remarks || '',
      session?.email || 'admin@luxeworx.com',
      payload.vendorCode || ''
    ]
  );

  const insertedId = result.lastInsertRowid ? Number(result.lastInsertRowid) : Date.now();

  await logAudit(
    session?.email || 'admin@luxeworx.com',
    'Payment Request',
    'Requested ' + reqAmt + ' for PO#' + payload.poNo + ' (ID: ' + insertedId + ')',
    'Procurement'
  );

  return {
    ok: true,
    sNo: insertedId,
    id: insertedId,
    rowNumber: insertedId
  };
}

export async function bulkApprovePayments(ids, approvalData, session) {
  requireAuth(session);
  const approvedIds = [];
  const failedIds = [];
  const errors = [];

  for (const id of ids) {
    try {
      const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [id]);
      if (!pr) throw new Error(`Payment request not found: ${id}`);

      const tdsConfig = approvalData?.tds_configs?.[id] || {};
      const tdsAmount = tdsConfig.amount !== undefined ? Number(tdsConfig.amount) : (pr.tds_amount || 0);
      const tdsPct = tdsConfig.percentage !== undefined ? Number(tdsConfig.percentage) : (pr.tds_percentage || 0);
      const tdsSec = tdsConfig.section !== undefined ? String(tdsConfig.section) : (pr.tds_section || '194C');

      let procApp = pr.proc_approval;
      let finApp = pr.finance_approval;
      let dirApp = pr.director_approval;
      let stage = pr.stage || 'Pending Procurement';
      let oldStage = stage;

      const roles = session?.roles || [];
      const isDirOrAdmin = roles.includes('director') || roles.includes('admin');
      const isFin = roles.includes('finance');

      if (isDirOrAdmin) {
        procApp = 'Approved';
        finApp = 'Approved';
        dirApp = 'Approved';
        stage = 'Ready to Remit';
      } else if (isFin) {
        procApp = 'Approved';
        finApp = 'Approved';
        if (stage === 'Pending Procurement' || stage === 'Pending Finance') {
          stage = 'Pending Director';
        }
      } else {
        procApp = 'Approved';
        if (stage === 'Pending Procurement') {
          stage = 'Pending Finance';
        }
      }

      await queryRun(
        `UPDATE payment_requests SET 
          proc_approval = ?, 
          finance_approval = ?, 
          director_approval = ?, 
          stage = ?, 
          tds_amount = ?, 
          tds_percentage = ?, 
          tds_section = ? 
         WHERE pr_id = ?`,
        [
          procApp,
          finApp,
          dirApp,
          stage,
          tdsAmount,
          tdsPct,
          tdsSec,
          id
        ]
      );
      
      await logAudit(
        session?.email || 'admin@luxeworx.com',
        'Approve Payment',
        'Approved payment ID ' + id + ' (stage transitioned from ' + oldStage + ' to ' + stage + ')',
        oldStage
      );

      approvedIds.push(id);
      invalidateProjectCache(pr.project);
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
      const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [id]);
      if (!pr) throw new Error(`Payment request not found: ${id}`);

      let procApp = pr.proc_approval;
      let finApp = pr.finance_approval;
      let dirApp = pr.director_approval;
      let stage = pr.stage || 'Pending Procurement';
      let oldStage = stage;

      if (stage === 'Pending Procurement') {
        procApp = 'Rejected';
      } else if (stage === 'Pending Finance') {
        finApp = 'Rejected';
      } else if (stage === 'Pending Director') {
        dirApp = 'Rejected';
      }
      stage = 'Rejected';

      await queryRun(
        `UPDATE payment_requests SET 
          proc_approval = ?, 
          finance_approval = ?, 
          director_approval = ?, 
          stage = ? 
         WHERE pr_id = ?`,
        [procApp, finApp, dirApp, stage, id]
      );

      await logAudit(
        session?.email || 'admin@luxeworx.com',
        'Reject Payment',
        'Rejected payment ID ' + id + ' at stage ' + oldStage,
        oldStage
      );

      rejectedIds.push(id);
      invalidateProjectCache(pr.project);
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

      if (pr.po_no) {
        affectedPoNos.push(pr.po_no);
      }

      const existingPayment = await queryGet(
        `SELECT id FROM system_payments WHERE pr_key = ? LIMIT 1`,
        [String(id)]
      );
      if (existingPayment) {
        throw new Error(`Payment request ${id} has already been remitted.`);
      }

      await queryRun(
        `UPDATE payment_requests SET 
          remittance = 'Remitted', 
          stage = 'Remitted',
          remittance_ref = ?,
          remittance_date = ? 
         WHERE pr_id = ?`,
        [utrRef, today, id]
      );

      // Record in system payments
      await queryRun(
        `INSERT INTO system_payments (po_no, pr_key, amount, remitted_by, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          pr.po_no,
          String(id),
          pr.amount_requested,
          session?.email || 'admin@luxeworx.com',
          new Date().toISOString()
        ]
      );

      await logAudit(
        session?.email || 'admin@luxeworx.com',
        'Payment Remitted',
        'Remitted payment ID ' + id + ' for PO#' + pr.po_no + ' amount: ' + pr.amount_requested,
        'Finance'
      );

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
  
  const history = [];
  if (pr.proc_approval) {
    history.push({
      stage: 'Procurement',
      action: String(pr.proc_approval).toLowerCase() === 'approved' ? 'approve' : 'reject',
      performed_by: pr.created_by || 'Procurement User',
      previous_status: 'Pending Procurement',
      new_status: 'Pending Finance',
      timestamp: pr.created_at || null
    });
  }
  if (pr.finance_approval) {
    history.push({
      stage: 'Finance',
      action: String(pr.finance_approval).toLowerCase() === 'approved' ? 'approve' : 'reject',
      performed_by: 'Finance User',
      previous_status: 'Pending Finance',
      new_status: 'Pending Director',
      timestamp: null
    });
  }
  if (pr.director_approval) {
    history.push({
      stage: 'Director',
      action: String(pr.director_approval).toLowerCase() === 'approved' ? 'approve' : 'reject',
      performed_by: 'Director User',
      previous_status: 'Pending Director',
      new_status: 'Ready to Remit',
      timestamp: null
    });
  }
  if (pr.remittance === 'Remitted') {
    history.push({
      stage: 'Remittance',
      action: 'remit',
      performed_by: 'Finance User',
      previous_status: 'Ready to Remit',
      new_status: 'Remitted',
      timestamp: null
    });
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
    
    // Sum system_payments for this PO
    const sysSumRow = await queryGet(
      `SELECT SUM(amount) AS total FROM system_payments WHERE po_no = ?`,
      [poNo]
    );
    const sysSum = Number(sysSumRow?.total) || 0;

    // Sum payment_requests that are remitted but not in system_payments (to prevent double counting)
    const prSumRow = await queryGet(
      `SELECT SUM(amount_requested) AS total FROM payment_requests 
       WHERE po_no = ? 
         AND (stage = 'Remitted' OR remittance = 'Remitted') 
         AND pr_id NOT IN (SELECT pr_key FROM system_payments WHERE pr_key IS NOT NULL)`,
      [poNo]
    );
    const prSum = Number(prSumRow?.total) || 0;

    const totalPaid = sysSum + prSum;
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
  const limit = Math.min(Number(filters.limit) || 250, 500);
  const rows = await queryAll(
    `SELECT timestamp, user, action_type AS actionType, details, department FROM audit_logs ORDER BY timestamp DESC LIMIT ?`,
    [limit]
  );
  return rows;
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
    const gross = Number(r.amount_requested || 0);
    const tds = Number(r.tds_amount || 0);
    return {
      id: `TDS-${r.pr_id}`,
      project_id: r.project || '—',
      po_id: r.po_no || '—',
      vendor_id: r.vendor_name || '—',
      payment_request_id: r.pr_id,
      gross_amount: gross,
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
    const gross = Number(r.amount_requested || 0);
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
  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) return null;
  const items = await queryAll(`SELECT * FROM po_items WHERE po_no = ?`, [poNo]);
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
      rate: it.rate,
      gstPct: Number(it.tax_pct) || 0,
      tax_pct: Number(it.tax_pct) || 0,
      amount: it.amount
    }))
  };
}

export async function getCompanySettings(session) {
  requireAuth(session);
  const name = await getSetting('company_name', 'LUXEWORX ATELIER INTERIOR PRIVATE LIMITED');
  const address = await getSetting('company_address', '8th Floor, Magnum Towers-1\nGolf Course Ext Rd\nGurugram Haryana 122001');
  const gstin = await getSetting('company_gstin', '06AAGCL1112M1ZP');
  let logo = '';
  try {
    logo = fs.readFileSync(path.join(process.cwd(), 'scratch', 'logo_uri.txt'), 'utf8');
  } catch (e) {
    logo = await getSetting('company_logo', '');
  }
  return { name, address, gstin, logo };
}

export async function setCompanySettings(payload, session) {
  requireAdminConsole(session);
  const { name, address, gstin, logo } = payload || {};
  if (name !== undefined) await setSetting('company_name', String(name).trim());
  if (address !== undefined) await setSetting('company_address', String(address).trim());
  if (gstin !== undefined) await setSetting('company_gstin', String(gstin).trim());
  if (logo !== undefined) {
    await setSetting('company_logo', logo);
    try {
      const scratchDir = path.join(process.cwd(), 'scratch');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      fs.writeFileSync(path.join(scratchDir, 'logo_uri.txt'), logo, 'utf8');
    } catch (e) {
      console.error("Failed to write logo to file:", e.message);
    }
  }
  await logAudit(session.email, 'Company Settings Updated', `${name || ''}, ${gstin || ''}`, 'Settings');
  return { ok: true };
}

export async function getProjectFinancialSummary(requestId, session) {
  requireAuth(session);

  // 1. Fetch the payment request to identify the project and creator
  const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [requestId]);
  if (!pr) {
    throw new Error('Payment request not found');
  }

  // 2. Authorization check: Creator of the payment request must NOT be allowed to view the summary
  if (session.email === pr.created_by) {
    throw new Error('AUTH:Unauthorized - Requester cannot view project financial summary');
  }

  // Check if the user is a super admin or director, or has 'approve_payment' or 'reject_payment' permissions
  const roles = session.roles || [];
  const isDirOrAdmin = roles.includes('director') || roles.includes('admin') || session.email === 'admin@luxeworx.com';
  
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
