import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { importBoqFromExcel, getBoqList, getBoqVersion } from '../app/lib/api/boq.js';
import { queryAll, queryGet } from '../app/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('--- Starting VMAN-206 BOQ Import ---');

  const filePath = path.resolve(__dirname, '../Cx_Vman-206 Office BOQ.xlsx');
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found at ' + filePath);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');

  const session = {
    user: {
      email: 'nishant@luxeworxatelier.com',
      roles: ['admin', 'director']
    }
  };

  const project = 'VMAN-Unit 206';
  const title = 'VMAN-206 Office Commercial BOQ (Rev R2)';

  console.log('Importing BOQ for project:', project);
  const result = await importBoqFromExcel({
    project,
    title,
    fileBase64: base64Data,
    sheetName: 'DETAILED BOQ-R2',
    clearExisting: true
  }, session);

  console.log('Import Result:', result);

  // Verify the imported data
  const boqList = await getBoqList(project);
  console.log('BOQ List for project:', boqList);

  const versionDetails = await getBoqVersion(result.boq_version_id);
  console.log('Version Details:');
  console.log('- Total Selling Value: ₹', versionDetails.total_selling_value);
  console.log('- Total Cost Value (BCS): ₹', versionDetails.total_cost_value);
  console.log('- Gross Margin: ₹', versionDetails.gross_margin, `(${versionDetails.margin_pct}%)`);
  console.log('- Total Sections:', versionDetails.sections?.length);

  let totalItemsCount = 0;
  for (const s of versionDetails.sections || []) {
    totalItemsCount += s.items?.length || 0;
    console.log(`  * [${s.name}] has ${s.items?.length} items`);
  }
  console.log('- Total Line Items across sections:', totalItemsCount);

  // Check project_financials
  const projFin = await queryGet('SELECT * FROM project_financials WHERE project = ?', [project]);
  console.log('- Synchronized project_financials:', projFin);

  // Check boq_headers client link
  const boqHeader = await queryGet('SELECT id, boq_no, client_id, client_name, project FROM boq_headers WHERE id = ?', [result.boq_id]);
  console.log('- Linked Client in boq_header:', boqHeader);

  console.log('--- VMAN-206 BOQ Import Successfully Completed ---');
}

main().catch(err => {
  console.error('Import failed with error:', err);
  process.exit(1);
});
