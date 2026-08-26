require('dotenv').config({ path: './.env' });
const { createClient } = require('@libsql/client');
const c = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});

async function run() {
  try {
    const timestamp = new Date().toISOString();
    await c.execute({
      sql: 'UPDATE users SET last_login = ? WHERE email IN (?, ?, ?)',
      args: [timestamp, 'ashish@luxeworxatelier.com', 'ritesh@luxeworxatelier.com', 'sk@luxeworxatelier.com']
    });
    console.log('Updated last_login for Ashish, Ritesh, and Shraddha');
  } catch (e) {
    console.error(e);
  }
}
run();
