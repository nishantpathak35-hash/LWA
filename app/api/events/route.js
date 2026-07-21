// SSE endpoint for real-time change notifications.
// Polls the broadcast_events Turso table every 2s and streams events to clients.
// This approach works on Vercel serverless where in-memory pub/sub across isolates is not possible.
import { NextResponse } from 'next/server';
import * as api from '../../lib/api.js';
import { fetchBroadcastEvents } from '../../lib/broadcast.js';

// Vercel max function duration — clients auto-reconnect after this
export const maxDuration = 300;

export async function GET(request) {
  // Authenticate via query param
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 });
  }

  let session;
  try {
    session = await api.getMySession(token);
    if (!session) throw new Error('Invalid session');
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  // Set up SSE stream
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let cursor = 0;
      let keepaliveCounter = 0;

      // Initialize cursor to latest event id so we don't replay history
      try {
        const initial = await fetchBroadcastEvents(0);
        if (initial.length > 0) {
          cursor = initial[initial.length - 1].id;
        }
      } catch (_) {
        // Start from 0 if we can't read
      }

      const poll = async () => {
        if (closed) return;

        try {
          const events = await fetchBroadcastEvents(cursor);

          for (const evt of events) {
            if (closed) return;
            const data = JSON.stringify({
              entity: evt.entity,
              action: evt.action,
              id: evt.entity_id
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            cursor = evt.id;
          }

          // Send keepalive every ~15s (7-8 poll cycles at 2s each)
          keepaliveCounter++;
          if (keepaliveCounter >= 7) {
            keepaliveCounter = 0;
            if (!closed) {
              controller.enqueue(encoder.encode(`:keepalive\n\n`));
            }
          }
        } catch (err) {
          if (!closed) {
            console.error('SSE poll error:', err.message);
          }
        }

        // Schedule next poll
        if (!closed) {
          setTimeout(poll, 4000); // P2-1: Increased from 2s to 4s to reduce DB load
        }
      };

      // Start polling
      poll();
    },
    cancel() {
      closed = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
