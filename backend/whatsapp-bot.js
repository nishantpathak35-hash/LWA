const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

/**
 * WhatsApp Bot Initialization
 * NOTE: Use a dedicated personal/secondary number for this bot. Do NOT use the main business number.
 * Run this script using `node backend/whatsapp-bot.js` separately.
 */

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('Scan this QR code with your secondary WhatsApp number:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot is ready!');
    isReady = true;
});

client.on('authenticated', () => {
    console.log('WhatsApp Bot authenticated successfully.');
});

client.on('auth_failure', msg => {
    console.error('WhatsApp Bot authentication failure:', msg);
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

module.exports = {
    sendWhatsAppMessage,
    client
};
