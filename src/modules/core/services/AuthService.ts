// Centralized Super Admin identity — single source of truth
const SUPER_ADMIN_EMAIL = 'nishant@luxeworxatelier.com';

export class AuthService {
  /**
   * Check if the given email is the Super Admin.
   */
  static isSuperAdmin(email: string): boolean {
    const norm = String(email || '').trim().toLowerCase();
    return norm === 'nishant@luxeworxatelier.com' || norm === 'nishantpathak35@gmail.com' || norm === SUPER_ADMIN_EMAIL;
  }

  /**
   * Verifies if a user session is active.
   * Throws an error if unauthorized.
   */
  static requireAuth(session: any): void {
    if (!session || !session.email) {
      throw new Error('AUTH:Unauthenticated');
    }
  }

  /**
   * Verifies if the session has admin/director privileges.
   */
  static requireAdminConsole(session: any): void {
    AuthService.requireAuth(session);
    if (AuthService.isSuperAdmin(session?.email)) return;
    const roles = session?.roles || [];
    if (!roles.includes('admin') && !roles.includes('director')) {
      throw new Error('AUTH:Unauthorized - Admin/Director required');
    }
  }

  /**
   * Normalizes a role string into a safe format.
   */
  static normalizeRoleName(role: string): string {
    return String(role || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  /**
   * Retrieves all users using weak legacy SHA-256 password hashes.
   */
  static async getLegacyPasswordHashUsers(): Promise<any[]> {
    const { queryAll } = await import('../../../../app/lib/db.js');
    const rows = await queryAll(`SELECT id, email, name, role, last_login, password_hash FROM users WHERE password_hash IS NOT NULL`);
    return rows.filter((r: any) => {
      const hash = String(r.password_hash || '');
      return !hash.startsWith('$2a$') && !hash.startsWith('$2b$');
    }).map((r: any) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      lastLogin: r.last_login,
      isLegacyHash: true
    }));
  }

  /**
   * Force-expires sessions and requires password reset for accounts on legacy hashes.
   */
  static async forcePasswordResetForLegacyUsers(userEmail?: string): Promise<{ affected: number }> {
    const { queryAll, queryRun } = await import('../../../../app/lib/db.js');
    let sql = `SELECT email, password_hash FROM users WHERE password_hash IS NOT NULL`;
    const params: any[] = [];
    if (userEmail) {
      sql += ` AND LOWER(email) = ?`;
      params.push(userEmail.trim().toLowerCase());
    }
    const rows = await queryAll(sql, params);
    let count = 0;
    for (const r of rows) {
      const hash = String(r.password_hash || '');
      if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
        const resetToken = `RESET-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await queryRun(`UPDATE users SET password_hash = NULL, invite_token = ? WHERE LOWER(email) = ?`, [resetToken, r.email.toLowerCase()]);
        count++;
      }
    }
    return { affected: count };
  }
}
