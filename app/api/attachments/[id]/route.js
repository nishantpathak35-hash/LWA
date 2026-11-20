import { attachmentAccess, attachmentDeliveryUrl } from '../../../lib/api/attachments.js';
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
    const token = request.headers.get('x-lwa-token') || request.cookies?.get('lx_auth_token')?.value;
    
    if (!token) {
      return new NextResponse('Unauthorized: Missing Token', { status: 401 });
    }

    let session = null;
    try {
      session = await api.getMySession(token);
    } catch (e) {
      try {
        session = await api.getVendorPortalSession(token);
      } catch (vErr) {
        return new NextResponse('Unauthorized: Invalid Token', { status: 401 });
      }
    }

    if (!session) {
      return new NextResponse('Unauthorized: Invalid Token', { status: 401 });
    }

    const invoiceLookup = searchParams.get('entityType') === 'invoice';
    const attachment = await queryGet(
      `SELECT entity_type, entity_id, file_name, file_type, file_data FROM attachments
       WHERE ${invoiceLookup ? "entity_type = 'invoice' AND entity_id = ?" : 'id = ?'} ORDER BY id DESC LIMIT 1`, [id]
    );
    
    if (!attachment || !attachment.file_data) {
      return new NextResponse('Attachment Not Found', { status: 404 });
    }

    if (!await attachmentAccess(session, attachment.entity_type, attachment.entity_id)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if caller requested download disposition
    const disposition = searchParams.get('disposition') === 'attachment' ? 'attachment' : 'inline';

    if (typeof attachment.file_data === 'string' && attachment.file_data.trim().startsWith('http')) {
      try {
        const downloadUrl = attachmentDeliveryUrl(attachment.file_data.trim());
        const remoteRes = await fetch(downloadUrl, { redirect: 'error' });
        if (!remoteRes.ok) {
          console.warn(`Remote fetch returned status ${remoteRes.status}`);
          return new NextResponse(`Failed to fetch remote file: ${remoteRes.statusText}`, { status: remoteRes.status });
        }
        const remoteBuffer = Buffer.from(await remoteRes.arrayBuffer());
        const contentType = attachment.file_type || remoteRes.headers.get('content-type') || 'application/pdf';
        const safeFilename = encodeURIComponent(attachment.file_name || 'attachment.pdf');

        const headers = new Headers();
        headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Content-Security-Policy', "sandbox; default-src 'none'");
    headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', `${disposition}; filename*=UTF-8''${safeFilename}`);
        headers.set('Cache-Control', 'private, no-store');
        headers.set('Content-Length', String(remoteBuffer.length));

        return new NextResponse(remoteBuffer, { status: 200, headers });
      } catch (fetchErr) {
        console.error('Remote file fetch error:', fetchErr);
        return new NextResponse('Remote file fetch error', { status: 502 });
      }
    }

    const cleanBase64 = typeof attachment.file_data === 'string' 
      ? attachment.file_data.replace(/^data:[^;]+;base64,/, '') 
      : attachment.file_data;

    const buffer = Buffer.from(cleanBase64, 'base64');

    const headers = new Headers();
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Content-Security-Policy', "sandbox; default-src 'none'");
    headers.set('Content-Type', attachment.file_type || 'application/octet-stream');
    const safeFilename = encodeURIComponent(attachment.file_name || 'attachment');
    headers.set('Content-Disposition', `${disposition}; filename*=UTF-8''${safeFilename}`);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Content-Length', String(buffer.length));

    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
