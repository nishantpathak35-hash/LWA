import { queryAll } from '../app/lib/db.js';

async function checkDb() {
  try {
    const pos = await queryAll('SELECT po_no, vendor_name, vendor_email FROM purchase_orders LIMIT 5');
    console.log('POs in DB:', pos);
    
    const atts = await queryAll("SELECT id, entity_type, entity_id, file_name, length(file_data) as len, substr(file_data, 1, 40) as prefix FROM attachments LIMIT 5");
    console.log('Attachments in DB:', atts);
  } catch (e) {
    console.error('DB query error:', e);
  }
}

checkDb();
