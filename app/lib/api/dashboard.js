// Domain: dashboard
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
import { ensureSettingsTable } from './core.js';
import { listPaymentRequests } from './payments.js';
import { getFeaturePermissions } from './settings.js';


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

  // Track user activity on every boot/refresh so "Last Login" acts as "Last Active"
  if (session && session.email) {
    queryRun(`UPDATE users SET last_login = ? WHERE LOWER(email) = ?`, [new Date().toISOString(), session.email.trim().toLowerCase()]).catch(e => console.error(e));
  }
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
    address: v.address || '',
    email: v.email || v.contact_email || ''
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
      payment_status: p.payment_status || 'Unpaid',
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

export async function getMasterHealth(session) {
  requireAuth(session);
  return { status: 'OK' };
}
