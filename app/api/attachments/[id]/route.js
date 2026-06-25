import { NextResponse } from 'next/server';
import { queryGet } from '../../../lib/db.js';
import * as api from '../../../lib/api.js';

export async function GET(request, { params }) {
  try {
    const { id } = params;
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
    
    if (!attachment) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const buffer = Buffer.from(attachment.file_data, 'base64');

    const headers = new Headers();
    headers.set('Content-Type', attachment.file_type);
    headers.set('Content-Disposition', `inline; filename="${attachment.file_name}"`);
    headers.set('Cache-Control', 'public, max-age=86400');

    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
