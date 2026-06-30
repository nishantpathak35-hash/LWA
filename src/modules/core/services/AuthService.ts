// Centralized Super Admin identity — single source of truth
const SUPER_ADMIN_EMAIL = 'nishant@luxeworxatelier.com';

export class AuthService {
  /**
   * Check if the given email is the Super Admin.
   */
  static isSuperAdmin(email: string): boolean {
    return String(email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
  }

  /**
   * Verifies if a user session is active.
   * Throws an error if unauthorized.
   */
  static requireAuth(session: any): void {
    if (!session || !session.email) {
      throw new Error('AUTH:Unauthorized');
    }
  }

  /**
   * Verifies if the session has admin/director privileges.
   */
  static requireAdminConsole(session: any): void {
    if (AuthService.isSuperAdmin(session?.email)) return;
    const roles = session?.roles || [];
    if (!session || (!roles.includes('admin') && !roles.includes('director'))) {
      throw new Error('AUTH:Unauthorized');
    }
  }

  /**
   * Normalizes a role string into a safe format.
   */
  static normalizeRoleName(role: string): string {
    return String(role || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }
}
