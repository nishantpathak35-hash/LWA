import { queryGet, queryAll, queryRun } from '../../../../app/lib/db.js';
import { encryptToken, decryptToken } from '../../../../app/lib/api/token.js';
import bcrypt from 'bcryptjs';
import { VendorRepository } from '../../vendors/repositories/VendorRepository.ts';

export class VendorPortalAuthService {
  /**
   * Authenticates a vendor portal user and returns a vendor JWT session token.
   */
  static async loginVendor(email: string, password: string, meta: { ip?: string; ua?: string } = {}): Promise<{ token: string; vendorName: string; vendorCode: string }> {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    const normEmail = String(email).trim().toLowerCase();

    // Query vendor_portal_users
    const user = await queryGet(`SELECT * FROM vendor_portal_users WHERE LOWER(email) = ?`, [normEmail]);
    if (!user) {
      throw new Error('Invalid vendor portal credentials.');
    }
    if (user.status !== 'Active') {
      throw new Error('Vendor portal account is inactive.');
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid vendor portal credentials.');
    }

    // Resolve associated vendor master record
    const vendor = await VendorRepository.findById(user.vendor_id);
    if (!vendor && !user.vendor_code) {
      throw new Error('Vendor master record not found.');
    }

    const vendorCode = vendor ? vendor.vendor_code : user.vendor_code;
    const vendorName = vendor ? vendor.legal_name : user.vendor_code;

    // Update last login timestamp
    const loginTime = new Date().toISOString();
    await queryRun(`UPDATE vendor_portal_users SET last_login = ? WHERE id = ?`, [loginTime, user.id]);

    // Issue encrypted vendor token with 7-day expiration
    const tokenPayload = {
      user_type: 'vendor',
      vendor_id: user.vendor_id,
      vendor_code: vendorCode,
      email: user.email,
      name: user.name || vendorName,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    };

    const token = encryptToken(tokenPayload);

    return { token, vendorName, vendorCode };
  }

  /**
   * Resolves and verifies a vendor session token.
   */
  static async getVendorSession(token: string): Promise<any> {
    if (!token) throw new Error('AUTH:No token provided');

    const payload = decryptToken(token);
    if (!payload || payload.user_type !== 'vendor') {
      throw new Error('AUTH:Invalid vendor token');
    }
    if (payload.exp < Date.now()) {
      throw new Error('AUTH:Token expired');
    }

    const user = await queryGet(`SELECT * FROM vendor_portal_users WHERE email = ?`, [payload.email]);
    if (!user || user.status !== 'Active') {
      throw new Error('AUTH:Vendor user account inactive or missing');
    }

    const vendor = await queryGet(`SELECT * FROM vendors WHERE id = ? OR vendor_code = ?`, [user.vendor_id, user.vendor_code]);
    if (!vendor) {
      throw new Error('AUTH:Vendor account not found');
    }

    return {
      user_type: 'vendor',
      email: user.email,
      name: user.name || vendor.legal_name,
      vendor_id: vendor.id,
      vendor_code: vendor.vendor_code,
      vendor_name: vendor.legal_name,
      trade_name: vendor.trade_name,
      gstin: vendor.gstin,
      pan: vendor.pan,
      active: true
    };
  }

  /**
   * Helper to ensure the current session is an active vendor portal session.
   */
  static requireVendorAuth(session: any): { vendor_id: number; vendor_code: string; vendor_name: string; email: string } {
    if (!session || session.user_type !== 'vendor' || !session.vendor_code) {
      throw new Error('AUTH:Unauthorized - Vendor portal access required');
    }
    return {
      vendor_id: session.vendor_id,
      vendor_code: session.vendor_code,
      vendor_name: session.vendor_name,
      email: session.email
    };
  }

  /**
   * Allows internal admin users or vendor admins to invite/create a vendor portal user.
   */
  static async inviteVendorUser(payload: { vendorCode: string; email: string; name?: string; password?: string }): Promise<{ ok: boolean; email: string }> {
    const { vendorCode, email, name, password } = payload;
    if (!vendorCode || !email) {
      throw new Error('Vendor code and email are required.');
    }

    const normEmail = email.trim().toLowerCase();
    const vendor = await VendorRepository.findByNameOrCode(vendorCode);
    if (!vendor) {
      throw new Error(`Vendor not found for code: ${vendorCode}`);
    }

    const initialPassword = password || `Vendor@${Math.floor(100000 + Math.random() * 900000)}`;
    const hash = bcrypt.hashSync(initialPassword, bcrypt.genSaltSync(12));

    const existing = await queryGet(`SELECT id FROM vendor_portal_users WHERE LOWER(email) = ?`, [normEmail]);
    if (existing) {
      await queryRun(
        `UPDATE vendor_portal_users SET vendor_id = ?, vendor_code = ?, name = ?, password_hash = ?, status = 'Active' WHERE LOWER(email) = ?`,
        [vendor.id, vendor.vendor_code, name || vendor.legal_name, hash, normEmail]
      );
    } else {
      await queryRun(
        `INSERT INTO vendor_portal_users (vendor_id, vendor_code, email, name, password_hash, status) VALUES (?, ?, ?, ?, ?, 'Active')`,
        [vendor.id, vendor.vendor_code, normEmail, name || vendor.legal_name, hash]
      );
    }

    return { ok: true, email: normEmail };
  }

  /**
   * List vendor portal users for a specific vendor.
   */
  static async listVendorUsers(vendorCode: string): Promise<any[]> {
    return queryAll(`SELECT id, vendor_id, vendor_code, email, name, status, last_login, created_at FROM vendor_portal_users WHERE vendor_code = ?`, [vendorCode]);
  }
}
