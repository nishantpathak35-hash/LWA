import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';
import { IVendorOnboardingInvitation, IVendorOnboardingSubmission } from '../types/VendorOnboarding';

export class VendorOnboardingRepository {
  // --- Invitation Methods ---
  static async createInvitation(invitation: IVendorOnboardingInvitation): Promise<void> {
    const sql = `
      INSERT INTO vendor_onboarding_invitations (
        invitation_id, email, token, status, expires_at, invited_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    await queryRun(sql, [
      invitation.invitation_id,
      invitation.email.toLowerCase().trim(),
      invitation.token,
      invitation.status || 'Invited',
      invitation.expires_at,
      invitation.invited_by
    ]);
  }

  static async findInvitationByToken(token: string): Promise<IVendorOnboardingInvitation | null> {
    return queryGet(`SELECT * FROM vendor_onboarding_invitations WHERE token = ?`, [token]);
  }

  static async findInvitationById(invitationId: string): Promise<IVendorOnboardingInvitation | null> {
    return queryGet(`SELECT * FROM vendor_onboarding_invitations WHERE invitation_id = ?`, [invitationId]);
  }

  static async findActiveInvitationByEmail(email: string): Promise<IVendorOnboardingInvitation | null> {
    return queryGet(
      `SELECT * FROM vendor_onboarding_invitations WHERE LOWER(email) = ? AND status IN ('Invited', 'Opened') ORDER BY id DESC LIMIT 1`,
      [email.toLowerCase().trim()]
    );
  }

  static async updateInvitationStatus(invitationId: string, status: string, vendorId?: number): Promise<void> {
    if (vendorId) {
      await queryRun(
        `UPDATE vendor_onboarding_invitations SET status = ?, completed_at = datetime('now'), vendor_id = ? WHERE invitation_id = ?`,
        [status, vendorId, invitationId]
      );
    } else {
      await queryRun(
        `UPDATE vendor_onboarding_invitations SET status = ? WHERE invitation_id = ?`,
        [status, invitationId]
      );
    }
  }

  static async invalidatePreviousInvitations(email: string): Promise<void> {
    await queryRun(
      `UPDATE vendor_onboarding_invitations SET status = 'Expired' WHERE LOWER(email) = ? AND status IN ('Invited', 'Opened')`,
      [email.toLowerCase().trim()]
    );
  }

  // --- Submission Methods ---
  static async createSubmission(submission: IVendorOnboardingSubmission): Promise<void> {
    const sql = `
      INSERT INTO vendor_onboarding_submissions (
        submission_id, invitation_id, email, legal_name, trade_name, vendor_type,
        gstin, pan, address, city, state, pincode, primary_contact_name, primary_contact_no,
        accounts_contact_name, accounts_contact_no, bank_name, bank_account, ifsc, branch, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await queryRun(sql, [
      submission.submission_id,
      submission.invitation_id,
      submission.email.toLowerCase().trim(),
      submission.legal_name,
      submission.trade_name || '',
      submission.vendor_type || '',
      submission.gstin || '',
      submission.pan || '',
      submission.address || '',
      submission.city || '',
      submission.state || '',
      submission.pincode || '',
      submission.primary_contact_name || '',
      submission.primary_contact_no || '',
      submission.accounts_contact_name || '',
      submission.accounts_contact_no || '',
      submission.bank_name || '',
      submission.bank_account || '',
      submission.ifsc || '',
      submission.branch || '',
      submission.status || 'Submitted'
    ]);
  }

  static async findSubmissionById(submissionId: string): Promise<IVendorOnboardingSubmission | null> {
    return queryGet(`SELECT * FROM vendor_onboarding_submissions WHERE submission_id = ?`, [submissionId]);
  }

  static async findSubmissionByInvitationId(invitationId: string): Promise<IVendorOnboardingSubmission | null> {
    return queryGet(`SELECT * FROM vendor_onboarding_submissions WHERE invitation_id = ? ORDER BY id DESC LIMIT 1`, [invitationId]);
  }

  static async updateSubmissionStatus(
    submissionId: string,
    status: 'Approved' | 'Rejected',
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<void> {
    await queryRun(
      `UPDATE vendor_onboarding_submissions SET status = ?, reviewed_at = datetime('now'), reviewed_by = ?, rejection_reason = ? WHERE submission_id = ?`,
      [status, reviewedBy, rejectionReason || null, submissionId]
    );
  }

  static async findAllPendingSubmissions(): Promise<IVendorOnboardingSubmission[]> {
    return queryAll(
      `SELECT * FROM vendor_onboarding_submissions WHERE status IN ('Submitted', 'Under Review') ORDER BY id DESC`
    );
  }

  static async findAllSubmissions(): Promise<IVendorOnboardingSubmission[]> {
    return queryAll(`SELECT * FROM vendor_onboarding_submissions ORDER BY id DESC`);
  }
}
