import { NextResponse } from 'next/server';
import * as api from '../../../lib/api.js';
import { validateInvoiceFields } from '../../../../src/modules/invoices/services/invoiceValidation.js';

async function withTimeout(promise, ms, name = 'Operation') {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
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

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i];
    if (l.length >= 3 && !/tax\s+invoice|invoice|original|bill\s+of\s+supply|duplicate|triplicate|customer\s+copy/i.test(l)) {
      if (!vendorName) vendorName = l.replace(/[-|:]\s*$/, '').trim();
    }
  }

  for (const line of lines) {
    // 1. Invoice Number
    if (!invoiceNumber) {
      const invMatch = line.match(/(?:invoice\s*no\.?|inv\s*no\.?|bill\s*no\.?|invoice\s*#|bill\s*#|inv\s*#|invoice\s*number)\s*[:#-]?\s*([A-Za-z0-9\/-]+)/i);
      if (invMatch && invMatch[1].length >= 3 && !['TAX', 'INVOICE', 'ORIGINAL'].includes(invMatch[1].toUpperCase())) {
        invoiceNumber = invMatch[1].trim();
      }
    }

    // 2. Invoice Date
    if (!invoiceDate) {
      const dateHeaderMatch = line.match(/(?:date|dated|dt\.?|invoice\s*date)\s*[:#-]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i);
      if (dateHeaderMatch) {
        const raw = dateHeaderMatch[1].replace(/\./g, '-').replace(/\//g, '-');
        const p = raw.split('-');
        if (p.length === 3) {
          if (p[0].length === 4) invoiceDate = `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
          else invoiceDate = `${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
      }
    }

    // 3. Amounts
    const cleanLine = line.replace(/,/g, '');
    
    // Total / Grand Total / Invoice Value
    if (!invoiceTotal && /(?:grand\s+total|invoice\s+(?:total|value)|total\s+amount|total\s+payable|net\s+payable|total\s+value|balance\s+due)\b/i.test(line)) {
      const amtMatch = cleanLine.match(/(\d+\.\d{2}|\d+)\s*$/) || cleanLine.match(/[:?RsINR\s]+(\d+(?:\.\d{1,2})?)/i);
      if (amtMatch) invoiceTotal = parseFloat(amtMatch[1]) || 0;
    }

    // Subtotal / Taxable Value
    if (!subtotal && /(?:taxable\s+(?:value|amount)|sub\s*total|basic\s+amount)\b/i.test(line)) {
      const amtMatch = cleanLine.match(/(\d+\.\d{2}|\d+)\s*$/) || cleanLine.match(/[:?RsINR\s]+(\d+(?:\.\d{1,2})?)/i);
      if (amtMatch) subtotal = parseFloat(amtMatch[1]) || 0;
    }

    // Tax Amount / IGST / CGST+SGST
    if (!taxAmount && /(?:total\s+tax|tax\s+amount|gst\s+amount|igst|cgst\s*\+\s*sgst)\b/i.test(line)) {
      const amtMatch = cleanLine.match(/(\d+\.\d{2}|\d+)\s*$/) || cleanLine.match(/[:?RsINR\s]+(\d+(?:\.\d{1,2})?)/i);
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
  // 1. PDF files: use PDFParse with strict timeout (NEVER call Tesseract on PDF)
  if (fileType === 'application/pdf') {
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

    // Fast native stream text extraction fallback
    try {
      const rawPdf = buffer.toString('latin1');
      const textMatches = [];
      const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
      let m;
      while ((m = tjRegex.exec(rawPdf)) !== null) {
        if (m[1] && m[1].length > 1) {
          textMatches.push(m[1]);
        }
      }
      if (textMatches.length > 5) {
        return textMatches.join(' ');
      }
    } catch (streamErr) {
      console.warn('PDF stream extraction warning:', streamErr.message);
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
      const raw = await request.text();
      body = JSON.parse(raw);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON request: ' + err.message }, { status: 400 });
    }

    const { fileData, fileType } = body || {};
    if (typeof fileData !== 'string' || !fileData.length) {
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
            const cleanedText = textResult.trim().replace(/^\`\`\`json\s*/i, '').replace(/\`\`\`$/, '').trim();
            const parsed = validateInvoiceFields(JSON.parse(cleanedText), { partial: true });
            return NextResponse.json({ ok: true, data: parsed, engine: 'gemini' });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini extraction failed, falling back to local OCR engine:', geminiErr.message);
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
      error: error.message || 'Unable to extract this invoice. Please enter details manually.' 
    }, { status: 500 });
  }
}
