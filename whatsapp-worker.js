const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const fs = require('fs');

// Load env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local");
  process.exit(1);
}

// Database client
const db = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

console.log("🚀 Initializing WhatsApp Client...");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('\n=========================================');
  console.log('📱 SCAN THIS QR CODE WITH WHATSAPP 📱');
  console.log('=========================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('\n✅ WhatsApp Client is READY and CONNECTED!');
  console.log('⏳ Monitoring the database for outgoing messages...\n');
  
  // Start polling every 10 seconds
  setInterval(processQueue, 10000);
});

client.on('auth_failure', msg => {
  console.error('❌ WhatsApp Authentication failure:', msg);
});

client.on('disconnected', (reason) => {
  console.log('❌ WhatsApp was disconnected:', reason);
  console.log('🔄 Reconnecting...');
  client.initialize();
});

// The polling function
async function processQueue() {
  try {
    // 1. Fetch pending messages
    const rs = await db.execute(`
      SELECT id, phone, message 
      FROM whatsapp_outbox 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 10
    `);
    
    const pendingMsgs = rs.rows;
    if (pendingMsgs.length === 0) return;

    console.log(`\n📨 Found ${pendingMsgs.length} pending message(s) to send...`);

    // 2. Process each message
    for (const row of pendingMsgs) {
      const { id, phone, message } = row;
      
      // Clean phone number (must include country code, remove spaces/plus)
      let cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone; // Default to India if 10 digits
      
      const chatId = `${cleanPhone}@c.us`;

      console.log(`   -> Sending message to ${cleanPhone}...`);
      try {
        await client.sendMessage(chatId, message);
        
        // 3. Mark as sent
        await db.execute({
          sql: `UPDATE whatsapp_outbox SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [id]
        });
        console.log(`      ✅ Sent successfully (ID: ${id})`);
      } catch (err) {
        console.error(`      ❌ Failed to send to ${cleanPhone}:`, err.message);
        // Mark as failed so it doesn't block the queue forever
        await db.execute({
          sql: `UPDATE whatsapp_outbox SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [id]
        });
      }
      
      // Delay slightly between messages to avoid spam filters
      await new Promise(res => setTimeout(res, 2000));
    }
  } catch (err) {
    console.error('❌ Database polling error:', err.message);
  }
}

// Start the client
client.initialize();
