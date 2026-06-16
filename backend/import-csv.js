import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
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

async function processCSV(filePath, insertQuery, rowMapper) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping: ${filePath} not found.`);
      return resolve();
    }

    console.log(`Processing ${filePath}...`);
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(rowMapper(data)))
      .on('end', async () => {
        let inserted = 0;
        for (const rowArgs of results) {
          try {
            await client.execute({ sql: insertQuery, args: rowArgs });
            inserted++;
          } catch (err) {
            console.error(`Failed to insert row in ${filePath}:`, err.message);
          }
        }
        console.log(`Finished ${filePath}: Inserted ${inserted} records.`);
        resolve();
      })
      .on('error', reject);
  });
}

async function runImports() {
  console.log('Connecting to Turso...');

  // 1. Vendors
  const vendorsSQL = `
    INSERT INTO vendors (legal_name, trade_name, vendor_code, vendor_type, pan, gstin, bank_account, ifsc, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await processCSV(path.join(process.cwd(), 'backend', 'vendors.csv'), vendorsSQL, (row) => [
    row.legal_name || row['Legal Name'] || '',
    row.trade_name || row['Trade Name'] || '',
    row.vendor_code || row['Vendor Code'] || '',
    row.vendor_type || row['Type'] || '',
    row.pan || row['PAN'] || '',
    row.gstin || row['GSTIN'] || '',
    row.bank_account || row['Bank Account'] || '',
    row.ifsc || row['IFSC'] || '',
    row.status || row['Status'] || 'Active'
  ]);

  // 2. Purchase Orders
  const posSQL = `
    INSERT INTO purchase_orders (po_no, vendor_key, vendor_name, project, po_value, revised_po_value, status, po_date, legacy_paid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await processCSV(path.join(process.cwd(), 'backend', 'purchase_orders.csv'), posSQL, (row) => [
    row.po_no || row['PO Number'] || row['PO No'] || '',
    row.vendor_key || row['Vendor Code'] || '',
    row.vendor_name || row['Vendor Name'] || '',
    row.project || row['Project'] || '',
    Number(row.po_value || row['PO Value']) || 0,
    Number(row.revised_po_value || row['Revised Value']) || 0,
    row.status || row['Status'] || 'Open',
    row.po_date || row['Date'] || '',
    Number(row.legacy_paid || row['Paid']) || 0
  ]);

  // 3. Payment Requests
  const prsSQL = `
    INSERT INTO payment_requests (po_no, vendor_name, project, category, amount_requested, stage, remittance)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  await processCSV(path.join(process.cwd(), 'backend', 'payment_requests.csv'), prsSQL, (row) => [
    row.po_no || row['PO Number'] || '',
    row.vendor_name || row['Vendor Name'] || '',
    row.project || row['Project'] || '',
    row.category || row['Category'] || '',
    Number(row.amount_requested || row['Amount']) || 0,
    row.stage || row['Stage'] || '',
    row.remittance || row['Remittance'] || ''
  ]);

  console.log('All CSV imports complete!');
}

runImports();
