import 'dotenv/config';
import { queryRun } from './app/lib/db.js';

async function recover() {
  const idsToRecover = [25, 27, 28]; // The ones recently tested
  for (const id of idsToRecover) {
    console.log(`Reverting PR ${id} back to Pending Director...`);
    await queryRun(
      `UPDATE payment_requests SET stage = 'Pending Director', director_approval = 'Pending' WHERE pr_id = ?`,
      [id]
    );
  }
  console.log('Recovery complete.');
}

recover().catch(console.error);
