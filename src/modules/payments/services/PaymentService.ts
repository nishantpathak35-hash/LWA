import { PaymentRepository } from '../repositories/PaymentRepository.ts';
import { IPaymentInput, IPaymentRequestInput, IPaymentRequest } from '../types/Payment';
import { ApprovalWorkflowService } from '../../core/services/ApprovalWorkflowService.ts';
import { AuthService } from '../../core/services/AuthService.ts';
import { POService } from '../../purchase-orders/services/POService.ts';
import { logAudit } from '../../../../app/lib/api.js';
import { queryGet } from '../../../../app/lib/db.js';
import { DEFAULT_CONTROL_POLICIES, normalizeControlPolicies } from '../../../../app/lib/paymentStatus.js';

async function loadControlPolicies() {
  try {
    const row = await queryGet('SELECT value FROM app_settings WHERE key = ?', ['erp_control_policies']);
    return row?.value ? normalizeControlPolicies(JSON.parse(row.value)) : DEFAULT_CONTROL_POLICIES;
  } catch { return DEFAULT_CONTROL_POLICIES; }
}

function validateAmounts(gross: number, tds: number, percentage: number) {
  if (!Number.isFinite(gross) || gross <= 0) throw new Error('Amount must be finite and greater than zero');
  if (!Number.isFinite(tds) || tds < 0 || tds > gross) throw new Error('TDS amount must be between zero and the approved amount');
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) throw new Error('TDS percentage must be between zero and 100');
}

export class PaymentService {
  static requireFinance(session: any): void {
    AuthService.requireAuth(session);
    if (!AuthService.isSuperAdmin(session.email) && !(session.roles || []).some((role: string) => ['admin', 'director', 'finance', 'accountant'].includes(role))) {
      throw new Error('AUTH:Unauthorized - Finance permission required');
    }
  }

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
    if (!Number.isFinite(reqAmt) || reqAmt <= 0) {
      throw new Error("Amount Requested must be greater than zero");
    }

    const controlPolicies = await loadControlPolicies();
    const poValue = Number(linkedPO.revised_po_value || linkedPO.po_value || 0);
    const paidValue = Number((linkedPO as any).legacy_paid || 0);
    if (controlPolicies.block_payment_over_po_balance && poValue > 0 && reqAmt > Math.max(0, poValue - paidValue)) {
      throw new Error('Payment amount exceeds the remaining PO balance');
    }
    if (controlPolicies.require_supporting_document && !(payload.invoice_id || payload.invoiceId)) {
      throw new Error('A supporting invoice/document is required for this payment request');
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

    validateAmounts(reqAmt, tdsAmount, tdsPct);
    const invoiceId = payload.invoice_id || payload.invoiceId;
    if (invoiceId) await PaymentRepository.validateInvoiceLink(invoiceId, payload.poNo);
    if (payload.vendorCode && linkedPO.vendor_code && payload.vendorCode !== linkedPO.vendor_code) throw new Error('Vendor must match the purchase order');

    await PaymentRepository.createRequest({
      po_no: payload.poNo,
      vendor_id: linkedPO.vendor_id || undefined,
      vendor_code: linkedPO.vendor_code || linkedPO.vendor_key || payload.vendorCode || '',
      vendor_name: linkedPO.vendor_name || payload.vendor,
      project: linkedPO.project || '',
      category: payload.category || linkedPO.category || '',
      amount_requested: reqAmt,
      approved_amount: reqAmt, // Initially same
      stage: 'Pending Procurement',
      remittance: '',
      remarks: payload.remarks || '',
      created_by: userEmail,
      tds_amount: tdsAmount,
      tds_percentage: tdsPct,
      tds_section: tdsSection,
      invoice_id: payload.invoice_id || payload.invoiceId || undefined,
      payment_mode: payload.payment_mode || payload.paymentMode || 'NEFT'
    });

    await logAudit(userEmail, 'Payment Request', `Requested ${reqAmt} for PO#${payload.poNo}`, 'Finance');

    return { ok: true };
  }

  /**
   * Updates an existing Payment Request (if not yet approved).
   */
  static async updatePaymentRequest(prId: string | number, payload: any, session: any): Promise<{ ok: boolean }> {
    AuthService.requireAuth(session);
    const userEmail = session.email;
    const roles = session?.roles || [];
    const isSuperAdmin = AuthService.isSuperAdmin(session?.email);
    const isDirOrAdmin = roles.includes('director') || roles.includes('admin') || isSuperAdmin;
    const isFinance = roles.includes('finance');

    const pr = await PaymentRepository.findRequestById(prId);
    if (!pr) throw new Error(`Payment request not found: ${prId}`);
    
    const isRemitted = String(pr.stage || '').toLowerCase() === 'remitted' || String(pr.remittance || '').toLowerCase() === 'remitted';

    if (isRemitted) {
      if (!isDirOrAdmin && !isFinance) {
        throw new Error('AUTH:Unauthorized - Only Director, Admin, or Finance can edit remitted payments');
      }
    } else {
      if (payload.adminOverride) AuthService.requireAdminConsole(session);
      const editableStages = ['Pending Procurement', 'Pending Finance'];
      if (!payload.adminOverride && !editableStages.includes(pr.stage)) {
        throw new Error(`Payment request cannot be edited in stage: ${pr.stage}`);
      }
    }

    const reqAmt = payload.amountRequested !== undefined ? Number(payload.amountRequested || payload.gross_amount || 0) : Number(pr.amount_requested || 0);
    let approvedAmt = payload.approved_amount !== undefined 
      ? Number(payload.approved_amount) 
      : (payload.approvedAmount !== undefined 
        ? Number(payload.approvedAmount) 
        : (pr.approved_amount !== undefined && pr.approved_amount !== null && Number(pr.approved_amount) !== Number(pr.amount_requested)
          ? Number(pr.approved_amount)
          : reqAmt));

    
    const tdsSec = payload.tds_section !== undefined ? payload.tds_section : (payload.tdsSection !== undefined ? payload.tdsSection : (pr.tds_section || ''));
    const tdsPct = payload.tds_percentage !== undefined ? Number(payload.tds_percentage) : (payload.tdsPct !== undefined ? Number(payload.tdsPct) : Number(pr.tds_percentage || 0));
    let tdsAmt = payload.tds_amount !== undefined ? Number(payload.tds_amount) : (payload.tdsAmount !== undefined ? Number(payload.tdsAmount) : Number(pr.tds_amount || 0));
    
    if (payload.tds_amount === undefined && payload.tdsAmount === undefined && tdsPct > 0) {
      tdsAmt = Math.round(approvedAmt * (tdsPct / 100));
    }

    validateAmounts(reqAmt, 0, 0);
    validateAmounts(approvedAmt, tdsAmt, tdsPct);
    const remarks = payload.remarks !== undefined ? payload.remarks : (pr.remarks || '');

    const updates: Record<string, any> = {
      amount_requested: reqAmt > 0 ? reqAmt : pr.amount_requested,
      approved_amount: approvedAmt > 0 ? approvedAmt : (reqAmt > 0 ? reqAmt : pr.amount_requested),
      tds_section: tdsSec,
      tds_percentage: tdsPct,
      tds_amount: tdsAmt,
      remarks: remarks
    };

    if (payload.remittance_ref !== undefined) updates.remittance_ref = payload.remittance_ref;
    if (payload.remittance_date !== undefined) updates.remittance_date = payload.remittance_date;
    if (payload.payment_mode !== undefined) updates.payment_mode = payload.payment_mode;
    if (payload.paymentMode !== undefined) updates.payment_mode = payload.paymentMode;

    if (isRemitted) {
      await PaymentRepository.updateRemittedRequest(prId, updates, pr.po_no, payload.expectedVersion ?? (pr as any).version ?? 1);
    } else {
      await PaymentRepository.updateRequest(prId, updates, payload.expectedVersion ?? (pr as any).version ?? 1);
    }

    const netAmt = Math.max(0, approvedAmt - tdsAmt);
    const changeDesc = isRemitted
      ? `Edited Remitted PR #${prId}. Req: ${reqAmt}, App: ${approvedAmt}, TDS: ${tdsSec} (${tdsAmt}), Net: ${netAmt}.`
      : `Edited PR #${prId}. Req: ${reqAmt}, App: ${approvedAmt}, TDS: ${tdsSec} (${tdsAmt}).`;
    await logAudit(userEmail, isRemitted ? 'Update Remitted Payment' : 'Update Payment Request', changeDesc, pr.stage);

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

    validateAmounts(Number(approvedAmount), Number(tdsAmount), Number(tdsPct));
    const oldStage = pr.stage || 'Pending Procurement';
    const isSuper = AuthService.isSuperAdmin(userEmail);
    const effectiveRoles = isSuper
      ? Array.from(new Set([...userRoles, 'admin', 'director', 'finance', 'procurement', 'proc', 'maker', 'accountant']))
      : userRoles;

    const { newStage, updates } = await ApprovalWorkflowService.getNextStage('payment_request', oldStage, effectiveRoles);

    if (oldStage === newStage) {
      throw new Error(`You do not have permission to approve this request, or it cannot be approved from its current stage (${oldStage}).`);
    }

    const reqAmt = Number(pr.amount_requested || 0);
    const diffAmt = reqAmt - approvedAmount;
    const approvalTimestamp = new Date().toISOString();
    const reasonText = tdsConfig.comments || tdsConfig.remarks || tdsConfig.reason || '';

    const auditDetailText = `Approved payment ID ${prId} (transitioned ${oldStage} → ${newStage}). Requested Amount: ₹${reqAmt.toLocaleString('en-IN')}, Approved Amount: ₹${approvedAmount.toLocaleString('en-IN')}, Difference: ₹${diffAmt.toLocaleString('en-IN')}, Approver: ${userEmail}, Timestamp: ${approvalTimestamp}${reasonText ? `, Reason: ${reasonText}` : ''}`;

    await PaymentRepository.updateRequestWithAuditAndHistory(
      prId,
      {
        ...updates,
        stage: newStage,
        approved_amount: approvedAmount,
        tds_amount: tdsAmount,
        tds_percentage: tdsPct,
        tds_section: tdsSec
      },
      {
        user: userEmail,
        action_type: 'Approve Payment',
        details: auditDetailText,
        department: oldStage
      },
      {
        entity_type: 'payment_request',
        entity_id: String(prId),
        stage_name: oldStage,
        action: 'Approved',
        performed_by: userEmail,
        remarks: auditDetailText
      },
      tdsConfig.expectedVersion ?? (pr as any).version ?? 1
    );

    return { ok: true };
  }

  /**
   * Rejects a Payment Request.
   */
  static async rejectPaymentRequest(prId: string | number, userEmail: string, userRoles: string[], rejectReason: string): Promise<{ ok: boolean }> {
    const pr = await PaymentRepository.findRequestById(prId);
    if (!pr) throw new Error(`Payment request not found: ${prId}`);

    const oldStage = pr.stage;
    const isSuper = AuthService.isSuperAdmin(userEmail);
    const effectiveRoles = isSuper
      ? Array.from(new Set([...userRoles, 'admin', 'director', 'finance', 'procurement', 'proc', 'maker', 'accountant']))
      : userRoles;

    const { newStage, updates } = await ApprovalWorkflowService.getRejectStage('payment_request', oldStage, effectiveRoles);
    const rejectRemarks = rejectReason ? (pr.remarks ? pr.remarks + ' | Reject Reason: ' + rejectReason : 'Reject Reason: ' + rejectReason) : pr.remarks;
    const auditDetailText = `Rejected payment ID ${prId} at stage ${oldStage}. Reason: ${rejectReason}`;

    await PaymentRepository.updateRequestWithAuditAndHistory(
      prId,
      {
        ...updates,
        stage: newStage,
        remarks: rejectRemarks
      },
      {
        user: userEmail,
        action_type: 'Reject Payment',
        details: auditDetailText,
        department: oldStage
      },
      {
        entity_type: 'payment_request',
        entity_id: String(prId),
        stage_name: oldStage,
        action: 'Rejected',
        performed_by: userEmail,
        remarks: `Reason: ${rejectReason}`
      },
      (pr as any).version ?? 1
    );

    return { ok: true };
  }

  /**
   * Marks a Payment Request as Remitted and records the actual Payment.
   */
  static async remitPaymentRequest(prId: string | number, payload: any, session: any): Promise<{ ok: boolean }> {
    this.requireFinance(session);
    await PaymentRepository.remitRequest(prId, payload, session.email);
    return { ok: true };
  }

  /**
   * Creates a manual payment unlinked to an approval workflow.
   */
  static async createManualPayment(payload: IPaymentInput, userEmail: string): Promise<{ ok: boolean }> {
    const amt = Number(payload.amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("Valid amount is required for manual payment");

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


    return { ok: true };
  }
}
