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
  const itemRows = (items || []).map((it, i) => `
    <tr style="border-bottom:1px solid #1e2330">
      <td style="padding:10px 12px;color:#94a3b8;font-size:12px">${i + 1}</td>
      <td style="padding:10px 12px;color:#e2e8f0;font-size:13px">${it.desc || it.description || ''}</td>
      <td style="padding:10px 12px;color:#94a3b8;font-size:12px;text-align:center">${it.qty || 1}</td>
      <td style="padding:10px 12px;color:#94a3b8;font-size:12px;text-align:center">${it.unit || it.uom || 'Nos'}</td>
      <td style="padding:10px 12px;color:#94a3b8;font-size:12px;text-align:right">₹${Number(it.rate || 0).toLocaleString('en-IN')}</td>
      <td style="padding:10px 12px;color:#c8a45a;font-size:13px;font-weight:600;text-align:right">₹${Number(it.amount || 0).toLocaleString('en-IN')}</td>
    </tr>`).join('');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#0a0b0f;color:#e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#c8a45a,#a07840);padding:32px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1 style="margin:0;color:#fff;font-size:22px">${COMPANY}</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px">Finance Operations</p>
      </div>
      <div style="text-align:right">
        <div style="color:#fff;font-size:20px;font-weight:700">PURCHASE ORDER</div>
        <div style="color:rgba(255,255,255,0.9);font-size:14px;margin-top:4px">${poNo}</div>
      </div>
    </div>
    <div style="padding:32px">
      <table style="width:100%;margin-bottom:24px">
        <tr>
          <td style="vertical-align:top;width:50%">
            <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Vendor</div>
            <div style="color:#e2e8f0;font-weight:700;font-size:15px">${vendorName}</div>
          </td>
          <td style="vertical-align:top;text-align:right">
            <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">PO Date</div>
            <div style="color:#e2e8f0">${poDate || new Date().toLocaleDateString('en-IN')}</div>
            <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px">Project</div>
            <div style="color:#c8a45a;font-weight:600">${project || '—'}</div>
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;background:#0d0e14;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#1e2330">
            <th style="padding:10px 12px;color:#64748b;font-size:11px;font-weight:600;text-align:left">#</th>
            <th style="padding:10px 12px;color:#64748b;font-size:11px;font-weight:600;text-align:left">DESCRIPTION</th>
            <th style="padding:10px 12px;color:#64748b;font-size:11px;font-weight:600;text-align:center">QTY</th>
            <th style="padding:10px 12px;color:#64748b;font-size:11px;font-weight:600;text-align:center">UOM</th>
            <th style="padding:10px 12px;color:#64748b;font-size:11px;font-weight:600;text-align:right">RATE</th>
            <th style="padding:10px 12px;color:#64748b;font-size:11px;font-weight:600;text-align:right">AMOUNT</th>
          </tr>
        </thead>
        <tbody>${itemRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#475569">No line items</td></tr>'}</tbody>
        <tfoot>
          <tr style="background:#1e2330">
            <td colspan="5" style="padding:14px 12px;color:#94a3b8;font-weight:600;text-align:right">GRAND TOTAL</td>
            <td style="padding:14px 12px;color:#3dd68c;font-weight:700;font-size:16px;text-align:right">₹${Number(grandTotal || 0).toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>

      ${terms ? `<div style="margin-top:24px;padding:16px;background:#0d0e14;border-radius:8px;border-left:3px solid #c8a45a"><div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Terms & Conditions</div><div style="color:#94a3b8;font-size:13px;line-height:1.6">${terms}</div></div>` : ''}

      <p style="color:#64748b;font-size:12px;margin-top:24px">
        Please acknowledge receipt of this Purchase Order. For queries, contact our procurement team.
      </p>
    </div>
    <div style="background:#0d0e14;padding:16px 32px;border-top:1px solid #1e2330;text-align:center">
      <p style="color:#475569;font-size:11px;margin:0">${COMPANY} · Finance Operations · <a href="${APP_URL}" style="color:#c8a45a">${APP_URL}</a></p>
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
