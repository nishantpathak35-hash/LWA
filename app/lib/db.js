import { createClient } from '@libsql/client';

let tursoClient = null;

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("CRITICAL ERROR: Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. Vercel deployment requires these environment variables.");
} else {
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  console.log('Connected to Turso Cloud Database');

  // Note: Database schema and indices are fully managed and indexed.
  // Runtime lambda cold-starts no longer run redundant multi-query migrations.
}

async function executeWithRetry(action, retries = 3, delay = 300) {
  for (let i = 0; i < retries; i++) {
    try {
      return await action();
    } catch (err) {
      const isNetwork = 
        err.message?.toLowerCase().includes('fetch') ||
        err.message?.toLowerCase().includes('socket') ||
        err.message?.toLowerCase().includes('closed') ||
        err.code === 'UND_ERR_SOCKET';
      if (!isNetwork || i === retries - 1) {
        throw err;
      }
      console.warn(`Turso query failed (attempt ${i + 1}/${retries}), retrying:`, err.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

export async function queryAll(sql, params = []) {
  if (!tursoClient) throw new Error("Database not connected");
  const { rows } = await executeWithRetry(() => tursoClient.execute({ sql, args: params }));
  return rows;
}

export async function queryGet(sql, params = []) {
  if (!tursoClient) throw new Error("Database not connected");
  const { rows } = await executeWithRetry(() => tursoClient.execute({ sql, args: params }));
  return rows.length > 0 ? rows[0] : undefined;
}

export async function queryRun(sql, params = []) {
  if (!tursoClient) throw new Error("Database not connected");
  return executeWithRetry(() => tursoClient.execute({ sql, args: params }));
}

/**
 * Executes an array of SQL statements in a single atomic transaction.
 * @param {Array<{sql: string, args?: any[]}>} statements
 * @param {'write' | 'read' | 'deferred'} mode
 */
export async function queryBatch(statements, mode = 'write') {
  if (!tursoClient) throw new Error("Database not connected");
  if (!Array.isArray(statements) || statements.length === 0) return [];
  const normalized = statements.map(st => {
    if (typeof st === 'string') return { sql: st, args: [] };
    return { sql: st.sql, args: st.args || st.params || [] };
  });
  return executeWithRetry(() => tursoClient.batch(normalized, mode));
}

