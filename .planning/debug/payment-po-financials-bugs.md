---
status: fixing
trigger: "Approved/rejected payments stay in payment requests list; no option to edit financial performance metrics; outflow should come from project outflow; POs not showing in payment request modal"
created: 2026-06-23
updated: 2026-06-23
---

# Bug: payment-po-financials-bugs

## Symptoms
1. Approved/Rejected payments remain visible in Payment Requests view — should move to Reports
2. No edit option for Financial Performance Metrics (BCS, Planned GM, Actual GM etc.)
3. Pending Outflow in project financials doesn't pull from actual payment requests outflow
4. PO dropdown in New Payment Request modal shows only "₹0" — no real POs listed

## Root Causes Found

### Bug 1 — Approved/Rejected stay in Payments list
- PaymentsView `activeTab === 'all'` returns ALL payments including Approved/Rejected/Remitted
- No tab/filter hides completed payments from the main list
- Fix: Add 'Pending' tab that only shows pending+remit-stage; make 'All' the archive view

### Bug 2 — POs not showing in payment modal
- Frontend filter: `pos.filter(po => po.vendor_key === vendorCode && (st === 'approved' || st === 'active'))`
- getMasterData returns `status: p.approval_status || p.status || 'Draft'`
- POs in DB may have `approval_status = 'Approved'` (capital A) — filter checks lowercase `'approved'`
- BUT the filter already does `.toLowerCase()` — real issue is `vendor_key` mismatch
- PaymentsView uses `vendorCode` = vendor.code, but pos have `vendor_key` from DB
- getMasterData vendor list is built from `poVendorMap` using vendor_name as key, `code: p.vendor_key`
- When vendor selected, `vendorCode` = vendor.code = vendor_key from PO
- PO filter: `po.vendor_key === vendorCode` — this should match IF vendor_key is set correctly
- **REAL bug**: `handleOpenRequestModal` sets initial vendor to `vendors[0]?.code` 
  but initial PO is filtered with `pos.filter(po => po.vendor_key === (vendors[0]?.code || ''))` 
  — if vendors[0].code is undefined/empty, NO POs load
- Also: vendor dropdown `onChange` only updates `vendorCode` state but doesn't filter POs on render — wait, it does via `vendorPOs` computed variable. BUT `vendorPOs` filters by approval status AND status may be stored as 'Draft' for non-approved POs

### Bug 3 — Financial metrics not editable + outflow from project
- ReportsView shows Financial Performance Metrics table (from getProjectDetails)  
- No edit UI exists for BCS, Planned GM, Actual GM
- `updateProjectFinancials` API exists but no UI calls it
- Pending Outflow is computed from purchase_orders.po_value not from payment_requests

## Fix Plan
1. PaymentsView: Change default tab to 'pending'; add status filter so approved/rejected go to Reports view
2. Fix vendor_key matching for PO dropdown — normalize vendor codes  
3. Add inline edit for Financial Performance Metrics rows (BCS, Planned GM, Actual GM, Invoice Value)
4. Fix outflow calculation to use actual payment_requests net amounts per project

## Resolutions / Actions Taken

### Bug 2 — POs not showing in payment modal (RESOLVED)
- **Root Cause**: The status check `st === 'approved' || st === 'active'` excluded POs with status `'Open'`, `'Partially Billed'`, and `'Billed'` (whose `approval_status` was `null` in the DB).
- **Resolution**:
  - Defined a helper function `getVendorPOs` to look for any active statuses: `['approved', 'active', 'open', 'billed', 'partially billed']`.
  - Updated the dropdown filtering and initial PO selection logic to use this helper.
  - Dynamically updated the selection when the vendor changes to show the new vendor's first valid PO automatically.
- **Verification**: Verified using browser automation that PO options successfully load and update dynamically when vendors are changed.

