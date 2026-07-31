import 'dotenv/config';
import { queryAll, queryRun } from '../app/lib/db.js';

async function runMigration() {
  console.log('===========================================================');
  console.log('       STARTING VENDOR INTEGRITY ARCHITECTURAL MIGRATION    ');
  console.log('===========================================================\n');

  try {
    // 1. ADD COLUMNS IF MISSING
    console.log('[1/7] Ensuring vendor_id and vendor_code columns exist...');
    const alterCommands = [
      `ALTER TABLE purchase_orders ADD COLUMN vendor_id INTEGER`,
      `ALTER TABLE purchase_orders ADD COLUMN vendor_code TEXT`,
      `ALTER TABLE payment_requests ADD COLUMN vendor_id INTEGER`,
      `ALTER TABLE payment_requests ADD COLUMN vendor_code TEXT`
    ];

    for (const sql of alterCommands) {
      try {
        await queryRun(sql);
        console.log(`  Executed: ${sql}`);
      } catch (err) {
        // Ignore column already exists errors
      }
    }

    // 2. FIX INVALID VENDOR CODES IN VENDORS TABLE
    console.log('\n[2/7] Repairing invalid/missing vendor_codes in vendors table...');
    const invalidVendors = await queryAll(`SELECT id, legal_name, vendor_code FROM vendors WHERE vendor_code IS NULL OR vendor_code = '' OR vendor_code = '#N/A' OR vendor_code LIKE '#%'`);
    for (const v of invalidVendors) {
      const newCode = `VEN-${String(v.id).padStart(3, '0')}`;
      console.log(`  Fixing vendor ID ${v.id} ("${v.legal_name}"): code "${v.vendor_code}" -> "${newCode}"`);
      await queryRun(`UPDATE vendors SET vendor_code = ? WHERE id = ?`, [newCode, v.id]);
    }

    // 3. AUTO-CREATE MISSING VENDORS FROM POs (e.g. "Adil Electrical")
    console.log('\n[3/7] Finding and creating missing Vendor Master records from POs...');
    const allPOs = await queryAll(`SELECT po_no, vendor_key, vendor_name FROM purchase_orders`);
    const allVendors = await queryAll(`SELECT id, vendor_code, legal_name, trade_name FROM vendors`);

    const knownNames = new Set();
    allVendors.forEach(v => {
      if (v.legal_name) knownNames.add(v.legal_name.trim().toLowerCase());
      if (v.trade_name) knownNames.add(v.trade_name.trim().toLowerCase());
    });

    const missingVendorNames = new Set();
    allPOs.forEach(p => {
      const name = (p.vendor_name || '').trim();
      if (name && !knownNames.has(name.toLowerCase())) {
        missingVendorNames.add(name);
      }
    });

    console.log(`  Found ${missingVendorNames.size} missing vendor(s) in Vendor Master:`, Array.from(missingVendorNames));
    for (const name of missingVendorNames) {
      // Find highest existing numeric vendor code to generate next code
      const highestCodeRow = await queryAll(`SELECT vendor_code FROM vendors WHERE vendor_code LIKE 'VEN-%'`);
      let maxNum = 0;
      highestCodeRow.forEach(r => {
        const num = parseInt(r.vendor_code.replace('VEN-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });
      const nextCode = `VEN-${String(maxNum + 1).padStart(3, '0')}`;

      console.log(`  Creating Vendor Master record for "${name}" with code ${nextCode}...`);
      await queryRun(
        `INSERT INTO vendors (legal_name, trade_name, vendor_code, status) VALUES (?, ?, ?, 'Active')`,
        [name, name, nextCode]
      );
    }

    // Refresh vendor map after insertions
    const refreshedVendors = await queryAll(`SELECT id, vendor_code, legal_name, trade_name, gstin FROM vendors`);

    // 4. DEDUPLICATE VENDORS IN VENDORS TABLE
    console.log('\n[4/7] Deduplicating vendor master records...');
    const nameToVendorsMap = new Map();
    refreshedVendors.forEach(v => {
      const norm = (v.legal_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!nameToVendorsMap.has(norm)) nameToVendorsMap.set(norm, []);
      nameToVendorsMap.get(norm).push(v);
    });

    for (const [normName, group] of nameToVendorsMap.entries()) {
      if (group.length > 1) {
        console.log(`  Found duplicate group for "${normName}":`, group.map(g => `${g.id} (${g.vendor_code})`));
        // Sort group: canonical is the one with earliest ID or non-empty GSTIN
        group.sort((a, b) => {
          if (a.gstin && !b.gstin) return -1;
          if (!a.gstin && b.gstin) return 1;
          return a.id - b.id;
        });

        const canonical = group[0];
        const duplicates = group.slice(1);

        for (const dupe of duplicates) {
          console.log(`    Merging dupe ID ${dupe.id} (${dupe.vendor_code}) into Canonical ID ${canonical.id} (${canonical.vendor_code})...`);
          
          // Re-link POs
          await queryRun(
            `UPDATE purchase_orders SET vendor_key = ?, vendor_code = ?, vendor_id = ?, vendor_name = ? WHERE vendor_key = ? OR vendor_code = ? OR vendor_id = ? OR LOWER(TRIM(vendor_name)) = LOWER(TRIM(?))`,
            [canonical.vendor_code, canonical.vendor_code, canonical.id, canonical.legal_name, dupe.vendor_code, dupe.vendor_code, dupe.id, dupe.legal_name]
          );

          // Re-link PRs
          await queryRun(
            `UPDATE payment_requests SET vendor_code = ?, vendor_id = ?, vendor_name = ? WHERE vendor_code = ? OR vendor_id = ? OR LOWER(TRIM(vendor_name)) = LOWER(TRIM(?))`,
            [canonical.vendor_code, canonical.id, canonical.legal_name, dupe.vendor_code, dupe.id, dupe.legal_name]
          );

          // Delete dupe vendor
          await queryRun(`DELETE FROM vendors WHERE id = ?`, [dupe.id]);
          console.log(`    Deleted duplicate vendor ID ${dupe.id}`);
        }
      }
    }

    // 5. POPULATE VENDOR_ID AND VENDOR_CODE ON PURCHASE ORDERS
    console.log('\n[5/7] Populating vendor_id and vendor_code on purchase_orders...');
    const finalVendors = await queryAll(`SELECT id, vendor_code, legal_name, trade_name FROM vendors`);
    const vendorLookup = new Map();

    finalVendors.forEach(v => {
      if (v.vendor_code) vendorLookup.set(v.vendor_code.trim().toLowerCase(), v);
      if (v.legal_name) vendorLookup.set(v.legal_name.trim().toLowerCase(), v);
      if (v.trade_name) vendorLookup.set(v.trade_name.trim().toLowerCase(), v);
    });

    const posToUpdate = await queryAll(`SELECT po_no, vendor_key, vendor_name FROM purchase_orders`);
    let updatedPOCount = 0;

    for (const po of posToUpdate) {
      const key = (po.vendor_key || '').trim().toLowerCase();
      const name = (po.vendor_name || '').trim().toLowerCase();

      const matchedVendor = vendorLookup.get(key) || vendorLookup.get(name);
      if (matchedVendor) {
        await queryRun(
          `UPDATE purchase_orders SET vendor_id = ?, vendor_code = ?, vendor_key = ?, vendor_name = ? WHERE po_no = ?`,
          [matchedVendor.id, matchedVendor.vendor_code, matchedVendor.vendor_code, matchedVendor.legal_name, po.po_no]
        );
        updatedPOCount++;
      } else {
        console.warn(`  WARNING: Unmatched PO ${po.po_no} (Key: "${po.vendor_key}", Name: "${po.vendor_name}")`);
      }
    }
    console.log(`  Successfully updated vendor references for ${updatedPOCount} / ${posToUpdate.length} Purchase Orders.`);

    // 6. POPULATE VENDOR_ID AND VENDOR_CODE ON PAYMENT REQUESTS
    console.log('\n[6/7] Populating vendor_id and vendor_code on payment_requests...');
    const prsToUpdate = await queryAll(`SELECT pr_id, po_no, vendor_code, vendor_name FROM payment_requests`);
    let updatedPRCount = 0;

    for (const pr of prsToUpdate) {
      let matchedVendor = null;
      if (pr.po_no) {
        const poRow = await queryAll(`SELECT vendor_id, vendor_code, vendor_name FROM purchase_orders WHERE po_no = ?`, [pr.po_no]);
        if (poRow.length > 0 && poRow[0].vendor_id) {
          matchedVendor = { id: poRow[0].vendor_id, vendor_code: poRow[0].vendor_code, legal_name: poRow[0].vendor_name };
        }
      }

      if (!matchedVendor) {
        const code = (pr.vendor_code || '').trim().toLowerCase();
        const name = (pr.vendor_name || '').trim().toLowerCase();
        matchedVendor = vendorLookup.get(code) || vendorLookup.get(name);
      }

      if (matchedVendor) {
        await queryRun(
          `UPDATE payment_requests SET vendor_id = ?, vendor_code = ?, vendor_name = ? WHERE pr_id = ?`,
          [matchedVendor.id, matchedVendor.vendor_code, matchedVendor.legal_name, pr.pr_id]
        );
        updatedPRCount++;
      } else {
        console.warn(`  WARNING: Unmatched PR ${pr.pr_id} (PO: "${pr.po_no}", Code: "${pr.vendor_code}", Name: "${pr.vendor_name}")`);
      }
    }
    console.log(`  Successfully updated vendor references for ${updatedPRCount} / ${prsToUpdate.length} Payment Requests.`);

    // 7. CREATE INDEXES
    console.log('\n[7/7] Creating database indexes...');
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendor_code)`,
      `CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(legal_name)`,
      `CREATE INDEX IF NOT EXISTS idx_po_vendor_id ON purchase_orders(vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_po_vendor_code ON purchase_orders(vendor_code)`,
      `CREATE INDEX IF NOT EXISTS idx_pr_vendor_id ON payment_requests(vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_pr_vendor_code ON payment_requests(vendor_code)`,
      `CREATE INDEX IF NOT EXISTS idx_pr_po_no ON payment_requests(po_no)`
    ];

    for (const idxSql of indexes) {
      await queryRun(idxSql);
      console.log(`  Created index: ${idxSql}`);
    }

    console.log('\n===========================================================');
    console.log('       MIGRATION COMPLETED SUCCESSFULLY!                    ');
    console.log('===========================================================');
  } catch (err) {
    console.error('CRITICAL MIGRATION ERROR:', err);
    process.exit(1);
  }
}

runMigration();
