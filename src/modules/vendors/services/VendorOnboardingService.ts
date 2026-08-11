import crypto from 'crypto';
import { VendorOnboardingRepository } from '../repositories/VendorOnboardingRepository';
import { VendorRepository } from '../repositories/VendorRepository';
import { VendorService } from './VendorService';
import { VendorPortalAuthService } from '../../vendor-portal/services/VendorPortalAuthService';
import { IOnboardingSubmitInput } from '../types/VendorOnboarding';
import { sanitizeEmail, sendVendorOnboardingInviteEmail, sendVendorOnboardingRejectionEmail, sendVendorPortalWelcomeEmail } from '../../../../app/lib/email.js';
import { logAudit, uploadAttachment, getAttachments } from '../../../../app/lib/api.js';
import { queryAll, queryRun } from '../../../../app/lib/db.js';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://lwa-iota.vercel.app';

export class VendorOnboardingService {
  /**
   * Internal user initiates vendor invitation using email address.
   */
  static async createInvitation(email: string, userSession: any): Promise<{ ok: boolean; invitation_id: string; token: string }> {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      throw new Error("Invalid vendor email address provided");
    }

    const invitedBy = userSession?.email || 'Admin';

    // Invalidate previous active invitations for this email to prevent orphan tokens
    await VendorOnboardingRepository.invalidatePreviousInvitations(cleanEmail);

    const token = `ONB-TOK-${crypto.randomBytes(24).toString('hex')}`;
    const invitationId = `INVITE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await VendorOnboardingRepository.createInvitation({
      invitation_id: invitationId,
      email: cleanEmail,
      token,
      status: 'Invited',
      expires_at: expiresAt,
      invited_by: invitedBy
    });

    const inviteUrl = `${APP_URL}/vendor/onboarding/${token}`;

    try {
      await sendVendorOnboardingInviteEmail({
        toEmail: cleanEmail,
        inviteUrl,
        invitedBy
      });
    } catch (err: any) {
      console.warn('Failed to send onboarding email via Resend/Brevo:', err?.message || err);
    }

    await logAudit(invitedBy, 'Vendor Onboarding Invitation Sent', `${cleanEmail} (${invitationId})`, 'Vendors');

    return { ok: true, invitation_id: invitationId, token };
  }

  /**
   * Resend onboarding invitation email with fresh token.
   */
  static async resendInvitation(invitationId: string, userSession: any): Promise<{ ok: boolean; token: string }> {
    const existing = await VendorOnboardingRepository.findInvitationById(invitationId);
    if (!existing) {
      throw new Error("Invitation record not found");
    }

    return VendorOnboardingService.createInvitation(existing.email, userSession);
  }

  /**
   * Public onboarding form validates secure token on every load/submit.
   */
  static async getOnboardingByToken(token: string): Promise<{
    invitation: any;
    submission: any;
    isValid: boolean;
    isExpired: boolean;
    isCompleted: boolean;
  }> {
    if (!token) throw new Error("Onboarding token is required");

    const invitation = await VendorOnboardingRepository.findInvitationByToken(token);
    if (!invitation) {
      return { invitation: null, submission: null, isValid: false, isExpired: false, isCompleted: false };
    }

    const isExpired = new Date(invitation.expires_at).getTime() < Date.now();
    const isCompleted = invitation.status === 'Completed' || invitation.status === 'Approved';

    let submission = await VendorOnboardingRepository.findSubmissionByInvitationId(invitation.invitation_id);

    // Mark status as Opened if first time opening
    if (invitation.status === 'Invited' && !isExpired) {
      await VendorOnboardingRepository.updateInvitationStatus(invitation.invitation_id, 'Opened');
      invitation.status = 'Opened';
    }

    return {
      invitation,
      submission,
      isValid: !isExpired && !isCompleted && invitation.status !== 'Expired',
      isExpired,
      isCompleted
    };
  }

  /**
   * Vendor submits onboarding details & documents.
   */
  static async submitOnboarding(input: IOnboardingSubmitInput): Promise<{ ok: boolean; submission_id: string }> {
    const { isValid, invitation, isExpired, isCompleted } = await VendorOnboardingService.getOnboardingByToken(input.token);
    if (!isValid || !invitation) {
      if (isExpired) throw new Error("This onboarding invitation link has expired. Please ask for a new link.");
      if (isCompleted) throw new Error("This onboarding form has already been submitted and approved.");
      throw new Error("Invalid or revoked onboarding invitation token.");
    }

    if (!input.legalName || !input.legalName.trim()) {
      throw new Error("Legal Company Name is required");
    }
    if (!input.primaryContactName || !input.primaryContactNo) {
      throw new Error("Primary Contact Name and Phone are required");
    }

    const submissionId = `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await VendorOnboardingRepository.createSubmission({
      submission_id: submissionId,
      invitation_id: invitation.invitation_id,
      email: invitation.email,
      legal_name: input.legalName.trim(),
      trade_name: input.tradeName?.trim() || '',
      vendor_type: input.vendorType || 'Supplier',
      gstin: input.gstin?.trim() || '',
      pan: input.pan?.trim() || '',
      address: input.address?.trim() || '',
      city: input.city?.trim() || '',
      state: input.state?.trim() || '',
      pincode: input.pincode?.trim() || '',
      primary_contact_name: input.primaryContactName.trim(),
      primary_contact_no: input.primaryContactNo.trim(),
      accounts_contact_name: input.accountsContactName?.trim() || '',
      accounts_contact_no: input.accountsContactNo?.trim() || '',
      bank_name: input.bankName?.trim() || '',
      bank_account: input.bankAccount?.trim() || '',
      ifsc: input.ifsc?.trim() || '',
      branch: input.branch?.trim() || '',
      status: 'Submitted'
    });

    // Save document attachments if provided (via Cloudinary integration layer)
    if (input.attachments && input.attachments.length > 0) {
      for (const att of input.attachments) {
        if (att.fileData) {
          await uploadAttachment({
            entityType: 'vendor_onboarding',
            entityId: submissionId,
            fileName: att.fileName || `${att.documentType || 'doc'}.pdf`,
            fileType: att.fileType || 'application/pdf',
            fileData: att.fileData
          }, { email: invitation.email });
        }
      }
    }

    await VendorOnboardingRepository.updateInvitationStatus(invitation.invitation_id, 'Submitted');
    await logAudit('Vendor Portal', 'Vendor Onboarding Submitted', `${input.legalName} (${invitation.email})`, 'Vendors');

    return { ok: true, submission_id: submissionId };
  }

  /**
   * Internal ERP lists pending vendor onboarding submissions.
   */
  static async listPendingOnboardings(userSession?: any): Promise<any[]> {
    const submissions = await VendorOnboardingRepository.findAllSubmissions();
    const result = [];

    for (const sub of submissions) {
      let docs: any[] = [];
      try {
        if (userSession) {
          docs = await getAttachments({ entityType: 'vendor_onboarding', entityId: sub.submission_id }, userSession);
        }
      } catch {
        docs = [];
      }
      result.push({
        ...sub,
        document_count: docs?.length || 0,
        documents: docs || []
      });
    }

    return result;
  }

  /**
   * Internal ERP gets full details of an onboarding submission, including potential duplicate vendor matches.
   */
  static async getOnboardingDetails(submissionId: string, userSession?: any): Promise<any> {
    const sub = await VendorOnboardingRepository.findSubmissionById(submissionId);
    if (!sub) throw new Error("Submission not found");

    let docs: any[] = [];
    try {
      if (userSession) {
        docs = await getAttachments({ entityType: 'vendor_onboarding', entityId: submissionId }, userSession);
      }
    } catch {
      docs = [];
    }

    const dupCheck = await VendorService.checkVendorDuplicate({
      legalName: sub.legal_name,
      tradeName: sub.trade_name,
      gstin: sub.gstin,
      pan: sub.pan
    });

    return {
      submission: sub,
      documents: docs || [],
      duplicateMatch: dupCheck.isDuplicate ? dupCheck.duplicate : null,
      duplicateMessage: dupCheck.message || null
    };
  }

  /**
   * Internal user approves onboarding.
   * Creates canonical Vendor Master entry.
   * Portal Access is granted ONLY if grantPortalAccess parameter is true.
   */
  static async approveOnboarding(
    submissionId: string,
    grantPortalAccess: boolean,
    userSession: any
  ): Promise<{ ok: boolean; vendor_code: string; portal_access: string }> {
    const reviewer = userSession?.email || 'Admin';
    const sub = await VendorOnboardingRepository.findSubmissionById(submissionId);
    if (!sub) throw new Error("Submission not found");

    if (sub.status === 'Approved') {
      throw new Error("This vendor onboarding has already been approved.");
    }

    const portalAccessStatus = grantPortalAccess ? 'enabled' : 'disabled';

    // 1. Create canonical Vendor Master record via VendorService
    const fullAddress = [sub.address, sub.city, sub.state, sub.pincode].filter(Boolean).join(', ');
    const addRes = await VendorService.addVendor({
      legalName: sub.legal_name,
      tradeName: sub.trade_name,
      vendorType: sub.vendor_type,
      gstin: sub.gstin,
      pan: sub.pan,
      status: 'Active',
      address: fullAddress,
      email: sub.email,
      accountNo: sub.bank_account,
      ifsc: sub.ifsc,
      primaryContactName: sub.primary_contact_name,
      primaryContactNo: sub.primary_contact_no,
      accountsContactName: sub.accounts_contact_name,
      accountsContactNo: sub.accounts_contact_no
    }, reviewer);

    const vendorCode = addRes.code;

    // Set portal_access column on newly created canonical vendor master
    await queryRun(`UPDATE vendors SET portal_access = ? WHERE vendor_code = ?`, [portalAccessStatus, vendorCode]);

    const createdVendor = await VendorRepository.findByNameOrCode(vendorCode);

    // 2. Mark submission & invitation as Approved
    await VendorOnboardingRepository.updateSubmissionStatus(submissionId, 'Approved', reviewer);
    await VendorOnboardingRepository.updateInvitationStatus(sub.invitation_id, 'Approved', createdVendor?.id);

    // 3. Handle Portal Access (ONLY if explicitly granted)
    if (grantPortalAccess && createdVendor) {
      const tempPassword = `Luxe${Math.floor(100000 + Math.random() * 900000)}!`;
      await VendorPortalAuthService.inviteVendorUser({
        vendorCode: vendorCode,
        email: sub.email,
        name: sub.primary_contact_name || sub.legal_name,
        password: tempPassword
      });

      const portalUrl = `${APP_URL}/vendor`;
      try {
        await sendVendorPortalWelcomeEmail({
          toEmail: sub.email,
          vendorName: sub.legal_name,
          portalUrl,
          tempPassword
        });
      } catch (err: any) {
        console.warn('Failed to send vendor welcome email:', err?.message || err);
      }
    }

    await logAudit(reviewer, 'Vendor Onboarding Approved', `${sub.legal_name} (${vendorCode}) [Portal: ${portalAccessStatus}]`, 'Vendors');

    return { ok: true, vendor_code: vendorCode, portal_access: portalAccessStatus };
  }

  /**
   * Internal user rejects onboarding with reason.
   */
  static async rejectOnboarding(submissionId: string, reason: string, userSession: any): Promise<{ ok: boolean }> {
    const reviewer = userSession?.email || 'Admin';
    if (!reason || !reason.trim()) {
      throw new Error("Rejection reason is required");
    }

    const sub = await VendorOnboardingRepository.findSubmissionById(submissionId);
    if (!sub) throw new Error("Submission not found");

    await VendorOnboardingRepository.updateSubmissionStatus(submissionId, 'Rejected', reviewer, reason.trim());
    await VendorOnboardingRepository.updateInvitationStatus(sub.invitation_id, 'Rejected');

    try {
      await sendVendorOnboardingRejectionEmail({
        toEmail: sub.email,
        legalName: sub.legal_name,
        reason: reason.trim()
      });
    } catch (err: any) {
      console.warn('Failed to send onboarding rejection email:', err?.message || err);
    }

    await logAudit(reviewer, 'Vendor Onboarding Rejected', `${sub.legal_name} (${reason})`, 'Vendors');

    return { ok: true };
  }

  /**
   * Internal user toggles Portal Access on any vendor (new or legacy).
   */
  static async togglePortalAccess(
    vendorCode: string,
    enable: boolean,
    userSession: any
  ): Promise<{ ok: boolean; portal_access: string }> {
    const userEmail = userSession?.email || 'Admin';
    const vendor = await VendorRepository.findByNameOrCode(vendorCode);
    if (!vendor) throw new Error("Vendor not found");

    const newStatus = enable ? 'enabled' : 'disabled';
    await queryRun(`UPDATE vendors SET portal_access = ? WHERE vendor_code = ?`, [newStatus, vendorCode]);

    if (enable && vendor.email) {
      const tempPassword = `Luxe${Math.floor(100000 + Math.random() * 900000)}!`;
      await VendorPortalAuthService.inviteVendorUser({
        vendorCode: vendor.vendor_code,
        email: vendor.email,
        name: vendor.primary_contact_name || vendor.legal_name,
        password: tempPassword
      });

      const portalUrl = `${APP_URL}/vendor`;
      try {
        await sendVendorPortalWelcomeEmail({
          toEmail: vendor.email,
          vendorName: vendor.legal_name,
          portalUrl,
          tempPassword
        });
      } catch (err: any) {
        console.warn('Failed to send vendor welcome email:', err?.message || err);
      }
    }

    await logAudit(userEmail, 'Vendor Portal Access Changed', `${vendorCode} (${newStatus})`, 'Vendors');

    return { ok: true, portal_access: newStatus };
  }

  /**
   * Internal ERP — List active/pending vendor invitations.
   */
  static async listActiveInvitations(userSession?: any): Promise<any[]> {
    return VendorOnboardingRepository.findAllActiveInvitations();
  }
}
