import { queryAll, queryGet, queryRun, queryTransaction } from '../../../../app/lib/db.js';
import { IPayment, IPaymentRequest } from '../types/Payment';

export class PaymentRepository {
  static async validateInvoiceLink(invoiceId: string, poNo: string): Promise<void> {
    const invoice = await queryGet('SELECT * FROM invoices WHERE invoice_id = ? OR id = ?', [invoiceId, Number(invoiceId) || -1]);
    if (!invoice || String(invoice.po_no).trim().toLowerCase() !== poNo.trim().toLowerCase()) {
      throw new Error('Invoice must belong to the selected purchase order');
    }
  }

  static async recomputePO(poNo: string, db: any): Promise<void> {
    const po = await db.queryGet('SELECT po_value, revised_po_value FROM purchase_orders WHERE po_no = ?', [poNo]);
    if (!po) throw new Error(`Purchase order not found: ${poNo}`);
    const gross = await db.queryGet(`SELECT COALESCE(SUM(COALESCE(approved_amount, amount_requested, 0)), 0) total FROM payment_requests WHERE po_no = ? AND (LOWER(stage) = 'remitted' OR LOWER(remittance) = 'remitted')`, [poNo]);
    const manual = await db.queryGet(`SELECT COALESCE(SUM(amount), 0) total FROM system_payments WHERE po_no = ? AND (pr_key IS NULL OR pr_key LIKE 'MANUAL-%')`, [poNo]);
    const total = Number(gross.total) + Number(manual.total);
    const value = Number(po.revised_po_value ?? po.po_value ?? 0);
    await db.queryRun('UPDATE purchase_orders SET legacy_paid = ?, final_payable = ?, payment_status = ? WHERE po_no = ?',
      [total, Math.max(0, value - total), value > 0 && total >= value ? 'Fully Paid' : total > 0 ? 'Partially Paid' : 'Unpaid', poNo]);
  }

  static async deleteRequestWithAudit(prId: string | number, reason: string, email: string): Promise<void> {
    await queryTransaction(async (db: any) => {
      const pr = await db.queryGet('SELECT * FROM payment_requests WHERE pr_id = ?', [prId]);
      if (!pr) throw new Error('Payment request not found.');
      const payments = await db.queryAll('SELECT * FROM system_payments WHERE CAST(pr_key AS TEXT) = ?', [String(prId)]);
      const history = await db.queryAll("SELECT * FROM approval_history_v2 WHERE entity_type = 'payment_request' AND entity_id = ?", [String(prId)]);
      await db.queryRun('INSERT INTO audit_logs (user, action_type, details, department, timestamp) VALUES (?, ?, ?, ?, ?)',
        [email, 'DELETE_PAYMENT_REQUEST', JSON.stringify({ prId, reason, request: pr, payments, history }), 'Finance', new Date().toISOString()]);
      await db.queryRun('DELETE FROM system_payments WHERE CAST(pr_key AS TEXT) = ?', [String(prId)]);
      await db.queryRun('DELETE FROM payment_requests WHERE pr_id = ?', [prId]);
      if (pr.po_no) await this.recomputePO(pr.po_no, db);
    });
  }
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
    if (filters.vendor_id) {
      sql += ` AND vendor_id = ?`;
      params.push(filters.vendor_id);
    }
    if (filters.vendor_code) {
      sql += ` AND vendor_code = ?`;
      params.push(filters.vendor_code);
    }
    sql += ` ORDER BY pr_id DESC`;
    const limit = options?.limit === 0 || options?.limit === undefined ? 100000 : options.limit;
    const offset = options?.offset ?? 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return queryAll(sql, params);
  }

  static async createRequest(pr: Omit<IPaymentRequest, 'created_at' | 'id'>): Promise<void> {
    const sql = `
      INSERT INTO payment_requests (
        po_no, vendor_id, vendor_code, vendor_name, project, category, amount_requested, approved_amount, stage, remittance, created_at, remarks, created_by,
        tds_amount, tds_percentage, tds_section, invoice_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      pr.po_no, pr.vendor_id || null, pr.vendor_code || '', pr.vendor_name, pr.project, pr.category || '', pr.amount_requested, pr.approved_amount,
      pr.stage, pr.remittance || '', new Date().toISOString(), pr.remarks || '', pr.created_by,
      pr.tds_amount || 0, pr.tds_percentage || 0, pr.tds_section || '', pr.invoice_id || null
    ];
    await queryRun(sql, params);
  }

  static async updateRemittedRequest(
    prId: string | number,
    updates: Partial<IPaymentRequest> & Record<string, any>,
    poNo: string,
    expectedVersion?: number
  ): Promise<void> {
    await queryTransaction(async (db: any) => {
      const validColumns = new Set([
        'po_no', 'vendor_id', 'vendor_code', 'vendor_name', 'project', 'category', 'amount_requested', 'approved_amount',
        'stage', 'remittance', 'remarks', 'created_by',
        'tds_amount', 'tds_percentage', 'tds_section', 'invoice_id',
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

      if (fields.length > 0) {
        fields.push('version = COALESCE(version, 1) + 1');
        let sql = `UPDATE payment_requests SET ${fields.join(', ')} WHERE pr_id = ?`;
        values.push(prId);
        if (expectedVersion !== undefined && expectedVersion !== null) {
          sql += ' AND COALESCE(version, 1) = ?';
          values.push(expectedVersion);
        }
        const result = await db.queryRun(sql, values);
        if (expectedVersion !== undefined && expectedVersion !== null && result?.rowsAffected === 0) {
          throw new Error('CONFLICT: This payment request was modified by another user since you last loaded it. Please reload and try again.');
        }
      }

      const updatedPr = await db.queryGet('SELECT * FROM payment_requests WHERE pr_id = ?', [prId]);
      if (updatedPr) {
        const netAmt = Math.max(0, Number(updatedPr.approved_amount ?? updatedPr.amount_requested ?? 0) - Number(updatedPr.tds_amount ?? 0));
        const sysUpdates = ['amount = ?'];
        const sysValues = [netAmt];
        if (updates.remittance_ref !== undefined) {
          sysUpdates.push('utr_ref = ?');
          sysValues.push(updates.remittance_ref);
        }
        if (updates.remittance_date !== undefined) {
          sysUpdates.push('payment_date = ?');
          sysValues.push(updates.remittance_date);
        }
        sysValues.push(String(prId), String(prId));
        await db.queryRun(
          `UPDATE system_payments SET ${sysUpdates.join(', ')} WHERE CAST(pr_key AS TEXT) = ? OR reference_no = ?`,
          sysValues
        );

        const targetPo = updates.po_no || updatedPr.po_no || poNo;
        if (targetPo) {
          await this.recomputePO(targetPo, db);
        }
        if (poNo && targetPo && poNo !== targetPo) {
          await this.recomputePO(poNo, db);
        }
      }
    });
  }

  static async updateRequest(prId: string | number, updates: Partial<IPaymentRequest> & Record<string, any>, expectedVersion?: number): Promise<void> {
    // P0-6: Column allowlist — prevents SQL injection if raw client payload is ever passed
    const validColumns = new Set([
      'po_no', 'vendor_id', 'vendor_code', 'vendor_name', 'project', 'category', 'amount_requested', 'approved_amount',
      'stage', 'remittance', 'remarks', 'created_by',
      'tds_amount', 'tds_percentage', 'tds_section', 'invoice_id',
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
   * Atomically updates a payment request, records the audit log, and registers approval history in a single ACID transaction.
   */
  static async updateRequestWithAuditAndHistory(
    prId: string | number,
    updates: Partial<IPaymentRequest> & Record<string, any>,
    auditEntry: { user: string; action_type: string; details: string; department?: string },
    historyEntry: { entity_type: string; entity_id: string; stage_name: string; action: string; performed_by: string; remarks?: string },
    expectedVersion: number
  ): Promise<void> {
    const validColumns = new Set([
      'po_no', 'vendor_id', 'vendor_code', 'vendor_name', 'project', 'category', 'amount_requested', 'approved_amount',
      'stage', 'remittance', 'remarks', 'created_by',
      'tds_amount', 'tds_percentage', 'tds_section', 'invoice_id',
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

    fields.push(`version = COALESCE(version, 1) + 1`);
    const updateSql = `UPDATE payment_requests SET ${fields.join(', ')} WHERE pr_id = ? AND COALESCE(version, 1) = ?`;
    values.push(prId, expectedVersion);

    const now = new Date().toISOString();
    const batchStatements = [
      { sql: updateSql, args: values },
      {
        sql: `INSERT INTO audit_logs (user, action_type, details, department, timestamp) VALUES (?, ?, ?, ?, ?)`,
        args: [auditEntry.user || 'System', auditEntry.action_type, auditEntry.details, auditEntry.department || 'Finance', now]
      },
      {
        sql: `INSERT INTO approval_history_v2 (workflow_id, entity_type, entity_id, stage_name, action, performed_by, remarks, stage_sequence, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [null, historyEntry.entity_type, historyEntry.entity_id, historyEntry.stage_name, historyEntry.action, historyEntry.performed_by, historyEntry.remarks || '', 0, '']
      }
    ];

    await queryTransaction(async (db: any) => {
      const result = await db.queryRun(batchStatements[0].sql, batchStatements[0].args);
      if (result.rowsAffected !== 1) throw new Error('CONFLICT: This payment request changed. Reload and try again.');
      for (const statement of batchStatements.slice(1)) await db.queryRun(statement.sql, statement.args);
    });
  }

  /**
   * ----------------- PAYMENTS (REMITTANCES) -----------------
   */

  static async createPayment(payment: Omit<IPayment, 'created_at' | 'id'>, scopedDb?: any): Promise<void> {
    if (!scopedDb) {
      return queryTransaction(async (db: any) => {
        await this.createPayment(payment, db);
        await this.recomputePO(payment.po_no, db);
        await db.queryRun('INSERT INTO audit_logs (user, action_type, details, department, timestamp) VALUES (?, ?, ?, ?, ?)',
          [payment.recorded_by, 'Manual Payment Added', JSON.stringify(payment), 'Finance', new Date().toISOString()]);
      });
    }
    const queryRun = scopedDb.queryRun;
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
      const inserted = await queryRun(sql, params);
      
      await queryRun(
        `INSERT INTO system_payments (po_no, pr_key, amount, remitted_by, created_at) VALUES (?, ?, ?, ?, ?)`,
        [payment.po_no, `MANUAL-${inserted.lastInsertRowid}`, payment.amount, payment.recorded_by, new Date().toISOString()]
      );
    } else {
      // Bug 3b: persist utr_ref + other fields added by Bug 3a migration
      await queryRun(
        `INSERT INTO system_payments (po_no, pr_key, amount, remitted_by, created_at, utr_ref, bank_name, payment_mode, remarks, reference_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [payment.po_no, payment.reference_no || `SYS-${Date.now()}`, payment.amount, payment.recorded_by, new Date().toISOString(), payment.utr_ref || '', payment.bank_name || '', payment.payment_mode || 'Bank Transfer', payment.remarks || '', payment.reference_no || '']
      );
    }
  }

  static async remitRequest(prId: string | number, payload: any, email: string): Promise<void> {
    await queryTransaction(async (db: any) => {
      const pr = await db.queryGet('SELECT * FROM payment_requests WHERE pr_id = ?', [prId]);
      if (!pr) throw new Error(`Payment request not found: ${prId}`);
      const ref = String(payload.utrRef || payload.referenceNo || '').trim();
      const date = payload.paymentDate || new Date().toISOString().split('T')[0];
      const amount = Number(payload.amount);
      const net = Number(pr.approved_amount ?? pr.amount_requested) - Number(pr.tds_amount || 0);
      if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(net) || Math.abs(amount - net) > 0.005) {
        throw new Error('Remittance amount must equal the approved net amount');
      }
      const existing = await db.queryGet('SELECT * FROM system_payments WHERE CAST(pr_key AS TEXT) = ?', [String(prId)]);
      if (pr.stage === 'Remitted' && existing && Number(existing.amount) === amount && String(existing.utr_ref || '') === ref && String(pr.remittance_date || '') === date) return;
      if (existing || pr.stage !== 'Ready to Remit') throw new Error('Payment already remitted or not Ready to Remit; reload before continuing.');
      if (payload.expectedVersion != null && Number(payload.expectedVersion) !== Number(pr.version ?? 1)) throw new Error('CONFLICT: Payment request changed.');
      const result = await db.queryRun(`UPDATE payment_requests SET remittance = 'Remitted', stage = 'Remitted', remittance_ref = ?, remittance_date = ?, remarks = ?, version = COALESCE(version, 1) + 1 WHERE pr_id = ? AND stage = 'Ready to Remit' AND COALESCE(version, 1) = ?`,
        [ref, date, [pr.remarks, payload.remarks].filter(Boolean).join(' | '), prId, pr.version ?? 1]);
      if (result.rowsAffected !== 1) throw new Error('CONFLICT: Payment request changed.');
      await this.createPayment({ po_no: pr.po_no, payment_date: date, amount, payment_mode: payload.paymentMode || 'Bank Transfer', utr_ref: ref, bank_name: payload.bankName || '', reference_no: String(prId), remarks: payload.remarks || '', payment_type: 'system', recorded_by: email, status: 'paid' }, db);
      await this.recomputePO(pr.po_no, db);
      await db.queryRun('INSERT INTO audit_logs (user, action_type, details, department, timestamp) VALUES (?, ?, ?, ?, ?)',
        [email, 'Remit Payment', `Remitted PR #${prId}; amount ${amount}; reference ${ref}`, 'Finance', new Date().toISOString()]);
    });
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
