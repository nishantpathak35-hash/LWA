import { queryAll, queryGet, queryRun, queryBatch } from '../db.js';
import { initEnterpriseUpgradeSchemas } from './schema-upgrade.js';
import { initBoqTables } from './boq.js';
import * as XLSX from 'xlsx';
import crypto from 'node:crypto';

function requireAuth(session) {
  if (!session || !session.email) {
    throw new Error('AUTH: Not signed in');
  }
}

function unwrap(val) {
  if (val && typeof val === 'object' && val.arg !== undefined) return val.arg;
  return val;
}

// Clean and standardize item names from raw PO descriptions
function cleanItemName(rawDesc = '') {
  const firstLine = String(rawDesc || '').split(/[\r\n]+/)[0].trim();
  // Strip leading tabs, numbers, bullets
  const stripped = firstLine.replace(/^[\t\s\d.-]+/, '').trim();
  return (stripped.length > 3 ? stripped.slice(0, 120) : rawDesc.slice(0, 120)).trim();
}

/**
 * Generate Master Excel workbook containing:
 * Sheet 1: MASTER ITEM RATE UPLOAD
 * Sheet 2: PO RATE HISTORY
 * Sheet 3: RATE CONFLICT REVIEW
 * Sheet 4: MANUAL ITEM ENTRY
 * Sheet 5: IMPORT INSTRUCTIONS
 */
export async function generateMasterRateExcel(session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();
  await initBoqTables();

  // 1. Query all eligible issued / approved POs (excluding Draft, Cancelled, Rejected)
  const eligibleSql = `
    SELECT pi.id, pi.po_no, pi.description, pi.hsn_sac, pi.qty, pi.unit, pi.rate, pi.disc_pct, pi.tax_pct, pi.amount,
           p.vendor_name, p.project, p.po_date, p.status as po_status
    FROM po_items pi
    JOIN purchase_orders p ON pi.po_no = p.po_no
    WHERE p.status IN ('Approved', 'Open', 'Billed', 'Partially Billed', 'Short Closed')
      AND pi.description IS NOT NULL AND TRIM(pi.description) != ''
      AND pi.rate > 0
    ORDER BY p.po_date DESC, pi.po_no DESC
  `;
  const poLines = (await queryAll(eligibleSql)) || [];

  // Group by standardized description and unit to identify unique items and rate variations
  const itemMap = new Map();
  const conflictMap = new Map();

  poLines.forEach(line => {
    const rawDesc = line.description.trim();
    const cleanName = cleanItemName(rawDesc);
    const unit = (line.unit || 'Nos').trim();
    const rate = Number(line.rate) || 0;
    const key = `${cleanName.toLowerCase()}|${unit.toLowerCase()}`;

    if (!itemMap.has(key)) {
      itemMap.set(key, {
        itemName: cleanName,
        rawDesc: rawDesc,
        unit: unit,
        latestRate: rate,
        latestDate: line.po_date || '',
        latestVendor: line.vendor_name || '',
        latestPoNo: line.po_no,
        taxPct: Number(line.tax_pct) || 18,
        hsnSac: line.hsn_sac || '',
        allRates: [rate],
        poOccurrences: [line]
      });
    } else {
      const existing = itemMap.get(key);
      existing.allRates.push(rate);
      existing.poOccurrences.push(line);
      // Track rate difference / conflict if rates differ by more than 2%
      const minRate = Math.min(...existing.allRates);
      const maxRate = Math.max(...existing.allRates);
      if (maxRate - minRate > (minRate * 0.02)) {
        conflictMap.set(key, existing);
      }
    }
  });

  // Sheet 1: MASTER ITEM RATE UPLOAD
  let itemCounter = 1001;
  const sheet1Data = [];
  itemMap.forEach(item => {
    sheet1Data.push({
      'Item Code': `ITM-${itemCounter++}`,
      'Item Type': 'Material',
      'Category': 'Commercial Fit-out',
      'Subcategory': 'General',
      'Item Name': item.itemName,
      'Detailed Description': item.rawDesc,
      'Brand / Make': 'Standard / Equivalent',
      'UOM': item.unit,
      'Basic Rate': item.latestRate,
      'Labour / Installation Rate': 0,
      'Tax Rate %': item.taxPct,
      'Vendor': item.latestVendor,
      'Rate Source': 'PO',
      'Reference Number': item.latestPoNo,
      'Source Date': item.latestDate,
      'Effective From': item.latestDate || new Date().toISOString().split('T')[0],
      'Effective To': '',
      'Status': 'Active',
      'Remarks': `Extracted from PTS Purchase Order ${item.latestPoNo}`
    });
  });

  // Add 10 clean blank template rows for manual additions
  for (let b = 1; b <= 10; b++) {
    sheet1Data.push({
      'Item Code': `ITM-NEW-${b}`,
      'Item Type': 'Material',
      'Category': '',
      'Subcategory': '',
      'Item Name': '',
      'Detailed Description': '',
      'Brand / Make': '',
      'UOM': 'Nos',
      'Basic Rate': '',
      'Labour / Installation Rate': '',
      'Tax Rate %': 18,
      'Vendor': '',
      'Rate Source': 'Manual',
      'Reference Number': '',
      'Source Date': '',
      'Effective From': new Date().toISOString().split('T')[0],
      'Effective To': '',
      'Status': 'Active',
      'Remarks': 'Manual item entry'
    });
  }

  // Sheet 2: PO RATE HISTORY (all eligible raw lines)
  const sheet2Data = poLines.map((line, idx) => ({
    'S. No.': idx + 1,
    'PO Number': line.po_no,
    'PO Date': line.po_date,
    'Project': line.project,
    'Vendor': line.vendor_name,
    'Item Description': line.description,
    'Unit': line.unit,
    'Ordered Qty': line.qty,
    'Unit Rate': line.rate,
    'Tax %': line.tax_pct,
    'Total Amount': line.amount,
    'PO Status': line.po_status
  }));

  // Sheet 3: RATE CONFLICT REVIEW
  const sheet3Data = [];
  conflictMap.forEach(item => {
    const minRate = Math.min(...item.allRates);
    const maxRate = Math.max(...item.allRates);
    const diff = maxRate - minRate;
    const diffPct = minRate > 0 ? ((diff / minRate) * 100).toFixed(1) : '0';
    const vendors = Array.from(new Set(item.poOccurrences.map(x => x.vendor_name))).join('; ');
    const pos = Array.from(new Set(item.poOccurrences.map(x => x.po_no))).join(', ');

    sheet3Data.push({
      'Item Name': item.itemName,
      'Unit': item.unit,
      'Vendors': vendors,
      'Historical POs': pos,
      'Lowest Rate': minRate,
      'Highest Rate': maxRate,
      'Rate Difference': diff,
      'Variance %': `${diffPct}%`,
      'Latest Rate (Proposed)': item.latestRate,
      'Latest PO Date': item.latestDate,
      'Review Status': 'Review Needed'
    });
  });

  // Sheet 4: MANUAL ITEM ENTRY TEMPLATE
  const sheet4Data = [
    {
      'Item Code': 'SVC-001',
      'Item Type': 'Service',
      'Category': 'Electrical',
      'Subcategory': 'Wiring & Installation',
      'Item Name': 'Point Wiring for Light / Fan Points',
      'Detailed Description': 'Point wiring with 1.5 sq mm FRLS copper wire in concealed PVC conduit including modular switch, plate and accessories',
      'Brand / Make': 'Schneider / Legrand',
      'UOM': 'Point',
      'Basic Rate': 650,
      'Labour / Installation Rate': 250,
      'Tax Rate %': 18,
      'Vendor': '',
      'Rate Source': 'Manual',
      'Effective From': new Date().toISOString().split('T')[0],
      'Status': 'Active',
      'Remarks': 'Standard electrical service rate'
    },
    {
      'Item Code': 'LBR-001',
      'Item Type': 'Labour',
      'Category': 'Civil & Finishing',
      'Subcategory': 'Carpentry',
      'Item Name': 'Skilled Carpenter Daily Manday',
      'Detailed Description': 'Skilled Carpenter for interior fit-out panelling, door fixing and joinery works (8-hour standard shift)',
      'Brand / Make': 'Direct Labour',
      'UOM': 'Manday',
      'Basic Rate': 1100,
      'Labour / Installation Rate': 0,
      'Tax Rate %': 0,
      'Vendor': '',
      'Rate Source': 'Manual',
      'Effective From': new Date().toISOString().split('T')[0],
      'Status': 'Active',
      'Remarks': 'Standard commercial fit-out carpenter rate'
    }
  ];

  // Sheet 5: INSTRUCTIONS
  const sheet5Data = [
    { 'Section': 'PTS ENTERPRISE RATE ENGINE', 'Instructions': 'Official Master Item & Rate Library Template' },
    { 'Section': 'Overview', 'Instructions': 'This workbook contains pre-extracted historical purchasing rates from eligible approved PTS Purchase Orders, plus manual entry templates.' },
    { 'Section': 'Sheet 1 (Master Upload)', 'Instructions': 'The main importable sheet. You can edit rates, update descriptions, add categories, and upload via Settings → Item Master.' },
    { 'Section': 'Sheet 2 (PO History)', 'Instructions': 'Read-only traceability log of eligible issued Purchase Orders used to extract the rates.' },
    { 'Section': 'Sheet 3 (Rate Conflicts)', 'Instructions': 'Items that had varying prices across different POs. The latest purchase rate has been proposed.' },
    { 'Section': 'Sheet 4 (Manual Entry)', 'Instructions': 'Example entries for items never ordered before (Labour, Services, Turnkey assemblies).' },
    { 'Section': 'Valid Units (UOM)', 'Instructions': 'Nos, Sqft, Sqm, Rft, Rmt, Set, Kg, Ton, Ltr, Box, Roll, Packet, Point, Manday, LumpSum' },
    { 'Section': 'Valid Item Types', 'Instructions': 'Material, Service, Labour, Assembly' },
    { 'Section': 'Rules', 'Instructions': '1. Do not remove the header row. 2. Item Code must be unique. 3. Basic Rate must be numeric and non-negative.' }
  ];

  // Build Workbook using xlsx
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
  const ws4 = XLSX.utils.json_to_sheet(sheet4Data);
  const ws5 = XLSX.utils.json_to_sheet(sheet5Data);

  // Column widths
  ws1['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 35 },
    { wch: 50 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
    { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'MASTER ITEM RATE UPLOAD');
  XLSX.utils.book_append_sheet(wb, ws2, 'PO RATE HISTORY');
  XLSX.utils.book_append_sheet(wb, ws3, 'RATE CONFLICT REVIEW');
  XLSX.utils.book_append_sheet(wb, ws4, 'MANUAL ITEM ENTRY');
  XLSX.utils.book_append_sheet(wb, ws5, 'IMPORT INSTRUCTIONS');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  return {
    success: true,
    fileName: `PTS_Master_Rate_Library_${new Date().toISOString().split('T')[0]}.xlsx`,
    poLinesAnalyzed: poLines.length,
    uniqueItemsExtracted: itemMap.size,
    rateConflictsCount: conflictMap.size,
    base64: excelBuffer
  };
}

/**
 * Parse and validate uploaded Master Rate Excel workbook.
 * Returns parsed rows, validated count, errors, and conflict detection.
 */
export async function parseAndValidateMasterRateExcel(payload, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();
  await initBoqTables();

  const data = unwrap(payload);
  const base64Data = data?.fileBase64 || data?.base64;
  if (!base64Data) {
    throw new Error('No Excel file data received.');
  }

  // Parse workbook
  const buffer = Buffer.from(base64Data, 'base64');
  const wb = XLSX.read(buffer, { type: 'buffer' });

  // Look for target sheet
  let targetSheetName = wb.SheetNames.find(n => n.toUpperCase().includes('MASTER') || n.toUpperCase().includes('UPLOAD')) || wb.SheetNames[0];
  const ws = wb.Sheets[targetSheetName];
  if (!ws) throw new Error('Could not find a valid master rate worksheet in the workbook.');

  const rawRows = XLSX.utils.sheet_to_json(ws);
  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded worksheet is empty.');
  }

  const existingItems = await queryAll(`SELECT item_code, name FROM boq_item_master`);
  const existingCodeMap = new Set(existingItems.map(x => String(x.item_code).trim().toLowerCase()));

  const validItems = [];
  const errors = [];
  const duplicateCodesInSheet = new Set();
  const seenCodes = new Set();

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // Header is row 1
    const itemCode = String(row['Item Code'] || row['item_code'] || '').trim();
    const itemName = String(row['Item Name'] || row['item_name'] || row['Description'] || row['description'] || '').trim();
    const unit = String(row['UOM'] || row['unit'] || 'Nos').trim();
    const rawRate = row['Basic Rate'] ?? row['basic_rate'] ?? row['rate'] ?? row['Cost Rate'];
    const basicRate = Number(rawRate);

    // Skip completely blank rows
    if (!itemCode && !itemName && isNaN(basicRate)) return;

    if (!itemName) {
      errors.push({ row: rowNum, error: 'Item Name is missing' });
      return;
    }
    if (isNaN(basicRate) || basicRate < 0) {
      errors.push({ row: rowNum, item: itemName, error: `Invalid rate: "${rawRate}". Must be a non-negative number.` });
      return;
    }

    if (itemCode) {
      const lowerCode = itemCode.toLowerCase();
      if (seenCodes.has(lowerCode)) {
        duplicateCodesInSheet.add(itemCode);
        errors.push({ row: rowNum, item: itemName, error: `Duplicate Item Code "${itemCode}" found in uploaded sheet.` });
        return;
      }
      seenCodes.add(lowerCode);
    }

    const isExisting = itemCode ? existingCodeMap.has(itemCode.toLowerCase()) : false;

    validItems.push({
      item_code: itemCode || `ITM-${Date.now().toString().slice(-4)}-${idx + 1}`,
      name: itemName,
      category: row['Category'] || row['category'] || 'Commercial Fit-out',
      subcategory: row['Subcategory'] || row['subcategory'] || '',
      item_type: (row['Item Type'] || row['item_type'] || 'material').toLowerCase(),
      description: row['Detailed Description'] || row['detailed_description'] || itemName,
      unit: unit || 'Nos',
      preferred_make: row['Brand / Make'] || row['brand_make'] || '',
      std_purchase_rate: basicRate,
      std_labour_rate: Number(row['Labour / Installation Rate'] || 0) || 0,
      std_cost: basicRate,
      std_selling_rate: Number(row['Selling Rate'] || (basicRate * 1.25)), // 25% default margin
      target_margin_pct: 20,
      hsn_sac: String(row['Tax Rate %'] || row['hsn_sac'] || '').trim(),
      preferred_vendors: row['Vendor'] || row['vendor'] || '',
      is_existing: isExisting
    });
  });

  return {
    validCount: validItems.length,
    errorCount: errors.length,
    errors,
    previewItems: validItems.slice(0, 50),
    allValidItems: validItems
  };
}

/**
 * Confirm and commit validated master rate items into boq_item_master and item_master.
 */
export async function confirmMasterRateImport(payload, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();
  await initBoqTables();

  const data = unwrap(payload);
  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) {
    throw new Error('No validated items to import.');
  }

  const now = new Date().toISOString();
  let createdCount = 0;
  let updatedCount = 0;

  for (const it of items) {
    const existing = await queryGet(
      `SELECT id FROM boq_item_master WHERE item_code = ?`,
      [it.item_code]
    );

    if (existing) {
      // Update permitted fields only (preserves historical approved BOQs)
      await queryRun(
        `UPDATE boq_item_master 
         SET name = ?, description = ?, category = ?, subcategory = ?, item_type = ?,
             unit = ?, preferred_make = ?, std_purchase_rate = ?, std_labour_rate = ?,
             std_cost = ?, std_selling_rate = ?, preferred_vendors = ?, updated_at = ?
         WHERE id = ?`,
        [
          it.name, it.description, it.category, it.subcategory, it.item_type,
          it.unit, it.preferred_make, it.std_purchase_rate, it.std_labour_rate,
          it.std_cost, it.std_selling_rate, it.preferred_vendors, now, existing.id
        ]
      );
      updatedCount++;
    } else {
      // Insert new item
      const newId = crypto.randomUUID();
      await queryRun(
        `INSERT INTO boq_item_master 
         (id, item_code, name, description, category, subcategory, item_type, unit, preferred_make, std_purchase_rate, std_labour_rate, std_cost, std_selling_rate, target_margin_pct, preferred_vendors, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          newId, it.item_code, it.name, it.description, it.category, it.subcategory,
          it.item_type, it.unit, it.preferred_make, it.std_purchase_rate, it.std_labour_rate,
          it.std_cost, it.std_selling_rate, it.target_margin_pct || 20, it.preferred_vendors, now, now
        ]
      );
      createdCount++;
    }
  }

  return {
    success: true,
    totalImported: items.length,
    createdCount,
    updatedCount
  };
}
