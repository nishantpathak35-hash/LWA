// Domain: settings
// Auto-extracted from api.js
import { queryAll, queryGet, queryRun } from '../db.js';
import { sendInviteEmail, sendPaymentAdviceEmail, sendPOEmail } from '../email.js';
import { getPOPaymentIneligibilityReason, isPOEligibleForPayment } from '../poEligibility.js';
import { calculateProjectOutflowSnapshots, calculateProjectPaymentSummaryForRequest } from '../paymentCalculations.js';
import { VendorService } from '../../../src/modules/vendors/services/VendorService';
import { POService } from '../../../src/modules/purchase-orders/services/POService';
import { PaymentService } from '../../../src/modules/payments/services/PaymentService';
import { PaymentRepository } from '../../../src/modules/payments/repositories/PaymentRepository';
import { AuthService } from '../../../src/modules/core/services/AuthService';
import { SettingsService } from '../../../src/modules/core/services/SettingsService';
import { AuditService } from '../../../src/modules/core/services/AuditService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { logAudit, getSetting, setSetting, DEFAULT_FEATURE_PERMISSIONS, VALID_ROLE_KEYS, requireAdminConsole } from './core.js';
import { emitBroadcast } from '../broadcast.js';


import { requireAuth } from './shared.js';

export async function getFeaturePermissions(session) {
  requireAuth(session);
  const raw = await getSetting('feature_permissions', null);
  if (!raw) return { ...DEFAULT_FEATURE_PERMISSIONS };
  try {
    const saved = JSON.parse(raw);
    // Deep merge: default provides missing roles; saved value wins per-role
    const merged = { ...DEFAULT_FEATURE_PERMISSIONS };
    Object.keys(saved).forEach(role => {
      if (VALID_ROLE_KEYS.has(role)) {
        merged[role] = saved[role];
      }
    });
    return merged;
  } catch {
    return { ...DEFAULT_FEATURE_PERMISSIONS };
  }
}

export async function setFeaturePermissions(config, session) {
  requireAdminConsole(session);
  const sanitized = {};
  Object.entries(config || {}).forEach(([role, features]) => {
    // Only allow known role keys — no undefined function needed
    if (!VALID_ROLE_KEYS.has(role)) return;
    sanitized[role] = Array.from(new Set((features || []).map(f => String(f).trim()).filter(Boolean)));
  });
  await setSetting('feature_permissions', JSON.stringify(sanitized));
  await logAudit(session.email, 'Feature Permissions Updated', JSON.stringify(sanitized), 'Settings');
  await emitBroadcast('settings', 'updated', 'feature_permissions');
  return { ok: true, permissions: sanitized };
}

export async function clearAllCaches(session) {
  requireAuth(session);
  await logAudit(session.email, 'Cache Cleared', 'Application cache refresh requested', 'Settings');
  return { ok: true };
}

export async function getCompanySettings(session) {
  requireAuth(session);
  return SettingsService.getCompanySettings();
}

export async function setCompanySettings(payload, session) {
  requireAdminConsole(session);
  await SettingsService.updateCompanySettings(payload);
  await logAudit(session.email, 'Company Settings Updated', `${payload?.name || ''}, ${payload?.gstin || ''}`, 'Settings');
  await emitBroadcast('settings', 'updated', 'company');
  return { ok: true };
}

export async function getDefaultCCRecipients(session) {
  requireAuth(session);
  const raw = await getSetting('default_cc_recipients', null);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export async function setDefaultCCRecipients(emails, session) {
  requireAdminConsole(session);
  const validEmails = (emails || []).map(e => String(e).trim().toLowerCase()).filter(e => e.includes('@'));
  await setSetting('default_cc_recipients', JSON.stringify(validEmails));
  await logAudit(session.email, 'Email CC Settings Updated', JSON.stringify(validEmails), 'Settings');
  await emitBroadcast('settings', 'updated', 'cc_recipients');
  return { ok: true, cc: validEmails };
}