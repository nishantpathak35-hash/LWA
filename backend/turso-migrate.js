import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment.');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function migrate() {
  console.log('Connecting to Turso...');
  
  try {
    // Vendors Table
    await client.execute(`
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
    await client.execute(`
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
    await client.execute(`
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
    await client.execute(`
      CREATE TABLE IF NOT EXISTS system_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_no TEXT,
        pr_key TEXT,
        amount REAL DEFAULT 0,
        remitted_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Successfully migrated database schema to Turso!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
