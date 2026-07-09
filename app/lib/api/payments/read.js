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

