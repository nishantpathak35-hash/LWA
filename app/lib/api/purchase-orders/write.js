// Domain: purchase-orders
// Auto-extracted from api.js
import { queryAll, queryGet, queryRun } from '../../db.js';
import { sendInviteEmail, sendPaymentAdviceEmail, sendPOEmail } from '../../email.js';
import { getPOPaymentIneligibilityReason, isPOEligibleForPayment } from '../../poEligibility.js';
import { calculateProjectOutflowSnapshots, calculateProjectPaymentSummaryForRequest } from '../../paymentCalculations.js';
import { VendorService } from '../../../../src/modules/vendors/services/VendorService';
import { POService } from '../../../../src/modules/purchase-orders/services/POService';
import { PaymentService } from '../../../../src/modules/payments/services/PaymentService';
import { PaymentRepository } from '../../../../src/modules/payments/repositories/PaymentRepository';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { SettingsService } from '../../../../src/modules/core/services/SettingsService';
import { AuditService } from '../../../../src/modules/core/services/AuditService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { logAudit } from '../core.js';


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
