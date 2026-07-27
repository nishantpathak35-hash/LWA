import { NextResponse } from 'next/server';
import { queryGet } from '../../lib/db.js';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request) {
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
        if (fs.existsSync(path.join(process.cwd(), 'scratch', 'logo_uri.txt'))) {
          logoUri = fs.readFileSync(path.join(process.cwd(), 'scratch', 'logo_uri.txt'), 'utf8').trim();
        } else if (fs.existsSync(path.join(process.cwd(), 'LWA_PRIMARY_LOGO_2_GOLD.png'))) {
          const imgBuffer = fs.readFileSync(path.join(process.cwd(), 'LWA_PRIMARY_LOGO_2_GOLD.png'));
          logoUri = `data:image/png;base64,${imgBuffer.toString('base64')}`;
        }
      } catch (e) {
        // Ignored, we'll return 404 below
      }
    }

    if (!logoUri) {
      return new Response('Logo asset not found', { status: 404 });
    }

    if (logoUri.startsWith('http')) {
      return NextResponse.redirect(logoUri);
    }

    if (logoUri.startsWith('/')) {
      const publicFilePath = path.join(process.cwd(), 'public', logoUri);
      if (fs.existsSync(publicFilePath)) {
        const fileBuffer = fs.readFileSync(publicFilePath);
        const ext = path.extname(logoUri).toLowerCase().replace('.', '') || 'png';
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
        return new Response(fileBuffer, {
          status: 200,
          headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
      }
      return NextResponse.redirect(new URL(logoUri, request.url));
    }

    let base64Data = logoUri;
    let mimeType = 'image/png';
    const match = logoUri.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    const buffer = Buffer.from(base64Data, 'base64');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return new Response(error?.message || 'Logo asset not found', { status: 404 });
  }
}
