import { NextResponse } from 'next/server';
import * as api from '../../../lib/api.js';
import { validateInvoiceFields } from '../../../../src/modules/invoices/services/invoiceValidation.js';

const MAX_BODY_BYTES = 8 * 1024 * 1024;
async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new Error('Invoice file is too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing invoice file');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('Invoice file is too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function POST(request) {
  try {
    const token = request.headers.get('x-lwa-token') || request.headers.get('X-LWA-Token');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing Token' }, { status: 401 });
    }

    // Authenticate session (either internal or vendor portal)
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
    try { body = await readBody(request); }
    catch (error) { return NextResponse.json({ error: error.message === 'Invoice file is too large' ? error.message : 'Invalid invoice request' }, { status: error.message === 'Invoice file is too large' ? 413 : 400 }); }
    const { fileData, fileType } = body || {};
    if (typeof fileData !== 'string' || !fileData.length || fileData.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(fileData)) return NextResponse.json({ error: 'Valid base64 fileData is required' }, { status: 400 });
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(fileType || 'application/pdf')) return NextResponse.json({ error: 'Unsupported invoice file type' }, { status: 400 });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ 
        error: 'AI Auto-Fill is not configured on this server. Please add GEMINI_API_KEY to your server .env file.' 
      }, { status: 501 });
    }

    // Call Google's Gemini API
    const mime = fileType || 'application/pdf';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mime,
                    data: fileData
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
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Invoice extraction service is unavailable. Please enter the invoice details manually.' }, { status: 502 });
    }

    const data = await response.json();
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return NextResponse.json({ error: 'Failed to extract text from Gemini response.' }, { status: 502 });
    }

    const cleanedText = textResult.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    let parsed;
    try { parsed = validateInvoiceFields(JSON.parse(cleanedText), { partial: true }); }
    catch { return NextResponse.json({ error: 'Extracted invoice details could not be verified. Please enter them manually.' }, { status: 422 }); }
    return NextResponse.json({ ok: true, data: parsed });

  } catch (error) {
    console.error('Invoice parse error:', error);
    return NextResponse.json({ error: error.name === 'TimeoutError' ? 'Invoice extraction timed out. Please try again.' : 'Unable to extract this invoice. Please enter details manually.' }, { status: error.name === 'TimeoutError' ? 504 : 500 });
  }
}
