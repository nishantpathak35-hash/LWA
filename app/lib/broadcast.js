// Broadcast module — emits change events to a Turso table for SSE consumers.
// Vercel serverless model means in-memory pub/sub won't work across isolates,
// so we use a broadcast_events table that SSE endpoints poll.
import { queryRun, queryAll } from './db.js';

/**
 * Emit a broadcast event after a successful mutation.
 * Call this AFTER the transaction is known to have committed.
 *
 * @param {'vendor'|'po'|'payment'|'settings'} entity
 * @param {'created'|'updated'|'deleted'} action
 * @param {string|number} [entityId] - Optional identifier (vendor_code, po_no, pr_id, etc.)
 */
export async function emitBroadcast(entity, action, entityId = null) {
  try {
    await queryRun(
      `INSERT INTO broadcast_events (entity, action, entity_id) VALUES (?, ?, ?)`,
      [entity, action, entityId ? String(entityId) : null]
    );
  } catch (err) {
    // Non-fatal: log and continue — missing a broadcast event is better than
    // failing the original mutation.
    console.error('Broadcast emit failed:', err.message);
  }
}

/**
 * Fetch events newer than the given cursor (auto-increment id).
 * Also cleans up events older than 60 seconds to prevent unbounded growth.
 *
 * @param {number} afterId - Return events with id > afterId
 * @returns {Promise<Array<{id: number, entity: string, action: string, entity_id: string|null}>>}
 */
export async function fetchBroadcastEvents(afterId = 0) {
  try {
    // Clean up old events (older than 60s)
    await queryRun(
      `DELETE FROM broadcast_events WHERE created_at < datetime('now', '-60 seconds')`
    );

    const rows = await queryAll(
      `SELECT id, entity, action, entity_id FROM broadcast_events WHERE id > ? ORDER BY id ASC LIMIT 50`,
      [afterId]
    );
    return rows;
  } catch (err) {
    console.error('Broadcast fetch failed:', err.message);
    return [];
  }
}
