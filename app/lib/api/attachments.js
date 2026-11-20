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

function cloudinaryAsset(value) {
  if (typeof value !== 'string' || !value.startsWith('https://res.cloudinary.com/')) return null;
  const url = new URL(value);
  const match = url.pathname.match(/^\/([^/]+)\/(image|video|raw)\/(authenticated|upload)\/v(\d+)\/(.+)$/);
  if (!match || match[1] !== process.env.CLOUDINARY_CLOUD_NAME) return null;
  const [, , resourceType, type, version, path] = match;
  const name = decodeURIComponent(path);
  const publicId = resourceType === 'raw' ? name : name.replace(/\.[^./]+$/, '');
  return { publicId, path: name, resourceType, type, version };
}

export function attachmentDeliveryUrl(value) {
  const asset = cloudinaryAsset(value);
  if (!asset) throw new Error('Unsupported attachment storage location');
  return cloudinary.url(asset.path, {
    secure: true, sign_url: true, resource_type: asset.resourceType, type: asset.type, version: asset.version
  });
}

async function deleteStoredAsset(value) {
  const asset = cloudinaryAsset(value);
  if (asset) await cloudinary.uploader.destroy(asset.publicId, {
    resource_type: asset.resourceType, type: asset.type, invalidate: true
  });
}

export async function deleteEntityAttachments(entityType, entityId) {
  await ensureAttachmentsTable();
  const attachments = await queryAll(
    `SELECT id, file_data, file_name FROM attachments WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId]
  );
  for (const att of attachments) {
    await deleteStoredAsset(att.file_data);
    await queryRun(`DELETE FROM attachments WHERE id = ?`, [att.id]);
  }
}

let _attachmentsTablePromise = null;
async function ensureAttachmentsTable() {
  if (_attachmentsTablePromise) return _attachmentsTablePromise;
  _attachmentsTablePromise = (async () => {
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
      // Table already exists or DB read-only
    }
  })();
  return _attachmentsTablePromise;
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

  if (typeof cleanFileData !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanFileData)) throw new Error('Invalid file data');
  const bytes = Buffer.from(cleanFileData, 'base64');
  if (!bytes.length || bytes.length > 3.5 * 1024 * 1024) throw new Error('File must be between 1 byte and 3.5 MB');
  let dataToStore = cleanFileData; // Default to raw fileData if Cloudinary is not configured

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const dataUri = `data:${fileType || 'application/octet-stream'};base64,${cleanFileData}`;
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: `erp_attachments/${entityType}/${entityId}`,
        resource_type: 'raw',
        type: 'authenticated'
      });
      dataToStore = uploadResult.secure_url;
    } catch (err) {
      throw new Error('Failed to upload file to Cloudinary: ' + err.message);
    }
  }

  const inserted = await queryRun(
    `INSERT INTO attachments (entity_type, entity_id, file_name, file_type, file_size, file_data, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entityType, entityId, fileName, fileType || '', bytes.length, dataToStore, session.email]
  );

  await logAudit(session.email, 'Attachment Uploaded', `Uploaded "${fileName}" to ${entityType}/${entityId}`);
  return { ok: true, url: `/api/attachments/${inserted.lastInsertRowid}` };
}

export async function attachmentAccess(session, type, id) {
  const roles = session?.roles || [];
  const vendor = session?.user_type === 'vendor';
  if (!session?.email) return null;
  if (!vendor && roles.some(r => ['admin', 'director'].includes(r))) return 'manage';
  const po = type === 'po' || type === 'purchase_order';
  const financeDoc = po || ['invoice', 'credit_note'].includes(type);
  const procurement = roles.some(r => ['proc', 'procurement'].includes(r));
  if (!vendor && (financeDoc || ['vendor', 'vendor_onboarding'].includes(type)) &&
      (procurement || (financeDoc && roles.some(r => ['finance', 'accountant'].includes(r))))) return 'manage';

  let parent;
  if (po) parent = await queryGet('SELECT vendor_code, vendor_key, project FROM purchase_orders WHERE po_no = ?', [id]);
  else if (type === 'invoice') parent = await queryGet(
    'SELECT i.vendor_code, i.uploaded_by, p.project FROM invoices i LEFT JOIN purchase_orders p ON p.po_no = i.po_no WHERE i.invoice_id = ?', [id]);
  if (vendor) {
    const code = String(parent?.vendor_code || parent?.vendor_key || '').trim().toLowerCase();
    return code && code === String(session.vendor_code || '').trim().toLowerCase() ? 'read' : null;
  }
  if (parent?.uploaded_by?.toLowerCase() === session.email.toLowerCase()) return 'project';
  const project = ['dpr_photos', 'wpr_photos', 'schedule_renders'].includes(type) ? id : parent?.project;
  if (!project) return null;
  const allocation = await queryGet(
    `SELECT 1 FROM site_employees e JOIN site_project_allocations a ON a.employee_id = e.employee_id
     WHERE LOWER(COALESCE(NULLIF(e.user_email, ''), e.email)) = LOWER(?) AND a.project = ?
     AND e.status = 'active' AND a.status = 'active' AND a.start_date <= date('now')
     AND (NULLIF(a.end_date, '') IS NULL OR a.end_date >= date('now')) LIMIT 1`, [session.email, project]);
  return allocation ? 'project' : null;
}

export async function uploadScopedAttachment(payload, session) {
  if (!await attachmentAccess(session, payload?.entityType, payload?.entityId)) throw new Error('AUTH: Attachment access denied');
  return uploadAttachment(payload, session);
}

export async function getAttachments(payload, session) {
  if (session?.user_type !== 'vendor') requireAuth(session);
  const { entityType, entityId } = payload;
  if (!entityType || !entityId) throw new Error('Missing entity details: entityType and entityId are required.');

  await ensureAttachmentsTable();

  if (!await attachmentAccess(session, entityType, entityId)) throw new Error('AUTH: Attachment access denied');

  return queryAll(
    `SELECT id, entity_type, entity_id, file_name, file_type, file_size, uploaded_by, created_at
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

  const access = await attachmentAccess(session, existing.entity_type, existing.entity_id);
  if (access !== 'manage' && !(access === 'project' && existing.uploaded_by?.toLowerCase() === session.email.toLowerCase())) {
    throw new Error('AUTH: Attachment deletion denied');
  }

  await queryRun(`DELETE FROM attachments WHERE id = ?`, [attachmentId]);

  await deleteStoredAsset(existing.file_data);

  await logAudit(
    session.email,
    'Attachment Deleted',
    `Deleted "${existing.file_name}" from ${existing.entity_type}/${existing.entity_id}`
  );

  return { ok: true };
}
