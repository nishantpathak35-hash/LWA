import 'dotenv/config';
import { inviteUserAdmin } from '../app/lib/api.js';

async function test() {
  try {
    const payload = { email: 'newuser@luxeworx.com', name: 'New User', roles: ['User'] };
    const session = { email: 'admin@luxeworx.com', roles: ['admin'] };
    const r = await inviteUserAdmin(payload, session);
    console.log(r);
  } catch (e) {
    console.error(e);
  }
}
test();
