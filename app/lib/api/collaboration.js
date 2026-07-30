import { queryAll, queryGet, queryRun } from '../db.js';
import { createNotification } from './notifications.js';

let _collaborationTablePromise = null;

export async function ensureCollaborationTables() {
  if (_collaborationTablePromise) return _collaborationTablePromise;
  _collaborationTablePromise = _runCollaborationMigrations();
  return _collaborationTablePromise;
}

async function _runCollaborationMigrations() {
  await Promise.allSettled([
    // Comments & Discussions
    queryRun(`
      CREATE TABLE IF NOT EXISTS record_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        author_email TEXT NOT NULL,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        mentions TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    // Live Activity Logs
    queryRun(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    // User Tasks & Action Assignments
    queryRun(`
      CREATE TABLE IF NOT EXISTS user_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assigned_to TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        title TEXT NOT NULL,
        record_type TEXT DEFAULT '',
        record_id TEXT DEFAULT '',
        due_date TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
  ]);

  // Idempotent column additions for payment_requests query hold flow
  const prQueryColumns = ['query_status', 'query_text', 'query_asked_by', 'query_asked_at', 'query_response', 'query_answered_at'];
  await Promise.allSettled(
    prQueryColumns.map(col => queryRun(`ALTER TABLE payment_requests ADD COLUMN ${col} TEXT`))
  );
}

// Log live activity
export async function logActivity(user, action, targetType, targetId, details = '') {
  try {
    await ensureCollaborationTables();
    const uEmail = user?.email || 'system@luxeworx.com';
    const uName = user?.name || user?.email?.split('@')[0] || 'Team Member';
    await queryRun(
      `INSERT INTO activity_logs (user_email, user_name, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [uEmail, uName, action, targetType, String(targetId), details]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

// Comments API
export async function addComment(user, recordType, recordId, content, mentions = []) {
  await ensureCollaborationTables();
  const uEmail = user?.email || 'user@luxeworx.com';
  const uName = user?.name || user?.email?.split('@')[0] || 'Team Member';
  
  const res = await queryRun(
    `INSERT INTO record_comments (record_type, record_id, author_email, author_name, content, mentions) VALUES (?, ?, ?, ?, ?, ?)`,
    [recordType, String(recordId), uEmail, uName, content, JSON.stringify(mentions)]
  );

  await logActivity(user, 'commented on', recordType, recordId, content.substring(0, 80));
  
  // If mentions exist, auto-create task alerts + notifications
  if (Array.isArray(mentions) && mentions.length > 0) {
    for (const mention of mentions) {
      await createTask(user, mention, `Mentioned you in ${recordType} #${recordId}: "${content.substring(0, 50)}..."`, recordType, recordId);
      await createNotification({
        recipientRole: mention,
        type: 'mentioned',
        title: `${uName} mentioned @${mention}`,
        body: `In ${recordType} #${recordId}: "${content.substring(0, 80)}"`,
        recordType,
        recordId: String(recordId),
        actorName: uName,
        actorEmail: uEmail
      });
    }
  }

  return { ok: true, id: Number(res.lastInsertRowid) };
}

export async function getComments(recordType, recordId) {
  await ensureCollaborationTables();
  const rows = await queryAll(
    `SELECT * FROM record_comments WHERE record_type = ? AND record_id = ? ORDER BY id ASC`,
    [recordType, String(recordId)]
  );
  return rows.map(r => ({
    ...r,
    mentions: r.mentions ? JSON.parse(r.mentions) : []
  }));
}

// Query Hold API
export async function requestPaymentClarification(user, paymentId, queryText) {
  await ensureCollaborationTables();
  const uEmail = user?.email || 'approver@luxeworx.com';
  const uName = user?.name || user?.email?.split('@')[0] || 'Approver';
  const now = new Date().toISOString();

  await queryRun(
    `UPDATE payment_requests SET query_status = 'hold', query_text = ?, query_asked_by = ?, query_asked_at = ? WHERE id = ? OR pr_id = ?`,
    [queryText, `${uName} (${uEmail})`, now, paymentId, paymentId]
  );

  await logActivity(user, 'requested clarification for', 'Payment Request', paymentId, queryText);
  await addComment(user, 'Payment Request', paymentId, `❓ Query Hold Requested: "${queryText}"`);

  // Notify procurement / creator that a query hold was placed
  await createNotification({
    recipientRole: 'procurement',
    type: 'query_hold',
    title: `Query Hold on PR #${paymentId}`,
    body: `${uName} requested clarification: "${queryText.substring(0, 80)}"`,
    recordType: 'Payment Request',
    recordId: String(paymentId),
    actorName: uName,
    actorEmail: uEmail
  });

  return { ok: true, message: 'Clarification requested and payment placed on hold.' };
}

export async function answerPaymentClarification(user, paymentId, responseText) {
  await ensureCollaborationTables();
  const uEmail = user?.email || 'requester@luxeworx.com';
  const uName = user?.name || user?.email?.split('@')[0] || 'Requester';
  const now = new Date().toISOString();

  await queryRun(
    `UPDATE payment_requests SET query_status = 'answered', query_response = ?, query_answered_at = ? WHERE id = ? OR pr_id = ?`,
    [responseText, now, paymentId, paymentId]
  );

  await logActivity(user, 'answered clarification for', 'Payment Request', paymentId, responseText);
  await addComment(user, 'Payment Request', paymentId, `✅ Clarification Answered: "${responseText}"`);

  // Notify finance/director that clarification was answered
  await createNotification({
    recipientRole: 'finance',
    type: 'query_answered',
    title: `Clarification Answered for PR #${paymentId}`,
    body: `${uName} responded: "${responseText.substring(0, 80)}"`,
    recordType: 'Payment Request',
    recordId: String(paymentId),
    actorName: uName,
    actorEmail: uEmail
  });

  return { ok: true, message: 'Clarification response submitted.' };
}

// Activity Stream API
export async function getActivityStream(limit = 30) {
  await ensureCollaborationTables();
  return queryAll(
    `SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?`,
    [limit]
  );
}

// User Tasks API
export async function createTask(user, assignedTo, title, recordType = '', recordId = '', dueDate = '') {
  await ensureCollaborationTables();
  const uEmail = user?.email || 'system@luxeworx.com';
  await queryRun(
    `INSERT INTO user_tasks (assigned_to, assigned_by, title, record_type, record_id, due_date) VALUES (?, ?, ?, ?, ?, ?)`,
    [assignedTo.toLowerCase().trim(), uEmail, title, recordType, String(recordId), dueDate]
  );
  return { ok: true };
}

export async function getUserTasks(user) {
  await ensureCollaborationTables();
  const uEmail = (user?.email || '').toLowerCase().trim();
  const uRole = (user?.roles || [])[0] || '';
  
  return queryAll(
    `SELECT * FROM user_tasks WHERE LOWER(assigned_to) = ? OR LOWER(assigned_to) = ? ORDER BY id DESC LIMIT 20`,
    [uEmail, uRole.toLowerCase().trim()]
  );
}

export async function updateTaskStatus(taskId, status) {
  await ensureCollaborationTables();
  await queryRun(
    `UPDATE user_tasks SET status = ? WHERE id = ?`,
    [status, taskId]
  );
  return { ok: true };
}
