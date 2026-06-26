import { NextResponse } from 'next/server';
import { queryGet } from '../../lib/db.js';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    let logoUri = '';
    
    // First try to fetch from database
    try {
      const row = await queryGet(`SELECT value FROM app_settings WHERE key = 'company_logo'`);
      if (row && row.value) {
        logoUri = row.value;
      }
    } catch (e) {
      console.error('Failed to fetch logo from database:', e);
    }

    // Fallback to legacy file if database logo is not set
    if (!logoUri) {
      try {
        logoUri = fs.readFileSync(path.join(process.cwd(), 'scratch', 'logo_uri.txt'), 'utf8').trim();
      } catch (e) {
        // Ignored, we'll return 404 below
      }
    }

    if (!logoUri) {
      return new Response('Logo asset not found', { status: 404 });
    }

    const match = logoUri.match(/^data:(image\/[^;]+);base64,(.+)$/);

    if (!match) {
      // If it's just a regular URL or path, we can't parse it as base64
      return new Response('Logo format not supported', { status: 400 });
    }

    const [, mimeType, base64Data] = match;
    const buffer = Buffer.from(base64Data, 'base64');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    return new Response(error?.message || 'Logo asset not found', { status: 404 });
  }
}
