// Domain: payments
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

export async function listPaymentRequests(filters = {}, session) {
  requireAuth(session);
  const query = `
    SELECT 
      pr.*,
      COALESCE(v.legal_name, po.vendor_name) as joined_vendor_name,
      po.project as po_project,
      po.category as po_category
    FROM payment_requests pr
    LEFT JOIN purchase_orders po ON pr.po_no = po.po_no
    LEFT JOIN vendors v ON (v.vendor_code = pr.vendor_code OR v.legal_name = po.vendor_name)
  `;
  const rows = await queryAll(query);

  return rows.map(r => {
    const stage = r.stage || 'Pending Procurement';
    const status = getPRStatus(stage, r.remittance);
    const gross = Number((r.approved_amount ?? r.amount_requested) || 0);
    const tds = Number(r.tds_amount || 0);
    const net = gross - tds;

    let vName = r.vendor_name;
    if (!vName || vName === 'Unknown') {
      vName = r.joined_vendor_name || 'Unknown';
    }

    return {
      id: r.pr_id,
      sNo: r.pr_id,
      pr_id: r.pr_id,
      rowNumber: r.pr_id,
      poNo: r.po_no,
      po_no: r.po_no,
      po_number: r.po_no,
      vendor: vName,
      vendor_name: vName,
      project: r.project || r.po_project,
      project_name: r.project || r.po_project,
      category: r.category || r.po_category || '',
      amountRequested: r.amount_requested,
      gross_amount: gross,
      amount_requested: r.amount_requested,
      approved_amount: r.approved_amount,
      tds_amount: tds,
      tds_percentage: r.tds_percentage || 0,
      tds_section: r.tds_section || '',
      net_payment_amount: net,
      net_amount: net,
      stage: stage,
      approval_stage: stage,
      status: status,
      approval_status: status,
      can_send_payment_advice: String(stage || '').toLowerCase() === 'remitted' || String(r.remittance || '').toLowerCase() === 'remitted',
      remittance: r.remittance || '',
      created_at: r.created_at,
      remarks: r.remarks || '',
      created_by: r.created_by || '',
      vendor_code: r.vendor_code || ''
    };
  });
}

export async function getApprovalQueue(filters = {}, session) {
  requireAuth(session);
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
  requireAuth(session);
  const all = await listPaymentRequests(filters, session);
  return all.filter(r => r.stage === 'Ready to Remit');
}

// --- ADMIN / SYSTEM ---
export async function getCommandCenter(session) {
  requireAuth(session);
  return { status: 'OK' };
}

export async function sendPaymentAdvice(rowNumberOrId, emailOverride, session) {
  requireAuth(session);
  // rowNumberOrId can be a payment request id or row index
  const rows = await queryAll(`SELECT * FROM payment_requests`);
  const pr = rows.find(r => String(r.pr_id) === String(rowNumberOrId) || String(r.rowid) === String(rowNumberOrId)) || rows[Number(rowNumberOrId) - 1];
  if (!pr) throw new Error('Payment request not found');

  // CRITICAL: Block Payment Advice for Rejected payouts
  const stage = String(pr.stage || '').toLowerCase();
  if (stage === 'rejected') {
    throw new Error('Payment Advice cannot be generated for rejected payment requests.');
  }
  // Only allow for remitted (paid) payments
  const isRemitted = stage === 'remitted' || String(pr.remittance || '').toLowerCase() === 'remitted';
  if (!isRemitted) {
    throw new Error('Payment Advice can only be sent for successfully remitted payments.');
  }

  // Get vendor email from vendors table
  const vendor = await queryGet(`SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?`, [pr.vendor_name, pr.vendor_code]);
  const toEmail = emailOverride || vendor?.email || pr.vendor_email;
  if (!toEmail) throw new Error('No email address found for vendor: ' + (pr.vendor_name || ''));

  const baseAmt = Number((pr.approved_amount ?? pr.amount_requested) || 0);
  const tdsAmt = Number(pr.tds_amount || 0);
  const netAmt = Math.max(0, baseAmt - tdsAmt);

  await sendPaymentAdviceEmail({
    toEmail,
    vendorName: pr.vendor_name || 'Vendor',
    poNo: pr.po_no,
    project: pr.project,
    amount: netAmt,
    grossAmount: baseAmt,
    tdsAmount: tdsAmt,
    remittanceRef: pr.remittance_ref || pr.utr || '',
    paymentDate: pr.remittance_date || new Date().toLocaleDateString('en-IN')
  });

  return { ok: true, vendorEmail: toEmail };
}

export async function createPaymentRequest(payload, session) {
  requireAuth(session);
  return PaymentService.createPaymentRequest(payload, session?.email || 'admin@luxeworx.com');
}


export async function bulkApprovePayments(ids, approvalData, session) {
  requireAuth(session);
  const approvedIds = [];
  const failedIds = [];
  const errors = [];

  for (const id of ids) {
    try {
      await PaymentService.approvePaymentRequest(id, session?.email || 'admin@luxeworx.com', session?.roles || [], approvalData?.tds_configs?.[id] || {});
      approvedIds.push(id);
    } catch (e) {
      failedIds.push(id);
      errors.push(e.message);
    }
  }

  return {
    ok: failedIds.length === 0,
    approved: approvedIds.map(id => ({ id, ok: true })),
    failed: failedIds.map((id, idx) => ({ id, error: errors[idx] })),
    errors: errors,
    total_approved: approvedIds.length,
    total_failed: failedIds.length
  };
}

export async function bulkRejectPayments(ids, rejectionData, session) {
  requireAuth(session);
  const rejectedIds = [];
  const failedIds = [];
  const errors = [];

  for (const id of ids) {
    try {
      await PaymentService.rejectPaymentRequest(id, session?.email || 'admin@luxeworx.com', session?.roles || [], rejectionData?.remarks || '');
      rejectedIds.push(id);
    } catch (e) {
      failedIds.push(id);
      errors.push(e.message);
    }
  }

  return {
    ok: failedIds.length === 0,
    rejected: rejectedIds.map(id => ({ id, ok: true })),
    failed: failedIds.map((id, idx) => ({ id, error: errors[idx] })),
    errors: errors,
    total_rejected: rejectedIds.length,
    total_failed: failedIds.length
  };
}

export async function bulkRemitPayments(requestIds, remittanceData, session) {
  requireAuth(session);
  const remittedIds = [];
  const failedIds = [];
  const errors = [];
  const ids = Array.isArray(requestIds) ? requestIds : [requestIds];
  const affectedPoNos = [];

  const utrRef = remittanceData?.utr_ref || '';
  const today = new Date().toISOString().split('T')[0];

  for (const id of ids) {
    try {
      const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [id]);
      if (!pr) throw new Error(`Payment request not found: ${id}`);
      
      if (pr.po_no) affectedPoNos.push(pr.po_no);
      
      const paidAmount = Math.max(0, Number((pr.approved_amount ?? pr.amount_requested) || 0) - Number(pr.tds_amount || 0));
      
      await PaymentService.remitPaymentRequest(id, {
        amount: paidAmount,
        utrRef: utrRef,
        paymentDate: today,
        paymentMode: 'Bank Transfer'
      }, session?.email || 'admin@luxeworx.com');

      remittedIds.push(id);
      invalidateProjectCache(pr.project);
    } catch (e) {
      failedIds.push(id);
      errors.push(e.message);
    }
  }

  // Trigger reconciliation automatically for affected POs only
  const uniquePoNos = Array.from(new Set(affectedPoNos));
  for (const poNo of uniquePoNos) {
    try {
      await reconcileRemittedPaymentsToPOLedger(session, poNo);
    } catch (reconcileErr) {
      console.error(`Reconciliation error for PO# ${poNo} during bulk remittance:`, reconcileErr.message);
    }
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
    ok: failedIds.length === 0,
    remitted: remittedIds.length,
    failed: failedIds,
    errors: errors
  };
}

export async function approvePaymentWithChain(paymentId, session) {
  requireAuth(session);
  return bulkApprovePayments([paymentId], {}, session);
}

export async function transitionPaymentWorkflow(payload, session) {
  requireAuth(session);
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
  requireAuth(session);
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
  requireAuth(session);
  const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [requestId]);
  if (!pr) return [];
  
  // Try to get real history from audit_logs
  // Matches "(ID: 123)" (Create) and "payment ID 123 " (Approve/Remit)
  const logs = await queryAll(
    `SELECT * FROM audit_logs 
     WHERE details LIKE ? OR details LIKE ? 
     ORDER BY timestamp ASC`, 
    [`%(ID: ${requestId})%`, `%payment ID ${requestId} %`]
  );

  const history = [];

  if (logs && logs.length > 0) {
    for (const l of logs) {
      history.push({
        action_type: l.action_type,
        user: l.user,
        details: l.details,
        timestamp: l.timestamp
      });
    }
  } else {
    // Fallback to legacy reconstructed history if no audit logs exist
    if (pr.created_at) {
      history.push({
        action_type: 'Payment Request',
        user: pr.created_by || 'Unknown',
        details: `Requested ${pr.amount_requested} for PO#${pr.po_no}`,
        timestamp: pr.created_at
      });
    }
    if (pr.proc_approval) {
      history.push({
        action_type: 'Procurement Approval',
        user: 'Legacy User',
        details: `Action: ${pr.proc_approval}`,
        timestamp: pr.created_at || null
      });
    }
    if (pr.finance_approval) {
      history.push({
        action_type: 'Finance Approval',
        user: 'Legacy User',
        details: `Action: ${pr.finance_approval}`,
        timestamp: null
      });
    }
    if (pr.director_approval) {
      history.push({
        action_type: 'Director Approval',
        user: 'Legacy User',
        details: `Action: ${pr.director_approval}`,
        timestamp: null
      });
    }
    if (pr.remittance === 'Remitted') {
      history.push({
        action_type: 'Remittance',
        user: 'Legacy User',
        details: `Payment Remitted`,
        timestamp: null
      });
    }
  }
  return history;
}

export async function reconcileRemittedPaymentsToPOLedger(session, targetPoNo = null) {
  requireAuth(session);
  // Fetch all or specific purchase orders
  let pos = [];
  if (targetPoNo) {
    pos = await queryAll(`SELECT po_no, revised_po_value, po_value FROM purchase_orders WHERE po_no = ?`, [targetPoNo]);
  } else {
    pos = await queryAll(`SELECT po_no, revised_po_value, po_value FROM purchase_orders`);
  }
  let reconciledCount = 0;

  for (const po of pos) {
    const poNo = po.po_no;
    
    // Single leg: system_payments.amount is always the net paid amount
    const sysSumRow = await queryGet(
      `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total
       FROM system_payments WHERE po_no = ?`,
      [poNo]
    );
    const totalPaid = Number(sysSumRow?.total) || 0;
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
