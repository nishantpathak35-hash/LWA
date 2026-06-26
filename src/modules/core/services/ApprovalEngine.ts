export interface IApprovalTransition {
  fromStage: string;
  toStage: string;
  requiredRoles: string[];
  updates: Record<string, string>;
}

export class ApprovalEngine {
  private transitions: IApprovalTransition[] = [
    {
      fromStage: 'Pending Procurement',
      toStage: 'Pending Finance',
      requiredRoles: ['procurement', 'proc', 'maker', 'finance', 'director', 'admin'],
      updates: { proc_approval: 'Approved' }
    },
    {
      fromStage: 'Pending Finance',
      toStage: 'Pending Director',
      requiredRoles: ['finance', 'director', 'admin'],
      updates: { proc_approval: 'Approved', finance_approval: 'Approved' }
    },
    {
      fromStage: 'Pending Director',
      toStage: 'Ready to Remit',
      requiredRoles: ['director', 'admin'],
      updates: { proc_approval: 'Approved', finance_approval: 'Approved', director_approval: 'Approved' }
    }
  ];

  public getNextStage(currentStage: string, userRoles: string[]): { newStage: string; updates: Record<string, string> } {
    let stage = currentStage;
    let accumulatedUpdates: Record<string, string> = {};

    // Auto-advance through stages if user has higher permissions (like admin/director)
    for (let i = 0; i < this.transitions.length; i++) {
      const transition = this.transitions.find(t => t.fromStage === stage);
      if (!transition) break; // No further transitions or unknown stage

      const hasRequiredRole = transition.requiredRoles.some(role => userRoles.includes(role));
      
      if (hasRequiredRole) {
        stage = transition.toStage;
        accumulatedUpdates = { ...accumulatedUpdates, ...transition.updates };
        
        // If they only have procurement, stop after first advance.
        // If they have finance, stop after finance advance, unless they are admin/director.
        if (!userRoles.includes('director') && !userRoles.includes('admin')) {
           if (userRoles.includes('finance') && stage === 'Pending Director') break;
           if (!userRoles.includes('finance') && stage === 'Pending Finance') break;
        }
      } else {
        break; // Stop if they don't have the role for the *current* transition
      }
    }

    return { newStage: stage, updates: accumulatedUpdates };
  }

  public getRejectStage(currentStage: string, userRoles: string[]): { newStage: string; updates: Record<string, string> } {
    const isDirOrAdmin = userRoles.includes('director') || userRoles.includes('admin');
    const isFin = userRoles.includes('finance');

    let procApp = 'Pending';
    let finApp = 'Pending';
    let dirApp = 'Pending';
    let stage = 'Rejected';

    if (isDirOrAdmin) {
      dirApp = 'Rejected';
    } else if (isFin) {
      finApp = 'Rejected';
    } else {
      procApp = 'Rejected';
    }

    return {
      newStage: stage,
      updates: {
        proc_approval: procApp,
        finance_approval: finApp,
        director_approval: dirApp
      }
    };
  }
}

export const approvalEngine = new ApprovalEngine();
