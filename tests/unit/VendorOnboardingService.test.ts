import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('VendorOnboardingService Unit & Security Tests', () => {
  let queryGet: any, queryAll: any, queryRun: any;
  let VendorOnboardingService: any;
  let VendorOnboardingRepository: any;
  let VendorService: any;
  let VendorRepository: any;
  let VendorPortalAuthService: any;
  let emailApi: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const dbModule = await import('../../app/lib/db.js');
    queryGet = dbModule.queryGet;
    queryAll = dbModule.queryAll;
    queryRun = dbModule.queryRun;

    const serviceModule = await import('../../src/modules/vendors/services/VendorOnboardingService');
    VendorOnboardingService = serviceModule.VendorOnboardingService;

    const repoModule = await import('../../src/modules/vendors/repositories/VendorOnboardingRepository');
    VendorOnboardingRepository = repoModule.VendorOnboardingRepository;

    const vendorServModule = await import('../../src/modules/vendors/services/VendorService');
    VendorService = vendorServModule.VendorService;

    const vendorRepoModule = await import('../../src/modules/vendors/repositories/VendorRepository');
    VendorRepository = vendorRepoModule.VendorRepository;

    const portalAuthModule = await import('../../src/modules/vendor-portal/services/VendorPortalAuthService');
    VendorPortalAuthService = portalAuthModule.VendorPortalAuthService;

    emailApi = await import('../../app/lib/email.js');
  });

  it('creates onboarding invitation with email only and sends email with secure token', async () => {
    const emailSpy = vi.spyOn(emailApi, 'sendVendorOnboardingInviteEmail').mockResolvedValue({ sent: true, id: 'msg-1' });
    const repoSpy = vi.spyOn(VendorOnboardingRepository, 'createInvitation').mockResolvedValue();
    vi.spyOn(VendorOnboardingRepository, 'invalidatePreviousInvitations').mockResolvedValue();

    const userSession = { email: 'admin@luxeworx.com' };
    const res = await VendorOnboardingService.createInvitation('newsupplier@example.com', userSession);

    expect(res.ok).toBe(true);
    expect(res.token).toMatch(/^ONB-TOK-/);
    expect(repoSpy).toHaveBeenCalledWith(expect.objectContaining({
      email: 'newsupplier@example.com',
      status: 'Invited',
      invited_by: 'admin@luxeworx.com'
    }));
    expect(emailSpy).toHaveBeenCalledWith(expect.objectContaining({
      toEmail: 'newsupplier@example.com',
      invitedBy: 'admin@luxeworx.com'
    }));
  });

  it('validates onboarding token resolution and prevents expired token usage', async () => {
    vi.spyOn(VendorOnboardingRepository, 'findInvitationByToken').mockImplementation(async (token) => {
      if (token === 'VALID-TOK') {
        return {
          invitation_id: 'INV-1',
          email: 'supplier@test.com',
          token: 'VALID-TOK',
          status: 'Invited',
          expires_at: new Date(Date.now() + 86400000).toISOString()
        } as any;
      } else if (token === 'EXPIRED-TOK') {
        return {
          invitation_id: 'INV-2',
          email: 'supplier2@test.com',
          token: 'EXPIRED-TOK',
          status: 'Invited',
          expires_at: new Date(Date.now() - 86400000).toISOString()
        } as any;
      }
      return null;
    });

    vi.spyOn(VendorOnboardingRepository, 'findSubmissionByInvitationId').mockResolvedValue(null);
    vi.spyOn(VendorOnboardingRepository, 'updateInvitationStatus').mockResolvedValue();

    const validRes = await VendorOnboardingService.getOnboardingByToken('VALID-TOK');
    expect(validRes.isValid).toBe(true);
    expect(validRes.isExpired).toBe(false);

    const expiredRes = await VendorOnboardingService.getOnboardingByToken('EXPIRED-TOK');
    expect(expiredRes.isValid).toBe(false);
    expect(expiredRes.isExpired).toBe(true);
  });

  it('ENFORCES SEPARATION: Approving vendor with grantPortalAccess=false creates Vendor Master with portal_access=disabled and sends NO welcome email', async () => {
    const mockSubmission = {
      submission_id: 'SUB-101',
      invitation_id: 'INV-101',
      email: 'testvendor@supplier.com',
      legal_name: 'Test Supplier Logistics Pvt Ltd',
      gstin: '07AAAAA1234A1Z1',
      primary_contact_name: 'John Supplier',
      primary_contact_no: '9876543210',
      bank_account: '1234567890',
      ifsc: 'HDFC0001234',
      status: 'Submitted'
    };

    vi.spyOn(VendorOnboardingRepository, 'findSubmissionById').mockResolvedValue(mockSubmission as any);
    vi.spyOn(VendorService, 'addVendor').mockResolvedValue({ ok: true, code: 'VEN-2026-999' });
    vi.spyOn(VendorRepository, 'findByNameOrCode').mockResolvedValue({
      id: 501,
      vendor_code: 'VEN-2026-999',
      legal_name: 'Test Supplier Logistics Pvt Ltd'
    } as any);
    vi.spyOn(VendorOnboardingRepository, 'updateSubmissionStatus').mockResolvedValue();
    vi.spyOn(VendorOnboardingRepository, 'updateInvitationStatus').mockResolvedValue();

    const welcomeEmailSpy = vi.spyOn(emailApi, 'sendVendorPortalWelcomeEmail');
    const portalUserSpy = vi.spyOn(VendorPortalAuthService, 'inviteVendorUser');

    const res = await VendorOnboardingService.approveOnboarding('SUB-101', false, { email: 'approver@luxe.com' });

    expect(res.ok).toBe(true);
    expect(res.vendor_code).toBe('VEN-2026-999');
    expect(res.portal_access).toBe('disabled');
    expect(portalUserSpy).not.toHaveBeenCalled();
    expect(welcomeEmailSpy).not.toHaveBeenCalled();
  });

  it('ENFORCES SEPARATION: Approving vendor with grantPortalAccess=true creates Portal User and sends Portal Welcome Email', async () => {
    const mockSubmission = {
      submission_id: 'SUB-102',
      invitation_id: 'INV-102',
      email: 'activeportal@supplier.com',
      legal_name: 'Active Supplier Pvt Ltd',
      gstin: '07BBBBB1234B1Z1',
      primary_contact_name: 'Jane Active',
      primary_contact_no: '9876543211',
      bank_account: '1234567891',
      ifsc: 'HDFC0001234',
      status: 'Submitted'
    };

    vi.spyOn(VendorOnboardingRepository, 'findSubmissionById').mockResolvedValue(mockSubmission as any);
    vi.spyOn(VendorService, 'addVendor').mockResolvedValue({ ok: true, code: 'VEN-2026-1000' });
    vi.spyOn(VendorRepository, 'findByNameOrCode').mockResolvedValue({
      id: 502,
      vendor_code: 'VEN-2026-1000',
      legal_name: 'Active Supplier Pvt Ltd'
    } as any);
    vi.spyOn(VendorOnboardingRepository, 'updateSubmissionStatus').mockResolvedValue();
    vi.spyOn(VendorOnboardingRepository, 'updateInvitationStatus').mockResolvedValue();

    const welcomeEmailSpy = vi.spyOn(emailApi, 'sendVendorPortalWelcomeEmail').mockResolvedValue({ sent: true, id: 'm-2' });
    const portalUserSpy = vi.spyOn(VendorPortalAuthService, 'inviteVendorUser').mockResolvedValue({ ok: true });

    const res = await VendorOnboardingService.approveOnboarding('SUB-102', true, { email: 'approver@luxe.com' });

    expect(res.ok).toBe(true);
    expect(res.vendor_code).toBe('VEN-2026-1000');
    expect(res.portal_access).toBe('enabled');
    expect(portalUserSpy).toHaveBeenCalledWith(expect.objectContaining({
      vendorCode: 'VEN-2026-1000',
      email: 'activeportal@supplier.com'
    }));
    expect(welcomeEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
      toEmail: 'activeportal@supplier.com',
      vendorName: 'Active Supplier Pvt Ltd'
    }));
  });

  it('allows granting Portal Access to existing legacy vendors without forcing re-onboarding', async () => {
    vi.spyOn(VendorRepository, 'findByNameOrCode').mockResolvedValue({
      id: 301,
      vendor_code: 'VEN-LEGACY-001',
      legal_name: 'Existing Legacy Vendor',
      email: 'legacy@vendor.com',
      portal_access: 'disabled'
    } as any);

    const welcomeEmailSpy = vi.spyOn(emailApi, 'sendVendorPortalWelcomeEmail').mockResolvedValue({ sent: true, id: 'm-3' });
    const portalUserSpy = vi.spyOn(VendorPortalAuthService, 'inviteVendorUser').mockResolvedValue({ ok: true });

    const res = await VendorOnboardingService.togglePortalAccess('VEN-LEGACY-001', true, { email: 'admin@luxe.com' });

    expect(res.ok).toBe(true);
    expect(res.portal_access).toBe('enabled');
    expect(portalUserSpy).toHaveBeenCalledWith(expect.objectContaining({
      vendorCode: 'VEN-LEGACY-001',
      email: 'legacy@vendor.com'
    }));
    expect(welcomeEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
      toEmail: 'legacy@vendor.com'
    }));
  });
});
