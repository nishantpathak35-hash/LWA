import { AuditRepository } from '../repositories/AuditRepository';

export class AuditService {
  /**
   * Logs an action to the audit log.
   */
  static async log(user: string, actionType: string, details: string, department: string = 'System'): Promise<void> {
    try {
      await AuditRepository.insertLog({
        user,
        action_type: actionType,
        details,
        module: department
      });
    } catch (e: any) {
      console.error('Failed to log audit:', e.message);
    }
  }

  /**
   * Retrieves the most recent audit logs.
   */
  static async getRecentLogs(limit: number = 100) {
    return AuditRepository.findAllLogs(limit);
  }
}
