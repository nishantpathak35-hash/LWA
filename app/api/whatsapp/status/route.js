import { useDbAuthState } from '../../../lib/db-auth.js';
import makeWASocket from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

export async function GET(req) {
  try {
    const { state, saveCreds } = await useDbAuthState();

    if (state.creds && state.creds.me) {
      return new Response(JSON.stringify({ status: "authenticated", me: state.creds.me }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await new Promise(async (resolve) => {
      let resolved = false;

      const sock = makeWASocket.default({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
      });

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          sock.ev.removeAllListeners('connection.update');
          sock.ev.removeAllListeners('creds.update');
          resolve({ status: "timeout", message: "Connecting to WhatsApp is taking longer than expected. Please refresh." });
        }
      }, 7000);

      sock.ev.on('creds.update', async () => {
        await saveCreds();
      });

      sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;

        if (qr) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            try {
              const qrDataUri = await QRCode.toDataURL(qr);
              resolve({ status: "qr", qrCode: qrDataUri });
            } catch (err) {
              resolve({ status: "error", message: "Failed to generate QR code image." });
            }
          }
        }

        if (connection === 'open') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            resolve({ status: "authenticated", me: sock.user });
          }
        }
      });
    });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("WhatsApp status route error:", error);
    return new Response(JSON.stringify({ status: "error", message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
