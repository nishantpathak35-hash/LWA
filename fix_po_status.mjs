import 'dotenv/config';
import { queryAll, queryRun, queryGet } from './app/lib/db.js';

async function fix() {
  console.log('Reconciling all POs to update payment status...');
  
  const pos = await queryAll(`SELECT po_no, revised_po_value, po_value FROM purchase_orders`);
  let updated = 0;
  for (const po of pos) {
    const poNo = po.po_no;
    const sysSumRow = await queryGet(
      `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total FROM system_payments WHERE po_no = ?`,
      [poNo]
    );
    const totalPaid = Number(sysSumRow?.total) || 0;
    const poVal = Number(po.revised_po_value || po.po_value || 0);
    const finalPayable = Math.max(0, poVal - totalPaid);

    let paymentStatus = 'Unpaid';
    if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
    else if (totalPaid > 0) paymentStatus = 'Partially Paid';

    await queryRun(
      `UPDATE purchase_orders SET legacy_paid = ?, final_payable = ?, payment_status = ? WHERE po_no = ?`,
      [totalPaid, finalPayable, paymentStatus, poNo]
    );
    updated++;
  }
  console.log(`Updated ${updated} POs.`);
}

fix().catch(console.error);
