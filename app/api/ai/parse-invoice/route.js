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

// 100% pure JavaScript PDF text extractor using Node built-in zlib & standard CMap decoding
// Zero external binaries, zero canvas, zero worker threads, works in all serverless environments
function extractTextFromPdfBuffer(buffer) {
  try {
    const raw = buffer.toString('latin1');
    const cmap = new Map();

    // 1. Parse ToUnicode beginbfchar blocks (<srcHex> <dstHex>)
    const bfcharRegex = /beginbfchar([\s\S]*?)endbfchar/g;
    let match;
    while ((match = bfcharRegex.exec(raw)) !== null) {
      const pairs = match[1].match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g);
      if (pairs) {
        for (const p of pairs) {
          const m = p.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
          if (m) {
            const src = parseInt(m[1], 16);
            const dst = String.fromCharCode(parseInt(m[2], 16));
            cmap.set(src, dst);
          }
        }
      }
    }

    // 2. Parse ToUnicode beginbfrange blocks (<startHex> <endHex> <dstStartHex>)
    const bfrangeRegex = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((match = bfrangeRegex.exec(raw)) !== null) {
      const lines = match[1].trim().split('\n');
      for (const line of lines) {
        const singleMatch = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
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

    // 3. Decompress all streams and decode TJ arrays & Tj strings
    const extractedLines = [];
    let pos = 0;
    while (pos < buffer.length) {
      const streamStart = buffer.indexOf('stream', pos);
      if (streamStart === -1) break;
      let dataStart = streamStart + 6;
      if (buffer[dataStart] === 0x0d && buffer[dataStart+1] === 0x0a) dataStart += 2;
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

      // Handle TJ array syntax: [(string) -120 (string)] TJ or [<0012> 2.0 <0014>] TJ
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
              if (num < -100) {
                lineBuf += ' ';
              }
            }
          }
        }
        if (lineBuf.trim().length > 0) {
          extractedLines.push(lineBuf.trim());
        }
      }

      // Handle standard Tj string syntax: (Text string) Tj
      const singleTjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
      let sMatch;
      while ((sMatch = singleTjRegex.exec(streamText)) !== null) {
        if (sMatch[1].trim().length > 0) {
          extractedLines.push(sMatch[1].trim());
        }
      }

      pos = streamEnd + 9;
    }

    const result = extractedLines.join('\n');
    if (result.trim().length > 20) {
      return result;
    }
  } catch (err) {
    console.warn('Native PDF extraction error:', err.message);
  }
  return '';
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

  // Vendor detection via email domain (e.g. name@interiomart.in -> Interio Mart)
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@([a-zA-Z0-9_-]+)\.[a-zA-Z0-9._-]+)/);
  if (emailMatch && emailMatch[2]) {
    const domainPart = emailMatch[2].toLowerCase();
    if (!['gmail', 'yahoo', 'outlook', 'hotmail', 'rediffmail', 'icloud'].includes(domainPart)) {
      vendorName = domainPart;
    }
  }

  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const l = lines[i];
    if (l.length >= 3 && !/tax\s+invoice|invoice|original|bill\s+of\s+supply|duplicate|triplicate|customer\s+copy|ack\s+no|irn\s+no|terms/i.test(l)) {
      if (!vendorName && !l.includes(':')) {
        vendorName = l.replace(/[-|:]\s*$/, '').trim();
      }
    }
  }

  for (const line of lines) {
    // 1. Invoice Number
    if (!invoiceNumber) {
      const invMatch = line.match(/(?:invoice\s*no\.?|inv\s*no\.?|bill\s*no\.?|invoice\s*#|bill\s*#|inv\s*#|invoice\s*number)\s*[:#-]?\s*([A-Za-z0-9\/-]+)/i);
      if (invMatch && invMatch[1].length >= 3 && !['TAX', 'INVOICE', 'ORIGINAL', 'DUPLICATE', 'TRIPLICATE'].includes(invMatch[1].toUpperCase())) {
        let candidate = invMatch[1].trim();
        candidate = candidate.replace(/(vehicle|date|dated|dt|transport|porter).*$/i, '').trim();
        if (candidate.length >= 3) {
          invoiceNumber = candidate;
        }
      }
    }

    // 2. Invoice Date
    if (!invoiceDate) {
      const dateHeaderMatch = line.match(/(?:date\s*of\s*invoice|invoice\s*date|date|dated|dt\.?)\s*[:#-]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i);
      if (dateHeaderMatch) {
        const raw = dateHeaderMatch[1].replace(/\./g, '-').replace(/\//g, '-');
        const p = raw.split('-');
        if (p.length === 3) {
          if (p[0].length === 4) invoiceDate = `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
          else invoiceDate = `${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
      }
    }

    // 3. Amounts (handle Indian currency formatting commas)
    const cleanLine = line.replace(/,/g, '');
    
    // Total / Grand Total / Invoice Value
    if (!invoiceTotal && /(?:grand\s+total|invoice\s+(?:total|value)|total\s+amount|total\s+payable|net\s+payable|total\s+value|balance\s+due)\b/i.test(line)) {
      const amtMatch = cleanLine.match(/(\d+\.\d{2}|\d+)\s*$/) || cleanLine.match(/[:\u20B9RsINR\s]+(\d+(?:\.\d{1,2})?)/i);
      if (amtMatch) invoiceTotal = parseFloat(amtMatch[1]) || 0;
    }

    // Subtotal / Taxable Value
    if (!subtotal && /(?:taxable\s+(?:value|amount)|sub\s*total|basic\s+amount)\b/i.test(line)) {
      const amtMatch = cleanLine.match(/(\d+\.\d{2}|\d+)\s*$/) || cleanLine.match(/[:\u20B9RsINR\s]+(\d+(?:\.\d{1,2})?)/i);
      if (amtMatch) subtotal = parseFloat(amtMatch[1]) || 0;
    }

    // Tax Amount / IGST / CGST+SGST
    if (!taxAmount && /(?:total\s+tax|tax\s+amount|gst\s+amount|igst|cgst\s*\+\s*sgst)\b/i.test(line)) {
      const amtMatch = cleanLine.match(/(\d+\.\d{2}|\d+)\s*$/) || cleanLine.match(/[:\u20B9RsINR\s]+(\d+(?:\.\d{1,2})?)/i);
      if (amtMatch) taxAmount = parseFloat(amtMatch[1]) || 0;
    }
  }

  if (!invoiceNumber) {
    const rawInv = text.match(/\b([A-Z0-9]{2,6}[\/-]\d{2,4}[\/-]\d{2,6})\b/i);
    if (rawInv) invoiceNumber = rawInv[1];
  }

  if (invoiceTotal && !subtotal && taxAmount) {
    subtotal = Math.max(0, invoiceTotal - taxAmount);
  } else if (invoiceTotal && !subtotal && !taxAmount) {
    subtotal = invoiceTotal;
  } else if (!invoiceTotal && subtotal && taxAmount) {
    invoiceTotal = subtotal + taxAmount;
  }

  return {
    vendorName,
    invoiceNumber,
    invoiceDate,
    subtotal: subtotal ? Number(subtotal.toFixed(2)) : undefined,
    taxAmount: taxAmount ? Number(taxAmount.toFixed(2)) : undefined,
    invoiceTotal: invoiceTotal ? Number(invoiceTotal.toFixed(2)) : undefined
  };
}

async function extractTextFromBuffer(buffer, fileType) {
  // 1. PDF files: First try fast pure JS native extractor (15ms, 0 external dependencies)
  if (fileType === 'application/pdf') {
    const pureText = extractTextFromPdfBuffer(buffer);
    if (pureText && pureText.trim().length > 20) {
      return pureText;
    }

    // Secondary fallback: pdf-parse if available
    try {
      const pdfModule = await import('pdf-parse');
      const PDFParse = pdfModule.PDFParse || pdfModule.default || pdfModule;
      if (typeof PDFParse === 'function') {
        const parser = new PDFParse({ data: buffer });
        const res = await withTimeout(parser.getText(), 4000, 'PDF text extraction');
        const clean = (res?.text || '').replace(/-- \d+ of \d+ --/g, '').trim();
        if (clean.length > 15) {
          return clean;
        }
      }
    } catch (pdfErr) {
      console.warn('PDF text extraction warning:', pdfErr.message);
    }

    return '';
  }

  // 2. Image files ONLY (JPEG, PNG, WEBP)
  if (fileType && (fileType.startsWith('image/') || fileType === 'image/jpeg' || fileType === 'image/png' || fileType === 'image/webp')) {
    try {
      const tessModule = await import('tesseract.js');
      const Tesseract = tessModule.default || tessModule;
      if (Tesseract && typeof Tesseract.recognize === 'function') {
        const textRes = await withTimeout(
          Tesseract.recognize(buffer, 'eng'),
          5000,
          'Image OCR'
        );
        const text = textRes?.data?.text || '';
        if (text && text.trim().length > 10) {
          return text;
        }
      }
    } catch (ocrErr) {
      console.warn('Image OCR warning:', ocrErr.message);
    }
  }

  return '';
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
    } catch (e) {
      try {
        session = await api.getVendorPortalSession(token);
      } catch (vErr) {
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
    } catch (err) {
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
                        text: 'Extract the following details from this invoice image/PDF. Return a JSON object with keys: invoiceNumber, invoiceDate (in YYYY-MM-DD format), subtotal (number), taxAmount (number), invoiceTotal (number). Subtotal and taxAmount must sum to invoiceTotal. If a value is missing or unreadable, return empty string or 0. Return ONLY the raw JSON, no markdown code blocks, no backticks, no markdown wrapping.'
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
            const parsed = validateInvoiceFields(JSON.parse(cleanedText), { partial: true });
            return NextResponse.json({ ok: true, data: parsed, engine: 'gemini' });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini extraction warning:', geminiErr.message);
      }
    }

    // 2. High-performance local PDF / Image extraction engine (guaranteed under 5 seconds)
    const rawText = await extractTextFromBuffer(fileBuffer, fileType || 'application/pdf');
    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ 
        error: 'This invoice document could not be auto-read (scanned image inside PDF). Please enter the invoice details manually.' 
      }, { status: 422 });
    }

    const parsedData = parseInvoiceText(rawText);
    const validated = validateInvoiceFields(parsedData, { partial: true });
    return NextResponse.json({ ok: true, data: validated, engine: 'local_ocr' });

  } catch (error) {
    console.error('Invoice parse error:', error);
    return NextResponse.json({ 
      error: error.message || 'Invoice auto-fill processing failed. Please enter invoice details manually.' 
    }, { status: 500 });
  }
}
