import { PaymentRepository } from '../repositories/PaymentRepository';
import { IPaymentInput, IPaymentRequestInput, IPaymentRequest } from '../types/Payment';
import { ApprovalWorkflowService } from '../../core/services/ApprovalWorkflowService';
import { POService } from '../../purchase-orders/services/POService';
import { logAudit } from '../../../../app/lib/api.js';
import { notifyQueueUsers } from '../../../../app/lib/whatsapp.js';

export class PaymentService {
  /**
   * Creates a new Payment Request, linking it to a PO.
   */
  static async createPaymentRequest(payload: IPaymentRequestInput, userEmail: string): Promise<{ ok: boolean }> {
    if (!payload.vendor) throw new Error("Vendor name is required");
    if (!payload.poNo) throw new Error("PO number is required");

    const linkedPO = await POService.getPO(payload.poNo);
    if (!linkedPO) {
      throw new Error(`Purchase order not found: ${payload.poNo}`);
    }

    const reqAmt = Number(payload.amountRequested || payload.gross_amount);
    if (isNaN(reqAmt) || reqAmt <= 0) {
      throw new Error("Amount Requested must be greater than zero");
    }

    // Duplicate check
    const existingPRs = await PaymentRepository.findActiveRequestsByPOAndAmount(payload.poNo, reqAmt);
    const today = new Date().toISOString().split('T')[0];
    for (const pr of existingPRs) {
      const prDate = String(pr.created_at || '').split('T')[0];
      if (prDate === today) {
        throw new Error(`Duplicate: A request for ₹${reqAmt.toLocaleString('en-IN')} on PO# ${payload.poNo} already exists today.`);
      }
    }

    const tdsAmount = Number(payload.tds_deducted || payload.tds_amount || 0);
    const tdsPct = Number(payload.tds_percentage || payload.tds_pct || 0);
    const tdsSection = payload.tds_section || payload.tdsSection || '';

    await PaymentRepository.createRequest({
      po_no: payload.poNo,
      vendor_name: payload.vendor,
      vendor_code: payload.vendorCode || linkedPO.vendor_key || '',
      project: payload.project || linkedPO.project || '',
      category: payload.category || linkedPO.category || '',
      amount_requested: reqAmt,
      approved_amount: reqAmt, // Initially same
      stage: 'Pending Procurement',
      remittance: '',
      remarks: payload.remarks || '',
      created_by: userEmail,
      tds_amount: tdsAmount,
      tds_percentage: tdsPct,
      tds_section: tdsSection
    });

    await logAudit(userEmail, 'Payment Request', `Requested ${reqAmt} for PO#${payload.poNo}`, 'Finance');
    
    // Auto-notify the first queue (Procurement)
    await notifyQueueUsers('procurement', `*New Payment Request*\n\nA new payment request of ₹${reqAmt.toLocaleString('en-IN')} for PO# *${payload.poNo}* has been submitted and is waiting for Procurement approval.\n\nProject: ${payload.project || linkedPO.project}`, payload.invoice_url);

    return { ok: true };
  }

  /**
   * Updates an existing Payment Request (if not yet approved).
   */
  static async updatePaymentRequest(prId: string | number, payload: any, userEmail: string): Promise<{ ok: boolean }> {
    const pr = await PaymentRepository.findRequestById(prId);
    if (!pr) throw new Error(`Payment request not found: ${prId}`);
    
    // Check if editable
    const editableStages = ['Pending Procurement', 'Pending Finance'];
    if (!editableStages.includes(pr.stage)) {
      throw new Error(`Payment request cannot be edited in stage: ${pr.stage}`);
    }

    const reqAmt = Number(payload.amountRequested || payload.gross_amount);
    if (isNaN(reqAmt) || reqAmt <= 0) {
      throw new Error("Amount Requested must be greater than zero");
    }

    const oldAmt = pr.amount_requested;
    const remarks = payload.remarks || pr.remarks;

    await PaymentRepository.updateRequest(prId, {
      amount_requested: reqAmt,
      approved_amount: reqAmt, // reset approved amount
      remarks: remarks
    });

    const changeDesc = `Amount changed from ${oldAmt} to ${reqAmt}. Remarks updated.`;
    await logAudit(userEmail, 'Update Payment Request', `Edited PR #${prId}. ${changeDesc}`, pr.stage);

    return { ok: true };
  }

  /**
   * Approves a Payment Request using the configured ApprovalEngine.
   */
  static async approvePaymentRequest(prId: string | number, userEmail: string, userRoles: string[], tdsConfig: any = {}): Promise<{ ok: boolean }> {
    const pr = await PaymentRepository.findRequestById(prId);
    if (!pr) throw new Error(`Payment request not found: ${prId}`);

    const approvedAmount = tdsConfig.approved_amount !== undefined ? Number(tdsConfig.approved_amount) : (pr.approved_amount || pr.amount_requested || 0);
    const tdsAmount = tdsConfig.amount !== undefined ? Number(tdsConfig.amount) : (pr.tds_amount || 0);
    const tdsPct = tdsConfig.percentage !== undefined ? Number(tdsConfig.percentage) : (pr.tds_percentage || 0);
    const tdsSec = tdsConfig.section !== undefined ? String(tdsConfig.section) : (pr.tds_section || '');

    const oldStage = pr.stage || 'Pending Procurement';
    const { newStage, updates } = await ApprovalWorkflowService.getNextStage('payment_request', oldStage, userRoles);

    if (oldStage === newStage) {
      throw new Error(`You do not have permission to approve this request, or it cannot be approved from its current stage (${oldStage}).`);
    }

    await PaymentRepository.updateRequest(prId, {
      ...updates,
      stage: newStage,
      approved_amount: approvedAmount,
      tds_amount: tdsAmount,
      tds_percentage: tdsPct,
      tds_section: tdsSec
    });

    await logAudit(
      userEmail,
      'Approve Payment',
      `Approved payment ID ${prId} (stage transitioned from ${oldStage} to ${newStage}). Requested: ${pr.amount_requested||0}, Approved: ${approvedAmount}, TDS: ${tdsAmount} (${tdsSec})`,
      oldStage
    );

    await ApprovalWorkflowService.recordApproval(
      'payment_request', 
      String(prId), 
      oldStage, 
      'Approved', 
      userEmail, 
      `Requested: ${pr.amount_requested||0}, Approved: ${approvedAmount}, TDS: ${tdsAmount} (${tdsSec})`
    );

    let queueRole = '';
    if (newStage === 'Pending Finance') queueRole = 'finance';
    else if (newStage === 'Pending Director') queueRole = 'director';
    else if (newStage === 'Ready to Remit') queueRole = 'finance';
    
    if (queueRole) {
      await notifyQueueUsers(queueRole, `*Payment Request Updated*\n\nPayment Request ID ${prId} for PO# *${pr.po_no}* is now in stage: *${newStage}* and requires your attention.\n\nAmount: ₹${approvedAmount.toLocaleString('en-IN')}`);
    }

    return { ok: true };
  }

  /**
   * Rejects a Payment Request.
   */
  static async rejectPaymentRequest(prId: string | number, userEmail: string, userRoles: string[], rejectReason: string): Promise<{ ok: boolean }> {
    const pr = await PaymentRepository.findRequestById(prId);
    if (!pr) throw new Error(`Payment request not found: ${prId}`);

    const oldStage = pr.stage;
    const { newStage, updates } = await ApprovalWorkflowService.getRejectStage('payment_request', oldStage, userRoles);

    await PaymentRepository.updateRequest(prId, {
      ...updates,
      stage: newStage,
      remarks: rejectReason ? (pr.remarks ? pr.remarks + ' | Reject Reason: ' + rejectReason : 'Reject Reason: ' + rejectReason) : pr.remarks
    });

    await logAudit(
      userEmail,
      'Reject Payment',
      `Rejected payment ID ${prId} at stage ${oldStage}. Reason: ${rejectReason}`,
      oldStage
    );

    await ApprovalWorkflowService.recordApproval(
      'payment_request', 
      String(prId), 
      oldStage, 
      'Rejected', 
      userEmail, 
      `Reason: ${rejectReason}`
    );

    return { ok: true };
  }

  /**
   * Marks a Payment Request as Remitted and records the actual Payment.
   */
  static async remitPaymentRequest(prId: string | number, payload: any, userEmail: string): Promise<{ ok: boolean }> {
    const pr = await PaymentRepository.findRequestById(prId);
    if (!pr) throw new Error(`Payment request not found: ${prId}`);
    if (pr.stage !== 'Ready to Remit') {
      throw new Error(`Payment request must be 'Ready to Remit'. Current stage: ${pr.stage}`);
    }

    const paidAmt = Number(payload.amount);
    if (isNaN(paidAmt) || paidAmt <= 0) throw new Error("Invalid remittance amount");

    await PaymentRepository.createPayment({
      po_no: pr.po_no,
      payment_date: payload.paymentDate || new Date().toISOString().split('T')[0],
      amount: paidAmt,
      payment_mode: payload.paymentMode || 'Bank Transfer',
      utr_ref: payload.utrRef || payload.referenceNo || '',
      bank_name: payload.bankName || '',
      reference_no: prId.toString(),
      remarks: payload.remarks || '',
      payment_type: 'system',
      recorded_by: userEmail,
      status: 'paid'
    });

    await PaymentRepository.updateRequest(prId, {
      remittance: 'Remitted',
      stage: 'Remitted',
      // Bug 3c: persist UTR/date back onto the PR row so Payment Advice can display them
      remittance_ref: payload.utrRef || payload.referenceNo || '',
      remittance_date: payload.paymentDate || new Date().toISOString().split('T')[0],
      remarks: pr.remarks ? pr.remarks + ' | ' + (payload.remarks || '') : (payload.remarks || '')
    });

    await logAudit(
      userEmail,
      'Remit Payment',
      `Remitted payment ID ${prId} (₹${paidAmt}) via ${payload.paymentMode || 'Bank Transfer'}. Ref: ${payload.utrRef || payload.referenceNo || ''}`,
      'Ready to Remit'
    );

    return { ok: true };
  }

  /**
   * Creates a manual payment unlinked to an approval workflow.
   */
  static async createManualPayment(payload: IPaymentInput, userEmail: string): Promise<{ ok: boolean }> {
    const amt = Number(payload.amount);
    if (isNaN(amt) || amt <= 0) throw new Error("Valid amount is required for manual payment");

    await PaymentRepository.createPayment({
      po_no: payload.poNo,
      payment_date: payload.paymentDate || new Date().toISOString().split('T')[0],
      amount: amt,
      payment_mode: payload.paymentMode || 'Manual',
      utr_ref: payload.utrRef || '',
      bank_name: payload.bankName || '',
      reference_no: payload.referenceNo || '',
      remarks: payload.remarks || '',
      payment_type: 'manual',
      recorded_by: userEmail,
      status: 'paid'
    });

    await logAudit(userEmail, 'Manual Payment Added', `Added ${amt} for PO#${payload.poNo}`, 'Finance');
    return { ok: true };
  }
}
