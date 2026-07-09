import { ApprovalWorkflowService } from './ApprovalWorkflowService';

export interface IApprovalTransition {
  fromStage: string;
  toStage: string;
  requiredRoles: string[];
  updates: Record<string, string>;
}

/**
 * ApprovalEngine — backward-compatible wrapper around ApprovalWorkflowService.
 * 
 * MIGRATION NOTE: This class previously contained hardcoded transitions.
 * It now delegates to the database-driven ApprovalWorkflowService.
 * The legacy fallback transitions are kept ONLY for the edge case where
 * the DB workflow hasn't been configured yet (fresh installs before migration).
 * 
 * All new code should use ApprovalWorkflowService directly.
 */
export class ApprovalEngine {
  // Legacy fallback — used only when no DB workflow is configured
  private static readonly LEGACY_TRANSITIONS: IApprovalTransition[] = [
    {
      fromStage: 'Pending Procurement',
      toStage: 'Pending Finance',
      requiredRoles: ['procurement', 'proc', 'maker', 'admin'],
      updates: { proc_approval: 'Approved' }
    },
    {
      fromStage: 'Pending Finance',
      toStage: 'Pending Director',
      requiredRoles: ['finance', 'admin'],
      updates: { proc_approval: 'Approved', finance_approval: 'Approved' }
    },
    {
      fromStage: 'Pending Director',
      toStage: 'Ready to Remit',
      requiredRoles: ['director', 'admin'],
      updates: { proc_approval: 'Approved', finance_approval: 'Approved', director_approval: 'Approved' }
    }
  ];

  /**
   * Determines the next approval stage. Delegates to the DB-driven workflow engine
   * for payment_request module, falls back to legacy hardcoded transitions if needed.
   */
  public getNextStage(currentStage: string, userRoles: string[]): { newStage: string; updates: Record<string, string> } {
    // Synchronous fallback for backward compat — async callers should use getNextStageAsync
    return this._legacyGetNextStage(currentStage, userRoles);
  }

  /**
   * Async version that uses the database-driven workflow engine.
   * New code should prefer this method.
   */
  public async getNextStageAsync(currentStage: string, userRoles: string[], moduleType: string = 'payment_request'): Promise<{ newStage: string; updates: Record<string, string> }> {
    try {
      const result = await ApprovalWorkflowService.getNextStage(moduleType, currentStage, userRoles);
      // If the workflow engine returned the same stage (no advancement), fall back to legacy
      if (result.newStage === currentStage && Object.keys(result.updates).length === 0) {
        return this._legacyGetNextStage(currentStage, userRoles);
      }
      return result;
    } catch (e) {
      // Fallback to legacy if DB workflow service fails
      console.warn('[ApprovalEngine] Falling back to legacy transitions:', (e as Error).message);
      return this._legacyGetNextStage(currentStage, userRoles);
    }
  }

  public getRejectStage(currentStage: string, userRoles: string[]): { newStage: string; updates: Record<string, string> } {
    // Synchronous fallback for backward compat
    return this._legacyGetRejectStage(currentStage, userRoles);
  }

  /**
   * Async version that uses the database-driven workflow engine.
   */
  public async getRejectStageAsync(currentStage: string, userRoles: string[], moduleType: string = 'payment_request'): Promise<{ newStage: string; updates: Record<string, string> }> {
    try {
      return await ApprovalWorkflowService.getRejectStage(moduleType, currentStage, userRoles);
    } catch (e) {
      // Fallback to legacy if DB workflow service fails
      console.warn('[ApprovalEngine] Falling back to legacy rejection:', (e as Error).message);
      return this._legacyGetRejectStage(currentStage, userRoles);
    }
  }

  // ── Legacy fallback methods ──
  private _legacyGetNextStage(currentStage: string, userRoles: string[]): { newStage: string; updates: Record<string, string> } {
    let stage = currentStage;
    let accumulatedUpdates: Record<string, string> = {};

    for (let i = 0; i < ApprovalEngine.LEGACY_TRANSITIONS.length; i++) {
      const transition = ApprovalEngine.LEGACY_TRANSITIONS.find(t => t.fromStage === stage);
      if (!transition) break;
      const hasRequiredRole = transition.requiredRoles.some(role => userRoles.includes(role));
      if (hasRequiredRole) {
        stage = transition.toStage;
        accumulatedUpdates = { ...accumulatedUpdates, ...transition.updates };
        if (!userRoles.includes('director') && !userRoles.includes('admin')) {
          if (userRoles.includes('finance') && stage === 'Pending Director') break;
          if (!userRoles.includes('finance') && stage === 'Pending Finance') break;
        }
      } else {
        break;
      }
    }
    return { newStage: stage, updates: accumulatedUpdates };
  }

  private _legacyGetRejectStage(currentStage: string, userRoles: string[]): { newStage: string; updates: Record<string, string> } {
    const isDirOrAdmin = userRoles.includes('director') || userRoles.includes('admin');
    const isFin = userRoles.includes('finance');

    let procApp = 'Pending';
    let finApp = 'Pending';
    let dirApp = 'Pending';

    if (userRoles.includes('admin')) {
      dirApp = 'Rejected';
    } else if (isDirOrAdmin && currentStage === 'Pending Director') {
      dirApp = 'Rejected';
    } else if (isFin && currentStage === 'Pending Finance') {
      finApp = 'Rejected';
    } else if ((userRoles.includes('procurement') || userRoles.includes('proc') || userRoles.includes('maker')) && currentStage === 'Pending Procurement') {
      procApp = 'Rejected';
    } else {
      throw new Error(`You do not have permission to reject this request from its current stage (${currentStage}).`);
    }

    return {
      newStage: 'Rejected',
      updates: {
        proc_approval: procApp,
        finance_approval: finApp,
        director_approval: dirApp
      }
    };
  }
}

export const approvalEngine = new ApprovalEngine();

