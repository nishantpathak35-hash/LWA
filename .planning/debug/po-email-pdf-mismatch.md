---
status: resolved
trigger: sent P.O not matching with the system generated - restore 2 days before git of the module
created: 2026-08-05
updated: 2026-08-05
---

# Debug Session: PO Email PDF Mismatch

## Root Cause
Email falls back to outdated server-side jsPDF generator (poPdfGenerator.js, last updated Jul 29)
when the client iframe html2pdf fails. HTML view was updated Aug 4-5.

## Fix Plan
Restore Aug 4 (0951a37) state for POsView.js generatePOPdfFromHtml section.
Update poPdfGenerator.js to match current HTML view layout.
