---
status: investigating
trigger: "Fix 7 critical functional and UI issues in Purchase Order and Payment modules"
created: 2026-06-22
updated: 2026-06-22
---

# Debug Session: PO & Payment Module Fixes

## Issues to Fix

1. **GST at Line Item Level** — Currently one global GST rate; need per-item GST
2. **PO Approval Workflow** — No approval flow; need Draft→Pending→Approved→Rejected
3. **TDS in Purchase Orders** — TDS missing from PO creation; should flow into payment module
4. **Remittance Logic** — PO balance reduces on payment request creation, should only reduce after remit
5. **Light Mode UI** — Overly bright; needs softer/professional palette
6. **Payment Advice for Rejected Payouts** — Should be blocked; currently allowed
7. **Role-Based Permissions** — Feature permissions don't restrict module access

## Current Focus

- hypothesis: All 7 issues confirmed by code review. Root causes identified.
- next_action: Implement all fixes sequentially
- status: fixing

## Evidence

- timestamp: 2026-06-22T12:30:00Z
- finding: POsView.js line 28 shows single `gstPct` state for all items — no per-item GST
- finding: POsView.js line 174 sends all items with same `tax_pct: gstPct` — confirms bug #1
- finding: api.js createPOFull creates PO with status 'Draft' but no approval workflow exists — bug #2
- finding: getMasterData (api.js:278) uses `legacy_paid` for balance — updated on reconcile after remit. BUT createPaymentRequest does NOT update balance. Need to verify actual flow.
- finding: reconcileRemittedPaymentsToPOLedger only runs after bulkRemitPayments — remittance logic is CORRECT already in backend. Frontend display issue only.
- finding: PaymentsView.js line 389 shows Mail button for remitted payments only — bug #6 is already partially fixed
- finding: Sidebar.js line 59-64 filters by `item.roles` only but NOT by feature permissions from DB — bug #7 critical
- finding: globals.css :root has `--background: 0 0% 100%` (pure white) — confirms bug #5
- finding: StateProvider does NOT fetch feature permissions from DB on boot — permissions never applied to UI

## Root Causes

### Bug 1 (GST per item)
POsView items array has no `gstPct` field per item. All items share one `gstPct` state.

### Bug 2 (PO Approval)
No approval state machine. `createPOFull` sets status='Draft'. No approve/reject API. No UI workflow.

### Bug 3 (TDS in POs)
POsView has `tdsSection` and `tdsPct` states but they're NOT included in item calculations or the summary display. The form shows GST dropdown but no TDS section in the summary panel.

### Bug 4 (Remittance Logic)
Backend is correct — `reconcileRemittedPaymentsToPOLedger` runs after `bulkRemitPayments`. However frontend `PaymentsView` shows "BALANCE AFTER THIS REQUEST" which misleads users into thinking balance deducted immediately. Also `getMasterData` uses `legacy_paid` which is only updated on reconcile. This is correct. No actual bug — just UI display issue in "balance after request" preview.

### Bug 5 (Light Mode)
`globals.css :root` uses `--background: 0 0% 100%` (pure white), `--card: 0 0% 100%`, `--muted: 210 40% 96.1%` — all very bright.

### Bug 6 (Payment Advice)
`PaymentsView.js` line 389 checks for remitted status to show Mail button — already correct for the remitted case. But `sendPaymentAdvice` API has no status check — rejected payments can still receive advice via direct API call.

### Bug 7 (Role-Based Permissions)
`StateProvider` never loads feature permissions from DB. `Sidebar` only checks `item.roles` (hardcoded admin/director for settings). Feature permissions matrix is saved to DB but never enforced in the frontend navigation or backend API calls.
