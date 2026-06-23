import dotenv from 'dotenv';
dotenv.config();
import { queryAll } from '../app/lib/db.js';

async function check() {
  console.log('Inspecting payment_requests table columns...');
  const cols = await queryAll('PRAGMA table_info(payment_requests)');
  console.log('payment_requests columns:', cols.map(c => `${c.name} (${c.type})`));

  console.log('Inspecting system_payments table columns...');
  const colsSys = await queryAll('PRAGMA table_info(system_payments)');
  console.log('system_payments columns:', colsSys.map(c => `${c.name} (${c.type})`));
}

check().catch(console.error);
