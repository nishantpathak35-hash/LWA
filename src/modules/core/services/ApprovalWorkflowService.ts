import { ApprovalWorkflowRepository } from '../repositories/ApprovalWorkflowRepository';

/**
 * Database-driven Approval Workflow Service.
 * Replaces the hardcoded ApprovalEngine with fully configurable workflows.
 * 
 * Supports independent workflows per module (purchase_order, payment_request, etc.)
 * with unlimited stages, configurable approver roles, and complete audit trails.
 */
export class ApprovalWorkflowService {
  // ══════════════════════════════════════════════════════════════════════
  // ── WORKFLOW CRUD ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  static async getWorkflows(moduleType?: string) {
    return ApprovalWorkflowRepository.findAll(moduleType);
  }

  static async getWorkflow(workflowId: number) {
    const workflow = await ApprovalWorkflowRepository.findById(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    const stages = await ApprovalWorkflowRepository.findStagesByWorkflow(workflowId);
    return { ...workflow, stages };
  }

  static async getActiveWorkflowForModule(moduleType: string) {
    const workflow = await ApprovalWorkflowRepository.findActiveByModule(moduleType);
    if (!workflow) return null;
    const stages = await ApprovalWorkflowRepository.findStagesByWorkflow(workflow.id);
    return { ...workflow, stages };
  }

  private static validateStages(stages: any[]) {
    if (!stages || !Array.isArray(stages)) return;
    
    const stageNames = new Set();
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const name = stage.stage_name || stage.name;
      
      if (stageNames.has(name)) {
        throw new Error(`Duplicate stage name: "${name}" creates a circular dependency risk.`);
      }
      stageNames.add(name);
      
      // If skip_conditions is used to jump, ensure it only jumps FORWARD
      if (stage.skip_conditions) {
        try {
          const skipConfig = typeof stage.skip_conditions === 'string' ? JSON.parse(stage.skip_conditions) : stage.skip_conditions;
          if (skipConfig.skip_to) {
            const targetIdx = stages.findIndex((s: any) => (s.stage_name || s.name) === skipConfig.skip_to);
            if (targetIdx !== -1 && targetIdx <= i) {
              throw new Error(`Circular dependency detected: Stage "${name}" cannot skip backward to "${skipConfig.skip_to}".`);
            }
          }
        } catch (e: any) {
          if (e.message.includes('Circular dependency')) throw e;
          // Ignore parse errors if skip_conditions is not JSON
        }
      }
    }
  }

  static async createWorkflow(payload: any, createdBy: string) {
    if (!payload.name?.trim()) throw new Error('Workflow name is required');
    if (!payload.module_type?.trim()) throw new Error('Module type is required');

    this.validateStages(payload.stages);

    const isDuplicate = await ApprovalWorkflowRepository.checkDuplicateName(payload.name.trim(), payload.module_type);
    if (isDuplicate) throw new Error(`Workflow "${payload.name}" already exists for this module`);

    const workflowId = await ApprovalWorkflowRepository.create({
      name: payload.name.trim(),
      module_type: payload.module_type,
      description: payload.description || '',
      is_active: payload.is_active ?? 0, // New workflows start inactive by default
      created_by: createdBy
    });

    // Create stages if provided
    if (payload.stages && Array.isArray(payload.stages)) {
      for (let i = 0; i < payload.stages.length; i++) {
        const stage = payload.stages[i];
        await ApprovalWorkflowRepository.createStage({
          workflow_id: workflowId,
          stage_name: stage.stage_name || stage.name,
          sequence: stage.sequence ?? (i + 1),
          approver_role: stage.approver_role || '',
          specific_user: stage.specific_user || '',
          department: stage.department || '',
          min_approval_count: stage.min_approval_count || 1,
          approval_type: stage.approval_type || 'any_one',
          comments_mandatory: stage.comments_mandatory || false,
          auto_approval: stage.auto_approval || false,
          escalation_ready: stage.escalation_ready || false,
          skip_conditions: stage.skip_conditions || ''
        });
      }
    }

    return { ok: true, workflowId };
  }

  static async updateWorkflow(workflowId: number, payload: any) {
    const existing = await ApprovalWorkflowRepository.findById(workflowId);
    if (!existing) throw new Error(`Workflow not found: ${workflowId}`);

    if (payload.stages) {
      this.validateStages(payload.stages);
    }

    if (payload.name && payload.name !== existing.name) {
      const isDuplicate = await ApprovalWorkflowRepository.checkDuplicateName(payload.name.trim(), existing.module_type, workflowId);
      if (isDuplicate) throw new Error(`Workflow "${payload.name}" already exists for this module`);
    }

    await ApprovalWorkflowRepository.update(workflowId, {
      name: payload.name?.trim(),
      description: payload.description,
      is_active: payload.is_active,
      version: (existing.version || 1) + 1
    });

    // Replace stages if provided
    if (payload.stages && Array.isArray(payload.stages)) {
      await ApprovalWorkflowRepository.deleteStagesByWorkflow(workflowId);
      for (let i = 0; i < payload.stages.length; i++) {
        const stage = payload.stages[i];
        await ApprovalWorkflowRepository.createStage({
          workflow_id: workflowId,
          stage_name: stage.stage_name || stage.name,
          sequence: stage.sequence ?? (i + 1),
          approver_role: stage.approver_role || '',
          specific_user: stage.specific_user || '',
          department: stage.department || '',
          min_approval_count: stage.min_approval_count || 1,
          approval_type: stage.approval_type || 'any_one',
          comments_mandatory: stage.comments_mandatory || false,
          auto_approval: stage.auto_approval || false,
          escalation_ready: stage.escalation_ready || false,
          skip_conditions: stage.skip_conditions || ''
        });
      }
    }

    return { ok: true };
  }

  static async deleteWorkflow(workflowId: number) {
    const existing = await ApprovalWorkflowRepository.findById(workflowId);
    if (!existing) throw new Error(`Workflow not found: ${workflowId}`);
    await ApprovalWorkflowRepository.deleteById(workflowId);
    return { ok: true };
  }

  static async cloneWorkflow(workflowId: number, createdBy: string) {
    const source = await this.getWorkflow(workflowId);
    const newId = await ApprovalWorkflowRepository.create({
      name: `${source.name} (Copy)`,
      module_type: source.module_type,
      description: source.description,
      is_active: 0,
      created_by: createdBy
    });
    for (const stage of source.stages || []) {
      await ApprovalWorkflowRepository.createStage({
        workflow_id: newId,
        stage_name: stage.stage_name,
        sequence: stage.sequence,
        approver_role: stage.approver_role,
        specific_user: stage.specific_user,
        department: stage.department,
        min_approval_count: stage.min_approval_count,
        approval_type: stage.approval_type,
        comments_mandatory: stage.comments_mandatory,
        auto_approval: stage.auto_approval,
        escalation_ready: stage.escalation_ready,
        skip_conditions: stage.skip_conditions
      });
    }
    return { ok: true, workflowId: newId };
  }

  static async activateWorkflow(workflowId: number) {
    const workflow = await ApprovalWorkflowRepository.findById(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    const stages = await ApprovalWorkflowRepository.findStagesByWorkflow(workflowId);
    if (stages.length === 0) throw new Error('Cannot activate workflow with no stages');

    // Deactivate other workflows for same module
    const others = await ApprovalWorkflowRepository.findAll(workflow.module_type);
    for (const other of others) {
      if (other.id !== workflowId && other.is_active) {
        await ApprovalWorkflowRepository.update(other.id, { is_active: 0 });
      }
    }
    await ApprovalWorkflowRepository.update(workflowId, { is_active: 1 });
    return { ok: true };
  }

  static async deactivateWorkflow(workflowId: number) {
    await ApprovalWorkflowRepository.update(workflowId, { is_active: 0 });
    return { ok: true };
  }

  static async reorderStages(workflowId: number, stageIds: number[]) {
    for (let i = 0; i < stageIds.length; i++) {
      await ApprovalWorkflowRepository.updateStage(stageIds[i], { sequence: i + 1 });
    }
    return { ok: true };
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── WORKFLOW EXECUTION ENGINE ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Dynamically determines the next approval stage based on the current stage,
   * user roles, and the active workflow configuration for the given module.
   * 
   * This replaces the hardcoded `if(stage==1) if(stage==2)` pattern.
   */
  static async getNextStage(moduleType: string, currentStage: string, userRoles: string[]): Promise<{ newStage: string; updates: Record<string, string> }> {
    const workflow = await this.getActiveWorkflowForModule(moduleType);
    if (!workflow || !workflow.stages || workflow.stages.length === 0) {
      // Fallback: no workflow configured — return current stage (no advancement)
      return { newStage: currentStage, updates: {} };
    }

    const stages = workflow.stages;
    let currentIdx = stages.findIndex((s: any) => s.stage_name === currentStage);
    if (currentIdx === -1) {
      // Unknown stage — treat as the first stage
      return { newStage: currentStage, updates: {} };
    }

    let stage = currentStage;
    const accumulatedUpdates: Record<string, string> = {};

    // Auto-advance through stages if user has sufficient permissions
    for (let i = currentIdx; i < stages.length; i++) {
      const currentStageDef = stages[i];
      const requiredRole = currentStageDef.approver_role;
      const normalizedRoles = userRoles.map((r: string) => r.toLowerCase().trim());

      // Check if user has the required role for this stage
      const hasRole = !requiredRole ||
        normalizedRoles.includes(requiredRole) ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('director');

      if (!hasRole) break;

      // Mark this stage's approval field
      const roleKey = requiredRole || 'unknown';
      accumulatedUpdates[`${roleKey}_approval`] = 'Approved';

      // Advance to next stage or final stage
      if (i + 1 < stages.length) {
        stage = stages[i + 1].stage_name;
        // Stop advancing if user doesn't have the next role (unless admin/director)
        if (!normalizedRoles.includes('admin') && !normalizedRoles.includes('director')) {
          const nextRole = stages[i + 1].approver_role;
          if (nextRole && !normalizedRoles.includes(nextRole)) break;
        }
      } else {
        // Last stage completed — mark as terminal
        stage = moduleType === 'payment_request' ? 'Ready to Remit' : 'Approved';
      }
    }

    return { newStage: stage, updates: accumulatedUpdates };
  }

  /**
   * Dynamically determines the rejection stage based on current stage and user roles.
   */
  static async getRejectStage(moduleType: string, currentStage: string, userRoles: string[]): Promise<{ newStage: string; updates: Record<string, string> }> {
    const workflow = await this.getActiveWorkflowForModule(moduleType);
    if (!workflow || !workflow.stages || workflow.stages.length === 0) {
      return { newStage: 'Rejected', updates: {} };
    }

    const stages = workflow.stages;
    const currentStageDef = stages.find((s: any) => s.stage_name === currentStage);
    if (!currentStageDef) {
      throw new Error(`Cannot reject from unknown stage: ${currentStage}`);
    }

    const normalizedRoles = userRoles.map((r: string) => r.toLowerCase().trim());
    const isAdmin = normalizedRoles.includes('admin') || normalizedRoles.includes('director');
    const requiredRole = currentStageDef.approver_role;
    const hasRole = isAdmin || normalizedRoles.includes(requiredRole);

    if (!hasRole) {
      throw new Error(`You do not have permission to reject this request from its current stage (${currentStage}).`);
    }

    // Build rejection updates for all stages
    const updates: Record<string, string> = {};
    for (const s of stages) {
      const roleKey = s.approver_role || 'unknown';
      if (s.stage_name === currentStage) {
        updates[`${roleKey}_approval`] = 'Rejected';
      } else {
        updates[`${roleKey}_approval`] = 'Pending';
      }
    }

    return { newStage: 'Rejected', updates };
  }

  /**
   * Records an approval action to the unified history table.
   */
  static async recordApproval(entityType: string, entityId: string, stageName: string, action: string, performedBy: string, remarks: string = '', workflowId?: number) {
    await ApprovalWorkflowRepository.recordHistory({
      workflow_id: workflowId,
      entity_type: entityType,
      entity_id: entityId,
      stage_name: stageName,
      action,
      performed_by: performedBy,
      remarks
    });
  }

  /**
   * Gets approval history for an entity.
   */
  static async getApprovalHistory(entityType: string, entityId: string) {
    return ApprovalWorkflowRepository.getHistory(entityType, entityId);
  }
}
