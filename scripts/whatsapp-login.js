#!/usr/bin/env node
/**
 * One-time WhatsApp Login Script
 * Run this ONCE on your local machine: node scripts/whatsapp-login.js
 * It will show a QR code in the terminal. Scan it with your phone.
 * The session is saved to Turso and reused by GitHub Actions automatically.
 */

require('dotenv').config();
const { createClient } = require('@libsql/client');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, BufferJSON } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Ensure whatsapp_session table exists
async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS whatsapp_session (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

async function readData(key) {
  try {
    const result = await db.execute({ sql: 'SELECT value FROM whatsapp_session WHERE key = ?', args: [key] });
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value, BufferJSON.reviver);
    }
  } catch { }
  return null;
}

async function writeData(key, value) {
  try {
    const serialized = JSON.stringify(value, BufferJSON.replacer);
    await db.execute({
      sql: 'INSERT INTO whatsapp_session (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
      args: [key, serialized, serialized]
    });
  } catch (err) {
    console.error(`Database write failed for key "${key}":`, err.message);
  }
}

let isFirstRun = true;

async function main() {
  await ensureTable();

  if (isFirstRun) {
    isFirstRun = false;
    console.log('Clearing old session from Turso to start fresh...');
    await db.execute('DELETE FROM whatsapp_session');
  }

  let creds = await readData('creds');
  const { proto, initAuthCreds, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1017531287] }));
  console.log(`Using WhatsApp version: ${version.join('.')}`);
  if (!creds) creds = initAuthCreds();

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        const data = {};
        for (const id of ids) {
          let value = await readData(`${type}-${id}`);
          if (value) {
            if (type === 'app-state-sync-key') value = proto.Message.AppStateSyncKeyData.fromObject(value);
            data[id] = value;
          }
        }
        return data;
      },
      set: async (data) => {
        for (const type in data) {
          for (const id in data[type]) {
            const value = data[type][id];
            if (value) await writeData(`${type}-${id}`, value);
          }
        }
      }
    }
  };

  const saveCreds = () => writeData('creds', state.creds);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['LWA ERP', 'Chrome', '10.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log('\n============================================');
      console.log('SCAN THIS QR CODE WITH YOUR WHATSAPP:');
      console.log('(WhatsApp → Settings → Linked Devices → Link a Device)');
      console.log('============================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('\n✅ WhatsApp connected successfully!');
      console.log('Finalizing database write...');
      await saveCreds();
      console.log('Session saved to Turso. GitHub Actions will now use this session automatically.');
      console.log('You can close this terminal now.');
      setTimeout(() => process.exit(0), 3000);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const err = lastDisconnect?.error;
      console.error('Connection closed details:', err);
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('creds.update');
      if (code !== DisconnectReason.loggedOut) {
        console.log('Connection closed. Retrying in 3 seconds...');
        setTimeout(main, 3000);
      } else {
        console.log('Logged out. Please run this script again.');
        process.exit(1);
      }
    }
  });
}

main().catch(console.error);
