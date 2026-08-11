import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { describe, it, expect } from 'vitest';

describe('Live Vendor Onboarding & Portal Access End-to-End Test', () => {
  it('executes complete invitation -> token validation -> vendor submission -> internal review -> approval -> portal access workflow', async () => {
    console.log('=== STARTING LIVE VENDOR ONBOARDING WORKFLOW TEST ===\n');

    const { queryGet, queryAll } = await import('../../app/lib/db.js');
    const { VendorOnboardingService } = await import('../../src/modules/vendors/services/VendorOnboardingService');
    const { VendorRepository } = await import('../../src/modules/vendors/repositories/VendorRepository');

    // 1. Internal User creates Vendor Invitation (Email only)
    const testVendorEmail = `test.supplier.${Date.now()}@onboarding.com`;
    const userSession = { email: 'admin@luxeworxatelier.com' };

    console.log(`1. Creating invitation for email: ${testVendorEmail}...`);
    const inviteRes = await VendorOnboardingService.createInvitation(testVendorEmail, userSession);
    expect(inviteRes.ok).toBe(true);
    expect(inviteRes.token).toMatch(/^ONB-TOK-/);
    console.log(`✓ Invitation created! Token: ${inviteRes.token.slice(0, 20)}...`);

    // 2. Public Vendor Token Validation
    console.log('2. Validating onboarding token...');
    const tokenVal = await VendorOnboardingService.getOnboardingByToken(inviteRes.token);
    expect(tokenVal.isValid).toBe(true);
    expect(tokenVal.invitation.email).toBe(testVendorEmail);
    console.log(`✓ Token validated successfully. Invitation status: ${tokenVal.invitation.status}`);

    // 3. Vendor Submits Onboarding Details & Attachments
    const testGstin = `07TEST${Date.now().toString().slice(-6)}A1Z5`;
    const testPan = `PAN${Date.now().toString().slice(-7)}`;
    const testCompany = `Test Logistics ${Date.now().toString().slice(-4)} Pvt Ltd`;

    console.log(`3. Vendor submitting onboarding form for: ${testCompany}...`);
    const submitRes = await VendorOnboardingService.submitOnboarding({
      token: inviteRes.token,
      legalName: testCompany,
      tradeName: `Trade ${Date.now()}`,
      vendorType: 'Supplier',
      gstin: testGstin,
      pan: testPan,
      address: 'Plot 45, Industrial Area Phase II',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110020',
      primaryContactName: 'Rajesh Kumar',
      primaryContactNo: '9876543210',
      accountsContactName: 'Finance Desk',
      accountsContactNo: '9876543211',
      bankName: 'HDFC Bank Ltd',
      bankAccount: '501002938475',
      ifsc: 'HDFC0001234',
      branch: 'Okhla Phase II'
    });

    expect(submitRes.ok).toBe(true);
    console.log(`✓ Onboarding submitted! Submission ID: ${submitRes.submission_id}`);

    // 4. Internal Review — List Pending Onboardings & Inspect Details
    console.log('4. Internal ERP reviewing pending onboardings...');
    const pendingList = await VendorOnboardingService.listPendingOnboardings(userSession);
    const targetSub = pendingList.find((s: any) => s.submission_id === submitRes.submission_id);
    expect(targetSub).toBeDefined();
    expect(targetSub.legal_name).toBe(testCompany);
    console.log(`✓ Submission found in pending queue: ${targetSub.legal_name} (${targetSub.status})`);

    const details = await VendorOnboardingService.getOnboardingDetails(submitRes.submission_id, userSession);
    expect(details.submission.gstin).toBe(testGstin);
    console.log(`✓ Onboarding details retrieved. Duplicate match check completed.`);

    // 5. Internal Approval WITH Portal Access = Enabled
    console.log('5. Approving vendor WITH Portal Access = Enabled...');
    const approveRes = await VendorOnboardingService.approveOnboarding(submitRes.submission_id, true, userSession);
    expect(approveRes.ok).toBe(true);
    expect(approveRes.portal_access).toBe('enabled');
    console.log(`✓ Vendor Approved! Generated Vendor Code: ${approveRes.vendor_code}, Portal Access: ${approveRes.portal_access}`);

    // 6. Verify Record in Canonical `vendors` Master Table
    const canonicalVendor = await VendorRepository.findByNameOrCode(approveRes.vendor_code);
    expect(canonicalVendor).toBeDefined();
    expect(canonicalVendor?.legal_name).toBe(testCompany);
    expect(canonicalVendor?.portal_access).toBe('enabled');
    console.log(`✓ Verified in Canonical Vendor Master ('vendors' table): ID=${canonicalVendor?.id}, Code=${canonicalVendor?.vendor_code}, Status=${canonicalVendor?.status}`);

    // 7. Verify Legacy Vendor Portal Access Toggle
    console.log('7. Testing Portal Access toggle on legacy vendor...');
    const legacyVendorCode = 'VND-TEST-999'; // created in previous live test
    const toggleRes = await VendorOnboardingService.togglePortalAccess(legacyVendorCode, true, userSession);
    expect(toggleRes.ok).toBe(true);
    expect(toggleRes.portal_access).toBe('enabled');
    console.log(`✓ Legacy vendor ${legacyVendorCode} granted portal access successfully!`);

    console.log('\n=== ALL LIVE ONBOARDING WORKFLOW CHECKS PASSED SUCCESSFULLY ===');
  }, 30000);
});
