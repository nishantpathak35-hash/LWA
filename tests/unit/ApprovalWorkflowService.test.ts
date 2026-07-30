import { describe, it, expect, vi } from 'vitest';
import { ApprovalWorkflowService } from '../../src/modules/core/services/ApprovalWorkflowService';
import { ApprovalWorkflowRepository } from '../../src/modules/core/repositories/ApprovalWorkflowRepository';

describe('ApprovalWorkflowService tests', () => {
  describe('validateStages via createWorkflow', () => {
    it('throws error when stage names are duplicated', async () => {
      const payload = {
        name: 'Duplicate Stage Workflow',
        module_type: 'purchase_order',
        stages: [
          { stage_name: 'Stage 1', approver_role: 'proc' },
          { stage_name: 'Stage 1', approver_role: 'finance' },
        ],
      };

      await expect(
        ApprovalWorkflowService.createWorkflow(payload, 'admin@luxe.com')
      ).rejects.toThrow('Duplicate stage name');
    });

    it('throws error when workflow name is empty', async () => {
      await expect(
        ApprovalWorkflowService.createWorkflow({ name: '', module_type: 'po' }, 'admin@luxe.com')
      ).rejects.toThrow('Workflow name is required');
    });
  });

  describe('getNextStage execution logic', () => {
    it('returns default stage if no active workflow found', async () => {
      vi.spyOn(ApprovalWorkflowRepository, 'findActiveByModule').mockResolvedValue(null as any);
      
      const result = await ApprovalWorkflowService.getNextStage('purchase_order', 'Draft', ['proc']);
      expect(result).toEqual({ newStage: 'Draft', updates: {} });
    });

    it('advances to next stage when user has required role', async () => {
      vi.spyOn(ApprovalWorkflowRepository, 'findActiveByModule').mockResolvedValue({
        id: 1,
        name: 'Test Workflow',
        module_type: 'payment_request',
        is_active: 1,
      } as any);

      vi.spyOn(ApprovalWorkflowRepository, 'findStagesByWorkflow').mockResolvedValue([
        { stage_name: 'Pending Procurement', sequence: 1, approver_role: 'proc' },
        { stage_name: 'Pending Finance', sequence: 2, approver_role: 'finance' },
        { stage_name: 'Pending Director', sequence: 3, approver_role: 'director' },
      ] as any);

      const result = await ApprovalWorkflowService.getNextStage('payment_request', 'Pending Procurement', ['proc']);
      expect(result.newStage).toBe('Pending Finance');
      expect(result.updates).toHaveProperty('proc_approval', 'Approved');
    });

    it('admin/director can auto-advance through all stages to terminal stage', async () => {
      vi.spyOn(ApprovalWorkflowRepository, 'findActiveByModule').mockResolvedValue({
        id: 1,
        name: 'Test Workflow',
        module_type: 'payment_request',
        is_active: 1,
      } as any);

      vi.spyOn(ApprovalWorkflowRepository, 'findStagesByWorkflow').mockResolvedValue([
        { stage_name: 'Pending Procurement', sequence: 1, approver_role: 'proc' },
        { stage_name: 'Pending Finance', sequence: 2, approver_role: 'finance' },
      ] as any);

      const result = await ApprovalWorkflowService.getNextStage('payment_request', 'Pending Procurement', ['director']);
      expect(result.newStage).toBe('Ready to Remit');
    });
  });
});
