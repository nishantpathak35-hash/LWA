export interface IVendorOnboardingInvitation {
  id?: number;
  invitation_id: string;
  email: string;
  token: string;
  status: 'Invited' | 'Opened' | 'Submitted' | 'Approved' | 'Rejected' | 'Expired';
  expires_at: string;
  invited_by: string;
  created_at?: string;
  completed_at?: string;
  vendor_id?: number;
}

export interface IVendorOnboardingSubmission {
  id?: number;
  submission_id: string;
  invitation_id: string;
  email: string;
  legal_name: string;
  trade_name?: string;
  vendor_type?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  primary_contact_name?: string;
  primary_contact_no?: string;
  accounts_contact_name?: string;
  accounts_contact_no?: string;
  bank_name?: string;
  bank_account?: string;
  ifsc?: string;
  branch?: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  submitted_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export interface IOnboardingSubmitInput {
  token: string;
  legalName: string;
  tradeName?: string;
  vendorType?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  primaryContactName?: string;
  primaryContactNo?: string;
  accountsContactName?: string;
  accountsContactNo?: string;
  bankName?: string;
  bankAccount?: string;
  ifsc?: string;
  branch?: string;
  attachments?: Array<{
    fileName: string;
    fileData: string; // Base64 or Cloudinary URL
    fileType?: string;
    documentType?: string;
  }>;
}
