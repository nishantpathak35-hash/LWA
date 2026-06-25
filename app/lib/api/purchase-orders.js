// Domain: purchase-orders
// Auto-extracted from api.js
import { queryAll, queryGet, queryRun } from '../db.js';
import { sendInviteEmail, sendPaymentAdviceEmail, sendPOEmail } from '../email.js';
import { getPOPaymentIneligibilityReason, isPOEligibleForPayment } from '../poEligibility.js';
import { calculateProjectOutflowSnapshots, calculateProjectPaymentSummaryForRequest } from '../paymentCalculations.js';
import { VendorService } from '../../../src/modules/vendors/services/VendorService';
import { POService } from '../../../src/modules/purchase-orders/services/POService';
import { PaymentService } from '../../../src/modules/payments/services/PaymentService';
import { PaymentRepository } from '../../../src/modules/payments/repositories/PaymentRepository';
import { AuthService } from '../../../src/modules/core/services/AuthService';
import { SettingsService } from '../../../src/modules/core/services/SettingsService';
import { AuditService } from '../../../src/modules/core/services/AuditService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { requireAdminConsole, ensureSettingsTable, getSetting, setSetting } from './core.js';


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
