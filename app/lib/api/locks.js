import { queryGet, queryRun, queryAll } from '../db.js';
import { emitBroadcast } from '../broadcast.js';
import { AuthService } from '../../../src/modules/core/services/AuthService';
import { isSuperAdmin } from '../config.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

/**
 * Acquire or refresh a lock on a document.
 * Lock duration is 30 seconds.
 */
export async function acquireDocumentLock(entity, entityId, session) {
  requireAuth(session);
  
  if (!entity || !entityId) {
    throw new Error('Entity type and entity ID are required for locking.');
  }

  const now = new Date().toISOString();
  // 30 seconds from now
  const expiresAt = new Date(Date.now() + 30000).toISOString();
  
  // Clean up old expired locks first to keep table tidy
  try {
    await queryRun(`DELETE FROM document_locks WHERE expires_at < ?`, [now]);
  } catch (e) {
    console.error('Clean up expired locks failed:', e.message);
  }

  // Check if there is an active lock by someone else
  const currentLock = await queryGet(
    `SELECT * FROM document_locks WHERE entity = ? AND entity_id = ?`,
    [entity, String(entityId)]
  );

  if (currentLock) {
    // If it belongs to someone else and hasn't expired
    if (currentLock.user_email !== session.email && new Date(currentLock.expires_at).getTime() > Date.now()) {
      return {
        ok: false,
        lockedBy: {
          email: currentLock.user_email,
          name: currentLock.user_name
        },
        expiresAt: currentLock.expires_at
      };
    }
  }

  // Otherwise, upsert the lock for the current user
  await queryRun(
    `INSERT OR REPLACE INTO document_locks (entity, entity_id, user_email, user_name, locked_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entity, String(entityId), session.email, session.name || session.email, now, expiresAt]
  );

  // Emit broadcast event
  await emitBroadcast(`${entity}_lock`, 'locked', entityId);

  return {
    ok: true,
    expiresAt
  };
}

/**
 * Release a document lock manually.
 */
export async function releaseDocumentLock(entity, entityId, session) {
  requireAuth(session);

  if (!entity || !entityId) {
    throw new Error('Entity type and entity ID are required for unlocking.');
  }

  const currentLock = await queryGet(
    `SELECT * FROM document_locks WHERE entity = ? AND entity_id = ?`,
    [entity, String(entityId)]
  );

  if (!currentLock) {
    return { ok: true };
  }

  const isDirOrAdmin = (session.roles || []).includes('director') || 
                       (session.roles || []).includes('admin') || 
                       isSuperAdmin(session.email);

  // Users can only release their own locks, unless they are admin/director
  if (currentLock.user_email !== session.email && !isDirOrAdmin) {
    throw new Error('AUTH:Unauthorized - You cannot release someone else\'s document lock.');
  }

  await queryRun(
    `DELETE FROM document_locks WHERE entity = ? AND entity_id = ?`,
    [entity, String(entityId)]
  );

  // Emit broadcast event
  await emitBroadcast(`${entity}_lock`, 'unlocked', entityId);

  return { ok: true };
}

/**
 * Get all active, non-expired document locks.
 */
export async function getActiveLocks(session) {
  requireAuth(session);
  const now = new Date().toISOString();
  
  const locks = await queryAll(
    `SELECT entity, entity_id, user_email, user_name, expires_at FROM document_locks WHERE expires_at > ?`,
    [now]
  );
  
  // Convert array to a lookup map: "entity:entityId" -> lock object
  const locksMap = {};
  locks.forEach(l => {
    locksMap[`${l.entity}:${l.entity_id}`] = {
      email: l.user_email,
      name: l.user_name,
      expiresAt: l.expires_at
    };
  });
  
  return locksMap;
}
