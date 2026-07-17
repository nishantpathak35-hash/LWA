import { queryRun, queryAll } from './db.js';

/**
 * Queues a WhatsApp message in the Turso database.
 * The actual sending is handled by GitHub Actions (scripts/process-whatsapp-queue.js)
 * which runs every 5 minutes on GitHub's free runners.
 */
export async function enqueueWhatsAppMessage(phone, message, mediaUrl = null) {
  if (!phone || !message) return;

  // Clean phone number
  let cleanPhone = String(phone).replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  try {
    await queryRun(
      `INSERT INTO whatsapp_outbox (phone, message, media_url, status) VALUES (?, ?, ?, ?)`,
      [cleanPhone, message, mediaUrl, 'pending']
    );
    console.log(`WhatsApp message queued for ${cleanPhone}`);
  } catch (e) {
    console.error('Failed to queue WhatsApp message:', e.message);
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
