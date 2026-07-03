import { createClient } from '@libsql/client';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables from .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const {
  TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} = process.env;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
  process.exit(1);
}

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("❌ Missing Cloudinary API keys. Please add them to .env.local.");
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

// Configure Turso Client
const db = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function run() {
  console.log("🚀 Starting data migration to Cloudinary...\n");

  // 1. MIGRATE BRAND LOGO
  console.log("⏳ Checking 'company_logo' in app_settings...");
  try {
    const rs = await db.execute(`SELECT value FROM app_settings WHERE key = 'company_logo'`);
    if (rs.rows.length > 0) {
      const logoData = rs.rows[0].value;
      if (logoData && !logoData.startsWith('http')) {
        console.log("   - Found base64 logo. Uploading to Cloudinary...");
        
        let dataUri = logoData;
        if (!logoData.startsWith('data:')) {
           dataUri = `data:image/png;base64,${logoData}`;
        }
        
        const uploadResult = await cloudinary.uploader.upload(dataUri, {
          folder: 'erp_settings',
          public_id: 'company_logo',
          overwrite: true
        });

        await db.execute({
          sql: `UPDATE app_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'company_logo'`,
          args: [uploadResult.secure_url]
        });
        console.log(`   ✅ Successfully migrated company_logo! URL: ${uploadResult.secure_url}`);
      } else {
        console.log("   - Company logo is already a URL or empty. Skipping.");
      }
    } else {
      console.log("   - No company_logo found in settings.");
    }
  } catch (err) {
    console.error("   ❌ Failed to migrate company logo:", err.message);
  }
  console.log("");

  // 2. MIGRATE ATTACHMENTS
  console.log("⏳ Checking attachments table...");
  try {
    const rs = await db.execute(`SELECT id, entity_type, entity_id, file_name, file_type, file_data FROM attachments`);
    const attachments = rs.rows;
    console.log(`   - Found ${attachments.length} total attachments.`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const att of attachments) {
      const { id, entity_type, entity_id, file_name, file_type, file_data } = att;
      
      if (!file_data || file_data.startsWith('http')) {
        skipped++;
        continue;
      }

      console.log(`   - Uploading Attachment ID ${id} (${file_name})...`);
      try {
        const mime = file_type || 'application/octet-stream';
        let dataUri = file_data;
        if (!file_data.startsWith('data:')) {
          dataUri = `data:${mime};base64,${file_data}`;
        }

        const uploadResult = await cloudinary.uploader.upload(dataUri, {
          folder: `erp_attachments/${entity_type}/${entity_id}`,
          resource_type: 'auto'
        });

        await db.execute({
          sql: `UPDATE attachments SET file_data = ? WHERE id = ?`,
          args: [uploadResult.secure_url, id]
        });
        console.log(`     ✅ Success -> ${uploadResult.secure_url}`);
        migrated++;
      } catch (err) {
        console.error(`     ❌ Error uploading Attachment ID ${id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n🎉 Migration Complete!`);
    console.log(`📊 Summary: Migrated ${migrated} | Skipped ${skipped} | Errors ${errors}`);
  } catch (err) {
    console.error("   ❌ Failed to query attachments:", err.message);
  }

  process.exit(0);
}

run();
