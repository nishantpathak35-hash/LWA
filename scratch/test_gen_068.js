import 'dotenv/config';
import { queryGet, queryAll } from '../app/lib/db.js';
import { generatePOPdf } from '../app/lib/poPdfGenerator.js';
import fs from 'fs';

async function main() {
  const poNo = 'LAIPL/PO/26-27/068';
  console.log('Fetching PO details for:', poNo);
  
  const po = await queryGet('SELECT * FROM purchase_orders WHERE po_no = ?', [poNo]);
  if (!po) {
    console.error('PO not found in DB:', poNo);
    process.exit(1);
  }

  const vendor = await queryGet('SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?', [po.vendor_name, po.vendor_key]);
  let projectMaster = null;
  if (po.project) {
    try {
      projectMaster = await queryGet('SELECT * FROM project_financials WHERE project = ?', [po.project]);
    } catch (e) {}
  }
  const items = await queryAll('SELECT * FROM po_items WHERE po_no = ?', [poNo]);

  console.log('PO:', po.po_no, 'Vendor:', po.vendor_name, 'Items count:', items.length);

  const result = generatePOPdf(po, items, vendor, projectMaster);
  console.log('Generated PDF filename:', result.filename);
  console.log('Base64 length:', result.content.length);

  const buffer = Buffer.from(result.content, 'base64');
  fs.writeFileSync('scratch/test_gen_068.pdf', buffer);
  console.log('Saved generated PDF to scratch/test_gen_068.pdf (Size:', buffer.length, 'bytes)');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
