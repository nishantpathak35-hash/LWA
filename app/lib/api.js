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
    session: {
      email: 'admin@luxeworx.com',
      name: 'Admin User',
      roles: ['director', 'admin', 'finance', 'procurement'],
      active: true
    }
  };
}

export async function getBootBundle(session) {
  return getBootData(session);
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
    pendingApproval
  };
}

export async function getMasterData(session) {
  return {
    vendors: [],
    projects: [],
    pos: []
  };
}

export async function getProjectDetails(session) {
  return [];
}

export async function getVendorSummary(vendor = '', session) {
  return [];
}

export async function listPOsJson(filters = {}, session) {
  const rows = await queryAll(`SELECT * FROM purchase_orders`);
  return rows.map(r => ({
    poNo: r.po_no,
    vendor: r.vendor_name,
    project: r.project,
    value: r.po_value,
    status: r.status,
    date: r.po_date,
    paid: r.legacy_paid
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
