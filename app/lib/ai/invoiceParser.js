import Tesseract from 'tesseract.js';

/**
 * Scans an invoice image using local OCR and extracts text.
 * @param {File|string} imageFile - The image to scan
 * @param {Function} onProgress - Callback for OCR progress (0 to 1)
 */
export async function extractInvoiceData(imageFile, onProgress) {
  try {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(m.progress);
        }
      }
    });

    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();

    return parseText(text);
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
}

/**
 * AI Heuristic Parser: Extracts structured data from raw OCR text.
 */
function parseText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Naive vendor name assumes the largest text at the top, or just the first line.
  let vendorName = lines.length > 0 ? lines[0] : 'Unknown Vendor'; 
  // Strip common header words that Tesseract merges into the first line
  vendorName = vendorName.replace(/(?:Tax Invoice|Invoice|ORIGINAL FOR RECIPIENT|Duplicate).*$/i, '').trim();
  vendorName = vendorName.replace(/[-|:]\s*$/, '').trim();
  
  let invoiceNo = '';
  let date = '';
  let totalAmount = 0;

  // Invoice Number Regex (allows slashes and hyphens e.g., LB/2026-27/174)
  let invMatch = text.match(/(?:inv(?:oice)?|bill)[\s]*(?:no|num(?:ber)?)\.?\s*[:#-]?\s*([A-Za-z0-9\/-]+)/i);
  if (invMatch) {
    invoiceNo = invMatch[1].trim();
  }
  // Fallback: look for standard formatted invoice number: XXX/YYYY-YY/ZZZ (handles spaces and 'I' instead of '/')
  if (!invoiceNo || invoiceNo.length < 4 || invoiceNo.toLowerCase().includes('way')) {
    const fallbackMatch = text.match(/([A-Z0-9]{2,5}(?:I|l|\/|-)?\s*\d{4}\s*-\s*\d{2,4}\s*[\/-]\s*[A-Z0-9]{2,6})/i);
    if (fallbackMatch) invoiceNo = fallbackMatch[1].replace(/[\sIl]/g, (m) => m.match(/\s/) ? '' : '/');
  }

  // Date Regex (allows 23-Jun-26, 23/06/2026)
  const dateMatch = text.match(/\b(\d{1,2}[\/\.-](?:\d{1,2}|[A-Za-z]{3,})[\/\.-]\d{2,4})\b/);
  if (dateMatch) date = dateMatch[1].trim();

  // Amount Heuristic: Find all standard decimal money formats (e.g., 1,15,841.00) in the whole document and pick the highest
  // Require exactly two decimal places and handle Tesseract adding spaces between numbers/commas
  const allAmounts = [];
  const anyMoneyRegex = /(?:^|\s|₹|Rs\.?|INR|Total|oll|\[)\s*(\d{1,3}(?:[,\s]+\d{2,3})*\s*\.\s*\d{2})(?=\s|$)/ig;
  let m;
  while ((m = anyMoneyRegex.exec(text)) !== null) {
    let cleanStr = m[1].replace(/[,\s]/g, '');
    
    // Fix Tesseract confusing ₹ as '12' in Indian amounts (e.g., '121,15,841.00')
    const rawMatch = m[1].replace(/\s/g, '');
    if (rawMatch.match(/^12\d{1,2}(?:,\d{2})*,\d{3}\.\d{2}$/)) {
      cleanStr = cleanStr.substring(2); // strip the phantom '12'
    }

    const val = parseFloat(cleanStr);
    if (!isNaN(val)) allAmounts.push(val);
  }

  if (allAmounts.length > 0) {
    // Filter out crazy outliers (like > 10 million) if there are smaller valid amounts
    const reasonableAmounts = allAmounts.filter(a => a > 0 && a < 10000000);
    if (reasonableAmounts.length > 0) {
      totalAmount = Math.max(...reasonableAmounts);
    } else {
      totalAmount = Math.max(...allAmounts);
    }
  }

  return {
    vendorName,
    invoiceNo,
    date,
    totalAmount,
    rawText: text
  };
}

/**
 * Generates Tally-compatible XML Voucher format from extracted data.
 */
export function generateTallyXML(extractedData) {
  const amount = Math.abs(extractedData.totalAmount || 0);
  
  // Format Date for Tally (YYYYMMDD)
  let formattedDate = "";
  if (extractedData.date) {
    const d = new Date(extractedData.date);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      formattedDate = `${yyyy}${mm}${dd}`;
    } else {
      formattedDate = extractedData.date.replace(/[^0-9a-zA-Z]/g, '');
    }
  }

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create">
            <DATE>${formattedDate}</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${extractedData.invoiceNo || "AUTO"}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${extractedData.vendorName || "Unknown Vendor"}</PARTYLEDGERNAME>
            <NARRATION>Auto-extracted by AI Invoice Engine (Inv: ${extractedData.invoiceNo || 'N/A'})</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${extractedData.vendorName || "Unknown Vendor"}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Purchases</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
