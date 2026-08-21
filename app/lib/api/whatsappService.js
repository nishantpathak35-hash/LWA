import { queryGet, queryAll, queryRun } from '../db.js';
import { enqueueWhatsAppMessage } from '../whatsapp.js';
import { logAudit } from './core.js';

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
};

/**
 * Validates and gets the recipient's internal WhatsApp number.
 */
async function getInternalWhatsAppNumber(email) {
  const user = await queryGet(`SELECT name, whatsapp_number, mobile_number FROM users WHERE email = ? AND active = 1`, [email]);
  if (!user) throw new Error("User not found or inactive.");
  const number = user.whatsapp_number || user.mobile_number;
  if (!number) throw new Error("Selected user does not have a registered WhatsApp number. Please update the User Master.");
  return { number, name: user.name };
}

/**
 * Validates and gets the vendor's WhatsApp number.
 */
async function getVendorWhatsAppNumber(vendorCode, preferredContact = null) {
  const vendor = await queryGet(`SELECT legal_name, whatsapp_number, mobile_number, primary_contact_no, accounts_contact_no, purchase_contact_no, preferred_whatsapp_contact FROM vendors WHERE vendor_code = ?`, [vendorCode]);
  if (!vendor) throw new Error("Vendor not found.");

  let numberToUse = null;
  const pref = preferredContact || vendor.preferred_whatsapp_contact || 'Primary';

  switch (pref.toLowerCase()) {
    case 'accounts':
      numberToUse = vendor.accounts_contact_no;
      break;
    case 'purchase':
      numberToUse = vendor.purchase_contact_no;
      break;
    case 'primary':
    default:
      numberToUse = vendor.primary_contact_no || vendor.whatsapp_number || vendor.mobile_number;
      break;
  }

  if (!numberToUse) {
     numberToUse = vendor.whatsapp_number || vendor.mobile_number || vendor.primary_contact_no;
  }

  if (!numberToUse) throw new Error("Vendor WhatsApp number is missing. Please update the Vendor Master.");
  
  return { number: numberToUse, name: vendor.legal_name };
}

/**
 * Send internal message
 */
export async function sendInternalWhatsApp(recipientEmail, selectedRecords, moduleName, recordIds, session) {
  const senderEmail = session?.email || 'System';
  const { number, name } = await getInternalWhatsAppNumber(recipientEmail);
  const sender = await queryGet(`SELECT name FROM users WHERE email = ?`, [senderEmail]);
  
  let innerMsg = '';
  if (moduleName.toLowerCase().includes('payment')) {
    innerMsg = formatBulkPaymentMessage(selectedRecords);
  } else {
    // Generic formatter
    innerMsg = `📋 *${moduleName} Review*\n\nPlease review the following records:\n`;
    
    // Group by project if available
    const byProject = {};
    let totalAmount = 0;
    
    selectedRecords.forEach(r => {
      const proj = r.project || 'General';
      if (!byProject[proj]) byProject[proj] = [];
      byProject[proj].push(r);
      const amt = Number(r.amount || r.gross_amount || r.total_amount || 0);
      if (!isNaN(amt)) totalAmount += amt;
    });

    for (const [project, items] of Object.entries(byProject)) {
      if (project !== 'General') innerMsg += `\n🏗️ *Project:* ${project}\n`;
      items.forEach((item, index) => {
        innerMsg += `\n🔸 *Record ${index + 1}*\n`;
        if (item.vendor_name || item.vendor) innerMsg += `👤 *Vendor:* ${item.vendor_name || item.vendor}\n`;
        if (item.po_no) innerMsg += `📄 *PO No:* ${item.po_no}\n`;
        if (item.invoice_ref || item.invoice_no) innerMsg += `🧾 *Invoice:* ${item.invoice_ref || item.invoice_no}\n`;
        
        const amt = Number(item.amount || item.gross_amount || item.total_amount || 0);
        if (amt > 0) innerMsg += `💰 *Amount:* ${formatCurrency(amt)}\n`;
        
        const date = item.due_date || item.created_at || item.date;
        if (date) innerMsg += `📅 *Date:* ${formatDate(date)}\n`;
        
        if (item.status || item.stage) innerMsg += `🚥 *Status:* ${item.status || item.stage}\n`;
      });
      innerMsg += `\n〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
    }

    innerMsg += `\n📊 *Summary*\n`;
    innerMsg += `Total Records: *${selectedRecords.length}*\n`;
    if (totalAmount > 0) innerMsg += `Total Amount: *${formatCurrency(totalAmount)}*\n`;
    innerMsg += `\nPlease review.\n\nRegards,\n🏢 *ERP System*`;
  }
  
  // Let's refine `fullMessage`.
  let fullMessage = `🔔 *Internal Notification from ${sender?.name || senderEmail}*\n\n${innerMsg}`;
  
  await enqueueWhatsAppMessage(number, fullMessage);
  
  // stringify recordIds for DB
  const recStr = Array.isArray(recordIds) ? recordIds.join(', ') : recordIds;
  await logWhatsAppAudit(senderEmail, name, number, moduleName, recStr, selectedRecords.length);
  
  return { ok: true, recipient: name };
}

/**
 * Format Bulk Payment Request Message
 */
export function formatBulkPaymentMessage(payments) {
  if (!payments || payments.length === 0) return '';
  
  // Group by project
  const byProject = {};
  let totalAmount = 0;
  let totalCount = 0;
  
  payments.forEach(p => {
    const proj = p.project || 'General';
    if (!byProject[proj]) byProject[proj] = [];
    byProject[proj].push(p);
    totalAmount += Number(p.amount_requested || p.approved_amount || p.gross_amount || 0);
    totalCount++;
  });
  
  let msg = `💸 *Payment Approval Request*\n\nPlease review the following payment requests:\n`;
  
  for (const [project, items] of Object.entries(byProject)) {
    if (project !== 'General') msg += `\n🏗️ *Project:* ${project}\n`;
    items.forEach((item, index) => {
      const amt = Number(item.amount_requested || item.approved_amount || item.gross_amount || 0);
      msg += `\n🔸 *Request ${index + 1}*\n`;
      msg += `👤 *Vendor:* ${item.vendor_name}\n`;
      msg += `📄 *PO No:* ${item.po_no}\n`;
      msg += `🧾 *Invoice:* ${item.invoice_ref || item.invoice_no || 'N/A'}\n`;
      msg += `💰 *Amount:* ${formatCurrency(amt)}\n`;
      msg += `⏳ *Due Date:* ${formatDate(item.due_date || item.created_at)}\n`;
      msg += `🚥 *Status:* ${item.stage}\n`;
    });
    msg += `\n〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
  }
  
  msg += `\n📊 *Summary*\n`;
  msg += `Total Payments: *${totalCount}*\n`;
  msg += `Total Amount: *${formatCurrency(totalAmount)}*\n\n`;
  msg += `Please review and approve.\n\nRegards,\n🏢 *ERP System*`;
  
  return msg;
}



/**
 * Audit log helper
 */
async function logWhatsAppAudit(sender, recipientName, recipientMobile, moduleName, recordIds, count) {
  const description = `Sent WhatsApp to ${recipientName} (${recipientMobile}) - Records: ${recordIds} (${count} items)`;
  await logAudit(sender, 'WhatsApp Sent', description, moduleName);
}

export async function whatsappPO(poNo, session, preferredContactOverride = null) {
  const senderEmail = session?.email || 'System';
  const po = await queryGet(`SELECT vendor_code, vendor_name FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) throw new Error("PO not found.");
  
  const { number, name } = await getVendorWhatsAppNumber(po.vendor_code, preferredContactOverride);
  
  const msg = `📦 *Purchase Order Issued*\n\nDear *${name}*,\n\nPlease find attached Purchase Order *${poNo}*.\n\nIf you have any questions, please reach out to us.\n\nRegards,\n🏢 *ERP System*`;
  // We can also attach PDF later using mediaUrl
  await enqueueWhatsAppMessage(number, msg);
  await logWhatsAppAudit(senderEmail, name, number, 'Purchase Orders', poNo, 1);
  return { ok: true, recipient: name };
}

export async function whatsappPaymentAdvice(prId, session) {
  const senderEmail = session?.email || 'System';
  const pr = await queryGet(`SELECT vendor_code, vendor_name, po_no, project, approved_amount FROM payment_requests WHERE pr_id = ?`, [prId]);
  if (!pr) throw new Error("Payment request not found.");
  
  const { number, name } = await getVendorWhatsAppNumber(pr.vendor_code);
  
  const amt = Number(pr.approved_amount || 0);
  const msg = `💸 *Payment Advice*\n\nDear *${name}*,\n\nWe have successfully remitted a payment of *${formatCurrency(amt)}* towards Purchase Order *${pr.po_no}* for the project *${pr.project}*.\n\nThank you for your business!\n\nRegards,\n🏢 *ERP System*`;
  
  await enqueueWhatsAppMessage(number, msg);
  await logWhatsAppAudit(senderEmail, name, number, 'Payment Advice', prId, 1);
  return { ok: true, recipient: name };
}
