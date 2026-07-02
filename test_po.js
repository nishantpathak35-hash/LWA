import { getNextPONumber } from './app/lib/api/purchase-orders/read.js';
import { getSetting } from './app/lib/api/settings.js';
import { queryAll } from './app/lib/db.js';

async function test() {
  const prefix = await getSetting('po_prefix', '');
  console.log('PREFIX:', prefix);
  
  const rows = await queryAll(`SELECT po_no FROM purchase_orders ORDER BY po_no DESC`);
  console.log('ALL POs:', rows.map(r => r.po_no).slice(0, 10));

  const session = { email: 'test@example.com', role: 'admin' };
  const next = await getNextPONumber(session);
  console.log('NEXT PO:', next);
}

test().catch(console.error);
