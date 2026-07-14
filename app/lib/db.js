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
  // Proactively ensure audit_logs table exists
  tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      user TEXT,
      action_type TEXT,
      details TEXT,
      department TEXT
    )
  `).catch(err => console.error('Failed to create audit_logs table:', err.message));

  tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_data TEXT NOT NULL,
      uploaded_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(err => console.error('Failed to create attachments table:', err.message));

  tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS whatsapp_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      media_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(err => console.error('Failed to create whatsapp_outbox table:', err.message));

  // --- Site DPR Operations Module Tables ---
  const dprTables = [
    `CREATE TABLE IF NOT EXISTS dpr_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT NOT NULL,
      site TEXT,
      client TEXT,
      date TEXT NOT NULL,
      prepared_by TEXT,
      weather TEXT,
      shift TEXT,
      status TEXT,
      approval_status TEXT DEFAULT 'Draft',
      checked_by TEXT,
      approved_by TEXT,
      data TEXT, -- JSON payload of floors, manpower, work progress, materials, issues, etc.
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS dpr_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS wpr_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT NOT NULL,
      milestone_name TEXT NOT NULL,
      floor_zone TEXT,
      planned_start TEXT,
      planned_end TEXT,
      planned_progress_curve TEXT, -- JSON string mapping dates/weeks to planned percentages
      render_image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS wpr_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT NOT NULL,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      generated_by TEXT,
      planned_progress REAL,
      actual_progress REAL,
      variance REAL,
      render_image_url TEXT,
      actual_image_url TEXT,
      summary_text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  
  for (const sql of dprTables) {
    tursoClient.execute(sql).catch(err => console.error('Failed to create DPR table:', err.message));
  }
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
