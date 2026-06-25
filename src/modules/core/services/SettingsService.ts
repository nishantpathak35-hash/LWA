import { SettingsRepository } from '../repositories/SettingsRepository';
import { ICompanySettings } from '../types/Settings';
import fs from 'fs';
import path from 'path';

export class SettingsService {
  /**
   * Retrieves the combined company settings.
   */
  static async getCompanySettings(): Promise<ICompanySettings> {
    const nameRec = await SettingsRepository.get('company_name');
    const addrRec = await SettingsRepository.get('company_address');
    const gstinRec = await SettingsRepository.get('company_gstin');
    
    let logo = '';
    try {
      logo = fs.readFileSync(path.join(process.cwd(), 'scratch', 'logo_uri.txt'), 'utf8');
    } catch (e) {
      const logoRec = await SettingsRepository.get('company_logo');
      logo = logoRec ? logoRec.value : '';
    }
    
    return {
      name: nameRec ? nameRec.value : 'LuxeWorx',
      address: addrRec ? addrRec.value : '123 Luxe Avenue, Mumbai, MH 400001',
      gstin: gstinRec ? gstinRec.value : '27AAACL1234Z1Z5',
      logo
    };
  }

  /**
   * Updates multiple company settings.
   */
  static async updateCompanySettings(settings: Partial<ICompanySettings>): Promise<{ ok: boolean }> {
    if (settings.name !== undefined) await SettingsRepository.set('company_name', settings.name);
    if (settings.address !== undefined) await SettingsRepository.set('company_address', settings.address);
    if (settings.gstin !== undefined) await SettingsRepository.set('company_gstin', settings.gstin);
    
    if (settings.logo !== undefined) {
      await SettingsRepository.set('company_logo', settings.logo);
      try {
        const scratchDir = path.join(process.cwd(), 'scratch');
        if (!fs.existsSync(scratchDir)) {
          fs.mkdirSync(scratchDir, { recursive: true });
        }
        fs.writeFileSync(path.join(scratchDir, 'logo_uri.txt'), settings.logo, 'utf8');
      } catch (e: any) {
        console.error("Failed to write logo to file:", e.message);
      }
    }
    
    return { ok: true };
  }
}
