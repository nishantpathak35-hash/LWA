// Domain: purchase-orders
import { queryAll, queryGet, queryRun, queryBatch } from '../../db.js';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { logAudit } from '../core.js';
import { emitBroadcast } from '../../broadcast.js';
import { createNotification } from '../notifications.js';

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

  const isSuper = AuthService.isSuperAdmin(session?.email);
  const userRoles = isSuper
    ? Array.from(new Set([...(session?.roles || []), 'admin', 'director', 'finance', 'procurement', 'proc', 'maker', 'accountant']))
    : (session?.roles || []);

  const wf = await ApprovalWorkflowService.getActiveWorkflowForModule('purchase_order');
  const initialStage = wf?.stages?.[0]?.stage_name || 'Pending Approval';
  const now = new Date().toISOString();

  await queryBatch([
    {
      sql: `UPDATE purchase_orders SET approval_status = ?, status = ?, submitted_at = ?, submitted_by = ?, approval_remarks = NULL WHERE po_no = ?`,
      args: [initialStage, initialStage, now, session?.email || 'unknown', poNo]
    },
    {
      sql: `INSERT INTO approval_history_v2 (workflow_id, entity_type, entity_id, stage_name, action, performed_by, remarks, stage_sequence, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [wf?.id || null, 'purchase_order', poNo, 'Draft', 'Submitted', session?.email || 'unknown', 'Submitted for approval', 1, '']
    },
    {
      sql: `INSERT INTO audit_logs (user, action_type, details, department, timestamp) VALUES (?, ?, ?, ?, ?)`,
      args: [session?.email || 'system', 'PO Submit for Approval', 'PO#' + poNo + ' submitted by ' + (session?.email || 'unknown'), 'Procurement', now]
    }
  ]);

  await emitBroadcast('po', 'updated', poNo);

  // Non-blocking async notification to directors
  Promise.resolve().then(async () => {
    try {
      await createNotification({
        recipientRole: 'director',
        type: 'approval_needed',
        title: `PO #${poNo} Submitted for Approval`,
        body: `${session?.name || session?.email || 'User'} submitted PO #${poNo} for ${po.vendor_name || 'vendor'} (₹${Number(po.total_amount || 0).toLocaleString('en-IN')})`,
        recordType: 'Purchase Order',
        recordId: String(poNo),
        actorName: session?.name || session?.email || 'User',
        actorEmail: session?.email || ''
      });
    } catch (e) {
      console.warn('Async PO notification error:', e.message);
    }
  });

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

  const isSuper = AuthService.isSuperAdmin(session?.email);
  const userRoles = isSuper
    ? Array.from(new Set([...(session?.roles || []), 'admin', 'director', 'finance', 'procurement', 'proc', 'maker', 'accountant']))
    : (session?.roles || []);

  let newStatus = '';
  
  if (action === 'reject') {
    const rejObj = await ApprovalWorkflowService.getRejectStage('purchase_order', currentStage, userRoles);
    newStatus = rejObj.newStage;
  } else {
    const nextObj = await ApprovalWorkflowService.getNextStage('purchase_order', currentStage, userRoles);
    newStatus = nextObj.newStage !== currentStage ? nextObj.newStage : 'Approved'; // Fallback to 'Approved' if no next stage
  }

  const now = new Date().toISOString();
  const actionLabel = newStatus === 'Rejected' ? 'Rejected' : 'Approved';

  await queryBatch([
    {
      sql: `UPDATE purchase_orders SET approval_status = ?, status = ?, approved_by = ?, approved_at = ?, approval_remarks = ? WHERE po_no = ?`,
      args: [newStatus, newStatus, session?.email || 'unknown', now, remarks || '', poNo]
    },
    {
      sql: `INSERT INTO approval_history_v2 (workflow_id, entity_type, entity_id, stage_name, action, performed_by, remarks, stage_sequence, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [null, 'purchase_order', poNo, currentStage, actionLabel, session?.email || 'unknown', remarks || '', 0, '']
    },
    {
      sql: `INSERT INTO audit_logs (user, action_type, details, department, timestamp) VALUES (?, ?, ?, ?, ?)`,
      args: [session?.email || 'system', 'PO ' + action, 'PO#' + poNo + ' ' + action + ' by ' + (session?.email || 'unknown'), 'Procurement', now]
    }
  ]);

  await emitBroadcast('po', 'updated', poNo);

  // Notify procurement asynchronously in background
  Promise.resolve().then(async () => {
    try {
      const actorName = session?.name || session?.email?.split('@')[0] || 'Approver';
      await createNotification({
        recipientRole: 'procurement',
        type: action === 'reject' ? 'rejected' : 'approved',
        title: `PO #${poNo} ${action === 'reject' ? 'Rejected' : 'Approved'}`,
        body: `${actorName} ${action === 'reject' ? 'rejected' : 'approved'} PO #${poNo}${remarks ? ': "' + remarks.substring(0, 60) + '"' : ''}`,
        recordType: 'Purchase Order',
        recordId: String(poNo),
        actorName,
        actorEmail: session?.email || ''
      });
    } catch (e) {
      console.warn('Async PO notification error:', e.message);
    }
  });

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
