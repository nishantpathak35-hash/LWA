import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const prId = 12;
  const payload = { amount: 10, utrRef: 'TEST', paymentDate: '2026-06-26', paymentMode: 'Bank Transfer' };
  
  // createPayment query
  const sql1 = `INSERT INTO system_payments (po_no, pr_key, amount, remitted_by, created_at) VALUES (?, ?, ?, ?, ?)`;
  try {
    await tursoClient.execute({
      sql: sql1,
      args: ['LAIPL/PO/24-25/001', '12', 10, 'admin@luxeworx.com', '2026-06-26']
    });
    console.log("createPayment succeeded");
  } catch (e) {
    console.log("createPayment FAILED", e.message);
  }

}
run().catch(console.error);
