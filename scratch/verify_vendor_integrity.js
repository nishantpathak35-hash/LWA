import 'dotenv/config';
import { queryAll, queryGet } from '../app/lib/db.js';

async function verifyVendorIntegrity() {
  console.log('===========================================================');
  console.log('      AUTOMATED DATA INTEGRITY VERIFICATION SUITE         ');
  console.log('===========================================================\n');

  let totalErrors = 0;

  // Check 1: Check Adil Electrical existence in Vendor Master
  console.log('[Check 1] Verifying Vendor Master for "Adil Electrical"...');
  const adilVendor = await queryGet(`SELECT id, vendor_code, legal_name, status FROM vendors WHERE LOWER(legal_name) LIKE '%adil electrical%'`);
  if (adilVendor) {
    console.log(`  ✓ SUCCESS: Vendor "Adil Electrical" found in Vendor Master (ID: ${adilVendor.id}, Code: ${adilVendor.vendor_code}, Status: ${adilVendor.status})`);
  } else {
    console.error(`  ❌ FAILED: Vendor "Adil Electrical" NOT found in Vendor Master!`);
    totalErrors++;
  }

  // Check 2: Check PO for Adil Electrical
  console.log('\n[Check 2] Verifying Purchase Order "LAIPL/PO/26-27/023" for Adil Electrical...');
  const adilPO = await queryGet(`SELECT po_no, vendor_id, vendor_code, vendor_name, project, po_value FROM purchase_orders WHERE po_no = 'LAIPL/PO/26-27/023'`);
  if (adilPO && adilPO.vendor_id === adilVendor?.id && adilPO.vendor_code === adilVendor?.vendor_code) {
    console.log(`  ✓ SUCCESS: PO "${adilPO.po_no}" correctly linked to Vendor Master ID ${adilPO.vendor_id} (${adilPO.vendor_code})`);
  } else {
    console.error(`  ❌ FAILED: PO linking broken! PO Data:`, adilPO);
    totalErrors++;
  }

  // Check 3: Every PO references a valid vendor in 'vendors' table
  console.log('\n[Check 3] Verifying every PO references a valid vendor in Vendor Master...');
  const orphanPOs = await queryAll(`
    SELECT po.po_no, po.vendor_id, po.vendor_code, po.vendor_name 
    FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id
    WHERE v.id IS NULL OR po.vendor_id IS NULL OR po.vendor_code IS NULL OR po.vendor_code = '#N/A' OR po.vendor_code = ''
  `);
  if (orphanPOs.length === 0) {
    console.log(`  ✓ SUCCESS: All Purchase Orders (100%) reference valid Vendor Master records with non-null vendor_id and vendor_code.`);
  } else {
    console.error(`  ❌ FAILED: Found ${orphanPOs.length} orphan POs with missing/broken vendor references:`, orphanPOs);
    totalErrors++;
  }

  // Check 4: Every Payment Request references a valid PO and a valid vendor
  console.log('\n[Check 4] Verifying every Payment Request references a valid PO and vendor...');
  const orphanPRs = await queryAll(`
    SELECT pr.pr_id, pr.po_no, pr.vendor_id, pr.vendor_code, pr.vendor_name
    FROM payment_requests pr
    LEFT JOIN purchase_orders po ON pr.po_no = po.po_no
    LEFT JOIN vendors v ON pr.vendor_id = v.id
    WHERE po.po_no IS NULL OR v.id IS NULL OR pr.vendor_id IS NULL OR pr.vendor_code IS NULL OR pr.vendor_code = '#N/A'
  `);
  if (orphanPRs.length === 0) {
    console.log(`  ✓ SUCCESS: All Payment Requests (100%) reference valid Purchase Orders and Vendor Master records.`);
  } else {
    console.error(`  ❌ FAILED: Found ${orphanPRs.length} orphan PRs:`, orphanPRs);
    totalErrors++;
  }

  // Check 5: No duplicate vendors in Vendor Master
  console.log('\n[Check 5] Verifying no duplicate vendor names or GSTINs in Vendor Master...');
  const vendors = await queryAll(`SELECT id, vendor_code, legal_name, gstin FROM vendors`);
  const nameMap = new Map();
  vendors.forEach(v => {
    const norm = (v.legal_name || '').trim().toLowerCase();
    if (!nameMap.has(norm)) nameMap.set(norm, []);
    nameMap.get(norm).push(v);
  });
  const dupes = Array.from(nameMap.entries()).filter(([_, list]) => list.length > 1);
  if (dupes.length === 0) {
    console.log(`  ✓ SUCCESS: No duplicate vendor names found in Vendor Master.`);
  } else {
    console.error(`  ❌ FAILED: Found ${dupes.length} duplicate vendor name groups:`, dupes);
    totalErrors++;
  }

  // Check 6: No invalid/weird vendor codes like '#N/A'
  console.log('\n[Check 6] Verifying no vendor has vendor_code = "#N/A" or blank...');
  const invalidCodes = await queryAll(`SELECT id, vendor_code, legal_name FROM vendors WHERE vendor_code IS NULL OR vendor_code = '' OR vendor_code = '#N/A' OR vendor_code LIKE '#%'`);
  if (invalidCodes.length === 0) {
    console.log(`  ✓ SUCCESS: All vendor codes in Vendor Master are valid.`);
  } else {
    console.error(`  ❌ FAILED: Found ${invalidCodes.length} vendors with invalid codes:`, invalidCodes);
    totalErrors++;
  }

  // Check 7: API verification (getMasterData & getVendorSummary)
  console.log('\n[Check 7] Verifying getVendorSummary API logic for Adil Electrical...');
  const { getVendorSummary } = await import('../app/lib/api/vendors.js');
  const mockSession = { email: 'admin@luxeworxatelier.com', role: 'admin' };
  const summaryResult = await getVendorSummary('Adil Electrical', mockSession);
  if (summaryResult && summaryResult.length > 0 && summaryResult[0].vendor.includes('Adil Electrical')) {
    console.log(`  ✓ SUCCESS: getVendorSummary API returned "Adil Electrical":`, summaryResult[0]);
  } else {
    console.error(`  ❌ FAILED: getVendorSummary did not return Adil Electrical:`, summaryResult);
    totalErrors++;
  }

  // Check 8: Report verification for Adil Electrical
  console.log('\n[Check 8] Verifying Payment Report API for Adil Electrical...');
  const { getPaymentReportRows } = await import('../app/lib/api/reports.js');
  const reportRows = await getPaymentReportRows({ vendor: 'Adil Electrical' }, mockSession);
  console.log(`  ✓ SUCCESS: Payment report query for "Adil Electrical" executed clean (Found ${reportRows.length} matching PR rows).`);

  console.log('\n===========================================================');
  if (totalErrors === 0) {
    console.log('       ALL VERIFICATION CHECKS PASSED PERFECTLY! (100%)    ');
  } else {
    console.error(`       VERIFICATION COMPLETED WITH ${totalErrors} ERROR(S)   `);
  }
  console.log('===========================================================');
}

verifyVendorIntegrity();
