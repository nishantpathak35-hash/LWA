#!/usr/bin/env node
require('dotenv').config();
const { makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

let isFirstRun = true;

async function main() {
  const { useDbAuthState } = await import('../app/lib/db-auth.js');
  const { queryRun } = await import('../app/lib/db.js');

  if (isFirstRun) {
    isFirstRun = false;
    console.log('Clearing old session from Turso to start fresh...');
    await queryRun('DELETE FROM whatsapp_session');
  }

  const { state, saveCreds } = await useDbAuthState();
  const { fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1017531287] }));
  console.log(`Using WhatsApp version: ${version.join('.')}`);

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
