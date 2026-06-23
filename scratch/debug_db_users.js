import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const result = await client.execute('SELECT email, active, password_hash, invite_token, roles FROM users');
  console.log('Users in DB:');
  console.log(JSON.stringify(result.rows, null, 2));
}

main().catch(console.error);
