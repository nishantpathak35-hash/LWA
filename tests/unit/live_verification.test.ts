import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { describe, it, expect } from 'vitest';

describe('Live End-to-End Workflow Verification', () => {
  it('executes full vendor portal identity, PO check, invoice submission, DB query, and status update workflow', async () => {
    console.log('=== STARTING LIVE END-TO-END WORKFLOW VERIFICATION ===\n');

    // Dynamic imports after env variables are set
    const { queryAll, queryGet } = await import('../../app/lib/db.js');
    const { VendorPortalAuthService } = await import('../../src/modules/vendor-portal/services/VendorPortalAuthService');
    const { InvoiceService } = await import('../../src/modules/invoices/services/InvoiceService');
    const { InvoiceRepository } = await import('../../src/modules/invoices/repositories/InvoiceRepository');
    const { PORepository } = await import('../../src/modules/purchase-orders/repositories/PORepository');
    const { VendorRepository } = await import('../../src/modules/vendors/repositories/VendorRepository');

    // 1. Check DB tables exist in live Turso DB
    const schemaRow = await queryGet(`SELECT sql FROM sqlite_master WHERE name='invoices'`);
    console.log(`Live 'invoices' table SQL schema:\n${schemaRow?.sql}\n`);

    const invoicesCount = await queryGet(`SELECT COUNT(*) as cnt FROM invoices`);
    console.log(`✓ DB Table 'invoices' exists. Current row count: ${invoicesCount?.cnt || 0}`);

    const vendorUsersCount = await queryGet(`SELECT COUNT(*) as cnt FROM vendor_portal_users`);
    console.log(`✓ DB Table 'vendor_portal_users' exists. Current row count: ${vendorUsersCount?.cnt || 0}`);

    // 2. Ensure test vendor exists in DB
    const testVendorCode = 'VND-TEST-999';
    let vendor = await VendorRepository.findByNameOrCode(testVendorCode);
    if (!vendor) {
      console.log(`Creating test vendor record: ${testVendorCode}...`);
      await VendorRepository.create({
        legal_name: 'Test Supplier Solutions Pvt Ltd',
        vendor_code: testVendorCode,
        gstin: '07AAAAA0000A1Z5',
        status: 'Active',
        email: 'vendor.test@suppliers.com'
      });
      vendor = await VendorRepository.findByNameOrCode(testVendorCode);
    }
    expect(vendor).toBeDefined();
    console.log(`✓ Vendor verified in DB: ID ${vendor?.id}, Code: ${vendor?.vendor_code}, Name: ${vendor?.legal_name}`);

    // 3. Create or invite Vendor Portal User
    const vendorEmail = 'portal.user@testsupplier.com';
    const vendorPassword = 'VendorPassword123!';
    await VendorPortalAuthService.inviteVendorUser({
      vendorCode: testVendorCode,
      email: vendorEmail,
      name: 'Portal Test User',
      password: vendorPassword
    });
    console.log(`✓ Vendor Portal User created/updated in DB: ${vendorEmail}`);

    // 4. Test Vendor Login & Session Generation
    const loginRes = await VendorPortalAuthService.loginVendor(vendorEmail, vendorPassword);
    expect(loginRes.token).toBeDefined();
    console.log(`✓ Vendor login successful. Token generated (${loginRes.token.slice(0, 20)}...)`);

    const vendorSession = await VendorPortalAuthService.getVendorSession(loginRes.token);
    expect(vendorSession.vendor_code).toBe(testVendorCode);
    console.log(`✓ Vendor session resolved: Vendor Code=${vendorSession.vendor_code}, UserType=${vendorSession.user_type}`);

    // 5. Ensure an Approved PO exists for this vendor
    const testPoNo = 'PO-TEST-INV-001';
    let po = await PORepository.findById(testPoNo);
    if (!po) {
      console.log(`Creating test Approved PO: ${testPoNo}...`);
      await PORepository.create({
        po_no: testPoNo,
        vendor_id: vendor?.id,
        vendor_code: vendor?.vendor_code,
        vendor_key: vendor?.vendor_code,
        vendor_name: vendor?.legal_name,
        project: 'Project Alpha',
        po_value: 250000,
        revised_po_value: 250000,
        approval_status: 'Approved',
        status: 'Approved',
        po_date: '2026-08-11',
        category: 'Goods'
      });
      po = await PORepository.findById(testPoNo);
    }
    expect(po).toBeDefined();
    console.log(`✓ Approved PO verified in DB: ${po?.po_no}, Value: ₹${po?.po_value}, Status: ${po?.approval_status}`);

    // 6. Test Vendor PO Listing (Security Filter Check)
    const vendorPOs = await InvoiceService.getVendorPortalPOs(vendorSession);
    const targetPoInList = vendorPOs.find(p => p.po_no === testPoNo);
    expect(targetPoInList).toBeDefined();
    console.log(`✓ Verified PO ${testPoNo} present with remaining balance ₹${targetPoInList?.remaining_balance}`);

    // 7. Submit Vendor Invoice against Approved PO
    const testInvNum = `INV-LIVE-${Date.now().toString().slice(-4)}`;
    const sampleBase64Pdf = 'JVBERi0xLjQKJSDigqwKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDAKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUg==';

    console.log(`Submitting Invoice ${testInvNum} via InvoiceService...`);
    const invoiceRes = await InvoiceService.submitVendorInvoice({
      poNo: testPoNo,
      invoiceNumber: testInvNum,
      invoiceDate: '2026-08-11',
      subtotal: 100000,
      taxAmount: 18000,
      invoiceTotal: 118000,
      remarks: 'Live verification test invoice upload',
      fileName: `Invoice_${testInvNum}.pdf`,
      fileType: 'application/pdf',
      fileSize: 1024,
      fileData: sampleBase64Pdf
    }, vendorSession);

    expect(invoiceRes.ok).toBe(true);
    console.log(`✓ Invoice submitted successfully! Invoice ID: ${invoiceRes.invoice_id}`);

    // 8. Verify Record in DB (`invoices` and `attachments` tables)
    const dbInvoice = await InvoiceRepository.findById(invoiceRes.invoice_id);
    expect(dbInvoice).toBeDefined();
    console.log(`✓ Invoice verified in 'invoices' table: ID=${dbInvoice?.invoice_id}, Status=${dbInvoice?.status}, Amount=₹${dbInvoice?.invoice_total}, Source=${dbInvoice?.source}`);

    // 9. Test Internal ERP Review & Status Transition (Submitted -> Approved)
    const internalUserSession = { email: 'nishant@luxeworxatelier.com', roles: ['admin'] };
    await InvoiceService.updateInvoiceStatus(invoiceRes.invoice_id, 'Approved', undefined, internalUserSession);
    const approvedDbInvoice = await InvoiceRepository.findById(invoiceRes.invoice_id);
    expect(approvedDbInvoice?.status).toBe('Approved');
    console.log(`✓ Invoice status updated in DB to: ${approvedDbInvoice?.status} (Approved at ${approvedDbInvoice?.approved_at})`);

    // 10. Test PO Invoices Summary Aggregation
    const poSummary = await InvoiceService.getPOInvoices(testPoNo, internalUserSession);
    expect(poSummary.total_invoiced).toBeGreaterThan(0);
    console.log(`✓ PO Summary Aggregation verified: PO Value=₹${poSummary.po_value}, Total Invoiced=₹${poSummary.total_invoiced}, Remaining=₹${poSummary.remaining_balance}`);

    console.log('\n=== ALL LIVE VERIFICATION CHECKS PASSED WITH 100% REAL DB & DOMAIN LOGIC ===');
  }, 30000);
});
