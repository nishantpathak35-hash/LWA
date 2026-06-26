// Domain: payments
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
import { requireAdminConsole, ensureSettingsTable, getSetting, setSetting, logAudit } from '../core.js';

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


export async function createPaymentRequest(payload, session) {
  requireAuth(session);
  return PaymentService.createPaymentRequest(payload, session?.email || 'admin@luxeworx.com');
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

export async function addPaymentComment(prId, comment, session) {
  requireAuth(session);
  if (!prId) throw new Error('Payment Request ID is required');
  if (!comment) throw new Error('Comment text is required');

  await ensureSettingsTable();
  const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [prId]);
  if (!pr) throw new Error('Payment request not found: ' + prId);

  // audit_logs is used as the history trail for payments
  await logAudit(
    session?.email || 'unknown',
    'Commented',
    comment,
    'Finance',
    `payment_requests`,
    prId
  );

  return { ok: true, prId, action: 'commented' };
}