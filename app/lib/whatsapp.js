import { queryRun, queryAll } from './db.js';

export async function enqueueWhatsAppMessage(phone, message, mediaUrl = null) {
  if (!phone || !message) return;

  // Clean phone number
  let cleanPhone = String(phone).replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  let status = 'pending';

  try {
    const tunnelUrl = process.env.LOCAL_BOT_TUNNEL_URL;
    const apiKey = process.env.LOCAL_BOT_API_KEY || 'lwa-secure-waha-api-key-2026-xyz';

    if (!tunnelUrl) {
      console.warn("LOCAL_BOT_TUNNEL_URL is missing. Message logged as pending.");
      status = 'failed';
    } else {
      const apiUrl = `${tunnelUrl}/send-message`;
      const payload = {
        to: cleanPhone,
        message: message,
        mediaUrl: mediaUrl
      };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        status = 'sent';
      } else {
        status = 'failed';
        const errorText = await res.text();
        console.error("Local Bot API error response:", errorText);
      }
    }
  } catch (err) {
    console.error("Local Bot fetch error:", err.message);
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
