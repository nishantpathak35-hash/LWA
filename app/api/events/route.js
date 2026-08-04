import { NextResponse } from 'next/server';
import { getMySession } from '../../lib/api.js';
import { fetchBroadcastEvents } from '../../lib/broadcast.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isAlive = true;

      const sendEvent = (data, id) => {
        if (!isAlive) return;
        try {
          const payload = id
            ? `id: ${id}\ndata: ${JSON.stringify(data)}\n\n`
            : `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          isAlive = false;
        }
      };

      const sendComment = (comment) => {
        if (!isAlive) return;
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch (e) {
          isAlive = false;
        }
      };

      // Initial connection ping
      sendComment('connected');

      // Poll broadcast_events table every 1.5 seconds for new events
      const interval = setInterval(async () => {
        if (!isAlive) {
          clearInterval(interval);
          return;
        }
        try {
          const events = await fetchBroadcastEvents(lastEventId);
          if (events && events.length > 0) {
            for (const evt of events) {
              if (evt.id > lastEventId) {
                lastEventId = evt.id;
              }
              sendEvent(evt, evt.id);
            }
          } else {
            // Heartbeat comment to keep SSE connection alive
            sendComment('keep-alive');
          }
        } catch (err) {
          console.error('SSE Broadcast fetch error:', err.message);
        }
      }, 1500);

      request.signal.addEventListener('abort', () => {
        isAlive = false;
        clearInterval(interval);
        try {
          controller.close();
        } catch (e) {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
