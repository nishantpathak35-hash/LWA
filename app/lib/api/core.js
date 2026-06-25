// Domain: core
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

export function requireAdminConsole(session) {
  AuthService.requireAdminConsole(session);
}

export function normalizeRoleName(role) {
  return AuthService.normalizeRoleName(role);
}

export async function ensureSettingsTable() {
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

export async function getSetting(key, fallback = '') {
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

export async function setSetting(key, value) {
  await ensureSettingsTable();
  await queryRun(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, new Date().toISOString()]
  );
  settingsCache.set(key, value);
}


// --- AUTH ---