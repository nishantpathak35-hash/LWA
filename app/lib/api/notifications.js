import { queryAll, queryGet, queryRun } from '../db.js';
import { emitBroadcast } from '../broadcast.js';

let _notificationsTablePromise = null;

export async function ensureNotificationsTable() {
  if (_notificationsTablePromise) return _notificationsTablePromise;
  _notificationsTablePromise = _runNotificationsMigration();
  return _notificationsTablePromise;
}

async function _runNotificationsMigration() {
  await queryRun(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email TEXT DEFAULT '',
      recipient_role TEXT DEFAULT '',
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      record_type TEXT DEFAULT '',
      record_id TEXT DEFAULT '',
      actor_name TEXT DEFAULT '',
      actor_email TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Create a notification and emit an SSE broadcast.
 * 
 * @param {Object} data
 * @param {string} [data.recipientEmail] - Specific user email to notify
 * @param {string} [data.recipientRole] - Role to notify (all users with this role see it)
 * @param {'approval_needed'|'approved'|'rejected'|'mentioned'|'query_hold'|'query_answered'|'remitted'|'comment'} data.type
 * @param {string} data.title - Short notification title
 * @param {string} [data.body] - Notification body/details
 * @param {string} [data.recordType] - e.g., 'Payment Request', 'Purchase Order'
 * @param {string} [data.recordId] - e.g., PR ID, PO number
 * @param {string} [data.actorName] - Who triggered this
 * @param {string} [data.actorEmail] - Who triggered this
 */
export async function createNotification(data) {
  try {
    await ensureNotificationsTable();
    await queryRun(
      `INSERT INTO notifications (recipient_email, recipient_role, type, title, body, record_type, record_id, actor_name, actor_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.recipientEmail || '',
        data.recipientRole || '',
        data.type,
        data.title,
        data.body || '',
        data.recordType || '',
        data.recordId || '',
        data.actorName || '',
        data.actorEmail || ''
      ]
    );
    // Broadcast so SSE clients pick it up instantly
    await emitBroadcast('notification', 'created', data.recipientRole || data.recipientEmail || '');
  } catch (err) {
    // Non-fatal: don't break the mutation that triggered the notification
    console.error('Failed to create notification:', err.message);
  }
}

/**
 * Batch-create multiple notifications at once (e.g., notify multiple roles).
 */
export async function createNotifications(items) {
  for (const item of items) {
    await createNotification(item);
  }
}

/**
 * Get notifications for a user by email and/or roles.
 * Returns newest-first, paginated.
 */
export async function getUserNotifications(userEmail, userRoles = [], limit = 30, offset = 0, session) {
  await ensureNotificationsTable();
  const email = (userEmail || '').toLowerCase().trim();
  const roles = (userRoles || []).map(r => r.toLowerCase().trim()).filter(Boolean);

  // Build role match conditions
  let conditions = [`LOWER(recipient_email) = ?`];
  let params = [email];

  for (const role of roles) {
    conditions.push(`LOWER(recipient_role) = ?`);
    params.push(role);
  }

  // Also match notifications with empty recipient (broadcast to all)
  conditions.push(`(recipient_email = '' AND recipient_role = '')`);

  const where = conditions.join(' OR ');
  params.push(Number(limit) || 30, Number(offset) || 0);

  const rows = await queryAll(
    `SELECT * FROM notifications WHERE (${where}) ORDER BY id DESC LIMIT ? OFFSET ?`,
    params
  );

  return rows;
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userEmail, userRoles = [], session) {
  await ensureNotificationsTable();
  const email = (userEmail || '').toLowerCase().trim();
  const roles = (userRoles || []).map(r => r.toLowerCase().trim()).filter(Boolean);

  let conditions = [`LOWER(recipient_email) = ?`];
  let params = [email];

  for (const role of roles) {
    conditions.push(`LOWER(recipient_role) = ?`);
    params.push(role);
  }

  conditions.push(`(recipient_email = '' AND recipient_role = '')`);

  const where = conditions.join(' OR ');

  const row = await queryGet(
    `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0 AND (${where})`,
    params
  );

  return { count: Number(row?.count) || 0 };
}

/**
 * Mark a specific notification as read.
 */
export async function markNotificationRead(notificationId, session) {
  await ensureNotificationsTable();
  await queryRun(
    `UPDATE notifications SET is_read = 1 WHERE id = ?`,
    [notificationId]
  );
  return { ok: true };
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsRead(userEmail, userRoles = [], session) {
  await ensureNotificationsTable();
  const email = (userEmail || '').toLowerCase().trim();
  const roles = (userRoles || []).map(r => r.toLowerCase().trim()).filter(Boolean);

  let conditions = [`LOWER(recipient_email) = ?`];
  let params = [email];

  for (const role of roles) {
    conditions.push(`LOWER(recipient_role) = ?`);
    params.push(role);
  }

  conditions.push(`(recipient_email = '' AND recipient_role = '')`);

  const where = conditions.join(' OR ');

  await queryRun(
    `UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND (${where})`,
    params
  );

  return { ok: true };
}

/**
 * Delete notifications older than 30 days (housekeeping).
 */
export async function deleteOldNotifications() {
  await ensureNotificationsTable();
  await queryRun(
    `DELETE FROM notifications WHERE created_at < datetime('now', '-30 days')`
  );
  return { ok: true };
}
