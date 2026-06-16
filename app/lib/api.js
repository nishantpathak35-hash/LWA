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
  
  // Extract unique projects from POs
  const projectSet = new Set();
  pos.forEach(p => { if (p.project) projectSet.add(p.project); });

  return {
    vendors: vendors.map(v => ({ vendor_code: v.vendor_code, name: v.legal_name, legal_name: v.legal_name, status: v.status })),
    projects: Array.from(projectSet).map(p => ({ name: p })),
    pos: pos.map(p => ({ po_no: p.po_no, vendor_key: p.vendor_key, po_value: p.po_value, status: p.status }))
  };
}

export async function getProjectDetails(session) {
  return [];
}

export async function getVendorSummary(vendor = '', session) {
  let sql = `SELECT * FROM vendors`;
  let params = [];
  if (vendor) {
    sql += ` WHERE vendor_code = ? OR legal_name = ?`;
    params = [vendor, vendor];
  }
  const rows = await queryAll(sql, params);
  return rows.map(r => ({
    vendor_code: r.vendor_code,
    legal_name: r.legal_name,
    status: r.status,
    pan: r.pan,
    gstin: r.gstin
  }));
}

export async function listPOsJson(filters = {}, session) {
  const rows = await queryAll(`SELECT * FROM purchase_orders`);
  const results = rows.map(r => ({
    poNo: r.po_no,
    vendor: r.vendor_name,
    project: r.project,
    value: r.po_value,
    status: r.status,
    date: r.po_date,
    paid: r.legacy_paid
  }));
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
