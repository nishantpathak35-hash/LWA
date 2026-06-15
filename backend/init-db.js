const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');

// Remove existing DB for a fresh start
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

db.serialize(() => {
  // Vendors Table
  db.run(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      legal_name TEXT NOT NULL,
      trade_name TEXT,
      vendor_code TEXT UNIQUE,
      vendor_type TEXT,
      pan TEXT,
      gstin TEXT,
      bank_account TEXT,
      ifsc TEXT,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Purchase Orders Table
  db.run(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      po_no TEXT PRIMARY KEY,
      vendor_key TEXT NOT NULL,
      vendor_name TEXT,
      project TEXT,
      po_value REAL DEFAULT 0,
      revised_po_value REAL DEFAULT 0,
      status TEXT DEFAULT 'Open',
      po_date TEXT,
      certified_value REAL DEFAULT 0,
      legacy_paid REAL DEFAULT 0,
      advance REAL DEFAULT 0,
      final_payable REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Payment Requests (PR) Table
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_requests (
      pr_id INTEGER PRIMARY KEY,
      po_no TEXT,
      vendor_name TEXT,
      project TEXT,
      category TEXT,
      amount_requested REAL DEFAULT 0,
      proc_amt REAL DEFAULT 0,
      finance_amt REAL DEFAULT 0,
      director_amt REAL DEFAULT 0,
      proc_approval TEXT,
      finance_approval TEXT,
      director_approval TEXT,
      remittance TEXT,
      stage TEXT,
      created_at DATETIME
    )
  `);

  // System Payments Table
  db.run(`
    CREATE TABLE IF NOT EXISTS system_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_no TEXT,
      pr_key TEXT,
      amount REAL DEFAULT 0,
      remitted_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables created successfully.');
});

db.close();
