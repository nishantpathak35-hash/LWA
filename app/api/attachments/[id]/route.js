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

    const attachment = await queryGet(`SELECT entity_type, entity_id, file_name, file_type, file_data FROM attachments WHERE id = ? OR entity_id = ? ORDER BY id DESC LIMIT 1`, [id, id]);
    
    if (!attachment || !attachment.file_data) {
      return new NextResponse('Attachment Not Found', { status: 404 });
    }

    // Vendor access control: verify entity ownership if requested by vendor
    if (session.user_type === 'vendor') {
      if (attachment.entity_type === 'invoice') {
        const inv = await queryGet(`SELECT vendor_code FROM invoices WHERE invoice_id = ?`, [attachment.entity_id]);
        if (!inv || String(inv.vendor_code).trim().toLowerCase() !== String(session.vendor_code).trim().toLowerCase()) {
          return new NextResponse('Forbidden: Access Denied', { status: 403 });
        }
      } else if (attachment.entity_type === 'po' || attachment.entity_type === 'purchase_order') {
        const po = await queryGet(`SELECT vendor_code, vendor_key FROM purchase_orders WHERE po_no = ?`, [attachment.entity_id]);
        const vCode = String(po?.vendor_code || po?.vendor_key || '').trim().toLowerCase();
        if (!po || vCode !== String(session.vendor_code).trim().toLowerCase()) {
          return new NextResponse('Forbidden: Access Denied', { status: 403 });
        }
      }
    }

    // Check if caller requested download disposition
    const disposition = searchParams.get('disposition') === 'attachment' ? 'attachment' : 'inline';

    if (typeof attachment.file_data === 'string' && attachment.file_data.trim().startsWith('http')) {
      // Proxy-fetch from remote URL (e.g. Cloudinary) to avoid CORS / X-Frame-Options issues
      try {
        const remoteUrl = attachment.file_data.trim();
        const remoteRes = await fetch(remoteUrl);
        if (!remoteRes.ok) {
          return new NextResponse('Failed to fetch remote file', { status: 502 });
        }
        const remoteBuffer = Buffer.from(await remoteRes.arrayBuffer());
        const contentType = remoteRes.headers.get('content-type') || attachment.file_type || 'application/octet-stream';
        const safeFilename = encodeURIComponent(attachment.file_name || 'attachment');

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', `${disposition}; filename="${attachment.file_name || 'attachment'}"; filename*=UTF-8''${safeFilename}`);
        headers.set('Cache-Control', 'public, max-age=86400');
        headers.set('Content-Length', String(remoteBuffer.length));

        return new NextResponse(remoteBuffer, { status: 200, headers });
      } catch (fetchErr) {
        console.error('Remote file fetch error:', fetchErr);
        // Fallback: redirect if proxy fails
        return NextResponse.redirect(attachment.file_data.trim());
      }
    }

    const cleanBase64 = typeof attachment.file_data === 'string' 
      ? attachment.file_data.replace(/^data:[^;]+;base64,/, '') 
      : attachment.file_data;

    const buffer = Buffer.from(cleanBase64, 'base64');

    const headers = new Headers();
    headers.set('Content-Type', attachment.file_type || 'application/octet-stream');
    const safeFilename = encodeURIComponent(attachment.file_name || 'attachment');
    headers.set('Content-Disposition', `${disposition}; filename="${attachment.file_name || 'attachment'}"; filename*=UTF-8''${safeFilename}`);
    headers.set('Cache-Control', 'public, max-age=86400');
    headers.set('Content-Length', String(buffer.length));

    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Internal Server Error: ' + error.message, { status: 500 });
  }
}
