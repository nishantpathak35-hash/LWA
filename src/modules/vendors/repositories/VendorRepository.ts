import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';
import { IVendor } from '../types/Vendor';

export class VendorRepository {
  static async findAll(options?: { limit?: number; offset?: number }): Promise<IVendor[]> {
    const limit = options?.limit === 0 || options?.limit === undefined ? 100000 : options.limit;
    const offset = options?.offset ?? 0;
    return queryAll(`SELECT * FROM vendors ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, offset]);
  }

  static async countAll(): Promise<number> {
    const row = await queryGet(`SELECT COUNT(*) as total FROM vendors`);
    return Number(row?.total || 0);
  }

  static async findById(id: number): Promise<IVendor | null> {
    return queryGet(`SELECT * FROM vendors WHERE id = ?`, [id]);
  }

  static async findByNameOrCode(identifier: string): Promise<IVendor | null> {
    return queryGet(`SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ? OR trade_name = ?`, [identifier, identifier, identifier]);
  }

  static async create(vendor: Omit<IVendor, 'id' | 'created_at'>): Promise<void> {
    const sql = `
      INSERT INTO vendors (
        legal_name, trade_name, vendor_code, vendor_type, pan, gstin, 
        status, address, email, bank_account, ifsc,
        primary_contact_name, primary_contact_no,
        accounts_contact_name, accounts_contact_no,
        purchase_contact_name, purchase_contact_no,
        mobile_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      vendor.legal_name, vendor.trade_name || '', vendor.vendor_code, vendor.vendor_type || '', 
      vendor.pan || '', vendor.gstin || '', vendor.status || 'Active', vendor.address || '', 
      vendor.email || '', vendor.bank_account || '', vendor.ifsc || '',
      vendor.primary_contact_name || '', vendor.primary_contact_no || '',
      vendor.accounts_contact_name || '', vendor.accounts_contact_no || '',
      vendor.purchase_contact_name || '', vendor.purchase_contact_no || '',
      vendor.mobile_number || ''
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
      'mobile_number'
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

  static async findDuplicate(
    legalName?: string,
    tradeName?: string,
    gstin?: string,
    pan?: string,
    exclude?: { id?: number; vendorCode?: string; legalName?: string } | string
  ): Promise<IVendor | null> {
    const cleanLegal = (legalName || '').trim().toLowerCase();
    const cleanTrade = (tradeName || '').trim().toLowerCase();
    const cleanGstin = (gstin || '').trim().toLowerCase();
    const cleanPan = (pan || '').trim().toLowerCase();

    if (!cleanLegal && !cleanTrade && !cleanGstin && !cleanPan) return null;

    const conditions: string[] = [];
    const params: any[] = [];

    if (cleanLegal) {
      conditions.push(`LOWER(TRIM(legal_name)) = ?`);
      params.push(cleanLegal);
    }
    if (cleanTrade) {
      conditions.push(`LOWER(TRIM(trade_name)) = ?`);
      params.push(cleanTrade);
    }
    if (cleanGstin) {
      conditions.push(`LOWER(TRIM(gstin)) = ?`);
      params.push(cleanGstin);
    }
    if (cleanPan) {
      conditions.push(`LOWER(TRIM(pan)) = ?`);
      params.push(cleanPan);
    }

    let sql = `SELECT * FROM vendors WHERE (${conditions.join(' OR ')})`;

    if (typeof exclude === 'string' && exclude) {
      sql += ` AND LOWER(TRIM(vendor_code)) != ? AND LOWER(TRIM(legal_name)) != ?`;
      params.push(exclude.trim().toLowerCase(), exclude.trim().toLowerCase());
    } else if (typeof exclude === 'object' && exclude) {
      if (exclude.id) {
        sql += ` AND id != ?`;
        params.push(exclude.id);
      }
      if (exclude.vendorCode) {
        sql += ` AND LOWER(TRIM(vendor_code)) != ?`;
        params.push(exclude.vendorCode.trim().toLowerCase());
      }
      if (exclude.legalName) {
        sql += ` AND LOWER(TRIM(legal_name)) != ?`;
        params.push(exclude.legalName.trim().toLowerCase());
      }
    }

    sql += ` LIMIT 1`;

    return queryGet(sql, params);
  }

  static async getLinkedRecordsCount(vendorCode: string, legalName?: string): Promise<{ poCount: number, prCount: number }> {
    const code = (vendorCode || '').trim();
    const name = (legalName || '').trim();

    const poRow = await queryGet(
      `SELECT COUNT(*) as cnt FROM purchase_orders WHERE LOWER(TRIM(vendor_key)) = ? OR (LOWER(TRIM(vendor_name)) = ? AND ? != '')`,
      [code.toLowerCase(), name.toLowerCase(), name]
    );

    const prRow = await queryGet(
      `SELECT COUNT(*) as cnt FROM payment_requests WHERE LOWER(TRIM(vendor_name)) = ? OR LOWER(TRIM(vendor_name)) = ?`,
      [code.toLowerCase(), name.toLowerCase()]
    );

    return {
      poCount: Number(poRow?.cnt) || 0,
      prCount: Number(prRow?.cnt) || 0
    };
  }

  static async delete(vendorCode: string): Promise<void> {
    await queryRun(`DELETE FROM vendors WHERE vendor_code = ? OR id = ?`, [vendorCode, Number(vendorCode) || -1]);
  }
}
