import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import { bulkRemitPayments } from './app/lib/api/payments/other.js';
import { getSession } from './app/lib/session.js';

async function run() {
  const result = await bulkRemitPayments([12], { utr_ref: 'TEST1234', remarks: 'test' }, { email: 'admin@luxeworx.com' });
  console.log("Result:", result);
}
run().catch(console.error);
