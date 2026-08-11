import { Resend } from 'resend';

let resend;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.RESEND_FROM_EMAIL || 'Luxeworx Finance <onboarding@resend.dev>';
const COMPANY = 'Luxeworx Atelier Interiors Pvt Ltd';
const APP_URL = 'https://lwa-iota.vercel.app';

function handleResendError(error, defaultMsg) {
  if (!error) return;
  let msg = error.message || defaultMsg;
  if (
    /sandbox|verify|restriction|permission|onboarding|domain|authenticate/i.test(msg) ||
    error.statusCode === 403 ||
    error.status === 403
  ) {
    msg += ' (Tip: In Resend sandbox mode, you can only send to your verified account email. Verify your domain in Resend to send to anyone)';
  }
  throw new Error(msg);
}

export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(clean) ? clean : null;
}

export function normalizeEmailList(input) {
  if (!input) return [];
  let rawList = [];
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) rawList = parsed;
      else rawList = [input];
    } catch {
      rawList = [input];
    }
  } else if (Array.isArray(input)) {
    rawList = input;
  }

  const validEmails = [];
  for (const item of rawList) {
    if (!item) continue;
    let str = typeof item === 'string' ? item : (typeof item === 'object' && item !== null ? item.email || '' : '');
    if (!str || typeof str !== 'string') continue;

    const parts = str.split(/[,;\s]+/);
    for (const part of parts) {
      const sanitized = sanitizeEmail(part);
      if (sanitized && !validEmails.includes(sanitized)) {
        validEmails.push(sanitized);
      }
    }
  }
  return validEmails;
}

async function sendEmailData({ toEmail, cc, subject, html, attachments }) {
  const sanitizedTo = sanitizeEmail(toEmail);
  if (!sanitizedTo) {
    throw new Error(`Invalid recipient email address: "${toEmail || ''}"`);
  }
  const sanitizedCc = normalizeEmailList(cc);

  if (process.env.BREVO_API_KEY) {
    const brevoPayload = {
      sender: { name: COMPANY, email: process.env.BREVO_FROM_EMAIL || 'accounts@luxeworxatelier.com' },
      to: [{ email: sanitizedTo }],
      subject: subject,
      htmlContent: html
    };
    if (sanitizedCc.length > 0) {
      brevoPayload.cc = sanitizedCc.map(email => ({ email }));
    }
    if (attachments && attachments.length > 0) {
      brevoPayload.attachment = attachments.map(att => ({
        name: att.filename,
        content: att.content // Base64 string
      }));
    }
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(brevoPayload)
    });
    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`Brevo API failed: ${errTxt}`);
    }
    const data = await response.json();
    return { sent: true, id: data.messageId };
  } else if (resend) {
    const payload = {
      from: FROM,
      to: [sanitizedTo],
      subject: subject,
      html
    };
    if (sanitizedCc.length > 0) {
      payload.cc = sanitizedCc;
    }
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content // Base64 string or Buffer
      }));
    }
    const { data, error } = await resend.emails.send(payload);
    if (error) handleResendError(error, 'Failed to send email via Resend');
    return { sent: true, id: data?.id };
  } else {
    throw new Error('Email configuration missing: Neither BREVO_API_KEY nor RESEND_API_KEY is defined in environment variables.');
  }
}

// ── User Invite Email ────────────────────────────────────────────────────────
export async function sendInviteEmail({ toEmail, toName, inviteUrl, roles }) {
  const roleList = (roles || []).join(', ') || 'User';
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0b0f;color:#e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#c8a45a,#a07840);padding:32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.5px">${COMPANY}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Finance Operations Platform</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#c8a45a;font-size:18px;margin:0 0 16px">You've been invited!</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 12px">Hello ${toName || toEmail},</p>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px">
        You've been added to the <strong style="color:#e2e8f0">${COMPANY}</strong> Finance Operations platform with the following access: <strong style="color:#c8a45a">${roleList}</strong>.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${inviteUrl}" style="background:linear-gradient(135deg,#c8a45a,#a07840);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
          Set Your Password & Login
        </a>
      </div>
      <p style="color:#64748b;font-size:12px;line-height:1.6;margin:24px 0 0">
        If the button doesn't work, copy this link:<br>
        <a href="${inviteUrl}" style="color:#c8a45a;word-break:break-all">${inviteUrl}</a>
      </p>
      <p style="color:#64748b;font-size:12px;margin:16px 0 0">This invite link is valid for 7 days.</p>
    </div>
    <div style="background:#0d0e14;padding:16px 32px;border-top:1px solid #1e2330;text-align:center">
      <p style="color:#475569;font-size:11px;margin:0">${COMPANY} · Finance Operations Platform</p>
    </div>
  </div>`;

  return sendEmailData({
    toEmail,
    subject: `You've been invited to ${COMPANY} Finance Platform`,
    html
  });
}

// ── Payment Advice Email ─────────────────────────────────────────────────────
export async function sendPaymentAdviceEmail({ toEmail, cc, vendorName, poNo, project, amount, grossAmount, tdsAmount, remittanceRef, paymentDate }) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0b0f;color:#e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#c8a45a,#a07840);padding:32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px">${COMPANY}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Payment Advice Note</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#c8a45a;font-size:18px;margin:0 0 8px">Payment Advice</h2>
      <p style="color:#94a3b8;margin:0 0 24px">Dear <strong style="color:#e2e8f0">${vendorName}</strong>,</p>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px">
        This is to inform you that a payment has been processed against your account. Please find the details below:
      </p>
      <table style="width:100%;border-collapse:collapse;background:#0d0e14;border-radius:8px;overflow:hidden">
        <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #1e2330">PO Number</td><td style="padding:12px 16px;color:#e2e8f0;font-weight:600;border-bottom:1px solid #1e2330">${poNo || '—'}</td></tr>
        <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #1e2330">Project</td><td style="padding:12px 16px;color:#e2e8f0;border-bottom:1px solid #1e2330">${project || '—'}</td></tr>
        <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #1e2330">Approved Amount</td><td style="padding:12px 16px;color:#e2e8f0;border-bottom:1px solid #1e2330">₹${Number(grossAmount || 0).toLocaleString('en-IN')}</td></tr>
        <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #1e2330">TDS Deducted</td><td style="padding:12px 16px;color:#f87171;border-bottom:1px solid #1e2330">₹${Number(tdsAmount || 0).toLocaleString('en-IN')}</td></tr>
        <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #1e2330">Net Amount Paid</td><td style="padding:12px 16px;color:#3dd68c;font-weight:700;font-size:16px;border-bottom:1px solid #1e2330">₹${Number(amount || 0).toLocaleString('en-IN')}</td></tr>
        ${remittanceRef ? `<tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #1e2330">Reference / UTR</td><td style="padding:12px 16px;color:#c8a45a;font-family:monospace;border-bottom:1px solid #1e2330">${remittanceRef}</td></tr>` : ''}
        <tr><td style="padding:12px 16px;color:#64748b;font-size:13px">Payment Date</td><td style="padding:12px 16px;color:#e2e8f0">${paymentDate || new Date().toLocaleDateString('en-IN')}</td></tr>
      </table>
      <p style="color:#64748b;font-size:12px;line-height:1.6;margin:24px 0 0">
        If you have any queries, please contact our finance team.<br>
        Thank you for your services.
      </p>
    </div>
    <div style="background:#0d0e14;padding:16px 32px;border-top:1px solid #1e2330;text-align:center">
      <p style="color:#475569;font-size:11px;margin:0">${COMPANY} · Finance Operations</p>
    </div>
  </div>`;

  return sendEmailData({
    toEmail,
    cc,
    subject: `Payment Advice — ${poNo || 'Payment'} — ₹${Number(amount || 0).toLocaleString('en-IN')}`,
    html
  });
}

// ── PO Email ─────────────────────────────────────────────────────────────────
export async function sendPOEmail({ toEmail, cc, vendorName, poNo, project, poDate, items, grandTotal, terms, attachments }) {
  const formattedTotal = Number(grandTotal || 0).toLocaleString('en-IN');
  const projectName = project || 'N/A';
  
  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;line-height:1.6;font-size:15px;background:#ffffff;padding:32px;">
    
    <h2 style="margin:0 0 24px 0;font-size:20px;font-weight:600;color:#111827;">Purchase Order</h2>
    
    <p style="margin:0 0 16px 0;">Dear ${vendorName},</p>
    
    <p style="margin:0 0 24px 0;">
      Attached is Purchase Order <strong>${poNo}</strong> for the <strong>${projectName}</strong> project.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

    <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0;">
      <tr>
        <td style="padding:0 0 12px 0;width:50%;">
          <div style="font-size:13px;color:#6b7280;margin-bottom:2px;">PO Number</div>
          <div style="font-weight:500;">${poNo}</div>
        </td>
        <td style="padding:0 0 12px 0;width:50%;">
          <div style="font-size:13px;color:#6b7280;margin-bottom:2px;">Project</div>
          <div style="font-weight:500;">${projectName}</div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0;">
          <div style="font-size:13px;color:#6b7280;margin-bottom:2px;">Order Value</div>
          <div style="font-weight:500;">₹${formattedTotal}</div>
        </td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

    <h3 style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#111827;">Action Required</h3>
    <ul style="margin:0 0 32px 0;padding-left:20px;color:#374151;">
      <li style="margin-bottom:8px;">Review the attached Purchase Order.</li>
      <li style="margin-bottom:8px;">Confirm receipt.</li>
      <li style="margin-bottom:0;">Contact Procurement if any clarification is required.</li>
    </ul>

    <p style="margin:0 0 16px 0;">Regards,</p>
    
    <div style="color:#4b5563;">
      <p style="margin:0;">Procurement</p>
      <p style="margin:0;font-weight:500;color:#111827;">${COMPANY}</p>
    </div>
  </div>`;

  return sendEmailData({
    toEmail,
    cc,
    subject: `Purchase Order ${poNo} — ${COMPANY}`,
    html,
    attachments
  });
}

// ── Vendor Onboarding Invitation Email ───────────────────────────────────────
export async function sendVendorOnboardingInviteEmail({ toEmail, inviteUrl, invitedBy }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vendor Onboarding Invitation</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#b8873f,#8a6020);padding:36px 40px;text-align:center">
            <p style="margin:0 0 6px;color:rgba(255,255,255,0.75);font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600">Supplier Onboarding Portal</p>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px">${COMPANY}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <h2 style="margin:0 0 20px;color:#1a1a2e;font-size:20px;font-weight:700">You've Been Invited to Register as a Vendor</h2>
            <p style="margin:0 0 12px;color:#444;font-size:14px;line-height:1.7">Dear Partner,</p>
            <p style="margin:0 0 24px;color:#444;font-size:14px;line-height:1.7">
              <strong style="color:#1a1a2e">${invitedBy || 'Our procurement team'}</strong> has invited you to complete your supplier registration with <strong style="color:#b8873f">${COMPANY}</strong>.
            </p>
            <p style="margin:0 0 16px;color:#444;font-size:14px;line-height:1.7">
              Please click the button below to submit your company details, GST/PAN documents, and banking information through our secure onboarding portal:
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:32px auto">
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#b8873f,#8a6020);border-radius:8px">
                  <a href="${inviteUrl}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px">
                    Complete Vendor Onboarding →
                  </a>
                </td>
              </tr>
            </table>
            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
              <tr>
                <td style="background:#fffbf2;border:1px solid #f0d080;border-radius:8px;padding:16px 20px">
                  <p style="margin:0;color:#7a5c10;font-size:13px;font-weight:600">📎 What you'll need to complete onboarding:</p>
                  <ul style="margin:10px 0 0;padding-left:18px;color:#6b4f15;font-size:13px;line-height:1.8">
                    <li>GST Certificate (PDF / Image)</li>
                    <li>PAN Card Copy</li>
                    <li>Cancelled Cheque or Bank Proof</li>
                    <li>Company Details &amp; Contact Information</li>
                  </ul>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 6px;color:#888;font-size:12px;line-height:1.6">If the button above doesn't work, copy and paste this link in your browser:</p>
            <p style="margin:0 0 24px"><a href="${inviteUrl}" style="color:#b8873f;font-size:12px;word-break:break-all">${inviteUrl}</a></p>
            <p style="margin:0;color:#aaa;font-size:12px">⏱ This onboarding link is valid for <strong>7 days</strong> from receipt of this email.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fa;border-top:1px solid #e8e9eb;padding:20px 40px;text-align:center">
            <p style="margin:0;color:#aaa;font-size:11px">${COMPANY} &nbsp;·&nbsp; Vendor Management System &nbsp;·&nbsp; This is an automated message, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmailData({
    toEmail,
    subject: `Vendor Onboarding Invitation — ${COMPANY}`,
    html
  });
}

// ── Vendor Onboarding Rejection Email ────────────────────────────────────────
export async function sendVendorOnboardingRejectionEmail({ toEmail, legalName, reason }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Onboarding Status Update</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#b8873f,#8a6020);padding:36px 40px;text-align:center">
            <p style="margin:0 0 6px;color:rgba(255,255,255,0.75);font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600">Supplier Onboarding Update</p>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px">${COMPANY}</h1>
          </td>
        </tr>
        <!-- Status Banner -->
        <tr>
          <td style="background:#fff5f5;border-bottom:3px solid #f87171;padding:16px 40px">
            <p style="margin:0;color:#b91c1c;font-size:13px;font-weight:700;text-align:center;letter-spacing:0.5px;text-transform:uppercase">⚠ Action Required — Onboarding Requires Correction</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <p style="margin:0 0 12px;color:#444;font-size:14px;line-height:1.7">Dear <strong style="color:#1a1a2e">${legalName || 'Vendor'}</strong>,</p>
            <p style="margin:0 0 24px;color:#444;font-size:14px;line-height:1.7">
              Thank you for submitting your vendor onboarding registration with <strong style="color:#b8873f">${COMPANY}</strong>. After our vendor management team reviewed your registration, we require the following corrections before your onboarding can be approved:
            </p>
            <!-- Reason Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
              <tr>
                <td style="background:#fff5f5;border-left:4px solid #f87171;border-radius:4px;padding:16px 20px">
                  <p style="margin:0 0 6px;color:#b91c1c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Reason for Review / Rejection:</p>
                  <p style="margin:0;color:#1a1a2e;font-size:14px;line-height:1.6">${reason || 'Required documentation or information was incomplete or mismatched.'}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 12px;color:#444;font-size:14px;line-height:1.7">
              Please reach out to our procurement department or reply to this email for assistance in resolving these issues.
            </p>
            <p style="margin:0;color:#888;font-size:13px;line-height:1.6">
              Our team is available to assist you with re-submission once the required corrections are made.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fa;border-top:1px solid #e8e9eb;padding:20px 40px;text-align:center">
            <p style="margin:0;color:#aaa;font-size:11px">${COMPANY} &nbsp;·&nbsp; Vendor Management System &nbsp;·&nbsp; This is an automated message, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmailData({
    toEmail,
    subject: `Onboarding Status Update — ${legalName || COMPANY}`,
    html
  });
}

// ── Vendor Portal Welcome Email (Sent ONLY when Portal Access = Enabled) ─────
export async function sendVendorPortalWelcomeEmail({ toEmail, vendorName, portalUrl, tempPassword }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vendor Portal Access</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#b8873f,#8a6020);padding:36px 40px;text-align:center">
            <p style="margin:0 0 6px;color:rgba(255,255,255,0.75);font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600">B2B Vendor Portal</p>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px">${COMPANY}</h1>
          </td>
        </tr>
        <!-- Status Banner -->
        <tr>
          <td style="background:#f0fdf4;border-bottom:3px solid #4ade80;padding:16px 40px">
            <p style="margin:0;color:#16a34a;font-size:13px;font-weight:700;text-align:center;letter-spacing:0.5px;text-transform:uppercase">✓ Vendor Approved — Portal Access Granted</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <h2 style="margin:0 0 20px;color:#1a1a2e;font-size:20px;font-weight:700">Welcome to ${COMPANY} Vendor Portal</h2>
            <p style="margin:0 0 12px;color:#444;font-size:14px;line-height:1.7">Dear <strong style="color:#1a1a2e">${vendorName}</strong>,</p>
            <p style="margin:0 0 28px;color:#444;font-size:14px;line-height:1.7">
              Your vendor onboarding is complete and your B2B Vendor Portal access has been <strong style="color:#16a34a">activated</strong>. You can now log in to track Purchase Orders and submit invoices for payment.
            </p>
            <!-- Credentials Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
              <tr>
                <td style="background:#fffbf2;border:1px solid #f0d080;border-radius:8px;padding:20px 24px">
                  <p style="margin:0 0 14px;color:#7a5c10;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Your Login Credentials</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#666;font-size:13px;padding:4px 0;width:130px">Portal URL:</td>
                      <td><a href="${portalUrl}" style="color:#b8873f;font-size:13px;font-weight:600;text-decoration:none">${portalUrl}</a></td>
                    </tr>
                    <tr>
                      <td style="color:#666;font-size:13px;padding:4px 0">Username:</td>
                      <td style="color:#1a1a2e;font-size:13px;font-weight:600">${toEmail}</td>
                    </tr>
                    ${tempPassword ? `<tr>
                      <td style="color:#666;font-size:13px;padding:4px 0">Temp Password:</td>
                      <td><code style="background:#f8f4ea;color:#7a5c10;padding:3px 8px;border-radius:4px;font-size:13px;font-weight:700;font-family:monospace">${tempPassword}</code></td>
                    </tr>` : ''}
                  </table>
                  ${tempPassword ? '<p style="margin:14px 0 0;color:#b8873f;font-size:12px;font-weight:600">⚠ Please change your password after first login.</p>' : ''}
                </td>
              </tr>
            </table>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px">
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#b8873f,#8a6020);border-radius:8px">
                  <a href="${portalUrl}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px">
                    Access Vendor Portal →
                  </a>
                </td>
              </tr>
            </table>
            <!-- Feature list -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f8f9fa;border-radius:8px;padding:16px 20px">
                  <p style="margin:0 0 10px;color:#444;font-size:13px;font-weight:600">Through your portal you can:</p>
                  <ul style="margin:0;padding-left:18px;color:#666;font-size:13px;line-height:1.9">
                    <li>View &amp; download approved Purchase Orders</li>
                    <li>Submit invoice PDFs directly for payment processing</li>
                    <li>Track invoice review &amp; approval status in real time</li>
                  </ul>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fa;border-top:1px solid #e8e9eb;padding:20px 40px;text-align:center">
            <p style="margin:0;color:#aaa;font-size:11px">${COMPANY} &nbsp;·&nbsp; B2B Vendor Portal &nbsp;·&nbsp; This is an automated message, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmailData({
    toEmail,
    subject: `Vendor Portal Access Granted — ${COMPANY}`,
    html
  });
}

