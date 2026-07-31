import 'dotenv/config';
import { queryAll } from '../app/lib/db.js';

async function comprehensiveCheck() {
  try {
    console.log('====================================================');
    console.log('       SYSTEM-WIDE DATA INTEGRITY AUDIT');
    console.log('====================================================\n');

    // 1. Check all POs vs Vendors
    const allPOs = await queryAll(`SELECT po_no, vendor_key, vendor_name, project, po_value FROM purchase_orders`);
    const allVendors = await queryAll(`SELECT id, vendor_code, legal_name, trade_name, gstin, pan FROM vendors`);

    const vendorCodeMap = new Map();
    const vendorNameMap = new Map();

    allVendors.forEach(v => {
      if (v.vendor_code) vendorCodeMap.set(v.vendor_code.trim().toLowerCase(), v);
      if (v.legal_name) vendorNameMap.set(v.legal_name.trim().toLowerCase(), v);
      if (v.trade_name) vendorNameMap.set(v.trade_name.trim().toLowerCase(), v);
    });

    console.log(`[1] VENDOR MASTER AUDIT`);
    console.log(`- Total Vendors in 'vendors' table: ${allVendors.length}`);

    // Check duplicate vendor_code
    const vCodeCounts = {};
    allVendors.forEach(v => {
      const code = (v.vendor_code || '').trim().toLowerCase();
      if (code) vCodeCounts[code] = (vCodeCounts[code] || 0) + 1;
    });
    const dupCodes = Object.entries(vCodeCounts).filter(([_, count]) => count > 1);
    console.log(`- Duplicate vendor_codes: ${dupCodes.length}`, dupCodes);

    // Check duplicate legal_name / trade_name / gstin
    const vGstinCounts = {};
    allVendors.forEach(v => {
      const gstin = (v.gstin || '').trim().toUpperCase();
      if (gstin && gstin !== 'NA' && gstin !== 'N/A') {
        vGstinCounts[gstin] = vGstinCounts[gstin] || [];
        vGstinCounts[gstin].push(v);
      }
    });
    const dupGstins = Object.entries(vGstinCounts).filter(([_, list]) => list.length > 1);
    console.log(`- Vendors sharing same GSTIN: ${dupGstins.length}`, dupGstins.map(([g, list]) => ({ gstin: g, vendors: list.map(v => v.legal_name) })));


    console.log(`\n[2] PURCHASE ORDER AUDIT`);
    console.log(`- Total Purchase Orders: ${allPOs.length}`);

    let poValidByCode = 0;
    let poValidByNameOnly = 0;
    let poOrphan = 0;
    const orphanPOs = [];
    const invalidVendorKeys = [];

    allPOs.forEach(po => {
      const key = (po.vendor_key || '').trim().toLowerCase();
      const name = (po.vendor_name || '').trim().toLowerCase();

      const matchByCode = key && key !== '#n/a' && key !== 'n/a' && vendorCodeMap.has(key);
      const matchByName = name && vendorNameMap.has(name);

      if (matchByCode) {
        poValidByCode++;
      } else if (matchByName) {
        poValidByNameOnly++;
        invalidVendorKeys.push({ po_no: po.po_no, vendor_key: po.vendor_key, vendor_name: po.vendor_name, matchedVendorCode: vendorNameMap.get(name).vendor_code });
      } else {
        poOrphan++;
        orphanPOs.push({ po_no: po.po_no, vendor_key: po.vendor_key, vendor_name: po.vendor_name });
      }
    });

    console.log(`- POs with valid vendor_key -> vendor_code match: ${poValidByCode}`);
    console.log(`- POs with broken/missing vendor_key BUT matching vendor_name: ${poValidByNameOnly}`);
    console.log(`- Orphan POs (neither vendor_key nor vendor_name found in Vendors table): ${poOrphan}`);
    
    if (invalidVendorKeys.length > 0) {
      console.log(`  Sample POs with broken vendor_key:`, invalidVendorKeys.slice(0, 10));
    }
    if (orphanPOs.length > 0) {
      console.log(`  Sample Orphan POs:`, orphanPOs.slice(0, 10));
    }


    console.log(`\n[3] PAYMENT REQUESTS AUDIT`);
    const allPRs = await queryAll(`SELECT pr_id, po_no, vendor_name, vendor_code, amount_requested, approved_amount, stage, remittance FROM payment_requests`);
    console.log(`- Total Payment Requests: ${allPRs.length}`);

    const prPoNoMap = new Map();
    allPOs.forEach(p => prPoNoMap.set(p.po_no.trim().toLowerCase(), p));

    let prValidPO = 0;
    let prOrphanPO = 0;
    let prMissingVendorCode = 0;
    let prMismatchedVendorWithPO = 0;

    allPRs.forEach(pr => {
      const poKey = (pr.po_no || '').trim().toLowerCase();
      const matchedPO = prPoNoMap.get(poKey);

      if (!poKey || !matchedPO) {
        prOrphanPO++;
      } else {
        prValidPO++;
        if (!pr.vendor_code) {
          prMissingVendorCode++;
        }
      }
    });

    console.log(`- PRs with valid po_no: ${prValidPO}`);
    console.log(`- PRs referencing non-existent or blank po_no: ${prOrphanPO}`);
    console.log(`- PRs missing vendor_code: ${prMissingVendorCode}`);


    console.log(`\n[4] SYSTEM PAYMENTS & MANUAL PAYMENTS AUDIT`);
    const sysPayments = await queryAll(`SELECT id, po_no, pr_key, amount FROM system_payments`);
    const manPayments = await queryAll(`SELECT id, po_no, amount FROM manual_payments`);

    let sysOrphanPO = 0;
    sysPayments.forEach(sp => {
      if (!sp.po_no || !prPoNoMap.has(sp.po_no.trim().toLowerCase())) sysOrphanPO++;
    });

    let manOrphanPO = 0;
    manPayments.forEach(mp => {
      if (!mp.po_no || !prPoNoMap.has(mp.po_no.trim().toLowerCase())) manOrphanPO++;
    });

    console.log(`- System Payments count: ${sysPayments.length} (Orphan PO references: ${sysOrphanPO})`);
    console.log(`- Manual Payments count: ${manPayments.length} (Orphan PO references: ${manOrphanPO})`);


    console.log(`\n[5] PO ITEMS AUDIT`);
    const poItems = await queryAll(`SELECT id, po_no, description, amount FROM po_items`);
    let itemOrphanPO = 0;
    poItems.forEach(item => {
      if (!item.po_no || !prPoNoMap.has(item.po_no.trim().toLowerCase())) itemOrphanPO++;
    });
    console.log(`- PO Items count: ${poItems.length} (Orphan PO references: ${itemOrphanPO})`);

  } catch (err) {
    console.error('Audit Error:', err);
  }
}

comprehensiveCheck();
