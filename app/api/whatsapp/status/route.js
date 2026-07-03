import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const idInstance = process.env.GREEN_API_ID_INSTANCE;
    const apiToken = process.env.GREEN_API_TOKEN_INSTANCE;
    const host = process.env.GREEN_API_URL || 'https://7107.api.greenapi.com';

    if (!idInstance || !apiToken) {
      return NextResponse.json({ status: 'offline', qr: null, error: 'Missing Green API credentials' });
    }

    // 1. Get State
    const stateRes = await fetch(`${host}/waInstance${idInstance}/getStateInstance/${apiToken}`, { cache: 'no-store' });
    if (!stateRes.ok) {
       console.error("Green API State Error:", stateRes.status, await stateRes.text());
       return NextResponse.json({ status: 'offline', qr: null, error: `Failed to fetch state: ${stateRes.status}` });
    }
    
    const stateData = await stateRes.json();
    const currentState = stateData?.stateInstance; // "authorized", "notAuthorized", etc.

    if (currentState === 'authorized' || currentState === 'starting') {
      return NextResponse.json({ status: currentState === 'starting' ? 'starting' : 'connected', qr: null });
    } else {
      // 2. Fetch QR code if not authorized
      const qrRes = await fetch(`${host}/waInstance${idInstance}/qr/${apiToken}`, { cache: 'no-store' });
      if (qrRes.ok) {
         const qrData = await qrRes.json();
         const base64Qr = qrData?.message;
         let qrUri = base64Qr;
         if (base64Qr && !base64Qr.startsWith('data:')) {
           qrUri = `data:image/png;base64,${base64Qr}`;
         }
         return NextResponse.json({ status: currentState || 'offline', qr: qrUri });
      }
      return NextResponse.json({ status: currentState || 'offline', qr: null });
    }
  } catch (error) {
    console.error('Failed to get Green API status:', error);
    return NextResponse.json({ error: error.message, status: 'offline' }, { status: 500 });
  }
}
