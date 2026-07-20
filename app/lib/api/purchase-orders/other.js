// Domain: purchase-orders
// Auto-extracted from api.js
import { queryAll, queryGet, queryRun } from '../../db.js';
import { sendInviteEmail, sendPaymentAdviceEmail, sendPOEmail } from '../../email.js';
import { getPOPaymentIneligibilityReason, isPOEligibleForPayment } from '../../poEligibility.js';
import { calculateProjectOutflowSnapshots, calculateProjectPaymentSummaryForRequest } from '../../paymentCalculations.js';
import { VendorService } from '../../../../src/modules/vendors/services/VendorService';
import { POService } from '../../../../src/modules/purchase-orders/services/POService';
import { PaymentService } from '../../../../src/modules/payments/services/PaymentService';
import { PaymentRepository } from '../../../../src/modules/payments/repositories/PaymentRepository';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { SettingsService } from '../../../../src/modules/core/services/SettingsService';
import { AuditService } from '../../../../src/modules/core/services/AuditService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { logAudit, getSetting, setSetting, requireAdminConsole, ensureSettingsTable } from '../core.js';
import { isSuperAdmin } from '../../config.js';
import { getDefaultCCRecipients } from '../settings.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
  return secret;
}

function requireAuth(session) {
  AuthService.requireAuth(session);
}

// Ensure updatePOPaymentStatus is available or implement it
async function updatePOPaymentStatus(poNo) {
  const po = await queryGet('SELECT * FROM purchase_orders WHERE po_no = ?', [poNo]);
  if (!po) return { outstanding: 0 };
  const sysSum = await queryGet('SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total FROM system_payments WHERE po_no = ?', [poNo]);
  const totalPaid = Number(sysSum?.total) || 0;
  const poVal = Number(po.revised_po_value || po.po_value || 0);
  const outstanding = Math.max(0, poVal - totalPaid);
  let paymentStatus = 'Unpaid';
  if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
  else if (totalPaid > 0) paymentStatus = 'Partially Paid';
  await queryRun('UPDATE purchase_orders SET legacy_paid=?, final_payable=?, payment_status=? WHERE po_no=?', [totalPaid, outstanding, paymentStatus, po.po_no]);
  return { outstanding, totalPaid, paymentStatus };
}

export async function addManualPayment(payload, session) {
  requireAuth(session);
  const roles = session?.roles || [];
  const isSuperAdminUser = isSuperAdmin(session?.email);
  const canRecord = isSuperAdminUser || roles.includes('accountant') || roles.includes('admin');
  if (!canRecord) throw new Error('AUTH:Only users with the Accountant or Admin role can record manual payments.');

  const amtNum = Number(payload.amount);
  if (!amtNum || amtNum <= 0) throw new Error('Amount must be greater than zero');
  if (!payload.poNo) throw new Error('PO Number is required');

  await ensureSettingsTable();

  const { outstanding } = await updatePOPaymentStatus(payload.poNo);
  if (amtNum > outstanding + 0.01) {
    throw new Error("Payment amount exceeds outstanding balance.");
  }

  await PaymentService.createManualPayment(payload, session?.email || 'unknown');
  
  const updated = await updatePOPaymentStatus(payload.poNo);
  return { ok: true, poNo: payload.poNo, ...updated };
}

import { NumberSeriesService } from '../../../../src/modules/core/services/NumberSeriesService';

export async function setPOPrefix(prefix, session) {
  requireAdminConsole(session);
  const value = String(prefix || '').trim();
  await NumberSeriesService.updateConfig('purchase_order', { prefix: value });
  await logAudit(session.email, 'PO Prefix Updated', value || '(default)', 'Settings');
  return { ok: true, prefix: value };
}

export async function sendPOToVendor(poNo, emailOverride, pdfAttachment, session) {
  requireAuth(session);
  const po = await queryGet('SELECT * FROM purchase_orders WHERE po_no = ?', [poNo]);
  if (!po) throw new Error('PO not found: ' + poNo);

  const vendor = await queryGet('SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?', [po.vendor_name, po.vendor_key]);
  const toEmail = emailOverride || vendor?.email || po.vendor_email;
  if (!toEmail) throw new Error('No email address provided for vendor');

  const items = await queryAll('SELECT * FROM po_items WHERE po_no = ?', [poNo]);
  
  const dbAttachments = await queryAll("SELECT file_name, file_data FROM attachments WHERE entity_type = 'po' AND entity_id = ?", [poNo]);
  const attachments = dbAttachments.map(a => ({
    filename: a.file_name,
    content: a.file_data
  }));

  if (pdfAttachment && pdfAttachment.filename && pdfAttachment.content) {
    attachments.push(pdfAttachment);
  }

  const cc = await getDefaultCCRecipients(session);

  await sendPOEmail({
    toEmail,
    cc,
    vendorName: po.vendor_name || 'Vendor',
    poNo: po.po_no,
    project: po.project,
    poDate: po.po_date,
    items: items.map(it => ({ desc: it.description, qty: it.qty, unit: it.unit || 'Nos', rate: it.rate, amount: it.amount })),
    grandTotal: po.po_value,
    terms: po.terms || '',
    attachments
  });

  return { ok: true, email: toEmail };
}

export async function correctLegacyPOPaidAmount(poNo, newPaidAmount, autoRecalculate, reason, session) {
  requireAuth(session);
  const roles = session.roles || [];
  const isAdmin = roles.includes('admin') || isSuperAdmin(session.email);
  const isDirector = roles.includes('director');
  
  if (!isAdmin && !isDirector) throw new Error('AUTH:Unauthorized - Only Admin/Director can correct legacy payment records.');

  const po = await queryGet('SELECT * FROM purchase_orders WHERE po_no = ?', [poNo]);
  if (!po) throw new Error('Purchase order not found.');

  const oldPaidAmount = po.legacy_paid;

  if (autoRecalculate) {
    await updatePOPaymentStatus(poNo);
    await logAudit(session.email, 'CORRECT_PO_PAYMENT_AUTO', `Auto-recalculated PO ${poNo} paid amount. Reason: ${reason}`);
  } else {
    const poVal = Number(po.revised_po_value || po.po_value || 0);
    const finalPayable = poVal - Number(newPaidAmount);

    await queryRun("DELETE FROM system_payments WHERE po_no = ? AND remitted_by = 'Legacy Import'", [poNo]);
    
    const sysSum = await queryGet('SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total FROM system_payments WHERE po_no = ?', [poNo]);
    const nonLegacyTotal = Number(sysSum?.total) || 0;
    const legacyAdjustment = Math.max(0, Number(newPaidAmount) - nonLegacyTotal);

    if (legacyAdjustment > 0) {
      await queryRun("INSERT INTO system_payments (po_no, amount, remitted_by, created_at) VALUES (?, ?, ?, ?)", [poNo, legacyAdjustment, 'Legacy Import', new Date().toISOString()]);
    }

    await queryRun('UPDATE purchase_orders SET legacy_paid = ?, final_payable = ? WHERE po_no = ?', [newPaidAmount, finalPayable, poNo]);
    await logAudit(session.email, 'CORRECT_PO_PAYMENT_MANUAL', `Manually corrected PO ${poNo} paid amount from ${oldPaidAmount} to ${newPaidAmount}. Reason: ${reason}`);
  }

  return { ok: true, message: 'Legacy payment corrected successfully.' };
}
