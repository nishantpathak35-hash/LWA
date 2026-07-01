require('dotenv').config({ path: './.env' });
const { createClient } = require('@libsql/client');
const c = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});

async function run() {
  try {
    await c.execute(`ALTER TABLE users ADD COLUMN whatsapp_number TEXT;`);
    console.log('Added whatsapp_number to users table');
  } catch(e) {
    console.log(e.message);
  }
}
run();
