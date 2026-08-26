import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  try {
    const tableInfo = await tursoClient.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables:", tableInfo.rows);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
run().catch(console.error);
