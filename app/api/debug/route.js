import { NextResponse } from 'next/server';
import { queryAll } from '../../lib/db.js';

export async function GET(request) {
  try {
    const logs = await queryAll(`
      SELECT details, timestamp 
      FROM audit_logs 
      WHERE action_type = 'CORRECT_PO_PAYMENT_MANUAL'
      ORDER BY id DESC
      LIMIT 100
    `);
    return NextResponse.json(logs);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
