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

    // Resolve user session from custom header (to avoid Vercel SSO Authorization override)
    let session = null;
    try {
      const headersObj = {};
      request.headers.forEach((val, key) => {
        headersObj[key] = val;
      });
      console.log('RPC Request Headers:', JSON.stringify(headersObj));

      let token = request.headers.get('x-lwa-token') || request.headers.get('X-LWA-Token');
      
      // Fallback to Bearer token if present and not overwritten by Vercel SSO JWT
      if (!token) {
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const possibleToken = authHeader.substring(7);
          if (!possibleToken.startsWith('eyJ')) {
            token = possibleToken;
          }
        }
      }

      if (token) {
        session = await api.getMySession(token);
      }
    } catch (e) {
      console.error('RPC session lookup failed. Token resolution error:', e);
    }

    // Invoke the requested method with resolved session
    const result = await api[method](...args, session);
    return NextResponse.json(result);

  } catch (error) {
    console.error('RPC Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
