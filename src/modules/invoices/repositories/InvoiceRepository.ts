import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';
import { IInvoice } from '../types/Invoice';

export class InvoiceRepository {
  static async findById(invoiceId: string): Promise<IInvoice | null> {
    return queryGet(`SELECT * FROM invoices WHERE invoice_id = ? OR id = ?`, [invoiceId, Number(invoiceId) || -1]);
  }

  static async findByPO(poNo: string): Promise<IInvoice[]> {
    return queryAll(`SELECT * FROM invoices WHERE LOWER(TRIM(po_no)) = ? ORDER BY id DESC`, [poNo.trim().toLowerCase()]);
  }

  static async findByVendor(vendorCode: string, filters: any = {}): Promise<IInvoice[]> {
    let sql = `SELECT * FROM invoices WHERE (vendor_code = ? OR LOWER(TRIM(vendor_code)) = ?)`;
    const params: any[] = [vendorCode, vendorCode.trim().toLowerCase()];

    if (filters.status) {
      sql += ` AND LOWER(status) = ?`;
      params.push(String(filters.status).trim().toLowerCase());
    }

    sql += ` ORDER BY id DESC`;
    if (filters.limit) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(Number(filters.limit), Number(filters.offset || 0));
    }

    return queryAll(sql, params);
  }

  static async findAll(filters: any = {}): Promise<IInvoice[]> {
    let sql = `SELECT * FROM invoices WHERE 1=1`;
    const params: any[] = [];

    if (filters.status) {
      sql += ` AND LOWER(status) = ?`;
      params.push(String(filters.status).trim().toLowerCase());
    }
    if (filters.vendorCode) {
      sql += ` AND LOWER(vendor_code) = ?`;
      params.push(String(filters.vendorCode).trim().toLowerCase());
    }
    if (filters.poNo) {
      sql += ` AND LOWER(po_no) = ?`;
      params.push(String(filters.poNo).trim().toLowerCase());
    }
    if (filters.source) {
      sql += ` AND LOWER(source) = ?`;
      params.push(String(filters.source).trim().toLowerCase());
    }

    sql += ` ORDER BY id DESC`;

    if (filters.limit) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(Number(filters.limit), Number(filters.offset || 0));
    }

    return queryAll(sql, params);
  }

  static async checkDuplicateInvoice(vendorCode: string, invoiceNumber: string, excludeInvoiceId?: string): Promise<IInvoice | null> {
    const cleanVendor = vendorCode.trim().toLowerCase();
    const cleanNum = invoiceNumber.trim().toLowerCase();

    let sql = `SELECT * FROM invoices WHERE LOWER(TRIM(vendor_code)) = ? AND LOWER(TRIM(invoice_number)) = ?`;
    const params: any[] = [cleanVendor, cleanNum];

    if (excludeInvoiceId) {
      sql += ` AND invoice_id != ?`;
      params.push(excludeInvoiceId);
    }

    sql += ` LIMIT 1`;
    return queryGet(sql, params);
  }

  static async create(invoice: Omit<IInvoice, 'id' | 'created_at'>): Promise<void> {
    const sql = `
      INSERT INTO invoices (
        invoice_id, invoice_number, invoice_date, vendor_id, vendor_code, vendor_name,
        po_no, project, subtotal, tax_amount, invoice_total, status, source,
        uploaded_by, uploaded_by_type, remarks, rejection_reason, submitted_at,
        created_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    const params = [
      invoice.invoice_id,
      invoice.invoice_number,
      invoice.invoice_date,
      invoice.vendor_id || null,
      invoice.vendor_code,
      invoice.vendor_name,
      invoice.po_no,
      invoice.project || '',
      invoice.subtotal || 0,
      invoice.tax_amount || 0,
      invoice.invoice_total,
      invoice.status || 'Submitted',
      invoice.source || 'vendor_portal',
      invoice.uploaded_by,
      invoice.uploaded_by_type || 'vendor',
      invoice.remarks || '',
      invoice.rejection_reason || null,
      invoice.submitted_at || new Date().toISOString(),
      new Date().toISOString()
    ];

    await queryRun(sql, params);
  }

  static async update(invoiceId: string, updates: Partial<IInvoice>, expectedVersion?: number): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    const allowed = [
      'invoice_number', 'invoice_date', 'subtotal', 'tax_amount', 'invoice_total',
      'status', 'remarks', 'rejection_reason', 'reviewed_at', 'approved_at', 'updated_at'
    ];

    Object.entries(updates).forEach(([k, v]) => {
      if (allowed.includes(k) && v !== undefined) {
        fields.push(`${k} = ?`);
        values.push(v);
      }
    });

    if (fields.length === 0) return;

    fields.push(`updated_at = ?`);
    values.push(new Date().toISOString());

    fields.push(`version = COALESCE(version, 1) + 1`);

    let sql = `UPDATE invoices SET ${fields.join(', ')} WHERE invoice_id = ? OR id = ?`;
    values.push(invoiceId, Number(invoiceId) || -1);

    if (expectedVersion !== undefined && expectedVersion !== null) {
      sql += ` AND COALESCE(version, 1) = ?`;
      values.push(expectedVersion);
    }

    const result = await queryRun(sql, values);
    if (expectedVersion !== undefined && expectedVersion !== null && result?.rowsAffected === 0) {
      throw new Error('CONFLICT: Invoice was modified by another request. Please refresh and try again.');
    }
  }

  static async getPOInvoiceSummary(poNo: string): Promise<{ totalInvoiced: number; totalApproved: number; invoiceCount: number }> {
    const row = await queryGet(`
      SELECT 
        COALESCE(SUM(invoice_total), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN LOWER(status) = 'approved' OR LOWER(status) = 'paid' THEN invoice_total ELSE 0 END), 0) as total_approved,
        COUNT(*) as cnt
      FROM invoices
      WHERE LOWER(TRIM(po_no)) = ? AND LOWER(status) != 'rejected'
    `, [poNo.trim().toLowerCase()]);

    return {
      totalInvoiced: Number(row?.total_invoiced || 0),
      totalApproved: Number(row?.total_approved || 0),
      invoiceCount: Number(row?.cnt || 0)
    };
  }

  static async delete(invoiceId: string): Promise<void> {
    await queryRun(`DELETE FROM invoices WHERE invoice_id = ? OR id = ?`, [invoiceId, Number(invoiceId) || -1]);
  }
}
