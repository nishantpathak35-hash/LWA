import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';
import { IVendor } from '../types/Vendor';

export class VendorRepository {
  static async findAll(options?: { limit?: number; offset?: number }): Promise<IVendor[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    return queryAll(`SELECT * FROM vendors LIMIT ? OFFSET ?`, [limit, offset]);
  }

  static async findById(id: number): Promise<IVendor | null> {
    return queryGet(`SELECT * FROM vendors WHERE id = ?`, [id]);
  }

  static async findByNameOrCode(identifier: string): Promise<IVendor | null> {
    return queryGet(`SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?`, [identifier, identifier]);
  }

  static async create(vendor: Omit<IVendor, 'id' | 'created_at'>): Promise<void> {
    const sql = `
      INSERT INTO vendors (
        legal_name, trade_name, vendor_code, vendor_type, pan, gstin, 
        status, address, email, bank_account, ifsc,
        primary_contact_name, primary_contact_no,
        accounts_contact_name, accounts_contact_no,
        purchase_contact_name, purchase_contact_no,
        whatsapp_number, mobile_number, preferred_whatsapp_contact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      vendor.legal_name, vendor.trade_name || '', vendor.vendor_code, vendor.vendor_type || '', 
      vendor.pan || '', vendor.gstin || '', vendor.status || 'Active', vendor.address || '', 
      vendor.email || '', vendor.bank_account || '', vendor.ifsc || '',
      vendor.primary_contact_name || '', vendor.primary_contact_no || '',
      vendor.accounts_contact_name || '', vendor.accounts_contact_no || '',
      vendor.purchase_contact_name || '', vendor.purchase_contact_no || '',
      vendor.whatsapp_number || '', vendor.mobile_number || '', vendor.preferred_whatsapp_contact || 'Primary'
    ];
    await queryRun(sql, params);
  }

  static async update(vendorCode: string, vendor: Partial<IVendor>, expectedVersion?: number): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    // Map object to DB fields securely
    const allowedFields = [
      'legal_name', 'trade_name', 'gstin', 'pan', 'status', 'address', 'vendor_type', 
      'email', 'bank_account', 'ifsc', 'primary_contact_name', 'primary_contact_no',
      'accounts_contact_name', 'accounts_contact_no', 'purchase_contact_name', 'purchase_contact_no',
      'whatsapp_number', 'mobile_number', 'preferred_whatsapp_contact'
    ];
    
    Object.entries(vendor).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    // Always increment version on update
    fields.push(`version = COALESCE(version, 1) + 1`);

    let sql = `UPDATE vendors SET ${fields.join(', ')} WHERE vendor_code = ?`;
    values.push(vendorCode);

    // Optimistic concurrency: if expectedVersion is provided, require it to match
    if (expectedVersion !== undefined && expectedVersion !== null) {
      sql += ` AND COALESCE(version, 1) = ?`;
      values.push(expectedVersion);
    }

    const result = await queryRun(sql, values);

    // Check if the update matched any rows
    if (expectedVersion !== undefined && expectedVersion !== null && result?.rowsAffected === 0) {
      throw new Error('CONFLICT: This vendor was modified by another user since you last loaded it. Please reload and try again.');
    }
  }
}
