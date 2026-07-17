import { queryRun, queryAll } from './db.js';

export async function enqueueWhatsAppMessage(phone, message, mediaUrl = null) {
  if (!phone || !message) return;

  // Clean phone number
  let cleanPhone = String(phone).replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  let status = 'pending';

  try {
    const wahaUrl = process.env.WAHA_API_URL || 'http://localhost:3000';
    const apiKey = process.env.WAHA_API_KEY;
    const session = process.env.WAHA_SESSION || 'default';

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    let apiUrl = `${wahaUrl}/api/sendText`;
    let payload = {
      session: session,
      chatId: `${cleanPhone}@c.us`,
      text: message
    };

    if (mediaUrl) {
      apiUrl = `${wahaUrl}/api/sendFile`;
      let filename = 'attachment';
      try {
        const urlObj = new URL(mediaUrl);
        const pathname = urlObj.pathname;
        const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
        if (lastPart) {
          filename = decodeURIComponent(lastPart);
        }
      } catch (e) {}

      payload = {
        session: session,
        chatId: `${cleanPhone}@c.us`,
        file: {
          url: mediaUrl,
          filename: filename
        },
        caption: message
      };
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      status = 'sent';
    } else {
      status = 'failed';
      const errorText = await res.text();
      console.error("WAHA API error response:", errorText);
    }
  } catch (err) {
    console.error("WAHA fetch error:", err.message);
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
