import { useDbAuthState } from '../../../lib/db-auth.js';
import { makeWASocket, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

// Force Vercel max execution time
export const maxDuration = 30;

export async function GET(req) {
  try {
    const { state, saveCreds } = await useDbAuthState();

    // If already authenticated, return immediately
    if (state.creds && state.creds.me) {
      return Response.json({ status: "authenticated", me: state.creds.me });
    }

    const result = await new Promise((resolve) => {
      let resolved = false;
      let sock;

      const cleanup = (msg, data) => {
        if (resolved) return;
        resolved = true;
        try { sock?.ws?.close(); } catch (_) {}
        clearTimeout(timer);
        resolve({ ...data });
      };

      const timer = setTimeout(() => {
        cleanup('timeout', { status: "timeout", message: "WhatsApp is taking too long. Please try refreshing the page." });
      }, 20000);

      try {
        sock = makeWASocket({
          auth: state,
          logger: pino({ level: 'silent' }),
          printQRInTerminal: false,
          connectTimeoutMs: 15000,
          browser: ['LWA ERP', 'Chrome', '10.0'],
        });

        sock.ev.on('creds.update', () => saveCreds());

        sock.ev.on('connection.update', async (update) => {
          const { connection, qr, lastDisconnect } = update;

          if (qr) {
            try {
              const qrDataUri = await QRCode.toDataURL(qr);
              cleanup('qr', { status: "qr", qrCode: qrDataUri });
            } catch {
              cleanup('qr_error', { status: "error", message: "Failed to generate QR image." });
            }
          }

          if (connection === 'open') {
            cleanup('open', { status: "authenticated", me: sock.user });
          }

          if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            cleanup('close', { status: "error", message: `Connection closed. Code: ${reason}` });
          }
        });
      } catch (err) {
        cleanup('init_error', { status: "error", message: err.message });
      }
    });

    return Response.json(result);

  } catch (error) {
    console.error("WhatsApp status route error:", error);
    return Response.json({ status: "error", message: error.message }, { status: 500 });
  }
}
