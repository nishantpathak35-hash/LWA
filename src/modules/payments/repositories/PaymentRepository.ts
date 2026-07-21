import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';
import { IPayment, IPaymentRequest } from '../types/Payment';

export class PaymentRepository {
  /**
   * ----------------- PAYMENT REQUESTS -----------------
   */

  static async findRequestById(prId: string | number): Promise<IPaymentRequest | null> {
    return queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [prId]);
  }

  static async findActiveRequestsByPOAndAmount(poNo: string, amount: number): Promise<IPaymentRequest[]> {
    return queryAll(
      `SELECT * FROM payment_requests WHERE LOWER(TRIM(po_no)) = ? AND amount_requested = ? AND (remittance IS NULL OR remittance != 'Remitted')`,
      [poNo.trim().toLowerCase(), amount]
    );
  }

  static async findAllRequests(filters: any = {}, options?: { limit?: number; offset?: number }): Promise<IPaymentRequest[]> {
    let sql = `SELECT * FROM payment_requests WHERE 1=1`;
    const params: any[] = [];
    if (filters.po_no) {
      sql += ` AND po_no = ?`;
      params.push(filters.po_no);
    }
    if (filters.vendor_code) {
      sql += ` AND vendor_code = ?`;
      params.push(filters.vendor_code);
    }
    sql += ` ORDER BY pr_id DESC`;
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return queryAll(sql, params);
  }

  static async createRequest(pr: Omit<IPaymentRequest, 'created_at' | 'id'>): Promise<void> {
    const sql = `
      INSERT INTO payment_requests (
        po_no, vendor_name, project, category, amount_requested, approved_amount, stage, remittance, created_at, remarks, created_by, vendor_code,
        tds_amount, tds_percentage, tds_section
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      pr.po_no, pr.vendor_name, pr.project, pr.category || '', pr.amount_requested, pr.approved_amount,
      pr.stage, pr.remittance || '', new Date().toISOString(), pr.remarks || '', pr.created_by, pr.vendor_code || '',
      pr.tds_amount || 0, pr.tds_percentage || 0, pr.tds_section || ''
    ];
    await queryRun(sql, params);
  }

  static async updateRequest(prId: string | number, updates: Partial<IPaymentRequest> & Record<string, any>, expectedVersion?: number): Promise<void> {
    // P0-6: Column allowlist — prevents SQL injection if raw client payload is ever passed
    const validColumns = new Set([
      'po_no', 'vendor_name', 'project', 'category', 'amount_requested', 'approved_amount',
      'stage', 'remittance', 'remarks', 'created_by', 'vendor_code',
      'tds_amount', 'tds_percentage', 'tds_section',
      'remittance_ref', 'remittance_date',
      'proc_approval', 'finance_approval', 'director_approval'
    ]);

    const fields: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'version' && validColumns.has(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    // Always increment version on update
    fields.push(`version = COALESCE(version, 1) + 1`);

    let sql = `UPDATE payment_requests SET ${fields.join(', ')} WHERE pr_id = ?`;
    values.push(prId);

    // Optimistic concurrency: if expectedVersion is provided, require it to match
    if (expectedVersion !== undefined && expectedVersion !== null) {
      sql += ` AND COALESCE(version, 1) = ?`;
      values.push(expectedVersion);
    }

    const result = await queryRun(sql, values);

    if (expectedVersion !== undefined && expectedVersion !== null && result?.rowsAffected === 0) {
      throw new Error('CONFLICT: This payment request was modified by another user since you last loaded it. Please reload and try again.');
    }
  }

  /**
   * ----------------- PAYMENTS (REMITTANCES) -----------------
   */

  static async createPayment(payment: Omit<IPayment, 'created_at' | 'id'>): Promise<void> {
    const isManual = payment.payment_type === 'manual';
    if (isManual) {
      const sql = `
        INSERT INTO manual_payments (
          po_no, payment_date, amount, payment_mode, utr_ref, bank_name, reference_no, remarks, payment_type, recorded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        payment.po_no, payment.payment_date, payment.amount, payment.payment_mode, payment.utr_ref || '',
        payment.bank_name || '', payment.reference_no || '', payment.remarks || '', payment.payment_type || 'manual',
        payment.recorded_by, new Date().toISOString()
      ];
      await queryRun(sql, params);
      
      await queryRun(
        `INSERT INTO system_payments (po_no, pr_key, amount, remitted_by, created_at) VALUES (?, ?, ?, ?, ?)`,
        [payment.po_no, `MANUAL-${Date.now()}`, payment.amount, payment.recorded_by, new Date().toISOString()]
      );
    } else {
      // Bug 3b: persist utr_ref + other fields added by Bug 3a migration
      await queryRun(
        `INSERT INTO system_payments (po_no, pr_key, amount, remitted_by, created_at, utr_ref, bank_name, payment_mode, remarks, reference_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [payment.po_no, payment.reference_no || `SYS-${Date.now()}`, payment.amount, payment.recorded_by, new Date().toISOString(), payment.utr_ref || '', payment.bank_name || '', payment.payment_mode || 'Bank Transfer', payment.remarks || '', payment.reference_no || '']
      );
    }
  }

  static async findPaymentsByPO(poNo: string): Promise<any[]> {
    // Return combined or just manual for now, assuming api.js logic
    const manual = await queryAll(`SELECT * FROM manual_payments WHERE po_no = ? ORDER BY created_at DESC`, [poNo]);
    const system = await queryAll(`SELECT * FROM system_payments WHERE po_no = ? ORDER BY created_at DESC`, [poNo]);
    return [...manual, ...system];
  }

  static async findAllPayments(): Promise<any[]> {
    const manual = await queryAll(`SELECT * FROM manual_payments ORDER BY created_at DESC`);
    const system = await queryAll(`SELECT * FROM system_payments ORDER BY created_at DESC`);
    return [...manual, ...system];
  }
}
