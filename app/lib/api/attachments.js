// Domain: attachments
import { queryAll, queryGet, queryRun } from '../db.js';
import { AuthService } from '../../../src/modules/core/services/AuthService';
import { logAudit } from './core.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function requireAuth(session) {
  AuthService.requireAuth(session);
}

/**
 * Ensure the attachments table exists before any DB operation.
 * Uses CREATE TABLE IF NOT EXISTS so it is safe to call on every request.
 */
async function ensureAttachmentsTable() {
  try {
    await queryRun(`
      CREATE TABLE IF NOT EXISTS attachments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT    NOT NULL,
        entity_id   TEXT    NOT NULL,
        file_name   TEXT    NOT NULL,
        file_type   TEXT,
        file_size   INTEGER DEFAULT 0,
        file_data   TEXT,
        uploaded_by TEXT,
        created_at  TEXT    DEFAULT (datetime('now'))
      )
    `);
  } catch (err) {
    // Log but do not throw — table may already exist or DB may be read-only during build
    console.warn('ensureAttachmentsTable warning:', err.message);
  }
}

export async function uploadAttachment(payload, session) {
  requireAuth(session);
  const { entityType, entityId, fileName, fileType, fileSize, fileData } = payload;
  if (!entityType || !entityId || !fileName || !fileData) {
    throw new Error('Missing required attachment fields: entityType, entityId, fileName, fileData are all required.');
  }
  if (fileSize > 3.5 * 1024 * 1024) {
    throw new Error('File exceeds 3.5 MB limit. Please select a smaller file.');
  }

  await ensureAttachmentsTable();

  // Strip redundant Data URI header (e.g. "data:application/pdf;base64,") if present
  let cleanFileData = fileData;
  if (typeof cleanFileData === 'string' && cleanFileData.includes(',')) {
    cleanFileData = cleanFileData.split(',')[1];
  }

  let dataToStore = fileData; // Default to raw fileData if Cloudinary is not configured

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const dataUri = `data:${fileType || 'application/octet-stream'};base64,${cleanFileData}`;
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: `erp_attachments/${entityType}/${entityId}`,
        resource_type: 'auto'
      });
      dataToStore = uploadResult.secure_url;
    } catch (err) {
      throw new Error('Failed to upload file to Cloudinary: ' + err.message);
    }
  }

  await queryRun(
    `INSERT INTO attachments (entity_type, entity_id, file_name, file_type, file_size, file_data, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entityType, entityId, fileName, fileType || '', fileSize || 0, dataToStore, session.email]
  );

  await logAudit(session.email, 'Attachment Uploaded', `Uploaded "${fileName}" to ${entityType}/${entityId}`);
  return { ok: true, url: dataToStore };
}

export async function getAttachments(payload, session) {
  requireAuth(session);
  const { entityType, entityId } = payload;
  if (!entityType || !entityId) throw new Error('Missing entity details: entityType and entityId are required.');

  await ensureAttachmentsTable();

  // Enforce vendor tenant isolation for attachment metadata access
  if (session && session.user_type === 'vendor') {
    if (entityType === 'invoice') {
      const inv = await queryGet(`SELECT vendor_code FROM invoices WHERE invoice_id = ?`, [entityId]);
      if (!inv || String(inv.vendor_code).trim().toLowerCase() !== String(session.vendor_code).trim().toLowerCase()) {
        throw new Error('AUTH: Forbidden - Access Denied');
      }
    } else if (entityType === 'po' || entityType === 'purchase_order') {
      const po = await queryGet(`SELECT vendor_code, vendor_key FROM purchase_orders WHERE po_no = ?`, [entityId]);
      const vCode = String(po?.vendor_code || po?.vendor_key || '').trim().toLowerCase();
      if (!po || vCode !== String(session.vendor_code).trim().toLowerCase()) {
        throw new Error('AUTH: Forbidden - Access Denied');
      }
    } else {
      throw new Error('AUTH: Forbidden - Access Denied');
    }
  }

  // Include file_data (Cloudinary URL or legacy base64) for attachment preview and download
  return queryAll(
    `SELECT id, entity_type, entity_id, file_name, file_type, file_size, file_data, uploaded_by, created_at
     FROM attachments
     WHERE entity_type = ? AND entity_id = ?
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );
}

export async function deleteAttachment(attachmentId, session) {
  requireAuth(session);
  if (!attachmentId) throw new Error('Missing attachment ID.');

  await ensureAttachmentsTable();

  const existing = await queryGet(`SELECT * FROM attachments WHERE id = ?`, [attachmentId]);
  if (!existing) throw new Error('Attachment not found.');

  // Enforce vendor tenant isolation for attachment deletion
  if (session && session.user_type === 'vendor') {
    if (existing.entity_type === 'invoice') {
      const inv = await queryGet(`SELECT vendor_code FROM invoices WHERE invoice_id = ?`, [existing.entity_id]);
      if (!inv || String(inv.vendor_code).trim().toLowerCase() !== String(session.vendor_code).trim().toLowerCase()) {
        throw new Error('AUTH: Forbidden - Access Denied');
      }
    } else if (existing.entity_type === 'po' || existing.entity_type === 'purchase_order') {
      const po = await queryGet(`SELECT vendor_code, vendor_key FROM purchase_orders WHERE po_no = ?`, [existing.entity_id]);
      const vCode = String(po?.vendor_code || po?.vendor_key || '').trim().toLowerCase();
      if (!po || vCode !== String(session.vendor_code).trim().toLowerCase()) {
        throw new Error('AUTH: Forbidden - Access Denied');
      }
    } else {
      throw new Error('AUTH: Forbidden - Access Denied');
    }
  }

  await queryRun(`DELETE FROM attachments WHERE id = ?`, [attachmentId]);
  await logAudit(
    session.email,
    'Attachment Deleted',
    `Deleted "${existing.file_name}" from ${existing.entity_type}/${existing.entity_id}`
  );

  return { ok: true };
}
