import crypto from 'crypto';
import { queryGet, queryRun } from '../db.js';
import { AuthService } from '../../../src/modules/core/services/AuthService';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
  return secret;
}

export function encryptToken(data) {
  const JWT_SECRET = getJwtSecret();
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
}

export function decryptToken(token) {
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

export function requireAuth(session) {
  AuthService.requireAuth(session);
}

export function invalidateProjectCache(project) {
  return project;
}

export const settingsCache = new Map();
export let _settingsTablePromise = null;

export async function updatePOPaymentStatus(poNo) {
  const sysSum = await queryGet(
    `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total
     FROM system_payments
     WHERE po_no = ?`,
    [poNo]
  );
  const totalPaid = Number(sysSum?.total) || 0;

  const po = await queryGet(`SELECT po_value, revised_po_value FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) return { totalPaid: 0, outstanding: 0, paymentStatus: 'Unpaid' };
  
  const poVal = Number(po.revised_po_value || po.po_value || 0);
  const outstanding = Math.max(0, poVal - totalPaid);

  let paymentStatus = 'Unpaid';
  if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
  else if (totalPaid > 0) paymentStatus = 'Partially Paid';

  await queryRun(
    `UPDATE purchase_orders SET legacy_paid = ?, final_payable = ?, payment_status = ? WHERE po_no = ?`,
    [totalPaid, outstanding, paymentStatus, poNo]
  );
  return { totalPaid, outstanding, paymentStatus };
}
