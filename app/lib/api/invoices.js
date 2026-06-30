// Domain: invoices
import { queryAll, queryRun } from '../db.js';

export async function getInvoices() {
  try {
    const result = await queryAll('SELECT * FROM invoices ORDER BY created_at DESC');
    return result || [];
  } catch (err) {
    console.error("Error fetching invoices:", err);
    return [];
  }
}

export async function saveInvoice(vendorName, invoiceNo, invoiceDate, totalAmount, rawText, createdBy) {
  try {
    const result = await queryRun(
      `INSERT INTO invoices (vendor_name, invoice_no, invoice_date, total_amount, raw_text, created_by)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      [vendorName, invoiceNo, invoiceDate, totalAmount, rawText, createdBy]
    );
    return { ok: true, data: result[0] };
  } catch (err) {
    console.error("Error saving invoice:", err);
    throw new Error("Failed to save invoice to database.");
  }
}
