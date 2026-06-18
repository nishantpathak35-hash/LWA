import { NextResponse } from 'next/server';
import * as api from '../../lib/api.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { method, args = [] } = body;

    if (!method) {
      return NextResponse.json({ error: `Method missing` }, { status: 400 });
    }

    if (typeof api[method] !== 'function') {
      console.warn(`Unimplemented method requested: ${method}`);
      return NextResponse.json([]); // Return empty array to prevent .filter is not a function errors
    }

    // Resolve user session from Authorization header
    let session = null;
    try {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        session = await api.getMySession(token);
      }
    } catch (e) {
      console.warn('RPC session lookup failed:', e.message);
    }

    // Invoke the requested method with resolved session
    const result = await api[method](...args, session);
    return NextResponse.json(result);

  } catch (error) {
    console.error('RPC Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
