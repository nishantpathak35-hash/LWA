import 'dotenv/config';
import * as api from '../app/lib/api.js';
import { queryAll, queryGet } from '../app/lib/db.js';

async function runTest() {
  console.log('--- STARTING VERIFICATION TEST ---');
  const session = { email: 'admin@luxeworx.com', roles: ['director', 'admin', 'finance', 'procurement'] };
  try {
    // 1. Create a dummy vendor to work with
    console.log('Ensuring dummy vendor exists...');
    const dummyVendorName = 'Test Verification Vendor Inc';
    let vendor = await api.getVendorByName(dummyVendorName, session);
    if (!vendor) {
      const added = await api.addVendor({
        legalName: dummyVendorName,
        status: 'Active',
        email: 'test@vendor.com'
      }, session);
      console.log('Created vendor:', added.code);
    }
    
    // 2. Create a dummy PO
    const poNo = `PO-TEST-${Date.now()}`;
    console.log(`Creating test PO: ${poNo}...`);
    await api.createPOFull({
      poNo,
      vendorName: dummyVendorName,
      vendorCode: 'TEST-VEN-CODE',
      project: 'Verification Project',
      grandTotal: 100000,
      items: [{ description: 'Test Item', qty: 1, rate: 100000, amount: 100000 }]
    }, session);

    console.log('Submitting PO for approval...');
    await api.submitPOForApproval(poNo, session);

    console.log('Approving PO...');
    await api.approvePO(poNo, 'approve', 'Approved for verification test', session);

    // 3. Initiate payment request
    console.log('Creating payment request...');
    const prResult = await api.createPaymentRequest({
      poNo,
      vendor: dummyVendorName,
      project: 'Verification Project',
      amountRequested: 25000,
      remarks: 'Milestone 1 Payment'
    }, session);
    const prId = prResult.id;
    console.log(`Payment Request created with ID: ${prId}`);

    // 4. Move through approval queue
    console.log('Approving through Procurement...');
    await api.transitionPaymentWorkflow({ paymentId: prId, action: 'approve' }, session);

    console.log('Approving through Finance...');
    await api.transitionPaymentWorkflow({ paymentId: prId, action: 'approve' }, session);

    console.log('Approving through Director...');
    await api.transitionPaymentWorkflow({ paymentId: prId, action: 'approve' }, session);

    // Verify stage is 'Ready to Remit'
    let pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [prId]);
    console.log(`Current payment request stage: ${pr.stage}`);
    if (pr.stage !== 'Ready to Remit') {
      throw new Error(`Expected stage to be 'Ready to Remit' but got '${pr.stage}'`);
    }

    // 5. Bulk Remit Payment
    console.log('Remitting payment...');
    await api.bulkRemitPayments([prId], {}, session);

    // Verify stage is 'Remitted'
    pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [prId]);
    console.log(`Current payment request stage: ${pr.stage}, remittance: ${pr.remittance}`);
    if (pr.stage !== 'Remitted') {
      throw new Error(`Expected stage to be 'Remitted' but got '${pr.stage}'`);
    }

    // 6. Verify PO Paid sync
    const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
    console.log(`PO legacy_paid: ${po.legacy_paid}, final_payable: ${po.final_payable}`);
    if (Number(po.legacy_paid) !== 25000) {
      throw new Error(`Expected PO legacy_paid to be 25000 but got ${po.legacy_paid}`);
    }
    if (Number(po.final_payable) !== 75000) {
      throw new Error(`Expected PO final_payable to be 75000 but got ${po.final_payable}`);
    }

    // 7. Verify system_payments record
    const sysPayments = await queryAll(`SELECT * FROM system_payments WHERE pr_key = ?`, [String(prId)]);
    console.log('System payments matches:', sysPayments.length);
    if (sysPayments.length !== 1) {
      throw new Error(`Expected exactly 1 system payment entry for pr_key ${prId} but found ${sysPayments.length}`);
    }

    // 8. Verify audit logs
    const auditLogs = await api.listAuditLog({ limit: 10 }, session);
    console.log('Recent audit logs count:', auditLogs.length);
    const remittanceLog = auditLogs.find(log => log.actionType === 'Payment Remitted' && log.details.includes(String(prId)));
    if (!remittanceLog) {
      throw new Error('Audit log for Payment Remitted not found');
    }
    console.log('Found audit log:', remittanceLog);

    // 9. Verify Reports
    console.log('Testing reports fetch...');
    const reportRows = await api.getPaymentReportRows({ type: 'Remitted' }, session);
    console.log(`Payment Report Rows (Remitted): ${reportRows.length}`);
    const foundReportRow = reportRows.find(row => row.pr_id === prId);
    if (!foundReportRow) {
      throw new Error('Our remitted payment request was not found in the Remitted reports');
    }
    console.log('Report row matches successfully!');

    console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('VERIFICATION FAILURE:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

runTest();
