-- Vendors Table
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    vendor_code TEXT UNIQUE,
    vendor_type TEXT,
    pan TEXT,
    gstin TEXT,
    bank_account TEXT,
    ifsc TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders Table
CREATE TABLE purchase_orders (
    po_no TEXT PRIMARY KEY,
    vendor_key TEXT NOT NULL,
    vendor_name TEXT,
    project TEXT,
    po_value NUMERIC DEFAULT 0,
    revised_po_value NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Open',
    po_date DATE,
    certified_value NUMERIC DEFAULT 0,
    legacy_paid NUMERIC DEFAULT 0,
    advance NUMERIC DEFAULT 0,
    final_payable NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment Requests (PR) Table
CREATE TABLE payment_requests (
    pr_id SERIAL PRIMARY KEY,
    po_no TEXT,
    vendor_name TEXT,
    project TEXT,
    category TEXT,
    amount_requested NUMERIC DEFAULT 0,
    proc_amt NUMERIC DEFAULT 0,
    finance_amt NUMERIC DEFAULT 0,
    director_amt NUMERIC DEFAULT 0,
    proc_approval TEXT,
    finance_approval TEXT,
    director_approval TEXT,
    remittance TEXT,
    stage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Payments Table
CREATE TABLE system_payments (
    id SERIAL PRIMARY KEY,
    po_no TEXT,
    pr_key TEXT,
    amount NUMERIC DEFAULT 0,
    remitted_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS) but allow anonymous access for now to simplify frontend porting
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access" ON vendors FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON vendors FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read access" ON purchase_orders FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON purchase_orders FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read access" ON payment_requests FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON payment_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON payment_requests FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read access" ON system_payments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON system_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON system_payments FOR UPDATE USING (true);
