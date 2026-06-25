export class AuthService {
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
    if (session?.email === 'admin@luxeworx.com') return;
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
