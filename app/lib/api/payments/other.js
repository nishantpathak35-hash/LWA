// Domain: payments
import { queryAll, queryGet, queryRun } from '../../db.js';
import { sendPaymentAdviceEmail } from '../../email.js';
import { PaymentService } from '../../../../src/modules/payments/services/PaymentService';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { logAudit } from '../core.js';
import { SYSTEM_FALLBACK_EMAIL } from '../../config.js';
import { listPaymentRequests } from './read.js';
import { getDefaultCCRecipients } from '../settings.js';

function invalidateProjectCache(project) {
  // no-op — kept for call-site compatibility
  return project;
}

function requireAuth(session) {
  AuthService.requireAuth(session);
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
  const isRemitted = stage.trim() === 'remitted' || String(pr.remittance || '').toLowerCase().trim() === 'remitted';
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

  const cc = await getDefaultCCRecipients(session);

  await sendPaymentAdviceEmail({
    toEmail,
    cc,
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

export async function sendPaymentAdviceWhatsApp(rowNumberOrId, phoneOverride, session) {
    requireAuth(session);
    const rows = await queryAll(`SELECT * FROM payment_requests`);
    const pr = rows.find(r => String(r.pr_id) === String(rowNumberOrId) || String(r.rowid) === String(rowNumberOrId)) || rows[Number(rowNumberOrId) - 1];
    if (!pr) throw new Error('Payment request not found');
  
    const stage = String(pr.stage || '').toLowerCase();
    if (stage === 'rejected') throw new Error('Payment Advice cannot be generated for rejected payment requests.');
    const isRemitted = stage.trim() === 'remitted' || String(pr.remittance || '').toLowerCase().trim() === 'remitted';
    if (!isRemitted) throw new Error('Payment Advice can only be sent for successfully remitted payments.');
  
    const vendor = await queryGet(`SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?`, [pr.vendor_name, pr.vendor_code]);
    
    const toPhone = phoneOverride || vendor?.phone || vendor?.contact_number;
    if (!toPhone) throw new Error('No phone number provided for WhatsApp Payment Advice.');

    const baseAmt = Number((pr.approved_amount ?? pr.amount_requested) || 0);
    const tdsAmt = Number(pr.tds_amount || 0);
    const netAmt = Math.max(0, baseAmt - tdsAmt);
    
    const message = `*Payment Advice*\n\nDear ${pr.vendor_name || 'Vendor'},\n\nWe have successfully remitted a payment of *Rs. ${netAmt.toLocaleString('en-IN')}* towards Purchase Order *${pr.po_no || 'N/A'}* for the project *${pr.project || 'N/A'}*.\n\nUTR Number: ${pr.remittance_ref || pr.utr || 'N/A'}\n\nThank you,\nLUXEWORX ATELIER`;

    const { enqueueWhatsAppMessage } = await import('../../whatsapp.js');
    await enqueueWhatsAppMessage(toPhone, message);
    
    await logAudit(session?.email || 'system', 'Payment Advice Sent via WhatsApp', `Payment Advice WhatsApp sent for Request ID: ${pr.id || pr.rowid || pr.pr_id} to ${toPhone}`);
    return { success: true };
}


export async function bulkApprovePayments(ids, approvalData, session) {
  requireAuth(session);
  const approvedIds = [];
  const failedIds = [];
  const errors = [];

  for (const id of ids) {
    try {
      await PaymentService.approvePaymentRequest(id, session?.email || SYSTEM_FALLBACK_EMAIL, session?.roles || [], approvalData?.tds_configs?.[id] || {});
      approvedIds.push(id);
      
      // WhatsApp Notification
      try {
        const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [id]);
        if (pr) {
          const submitter = await queryGet(`SELECT whatsapp_number FROM users WHERE email = ?`, [pr.submitted_by || pr.created_by]);
          if (submitter?.whatsapp_number) {
            const msg = `Update: Payment Request #${id} for ${pr.vendor_name || 'Vendor'} has been Approved by ${session?.name || session?.email}.`;
            await queryRun(`INSERT INTO whatsapp_outbox (phone, message) VALUES (?, ?)`, [submitter.whatsapp_number, msg]);
          }
        }
      } catch (error) {
        console.error('WhatsApp notification failed:', error.message);
      }
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
      await PaymentService.rejectPaymentRequest(id, session?.email || SYSTEM_FALLBACK_EMAIL, session?.roles || [], rejectionData?.remarks || '');
      rejectedIds.push(id);
      
      // WhatsApp Notification
      try {
        const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [id]);
        if (pr) {
          const submitter = await queryGet(`SELECT whatsapp_number FROM users WHERE email = ?`, [pr.submitted_by || pr.created_by]);
          if (submitter?.whatsapp_number) {
            const msg = `Update: Payment Request #${id} for ${pr.vendor_name || 'Vendor'} has been Rejected by ${session?.name || session?.email}.`;
            await queryRun(`INSERT INTO whatsapp_outbox (phone, message) VALUES (?, ?)`, [submitter.whatsapp_number, msg]);
          }
        }
      } catch (error) {
        console.error('WhatsApp notification failed:', error.message);
      }
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
      }, session?.email || SYSTEM_FALLBACK_EMAIL);

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
      session?.email || SYSTEM_FALLBACK_EMAIL,
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

  // Fix Bug #3: listPaymentRequests is now properly imported from ./read.js
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
    const finalPayable = Math.max(0, poVal - totalPaid);

    let paymentStatus = 'Unpaid';
    if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
    else if (totalPaid > 0) paymentStatus = 'Partially Paid';

    // Update PO ledger
    await queryRun(
      `UPDATE purchase_orders SET legacy_paid = ?, final_payable = ?, payment_status = ? WHERE po_no = ?`,
      [totalPaid, finalPayable, paymentStatus, poNo]
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
