const fs = require('fs');
let c = fs.readFileSync('components/views/VendorsView.js', 'utf8');

c = c.replace(/const handleOpenEditModal = async \(v\) => {[\s\S]*?try {/m, `const handleOpenEditModal = async (v) => {
    setFormError(null); setSubmitting(false);
    const vendorCode = v.code || v.vendorId || v.vendor_code;
    
    try {`);

c = c.replace(/const details = await call\('getVendorByName', v\.vendor_code\);/, `const details = await call('getVendorByName', vendorCode);
      
      setEditVendorId(details?.vendorId || vendorCode); 
      setEditLegalName(details?.legalName || v.legalName || ''); 
      setEditTradeName(details?.tradeName || v.name || '');
      setEditGstin(details?.gstin || v.gstin || ''); 
      setEditPan(details?.pan || v.pan || ''); 
      setEditStatus(details?.status || v.status || 'Active');
      setEditAddress(details?.address || v.address || '');
      setEditPrimaryContactName(details?.primaryContactName || '');
      setEditPrimaryContactNo(details?.primaryContactNo || '');
      setEditAccountsContactName(details?.accountsContactName || '');
      setEditAccountsContactNo(details?.accountsContactNo || '');
      setEditPurchaseContactName(details?.purchaseContactName || '');
      setEditPurchaseContactNo(details?.purchaseContactNo || '');
      setEditWhatsappNumber(details?.whatsappNumber || '');
      setEditMobileNumber(details?.mobileNumber || '');
      setEditPreferredWhatsappContact(details?.preferredWhatsappContact || 'Primary');
`);

fs.writeFileSync('components/views/VendorsView.js', c);
