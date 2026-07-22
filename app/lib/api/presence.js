import { queryRun, queryAll } from '../db.js';
import { emitBroadcast } from '../broadcast.js';
import { AuthService } from '../../../src/modules/core/services/AuthService';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

/**
 * Register or update user presence on a document.
 */
export async function registerPresence(entity, entityId, session) {
  requireAuth(session);

  if (!entity || !entityId) {
    throw new Error('Entity type and entity ID are required for presence.');
  }

  const now = new Date().toISOString();

  // Upsert the presence record for the current user
  await queryRun(
    `INSERT OR REPLACE INTO document_presence (entity, entity_id, user_email, user_name, last_active)
     VALUES (?, ?, ?, ?, ?)`,
    [entity, String(entityId), session.email, session.name || session.email, now]
  );

  // Emit broadcast event
  await emitBroadcast(`${entity}_presence`, 'active', entityId);

  return { ok: true };
}

/**
 * Deregister/Remove user presence on a document (e.g. on close).
 */
export async function deregisterPresence(entity, entityId, session) {
  requireAuth(session);

  if (!entity || !entityId) {
    throw new Error('Entity type and entity ID are required for deregistering presence.');
  }

  await queryRun(
    `DELETE FROM document_presence WHERE entity = ? AND entity_id = ? AND user_email = ?`,
    [entity, String(entityId), session.email]
  );

  // Emit broadcast event
  await emitBroadcast(`${entity}_presence`, 'inactive', entityId);

  return { ok: true };
}

/**
 * Get all active presences.
 * Deletes presences older than 30 seconds and groups active ones by "entity:entityId".
 */
export async function getActivePresence(session) {
  requireAuth(session);

  const cutoff = new Date(Date.now() - 30000).toISOString();

  // 1. Clean up stale presence records
  try {
    await queryRun(`DELETE FROM document_presence WHERE last_active < ?`, [cutoff]);
  } catch (e) {
    console.error('Clean up expired presence failed:', e.message);
  }

  // 2. Fetch all current presences
  const active = await queryAll(
    `SELECT entity, entity_id, user_email, user_name FROM document_presence`
  );

  // 3. Group by "entity:entityId"
  const presenceMap = {};
  for (const row of active) {
    const key = `${row.entity}:${row.entity_id}`;
    if (!presenceMap[key]) {
      presenceMap[key] = [];
    }
    presenceMap[key].push({
      email: row.user_email,
      name: row.user_name
    });
  }

  return presenceMap;
}
