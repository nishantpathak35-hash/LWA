import { NextResponse } from 'next/server';
import { getMySession } from '../../lib/api.js';
import { fetchBroadcastEvents } from '../../lib/broadcast.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = request.headers.get('x-lwa-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  let lastEventId = Number(searchParams.get('since')) || 0;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 });
  }

  try {
    const session = await getMySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const events = await fetchBroadcastEvents(lastEventId);
    return NextResponse.json({ events: events || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
