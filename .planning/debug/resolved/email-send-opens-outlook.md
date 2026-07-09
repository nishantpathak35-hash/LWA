---
status: resolved
trigger: the email send option opening outlook , it should be sent through bravo email earlier it was working fine
created: 2026-07-02T17:08:00+05:30
updated: 2026-07-02T17:15:00+05:30
root_cause: The POListTable component was hardcoded to use a `mailto:` link for the "Email PO" button instead of making the backend API call to Bravo email via `sendPOToVendor`.
fix: Added a `handleSendPOEmail` function in `POsView.js` that calls `sendPOToVendor` and prompts for the email address, then passed this function into `POListTable.js` to handle the "Email PO" button click.
---

# Symptoms
- **Expected behavior**: It should send through Bravo email without opening Outlook
- **Actual behavior**: It opens Outlook instead of sending through Bravo email
- **Error messages**: No error messages, it just opens Outlook
- **Timeline**: It worked earlier, not sure when it stopped
- **Reproduction**: Clicking the 'Send Email' button in POsView

# Resolution
The "Email PO" action now correctly triggers the Bravo email integration using the `sendPOToVendor` API instead of opening the local Outlook client.

# Evidence
- timestamp: 2026-07-02T17:08:00+05:30
  event: session started
- timestamp: 2026-07-02T17:09:00+05:30
  event: found mailto link in POListTable.js
- timestamp: 2026-07-02T17:10:00+05:30
  event: found sendPOToVendor in backend RPC routes
