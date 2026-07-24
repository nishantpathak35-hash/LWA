---
status: resolved
trigger: "error while click on remit under report-method not allwed"
---

# Symptoms
- **Expected behavior**: Clicking Remit under Report view opens modal, submits UTR, and remits payment successfully without API error.
- **Actual behavior**: "Method not allowed: remitPaymentRequest" error occurs when submitting remittance from Report view.
- **Error messages**: 405 Method Not Allowed: remitPaymentRequest
- **Timeline**: Discovered during Reports view remittance execution.
- **Reproduction**: Navigate to Reports view -> Select 'Remit' report-method/filter or click 'Remit' action on payment -> Enter UTR and click submit -> API call fails with Method Not Allowed.

# Resolution
- **Root Cause**: `ReportsView.js` calls `call('remitPaymentRequest', selectedRemitPayment.id, utr.trim(), '')` when submitting remittance for a payment request. However, `remitPaymentRequest` was neither exported in the backend API layer (`app/lib/api/payments/other.js`, `app/lib/api/payments.js`, `app/lib/api.js`) nor registered in `ALLOWED_METHODS` in `app/api/rpc/route.js`.
- **Fix Applied**:
  1. Created and exported `remitPaymentRequest` in `app/lib/api/payments/other.js` which delegates single remittance processing safely to `bulkRemitPayments`.
  2. Exported `remitPaymentRequest` in `app/lib/api/payments.js` and re-exported it in `app/lib/api.js`.
  3. Added `'remitPaymentRequest'` to `ALLOWED_METHODS` set in `app/api/rpc/route.js`.
