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

  public getNextStage(currentStage: string, userRoles: string[]): { newStage: string; updates: Record<string, string> } {
    const transition = this.transitions.find(t => t.fromStage === currentStage);
    
    if (!transition) {
      return { newStage: currentStage, updates: {} };
    }

    const hasRequiredRole = transition.requiredRoles.some(role => userRoles.includes(role));
    
    if (hasRequiredRole) {
      return { newStage: transition.toStage, updates: transition.updates };
    }
    
    return { newStage: currentStage, updates: {} };
  }

  public getRejectStage(currentStage: string, userRoles: string[]): { newStage: string; updates: Record<string, string> } {
    const isDirOrAdmin = userRoles.includes('director') || userRoles.includes('admin');
    const isFin = userRoles.includes('finance');

    let procApp = 'Pending';
    let finApp = 'Pending';
    let dirApp = 'Pending';
    let stage = 'Rejected';

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
