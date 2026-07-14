import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';

export interface IDPR {
  id?: number | string;
  project: string;
  site?: string;
  client?: string;
  date: string;
  prepared_by?: string;
  weather?: string;
  shift?: string;
  status?: string;
  approval_status?: string;
  checked_by?: string;
  approved_by?: string;
  data: string; // JSON string
  created_at?: string;
  updated_at?: string;
}

export interface IDPRTemplate {
  id?: number | string;
  name: string;
  description?: string;
  data: string; // JSON string
  created_at?: string;
}

export class DPRRepository {
  /**
   * Create a new DPR
   */
  static async createReport(dpr: Omit<IDPR, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    // Duplicate submission guard
    const existing = await queryGet(`SELECT id FROM dpr_reports WHERE project = ? AND site = ? AND date = ?`, [dpr.project || '', dpr.site || '', dpr.date || '']);
    if (existing) {
      throw new Error(`A DPR report already exists for project ${dpr.project}, site ${dpr.site || 'N/A'}, on ${dpr.date}`);
    }

    const sql = `
      INSERT INTO dpr_reports (
        project, site, client, date, prepared_by, weather, shift, status, 
        approval_status, checked_by, approved_by, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      dpr.project || '', 
      dpr.site || '', 
      dpr.client || '', 
      dpr.date || '', 
      dpr.prepared_by || '',
      dpr.weather || '', 
      dpr.shift || '', 
      dpr.status || '', 
      dpr.approval_status || 'Draft',
      dpr.checked_by || '', 
      dpr.approved_by || '', 
      dpr.data || '{}'
    ].map(p => p === undefined ? null : p);
    await queryRun(sql, params);
  }

  /**
   * Get all DPRs, with optional filters
   */
  static async getReports(filters: any = {}): Promise<IDPR[]> {
    let sql = `SELECT * FROM dpr_reports WHERE 1=1`;
    const params: any[] = [];
    
    if (filters.project) {
      sql += ` AND project = ?`;
      params.push(filters.project);
    }
    if (filters.date) {
      sql += ` AND date = ?`;
      params.push(filters.date);
    }
    if (filters.dateFrom) {
      sql += ` AND date >= ?`;
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      sql += ` AND date <= ?`;
      params.push(filters.dateTo);
    }
    if (filters.approval_status) {
      sql += ` AND approval_status = ?`;
      params.push(filters.approval_status);
    }
    
    sql += ` ORDER BY id DESC`;

    if (filters.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
      
      if (filters.offset) {
        sql += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }

    return queryAll(sql, params);
  }

  static async getReportById(id: string | number): Promise<IDPR | null> {
    return queryGet(`SELECT * FROM dpr_reports WHERE id = ?`, [id]);
  }

  static async getDPRCountForDate(project: string, date: string): Promise<number> {
    const res = await queryGet(`SELECT COUNT(*) as count FROM dpr_reports WHERE project = ? AND date = ?`, [project, date]);
    return res ? res.count : 0;
  }

  /**
   * Update an existing DPR
   */
  static async updateReport(id: string | number, updates: Partial<IDPR> & { expected_updated_at?: string }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    const expectedUpdatedAt = updates.expected_updated_at;
    
    // Auto-update timestamp
    updates.updated_at = new Date().toISOString();

    const validColumns = [
      'project', 'site', 'client', 'date', 'prepared_by', 'weather', 'shift', 
      'status', 'approval_status', 'checked_by', 'approved_by', 'data', 'updated_at'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (validColumns.includes(key) && value !== undefined && key !== 'expected_updated_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;
    let sql = `UPDATE dpr_reports SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    
    if (expectedUpdatedAt) {
      sql += ` AND (updated_at = ? OR updated_at IS NULL)`;
      values.push(expectedUpdatedAt);
    }

    const result = await queryRun(sql, values);
    
    // If we used optimistic locking and no rows were affected, throw error
    if (expectedUpdatedAt && result.changes === 0) {
      throw new Error("This report was changed by someone else. Please reload and try again.");
    }
  }

  /**
   * Delete a DPR
   */
  static async deleteReport(id: string | number): Promise<void> {
    await queryRun(`DELETE FROM dpr_reports WHERE id = ?`, [id]);
  }

  // --- Templates ---

  static async getTemplates(): Promise<IDPRTemplate[]> {
    return queryAll(`SELECT * FROM dpr_templates ORDER BY name ASC`);
  }

  static async saveTemplate(template: Omit<IDPRTemplate, 'id' | 'created_at'>): Promise<void> {
    const sql = `INSERT INTO dpr_templates (name, description, data) VALUES (?, ?, ?)`;
    await queryRun(sql, [template.name, template.description || '', template.data || '{}']);
  }

  static async updateTemplate(id: string | number, updates: Partial<IDPRTemplate>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.name !== undefined) {
      fields.push(`name = ?`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = ?`);
      values.push(updates.description);
    }
    if (updates.data !== undefined) {
      fields.push(`data = ?`);
      values.push(updates.data);
    }
    if (fields.length === 0) return;
    const sql = `UPDATE dpr_templates SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    await queryRun(sql, values);
  }

  static async deleteTemplate(id: string | number): Promise<void> {
    await queryRun(`DELETE FROM dpr_templates WHERE id = ?`, [id]);
  }
}
