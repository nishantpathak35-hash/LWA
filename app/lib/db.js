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

  if (!global.__tursoInitialized) {
    global.__tursoInitialized = true;
    
    // Silence PRAGMA foreign_keys 404 on Turso HTTP API
    tursoClient.execute('PRAGMA foreign_keys = ON;').catch(() => {});

    // --- Optimistic concurrency: add version columns if missing ---
    const versionMigrations = [
      `ALTER TABLE vendors ADD COLUMN version INTEGER DEFAULT 1`,
      `ALTER TABLE purchase_orders ADD COLUMN version INTEGER DEFAULT 1`,
      `ALTER TABLE payment_requests ADD COLUMN version INTEGER DEFAULT 1`,
    ];
    Promise.all(versionMigrations.map(sql => tursoClient.execute(sql).catch(() => {})))
      .then(() => {
        // --- Auto-reconcile historical PO payment calculations (Gross Approved Amount = Net + TDS) ---
        return tursoClient.execute(`
          UPDATE purchase_orders
          SET legacy_paid = (
            COALESCE((
              SELECT SUM(COALESCE(pr.approved_amount, pr.amount_requested, 0))
              FROM payment_requests pr
              WHERE pr.po_no = purchase_orders.po_no
                AND (LOWER(pr.stage) = 'remitted' OR LOWER(pr.remittance) = 'remitted')
            ), 0) +
            COALESCE((
              SELECT SUM(COALESCE(sp.amount, 0))
              FROM system_payments sp
              WHERE sp.po_no = purchase_orders.po_no
                AND (sp.pr_key IS NULL OR sp.pr_key LIKE 'MANUAL-%')
            ), 0)
          )
        `).then(() => {
          return tursoClient.execute(`
            UPDATE purchase_orders
            SET final_payable = CASE WHEN COALESCE(revised_po_value, po_value, 0) - COALESCE(legacy_paid, 0) < 0 THEN 0 ELSE COALESCE(revised_po_value, po_value, 0) - COALESCE(legacy_paid, 0) END,
                payment_status = CASE
                  WHEN COALESCE(legacy_paid, 0) >= COALESCE(revised_po_value, po_value, 0) AND COALESCE(revised_po_value, po_value, 0) > 0 THEN 'Fully Paid'
                  WHEN COALESCE(legacy_paid, 0) > 0 THEN 'Partially Paid'
                  ELSE 'Unpaid'
                END
          `);
        });
      })
      .catch(() => {});
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
