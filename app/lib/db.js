import sqlite3 from 'sqlite3';
import path from 'path';
import { createClient } from '@libsql/client';

let localDb = null;
let tursoClient = null;

// Initialize Turso client if env vars are present
if (process.env.TURSO_DATABASE_URL) {
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  console.log('Using Turso Cloud Database');
}

export function getDb() {
  if (tursoClient) return tursoClient;
  
  if (!localDb) {
    const dbPath = path.join(process.cwd(), 'backend', 'database.sqlite');
    localDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to local SQLite database.');
      }
    });
  }
  return localDb;
}

// Promisified DB query helpers
export async function queryAll(sql, params = []) {
  if (tursoClient) {
    const { rows } = await tursoClient.execute({ sql, args: params });
    return rows;
  }

  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function queryGet(sql, params = []) {
  if (tursoClient) {
    const { rows } = await tursoClient.execute({ sql, args: params });
    return rows.length > 0 ? rows[0] : undefined;
  }

  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function queryRun(sql, params = []) {
  if (tursoClient) {
    const result = await tursoClient.execute({ sql, args: params });
    return result; // return libsql ResultSet
  }

  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
