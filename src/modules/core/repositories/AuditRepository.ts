import { queryAll, queryRun } from '../../../../app/lib/db.js';
import { IAuditLog } from '../types/Audit';

export class AuditRepository {
  /**
   * Insert a new audit log.
   */
  static async insertLog(log: Omit<IAuditLog, 'id' | 'timestamp'>): Promise<void> {
    await queryRun(
      `INSERT INTO audit_logs (user, action_type, details, department, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [log.user || 'System', log.action_type, log.details, log.module || 'System', new Date().toISOString()]
    );
  }

  /**
   * Retrieve all audit logs.
   */
  static async findAllLogs(limit: number = 100): Promise<IAuditLog[]> {
    return queryAll(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`, [limit]);
  }
}
