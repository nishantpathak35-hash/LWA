import 'dotenv/config';
import { queryAll } from './app/lib/db.js';

async function check() {
  const poNo = 'LAIPL/PO/25-26/010';
  const sysSumRow = await queryAll(`SELECT * FROM system_payments WHERE po_no = ?`, [poNo]);
  console.log("system_payments:", sysSumRow);
  
  const poRow = await queryAll(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  console.log("purchase_orders:", poRow);
  
  const prRow = await queryAll(`SELECT * FROM payment_requests WHERE po_id = ?`, [poNo]);
  console.log("payment_requests:", prRow);
}

check().catch(console.error);
