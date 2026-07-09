// Domain: workflow
import { queryAll, queryGet, queryRun } from '../db.js';
import { AuthService } from '../../../src/modules/core/services/AuthService';
import { ApprovalWorkflowService } from '../../../src/modules/core/services/ApprovalWorkflowService';
import { logAudit } from './core.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

function requireAdmin(session) {
  AuthService.requireAdminConsole(session);
}

export async function getApprovalWorkflows(moduleType, session) {
  requireAuth(session);
  const workflows = await ApprovalWorkflowService.getWorkflows(moduleType || undefined);
  // Attach stages to each workflow
  const result = [];
  for (const wf of workflows) {
    const full = await ApprovalWorkflowService.getWorkflow(wf.id);
    result.push(full);
  }
  return result;
}

export async function getApprovalWorkflow(workflowId, session) {
  requireAuth(session);
  return ApprovalWorkflowService.getWorkflow(workflowId);
}

export async function createApprovalWorkflow(payload, session) {
  requireAdmin(session);
  const result = await ApprovalWorkflowService.createWorkflow(payload, session.email);
  await logAudit(session.email, 'Create Workflow', `Created workflow "${payload.name}" for ${payload.module_type}`, 'System');
  return result;
}

export async function updateApprovalWorkflow(workflowId, payload, session) {
  requireAdmin(session);
  const result = await ApprovalWorkflowService.updateWorkflow(workflowId, payload);
  await logAudit(session.email, 'Update Workflow', `Updated workflow #${workflowId}`, 'System');
  return result;
}

export async function deleteApprovalWorkflow(workflowId, session) {
  requireAdmin(session);
  const result = await ApprovalWorkflowService.deleteWorkflow(workflowId);
  await logAudit(session.email, 'Delete Workflow', `Deleted workflow #${workflowId}`, 'System');
  return result;
}

export async function cloneApprovalWorkflow(workflowId, session) {
  requireAdmin(session);
  const result = await ApprovalWorkflowService.cloneWorkflow(workflowId, session.email);
  await logAudit(session.email, 'Clone Workflow', `Cloned workflow #${workflowId} → #${result.workflowId}`, 'System');
  return result;
}

export async function activateApprovalWorkflow(workflowId, session) {
  requireAdmin(session);
  const result = await ApprovalWorkflowService.activateWorkflow(workflowId);
  await logAudit(session.email, 'Activate Workflow', `Activated workflow #${workflowId}`, 'System');
  return result;
}

export async function deactivateApprovalWorkflow(workflowId, session) {
  requireAdmin(session);
  const result = await ApprovalWorkflowService.deactivateWorkflow(workflowId);
  await logAudit(session.email, 'Deactivate Workflow', `Deactivated workflow #${workflowId}`, 'System');
  return result;
}

export async function reorderWorkflowStages(workflowId, stageIds, session) {
  requireAdmin(session);
  const result = await ApprovalWorkflowService.reorderStages(workflowId, stageIds);
  await logAudit(session.email, 'Reorder Stages', `Reordered stages for workflow #${workflowId}`, 'System');
  return result;
}
