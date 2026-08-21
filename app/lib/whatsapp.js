import { queryRun, queryAll } from './db.js';

export async function enqueueWhatsAppMessage(phone, message, mediaUrl = null) {
  if (!phone || !message) return;

  // Clean phone number
  let cleanPhone = String(phone).replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  let status = 'pending';

  try {
    const idInstance = process.env.GREEN_API_ID_INSTANCE;
    const apiToken = process.env.GREEN_API_TOKEN_INSTANCE;
    
    // Fallback to cluster 7107 if API_URL not provided
    const host = process.env.GREEN_API_URL || 'https://7107.api.greenapi.com';

    if (idInstance && apiToken) {
      // Fire API request instantly to Green-API
      const apiUrl = `${host}/waInstance${idInstance}/sendMessage/${apiToken}`;
      const payload = {
        chatId: `${cleanPhone}@c.us`,
        message: message
      };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        status = 'sent';
      } else {
        status = 'failed';
        const errorText = await res.text();
        console.error("Green-API error response:", errorText);
      }
    } else {
      console.warn("GREEN_API_ID_INSTANCE or GREEN_API_TOKEN_INSTANCE is missing. Message logged as pending.");
    }
  } catch (err) {
    console.error("Green-API fetch error:", err.message);
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
