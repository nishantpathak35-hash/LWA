import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const idsToRevert = [16, 17, 18, 19, 20];
  
  for (const id of idsToRevert) {
    await tursoClient.execute({
      sql: `UPDATE payment_requests 
            SET stage = 'Pending Director', 
                director_approval = 'Pending' 
            WHERE pr_id = ?`,
      args: [id]
    });
    console.log(`Reverted payment request ${id} to Pending Director`);
    
    // Also delete the audit log for the "Approve Payment" action by Admin for this PR
    await tursoClient.execute({
      sql: `DELETE FROM audit_logs WHERE action_type = 'Approve Payment' AND details LIKE ?`,
      args: [`%Approved payment ID ${id}%`]
    });
  }
}

run().catch(console.error);
