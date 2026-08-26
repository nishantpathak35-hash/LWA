require('dotenv').config({ path: './.env' });
const { createClient } = require('@libsql/client');
const c = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});

async function run() {
  try {
    await c.execute(`CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      roles TEXT,
      password_hash TEXT,
      invite_token TEXT,
      active BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('users table created');

    await c.execute(`CREATE TABLE IF NOT EXISTS po_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_no TEXT NOT NULL,
      description TEXT,
      hsn_sac TEXT,
      qty REAL DEFAULT 0,
      unit TEXT,
      rate REAL DEFAULT 0,
      disc_pct REAL DEFAULT 0,
      tax_pct REAL DEFAULT 0,
      amount REAL DEFAULT 0
    )`);
    console.log('po_items table created');

    await c.execute(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_name TEXT,
      invoice_no TEXT,
      invoice_date TEXT,
      total_amount REAL DEFAULT 0,
      raw_text TEXT,
      status TEXT DEFAULT 'Scanned',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('invoices table created');

    // Make sure we have an admin user just in case
    await c.execute({
      sql: 'INSERT OR IGNORE INTO users (email, name, roles, active) VALUES (?, ?, ?, ?)',
      args: ['nishant@luxeworxatelier.com', 'Nishant Pathak', JSON.stringify(['director', 'admin', 'finance', 'procurement']), true]
    });
    console.log('admin user ensured');

  } catch (e) {
    console.error(e);
  }
}
run();
