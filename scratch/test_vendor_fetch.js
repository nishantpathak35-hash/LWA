import { getVendorByName } from '../app/lib/api/vendors.js';

async function testFetch() {
  console.log('--- TESTING getVendorByName RPC ---');
  const mockSession = { user: { role: 'admin' }, email: 'admin@luxeworxatelier.com' };
  
  const v3 = await getVendorByName('VEN-003', mockSession);
  console.log('VEN-003 details:', v3);

  const v88 = await getVendorByName('VEN-088', mockSession);
  console.log('\nVEN-088 (I-TECH SOLUTIONS):', {
    legalName: v88?.legalName,
    bankAccount: v88?.bank_account,
    ifsc: v88?.ifsc,
    accountNo: v88?.accountNo
  });

  const v1783 = await getVendorByName('VEN-1783332112623', mockSession);
  console.log('\nVEN-1783332112623 (JAGDISH SINGH):', {
    legalName: v1783?.legalName,
    bankAccount: v1783?.bank_account,
    ifsc: v1783?.ifsc,
    primaryContactName: v1783?.primaryContactName,
    primaryContactNo: v1783?.primaryContactNo
  });
}

testFetch();
