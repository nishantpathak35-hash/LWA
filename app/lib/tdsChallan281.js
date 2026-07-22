/**
 * Helper utilities for Income Tax Department Challan 281 & TRACES e-TDS Integration.
 */

// ITD Nature of Payment Codes for Challan 281
export const ITD_SECTION_MAP = {
  '194C': { code: '94C', name: 'Payments to Contractors', defaultRateCompany: 2, defaultRateInd: 1 },
  '194J': { code: '94J', name: 'Fees for Professional / Technical Services', defaultRateCompany: 10, defaultRateInd: 10 },
  '194H': { code: '94H', name: 'Commission or Brokerage', defaultRateCompany: 5, defaultRateInd: 5 },
  '194I': { code: '94I', name: 'Rent for Land / Building / Furniture', defaultRateCompany: 10, defaultRateInd: 10 },
  '194IA': { code: '94IA', name: 'Payment on Transfer of Immovable Property', defaultRateCompany: 1, defaultRateInd: 1 },
  '194IB': { code: '94IB', name: 'Payment of Rent by Individual/HUF', defaultRateCompany: 5, defaultRateInd: 5 }
};

export function getITDSectionCode(sectionName = '194C') {
  const cleanSec = String(sectionName || '').trim().toUpperCase();
  return ITD_SECTION_MAP[cleanSec]?.code || '94C';
}

export function validateBSRCode(bsr = '') {
  const clean = String(bsr || '').trim();
  return /^\d{7}$/.test(clean);
}

export function validateTAN(tan = '') {
  const clean = String(tan || '').trim().toUpperCase();
  return /^[A-Z]{4}\d{5}[A-Z]{1}$/.test(clean);
}

export function calculateChallanInterest(tdsAmount, dueDateStr, depositDateStr) {
  if (!dueDateStr || !depositDateStr) return 0;
  const due = new Date(dueDateStr);
  const dep = new Date(depositDateStr);
  if (dep <= due) return 0;

  // 1.5% per month or part of a month for late deposit u/s 201(1A)
  const diffMonths = (dep.getFullYear() - due.getFullYear()) * 12 + (dep.getMonth() - due.getMonth()) + 1;
  const interest = Math.round(tdsAmount * 0.015 * Math.max(1, diffMonths));
  return interest;
}

export function generate26QFileContent(challanRecords = []) {
  let fileContent = `FH^NSDL-TDS-26Q^${new Date().toISOString().substring(0,10).replace(/-/g,'')}^1^DELHI\n`;
  challanRecords.forEach((c, idx) => {
    fileContent += `BH^${idx + 1}^26Q^${c.quarter || 'Q1'}^${c.tan || 'DELM12345F'}^${c.vendor_name || ''}^${c.section_code || '94C'}^${c.bsr_code || ''}^${c.challan_date || ''}^${c.challan_no || ''}^${c.tds_amount || 0}^${c.cin || ''}\n`;
  });
  return fileContent;
}
