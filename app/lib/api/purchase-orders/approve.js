// Domain: purchase-orders
import { queryAll, queryGet, queryRun } from '../../db.js';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { logAudit } from '../core.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}


export async function submitPOForApproval(poNo, session) {
  requireAuth(session);
  if (!poNo) throw new Error('PO Number is required');

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

  return { ok: true, poNo, status: 'Pending Approval' };
}


export async function approvePO(poNo, action, remarks, session) {
  requireAuth(session);
  if (!poNo) throw new Error('PO Number is required');
  if (!action || !['approve', 'reject'].includes(action)) throw new Error('Action must be approve or reject');


  const roles = session?.roles || [];
  const canApprove = roles.includes('director') || roles.includes('admin') || roles.includes('finance') || roles.some(r => ['procurement', 'proc', 'maker'].includes(r));
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

  // WhatsApp Notification
  try {
    const submitter = await queryGet(`SELECT whatsapp_number FROM users WHERE email = ?`, [po.submitted_by || po.created_by]);
    if (submitter?.whatsapp_number) {
      const msg = `Update: PO #${poNo} for ${po.vendor_name || 'Vendor'} has been ${newStatus} by ${session?.name || session?.email}.`;
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
