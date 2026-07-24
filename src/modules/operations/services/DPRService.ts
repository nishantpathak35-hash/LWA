import { DPRRepository, IDPR, IDPRTemplate } from '../repositories/DPRRepository';
import { SettingsRepository } from '../../core/repositories/SettingsRepository';
import { AuthService } from '../../core/services/AuthService';

export class DPRService {
  /**
   * Submit a new DPR
   */
  static async submitDPR(dpr: Omit<IDPR, 'id'>, user: any): Promise<void> {
    if (!dpr.project || !dpr.date) {
      throw new Error("Project and date are required.");
    }

    dpr.prepared_by = user?.email || user?.name || 'Unknown User';
    
    // Ensure nested JSON is stringified if passed as object
    let dataObj = typeof dpr.data === 'object' ? dpr.data : JSON.parse(dpr.data || '{}');
    
    // Validate manpower count
    if (dataObj.floors && Array.isArray(dataObj.floors)) {
      dataObj.floors.forEach((floor: any) => {
        if (floor.manpower && Array.isArray(floor.manpower)) {
          floor.manpower.forEach((mp: any) => {
            const count = parseInt(mp.count);
            if (isNaN(count) || count < 0) {
              throw new Error("Manpower count must be a non-negative integer.");
            }
            mp.count = count;
          });
        }
      });
    }

    // Auto-numbering sequential ID generation
    const settingsRec = await SettingsRepository.get('dpr_settings');
    const settings = settingsRec ? JSON.parse(settingsRec.value) : null;
    if (settings && settings.autoNumbering) {
      const count = await DPRRepository.getDPRCountForDate(dpr.project, dpr.date);
      const seq = count + 1;
      const formattedSeq = seq < 10 ? `0${seq}` : `${seq}`;
      let format = settings.numberingFormat || 'DPR-{project}-{date}-{seq}';
      const seqId = format
        .replace('{project}', dpr.project)
        .replace('{date}', dpr.date)
        .replace('{seq}', formattedSeq);
      dataObj.seqId = seqId;
    }

    dpr.data = JSON.stringify(dataObj);

    await DPRRepository.createReport(dpr);
    // Future: we can integrate ApprovalWorkflowService here if needed.
  }

  /**
   * Get all DPRs for the dashboard / history view
   */
  static async listDPRs(filters: any = {}): Promise<IDPR[]> {
    const reports = await DPRRepository.getReports(filters);
    
    // Parse JSON data for convenience
    return reports.map(r => ({
      ...r,
      data: r.data ? JSON.parse(r.data) : {}
    }));
  }

  /**
   * Get single DPR by ID
   */
  static async getDPR(id: string): Promise<IDPR | null> {
    const report = await DPRRepository.getReportById(id);
    if (!report) return null;
    return {
      ...report,
      data: report.data ? JSON.parse(report.data) : {}
    };
  }

  /**
   * Update DPR (Edit or Approval workflow changes)
   */
  static async updateDPR(id: string, updates: Partial<IDPR> & { expected_updated_at?: string }, user: any): Promise<void> {
    if (updates.project === "") throw new Error("Project cannot be empty.");
    if (updates.date === "") throw new Error("Date cannot be empty.");

    if (updates.data) {
      let dataObj = typeof updates.data === 'object' ? updates.data : JSON.parse(updates.data);
      // Validate manpower count
      if (dataObj.floors && Array.isArray(dataObj.floors)) {
        dataObj.floors.forEach((floor: any) => {
          if (floor.manpower && Array.isArray(floor.manpower)) {
            floor.manpower.forEach((mp: any) => {
              const count = parseInt(mp.count);
              if (isNaN(count) || count < 0) {
                throw new Error("Manpower count must be a non-negative integer.");
              }
              mp.count = count;
            });
          }
        });
      }
      updates.data = JSON.stringify(dataObj);
    }
    
    // Auto-stamp approver/checker if status changes
    if (updates.approval_status === 'Approved' && !updates.approved_by) {
      // Authorization Check
      const isApprover = DPRService.checkApprover(user);
      if (!isApprover) {
        throw new Error("You do not have permission to approve this report.");
      }
      updates.approved_by = user?.email || user?.name || 'System';
    } else if (updates.approval_status === 'Checked' && !updates.checked_by) {
      updates.checked_by = user?.email || user?.name || 'System';
    }

    await DPRRepository.updateReport(id, updates);
  }

  static checkApprover(user: any): boolean {
    if (!user) return false;
    if (AuthService.isSuperAdmin(user.email)) return true;
    if (user.is_admin) return true;
    const roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
    return roles.some((r: string) => ['admin', 'director', 'approver', 'manager', 'finance'].includes(String(r).toLowerCase()));
  }

  /**
   * Delete DPR
   */
  static async deleteDPR(id: string, user?: any): Promise<void> {
    // Authorization Check
    const isApprover = DPRService.checkApprover(user);
    if (!isApprover) {
      throw new Error("Only an approver or admin can delete reports.");
    }
    await DPRRepository.deleteReport(id);
  }

  // --- Templates ---
  
  static async listTemplates(): Promise<IDPRTemplate[]> {
    const templates = await DPRRepository.getTemplates();
    return templates.map(t => ({
      ...t,
      data: t.data ? JSON.parse(t.data) : {}
    }));
  }

  static async createTemplate(template: any): Promise<void> {
    if (typeof template.data === 'object') {
      template.data = JSON.stringify(template.data);
    }
    await DPRRepository.saveTemplate(template);
  }

  static async updateTemplate(id: string, updates: any, user: any): Promise<void> {
    // Auth check
    const isAdmin = DPRService.checkApprover(user);
    if (!isAdmin) throw new Error("Unauthorized to modify templates.");

    if (updates.data && typeof updates.data === 'object') {
      updates.data = JSON.stringify(updates.data);
    }
    await DPRRepository.updateTemplate(id, updates);
  }

  static async deleteTemplate(id: string, user: any): Promise<void> {
    // Auth check
    const isAdmin = DPRService.checkApprover(user);
    if (!isAdmin) throw new Error("Unauthorized to delete templates.");

    await DPRRepository.deleteTemplate(id);
  }

  static async getDPRSettings(): Promise<any> {
    const rec = await SettingsRepository.get('dpr_settings');
    if (!rec) {
      return {
        whatsappRecipients: '',
        weatherOptions: 'Normal, Rainy, Windy, Extreme Heat',
        shiftOptions: 'Day, Night',
        statusOptions: 'Normal, Delayed, Critical',
        autoNumbering: false,
        numberingFormat: 'DPR-{project}-{date}-{seq}'
      };
    }
    return JSON.parse(rec.value);
  }

  static async saveDPRSettings(settings: any): Promise<void> {
    await SettingsRepository.set('dpr_settings', JSON.stringify(settings));
  }
}
