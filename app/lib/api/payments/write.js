// Domain: payments
import { queryAll, queryGet, queryRun } from '../../db.js';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { PaymentRepository } from '../../../../src/modules/payments/repositories/PaymentRepository';
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
  const result = await PaymentService.updatePaymentRequest(prId, payload, session);
  await emitBroadcast('payment', 'updated', prId);
  return result;
}


export async function deleteRemittedPayment(prId, reason, session) {
  if (!session && typeof reason === 'object' && reason !== null) {
    session = reason;
    reason = 'Deleted via UI';
  }
  requireAuth(session);
  const roles = session.roles || [];
  const isDirOrAdmin = roles.includes('director') || roles.includes('admin') || isSuperAdmin(session.email);
  const isFinance = roles.includes('finance');
  
  if (!isDirOrAdmin && !isFinance) {
    throw new Error('AUTH:Unauthorized - Only Director, Admin, or Finance can delete remitted payments.');
  }

  if (!reason || String(reason).trim().length < 5) throw new Error('A detailed reason (at least 5 characters) is required.');
  await PaymentRepository.deleteRequestWithAudit(prId, String(reason).trim(), session.email);

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
  if (!session && typeof reason === 'object' && reason !== null) {
    session = reason;
    reason = 'Deleted via UI';
  }
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

  await PaymentRepository.deleteRequestWithAudit(prId, String(reason).trim(), session.email);

  await emitBroadcast('payment', 'deleted', prId);
  return { ok: true, message: `Payment request #${prId} deleted successfully.` };
}