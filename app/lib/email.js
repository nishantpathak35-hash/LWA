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

async function sendEmailData({ toEmail, cc, subject, html, attachments }) {
  if (process.env.BREVO_API_KEY) {
    const brevoPayload = {
      sender: { name: COMPANY, email: process.env.BREVO_FROM_EMAIL || 'accounts@luxeworxatelier.com' },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: html
    };
    if (cc && Array.isArray(cc) && cc.length > 0) {
      brevoPayload.cc = cc.map(email => ({ email }));
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
      to: [toEmail],
      subject: subject,
      html
    };
    if (cc && Array.isArray(cc) && cc.length > 0) {
      payload.cc = cc;
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
