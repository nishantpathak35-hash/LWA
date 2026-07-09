---
status: resolved
trigger: "approval mechanism flawed in purcahe order is being approved by procurement , actual it should be submitted by procurement and approved by either finance or director"
created: 2026-07-02
---

# Debug Session: po-approval-flawed-procurement

## Symptoms
- **Expected behavior:** PO should be available for approval only for finance & director roles.
- **Actual behavior:** PO is being approved by procurement users (e.g., `ritesh@luxeworxatelier.com`).
- **Error messages:** None, the system allows the action.
- **Timeline:** Currently observed on PO/26-27/042.
- **Reproduction:** Procurement user opens a PO and is able to approve it instead of just submitting it.

## Root Cause
Both the frontend (`POsView.js`) and the backend (`app/lib/api/purchase-orders/approve.js`) erroneously included `procurement` (and its variants `proc`, `maker`) in the list of roles permitted to approve a PO, when they should only be allowed to create and submit POs.

## Fix
- Modified `app/lib/api/purchase-orders/approve.js` to remove `procurement`, `proc`, and `maker` from the `canApprove` check.
- Modified `components/views/POsView.js` to remove `isProcurement` from the `canApprove` check.
Now only users with `director`, `admin`, or `finance` roles have permission to approve Purchase Orders.

## Evidence
- Found in `app/lib/api/purchase-orders/approve.js` line 55: `const canApprove = roles.includes('director') || roles.includes('admin') || roles.includes('finance') || roles.some(r => ['procurement', 'proc', 'maker'].includes(r));`
- Found in `components/views/POsView.js` line 137: `const canApprove   = isDirector || isAdmin || isFinance || isProcurement;`

## Verification
- Code review confirms that the `isProcurement` boolean is no longer part of the `canApprove` computation on the client side.
- Code review confirms that `['procurement', 'proc', 'maker']` is no longer permitted to execute the approval endpoint on the backend side.
