import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const result = await tursoClient.execute(`SELECT * FROM audit_logs WHERE action_type = 'Approve Payment' ORDER BY id DESC LIMIT 10`);
  console.log(JSON.stringify(result.rows, null, 2));
}

run().catch(console.error);
