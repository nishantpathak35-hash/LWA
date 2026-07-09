import { GlobalConfigRepository } from '../repositories/GlobalConfigRepository';
import { TDSService } from './TDSService';

/**
 * Global Configuration Service.
 * Central access point for all cross-module configuration settings.
 */
export class GlobalConfigService {
  /**
   * Gets a configuration value by key.
   */
  static async getConfig(key: string): Promise<string | null> {
    const row = await GlobalConfigRepository.get(key);
    return row?.config_value ?? null;
  }

  /**
   * Sets a configuration value.
   */
  static async setConfig(key: string, value: string, options?: { type?: string; module?: string; description?: string }) {
    await GlobalConfigRepository.set(key, value, options?.type || 'string', options?.module || 'global', options?.description || '');
    return { ok: true };
  }

  /**
   * Gets all configurations, optionally filtered by module.
   */
  static async getAllConfigs(module?: string) {
    return module ? GlobalConfigRepository.findByModule(module) : GlobalConfigRepository.findAll();
  }

  /**
   * Gets the default TDS section code from global config.
   * Falls back to '194C' if not configured.
   */
  static async getDefaultTDSCode(): Promise<string> {
    const config = await GlobalConfigRepository.get('default_tds_section');
    return config?.config_value || '194C';
  }

  /**
   * Gets the full default TDS section details.
   */
  static async getDefaultTDS(): Promise<any> {
    const code = await this.getDefaultTDSCode();
    const section = await TDSService.getSectionByCode(code);
    return section || { section_code: code, rate: 2, description: 'Default' };
  }

  /**
   * Sets the default TDS section in global config.
   */
  static async setDefaultTDS(sectionCode: string) {
    await GlobalConfigRepository.set('default_tds_section', sectionCode, 'string', 'global', 'Default TDS section for new records');
    return { ok: true };
  }
}
