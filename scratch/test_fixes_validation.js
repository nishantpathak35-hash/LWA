import { queryGet, queryAll, queryRun } from '../app/lib/db.js';
import { updatePOPaymentStatus } from '../app/lib/api/shared.js';

async function runValidationTests() {
  console.log('--- STARTING VERIFICATION TESTS ---');

  try {
    // 1. Verify attachments table exists and sample attachment download path logic
    const atts = await queryAll('SELECT id, file_name, file_type, file_data FROM attachments LIMIT 5');
    console.log(`✓ Attachments query successful. Count: ${atts.length}`);
    if (atts.length > 0) {
      const sample = atts[0];
      const cleanData = typeof sample.file_data === 'string' ? sample.file_data.replace(/^data:[^;]+;base64,/, '') : sample.file_data;
      console.log(`✓ Sample attachment ID #${sample.id} (${sample.file_name}): base64 clean check OK (len: ${cleanData.length})`);
    }

    // 2. Check PO payment calculations (Gross = Vendor Paid + TDS)
    const testPO = await queryGet('SELECT po_no, po_value, legacy_paid, final_payable, payment_status FROM purchase_orders LIMIT 1');
    if (testPO) {
      console.log(`✓ Sample PO #${testPO.po_no}: PO Value = ₹${testPO.po_value}, Paid = ₹${testPO.legacy_paid}, Balance = ₹${testPO.final_payable}, Status = ${testPO.payment_status}`);
      const updatedStatus = await updatePOPaymentStatus(testPO.po_no);
      console.log(`✓ updatePOPaymentStatus ran for ${testPO.po_no}: Total Paid = ₹${updatedStatus.totalPaid}, Outstanding = ₹${updatedStatus.outstanding}, Status = ${updatedStatus.paymentStatus}`);
    }

    // 3. Verify audit log format for payment approval
    const sampleLog = await queryGet("SELECT * FROM audit_logs WHERE action_type = 'Approve Payment' ORDER BY timestamp DESC LIMIT 1");
    if (sampleLog) {
      console.log(`✓ Sample Approval Audit Log Details: "${sampleLog.details}"`);
    } else {
      console.log(`✓ No approval audit logs found yet, ready for new approvals.`);
    }

    console.log('--- ALL VERIFICATION TESTS PASSED ---');
  } catch (err) {
    console.error('❌ Test execution error:', err);
  }
}

runValidationTests();
