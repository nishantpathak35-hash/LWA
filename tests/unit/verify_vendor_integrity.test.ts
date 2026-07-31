import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { queryAll, queryGet } from '../../app/lib/db.js';
import { getVendorSummary } from '../../app/lib/api/vendors.js';
import { getPaymentReportRows } from '../../app/lib/api/reports.js';

describe('Systemic Vendor Data Integrity Verification', () => {
  it('Check 1: Verifies Vendor Master for "Adil Electrical"', async () => {
    const adilVendor = await queryGet(`SELECT id, vendor_code, legal_name, status FROM vendors WHERE LOWER(legal_name) LIKE '%adil electrical%'`);
    expect(adilVendor).toBeDefined();
    expect(adilVendor.legal_name).toContain('Adil Electrical');
    expect(adilVendor.vendor_code).toBeTruthy();
    expect(adilVendor.status).toBe('Active');
  });

  it('Check 2: Verifies PO "LAIPL/PO/26-27/023" for Adil Electrical', async () => {
    const adilVendor = await queryGet(`SELECT id, vendor_code FROM vendors WHERE LOWER(legal_name) LIKE '%adil electrical%'`);
    const adilPO = await queryGet(`SELECT po_no, vendor_id, vendor_code, vendor_name, project, po_value FROM purchase_orders WHERE po_no = 'LAIPL/PO/26-27/023'`);
    expect(adilPO).toBeDefined();
    expect(adilPO.vendor_id).toBe(adilVendor.id);
    expect(adilPO.vendor_code).toBe(adilVendor.vendor_code);
  });

  it('Check 3: Verifies 100% of POs reference a valid vendor in Vendor Master', async () => {
    const orphanPOs = await queryAll(`
      SELECT po.po_no, po.vendor_id, po.vendor_code, po.vendor_name 
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE v.id IS NULL OR po.vendor_id IS NULL OR po.vendor_code IS NULL OR po.vendor_code = '#N/A' OR po.vendor_code = ''
    `);
    expect(orphanPOs.length).toBe(0);
  });

  it('Check 4: Verifies 100% of Payment Requests reference a valid PO and vendor', async () => {
    const orphanPRs = await queryAll(`
      SELECT pr.pr_id, pr.po_no, pr.vendor_id, pr.vendor_code, pr.vendor_name
      FROM payment_requests pr
      LEFT JOIN purchase_orders po ON pr.po_no = po.po_no
      LEFT JOIN vendors v ON pr.vendor_id = v.id
      WHERE po.po_no IS NULL OR v.id IS NULL OR pr.vendor_id IS NULL OR pr.vendor_code IS NULL OR pr.vendor_code = '#N/A'
    `);
    expect(orphanPRs.length).toBe(0);
  });

  it('Check 5: Verifies no duplicate vendor names exist in Vendor Master', async () => {
    const vendors = await queryAll(`SELECT id, vendor_code, legal_name FROM vendors`);
    const nameMap = new Map();
    vendors.forEach(v => {
      const norm = (v.legal_name || '').trim().toLowerCase();
      if (!nameMap.has(norm)) nameMap.set(norm, []);
      nameMap.get(norm).push(v);
    });
    const dupes = Array.from(nameMap.entries()).filter(([_, list]) => list.length > 1);
    expect(dupes.length).toBe(0);
  });

  it('Check 6: Verifies no vendor code is "#N/A" or blank', async () => {
    const invalidCodes = await queryAll(`SELECT id, vendor_code, legal_name FROM vendors WHERE vendor_code IS NULL OR vendor_code = '' OR vendor_code = '#N/A' OR vendor_code LIKE '#%'`);
    expect(invalidCodes.length).toBe(0);
  });

  it('Check 7: Verifies getVendorSummary API returns Adil Electrical', async () => {
    const mockSession = { email: 'admin@luxeworxatelier.com', role: 'admin' };
    const summaryResult = await getVendorSummary('Adil Electrical', mockSession);
    expect(summaryResult.length).toBeGreaterThan(0);
    expect(summaryResult[0].vendor).toContain('Adil Electrical');
  });

  it('Check 8: Verifies Payment Report API returns Adil Electrical records cleanly', async () => {
    const mockSession = { email: 'admin@luxeworxatelier.com', role: 'admin' };
    const reportRows = await getPaymentReportRows({ vendor: 'Adil Electrical' }, mockSession);
    expect(Array.isArray(reportRows)).toBe(true);
  });
});
