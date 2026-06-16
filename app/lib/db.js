import { createClient } from '@libsql/client';

let tursoClient = null;

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("CRITICAL ERROR: Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. Vercel deployment requires these environment variables.");
} else {
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  console.log('Connected to Turso Cloud Database');
}

export async function queryAll(sql, params = []) {
  if (!tursoClient) throw new Error("Database not connected");
  const { rows } = await tursoClient.execute({ sql, args: params });
  return rows;
}

export async function queryGet(sql, params = []) {
  if (!tursoClient) throw new Error("Database not connected");
  const { rows } = await tursoClient.execute({ sql, args: params });
  return rows.length > 0 ? rows[0] : undefined;
}

export async function queryRun(sql, params = []) {
  if (!tursoClient) throw new Error("Database not connected");
  const result = await tursoClient.execute({ sql, args: params });
  return result;
}
