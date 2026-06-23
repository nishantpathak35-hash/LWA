import 'dotenv/config';
import { queryAll } from '../app/lib/db.js';

async function test() {
  try {
    const res = await queryAll('SELECT * FROM system_payments');
    console.log('Success', res.length);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
