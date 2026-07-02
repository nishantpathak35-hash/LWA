require('dotenv').config({ path: './.env' });
const { createClient } = require('@libsql/client');
const c = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});

async function run() {
  try {
    console.log('Adding new columns to users table...');
    await c.execute(`ALTER TABLE users ADD COLUMN mobile_number TEXT;`).catch(() => console.log('mobile_number already exists'));
    await c.execute(`ALTER TABLE users ADD COLUMN whatsapp_number TEXT;`).catch(() => console.log('whatsapp_number already exists'));
    await c.execute(`ALTER TABLE users ADD COLUMN department TEXT;`).catch(() => console.log('department already exists'));
    await c.execute(`ALTER TABLE users ADD COLUMN employee_id TEXT;`).catch(() => console.log('employee_id already exists'));
    
    console.log('Schema update complete.');
  } catch (e) {
    console.error(e);
  }
}
run();
