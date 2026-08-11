import { NextResponse } from 'next/server';
import { decryptToken } from '../../../lib/api/token.js';
import * as api from '../../../lib/api.js';

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

    const body = await request.json();
    const { fileData, fileType } = body;
    if (!fileData) {
      return NextResponse.json({ error: 'Missing fileData (base64 string)' }, { status: 400 });
    }

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
      const errText = await response.text();
      return NextResponse.json({ error: `Gemini API call failed: ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return NextResponse.json({ error: 'Failed to extract text from Gemini response.' }, { status: 502 });
    }

    const cleanedText = textResult.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleanedText);
    return NextResponse.json({ ok: true, data: parsed });

  } catch (error) {
    console.error('Invoice parse error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
