import { queryAll, queryGet, queryRun } from './db.js';

// --- AUTH ---
export async function loginUser(email, password) {
  // Mock login for now
  if (email && password) {
    return { token: 'mock-token-123' };
  }
  throw new Error('Invalid credentials');
}

export async function getMySession(token) {
  if (token === 'mock-token-123') {
    return {
      email: 'admin@luxeworx.com',
      name: 'Admin User',
      roles: ['director', 'admin', 'finance', 'procurement'],
      active: true
    };
  }
  throw new Error('AUTH:Invalid token');
}

export async function getBootData(session) {
  return {
    user: {
      email: 'admin@luxeworx.com',
      name: 'Admin User',
      roles: ['director', 'admin', 'finance', 'procurement'],
      active: true
    }
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
  return [];
}

export async function addVendor(payload, session) {
  const code = `VEN-${Date.now()}`;
  await queryRun(
    `INSERT INTO vendors (legal_name, trade_name, vendor_code, vendor_type, pan, gstin, status, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [payload.legalName, payload.tradeName || '', code, payload.vendorType || '', payload.pan || '', payload.gstin || '', payload.status || 'Active', payload.address || '']
  );
  return { ok: true, code };
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
    email: '',
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
      address: r.address || ''
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

export async function listPaymentRequests(filters = {}, session) {
  const rows = await queryAll(`SELECT * FROM payment_requests`);
  return rows.map(r => ({
    id: r.pr_id,
    poNo: r.po_no,
    vendor: r.vendor_name,
    project: r.project,
    amountRequested: r.amount_requested,
    stage: r.stage,
    remittance: r.remittance
  }));
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
  await queryRun(
    `INSERT INTO purchase_orders (po_no, vendor_key, vendor_name, project, po_value, revised_po_value, status, po_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [poNo, payload.vendorCode || payload.vendor || 'UNKNOWN', payload.vendor || 'Unknown', payload.project || '', 
     payload.grandTotal || payload.poValue || 0, payload.grandTotal || payload.poValue || 0, 'Draft', payload.poDate || new Date().toISOString().split('T')[0]]
  );

  if (payload.items && payload.items.length) {
    for (const item of payload.items) {
      await queryRun(
        `INSERT INTO po_items (po_no, description, hsn_sac, qty, unit, rate, disc_pct, tax_pct, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [poNo, item.desc || '', item.hsn || '', item.qty || 0, item.unit || '', item.rate || 0, item.disc || 0, item.tax || 0, item.amount || 0]
      );
    }
  }

  return { ok: true, poNo };
}

export async function updatePOFull(poNo, payload, session) {
  if (!poNo) throw new Error("PO Number missing");
  await queryRun(
    `UPDATE purchase_orders SET vendor_name = ?, project = ?, po_value = ?, revised_po_value = ?, po_date = ? WHERE po_no = ?`,
    [payload.vendor || '', payload.project || '', payload.grandTotal || payload.poValue || 0, payload.grandTotal || payload.poValue || 0, payload.poDate || '', poNo]
  );
  
  await queryRun(`DELETE FROM po_items WHERE po_no = ?`, [poNo]);
  if (payload.items && payload.items.length) {
    for (const item of payload.items) {
      await queryRun(
        `INSERT INTO po_items (po_no, description, hsn_sac, qty, unit, rate, disc_pct, tax_pct, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [poNo, item.desc || '', item.hsn || '', item.qty || 0, item.unit || '', item.rate || 0, item.disc || 0, item.tax || 0, item.amount || 0]
      );
    }
  }

  return { ok: true, poNo };
}

// --- USER MANAGEMENT & INVITES ---
export async function inviteUserAdmin(payload, session) {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  await queryRun(
    `INSERT INTO users (email, name, roles, invite_token, active) VALUES (?, ?, ?, ?, ?)`,
    [payload.email, payload.name || '', JSON.stringify(payload.roles || []), token, true]
  );
  
  const inviteUrl = `https://lwa-iota.vercel.app/?invite=${token}`;
  console.log(`\n\n--- INVITE EMAIL SENT TO: ${payload.email} ---\nInvite URL: ${inviteUrl}\n-----------------------------------\n`);
  
  return { ok: true, inviteUrl };
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
  
  // In a real app we would hash the password. Mock for now.
  await queryRun(
    `UPDATE users SET password_hash = ?, invite_token = NULL WHERE email = ?`,
    [password, user.email]
  );
  
  return { ok: true, email: user.email };
}
