import 'dotenv/config';
import { queryAll } from '../app/lib/db.js';

async function checkAtts() {
  const poNo = 'LAIPL/PO/26-27/068';
  const atts = await queryAll("SELECT id, entity_type, entity_id, file_name, file_type, length(file_data) as len FROM attachments WHERE entity_type = 'po' AND entity_id = ?", [poNo]);
  console.log('DB Attachments for PO 068:', atts);
}

checkAtts();
