#!/usr/bin/env node
/**
 * WhatsApp Queue Processor
 * Runs on GitHub Actions every 5 minutes.
 * Reads pending messages from Turso, sends via Baileys, marks as sent.
 */

require('dotenv').config();
const { createClient } = require('@libsql/client');
const { makeWASocket, DisconnectReason, BufferJSON } = require('@whiskeysockets/baileys');
const pino = require('pino');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

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
  const serialized = JSON.stringify(value, BufferJSON.replacer);
  await db.execute({
    sql: 'INSERT INTO whatsapp_session (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    args: [key, serialized, serialized]
  });
}

async function getPendingMessages() {
  const result = await db.execute('SELECT * FROM whatsapp_outbox WHERE status = ? ORDER BY created_at ASC LIMIT 20', ['pending']);
  return result.rows;
}

async function markMessage(id, status) {
  await db.execute({ sql: 'UPDATE whatsapp_outbox SET status = ? WHERE id = ?', args: [status, id] });
}

async function main() {
  const { proto, initAuthCreds } = require('@whiskeysockets/baileys');

  // Load creds from Turso
  let creds = await readData('creds');
  if (!creds) {
    console.log('❌ No WhatsApp session found in Turso. Please run: node scripts/whatsapp-login.js');
    process.exit(1);
  }

  const pending = await getPendingMessages();
  if (pending.length === 0) {
    console.log('✅ No pending messages. Done.');
    process.exit(0);
  }

  console.log(`📤 Processing ${pending.length} pending WhatsApp message(s)...`);

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

  await new Promise((resolve, reject) => {
    let connected = false;
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for WhatsApp connection')), 30000);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['LWA ERP', 'Chrome', '10.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        console.log('❌ Session expired. Please run: node scripts/whatsapp-login.js');
        clearTimeout(timeout);
        // Mark all pending as failed so they can be retried
        reject(new Error('QR required — session expired'));
      }

      if (connection === 'open' && !connected) {
        connected = true;
        console.log('✅ WhatsApp connected. Sending messages...');
        clearTimeout(timeout);

        for (const msg of pending) {
          try {
            const chatId = `${msg.phone}@s.whatsapp.net`;

            if (msg.media_url) {
              let filename = 'document.pdf';
              try {
                const urlObj = new URL(msg.media_url);
                const lastPart = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1);
                if (lastPart) filename = decodeURIComponent(lastPart);
              } catch { }

              await sock.sendMessage(chatId, {
                document: { url: msg.media_url },
                fileName: filename,
                caption: msg.message
              });
            } else {
              await sock.sendMessage(chatId, { text: msg.message });
            }

            await markMessage(msg.id, 'sent');
            console.log(`  ✅ Sent to ${msg.phone}`);
          } catch (err) {
            await markMessage(msg.id, 'failed');
            console.error(`  ❌ Failed to send to ${msg.phone}:`, err.message);
          }
        }

        try { sock.ws.close(); } catch { }
        resolve();
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (!connected) {
          clearTimeout(timeout);
          reject(new Error(`Connection closed. Code: ${code}`));
        }
      }
    });
  });

  console.log('✅ Queue processing complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Queue processor error:', err.message);
  process.exit(1);
});
