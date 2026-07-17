import { queryRun, queryAll } from './db.js';
import { useDbAuthState } from './db-auth.js';
import { makeWASocket } from '@whiskeysockets/baileys';
import pino from 'pino';

export async function enqueueWhatsAppMessage(phone, message, mediaUrl = null) {
  if (!phone || !message) return;

  // Clean phone number
  let cleanPhone = String(phone).replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  let status = 'pending';

  try {
    const { state, saveCreds } = await useDbAuthState();

    if (!state.creds || !state.creds.me) {
      console.warn("WhatsApp is not authenticated. Please log in first.");
      status = 'failed';
    } else {
      const chatId = `${cleanPhone}@s.whatsapp.net`;

      await new Promise(async (resolve, reject) => {
        let completed = false;

        const sock = makeWASocket({
          auth: state,
          logger: pino({ level: 'silent' }),
          printQRInTerminal: false,
          connectTimeoutMs: 15000,
          browser: ['LWA ERP', 'Chrome', '10.0'],
        });

        const timer = setTimeout(() => {
          if (!completed) {
            completed = true;
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            try { sock.ws.close(); } catch (e) {}
            reject(new Error("Timeout waiting for WhatsApp connection to open."));
          }
        }, 8000);

        sock.ev.on('creds.update', async () => {
          await saveCreds();
        });

        sock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect } = update;

          if (connection === 'open') {
            try {
              if (mediaUrl) {
                let filename = 'document.pdf';
                try {
                  const urlObj = new URL(mediaUrl);
                  const pathname = urlObj.pathname;
                  const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
                  if (lastPart) {
                    filename = decodeURIComponent(lastPart);
                  }
                } catch (e) {}

                await sock.sendMessage(chatId, {
                  document: { url: mediaUrl },
                  fileName: filename,
                  caption: message
                });
              } else {
                await sock.sendMessage(chatId, { text: message });
              }

              status = 'sent';
              console.log(`WhatsApp message successfully sent serverlessly to ${cleanPhone}`);
            } catch (err) {
              status = 'failed';
              console.error("Failed to send WhatsApp message via Baileys socket:", err.message);
            } finally {
              if (!completed) {
                completed = true;
                clearTimeout(timer);
                sock.ev.removeAllListeners('connection.update');
                sock.ev.removeAllListeners('creds.update');
                try { sock.ws.close(); } catch (e) {}
                resolve();
              }
            }
          }

          if (connection === 'close') {
            if (!completed) {
              completed = true;
              clearTimeout(timer);
              sock.ev.removeAllListeners('connection.update');
              sock.ev.removeAllListeners('creds.update');
              resolve();
            }
          }
        });
      });
    }
  } catch (err) {
    console.error("Vercel Serverless Baileys send error:", err.message);
    status = 'failed';
  }

  // Log to database
  try {
    await queryRun(
      `INSERT INTO whatsapp_outbox (phone, message, media_url, status) VALUES (?, ?, ?, ?)`,
      [cleanPhone, message, mediaUrl, status]
    );
  } catch (e) {
    console.error('Failed to log WhatsApp message to outbox:', e.message);
  }
}

export async function notifyQueueUsers(role, message, mediaUrl = null) {
  try {
    const users = await queryAll(`SELECT whatsapp_number, roles FROM users WHERE is_active = 1`);
    for (const user of users) {
      if (user.whatsapp_number) {
        let hasRole = false;
        try {
          const userRoles = JSON.parse(user.roles || '[]');
          hasRole = userRoles.includes(role) || userRoles.includes('Super Admin');
        } catch (e) {}
        
        if (hasRole) {
          await enqueueWhatsAppMessage(user.whatsapp_number, message, mediaUrl);
        }
      }
    }
  } catch (e) {
    console.error('Failed to notify queue users:', e.message);
  }
}
