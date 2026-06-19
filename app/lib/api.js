import { queryAll, queryGet, queryRun } from './db.js';
import { sendInviteEmail, sendPaymentAdviceEmail, sendPOEmail } from './email.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'lwa-secure-secret-key-12345678901234567890';

function encryptToken(data) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0')), Buffer.alloc(16, 0));
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptToken(token) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0')), Buffer.alloc(16, 0));
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    throw new Error('Invalid token');
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

  const hash = crypto.createHash('sha256').update(password).digest('hex');

  // Lazy initialize admin/invite password if password_hash is not yet set
  if (!user.password_hash) {
    if (user.invite_token) {
      throw new Error('Please accept the invitation email to set your password before logging in');
    }
    await queryRun(`UPDATE users SET password_hash = ? WHERE email = ?`, [hash, user.email]);
    user.password_hash = hash;
  }

  if (user.password_hash !== hash && user.password_hash !== password) {
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

    return {
      email: user.email,
      name: user.name || user.email,
      roles: JSON.parse(user.roles || '[]'),
      active: true
    };
  } catch (e) {
    console.error('getMySession validation failed:', e);
    throw new Error('AUTH:Invalid or expired token');
  }
}

export async function getBootData(session) {
  if (!session) throw new Error('AUTH:No active session');
  return {
    user: session
  };
}

export async function getBootBundle(session) {
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
  return getMasterData(session);
}

// --- DASHBOARD ---
export async function getDashboardKPIs(session) {
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
  const vendors = await queryAll(`SELECT * FROM vendors`);
  const pos = await queryAll(`SELECT * FROM purchase_orders`);
  
  // Extract unique projects and vendors from POs
  const projectSet = new Set();
  const poVendorMap = {};
  
  pos.forEach(p => { 
    if (p.project) projectSet.add(p.project); 
    if (p.vendor_name && !poVendorMap[p.vendor_name]) {
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
    pos: pos.map(p => ({ po_no: p.po_no, vendor_key: p.vendor_key, po_value: p.po_value, status: p.status })),
    categories: ['Goods', 'Services', 'Consulting', 'IT', 'Marketing', 'Admin', 'Capex', 'Opex', 'Other']
  };
}

export async function getProjectDetails(session) {
  const [pos, prs] = await Promise.all([
    queryAll(`SELECT * FROM purchase_orders`),
    queryAll(`SELECT * FROM payment_requests`)
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
    const paid = Number(po.legacy_paid) || 0;
    projectsMap[name].poIssued += val;
    projectsMap[name].projectValue += val;
    projectsMap[name].outflow += paid;
    projectsMap[name].pendingOutflow += Math.max(0, val - paid);
  });

  return Object.values(projectsMap);
}

export async function addVendor(payload, session) {
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
  if (!payload.vendorId) throw new Error("Vendor ID is required");
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
    status: r.status,
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
  const rows = await queryAll(`SELECT * FROM payment_requests`);
  return rows.map(r => {
    const stage = r.stage || 'Pending Procurement';
    const status = getPRStatus(stage, r.remittance);
    const gross = Number(r.amount_requested || 0);
    const tds = Number(r.tds_amount || 0);
    const net = gross - tds;
    return {
      id: r.pr_id,
      pr_id: r.pr_id,
      rowNumber: r.pr_id,
      poNo: r.po_no,
      po_number: r.po_no,
      vendor: r.vendor_name,
      vendor_name: r.vendor_name,
      project: r.project,
      project_name: r.project,
      category: r.category || '',
      amountRequested: gross,
      gross_amount: gross,
      tds_amount: tds,
      tds_percentage: r.tds_percentage || 0,
      tds_section: r.tds_section || '',
      net_payment_amount: net,
      stage: stage,
      approval_stage: stage,
      status: status,
      approval_status: status,
      remittance: r.remittance || '',
      created_at: r.created_at,
      remarks: r.remarks || '',
      created_by: r.created_by || '',
      vendor_code: r.vendor_code || ''
    };
  });
}

export async function getApprovalQueue(filters = {}, session) {
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
  const all = await listPaymentRequests(filters, session);
  return all.filter(r => r.stage === 'Ready to Remit');
}

// --- ADMIN / SYSTEM ---
export async function getCommandCenter(session) {
  return { status: 'OK' };
}

export async function getMasterHealth(session) {
  return { status: 'OK' };
}

// --- PO CREATION & UPDATING ---
export async function createPOFull(payload, session) {
  const poNo = payload.poNo || `PO-${Date.now()}`;
  
  let totalVal = payload.grandTotal || payload.poValue || 0;
  if (!totalVal && payload.items && payload.items.length) {
    let subt = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    payload.items.forEach(item => {
      const q = Number(item.qty) || 0;
      const r = Number(item.rate) || 0;
      const dPct = Number(item.disc || item.discount) || 0;
      const tPct = Number(item.tax || item.gstPct || item.tax_pct || item.taxPct) || 0;
      const gross = q * r;
      const taxable = gross * (1 - dPct / 100);
      const taxAmt = taxable * (tPct / 100);
      subt += taxable;
      if (payload.gstMode === 'intra') {
        cgst += taxAmt / 2;
        sgst += taxAmt / 2;
      } else {
        igst += taxAmt;
      }
    });
    totalVal = Math.round(subt + cgst + sgst + igst);
  }

  const vendorName = payload.vendorName || payload.vendor || 'Unknown';
  const vendorKey = payload.vendorCode || payload.vendor_key || 'UNKNOWN';

  await queryRun(
    `INSERT INTO purchase_orders (po_no, vendor_key, vendor_name, project, po_value, revised_po_value, status, po_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [poNo, vendorKey, vendorName, payload.project || '', 
     totalVal, totalVal, 'Draft', payload.poDate || new Date().toISOString().split('T')[0]]
  );

  if (payload.items && payload.items.length) {
    for (const item of payload.items) {
      await queryRun(
        `INSERT INTO po_items (po_no, description, hsn_sac, qty, unit, rate, disc_pct, tax_pct, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [poNo, item.description || item.desc || '', item.hsn || '', item.qty || 0, item.unit || '', item.rate || 0, item.disc || item.discount || 0, item.tax || item.gstPct || item.tax_pct || item.taxPct || 0, item.amount || 0]
      );
    }
  }

  await logAudit(session?.email || 'admin@luxeworx.com', 'PO Created', 'PO#' + poNo + ' vendor:' + vendorName + ' value:' + totalVal, 'Procurement');
  return { ok: true, poNo };
}

export async function updatePOFull(poNo, payload, session) {
  if (!poNo) throw new Error("PO Number missing");

  let totalVal = payload.grandTotal || payload.poValue || 0;
  if (!totalVal && payload.items && payload.items.length) {
    let subt = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    payload.items.forEach(item => {
      const q = Number(item.qty) || 0;
      const r = Number(item.rate) || 0;
      const dPct = Number(item.disc || item.discount) || 0;
      const tPct = Number(item.tax || item.gstPct || item.tax_pct || item.taxPct) || 0;
      const gross = q * r;
      const taxable = gross * (1 - dPct / 100);
      const taxAmt = taxable * (tPct / 100);
      subt += taxable;
      if (payload.gstMode === 'intra') {
        cgst += taxAmt / 2;
        sgst += taxAmt / 2;
      } else {
        igst += taxAmt;
      }
    });
    totalVal = Math.round(subt + cgst + sgst + igst);
  }

  const vendorName = payload.vendorName || payload.vendor || 'Unknown';

  await queryRun(
    `UPDATE purchase_orders SET vendor_name = ?, project = ?, po_value = ?, revised_po_value = ?, po_date = ? WHERE po_no = ?`,
    [vendorName, payload.project || '', totalVal, totalVal, payload.poDate || '', poNo]
  );
  
  await queryRun(`DELETE FROM po_items WHERE po_no = ?`, [poNo]);
  if (payload.items && payload.items.length) {
    for (const item of payload.items) {
      await queryRun(
        `INSERT INTO po_items (po_no, description, hsn_sac, qty, unit, rate, disc_pct, tax_pct, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [poNo, item.description || item.desc || '', item.hsn || '', item.qty || 0, item.unit || '', item.rate || 0, item.disc || item.discount || 0, item.tax || item.gstPct || item.tax_pct || item.taxPct || 0, item.amount || 0]
      );
    }
  }

  await logAudit(session?.email || 'admin@luxeworx.com', 'PO Updated', 'PO#' + poNo + ' value:' + totalVal, 'Procurement');
  return { ok: true, poNo };
}

// --- USER MANAGEMENT & INVITES ---
export async function inviteUserAdmin(payload, session) {
  if (!session || !session.roles.includes('admin')) {
    throw new Error('AUTH:Unauthorized');
  }

  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const normEmail = String(payload.email).trim().toLowerCase();
  const hash = payload.password ? crypto.createHash('sha256').update(payload.password).digest('hex') : null;

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
  return inviteUserAdmin(payload, session);
}

export async function listUsersAdmin(session) {
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
  await queryRun(`DELETE FROM users WHERE email = ?`, [email]);
  return { ok: true };
}

export async function acceptInvite(token, password) {
  const user = await queryGet(`SELECT * FROM users WHERE invite_token = ?`, [token]);
  if (!user) throw new Error("Invalid or expired invite token");
  
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  await queryRun(
    `UPDATE users SET password_hash = ?, invite_token = NULL WHERE email = ?`,
    [hash, user.email]
  );
  
  return { ok: true, email: user.email };
}

// --- EMAIL ACTIONS ---
export async function sendPaymentAdvice(rowNumberOrId, session) {
  // rowNumberOrId can be a payment request id or row index
  const rows = await queryAll(`SELECT * FROM payment_requests`);
  const pr = rows.find(r => String(r.pr_id) === String(rowNumberOrId) || String(r.rowid) === String(rowNumberOrId)) || rows[Number(rowNumberOrId) - 1];
  if (!pr) throw new Error('Payment request not found');

  // Get vendor email from vendors table
  const vendor = await queryGet(`SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?`, [pr.vendor_name, pr.vendor_key]);
  const toEmail = vendor?.email || pr.vendor_email;
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
  if (!payload.vendor) throw new Error("Vendor name is required");
  if (!payload.poNo) throw new Error("PO number is required");
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

      if (stage === 'Pending Procurement') {
        procApp = 'Approved';
        stage = 'Pending Finance';
      } else if (stage === 'Pending Finance') {
        finApp = 'Approved';
        stage = 'Pending Director';
      } else if (stage === 'Pending Director') {
        dirApp = 'Approved';
        stage = 'Ready to Remit';
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
    } catch (e) {
      failedIds.push(id);
      errors.push(e.message);
    }
  }

  return {
    ok: true,
    approved: approvedIds.map(id => ({ id, ok: true })),
    failed: failedIds.map((id, idx) => ({ id, error: errors[idx] })),
    errors: errors,
    total_approved: approvedIds.length,
    total_failed: failedIds.length
  };
}

export async function bulkRejectPayments(ids, rejectionData, session) {
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
    } catch (e) {
      failedIds.push(id);
      errors.push(e.message);
    }
  }

  return {
    ok: true,
    rejected: rejectedIds.map(id => ({ id, ok: true })),
    failed: failedIds.map((id, idx) => ({ id, error: errors[idx] })),
    errors: errors,
    total_rejected: rejectedIds.length,
    total_failed: failedIds.length
  };
}

export async function bulkRemitPayments(requestIds, remittanceData, session) {
  const remittedIds = [];
  const failedIds = [];
  const errors = [];
  const ids = Array.isArray(requestIds) ? requestIds : [requestIds];

  for (const id of ids) {
    try {
      const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [id]);
      if (!pr) throw new Error(`Payment request not found: ${id}`);

      await queryRun(
        `UPDATE payment_requests SET 
          remittance = 'Remitted', 
          stage = 'Remitted' 
         WHERE pr_id = ?`,
        [id]
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
    } catch (e) {
      failedIds.push(id);
      errors.push(e.message);
    }
  }

  // Trigger reconciliation automatically
  try {
    await reconcileRemittedPaymentsToPOLedger(session);
  } catch (reconcileErr) {
    console.error('Reconciliation error during bulk remittance:', reconcileErr.message);
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
    ok: true,
    remitted: remittedIds.length,
    failed: failedIds,
    errors: errors
  };
}

export async function approvePaymentWithChain(paymentId, session) {
  return bulkApprovePayments([paymentId], {}, session);
}

export async function transitionPaymentWorkflow(payload, session) {
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

export async function reconcileRemittedPaymentsToPOLedger(session) {
  // Fetch all purchase orders
  const pos = await queryAll(`SELECT po_no, revised_po_value, po_value FROM purchase_orders`);
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
  const limit = Math.min(Number(filters.limit) || 250, 500);
  const rows = await queryAll(
    `SELECT timestamp, user, action_type AS actionType, details, department FROM audit_logs ORDER BY timestamp DESC LIMIT ?`,
    [limit]
  );
  return rows;
}

export async function getPaymentReportRows(filters = {}, session) {
  const all = await listPaymentRequests({}, session);
  return all.filter(r => {
    if (filters.type && filters.type !== 'All') {
      if (filters.type.toLowerCase() === 'approved' && r.status !== 'approved') return false;
      if (filters.type.toLowerCase() === 'rejected' && r.status !== 'rejected') return false;
      if (filters.type.toLowerCase() === 'remitted') {
        const isRem = String(r.stage).toLowerCase().includes('remit') || String(r.remittance).toLowerCase().includes('remit');
        if (!isRem) return false;
      }
    }
    if (filters.vendor && r.vendor !== filters.vendor) return false;
    if (filters.project && r.project !== filters.project) return false;
    return true;
  });
}

export async function getTDSRegisterReport(startDate, endDate, session) {
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


