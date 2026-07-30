import { queryGet, queryAll } from '../app/lib/db.js';

async function testVendorAndSettings() {
  console.log('--- TESTING VENDOR & SETTINGS BACKEND APIS ---');
  try {
    const sampleVendor = await queryGet('SELECT vendor_code, legal_name, trade_name, gstin, address FROM vendors LIMIT 1');
    console.log('✓ Vendor DB check:', sampleVendor);

    const sampleUsers = await queryAll('SELECT email, name, roles, active FROM users LIMIT 3');
    console.log(`✓ Admin users list query OK (${sampleUsers.length} users)`);

    console.log('--- ALL CHECKS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('❌ Error during testing:', err);
  }
}

testVendorAndSettings();
