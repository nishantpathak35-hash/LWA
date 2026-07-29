import { NextResponse } from 'next/server';
import { queryGet } from '../../../lib/db.js';
import * as api from '../../../lib/api.js';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || request.headers.get('x-lwa-token');
    
    if (!token) {
      return new NextResponse('Unauthorized: Missing Token', { status: 401 });
    }

    const session = await api.getMySession(token);
    if (!session) {
      return new NextResponse('Unauthorized: Invalid Token', { status: 401 });
    }

    const attachment = await queryGet(`SELECT file_name, file_type, file_data FROM attachments WHERE id = ?`, [id]);
    
    if (!attachment || !attachment.file_data) {
      return new NextResponse('Attachment Not Found', { status: 404 });
    }

    if (typeof attachment.file_data === 'string' && attachment.file_data.trim().startsWith('http')) {
      return NextResponse.redirect(attachment.file_data.trim());
    }

    const cleanBase64 = typeof attachment.file_data === 'string' 
      ? attachment.file_data.replace(/^data:[^;]+;base64,/, '') 
      : attachment.file_data;

    const buffer = Buffer.from(cleanBase64, 'base64');

    const headers = new Headers();
    headers.set('Content-Type', attachment.file_type || 'application/octet-stream');
    const safeFilename = encodeURIComponent(attachment.file_name || 'attachment');
    headers.set('Content-Disposition', `inline; filename="${attachment.file_name || 'attachment'}"; filename*=UTF-8''${safeFilename}`);
    headers.set('Cache-Control', 'public, max-age=86400');

    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Internal Server Error: ' + error.message, { status: 500 });
  }
}
