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
import { logAudit, getSetting, DEFAULT_FEATURE_PERMISSIONS, VALID_ROLE_KEYS } from './core.js';


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
  return { ok: true };
}
