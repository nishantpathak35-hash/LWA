import 'dotenv/config';
import { loginUser } from '../app/lib/api.js';

async function main() {
  try {
    const res = await loginUser('admin@luxeworx.com', '123456');
    console.log('Login Success:', res);
  } catch (e) {
    console.error('Login Failed:', e);
  }
}

main().catch(console.error);
