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

export async function addPOComment(poNo, comment, session) {
  requireAuth(session);
  if (!poNo) throw new Error('PO Number is required');
  if (!comment) throw new Error('Comment text is required');
  
  await ensureSettingsTable();
  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) throw new Error('PO not found: ' + poNo);

  await queryRun(
    `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [poNo, 'Commented', session?.email || 'unknown', comment, new Date().toISOString()]
  );
  
  await logAudit(session?.email || 'system', 'PO Comment', 'PO#' + poNo + ' comment added by ' + (session?.email || 'unknown'), 'Procurement');
  return { ok: true, poNo, action: 'commented' };
}
