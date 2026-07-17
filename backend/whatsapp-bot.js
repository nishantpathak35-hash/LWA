const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.LOCAL_BOT_API_KEY || 'lwa-secure-waha-api-key-2026-xyz';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

client.on('qr', (qr) => {
    console.log('------------------------------------------------------------');
    console.log('SCAN THIS QR CODE WITH YOUR WHATSAPP TO LOG IN:');
    qrcode.generate(qr, { small: true });
    console.log('------------------------------------------------------------');
});

client.on('ready', () => {
    console.log('WhatsApp Bot is ready and listening!');
    isReady = true;
});

client.on('authenticated', () => {
    console.log('WhatsApp Bot authenticated successfully.');
});

client.on('auth_failure', msg => {
    console.error('WhatsApp Bot authentication failure:', msg);
});

client.initialize();

// API Endpoint to send messages
app.post('/send-message', async (req, res) => {
    // API Key Auth
    const requestKey = req.headers['x-api-key'];
    if (API_KEY && requestKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { to, message, mediaUrl } = req.body;
    if (!to || !message) {
        return res.status(400).json({ error: 'Missing parameter "to" or "message"' });
    }

    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp Bot is not authenticated/ready yet.' });
    }

    try {
        let cleanNumber = to.replace(/\D/g, '');
        if (cleanNumber.length === 10) {
            cleanNumber = '91' + cleanNumber;
        }
        const chatId = `${cleanNumber}@c.us`;

        if (mediaUrl) {
            try {
                const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
                await client.sendMessage(chatId, message, { media });
            } catch (mediaError) {
                console.error(`Failed to load media from ${mediaUrl}:`, mediaError.message);
                // Fallback to sending text if media fails
                await client.sendMessage(chatId, message);
            }
        } else {
            await client.sendMessage(chatId, message);
        }

        console.log(`Successfully sent message to ${cleanNumber}`);
        return res.json({ success: true });
    } catch (error) {
        console.error(`Failed to send message to ${to}:`, error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.get('/status', (req, res) => {
    return res.json({ ready: isReady });
});

app.listen(PORT, () => {
    console.log(`Local WhatsApp Express API listening on port ${PORT}`);
});
