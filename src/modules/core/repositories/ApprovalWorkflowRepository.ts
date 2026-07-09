import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';

export class ApprovalWorkflowRepository {
  // ── Workflows ──
  static async findAll(moduleType?: string): Promise<any[]> {
    if (moduleType) {
      return queryAll(`SELECT * FROM approval_workflows WHERE module_type = ? AND is_archived = 0 ORDER BY created_at DESC`, [moduleType]);
    }
    return queryAll(`SELECT * FROM approval_workflows WHERE is_archived = 0 ORDER BY created_at DESC`);
  }

  static async findById(id: number): Promise<any | null> {
    return queryGet(`SELECT * FROM approval_workflows WHERE id = ?`, [id]);
  }

  static async findActiveByModule(moduleType: string): Promise<any | null> {
    return queryGet(`SELECT * FROM approval_workflows WHERE module_type = ? AND is_active = 1 AND is_archived = 0 ORDER BY id DESC LIMIT 1`, [moduleType]);
  }

  static async create(workflow: any): Promise<number> {
    const result = await queryRun(
      `INSERT INTO approval_workflows (name, module_type, description, is_active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [workflow.name, workflow.module_type, workflow.description || '', workflow.is_active ?? 1, workflow.created_by || 'system', new Date().toISOString(), new Date().toISOString()]
    );
    return result?.lastInsertRowid || 0;
  }

  static async update(id: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ['name', 'description', 'is_active', 'is_archived', 'version'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    await queryRun(`UPDATE approval_workflows SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async deleteById(id: number): Promise<void> {
    await queryRun(`DELETE FROM approval_workflow_stages WHERE workflow_id = ?`, [id]);
    await queryRun(`DELETE FROM approval_workflows WHERE id = ?`, [id]);
  }

  static async checkDuplicateName(name: string, moduleType: string, excludeId?: number): Promise<boolean> {
    const sql = excludeId
      ? `SELECT id FROM approval_workflows WHERE name = ? AND module_type = ? AND id != ? AND is_archived = 0`
      : `SELECT id FROM approval_workflows WHERE name = ? AND module_type = ? AND is_archived = 0`;
    const params = excludeId ? [name, moduleType, excludeId] : [name, moduleType];
    const row = await queryGet(sql, params);
    return !!row;
  }

  // ── Stages ──
  static async findStagesByWorkflow(workflowId: number): Promise<any[]> {
    return queryAll(`SELECT * FROM approval_workflow_stages WHERE workflow_id = ? ORDER BY sequence ASC`, [workflowId]);
  }

  static async findStageById(stageId: number): Promise<any | null> {
    return queryGet(`SELECT * FROM approval_workflow_stages WHERE id = ?`, [stageId]);
  }

  static async createStage(stage: any): Promise<number> {
    const result = await queryRun(
      `INSERT INTO approval_workflow_stages (workflow_id, stage_name, sequence, approver_role, specific_user, department, min_approval_count, approval_type, comments_mandatory, auto_approval, escalation_ready, skip_conditions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [stage.workflow_id, stage.stage_name, stage.sequence, stage.approver_role || '', stage.specific_user || '', stage.department || '',
       stage.min_approval_count || 1, stage.approval_type || 'any_one', stage.comments_mandatory ? 1 : 0,
       stage.auto_approval ? 1 : 0, stage.escalation_ready ? 1 : 0, stage.skip_conditions || '']
    );
    return result?.lastInsertRowid || 0;
  }

  static async updateStage(stageId: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ['stage_name', 'sequence', 'approver_role', 'specific_user', 'department',
      'min_approval_count', 'approval_type', 'comments_mandatory', 'auto_approval', 'escalation_ready', 'skip_conditions', 'is_active'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    values.push(stageId);
    await queryRun(`UPDATE approval_workflow_stages SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async deleteStage(stageId: number): Promise<void> {
    await queryRun(`DELETE FROM approval_workflow_stages WHERE id = ?`, [stageId]);
  }

  static async deleteStagesByWorkflow(workflowId: number): Promise<void> {
    await queryRun(`DELETE FROM approval_workflow_stages WHERE workflow_id = ?`, [workflowId]);
  }

  // ── Execution ──
  static async findExecution(entityType: string, entityId: string): Promise<any | null> {
    return queryGet(`SELECT * FROM approval_execution WHERE entity_type = ? AND entity_id = ? ORDER BY id DESC LIMIT 1`, [entityType, entityId]);
  }

  static async createExecution(exec: any): Promise<void> {
    await queryRun(
      `INSERT INTO approval_execution (workflow_id, entity_type, entity_id, current_stage_id, status)
       VALUES (?, ?, ?, ?, ?)`,
      [exec.workflow_id, exec.entity_type, exec.entity_id, exec.current_stage_id, exec.status || 'in_progress']
    );
  }

  static async updateExecution(id: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (['current_stage_id', 'status', 'completed_at'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    values.push(id);
    await queryRun(`UPDATE approval_execution SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  // ── History ──
  static async recordHistory(entry: any): Promise<void> {
    await queryRun(
      `INSERT INTO approval_history_v2 (workflow_id, entity_type, entity_id, stage_name, action, performed_by, remarks, stage_sequence, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry.workflow_id || null, entry.entity_type, entry.entity_id, entry.stage_name, entry.action,
       entry.performed_by, entry.remarks || '', entry.stage_sequence || 0, entry.metadata || '']
    );
  }

  static async getHistory(entityType: string, entityId: string): Promise<any[]> {
    return queryAll(`SELECT * FROM approval_history_v2 WHERE entity_type = ? AND entity_id = ? ORDER BY timestamp ASC`, [entityType, entityId]);
  }
}
