import { TDSRepository } from '../repositories/TDSRepository';

/**
 * Centralized TDS Configuration Service.
 * Single source of truth for all TDS section codes, rates, and thresholds.
 * Replaces hardcoded TDS_SECTIONS arrays scattered across frontend and backend.
 */
export class TDSService {
  /**
   * Gets all active TDS sections formatted for dropdown consumption.
   */
  static async getActiveSections(): Promise<any[]> {
    const sections = await TDSRepository.findAll(false);
    return sections.map(s => ({
      id: s.id,
      code: s.section_code,
      label: `${s.section_code} – ${s.description} (${s.rate}%)`,
      rate: s.rate,
      threshold: s.threshold,
      surcharge: s.surcharge,
      cess: s.cess,
      is_default: !!s.is_default,
      effective_from: s.effective_from,
      effective_to: s.effective_to
    }));
  }

  /**
   * Gets all TDS sections (including inactive) for admin management.
   */
  static async getAllSections(): Promise<any[]> {
    return TDSRepository.findAll(true);
  }

  /**
   * Gets the default TDS section configuration.
   */
  static async getDefaultSection(): Promise<any | null> {
    return TDSRepository.findDefault();
  }

  /**
   * Gets a section by its code (e.g., '194C').
   */
  static async getSectionByCode(code: string): Promise<any | null> {
    return TDSRepository.findByCode(code);
  }

  /**
   * Creates a new TDS section.
   */
  static async createSection(payload: any): Promise<any> {
    if (!payload.section_code?.trim()) throw new Error('TDS section code is required');
    
    const isDuplicate = await TDSRepository.checkDuplicateCode(payload.section_code.trim());
    if (isDuplicate) throw new Error(`TDS section "${payload.section_code}" already exists`);

    if (payload.rate !== undefined && (payload.rate < 0 || payload.rate > 100)) {
      throw new Error('TDS rate must be between 0 and 100');
    }

    const id = await TDSRepository.create({
      section_code: payload.section_code.trim().toUpperCase(),
      description: payload.description || '',
      rate: payload.rate || 0,
      threshold: payload.threshold || 0,
      surcharge: payload.surcharge || 0,
      cess: payload.cess || 0,
      effective_from: payload.effective_from || '',
      effective_to: payload.effective_to || '',
      is_active: payload.is_active ?? 1,
      is_default: payload.is_default ?? 0,
      sort_order: payload.sort_order || 999
    });

    return { ok: true, id };
  }

  /**
   * Updates an existing TDS section.
   */
  static async updateSection(sectionId: number, payload: any): Promise<any> {
    const existing = await TDSRepository.findById(sectionId);
    if (!existing) throw new Error(`TDS section not found: ${sectionId}`);

    if (payload.section_code && payload.section_code !== existing.section_code) {
      const isDuplicate = await TDSRepository.checkDuplicateCode(payload.section_code.trim(), sectionId);
      if (isDuplicate) throw new Error(`TDS section "${payload.section_code}" already exists`);
    }

    if (payload.rate !== undefined && (payload.rate < 0 || payload.rate > 100)) {
      throw new Error('TDS rate must be between 0 and 100');
    }

    await TDSRepository.update(sectionId, {
      section_code: payload.section_code?.trim().toUpperCase(),
      description: payload.description,
      rate: payload.rate,
      threshold: payload.threshold,
      surcharge: payload.surcharge,
      cess: payload.cess,
      effective_from: payload.effective_from,
      effective_to: payload.effective_to,
      is_active: payload.is_active,
      sort_order: payload.sort_order
    });

    return { ok: true };
  }

  /**
   * Soft-deletes (archives) a TDS section.
   * Existing records referencing this section code are unaffected.
   */
  static async deleteSection(sectionId: number): Promise<any> {
    const existing = await TDSRepository.findById(sectionId);
    if (!existing) throw new Error(`TDS section not found: ${sectionId}`);
    await TDSRepository.deleteById(sectionId);
    return { ok: true };
  }

  /**
   * Sets a TDS section as the default.
   * Only ONE section can be default at a time.
   */
  static async setDefault(sectionId: number): Promise<any> {
    const existing = await TDSRepository.findById(sectionId);
    if (!existing) throw new Error(`TDS section not found: ${sectionId}`);
    if (!existing.is_active) throw new Error('Cannot set an inactive section as default');
    await TDSRepository.setDefault(sectionId);
    return { ok: true };
  }

  /**
   * Toggles a TDS section active/inactive.
   */
  static async toggleStatus(sectionId: number): Promise<any> {
    const existing = await TDSRepository.findById(sectionId);
    if (!existing) throw new Error(`TDS section not found: ${sectionId}`);
    const newStatus = existing.is_active ? 0 : 1;
    // Cannot deactivate the default section
    if (existing.is_default && newStatus === 0) {
      throw new Error('Cannot deactivate the default TDS section. Set another section as default first.');
    }
    await TDSRepository.update(sectionId, { is_active: newStatus });
    return { ok: true, is_active: !!newStatus };
  }
}
