// Domain: purchase-orders
import { queryAll, queryGet, queryRun } from '../../db.js';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { logAudit } from '../core.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}


import { ApprovalWorkflowService } from '../../../../src/modules/core/services/ApprovalWorkflowService';

export async function submitPOForApproval(poNo, session) {
  requireAuth(session);
  if (!poNo) throw new Error('PO Number is required');

  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) throw new Error('PO not found: ' + poNo);
  const st = String(po.approval_status || po.status || 'Draft').toLowerCase();
  if (st !== 'draft' && st !== 'rejected') {
    throw new Error(`PO is already in status "${po.approval_status || po.status}" and cannot be submitted again.`);
  }

  // Get initial workflow stage
  const nextStageObj = await ApprovalWorkflowService.getNextStage('purchase_order', 'Draft', session?.roles || []);
  const initialStage = nextStageObj.newStage !== 'Draft' ? nextStageObj.newStage : 'Pending Approval';

  await queryRun(
    `UPDATE purchase_orders SET approval_status = ?, status = ?, submitted_by = ?, submitted_at = ? WHERE po_no = ?`,
    [initialStage, initialStage, session?.email || 'unknown', new Date().toISOString(), poNo]
  );
  
  await ApprovalWorkflowService.recordApproval('purchase_order', poNo, 'Draft', 'Submitted for Approval', session?.email || 'unknown', 'Submitted by creator');
  await logAudit(session?.email || 'system', 'PO Submitted', 'PO#' + poNo + ' submitted for approval', 'Procurement');

  // WhatsApp Notification
  try {
    const approvers = await queryAll(`SELECT whatsapp_number FROM users WHERE roles LIKE '%director%' OR roles LIKE '%admin%'`);
    for (const approver of approvers) {
      if (approver.whatsapp_number) {
        const msg = `Action Required: PO #${poNo} for ${po.vendor_name || 'Vendor'} is pending your approval. Amount: ${po.net_payable_amount || po.total_amount || 0}`;
        await queryRun(`INSERT INTO whatsapp_outbox (phone, message) VALUES (?, ?)`, [approver.whatsapp_number, msg]);
      }
    }
  } catch (error) {
    console.error('WhatsApp notification failed:', error.message);
  }

  return { ok: true, poNo, status: initialStage };
}

export async function approvePO(poNo, action, remarks, session) {
  requireAuth(session);
  if (!poNo) throw new Error('PO Number is required');
  if (!action || !['approve', 'reject'].includes(action)) throw new Error('Action must be approve or reject');

  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) throw new Error('PO not found: ' + poNo);
  
  const currentStage = po.approval_status || po.status || 'Draft';
  if (currentStage === 'Approved' || currentStage === 'Rejected' || currentStage === 'Draft') {
    throw new Error(`PO cannot be approved/rejected from current status: ${currentStage}`);
  }

  let newStatus = '';
  
  if (action === 'reject') {
    const rejObj = await ApprovalWorkflowService.getRejectStage('purchase_order', currentStage, session?.roles || []);
    newStatus = rejObj.newStage;
  } else {
    const nextObj = await ApprovalWorkflowService.getNextStage('purchase_order', currentStage, session?.roles || []);
    newStatus = nextObj.newStage !== currentStage ? nextObj.newStage : 'Approved'; // Fallback to 'Approved' if no next stage
  }

  const now = new Date().toISOString();

  await queryRun(
    `UPDATE purchase_orders SET approval_status = ?, status = ?, approved_by = ?, approved_at = ?, approval_remarks = ? WHERE po_no = ?`,
    [newStatus, newStatus, session?.email || 'unknown', now, remarks || '', poNo]
  );
  
  await ApprovalWorkflowService.recordApproval('purchase_order', poNo, currentStage, newStatus === 'Rejected' ? 'Rejected' : 'Approved', session?.email || 'unknown', remarks || '');
  await logAudit(session?.email || 'system', 'PO ' + action, 'PO#' + poNo + ' ' + action + ' by ' + (session?.email || 'unknown'), 'Procurement');

  // WhatsApp Notification
  try {
    const submitter = await queryGet(`SELECT whatsapp_number FROM users WHERE email = ?`, [po.submitted_by || po.created_by]);
    if (submitter?.whatsapp_number) {
      const msg = `Update: PO #${poNo} for ${po.vendor_name || 'Vendor'} has been ${action === 'approve' ? 'Approved' : 'Rejected'} by ${session?.name || session?.email}.`;
      await queryRun(`INSERT INTO whatsapp_outbox (phone, message) VALUES (?, ?)`, [submitter.whatsapp_number, msg]);
    }
  } catch (error) {
    console.error('WhatsApp notification failed:', error.message);
  }

  return { ok: true, poNo, status: newStatus };
}

export async function addPOComment(poNo, comment, session) {
  requireAuth(session);
  if (!poNo) throw new Error('PO Number is required');
  if (!comment) throw new Error('Comment text is required');
  

  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) throw new Error('PO not found: ' + poNo);

  await queryRun(
    `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [poNo, 'Commented', session?.email || 'unknown', comment, new Date().toISOString()]
  );
  
  await logAudit(session?.email || 'system', 'PO Comment', 'PO#' + poNo + ' comment added by ' + (session?.email || 'unknown'), 'Procurement');
  return { ok: true, poNo, action: 'commented' };
}
