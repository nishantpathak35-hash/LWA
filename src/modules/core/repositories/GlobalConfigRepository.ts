import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';

export class GlobalConfigRepository {
  static async get(key: string): Promise<any | null> {
    return queryGet(`SELECT * FROM global_configurations WHERE config_key = ?`, [key]);
  }

  static async set(key: string, value: string, configType: string = 'string', module: string = 'global', description: string = ''): Promise<void> {
    await queryRun(
      `INSERT INTO global_configurations (config_key, config_value, config_type, module, description, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = excluded.updated_at`,
      [key, value, configType, module, description, new Date().toISOString()]
    );
  }

  static async findAll(): Promise<any[]> {
    return queryAll(`SELECT * FROM global_configurations ORDER BY module ASC, config_key ASC`);
  }

  static async findByModule(module: string): Promise<any[]> {
    return queryAll(`SELECT * FROM global_configurations WHERE module = ? ORDER BY config_key ASC`, [module]);
  }

  static async deleteByKey(key: string): Promise<void> {
    await queryRun(`DELETE FROM global_configurations WHERE config_key = ?`, [key]);
  }
}
