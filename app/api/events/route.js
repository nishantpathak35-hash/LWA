import { NextResponse } from 'next/server';
import * as api from '../../lib/api.js';
import { fetchBroadcastEvents } from '../../lib/broadcast.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const since = Number(searchParams.get('since')) || 0;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 });
  }

  try {
    const session = await api.getMySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const events = await fetchBroadcastEvents(since);
    return NextResponse.json({ ok: true, events }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
