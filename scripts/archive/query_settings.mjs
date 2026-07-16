import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const result = await tursoClient.execute(`SELECT * FROM app_settings`);
  console.log("App Settings:");
  console.log(result.rows);
}

run().catch(console.error);
