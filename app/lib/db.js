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

    // --- Optimistic concurrency & schema migrations ---
    const versionMigrations = [
      `ALTER TABLE vendors ADD COLUMN version INTEGER DEFAULT 1`,
      `ALTER TABLE purchase_orders ADD COLUMN version INTEGER DEFAULT 1`,
      `ALTER TABLE payment_requests ADD COLUMN version INTEGER DEFAULT 1`,
      `ALTER TABLE payment_requests ADD COLUMN invoice_id TEXT`,
      `CREATE TABLE IF NOT EXISTS invoices (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id        TEXT    UNIQUE NOT NULL,
        invoice_number    TEXT    NOT NULL,
        invoice_date      TEXT    NOT NULL,
        vendor_id         INTEGER,
        vendor_code       TEXT    NOT NULL,
        vendor_name       TEXT    NOT NULL,
        po_no             TEXT    NOT NULL,
        project           TEXT,
        subtotal          REAL    DEFAULT 0,
        tax_amount        REAL    DEFAULT 0,
        invoice_total     REAL    NOT NULL,
        status            TEXT    NOT NULL DEFAULT 'Submitted',
        source            TEXT    NOT NULL DEFAULT 'vendor_portal',
        uploaded_by       TEXT    NOT NULL,
        uploaded_by_type  TEXT    NOT NULL DEFAULT 'vendor',
        remarks           TEXT,
        rejection_reason  TEXT,
        submitted_at      TEXT    DEFAULT (datetime('now')),
        reviewed_at       TEXT,
        approved_at       TEXT,
        created_at        TEXT    DEFAULT (datetime('now')),
        updated_at        TEXT,
        version           INTEGER DEFAULT 1
      )`,
      `ALTER TABLE invoices ADD COLUMN invoice_id TEXT`,
      `ALTER TABLE invoices ADD COLUMN invoice_number TEXT`,
      `ALTER TABLE invoices ADD COLUMN vendor_id INTEGER`,
      `ALTER TABLE invoices ADD COLUMN vendor_code TEXT`,
      `ALTER TABLE invoices ADD COLUMN po_no TEXT`,
      `ALTER TABLE invoices ADD COLUMN project TEXT`,
      `ALTER TABLE invoices ADD COLUMN subtotal REAL DEFAULT 0`,
      `ALTER TABLE invoices ADD COLUMN tax_amount REAL DEFAULT 0`,
      `ALTER TABLE invoices ADD COLUMN invoice_total REAL DEFAULT 0`,
      `ALTER TABLE invoices ADD COLUMN source TEXT DEFAULT 'vendor_portal'`,
      `ALTER TABLE invoices ADD COLUMN uploaded_by TEXT`,
      `ALTER TABLE invoices ADD COLUMN uploaded_by_type TEXT DEFAULT 'vendor'`,
      `ALTER TABLE invoices ADD COLUMN remarks TEXT`,
      `ALTER TABLE invoices ADD COLUMN rejection_reason TEXT`,
      `ALTER TABLE invoices ADD COLUMN submitted_at TEXT`,
      `ALTER TABLE invoices ADD COLUMN reviewed_at TEXT`,
      `ALTER TABLE invoices ADD COLUMN approved_at TEXT`,
      `ALTER TABLE invoices ADD COLUMN updated_at TEXT`,
      `ALTER TABLE vendors ADD COLUMN portal_access TEXT DEFAULT 'disabled'`,
      `CREATE TABLE IF NOT EXISTS vendor_portal_users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id     INTEGER NOT NULL,
        vendor_code   TEXT    NOT NULL,
        email         TEXT    UNIQUE NOT NULL,
        name          TEXT,
        password_hash TEXT    NOT NULL,
        status        TEXT    DEFAULT 'Active',
        last_login    TEXT,
        created_at    TEXT    DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS vendor_onboarding_invitations (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        invitation_id   TEXT    UNIQUE NOT NULL,
        email           TEXT    NOT NULL,
        token           TEXT    UNIQUE NOT NULL,
        status          TEXT    NOT NULL DEFAULT 'Invited',
        expires_at      TEXT    NOT NULL,
        invited_by      TEXT    NOT NULL,
        created_at      TEXT    DEFAULT (datetime('now')),
        completed_at    TEXT,
        vendor_id       INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS vendor_onboarding_submissions (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id        TEXT    UNIQUE NOT NULL,
        invitation_id        TEXT    NOT NULL,
        email                TEXT    NOT NULL,
        legal_name           TEXT    NOT NULL,
        trade_name           TEXT,
        vendor_type          TEXT,
        gstin                TEXT,
        pan                  TEXT,
        address              TEXT,
        city                 TEXT,
        state                TEXT,
        pincode              TEXT,
        primary_contact_name TEXT,
        primary_contact_no   TEXT,
        accounts_contact_name TEXT,
        accounts_contact_no  TEXT,
        bank_name            TEXT,
        bank_account         TEXT,
        ifsc                 TEXT,
        branch               TEXT,
        status               TEXT    NOT NULL DEFAULT 'Submitted',
        submitted_at         TEXT    DEFAULT (datetime('now')),
        reviewed_at          TEXT,
        reviewed_by          TEXT,
        rejection_reason     TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_onboarding_token ON vendor_onboarding_invitations(token)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_invoice_num ON invoices(vendor_code, invoice_number)`
    ];
    Promise.all(versionMigrations.map(sql => tursoClient.execute(sql).catch(() => {})))
      .then(() => {
        // Backfill legacy invoice records if present
        tursoClient.execute(`
          UPDATE invoices
          SET invoice_id = COALESCE(invoice_id, 'INV-LEGACY-' || id),
              invoice_number = COALESCE(invoice_number, invoice_no, 'INV-' || id),
              invoice_total = COALESCE(NULLIF(invoice_total, 0), total_amount, 0),
              vendor_code = COALESCE(vendor_code, 'UNKNOWN'),
              vendor_name = COALESCE(vendor_name, 'Unknown Vendor'),
              po_no = COALESCE(po_no, 'UNKNOWN'),
              uploaded_by = COALESCE(uploaded_by, created_by, 'system')
          WHERE invoice_id IS NULL OR invoice_number IS NULL OR invoice_total = 0
        `).catch(() => {});
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
