import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';
import { IVendor } from '../types/Vendor';

export class VendorRepository {
  static async findAll(): Promise<IVendor[]> {
    return queryAll(`SELECT * FROM vendors`);
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
        status, address, email, bank_account, ifsc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      vendor.legal_name, vendor.trade_name || '', vendor.vendor_code, vendor.vendor_type || '', 
      vendor.pan || '', vendor.gstin || '', vendor.status || 'Active', vendor.address || '', 
      vendor.email || '', vendor.bank_account || '', vendor.ifsc || ''
    ];
    await queryRun(sql, params);
  }

  static async update(vendorCode: string, vendor: Partial<IVendor>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    // Map object to DB fields securely
    const allowedFields = ['legal_name', 'trade_name', 'gstin', 'pan', 'status', 'address', 'vendor_type', 'email', 'bank_account', 'ifsc'];
    
    Object.entries(vendor).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    const sql = `UPDATE vendors SET ${fields.join(', ')} WHERE vendor_code = ?`;
    values.push(vendorCode);

    await queryRun(sql, values);
  }
}
