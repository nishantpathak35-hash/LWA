import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment.');
  process.exit(1);
}

const client = createClient({ url, authToken });

function parseNumber(val) {
  if (!val) return 0;
  // Remove commas and convert to float
  const clean = val.replace(/,/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

async function runImport() {
  console.log('Connecting to Turso...');
  
  const filePath = path.join(process.cwd(), 'Sheet.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error('Sheet.csv not found at', filePath);
    process.exit(1);
  }

  const vendorsMap = new Map(); // vendor_code -> vendor obj
  const posMap = new Map(); // po_no -> po obj

  console.log('Reading Sheet.csv...');
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      const poNo = row['PO No.'] ? row['PO No.'].trim() : '';
      if (!poNo) return; // Skip rows without PO No.
      if (poNo === 'PO No.') return; // Skip sub-headers

      const vendorCode = row['Vendor Code'] ? row['Vendor Code'].trim() : '';
      const vendorName = row['Vendor Name'] ? row['Vendor Name'].trim() : '';
      const project = row['Project'] ? row['Project'].trim() : '';
      const poValue = parseNumber(row['PO Value']);
      const revisedPoValue = parseNumber(row['Revised PO Value']);
      const amountPaid = parseNumber(row['Amount Paid']);
      const status = row['PO STATUS'] ? row['PO STATUS'].trim() : 'Open';

      // 1. Map Vendor
      if (vendorCode && vendorCode !== '#REF!' && vendorCode !== '#N/A') {
        if (!vendorsMap.has(vendorCode)) {
          vendorsMap.set(vendorCode, {
            legal_name: vendorName,
            vendor_code: vendorCode
          });
        }
      }

      // 2. Map PO
      if (!posMap.has(poNo)) {
        posMap.set(poNo, {
          po_no: poNo,
          vendor_key: vendorCode,
          vendor_name: vendorName,
          project: project,
          po_value: poValue,
          revised_po_value: revisedPoValue,
          status: status,
          legacy_paid: amountPaid
        });
      }
    })
    .on('end', async () => {
      console.log(`Parsed ${vendorsMap.size} unique vendors and ${posMap.size} POs.`);
      
      console.log('Uploading Vendors...');
      for (const [code, v] of vendorsMap.entries()) {
        try {
          await client.execute({
            sql: `INSERT OR IGNORE INTO vendors (legal_name, vendor_code, status) VALUES (?, ?, 'Active')`,
            args: [v.legal_name, v.vendor_code]
          });
        } catch (err) {
          console.error('Vendor Insert Error:', err.message);
        }
      }

      console.log('Uploading Purchase Orders & System Payments...');
      for (const [poNo, po] of posMap.entries()) {
        try {
          await client.execute({
            sql: `INSERT OR REPLACE INTO purchase_orders (po_no, vendor_key, vendor_name, project, po_value, revised_po_value, status, legacy_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [po.po_no, po.vendor_key, po.vendor_name, po.project, po.po_value, po.revised_po_value, po.status, po.legacy_paid]
          });

          // Create a mock system_payment if paid > 0
          if (po.legacy_paid > 0) {
            await client.execute({
              sql: `INSERT INTO system_payments (po_no, amount, remitted_by) VALUES (?, ?, ?)`,
              args: [po.po_no, po.legacy_paid, 'Legacy Import']
            });
          }
        } catch (err) {
          console.error('PO Insert Error:', err.message);
        }
      }

      console.log('Data Migration Complete!');
      process.exit(0);
    });
}

runImport();
