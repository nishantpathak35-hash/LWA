import 'dotenv/config';
import { queryAll } from '../app/lib/db.js';

async function deepInspection() {
  try {
    console.log('=== DATABASE SCHEMAS & TABLES ===');
    const tables = await queryAll(`SELECT name FROM sqlite_master WHERE type='table'`);
    console.log('Tables in DB:', tables.map(t => t.name));

    for (const t of tables) {
      if (t.name.startsWith('sqlite_')) continue;
      const schema = await queryAll(`PRAGMA table_info("${t.name}")`);
      console.log(`\n--- TABLE: ${t.name} ---`);
      console.log(schema.map(c => `${c.name} (${c.type}) ${c.notnull ? 'NOT NULL' : ''} ${c.pk ? 'PK' : ''}`).join(', '));
    }

    console.log('\n=== CHECKING VENDORS FOR "Adil Electrical" ===');
    const adilVendors = await queryAll(`SELECT * FROM vendors WHERE LOWER(legal_name) LIKE '%adil%' OR LOWER(trade_name) LIKE '%adil%' OR LOWER(vendor_code) LIKE '%adil%'`);
    console.log('Vendors matching "Adil":', JSON.stringify(adilVendors, null, 2));

    console.log('\n=== CHECKING POs FOR "Adil" ===');
    const adilPOs = await queryAll(`SELECT po_no, vendor_key, vendor_name, project, po_value, status FROM purchase_orders WHERE LOWER(vendor_name) LIKE '%adil%' OR LOWER(vendor_key) LIKE '%adil%'`);
    console.log('POs matching "Adil":', JSON.stringify(adilPOs, null, 2));

    console.log('\n=== CHECKING PAYMENT REQUESTS FOR "Adil" ===');
    const adilPRs = await queryAll(`SELECT * FROM payment_requests WHERE LOWER(vendor_name) LIKE '%adil%' OR LOWER(vendor_code) LIKE '%adil%' OR po_no IN (SELECT po_no FROM purchase_orders WHERE LOWER(vendor_name) LIKE '%adil%')`);
    console.log('PRs matching "Adil":', JSON.stringify(adilPRs, null, 2));

    console.log('\n=== SYSTEM-WIDE REFERENTIAL DISCREPANCIES ===');
    
    // 1. POs with vendor_key that DOES NOT exist in vendors.vendor_code or vendors.id or vendors.legal_name
    const orphanPOsKey = await queryAll(`
      SELECT po.po_no, po.vendor_key, po.vendor_name 
      FROM purchase_orders po
      LEFT JOIN vendors v ON LOWER(TRIM(po.vendor_key)) = LOWER(TRIM(v.vendor_code))
      WHERE v.vendor_code IS NULL
    `);
    console.log(`POs with vendor_key not in vendors.vendor_code (${orphanPOsKey.length}):`, orphanPOsKey.slice(0, 10));

    // 2. POs with vendor_name that DOES NOT match any vendors.legal_name or trade_name
    const orphanPOsName = await queryAll(`
      SELECT po.po_no, po.vendor_key, po.vendor_name 
      FROM purchase_orders po
      LEFT JOIN vendors v ON LOWER(TRIM(po.vendor_name)) = LOWER(TRIM(v.legal_name)) OR LOWER(TRIM(po.vendor_name)) = LOWER(TRIM(v.trade_name))
      WHERE v.legal_name IS NULL
    `);
    console.log(`POs with vendor_name not matching vendors.legal_name/trade_name (${orphanPOsName.length}):`, orphanPOsName.slice(0, 10));

    // 3. Payment requests with po_no not in purchase_orders
    const orphanPRsPO = await queryAll(`
      SELECT pr.pr_id, pr.po_no, pr.vendor_name, pr.vendor_code
      FROM payment_requests pr
      LEFT JOIN purchase_orders po ON LOWER(TRIM(pr.po_no)) = LOWER(TRIM(po.po_no))
      WHERE po.po_no IS NULL AND pr.po_no IS NOT NULL AND pr.po_no != ''
    `);
    console.log(`Payment Requests referencing non-existent po_no (${orphanPRsPO.length}):`, orphanPRsPO);

    // 4. Duplicate Vendors in vendors table (fuzzy/similar names or clean match)
    const allVendors = await queryAll(`SELECT id, vendor_code, legal_name, trade_name, gstin, pan FROM vendors`);
    console.log(`Total vendors in DB: ${allVendors.length}`);

    // Check duplicate legal_name / trade_name (case-insensitive trim)
    const nameMap = {};
    allVendors.forEach(v => {
      const norm = (v.legal_name || '').trim().toLowerCase();
      if (!nameMap[norm]) nameMap[norm] = [];
      nameMap[norm].push(v);
    });
    const dupNames = Object.entries(nameMap).filter(([k, v]) => v.length > 1);
    console.log(`Duplicate vendor names (${dupNames.length}):`, dupNames);

  } catch (err) {
    console.error('Error during deep inspection:', err);
  }
}

deepInspection();
