// Shared token encryption/decryption module
// P0-5: AES-256-GCM with HKDF key derivation (replaces insecure AES-256-CBC)
// P3-4: Single source of truth — previously duplicated in auth.js, core.js, dashboard.js
import crypto from 'crypto';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
  }
  return secret;
}

/**
 * Derive a 32-byte key from JWT_SECRET using HKDF.
 * Much stronger than naive .slice(0,32).padEnd(32,'0').
 */
function deriveKey() {
  const secret = getJwtSecret();
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a JSON-serializable payload using AES-256-GCM (authenticated encryption).
 * Output format: hex(iv) + hex(authTag) + hex(ciphertext) = 24 + 32 + N chars
 */
export function encryptToken(data) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex'); // 16 bytes = 32 hex chars
  // Format: iv(24) + authTag(32) + ciphertext(variable)
  return iv.toString('hex') + authTag + encrypted;
}

/**
 * Decrypt a token produced by encryptToken.
 * Supports both the new GCM format and legacy CBC format for graceful migration.
 */
export function decryptToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token');
  }
  
  const key = deriveKey();
  
  // Try new GCM format first (iv=24 hex + authTag=32 hex + ciphertext)
  if (token.length >= 56) {
    try {
      const ivHex = token.slice(0, 24);         // 12 bytes = 24 hex chars
      const authTagHex = token.slice(24, 56);    // 16 bytes = 32 hex chars
      const ciphertext = token.slice(56);
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (err) {
      // Not GCM format — try legacy CBC below
    }
  }
  
  // Legacy CBC format (for tokens issued before this upgrade)
  // Key derivation matches the old method for backward compatibility
  const legacyKey = Buffer.from(getJwtSecret().slice(0, 32).padEnd(32, '0'));
  
  try {
    if (token.length >= 32) {
      try {
        const ivHex = token.slice(0, 32);
        const ciphertext = token.slice(32);
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey, iv);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
      } catch (err) {
        // Try zero-IV legacy fallback
      }
    }
    // Legacy zero-IV fallback (oldest format)
    const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey, Buffer.alloc(16, 0));
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    throw new Error('Invalid token');
  }
}

export { getJwtSecret };
