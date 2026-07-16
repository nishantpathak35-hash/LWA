const fs = require('fs');
let c = fs.readFileSync('app/lib/api/vendors.js', 'utf8');
c = c.replace(/export async function getVendorByName\([\s\S]*?\n\}/, `export async function getVendorByName(name, session) {
  requireAuth(session);
  const row = await queryGet('SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?', [name, name]);
  if (!row) return null;
  return {
    vendorId: row.vendor_code || '',
    legalName: row.legal_name || '',
    tradeName: row.trade_name || '',
    gstin: row.gstin || '',
    pan: row.pan || '',
    status: row.status || 'Active',
    address: row.address || '',
    stateCode: '',
    vendorType: row.vendor_type || '',
    email: row.email || '',
    mobile: row.mobile_number || '',
    bankName: '',
    bankBranch: '',
    accountNo: row.bank_account || '',
    ifsc: row.ifsc || '',
    primaryContactName: row.primary_contact_name || '',
    primaryContactNo: row.primary_contact_no || '',
    accountsContactName: row.accounts_contact_name || '',
    accountsContactNo: row.accounts_contact_no || '',
    purchaseContactName: row.purchase_contact_name || '',
    purchaseContactNo: row.purchase_contact_no || '',
    whatsappNumber: row.whatsapp_number || '',
    mobileNumber: row.mobile_number || '',
    preferredWhatsappContact: row.preferred_whatsapp_contact || 'Primary'
  };
}`);
fs.writeFileSync('app/lib/api/vendors.js', c);
