export interface IPayment {
  id?: number;
  po_no: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  utr_ref?: string;
  bank_name?: string;
  reference_no?: string;
  remarks?: string;
  payment_type: string; // 'manual' or 'system'
  recorded_by: string;
  status: string; // usually 'paid'
  created_at?: string;
}

export interface IPaymentRequest {
  id?: number;
  po_no: string;
  vendor_code?: string;
  vendor_name: string;
  project: string;
  category?: string;
  amount_requested: number;
  approved_amount: number;
  stage: string; // e.g. Pending Procurement, Approved, Rejected
  remittance?: string; // e.g. Remitted, Failed
  remarks?: string;
  created_by: string;
  tds_amount?: number;
  tds_percentage?: number;
  tds_section?: string;
  created_at?: string;
}

export interface IPaymentInput {
  poNo: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  utrRef?: string;
  bankName?: string;
  referenceNo?: string;
  remarks?: string;
}

export interface IPaymentRequestInput {
  poNo: string;
  vendorCode?: string;
  vendor?: string;
  project?: string;
  category?: string;
  amountRequested: number;
  gross_amount?: number;
  remarks?: string;
  tds_amount?: number;
  tds_deducted?: number;
  tds_percentage?: number;
  tds_pct?: number;
  tds_section?: string;
  tdsSection?: string;
}
