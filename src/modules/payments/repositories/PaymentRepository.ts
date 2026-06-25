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

  static async findAllRequests(filters: any = {}): Promise<IPaymentRequest[]> {
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

  static async updateRequest(prId: string | number, updates: Partial<IPaymentRequest> & Record<string, any>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;
    const sql = `UPDATE payment_requests SET ${fields.join(', ')} WHERE pr_id = ?`;
    values.push(prId);
    await queryRun(sql, values);
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
      await queryRun(
        `INSERT INTO system_payments (po_no, pr_key, amount, remitted_by, created_at) VALUES (?, ?, ?, ?, ?)`,
        [payment.po_no, payment.reference_no || `SYS-${Date.now()}`, payment.amount, payment.recorded_by, new Date().toISOString()]
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
