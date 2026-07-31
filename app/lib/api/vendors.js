// Domain: vendors
// Auto-extracted from api.js
import { queryAll, queryGet, queryRun } from '../db.js';
import { emitBroadcast } from '../broadcast.js';
import { sendInviteEmail, sendPaymentAdviceEmail, sendPOEmail } from '../email.js';
import { getPOPaymentIneligibilityReason, isPOEligibleForPayment } from '../poEligibility.js';
import { calculateProjectOutflowSnapshots, calculateProjectPaymentSummaryForRequest } from '../paymentCalculations.js';
import { VendorService } from '../../../src/modules/vendors/services/VendorService.ts';
import { POService } from '../../../src/modules/purchase-orders/services/POService.ts';
import { PaymentService } from '../../../src/modules/payments/services/PaymentService.ts';
import { PaymentRepository } from '../../../src/modules/payments/repositories/PaymentRepository.ts';
import { AuthService } from '../../../src/modules/core/services/AuthService.ts';
import { SettingsService } from '../../../src/modules/core/services/SettingsService.ts';
import { AuditService } from '../../../src/modules/core/services/AuditService.ts';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
  }
  return secret;
}

function invalidateProjectCache(project) {
  return project;
}

const settingsCache = new Map();

// Promise singleton: all concurrent callers await the same migration run.
// A boolean flag is not concurrent-safe — two simultaneous requests would both
// run the expensive v3 backfill before either sets the flag to true.
let _settingsTablePromise = null;

function encryptToken(data) {
  const JWT_SECRET = getJwtSecret();
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
}

function decryptToken(token) {
  const JWT_SECRET = getJwtSecret();
  try {
    const key = Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0'));
    if (token && token.length >= 32) {
      try {
        const ivHex = token.slice(0, 32);
        const ciphertext = token.slice(32);
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
      } catch (err) {
        // Fall back to legacy format
      }
    }
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    throw new Error('Invalid token');
  }
}

function requireAuth(session) {
  AuthService.requireAuth(session);
}

export async function addVendor(payload, session) {
  requireAuth(session);
  const result = await VendorService.addVendor(payload, session?.email || SYSTEM_FALLBACK_EMAIL);
  await emitBroadcast('vendor', 'created', payload.vendor_code || payload.vendorCode || '');
  return result;
}

export async function updateVendor(payload, session) {
  requireAuth(session);
  const result = await VendorService.updateVendor(payload, session?.email || SYSTEM_FALLBACK_EMAIL);
  await emitBroadcast('vendor', 'updated', payload.vendor_code || payload.vendorCode || '');
  return result;
}

export async function checkVendorDuplicate(payload, session) {
  requireAuth(session);
  return VendorService.checkVendorDuplicate(payload);
}

export async function deleteVendor(vendorId, session) {
  requireAuth(session);
  const result = await VendorService.deleteVendor(vendorId, session?.email || SYSTEM_FALLBACK_EMAIL);
  await emitBroadcast('vendor', 'deleted', vendorId);
  return result;
}

export async function getVendorByName(name, session) {
  requireAuth(session);
  const row = await queryGet('SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ? OR trade_name = ?', [name, name, name]);
  if (!row) return null;
  return {
    ...row,
    code: row.vendor_code || '',
    vendorId: row.vendor_code || '',
    vendor_code: row.vendor_code || '',
    legalName: row.legal_name || '',
    legal_name: row.legal_name || '',
    tradeName: row.trade_name || '',
    trade_name: row.trade_name || '',
    gstin: row.gstin || '',
    pan: row.pan || '',
    status: row.status || 'Active',
    address: row.address || '',
    stateCode: '',
    vendorType: row.vendor_type || '',
    email: row.email || '',
    mobile: row.mobile_number || '',
    bankName: '',
    bankBranch: '',
    accountNo: row.bank_account || '',
    account_no: row.bank_account || '',
    bank_account: row.bank_account || '',
    ifsc: row.ifsc || '',
    primaryContactName: row.primary_contact_name || '',
    primary_contact_name: row.primary_contact_name || '',
    primaryContactNo: row.primary_contact_no || '',
    primary_contact_no: row.primary_contact_no || '',
    accountsContactName: row.accounts_contact_name || '',
    accounts_contact_name: row.accounts_contact_name || '',
    accountsContactNo: row.accounts_contact_no || '',
    accounts_contact_no: row.accounts_contact_no || '',
    purchaseContactName: row.purchase_contact_name || '',
    purchase_contact_name: row.purchase_contact_name || '',
    purchaseContactNo: row.purchase_contact_no || '',
    purchase_contact_no: row.purchase_contact_no || '',
    whatsappNumber: row.whatsapp_number || '',
    whatsapp_number: row.whatsapp_number || '',
    mobileNumber: row.mobile_number || '',
    mobile_number: row.mobile_number || '',
    preferredWhatsappContact: row.preferred_whatsapp_contact || 'Primary',
    preferred_whatsapp_contact: row.preferred_whatsapp_contact || 'Primary',
    version: row.version || 1
  };
}

export async function getVendorSummary(vendor = '', session) {
  requireAuth(session);
  let sql = `SELECT * FROM vendors`;
  let params = [];
  if (vendor) {
    sql += ` WHERE vendor_code = ? OR legal_name = ? OR trade_name = ? OR CAST(id AS TEXT) = ?`;
    params = [vendor, vendor, vendor, vendor];
  }
  const rows = await queryAll(sql, params);
  
  return rows.map(r => ({
    id: r.id,
    recordId: r.id,
    code: r.vendor_code || '',
    vendorId: r.vendor_code || '',
    vendor_code: r.vendor_code || '',
    vendor: r.legal_name || r.trade_name || r.vendor_code,
    legalName: r.legal_name || '',
    tradeName: r.trade_name || '',
    status: r.status || 'Active',
    pan: r.pan || '',
    gstin: r.gstin || '',
    address: r.address || '',
    email: r.email || ''
  }));
}