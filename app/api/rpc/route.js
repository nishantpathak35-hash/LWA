import { NextResponse } from 'next/server';
import * as api from '../../lib/api.js';
import { dispatchRpc } from '../../lib/rpc-dispatch.js';

export async function POST(request) {
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 6 * 1024 * 1024) {
      return NextResponse.json({ error: 'Request exceeds the upload limit' }, { status: 413 });
    }
    let body;
    try { body = JSON.parse(raw); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    const result = await dispatchRpc(api, body, request);
    const payload = JSON.parse(JSON.stringify(result ?? { success: true }, (_, value) =>
      typeof value === 'bigint' ? (value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : value.toString()) : value));
    const response = NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
    if (body.method === 'loginUser' && result?.token) {
      response.cookies.set('lx_auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 7,
      });
    } else if (body.method === 'logoutUser') {
      response.cookies.delete('lx_auth_token');
    }
    return response;
  } catch (error) {
    const message = error.message || 'Request failed';
    const status = error.status || (/AUTH:.*(Unauthenticated|Not signed in|expired|No token)/i.test(message) ? 401
      : /AUTH:/i.test(message) ? 403 : /CONFLICT:/.test(message) ? 409 : 400);
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const maxDuration = 60;
