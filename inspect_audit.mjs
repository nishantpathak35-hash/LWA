import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  try {
    const data = await tursoClient.execute("SELECT * FROM audit_logs WHERE record_id IN (17, 25, 27, 28) AND entity = 'payment_request' ORDER BY created_at DESC");
    console.log("Audit Logs:", data.rows);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
run().catch(console.error);
