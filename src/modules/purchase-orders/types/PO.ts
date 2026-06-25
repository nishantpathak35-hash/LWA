export interface IPOItem {
  id?: number;
  po_no: string;
  description: string;
  hsn_sac?: string;
  qty: number;
  unit: string;
  rate: number;
  disc_pct?: number;
  tax_pct: number;
  amount: number;
}

export interface IPO {
  po_no: string;
  vendor_key: string;
  vendor_name: string;
  project: string;
  po_value: number;
  revised_po_value?: number;
  approval_status: string;
  status: string;
  po_date: string;
  terms?: string;
  tds_section?: string;
  tds_pct?: number;
  tds_amount?: number;
  gst_total?: number;
  gst_mode?: string;
  category?: string;
  notes?: string;
  expected_delivery_date?: string;
  created_at?: string;
  paid?: number; // Fetched from sum of payments in some views
  payment_status?: string;
}

export interface IPOInput {
  poNo?: string;
  vendor?: string;
  vendorName?: string;
  vendorCode?: string;
  vendor_key?: string;
  project?: string;
  poValue?: number;
  grandTotal?: number;
  poDate?: string;
  terms?: string;
  tds_section?: string;
  tdsSection?: string;
  tds_pct?: number;
  tdsPct?: number;
  tds_amount?: number;
  gst_total?: number;
  gstMode?: string;
  gst_mode?: string;
  category?: string;
  notes?: string;
  expectedDeliveryDate?: string;
  items?: IPOItemInput[];
}

export interface IPOItemInput {
  description?: string;
  desc?: string;
  hsn_sac?: string;
  hsn?: string;
  qty?: number;
  quantity?: number;
  unit?: string;
  uom?: string;
  rate?: number;
  tax_pct?: number;
  gstPct?: number;
  tax?: number;
  disc_pct?: number;
  disc?: number;
  discount?: number;
  gst_amount?: number;
  amount?: number;
}
