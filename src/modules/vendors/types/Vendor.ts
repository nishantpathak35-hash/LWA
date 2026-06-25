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
}
