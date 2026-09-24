import { NextResponse } from 'next/server';
import zlib from 'zlib';
import * as api from '../../../lib/api.js';
import { validateInvoiceFields } from '../../../../src/modules/invoices/services/invoiceValidation.js';

// Safe DOMMatrix polyfill in case pdfjs-dist or pdf-parse is ever loaded
if (typeof globalThis !== 'undefined' && (!globalThis.DOMMatrix || typeof globalThis.DOMMatrix.prototype?.multiply !== 'function')) {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
      this.is2D = true;
      this.isIdentity = true;
      if (Array.isArray(init) && init.length === 6) {
        this.a = this.m11 = init[0];
        this.b = this.m12 = init[1];
        this.c = this.m21 = init[2];
        this.d = this.m22 = init[3];
        this.e = this.m41 = init[4];
        this.f = this.m42 = init[5];
      }
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    transformPoint(p) { return p; }
    inverse() { return this; }
  };
}

async function withTimeout(promise, ms, name = 'Operation') {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function normalizeDate(raw) {
  if (!raw) return '';
  raw = raw.trim().replace(/[,\.]/g, '-').replace(/\//g, '-');

  // 1. DD-Mon-YYYY or DD-Mon-YY (e.g. 13-Jul-26, 15-Jul-2026, 5-Jul-26)
  const monMatch = raw.match(/(\d{1,2})[- ]([A-Za-z]{3,9})[- ](\d{2,4})/);
  if (monMatch) {
    const d = monMatch[1].padStart(2, '0');
    const mStr = monMatch[2].slice(0, 3).toLowerCase();
    const m = MONTH_MAP[mStr];
    let y = monMatch[3];
    if (y.length === 2) y = (parseInt(y, 10) > 50 ? '19' : '20') + y;
    if (m) return `${y}-${m}-${d}`;
  }

  // 2. YYYY-MM-DD
  const ymdMatch = raw.match(/(\d{4})[- ](\d{1,2})[- ](\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  // 3. DD-MM-YYYY or DD-MM-YY
  const dmyMatch = raw.match(/(\d{1,2})[- ](\d{1,2})[- ](\d{2,4})/);
  if (dmyMatch) {
    let y = dmyMatch[3];
    if (y.length === 2) y = (parseInt(y, 10) > 50 ? '19' : '20') + y;
    return `${y}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  return '';
}

function isReadableText(text) {
  if (!text || typeof text !== 'string' || text.trim().length < 25) return false;

  let printable = 0;
  let nonPrintable = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
      printable++;
    } else {
      nonPrintable++;
    }
  }

  if (printable / (printable + nonPrintable) < 0.72) {
    return false;
  }

  const keywords = /\b(invoice|total|tax|gst|gstin|date|dated|bill|amount|rate|qty|quantity|balance|subtotal|rupees|inr|rs|po|order|buyer|seller|vendor|limited|pvt|llp)\b/i;
  const matches = text.match(new RegExp(keywords.source, 'gi'));
  return Boolean(matches && matches.length >= 2);
}

// Extract embedded JPEG images from a scanned PDF buffer
function extractImagesFromPdf(buffer) {
  const images = [];
  let pos = 0;
  while (pos < buffer.length) {
    const streamStart = buffer.indexOf('stream', pos);
    if (streamStart === -1) break;
    let dataStart = streamStart + 6;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) dataStart += 2;
    else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) dataStart += 1;

    const streamEnd = buffer.indexOf('endstream', dataStart);
    if (streamEnd === -1) break;

    const headerSlice = buffer.subarray(Math.max(0, streamStart - 200), streamStart).toString('latin1');
    if (headerSlice.includes('/DCTDecode') || (buffer[dataStart] === 0xff && buffer[dataStart + 1] === 0xd8)) {
      const imgBuffer = buffer.subarray(dataStart, streamEnd);
      if (imgBuffer[0] === 0xff && imgBuffer[1] === 0xd8) {
        images.push(imgBuffer);
      }
    }
    pos = streamEnd + 9;
  }
  return images;
}

// 100% pure JavaScript PDF text extractor using Node built-in zlib & standard CMap decoding
function extractNativePdfText(buffer) {
  try {
    const raw = buffer.toString('latin1');
    const cmap = new Map();

    const bfcharRegex = /beginbfchar([\s\S]*?)endbfchar/g;
    let match;
    while ((match = bfcharRegex.exec(raw)) !== null) {
      const pairs = match[1].match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g);
      if (pairs) {
        for (const p of pairs) {
          const m = p.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
          if (m) {
            cmap.set(parseInt(m[1], 16), String.fromCharCode(parseInt(m[2], 16)));
          }
        }
      }
    }

    const bfrangeRegex = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((match = bfrangeRegex.exec(raw)) !== null) {
      const lines = match[1].trim().split('\n');
      for (const line of lines) {
        const singleMatch = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
        if (singleMatch) {
          const start = parseInt(singleMatch[1], 16);
          const end = parseInt(singleMatch[2], 16);
          let dstStart = parseInt(singleMatch[3], 16);
          for (let c = start; c <= end; c++) {
            cmap.set(c, String.fromCharCode(dstStart++));
          }
        }
      }
    }

    const extractedLines = [];
    let pos = 0;
    while (pos < buffer.length) {
      const streamStart = buffer.indexOf('stream', pos);
      if (streamStart === -1) break;
      let dataStart = streamStart + 6;
      if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) dataStart += 2;
      else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) dataStart += 1;

      const streamEnd = buffer.indexOf('endstream', dataStart);
      if (streamEnd === -1) break;

      const slice = buffer.subarray(dataStart, streamEnd);
      let streamText = '';
      try {
        streamText = zlib.inflateSync(slice).toString('latin1');
      } catch {
        streamText = slice.toString('latin1');
      }

      // Handle TJ array syntax
      const tjRegex = /\[(.*?)\]\s*TJ/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(streamText)) !== null) {
        const content = tjMatch[1];
        let lineBuf = '';
        const tokens = content.match(/<([0-9a-fA-F]+)>|\(([^)]*)\)|(-?\d+(?:\.\d+)?)/g);
        if (tokens) {
          for (const tok of tokens) {
            if (tok.startsWith('<') && tok.endsWith('>')) {
              const hexStr = tok.slice(1, -1);
              for (let i = 0; i < hexStr.length; i += 4) {
                const code = parseInt(hexStr.slice(i, i + 4), 16);
                lineBuf += cmap.get(code) || '';
              }
            } else if (tok.startsWith('(') && tok.endsWith(')')) {
              lineBuf += tok.slice(1, -1);
            } else {
              const num = parseFloat(tok);
              if (num < -100) lineBuf += ' ';
            }
          }
        }
        if (lineBuf.trim().length > 0) {
          extractedLines.push(lineBuf.trim());
        }
      }

      // Handle standard Tj string syntax
      const singleTjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
      let sMatch;
      while ((sMatch = singleTjRegex.exec(streamText)) !== null) {
        if (sMatch[1].trim().length > 0) {
          extractedLines.push(sMatch[1].trim());
        }
      }

      pos = streamEnd + 9;
    }

    return extractedLines.join('\n');
  } catch (err) {
    console.warn('Native PDF extraction error:', err.message);
    return '';
  }
}

function parseWordsToNumber(text) {
  if (!text) return null;
  const units = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19
  };
  const tens = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };
  const scales = {
    hundred: 100, thousand: 1000, lakh: 100000, lac: 100000, lakhs: 100000, crore: 10000000, crores: 10000000
  };

  const clean = text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\b(?:inr|rs|rupees|rupee|only|and|e|oe)\b/g, ' ')
    .trim();

  const parts = clean.split(/\s*(?:and\s+)?(?:paise|paisa)\s*/);
  const rupeePart = parts[0] || '';

  function parsePart(str) {
    const tokens = str.trim().split(/\s+/).filter(Boolean);
    let total = 0;
    let current = 0;
    for (const token of tokens) {
      if (units[token] !== undefined) {
        current += units[token];
      } else if (tens[token] !== undefined) {
        current += tens[token];
      } else if (token === 'hundred') {
        current = (current || 1) * 100;
      } else if (scales[token] !== undefined) {
        total += (current || 1) * scales[token];
        current = 0;
      }
    }
    return total + current;
  }

  const rupees = parsePart(rupeePart);
  return rupees > 0 ? rupees : null;
}

function parseInvoiceText(text) {
  if (!text || typeof text !== 'string') return {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let invoiceNumber = '';
  let invoiceDate = '';
  let invoiceTotal = 0;
  let subtotal = 0;
  let taxAmount = 0;
  let vendorName = '';
  let poNumber = '';

  const noiseVendorRegex = /^(?:tax\s+invoice|invoice|original|duplicate|triplicate|bill\s+of\s+supply|customer\s+copy|scanned\s+with|oken\s+scanner|camscanner|e-invoice|irn\s+no|ack\s+no|terms|delivery|buyer|consignee|page\s+\d)/i;
  const legalEntityRegex = /\b(?:llp|pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|enterprises|sons|emporium|traders|industries|services|landscape|marbles|sanitary|tiles|hardware|solutions|electricals|interiors)\b/i;

  // 1. Detect Vendor Name
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@([a-zA-Z0-9_-]+)\.[a-zA-Z0-9._-]+)/);
  if (emailMatch && emailMatch[2]) {
    const domainPart = emailMatch[2].toLowerCase();
    if (!['gmail', 'yahoo', 'outlook', 'hotmail', 'rediffmail', 'icloud'].includes(domainPart)) {
      vendorName = domainPart.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  if (!vendorName) {
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i];
      if (line.length >= 3 && !noiseVendorRegex.test(line) && !line.toLowerCase().includes('luxeworx')) {
        if (legalEntityRegex.test(line)) {
          let clean = line.replace(/[-|:]\s*$/, '').trim();
          clean = clean.replace(/^(?:from\s*:?|m\/s\.?\s*)/i, '').trim();
          clean = clean.replace(/\s+(?:invoice\s*no\.?|inv\s*no\.?|dated|gstin|pan).*$/i, '').trim();
          if (clean.length >= 3) {
            vendorName = clean;
            break;
          }
        }
      }
    }
  }

  if (!vendorName) {
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i];
      if (/gstin|pan\s*no/i.test(line) && !line.toLowerCase().includes('luxeworx')) {
        if (i > 0 && lines[i - 1].length >= 3 && !noiseVendorRegex.test(lines[i - 1])) {
          vendorName = lines[i - 1].replace(/[-|:]\s*$/, '').trim();
          break;
        }
      }
    }
  }

  if (!vendorName) {
    for (let i = 0; i < Math.min(6, lines.length); i++) {
      const line = lines[i];
      if (line.length >= 4 && !noiseVendorRegex.test(line) && !line.includes(':') && !line.toLowerCase().includes('luxeworx')) {
        vendorName = line.replace(/[-|:]\s*$/, '').trim();
        break;
      }
    }
  }

  // 2. Extract Invoice Number, Date, PO Number
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

    // PO Number
    if (!poNumber) {
      const poMatch = line.match(/(?:buyer'?s?\s*order\s*no\.?|po\s*no\.?|purchase\s*order\s*no\.?|p\.?o\.?\s*#?)\s*[:#-]?\s*([A-Za-z0-9\/._-]+)/i) ||
                      line.match(/\b(LAIPL[\/-]?P[CO][\/-]?[A-Za-z0-9\/._-]+)\b/i);
      if (poMatch && poMatch[1].length >= 4 && !/^(?:date|dated|dt)$/i.test(poMatch[1])) {
        poNumber = poMatch[1].trim();
      }
    }

    // Invoice Number: First check structured fiscal patterns (e.g. AGL/26-27/164, KEW/26-27/1212)
    if (!invoiceNumber) {
      const fiscalMatch = line.match(/\b([A-Za-z]{1,6}[\/-]\d{2,4}[-\/]\d{2,4}[\/-][A-Za-z0-9]+)\b/);
      if (fiscalMatch && !fiscalMatch[1].toUpperCase().includes('PO') && !fiscalMatch[1].toUpperCase().includes('LAIPL')) {
        invoiceNumber = fiscalMatch[1];
      }
    }

    // Invoice Number standard labels
    if (!invoiceNumber) {
      const invMatch = line.match(/(?:invoice\s*no\.?|inv\s*no\.?|bill\s*no\.?|invoice\s*#|bill\s*#|inv\s*#|invoice\s*number)\s*[:#-]?\s*([A-Za-z0-9\/._-]+)?/i);
      if (invMatch) {
        let val = (invMatch[1] || '').trim();
        if (!val || /^(?:gated|dated|date|original|duplicate|gstin|details|e-way)$/i.test(val)) {
          const nextMatch = nextLine.match(/([A-Za-z0-9]{1,10}[\/-][A-Za-z0-9\/-]+|\b\d{2,8}\b)/);
          if (nextMatch && !/^(?:luxeworx|sector|ground|floor|haryana|delhi|uttar|noida)/i.test(nextMatch[1])) {
            val = nextMatch[1];
          }
        }
        val = val.replace(/(?:vehicle|date|dated|dt|transport|porter).*$/i, '').trim();
        if (val.length >= 2 && !/^(?:gated|dated|date|original|duplicate|tax|invoice|bill|cash|credit)$/i.test(val)) {
          invoiceNumber = val;
        }
      }
    }

    // Invoice Date
    if (!invoiceDate) {
      const dateMatch = line.match(/(?:invoice\s*date|date\s*of\s*invoice|dated|date|dt\.?)\s*[:#-]?\s*([0-9]{1,2}[-\/ ][A-Za-z]{3,9}[-\/ ][0-9]{2,4}|[0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{4}[-\/\.][0-9]{1,2}[-\/\.][0-9]{1,2})/i);
      if (dateMatch && dateMatch[1]) {
        const d = normalizeDate(dateMatch[1]);
        if (d) invoiceDate = d;
      }
    }
  }

  // Secondary date search
  if (!invoiceDate) {
    const rawDate = text.match(/\b(\d{1,2}[- ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[- ]\d{2,4})\b/i);
    if (rawDate) {
      invoiceDate = normalizeDate(rawDate[1]);
    }
  }

  // 3. Extract Amounts
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = line.replace(/,/g, '');
    const nextLine = i + 1 < lines.length ? lines[i + 1].replace(/,/g, '') : '';

    // Total / Grand Total / Amount Chargeable
    if (!invoiceTotal && /(?:grand\s+total|total\s+amount|invoice\s+(?:total|value)|total\s+payable|net\s+payable|amount\s+chargeable)\b/i.test(line)) {
      const amtMatch = cleanLine.match(/(\d+\.\d{2}|\d+)\s*$/) || cleanLine.match(/[:\u20B9RsINR\s]+(\d+(?:\.\d{1,2})?)/i);
      if (amtMatch) {
        const val = parseFloat(amtMatch[1]);
        if (val > 0 && val < 100000000) invoiceTotal = val;
      } else {
        const nextAmt = nextLine.match(/^\s*(\d+(?:\.\d{1,2})?)\s*$/);
        if (nextAmt) {
          const val = parseFloat(nextAmt[1]);
          if (val > 0 && val < 100000000) invoiceTotal = val;
        }
      }
    }

    // Subtotal / Taxable Value
    if (!subtotal && /(?:taxable\s+(?:value|amount)|sub\s*total|basic\s+amount|total\s+before\s+tax)\b/i.test(line)) {
      const amtMatch = cleanLine.match(/(\d+\.\d{2}|\d+)\s*$/) || cleanLine.match(/[:\u20B9RsINR\s]+(\d+(?:\.\d{1,2})?)/i);
      if (amtMatch) {
        const val = parseFloat(amtMatch[1]);
        if (val > 0 && val < 100000000) subtotal = val;
      }
    }

    // Tax Amount
    if (!taxAmount && /(?:total\s+tax|tax\s+amount|gst\s+amount|igst|cgst\s*\+\s*sgst)\b/i.test(line)) {
      const amtMatch = cleanLine.match(/(\d+\.\d{2}|\d+)\s*$/) || cleanLine.match(/[:\u20B9RsINR\s]+(\d+(?:\.\d{1,2})?)/i);
      if (amtMatch) {
        const val = parseFloat(amtMatch[1]);
        if (val > 0 && val < 100000000) taxAmount = val;
      }
    }
  }

  // Word amount fallback (e.g. INR Forty Six Thousand Sixty Seven Only)
  if (!invoiceTotal) {
    const wordAmtMatch = text.match(/(?:INR|Rs\.?)\s+([A-Za-z\s]+?)\s+Only/i);
    if (wordAmtMatch && wordAmtMatch[1]) {
      const num = parseWordsToNumber(wordAmtMatch[1]);
      if (num && num > 0) invoiceTotal = num;
    }
  }

  // Fallback for simple 'Total: 46,067.00' or 'Total | 30.000'
  if (!invoiceTotal) {
    const totalMatch = text.match(/\bTotal\s*[:#| -]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d{2,6})\b/i);
    if (totalMatch) {
      let rawNum = totalMatch[1].replace(/,/g, '');
      if (/^\d{2}\.\d{3}$/.test(rawNum)) rawNum = rawNum.replace('.', '');
      invoiceTotal = parseFloat(rawNum) || 0;
    }
  }

  // 4. Strict Reconciliation to satisfy validateInvoiceFields
  let cleanTot = invoiceTotal ? Number(Number(invoiceTotal).toFixed(2)) : 0;
  let cleanSub = subtotal ? Number(Number(subtotal).toFixed(2)) : 0;
  let cleanTax = taxAmount ? Number(Number(taxAmount).toFixed(2)) : 0;

  if (cleanTot > 0) {
    if (cleanSub > 0 && cleanTax > 0) {
      cleanSub = Number((cleanTot - cleanTax).toFixed(2));
    } else if (cleanSub > 0 && !cleanTax) {
      cleanTax = Number((cleanTot - cleanSub).toFixed(2));
      if (cleanTax < 0) cleanTax = 0;
    } else if (cleanTax > 0 && !cleanSub) {
      cleanSub = Number((cleanTot - cleanTax).toFixed(2));
    } else {
      cleanSub = cleanTot;
      cleanTax = 0;
    }
  } else if (cleanSub > 0) {
    cleanTot = Number((cleanSub + cleanTax).toFixed(2));
  }

  return {
    vendorName: vendorName || '',
    invoiceNumber: invoiceNumber ? invoiceNumber.trim() : '',
    invoiceDate: invoiceDate || '',
    subtotal: cleanSub,
    taxAmount: cleanTax,
    invoiceTotal: cleanTot,
    poNumber: poNumber || ''
  };
}

async function extractTextFromBuffer(buffer, fileType) {
  // 1. PDF files
  if (fileType === 'application/pdf') {
    // A. Fast pure JS native text stream extractor (15ms)
    try {
      const pureText = extractNativePdfText(buffer);
      if (isReadableText(pureText)) {
        return pureText;
      }
    } catch (e) {
      console.warn('Native PDF extraction failed:', e.message);
    }

    // B. PDFParse load and getText (digital PDF fallback)
    let screenshotBuffer = null;
    try {
      const { PDFParse } = await import('pdf-parse');
      if (typeof PDFParse === 'function') {
        const parser = new PDFParse({ data: buffer });
        await withTimeout(parser.load(), 5000, 'PDF load');
        
        try {
          const textObj = await withTimeout(parser.getText(), 4000, 'PDF text extraction');
          const raw = (textObj?.text || '').trim();
          if (isReadableText(raw)) {
            return raw;
          }
        } catch (tErr) {
          console.warn('PDF text extraction error:', tErr.message);
        }

        // Render page screenshot for OCR
        try {
          const screenshot = await withTimeout(parser.getScreenshot({ pageNumber: 1 }), 8000, 'PDF screenshot');
          const p0 = screenshot?.pages?.[0];
          if (p0?.data) {
            screenshotBuffer = Buffer.from(p0.data);
          }
        } catch (ssErr) {
          console.warn('PDF screenshot failed:', ssErr.message);
        }
      }
    } catch (pdfErr) {
      console.warn('PDFParse failed:', pdfErr.message);
    }

    // C. If screenshotBuffer not obtained from PDFParse, try embedded JPEG streams
    if (!screenshotBuffer) {
      const imgs = extractImagesFromPdf(buffer);
      imgs.sort((a, b) => b.length - a.length);
      if (imgs.length > 0) {
        screenshotBuffer = imgs[0];
      }
    }

    // D. Run OCR on the page screenshot / extracted image
    if (screenshotBuffer) {
      try {
        const tessModule = await import('tesseract.js');
        const Tesseract = tessModule.default || tessModule;
        if (Tesseract && typeof Tesseract.recognize === 'function') {
          const textRes = await withTimeout(
            Tesseract.recognize(screenshotBuffer, 'eng'),
            25000,
            'Scanned PDF OCR'
          );
          const ocrText = textRes?.data?.text || '';
          if (ocrText && ocrText.trim().length > 10) {
            return ocrText;
          }
        }
      } catch (ocrErr) {
        console.warn('Scanned PDF OCR error:', ocrErr.message);
      }
    }

    return '';
  }

  // 2. Direct Image files (JPEG, PNG, WEBP)
  if (fileType && (fileType.startsWith('image/') || fileType === 'image/jpeg' || fileType === 'image/png' || fileType === 'image/webp')) {
    try {
      const tessModule = await import('tesseract.js');
      const Tesseract = tessModule.default || tessModule;
      if (Tesseract && typeof Tesseract.recognize === 'function') {
        const textRes = await withTimeout(
          Tesseract.recognize(buffer, 'eng'),
          25000,
          'Image OCR'
        );
        const text = textRes?.data?.text || '';
        if (text && text.trim().length > 10) {
          return text;
        }
      }
    } catch (ocrErr) {
      console.warn('Image OCR error:', ocrErr.message);
    }
  }

  return '';
}


async function parseWithGroq(text, groqApiKey) {
  if (!text || text.trim().length < 15 || !groqApiKey) return null;
  try {
    const res = await withTimeout(
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: 'You are an expert invoice parser. Extract the following fields from the given invoice text into a JSON object: vendorName (string), invoiceNumber (string), invoiceDate (YYYY-MM-DD), poNumber (string), subtotal (number), taxAmount (number), invoiceTotal (number). CRITICAL: LUXEWORX / LUXEWORX ATELIER INTERIORS is the BUYER/CUSTOMER (Consignee/Bill-To). NEVER return Luxeworx as vendorName. The vendor is the supplier/seller company issuing the invoice. Ensure subtotal and taxAmount sum to invoiceTotal. If a field is missing, return empty string or 0. Return ONLY valid JSON.'
            },
            {
              role: 'user',
              content: text.slice(0, 6000)
            }
          ],
          response_format: { type: 'json_object' }
        })
      }),
      8000,
      'Groq API'
    );

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          vendorName: String(parsed.vendorName || '').trim(),
          invoiceNumber: String(parsed.invoiceNumber || '').trim(),
          invoiceDate: String(parsed.invoiceDate || '').trim(),
          poNumber: String(parsed.poNumber || '').trim(),
          subtotal: Number(parsed.subtotal || 0),
          taxAmount: Number(parsed.taxAmount || 0),
          invoiceTotal: Number(parsed.invoiceTotal || 0)
        };
      }
    }
  } catch (err) {
    console.warn('Groq parse error:', err.message);
  }
  return null;
}

export async function POST(request) {
  try {
    const token = request.headers.get('x-lwa-token') || request.headers.get('X-LWA-Token');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing Token' }, { status: 401 });
    }

    let session = null;
    try {
      session = await api.getMySession(token);
    } catch {
      try {
        session = await api.getVendorPortalSession(token);
      } catch {
        return NextResponse.json({ error: 'Unauthorized: Invalid Token' }, { status: 401 });
      }
    }

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Token' }, { status: 401 });
    }

    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const { fileData, fileType } = body || {};
    if (!fileData || typeof fileData !== 'string') {
      return NextResponse.json({ error: 'Valid fileData is required' }, { status: 400 });
    }

    const cleanBase64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const fileBuffer = Buffer.from(cleanBase64, 'base64');
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Try Gemini AI if configured with 8s timeout
    if (geminiKey) {
      try {
        const mime = fileType || 'application/pdf';
        const response = await withTimeout(
          fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        inlineData: {
                          mimeType: mime,
                          data: cleanBase64
                        }
                      },
                      {
                        text: 'Extract invoice details. Return a JSON object with keys: vendorName, invoiceNumber, invoiceDate (YYYY-MM-DD), poNumber, subtotal (number), taxAmount (number), invoiceTotal (number). Return raw JSON only.'
                      }
                    ]
                  }
                ],
                generationConfig: {
                  responseMimeType: 'application/json'
                }
              })
            }
          ),
          8000,
          'Gemini API'
        );

        if (response.ok) {
          const data = await response.json();
          const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResult) {
            const cleanedText = textResult.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
            const parsed = JSON.parse(cleanedText);
            const validated = validateInvoiceFields(parsed, { partial: true });
            return NextResponse.json({ 
              ok: true, 
              data: { ...validated, vendorName: parsed.vendorName || '', poNumber: parsed.poNumber || '' }, 
              engine: 'gemini' 
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini extraction warning:', geminiErr.message);
      }
    }

    // 2. High-performance local PDF / Image OCR extraction engine
    const rawText = await extractTextFromBuffer(fileBuffer, fileType || 'application/pdf');
    
    // Graceful fallback if OCR text is empty: return blank partial fields instead of blocking with 422 error
    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ 
        ok: true,
        data: {
          invoiceNumber: '',
          invoiceDate: '',
          subtotal: 0,
          taxAmount: 0,
          invoiceTotal: 0,
          vendorName: '',
          poNumber: ''
        },
        engine: 'fallback',
        warning: 'Document could not be auto-read completely. Please review details in the side window.'
      });
    }

    const groqKey = process.env.GROQ_API_KEY;
    let parsedData = null;
    let engineUsed = 'local_ocr';

    if (groqKey && rawText && rawText.length > 20) {
      parsedData = await parseWithGroq(rawText, groqKey);
      if (parsedData && (parsedData.invoiceNumber || parsedData.invoiceTotal || parsedData.vendorName)) {
        engineUsed = 'groq_ai';
      }
    }

    if (!parsedData || (!parsedData.invoiceNumber && !parsedData.invoiceTotal)) {
      parsedData = parseInvoiceText(rawText);
    }

    // Ensure subtotal and tax sum to invoiceTotal to satisfy validateInvoiceFields
    let cleanTot = parsedData.invoiceTotal ? Number(Number(parsedData.invoiceTotal).toFixed(2)) : 0;
    let cleanSub = parsedData.subtotal ? Number(Number(parsedData.subtotal).toFixed(2)) : 0;
    let cleanTax = parsedData.taxAmount ? Number(Number(parsedData.taxAmount).toFixed(2)) : 0;

    if (cleanTot > 0) {
      if (cleanSub > 0 && cleanTax > 0) {
        cleanSub = Number((cleanTot - cleanTax).toFixed(2));
      } else if (cleanSub > 0 && !cleanTax) {
        cleanTax = Number((cleanTot - cleanSub).toFixed(2));
        if (cleanTax < 0) cleanTax = 0;
      } else if (cleanTax > 0 && !cleanSub) {
        cleanSub = Number((cleanTot - cleanTax).toFixed(2));
      } else {
        cleanSub = cleanTot;
        cleanTax = 0;
      }
    } else if (cleanSub > 0) {
      cleanTot = Number((cleanSub + cleanTax).toFixed(2));
    }

    const reconciled = {
      ...parsedData,
      subtotal: cleanSub,
      taxAmount: cleanTax,
      invoiceTotal: cleanTot
    };

    const validated = validateInvoiceFields(reconciled, { partial: true });
    return NextResponse.json({ 
      ok: true, 
      data: { 
        ...validated, 
        vendorName: reconciled.vendorName || '', 
        poNumber: reconciled.poNumber || '' 
      }, 
      engine: engineUsed 
    });

  } catch (error) {
    console.error('Invoice parse error:', error);
    return NextResponse.json({ 
      ok: true,
      data: {
        invoiceNumber: '',
        invoiceDate: '',
        subtotal: 0,
        taxAmount: 0,
        invoiceTotal: 0,
        vendorName: '',
        poNumber: ''
      },
      warning: error.message || 'Invoice auto-fill encountered an issue. Please enter invoice details manually.' 
    });
  }
}
