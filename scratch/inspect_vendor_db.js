import { queryGet, queryAll } from '../app/lib/db.js';

async function inspectVendorData() {
  console.log('--- FINDING VENDORS WITH FILLED BANK & CONTACT DETAILS ---');
  try {
    const filledVendors = await queryAll(`
      SELECT vendor_code, legal_name, bank_account, ifsc, primary_contact_name, primary_contact_no, whatsapp_number, mobile_number
      FROM vendors 
      WHERE (bank_account != '' AND bank_account IS NOT NULL)
         OR (primary_contact_name != '' AND primary_contact_name IS NOT NULL)
         OR (whatsapp_number != '' AND whatsapp_number IS NOT NULL)
         OR (mobile_number != '' AND mobile_number IS NOT NULL)
      LIMIT 10
    `);
    console.log(`Found ${filledVendors.length} vendors with non-empty details:`);
    console.log(JSON.stringify(filledVendors, null, 2));

    const totalVendors = await queryAll('SELECT vendor_code, legal_name, bank_account, ifsc, primary_contact_name FROM vendors');
    console.log(`\nTotal vendors count: ${totalVendors.length}`);

  } catch (err) {
    console.error('Error inspecting vendor data:', err);
  }
}

inspectVendorData();
