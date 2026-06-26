// Domain: payments
import { queryAll, queryGet, queryRun } from '../../db.js';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { PaymentService } from '../../../../src/modules/payments/services/PaymentService';
import { requireAdminConsole, ensureSettingsTable, logAudit } from '../core.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

// Fix Bug #4: updatePOPaymentStatus was called here but only existed as a private
// function in purchase-orders/read.js — re-implemented locally so deleteRemittedPayment works.
async function updatePOPaymentStatus(poNo) {
  const po = await queryGet(`SELECT po_value, revised_po_value FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) return;
  const sysRow = await queryGet(
    `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total FROM system_payments WHERE po_no = ?`,
    [poNo]
  );
  const totalPaid = Number(sysRow?.total) || 0;
  const poVal = Number(po.revised_po_value || po.po_value || 0);
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


export async function createPaymentRequest(payload, session) {
  requireAuth(session);
  return PaymentService.createPaymentRequest(payload, session?.email || 'admin@luxeworx.com');
}


export async function deleteRemittedPayment(prId, reason, session) {
  requireAuth(session);
  const roles = session.roles || [];
  const isDirOrAdmin = roles.includes('director') || roles.includes('admin') || session.email === 'admin@luxeworx.com';
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

  // 3. Delete from system_payments if present
  await queryRun(`DELETE FROM system_payments WHERE pr_key = ?`, [prId]);

  // 4. Delete from payment_requests
  await queryRun(`DELETE FROM payment_requests WHERE pr_id = ?`, [prId]);

  // 5. Update PO Paid Amount — now correctly calls the local implementation
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