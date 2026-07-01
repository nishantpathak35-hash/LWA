import { NextResponse } from 'next/server';
import { queryGet } from '../../../lib/db';

export async function GET() {
  try {
    const qrRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'whatsapp_qr'`);
    const statusRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'whatsapp_status'`);

    return NextResponse.json({
      qr: qrRow?.value || null,
      status: statusRow?.value || 'offline'
    });
  } catch (error) {
    console.error('Failed to get whatsapp status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
