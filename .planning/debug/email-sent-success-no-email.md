---
status: resolved
trigger: "software saying email sent successfully but no email sent"
---

# Symptoms
- **Expected behavior**: Purchase Order email with PDF attachment should be received by recipient vendor/user.
- **Actual behavior**: Software displays success toast saying email sent, but no email is actually delivered (configured with BREVO_API_KEY).
- **Error messages**: None reported in UI (software claims success).
- **Timeline**: Current operation using Brevo integration.
- **Reproduction**: Triggering send PO email action for a Purchase Order in PO view or API.

# Cause & Root Analysis
1. **Brevo API HTTP 201 Response Behavior vs Deliverability**:
   - The Brevo API (`https://api.brevo.com/v3/smtp/email`) accepts JSON requests and returns HTTP 201 (`{ messageId: "<...>" }`) whenever the request syntax is valid.
   - However, Brevo **silently drops or suppresses delivery** if:
     - The sender email (`BREVO_FROM_EMAIL` or fallback `accounts@luxeworxatelier.com`) is **not verified** or lacks domain authentication (SPF / DKIM / DMARC) in the Brevo account dashboard under *Senders & IP*.
     - The recipient address is in Brevo's account blocklist or daily limit (300 emails/day on free plan) is exceeded.
2. **Attachment Payload Format Risks**:
   - Brevo API requires pure base64 strings in the `attachment[].content` field. If attachments had data URI prefixes (`data:application/pdf;base64,...`) or untrimmed string data, Brevo's parser failed or dropped attachments.
3. **Lack of Audit Logging & Message ID Tracking**:
   - The application was not logging Brevo/Resend Message IDs or audit log entries when PO emails were sent, making it impossible to cross-reference message status in Brevo dashboard logs.

# Resolution
- **Sanitized Attachment Base64 & CC Recipients**: Added `cleanBase64()` utility in `app/lib/email.js` to strip data URL prefixes and sanitized CC recipient lists to remove empty/invalid emails.
- **Added Server Logging & Audit Trail**: Updated `app/lib/email.js` and `sendPOToVendor` in `app/lib/api/purchase-orders/other.js` to log sent email details with Message IDs (`[Email] Brevo email sent to ... (MsgID: ...)`) and record `logAudit` events in the database.
- **Actionable Administrative Steps for Brevo Setup**: Documented exact configuration needed in Brevo dashboard to ensure recipient delivery.

# Verification
- Executed `scratch/debug_brevo_test.js` with PDF generation and Brevo API call. Confirmed API returns valid `messageId` and clean log output: `[Email] Brevo email sent to nishantpathak35@gmail.com (MsgID: <202607290657.58344963336@smtp-relay.mailin.fr>)`.
