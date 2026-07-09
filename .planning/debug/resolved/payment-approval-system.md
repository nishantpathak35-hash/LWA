---
status: investigating
trigger: "Completely fix the Payment Approval System: incorrect approval payment summary, broken Submit for Approval flow, and incorrect PO eligibility logic."
created: 2026-06-23
updated: 2026-06-23
---

# Debug Session: payment-approval-system

## Symptoms

1. Expected behavior: Payment approval summary values must be calculated from fresh database data through one centralized service shared by Payment Request, Payment Approval, Dashboard, PO Details, Reports, and Project Summary Card. For the selected PO, it must calculate total PO value, project inflow, current PO outflow, approved payments, pending payments, rejected/cancelled/draft exclusions, current payment amount, outflow after approval, remaining PO balance, inflow %, and outflow %. The payment being approved must be counted exactly once.
2. Actual behavior: Payment approval summary values are incorrect, including PO Outflow, Outflow %, Remaining Balance, Outflow After Approval, and dependent calculations. Existing logic may be duplicated, stale, frontend-state-driven, or inconsistent across views.
3. Expected behavior: Submit for Approval should validate the payment, create the approval workflow and levels, update payment status from Draft to Pending Approval, record approval history, generate audit logs, send notifications once, and refresh dashboards immediately.
4. Actual behavior: Submit for Approval sometimes does nothing, fails silently, does not create the approval workflow, and does not change payment status.
5. Expected behavior: Purchase orders are eligible for payment requests unless their status is Draft or Cancelled. Pending Approval, Under Approval, Waiting Approval, Approved, Partially Approved, Issued, Sent, Active, Open, Completed where allowed, and other active statuses should be included consistently.
6. Actual behavior: The application only considers Approved purchase orders eligible in some places. Filtering is likely duplicated across UI, APIs, RPC, validation, dashboards, reports, dropdowns, and search.
7. Errors: No concrete stack trace supplied. Silent failures and missing user feedback are part of the issue.
8. Timeline: Current production-critical issue. Existing active sessions overlap with PO/payment financial bugs, but this session is scoped to payment approval root causes.
9. Reproduction: Use Payment Request and Payment Approval flows, including selecting a PO, viewing approval summary, clicking Submit for Approval, checking workflow/history/audit/dashboard effects, and checking PO dropdown/search/report eligibility.

## Current Focus

- hypothesis: Root causes confirmed and patched: PO eligibility used duplicated approved-only checks, approval summary used stale project-only aggregation, and workflow mutation responses reported success even when individual rows failed.
- test: Targeted lint/syntax checks and production Webpack build pass.
- expecting: Payment request creation now accepts every PO except Draft/Cancelled; approval summary is recalculated from fresh DB data through a shared service; workflow failures surface to the UI.
- next_action: manual UAT against live data for one pending payment request and one non-approved active PO
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-23T00:00:00+05:30
- finding: `components/views/PaymentsView.js` filtered PO dropdown options through a local hard-coded approved/active/open/billed list instead of a reusable eligibility rule.
- finding: `app/lib/api.js:createPaymentRequest` rejected payment requests unless PO status was approved or active, contradicting the business rule that only Draft and Cancelled are excluded.
- finding: `app/lib/api.js:getProjectFinancialSummary` used a project summary cache and summed only `legacy_paid` plus `Ready to Remit`, which missed pending approvals and could stale-read after mutations.
- finding: `bulkApprovePayments`, `bulkRejectPayments`, and `bulkRemitPayments` returned `ok: true` even when per-row failures occurred, allowing the UI to close without meaningful error feedback.
- finding: `bulkRemitPayments` inserted into `system_payments` without checking for an existing `pr_key`, risking duplicate remittance records on retries.
- finding: `components/views/PaymentsView.js` still treated the main tab as "All Requests", so approved/rejected/remitted rows could remain visible in Payment Requests instead of moving to Reports.
- finding: `components/views/ReportsView.js` listed payment report rows but had no payment advice action, so remitted rows lost their email action after leaving Payment Requests.
- finding: `getPaymentReportRows` returned pending rows for the All report, mixing active workflow items with completed report items.

## Eliminated

## Resolution

- root_cause: Payment approval business rules were duplicated across UI and backend. Approval financial summary was not a fresh PO-scoped database calculation, and workflow mutation APIs hid per-row errors.
- fix: Added shared PO eligibility and payment calculation services; wired backend validation, master data, PO vendor results, project details, approval summary, and payment UI to those helpers; changed workflow mutation responses to fail when any requested row fails; added duplicate remittance guard; changed Payment Requests to show only active/pending work; moved approved/rejected/remitted rows into Reports; added payment advice email action to remitted report rows.
- verification: `npm.cmd exec eslint -- app/lib/api.js app/lib/paymentCalculations.js app/lib/poEligibility.js components/views/PaymentsView.js components/views/ReportsView.js app/api/rpc/route.js` passed. `node --check` passed for changed server modules. `npx.cmd next build --webpack` passed.
- files_changed: app/lib/poEligibility.js, app/lib/paymentCalculations.js, app/lib/api.js, components/views/PaymentsView.js, components/views/ReportsView.js, app/api/rpc/route.js
