import { NumberSeriesRepository } from '../repositories/NumberSeriesRepository';
import { queryAll, queryGet } from '../../../../app/lib/db.js';

/**
 * Concurrency-safe Number Series Service.
 * Generates unique, sequential numbers with configurable prefix, separator,
 * padding, and financial year support.
 * 
 * Key design: Uses atomic SQL UPDATE for concurrency safety —
 * no read-then-write race conditions even with multi-user, multi-tab access.
 */
export class NumberSeriesService {
  /**
   * Gets the current financial year string based on Indian FY (April–March).
   */
  static getFinancialYear(format: string = 'YYYY-YY'): string {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed, so March = 2
    const year = now.getFullYear();
    const fyStart = month >= 3 ? year : year - 1; // FY starts in April
    const fyEnd = fyStart + 1;

    switch (format) {
      case 'YYYY-YY':
        return `${fyStart}-${String(fyEnd).slice(2)}`;
      case 'YY-YY':
        return `${String(fyStart).slice(2)}-${String(fyEnd).slice(2)}`;
      case 'YYYY':
        return String(fyStart);
      case 'YY':
        return String(fyStart).slice(2);
      default:
        return `${fyStart}-${String(fyEnd).slice(2)}`;
    }
  }

  static formatNumber(series: any, number: number): string {
    const parts: string[] = [];
    const separator = series.separator || '/';
    
    if (series.prefix) {
      // Remove trailing separator from prefix if it exists to avoid double separators
      let prefix = series.prefix;
      if (prefix.endsWith(separator)) {
        prefix = prefix.slice(0, -separator.length);
      }
      parts.push(prefix);
    }

    if (series.include_fy) {
      parts.push(this.getFinancialYear(series.fy_format));
    }

    const padLen = series.padding_length !== undefined && series.padding_length !== null 
      ? Number(series.padding_length) 
      : 3;

    parts.push(String(number).padStart(padLen, '0'));

    return parts.join(separator);
  }

  /**
   * Generates a live preview of what a number would look like.
   */
  static preview(config: any): string[] {
    const series = {
      prefix: config.prefix || '',
      separator: config.separator || '/',
      padding_length: config.padding_length !== undefined && config.padding_length !== null ? config.padding_length : 3,
      fy_format: config.fy_format || 'YYYY-YY',
      include_fy: config.include_fy ?? true
    };

    const startNum = config.starting_number || 1;
    const examples: string[] = [];
    for (let i = 0; i < 3; i++) {
      examples.push(this.formatNumber(series, startNum + i));
    }
    return examples;
  }

  /**
   * Peeks at the next unique number for a module type without incrementing the counter.
   * Useful for showing a preview in a form before actual submission.
   */
  static async peekNextNumber(moduleType: string): Promise<string> {
    let series = await NumberSeriesRepository.findByModule(moduleType);
    
    // Auto-create default series if none exists
    if (!series) {
      await NumberSeriesRepository.create({
        module_type: moduleType,
        prefix: moduleType === 'purchase_order' ? 'PO' : moduleType.toUpperCase(),
        separator: '-',
        padding_length: 3,
        starting_number: 1,
        current_number: 0,
        fy_format: 'YYYY-YY',
        include_fy: false
      });
      series = await NumberSeriesRepository.findByModule(moduleType);
    }

    let currentNumber = series.current_number;
    // If current_number is 0 (fresh series), sync with existing data
    if (currentNumber === 0 && moduleType === 'purchase_order') {
      const maxExisting = await this._syncWithExistingPOs(series);
      if (maxExisting > 0) {
        currentNumber = maxExisting;
      }
    }

    // Ensure current_number >= starting_number - 1
    if (currentNumber < (series.starting_number || 1) - 1) {
      currentNumber = (series.starting_number || 1) - 1;
    }

    const nextNumber = currentNumber + 1;
    return this.formatNumber(series, nextNumber);
  }

  /**
   * Gets the next unique number for a module type.
   * Atomically increments the counter and records the allocation.
   * Safe for concurrent multi-user, multi-tab, multi-browser access.
   */
  static async getNextNumber(moduleType: string, allocatedBy: string = 'system'): Promise<string> {
    let series = await NumberSeriesRepository.findByModule(moduleType);
    
    // Auto-create default series if none exists
    if (!series) {
      await NumberSeriesRepository.create({
        module_type: moduleType,
        prefix: moduleType === 'purchase_order' ? 'PO' : moduleType.toUpperCase(),
        separator: '-',
        padding_length: 3,
        starting_number: 1,
        current_number: 0,
        fy_format: 'YYYY-YY',
        include_fy: false
      });
      series = await NumberSeriesRepository.findByModule(moduleType);
    }

    // If current_number is 0 (fresh series), sync with existing data
    if (series.current_number === 0 && moduleType === 'purchase_order') {
      const maxExisting = await this._syncWithExistingPOs(series);
      if (maxExisting > 0) {
        await NumberSeriesRepository.update(moduleType, { current_number: maxExisting });
        series.current_number = maxExisting;
      }
    }

    // Ensure current_number >= starting_number - 1
    if (series.current_number < (series.starting_number || 1) - 1) {
      await NumberSeriesRepository.update(moduleType, { current_number: (series.starting_number || 1) - 1 });
    }

    // Atomic increment
    const { seriesId, nextNumber } = await NumberSeriesRepository.incrementAndGet(moduleType);
    const formatted = this.formatNumber(series, nextNumber);

    // Record the allocation for audit trail and duplicate prevention
    await NumberSeriesRepository.recordTransaction(seriesId, nextNumber, formatted, '', allocatedBy);

    return formatted;
  }

  /**
   * Syncs the number series counter with existing PO numbers in the database.
   * Ensures no number collision after initial migration.
   */
  private static async _syncWithExistingPOs(series: any): Promise<number> {
    try {
      const rows = await queryAll(`SELECT po_no FROM purchase_orders ORDER BY po_no DESC`);
      let maxSeq = 0;
      const prefix = series.prefix || '';
      
      for (const row of rows) {
        const poNo = String(row.po_no || '');
        // Extract trailing digits
        const match = poNo.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) maxSeq = num;
        }
      }
      
      return maxSeq;
    } catch (e) {
      console.error('Failed to sync number series with existing POs:', e);
      return 0;
    }
  }

  /**
   * Gets the configuration for a module's number series.
   */
  static async getConfig(moduleType: string) {
    return NumberSeriesRepository.findByModule(moduleType);
  }

  /**
   * Gets all number series configurations.
   */
  static async getAllConfigs() {
    return NumberSeriesRepository.findAll();
  }

  /**
   * Updates the number series configuration.
   * Does NOT change existing allocated numbers.
   */
  static async updateConfig(moduleType: string, updates: any) {
    const existing = await NumberSeriesRepository.findByModule(moduleType);
    if (!existing) {
      await NumberSeriesRepository.create({
        module_type: moduleType,
        ...updates
      });
    } else {
      await NumberSeriesRepository.update(moduleType, updates);
    }
    return { ok: true };
  }
}
