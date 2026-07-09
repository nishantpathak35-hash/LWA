import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';

export class TDSRepository {
  static async findAll(includeInactive: boolean = false): Promise<any[]> {
    const sql = includeInactive
      ? `SELECT * FROM tds_sections WHERE is_archived = 0 ORDER BY sort_order ASC, section_code ASC`
      : `SELECT * FROM tds_sections WHERE is_active = 1 AND is_archived = 0 ORDER BY sort_order ASC, section_code ASC`;
    return queryAll(sql);
  }

  static async findById(id: number): Promise<any | null> {
    return queryGet(`SELECT * FROM tds_sections WHERE id = ?`, [id]);
  }

  static async findByCode(code: string): Promise<any | null> {
    return queryGet(`SELECT * FROM tds_sections WHERE section_code = ? AND is_archived = 0`, [code]);
  }

  static async findDefault(): Promise<any | null> {
    return queryGet(`SELECT * FROM tds_sections WHERE is_default = 1 AND is_active = 1 AND is_archived = 0 LIMIT 1`);
  }

  static async create(section: any): Promise<number> {
    const result = await queryRun(
      `INSERT INTO tds_sections (section_code, description, rate, threshold, surcharge, cess, effective_from, effective_to, is_active, is_default, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [section.section_code, section.description || '', section.rate || 0, section.threshold || 0,
       section.surcharge || 0, section.cess || 0, section.effective_from || '', section.effective_to || '',
       section.is_active ?? 1, section.is_default ?? 0, section.sort_order || 999]
    );
    return result?.lastInsertRowid || 0;
  }

  static async update(id: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ['section_code', 'description', 'rate', 'threshold', 'surcharge', 'cess',
      'effective_from', 'effective_to', 'is_active', 'is_archived', 'is_default', 'sort_order'];
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
    await queryRun(`UPDATE tds_sections SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async deleteById(id: number): Promise<void> {
    // Soft delete — archive instead of hard delete
    await queryRun(`UPDATE tds_sections SET is_archived = 1, is_active = 0, is_default = 0, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]);
  }

  static async clearDefault(): Promise<void> {
    await queryRun(`UPDATE tds_sections SET is_default = 0 WHERE is_default = 1`);
  }

  static async setDefault(id: number): Promise<void> {
    await queryRun(`UPDATE tds_sections SET is_default = 0 WHERE is_default = 1`);
    await queryRun(`UPDATE tds_sections SET is_default = 1, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]);
  }

  static async checkDuplicateCode(code: string, excludeId?: number): Promise<boolean> {
    const sql = excludeId
      ? `SELECT id FROM tds_sections WHERE section_code = ? AND id != ? AND is_archived = 0`
      : `SELECT id FROM tds_sections WHERE section_code = ? AND is_archived = 0`;
    const params = excludeId ? [code, excludeId] : [code];
    const row = await queryGet(sql, params);
    return !!row;
  }
}
