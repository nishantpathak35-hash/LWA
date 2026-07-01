const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
require('dotenv').config({ path: './.env' });
const { createClient } = require('@libsql/client');

const db = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});

/**
 * WhatsApp Bot Initialization
 * NOTE: Use a dedicated personal/secondary number for this bot. Do NOT use the main business number.
 * Run this script using `node backend/whatsapp-bot.js` separately.
 */

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        executablePath: fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') 
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
            : fs.existsSync('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe')
                ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
                : undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

async function setSetting(key, value) {
    try {
        await db.execute({
            sql: `INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`,
            args: [key, value, value]
        });
    } catch(e) { console.error('DB Error:', e.message); }
}

client.on('qr', async (qr) => {
    // Generate and scan this code with your phone
    console.log('Scan this QR code with your secondary WhatsApp number:');
    qrcode.generate(qr, { small: true });
    await setSetting('whatsapp_qr', qr);
    await setSetting('whatsapp_status', 'pending');
});

client.on('ready', async () => {
    console.log('WhatsApp Bot is ready!');
    isReady = true;
    await setSetting('whatsapp_qr', '');
    await setSetting('whatsapp_status', 'ready');
});

client.on('authenticated', () => {
    console.log('WhatsApp Bot authenticated successfully.');
});

client.on('auth_failure', async msg => {
    console.error('WhatsApp Bot authentication failure:', msg);
    await setSetting('whatsapp_status', 'failed');
});

client.initialize();

/**
 * Sends a WhatsApp message to a given phone number.
 * @param {string} phoneNumber - The phone number to send the message to (include country code without + or 00).
 * @param {string} message - The message content.
 */
async function sendWhatsAppMessage(phoneNumber, message) {
    if (!isReady) {
        console.warn('WhatsApp Bot is not ready yet. Message not sent:', message);
        return;
    }

    try {
        // WhatsApp IDs are typically in the format: [country code][number]@c.us
        const chatId = `${phoneNumber.replace(/\D/g, '')}@c.us`;
        await client.sendMessage(chatId, message);
        console.log(`WhatsApp message sent to ${phoneNumber}`);
    } catch (error) {
        // WhatsApp send failures must NEVER block or fail the actual approval/payment flow, only log the error.
        console.error(`Failed to send WhatsApp message to ${phoneNumber}:`, error.message);
    }
}

// Outbox Poller
setInterval(async () => {
    if (!isReady) return;
    try {
        const res = await db.execute(`SELECT * FROM whatsapp_outbox WHERE status = 'pending' LIMIT 5`);
        if (res.rows && res.rows.length > 0) {
            for (const row of res.rows) {
                console.log(`Processing outbox ID ${row.id} for ${row.phone}`);
                await sendWhatsAppMessage(row.phone, row.message);
                await db.execute({
                    sql: `UPDATE whatsapp_outbox SET status = 'sent' WHERE id = ?`,
                    args: [row.id]
                });
            }
        }
    } catch (e) {
        console.error('Outbox poll error:', e.message);
    }
}, 5000);

module.exports = {
    sendWhatsAppMessage,
    client
};
