export interface IVendor {
  id?: number;
  legal_name: string;
  trade_name?: string;
  vendor_code: string;
  vendor_type?: string;
  pan?: string;
  gstin: string;
  status?: string;
  address?: string;
  email?: string;
  bank_account?: string;
  ifsc?: string;
  primary_contact_name?: string;
  primary_contact_no?: string;
  accounts_contact_name?: string;
  accounts_contact_no?: string;
  purchase_contact_name?: string;
  purchase_contact_no?: string;
  whatsapp_number?: string;
  mobile_number?: string;
  preferred_whatsapp_contact?: string;
  created_at?: string;
}

export interface IVendorInput {
  legalName: string;
  tradeName?: string;
  vendorId?: string; // used interchangeably with vendor_code in api.js
  vendorCode?: string;
  vendorType?: string;
  pan?: string;
  gstin: string;
  status?: string;
  address?: string;
  email?: string;
  accountNo?: string;
  ifsc?: string;
  primaryContactName?: string;
  primaryContactNo?: string;
  accountsContactName?: string;
  accountsContactNo?: string;
  purchaseContactName?: string;
  purchaseContactNo?: string;
  whatsappNumber?: string;
  mobileNumber?: string;
  preferredWhatsappContact?: string;
}
