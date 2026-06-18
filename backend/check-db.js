import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  try {
    const { rows } = await client.execute('SELECT COUNT(*) as c FROM system_payments');
    console.log('system_payments count:', rows[0].c);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
check();
