import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const prId = 12;
  try {
    const fields = ['remittance = ?', 'stage = ?', 'remarks = ?'];
    const values = ['Remitted', 'Remitted', 'test remarks', prId];
    await tursoClient.execute({
      sql: `UPDATE payment_requests SET ${fields.join(', ')} WHERE pr_id = ?`,
      args: values
    });
    console.log("updateRequest succeeded");
  } catch (e) {
    console.log("updateRequest FAILED", e.message);
  }
}
run().catch(console.error);
