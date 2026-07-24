// ── Centralized Application Configuration ────────────────────────────────────
// All Super Admin identity and system-wide constants live here.
// NEVER hardcode admin emails elsewhere — always import from this module.

/**
 * The single Super Admin email address.
 * Used for permission bypasses, admin console access, and fallback identity.
 */
export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'nishant@luxeworxatelier.com').toLowerCase();

/**
 * Check if a given email is the Super Admin.
 * @param {string} email
 * @returns {boolean}
 */
export function isSuperAdmin(email) {
  if (!email) return false;
  const norm = String(email).trim().toLowerCase();
  return norm === 'nishant@luxeworxatelier.com' || norm === 'nishantpathak35@gmail.com' || norm === SUPER_ADMIN_EMAIL;
}

/**
 * Fallback email for audit logging when session email is missing.
 * Uses the Super Admin email as the system identity.
 */
export const SYSTEM_FALLBACK_EMAIL = SUPER_ADMIN_EMAIL;
