// Domain: auth
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
import { requireAdminConsole, normalizeRoleName, getSetting, setSetting, logAudit } from './core.js';


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

export async function loginUser(email, password, meta = {}) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  const normEmail = String(email).trim().toLowerCase();
  const user = await queryGet(`SELECT * FROM users WHERE LOWER(email) = ?`, [normEmail]);
  if (!user) {
    throw new Error('Invalid credentials');
  }
  if (!user.active) {
    throw new Error('Account is inactive');
  }

  // Lazy initialize admin/invite password if password_hash is not yet set
  if (!user.password_hash) {
    if (user.invite_token) {
      throw new Error('Please accept the invitation email to set your password before logging in');
    }
    const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
    await queryRun(`UPDATE users SET password_hash = ? WHERE LOWER(email) = ?`, [hash, normEmail]);
    user.password_hash = hash;
  }

  let isValid = false;
  const storedHash = user.password_hash;
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    isValid = bcrypt.compareSync(password, storedHash);
  } else {
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    if (storedHash === legacyHash || storedHash === password) {
      isValid = true;
      const newBcryptHash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
      await queryRun(`UPDATE users SET password_hash = ? WHERE LOWER(email) = ?`, [newBcryptHash, normEmail]);
      user.password_hash = newBcryptHash;
    }
  }

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Clear invite token upon successful login if still present
  if (user.invite_token) {
    await queryRun(`UPDATE users SET invite_token = NULL WHERE LOWER(email) = ?`, [normEmail]);
  }

  // Update last login timestamp and meta
  const loginTimestamp = new Date().toISOString();
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login TEXT`); } catch (e) { /* column already exists */ }
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login_ip TEXT`); } catch (e) { /* column already exists */ }
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login_device TEXT`); } catch (e) { /* column already exists */ }
  
  await queryRun(
    `UPDATE users SET last_login = ?, last_login_ip = ?, last_login_device = ? WHERE LOWER(email) = ?`, 
    [loginTimestamp, meta.ip || null, meta.ua || null, normEmail]
  );

  // Log audit entry for login
  await logAudit(user.email, 'Login', `User logged in`, 'Auth');

  const tokenPayload = {
    email: user.email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  const token = encryptToken(tokenPayload);

  return { token };
}

export async function getMySession(token) {
  if (!token) throw new Error('AUTH:No token provided');
  
  try {
    const payload = decryptToken(token);
    if (payload.exp < Date.now()) {
      throw new Error('AUTH:Token expired');
    }
    
    const user = await queryGet(`SELECT * FROM users WHERE email = ?`, [payload.email]);
    if (!user) {
      throw new Error('AUTH:User not found');
    }
    if (!user.active) {
      throw new Error('AUTH:User inactive');
    }

    const rawRoles = JSON.parse(user.roles || '[]');
    const isSuperAdmin = user.email === 'admin@luxeworx.com';
    const roles = isSuperAdmin ? Array.from(new Set([...rawRoles, 'admin', 'director', 'finance', 'procurement', 'proc', 'accountant', 'maker'])) : rawRoles;

    return {
      email: user.email,
      name: user.name || user.email,
      roles: roles,
      active: true
    };
  } catch (e) {
    console.error('getMySession validation failed:', e);
    throw new Error('AUTH:Invalid or expired token');
  }
}

export async function inviteUserAdmin(payload, session) {
  requireAdminConsole(session);

  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const normEmail = String(payload.email).trim().toLowerCase();
  const hash = payload.password ? bcrypt.hashSync(payload.password, bcrypt.genSaltSync(12)) : null;

  // Check if user already exists
  const existing = await queryGet(`SELECT email FROM users WHERE LOWER(email) = ?`, [normEmail]);
  if (existing) {
    // Update roles, reset token, and update password if re-invited
    if (hash) {
      await queryRun(
        `UPDATE users SET name = ?, roles = ?, invite_token = ?, password_hash = ? WHERE LOWER(email) = ?`,
        [payload.name || '', JSON.stringify(payload.roles || []), token, hash, normEmail]
      );
    } else {
      await queryRun(
        `UPDATE users SET name = ?, roles = ?, invite_token = ? WHERE LOWER(email) = ?`,
        [payload.name || '', JSON.stringify(payload.roles || []), token, normEmail]
      );
    }
  } else {
    await queryRun(
      `INSERT INTO users (email, name, roles, invite_token, password_hash, active) VALUES (?, ?, ?, ?, ?, ?)`,
      [normEmail, payload.name || '', JSON.stringify(payload.roles || []), token, hash, true]
    );
  }

  const inviteUrl = `https://lwa-iota.vercel.app/?invite=${token}`;

  let emailSent = false;
  try {
    await sendInviteEmail({
      toEmail: normEmail,
      toName: payload.name || normEmail,
      inviteUrl,
      roles: payload.roles || []
    });
    emailSent = true;
  } catch (emailErr) {
    console.error('Invite email failed:', emailErr.message);
  }

  return { ok: true, inviteUrl, emailSent };
}

export async function sendInvite(payload, session) {
  requireAuth(session);
  return inviteUserAdmin(payload, session);
}

export async function listUsersAdmin(session) {
  requireAdminConsole(session);
  // Ensure last_login column exists (safe, idempotent)
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login TEXT`); } catch (e) { /* already exists */ }
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login_ip TEXT`); } catch (e) { /* already exists */ }
  try { await queryRun(`ALTER TABLE users ADD COLUMN last_login_device TEXT`); } catch (e) { /* already exists */ }
  const users = await queryAll(`SELECT email, name, roles, active, invite_token, password_hash, last_login, last_login_ip, last_login_device FROM users`);
  return users.map(u => ({
    email: u.email,
    name: u.name,
    roles: JSON.parse(u.roles || '[]'),
    active: u.active === 1 || u.active === true,
    hasPassword: u.password_hash ? true : false,
    hasToken: !!u.invite_token,
    lastLogin: u.last_login || null,
    lastLoginIp: u.last_login_ip || null,
    lastLoginDevice: u.last_login_device || null
  }));
}

export async function deleteUserAdmin(email, session) {
  requireAdminConsole(session);
  await queryRun(`DELETE FROM users WHERE email = ?`, [email]);
  return { ok: true };
}

export async function setUserActiveAdmin(email, active, session) {
  requireAdminConsole(session);
  await queryRun(`UPDATE users SET active = ? WHERE LOWER(email) = ?`, [active ? 1 : 0, String(email).trim().toLowerCase()]);
  await logAudit(session.email, active ? 'User Activated' : 'User Deactivated', String(email), 'Settings');
  return { ok: true };
}

export async function setUserRolesAdmin(email, roles, session) {
  requireAdminConsole(session);
  const cleanRoles = Array.from(new Set((roles || []).map(normalizeRoleName).filter(Boolean)));
  await queryRun(`UPDATE users SET roles = ? WHERE LOWER(email) = ?`, [JSON.stringify(cleanRoles), String(email).trim().toLowerCase()]);
  await logAudit(session.email, 'User Roles Updated', `${email}: ${cleanRoles.join(', ')}`, 'Settings');
  return { ok: true, roles: cleanRoles };
}

export async function resetUserPasswordAdmin(email, password, session) {
  requireAdminConsole(session);
  if (!password || String(password).length < 8) throw new Error('Password must be at least 8 characters');
  const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
  await queryRun(
    `UPDATE users SET password_hash = ?, invite_token = NULL WHERE LOWER(email) = ?`,
    [hash, String(email).trim().toLowerCase()]
  );
  await logAudit(session.email, 'User Password Reset', String(email), 'Settings');
  return { ok: true };
}

export async function addCustomRole(roleName, session) {
  requireAdminConsole(session);
  const role = normalizeRoleName(roleName);
  if (!role) throw new Error('Role name is required');
  const existing = JSON.parse(await getSetting('custom_roles', '[]') || '[]');
  const roles = Array.from(new Set([...existing, role]));
  await setSetting('custom_roles', JSON.stringify(roles));
  await logAudit(session.email, 'Custom Role Added', role, 'Settings');
  return { ok: true, role, roles };
}

export async function logoutUser(token, session) {
  if (session?.email) {
    await logAudit(session.email, 'Logout', 'User logged out', 'Auth');
  }
  return { ok: true };
}

export async function acceptInvite(token, password) {
  const user = await queryGet(`SELECT * FROM users WHERE invite_token = ?`, [token]);
  if (!user) throw new Error("Invalid or expired invite token");
  
  const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
  await queryRun(
    `UPDATE users SET password_hash = ?, invite_token = NULL WHERE email = ?`,
    [hash, user.email]
  );
  
  return { ok: true, email: user.email };
}

// --- EMAIL ACTIONS ---