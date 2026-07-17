import { queryRun, queryAll } from './db.js';

export async function enqueueWhatsAppMessage(phone, message, mediaUrl = null) {
  if (!phone || !message) return;

  // Clean phone number (Meta Cloud API expects country code and digits only, e.g. "919876543210")
  let cleanPhone = String(phone).replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  let status = 'pending';

  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.warn("WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN is missing. Message logged as pending.");
      status = 'failed';
    } else {
      const apiUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
      
      let payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
      };

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

        payload.type = "document";
        payload.document = {
          link: mediaUrl,
          filename: filename,
          caption: message
        };
      } else {
        payload.type = "text";
        payload.text = {
          body: message
        };
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        status = 'sent';
      } else {
        status = 'failed';
        const errorText = await res.text();
        console.error("Meta WhatsApp Cloud API error response:", errorText);
      }
    }
  } catch (err) {
    console.error("Meta WhatsApp Cloud API fetch error:", err.message);
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
