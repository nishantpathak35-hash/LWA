export type InvoiceStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Paid';
export type InvoiceSource = 'vendor_portal' | 'internal_upload';
export type UploadedByType = 'vendor' | 'internal';

export interface IInvoice {
  id?: number;
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  vendor_id?: number | null;
  vendor_code: string;
  vendor_name: string;
  po_no: string;
  project?: string | null;
  subtotal?: number;
  tax_amount?: number;
  invoice_total: number;
  status: InvoiceStatus;
  source: InvoiceSource;
  uploaded_by: string;
  uploaded_by_type: UploadedByType;
  remarks?: string | null;
  rejection_reason?: string | null;
  submitted_at?: string;
  reviewed_at?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
  version?: number;
}

export interface IInvoiceInput {
  invoiceNumber: string;
  invoiceDate: string;
  poNo: string;
  vendorCode?: string;
  vendorId?: number;
  subtotal?: number;
  taxAmount?: number;
  invoiceTotal: number;
  remarks?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileData?: string; // base64 string for Cloudinary upload
}

export interface IVendorPortalUser {
  id?: number;
  vendor_id: number;
  vendor_code: string;
  email: string;
  name?: string | null;
  password_hash?: string;
  status?: string;
  last_login?: string | null;
  created_at?: string;
}
