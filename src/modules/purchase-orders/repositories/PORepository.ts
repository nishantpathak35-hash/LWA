import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';
import { IPO, IPOItem } from '../types/PO';

export class PORepository {
  /**
   * Retrieves all purchase orders.
   */
  static async findAll(): Promise<IPO[]> {
    return queryAll(`
      SELECT p.*,
        p.legacy_paid as paid
      FROM purchase_orders p
      ORDER BY p.created_at DESC
    `);
  }

  /**
   * Retrieves a single purchase order by PO Number.
   */
  static async findById(poNo: string): Promise<IPO | null> {
    return queryGet(`
      SELECT p.*,
        p.legacy_paid as paid
      FROM purchase_orders p
      WHERE p.po_no = ?
    `, [poNo]);
  }

  /**
   * Retrieves items for a specific purchase order.
   */
  static async findItemsByPoNo(poNo: string): Promise<IPOItem[]> {
    return queryAll(`SELECT * FROM po_items WHERE po_no = ?`, [poNo]);
  }

  /**
   * Creates a new purchase order.
   */
  static async create(po: Omit<IPO, 'created_at' | 'paid'>): Promise<void> {
    const sql = `
      INSERT INTO purchase_orders 
        (po_no, vendor_key, vendor_name, project, po_value, revised_po_value, approval_status, status, po_date, terms, tds_section, tds_pct, tds_amount, gst_total, gst_mode, category, notes, expected_delivery_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      po.po_no, po.vendor_key, po.vendor_name, po.project, po.po_value, po.revised_po_value || po.po_value,
      po.approval_status || 'Draft', po.status || 'Draft', po.po_date, po.terms || '',
      po.tds_section || '', po.tds_pct || 0, po.tds_amount || 0, po.gst_total || 0, po.gst_mode || 'inter',
      po.category || 'Goods', po.notes || '', po.expected_delivery_date || ''
    ];
    await queryRun(sql, params);
  }

  /**
   * Creates a purchase order item.
   */
  static async createItem(item: IPOItem): Promise<void> {
    const sql = `
      INSERT INTO po_items (po_no, description, hsn_sac, qty, unit, rate, disc_pct, tax_pct, amount) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      item.po_no, item.description, item.hsn_sac || '', item.qty, item.unit, 
      item.rate, item.disc_pct || 0, item.tax_pct || 0, item.amount
    ];
    await queryRun(sql, params);
  }

  /**
   * Deletes all items for a specific PO (useful for full updates).
   */
  static async deleteItemsByPoNo(poNo: string): Promise<void> {
    await queryRun(`DELETE FROM po_items WHERE po_no = ?`, [poNo]);
  }

  /**
   * Updates an existing PO.
   */
  static async update(poNo: string, po: Partial<IPO>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    // Allowed fields for update
    const allowedFields = ['vendor_key', 'vendor_name', 'project', 'po_value', 'revised_po_value', 'approval_status', 'status', 'po_date', 'terms', 'tds_section', 'tds_pct', 'tds_amount', 'gst_total', 'gst_mode', 'category', 'notes', 'expected_delivery_date'];

    Object.entries(po).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    const sql = `UPDATE purchase_orders SET ${fields.join(', ')} WHERE po_no = ?`;
    values.push(poNo);

    await queryRun(sql, values);
  }
}
