import 'dotenv/config';
import * as api from '../app/lib/api.js';

async function testBoot() {
  try {
    const session = { email: 'admin@luxeworx.com' };
    const res = await api.getBootBundle(session);
    console.log('Boot successful', Object.keys(res));
  } catch (e) {
    console.error('Boot error:', e);
  }
}
testBoot();
