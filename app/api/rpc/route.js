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
      return NextResponse.json({}); // Return empty object for unimplemented methods
    }

    // Invoke the requested method
    const result = await api[method](...args);
    return NextResponse.json(result);

  } catch (error) {
    console.error('RPC Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
