import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const result = await tursoClient.execute(`SELECT pr_id, po_no, stage, remittance FROM payment_requests`);
  console.table(result.rows);
}

run().catch(console.error);
