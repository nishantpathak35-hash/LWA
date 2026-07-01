import { queryRun, queryAll } from './db.js';

export async function enqueueWhatsAppMessage(phone, message) {
  if (!phone || !message) return;
  try {
    await queryRun(
      `INSERT INTO whatsapp_outbox (phone, message, status) VALUES (?, ?, 'pending')`,
      [phone, message]
    );
  } catch (e) {
    console.error('Failed to enqueue WhatsApp message:', e.message);
  }
}

export async function notifyQueueUsers(role, message) {
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
          await enqueueWhatsAppMessage(user.whatsapp_number, message);
        }
      }
    }
  } catch (e) {
    console.error('Failed to notify queue users:', e.message);
  }
}
