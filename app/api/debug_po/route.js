import { queryGet } from '../../lib/db.js';
import { queryAll } from '../../lib/db.js';
import { getNextPONumber } from '../../lib/api/purchase-orders/read.js';

export async function GET(request) {
  const row = await queryGet(`SELECT value FROM app_settings WHERE key = 'po_prefix'`);
  const prefix = row ? row.value : '';
  const rows = await queryAll(`SELECT po_no FROM purchase_orders ORDER BY po_no DESC`);
  const session = { email: 'test@example.com', role: 'admin' };
  
  let next = '';
  try {
    next = await getNextPONumber(session);
  } catch (e) {
    next = e.message;
  }
  
  return Response.json({
    prefix,
    existing: rows.map(r => r.po_no).slice(0, 10),
    next
  });
}
