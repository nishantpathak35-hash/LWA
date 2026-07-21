// Domain: payments
import { queryAll, queryGet, queryRun } from '../../db.js';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { PaymentService } from '../../../../src/modules/payments/services/PaymentService';
import { requireAdminConsole, ensureSettingsTable, logAudit } from '../core.js';
import { isSuperAdmin, SYSTEM_FALLBACK_EMAIL } from '../../config.js';
import { emitBroadcast } from '../../broadcast.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

import { updatePOPaymentStatus } from '../shared.js';


export async function createPaymentRequest(payload, session) {
  requireAuth(session);
  const result = await PaymentService.createPaymentRequest(payload, session?.email || SYSTEM_FALLBACK_EMAIL);
  await emitBroadcast('payment', 'created', '');
  return result;
}

export async function updatePaymentRequest(prId, payload, session) {
  requireAuth(session);
  const result = await PaymentService.updatePaymentRequest(prId, payload, session?.email || SYSTEM_FALLBACK_EMAIL);
  await emitBroadcast('payment', 'updated', prId);
  return result;
}


export async function deleteRemittedPayment(prId, reason, session) {
  requireAuth(session);
  const roles = session.roles || [];
  const isDirOrAdmin = roles.includes('director') || roles.includes('admin') || isSuperAdmin(session.email);
  const isFinance = roles.includes('finance');
  
  if (!isDirOrAdmin && !isFinance) {
    throw new Error('AUTH:Unauthorized - Only Director, Admin, or Finance can delete remitted payments.');
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

  // 3. Delete from system_payments if present (handling both string and integer binding)
  await queryRun(`DELETE FROM system_payments WHERE pr_key = ? OR pr_key = ?`, [String(prId), Number(prId)]);

  // 4. Delete from payment_requests
  await queryRun(`DELETE FROM payment_requests WHERE pr_id = ?`, [prId]);

  // 5. Update PO Paid Amount — now correctly calls the local implementation
  await updatePOPaymentStatus(poNo);

  await emitBroadcast('payment', 'deleted', prId);
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

/**
 * P1-1: Delete a payment request at any stage.
 * - Rejected / Pending: straightforward delete, no ledger impact
 * - Approved / Ready to Remit: delete + release PO reserved amount
 * - Remitted: delegates to existing deleteRemittedPayment logic (ledger reversal)
 */
export async function deletePaymentRequest(prId, reason, session) {
  requireAuth(session);
  const roles = session.roles || [];
  const isDirOrAdmin = roles.includes('director') || roles.includes('admin') || isSuperAdmin(session.email);
  const isFinance = roles.includes('finance');
  
  if (!isDirOrAdmin && !isFinance) {
    throw new Error('AUTH:Unauthorized - Only Director, Admin, or Finance can delete payment requests.');
  }

  if (!reason || String(reason).trim().length < 5) {
    throw new Error('A detailed reason (at least 5 characters) is required for audit logging.');
  }

  const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [prId]);
  if (!pr) {
    throw new Error('Payment request not found.');
  }

  const stage = String(pr.stage || '').toLowerCase().trim();
  const isRemitted = stage === 'remitted' || String(pr.remittance || '').toLowerCase().trim() === 'remitted';

  if (isRemitted) {
    // Delegate to existing remitted-payment delete logic (handles ledger reversal)
    return deleteRemittedPayment(prId, reason, session);
  }

  const poNo = pr.po_no;
  const vendor = pr.vendor_name;
  const grossAmount = pr.approved_amount ?? pr.amount_requested;

  // Log pre-deletion audit
  await logAudit(
    session.email,
    'DELETE_PAYMENT_REQUEST',
    `Deleted PR #${prId} (stage: ${pr.stage}) for PO: ${poNo}, Vendor: ${vendor}, Amount: ${grossAmount}. Reason: ${reason}`
  );

  // For Approved / Ready to Remit: clean up any system_payments entries
  // that may have been created (ensures PO ledger stays consistent)
  if (stage.includes('approved') || stage.includes('ready') || stage.includes('remit')) {
    await queryRun(`DELETE FROM system_payments WHERE pr_key = ? OR pr_key = ?`, [String(prId), Number(prId)]);
  }

  // Delete the payment request
  await queryRun(`DELETE FROM payment_requests WHERE pr_id = ?`, [prId]);

  // Recalculate PO payment status if we had a PO link
  if (poNo) {
    await updatePOPaymentStatus(poNo);
  }

  await emitBroadcast('payment', 'deleted', prId);
  return { ok: true, message: `Payment request #${prId} deleted successfully.` };
}