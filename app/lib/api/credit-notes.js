import { queryAll, queryGet, queryRun } from '../db.js';
import { logAudit } from './core.js';
import { uploadAttachment, deleteEntityAttachments } from './attachments.js';
import { PORepository } from '../../../src/modules/purchase-orders/repositories/PORepository.ts';
import { VendorRepository } from '../../../src/modules/vendors/repositories/VendorRepository.ts';
import { InvoiceRepository } from '../../../src/modules/invoices/repositories/InvoiceRepository.ts';

let _creditNotesTablePromise = null;
export async function ensureCreditNotesTable() {
  if (_creditNotesTablePromise) return _creditNotesTablePromise;
  _creditNotesTablePromise = (async () => {
    try {
      await queryRun(`
        CREATE TABLE IF NOT EXISTS credit_notes (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          cn_id           TEXT UNIQUE NOT NULL,
          cn_number       TEXT NOT NULL,
          cn_date         TEXT NOT NULL,
          invoice_id      TEXT,
          invoice_number  TEXT,
          po_no           TEXT NOT NULL,
          vendor_id       INTEGER,
          vendor_code     TEXT NOT NULL,
          vendor_name     TEXT NOT NULL,
          project         TEXT DEFAULT '',
          subtotal        REAL DEFAULT 0,
          tax_amount      REAL DEFAULT 0,
          total_amount    REAL NOT NULL,
          reason          TEXT DEFAULT 'General Adjustment',
          remarks         TEXT DEFAULT '',
          status          TEXT DEFAULT 'Active',
          file_url        TEXT,
          created_by      TEXT,
          created_at      TEXT DEFAULT (datetime('now')),
          updated_at      TEXT
        )
      `);
    } catch (err) {
      // Table already exists or DB read-only
    }
  })();
  return _creditNotesTablePromise;
}

function generateCnId() {
  const year = new Date().getFullYear();
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const randAlpha = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CN-${year}-${randNum}-${randAlpha}`;
}

export async function createCreditNote(payload, session) {
  if (!session?.email) throw new Error('AUTH: Not signed in');
  await ensureCreditNotesTable();

  const {
    cnNumber,
    cnDate,
    poNo,
    invoiceId,
    subtotal,
    taxAmount,
    totalAmount,
    reason,
    remarks,
    fileName,
    fileData,
    fileType,
    fileSize
  } = payload || {};

  if (!cnNumber || !cnNumber.trim()) throw new Error('Credit Note Number is required.');
  if (!cnDate) throw new Error('Credit Note Date is required (YYYY-MM-DD).');
  if (!poNo || !poNo.trim()) throw new Error('Linked PO Number is required.');

  const cleanTotal = Number(totalAmount);
  if (!Number.isFinite(cleanTotal) || cleanTotal <= 0) {
    throw new Error('Valid Credit Note total amount greater than 0 is required.');
  }

  const cleanSubtotal = Number(subtotal) || 0;
  const cleanTax = Number(taxAmount) || 0;

  // Resolve PO & Vendor details
  const po = await PORepository.findById(poNo.trim());
  if (!po) throw new Error(`Purchase Order "${poNo.trim()}" not found.`);

  const vCode = po.vendor_code || po.vendor_key || '';
  const vName = po.vendor_name || '';
  const project = po.project_name || po.project || '';

  // Optional linked invoice check
  let linkedInvoiceNum = '';
  if (invoiceId) {
    const inv = await InvoiceRepository.findById(invoiceId);
    if (inv) {
      linkedInvoiceNum = inv.invoice_number;
    }
  }

  const cnId = generateCnId();

  // Handle optional attachment upload to Cloudinary
  let fileUrl = null;
  if (fileName && fileData) {
    try {
      const uploadRes = await uploadAttachment({
        entityType: 'credit_note',
        entityId: cnId,
        fileName,
        fileType: fileType || 'application/pdf',
        fileSize: fileSize || 0,
        fileData
      }, session);
      fileUrl = uploadRes?.url || null;
    } catch (uploadErr) {
      console.warn('Failed to upload CN attachment:', uploadErr.message);
    }
  }

  await queryRun(
    `INSERT INTO credit_notes (
      cn_id, cn_number, cn_date, invoice_id, invoice_number, po_no,
      vendor_id, vendor_code, vendor_name, project, subtotal, tax_amount,
      total_amount, reason, remarks, status, file_url, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, datetime('now'))`,
    [
      cnId,
      cnNumber.trim(),
      cnDate,
      invoiceId || null,
      linkedInvoiceNum || null,
      po.po_no,
      po.vendor_id || null,
      vCode,
      vName,
      project,
      cleanSubtotal,
      cleanTax,
      cleanTotal,
      reason || 'General Adjustment',
      remarks || '',
      fileUrl,
      session.email
    ]
  );

  await logAudit(
    session.email,
    'Credit Note Created',
    `Created Credit Note ${cnNumber} (${cnId}) for PO ${po.po_no} - Amount ₹${cleanTotal}`,
    'Invoices'
  );

  return { ok: true, cn_id: cnId };
}

export async function listCreditNotes(filters = {}, session) {
  if (!session?.email) throw new Error('AUTH: Not signed in');
  await ensureCreditNotesTable();

  let sql = `SELECT * FROM credit_notes WHERE 1=1`;
  const params = [];

  if (filters.poNo) {
    sql += ` AND LOWER(TRIM(po_no)) = ?`;
    params.push(filters.poNo.trim().toLowerCase());
  }

  if (filters.vendorCode) {
    sql += ` AND LOWER(TRIM(vendor_code)) = ?`;
    params.push(filters.vendorCode.trim().toLowerCase());
  }

  if (filters.invoiceId) {
    sql += ` AND (invoice_id = ? OR invoice_number = ?)`;
    params.push(filters.invoiceId, filters.invoiceId);
  }

  if (filters.status) {
    sql += ` AND LOWER(status) = ?`;
    params.push(filters.status.trim().toLowerCase());
  }

  sql += ` ORDER BY id DESC`;

  return queryAll(sql, params);
}

export async function deleteCreditNote(cnId, session) {
  if (!session?.email) throw new Error('AUTH: Not signed in');
  await ensureCreditNotesTable();

  const cn = await queryGet(`SELECT * FROM credit_notes WHERE cn_id = ? OR id = ?`, [cnId, Number(cnId) || -1]);
  if (!cn) throw new Error('Credit Note not found');

  await queryRun(`DELETE FROM credit_notes WHERE cn_id = ? OR id = ?`, [cnId, Number(cnId) || -1]);

  try {
    await deleteEntityAttachments('credit_note', cn.cn_id || cnId);
  } catch (err) {
    console.warn('Failed to delete CN attachments:', err.message);
  }

  await logAudit(
    session.email,
    'Credit Note Deleted',
    `Deleted Credit Note ${cn.cn_number} (${cn.cn_id})`,
    'Invoices'
  );

  return { ok: true };
}
