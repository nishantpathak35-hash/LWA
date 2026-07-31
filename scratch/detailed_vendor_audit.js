import 'dotenv/config';
import { queryAll } from '../app/lib/db.js';

async function detailedVendorAudit() {
  try {
    console.log('=== DUMP OF VENDORS WITH WEIRD CODES OR DUPLICATES ===');
    const vendors = await queryAll(`SELECT id, vendor_code, legal_name, trade_name, gstin, status FROM vendors`);
    console.log(`All Vendors (${vendors.length}):`);
    vendors.forEach(v => {
      if (!v.vendor_code || v.vendor_code.includes('#') || v.vendor_code.trim() === '' || v.legal_name.includes('#')) {
        console.log(`[WEIRD] ID: ${v.id}, Code: "${v.vendor_code}", Name: "${v.legal_name}", Trade: "${v.trade_name}"`);
      }
    });

    console.log('\n=== CHECKING ALL POS WITH NON-STANDARD VENDOR_KEYS ===');
    const pos = await queryAll(`SELECT po_no, vendor_key, vendor_name, project, po_value FROM purchase_orders`);
    pos.forEach(p => {
      if (!p.vendor_key || p.vendor_key.includes('#') || p.vendor_key.trim() === '' || p.vendor_key === 'N/A') {
        console.log(`[PO WEIRD KEY] PO: ${p.po_no}, Key: "${p.vendor_key}", Name: "${p.vendor_name}", Project: ${p.project}`);
      }
    });

    console.log('\n=== CHECKING ALL PAYMENT REQUESTS FOR VENDOR IDENTIFIERS ===');
    const prs = await queryAll(`SELECT pr_id, po_no, vendor_name, vendor_code, stage, remittance FROM payment_requests`);
    prs.forEach(pr => {
      if (!pr.vendor_code || pr.vendor_code.includes('#') || pr.vendor_code.trim() === '') {
        console.log(`[PR WEIRD CODE] PR: ${pr.pr_id}, PO: ${pr.po_no}, Code: "${pr.vendor_code}", Name: "${pr.vendor_name}"`);
      }
    });

    console.log('\n=== CHECKING FUZZY DUPLICATE VENDORS ===');
    // Group vendors by normalized string (alphanumeric only)
    const normMap = new Map();
    vendors.forEach(v => {
      const norm = (v.legal_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normMap.has(norm)) normMap.set(norm, []);
      normMap.get(norm).push(v);
    });

    normMap.forEach((vList, key) => {
      if (vList.length > 1) {
        console.log(`[FUZZY DUPLICATE GROUP] key: "${key}"`);
        vList.forEach(v => console.log(`   -> ID: ${v.id}, Code: ${v.vendor_code}, Legal: "${v.legal_name}", Trade: "${v.trade_name}", GSTIN: ${v.gstin}`));
      }
    });

  } catch (err) {
    console.error('Audit Error:', err);
  }
}

detailedVendorAudit();
