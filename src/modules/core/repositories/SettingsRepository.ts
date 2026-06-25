import { queryGet, queryRun } from '../../../../app/lib/db.js';
import { ISetting } from '../types/Settings';

export class SettingsRepository {
  /**
   * Retrieves a setting by key.
   */
  static async get(key: string): Promise<ISetting | null> {
    return queryGet(`SELECT * FROM app_settings WHERE key = ?`, [key]);
  }

  /**
   * Sets or updates a setting by key.
   */
  static async set(key: string, value: string): Promise<void> {
    await queryRun(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?`,
      [key, value, value]
    );
  }
}
