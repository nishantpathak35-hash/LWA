import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';

export class NumberSeriesRepository {
  static async findByModule(moduleType: string): Promise<any | null> {
    return queryGet(`SELECT * FROM number_series WHERE module_type = ?`, [moduleType]);
  }

  static async findAll(): Promise<any[]> {
    return queryAll(`SELECT * FROM number_series ORDER BY module_type ASC`);
  }

  static async create(series: any): Promise<void> {
    await queryRun(
      `INSERT INTO number_series (module_type, prefix, separator, padding_length, starting_number, current_number, fy_format, include_fy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [series.module_type, series.prefix || '', series.separator || '/', series.padding_length || 6,
       series.starting_number || 1, series.current_number || 0, series.fy_format || 'YYYY-YY', series.include_fy ? 1 : 0]
    );
  }

  static async update(moduleType: string, updates: any): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ['prefix', 'separator', 'padding_length', 'starting_number', 'current_number', 'fy_format', 'include_fy', 'is_active'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(moduleType);
    await queryRun(`UPDATE number_series SET ${fields.join(', ')} WHERE module_type = ?`, values);
  }

  /**
   * Atomically increment and return the next number.
   * Uses UPDATE ... SET current_number = current_number + 1 for concurrency safety.
   */
  static async incrementAndGet(moduleType: string): Promise<{ seriesId: number; nextNumber: number }> {
    // Atomic increment
    await queryRun(
      `UPDATE number_series SET current_number = current_number + 1, updated_at = ? WHERE module_type = ?`,
      [new Date().toISOString(), moduleType]
    );
    const series = await queryGet(`SELECT id, current_number FROM number_series WHERE module_type = ?`, [moduleType]);
    if (!series) throw new Error(`Number series not configured for: ${moduleType}`);
    return { seriesId: series.id, nextNumber: series.current_number };
  }

  static async recordTransaction(seriesId: number, allocatedNumber: number, formattedNumber: string, entityId: string, allocatedBy: string): Promise<void> {
    await queryRun(
      `INSERT INTO number_series_transactions (series_id, allocated_number, formatted_number, entity_id, allocated_by)
       VALUES (?, ?, ?, ?, ?)`,
      [seriesId, allocatedNumber, formattedNumber, entityId, allocatedBy]
    );
  }

  static async getLatestTransaction(seriesId: number): Promise<any | null> {
    return queryGet(`SELECT * FROM number_series_transactions WHERE series_id = ? ORDER BY id DESC LIMIT 1`, [seriesId]);
  }

  static async checkDuplicate(formattedNumber: string): Promise<boolean> {
    const row = await queryGet(`SELECT id FROM number_series_transactions WHERE formatted_number = ?`, [formattedNumber]);
    return !!row;
  }
}
