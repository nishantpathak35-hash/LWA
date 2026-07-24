---
status: resolved
trigger: "tds amount is not showing in paid amount in p.o and payment request, i have seen many line items from the reports has been auto deleted ,which should not have been done never - pls bring them back and identify why has it happened"
---

# Symptoms
- **Expected behavior**: 
  1. TDS amount must be included in PO and Payment Request total paid amount calculations (Gross Paid = Net Transferred + TDS Withheld).
  2. Report views should show all matching payment request line items, and deduplication logic must never delete manual payment records.
- **Actual behavior**: 
  1. PO ledger reconciliation and read APIs were subtracting `tds_amount` when calculating `totalPaid`, leaving POs partially paid by the TDS amount.
  2. `deduplicateSystemPayments` grouped by `po_no, pr_key` without excluding `pr_key IS NULL`, deleting manual payments for POs with multiple manual payments. Furthermore, `getPaymentReportRows` filtered out pending items when `All` was selected.

# Root Cause Analysis
1. **TDS & Paid Amount Issue**: Calculations in `reconcileRemittedPaymentsToPOLedger`, `purchase-orders/read.js`, and `paymentCalculations.js` subtracted `tds_amount` from `approved_amount`. In accounting, TDS is tax paid to the government on behalf of the vendor towards the PO value, so total PO paid amount is Gross (`approved_amount`), not Net.
2. **Missing Report Line Items & Auto-Deletion Issue**:
   - `deduplicateSystemPayments` executed `DELETE FROM system_payments WHERE po_no = ? AND pr_key IS NULL AND id != keep_id`, causing manual payments on the same PO to be treated as duplicates of each other and deleted.
   - `getPaymentReportRows` in `app/lib/api/reports.js` had `if (type === 'all' && r.status === 'pending') return false`, hiding pending payment request line items when viewing the "All" report.

# Fixes Applied
1. **Updated PO & Payment Calculations**:
   - Updated `reconcileRemittedPaymentsToPOLedger` in `app/lib/api/payments/other.js` to sum `COALESCE(pr.approved_amount, pr.amount_requested, 0)` for remitted PRs + manual payments.
   - Updated `app/lib/api/purchase-orders/read.js` to set `amount` to the Gross Approved Amount (including TDS) while providing `net_amount` and `tds_amount` separately.
   - Updated `getSystemPaymentTotal` and project outflow queries in `app/lib/paymentCalculations.js` to use Gross Approved Amounts.
2. **Prevented Deletion of Manual Payments**:
   - Updated `deduplicateSystemPayments` in `app/lib/api/dashboard.js` to only target `pr_key IS NOT NULL AND pr_key NOT LIKE 'MANUAL-%'`, protecting all manual payments from deletion.
3. **Restored Report Visibility**:
   - Removed the filter in `getPaymentReportRows` ([app/lib/api/reports.js](file:///c:/Users/Lenovo/Desktop/Final/app/lib/api/reports.js)) that excluded pending payment requests when viewing the "All" report type.
4. **Re-reconciled PO Ledgers**:
   - Executed PO ledger reconciliation across all purchase orders to reflect Gross Paid Amounts (including TDS).
