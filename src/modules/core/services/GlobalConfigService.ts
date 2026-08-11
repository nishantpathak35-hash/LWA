import { SettingsRepository } from '../repositories/SettingsRepository';

export class GlobalConfigService {
  /**
   * Retrieves a setting by key with an optional fallback.
   */
  static async getSetting(key: string, defaultValue: string = ''): Promise<string> {
    try {
      const setting = await SettingsRepository.get(key);
      return setting?.value ?? defaultValue;
    } catch (err) {
      console.error(`Failed to get setting "${key}":`, err);
      return defaultValue;
    }
  }

  /**
   * Sets or updates a setting by key.
   */
  static async setSetting(key: string, value: string): Promise<boolean> {
    try {
      await SettingsRepository.set(key, value);
      return true;
    } catch (err) {
      console.error(`Failed to set setting "${key}":`, err);
      return false;
    }
  }

  /**
   * Gets the global default TDS section code.
   */
  static async getDefaultTDS(): Promise<string> {
    return this.getSetting('default_tds', '194C');
  }

  /**
   * Sets the global default TDS section code.
   */
  static async setDefaultTDS(sectionCode: string): Promise<{ ok: boolean; sectionCode: string }> {
    const success = await this.setSetting('default_tds', sectionCode);
    return { ok: success, sectionCode };
  }

  /**
   * Gets the global PO prefix.
   */
  static async getPOPrefix(): Promise<string> {
    return this.getSetting('po_prefix', 'PO-');
  }

  /**
   * Sets the global PO prefix.
   */
  static async setPOPrefix(prefix: string): Promise<boolean> {
    return this.setSetting('po_prefix', prefix);
  }
}