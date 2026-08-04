import { VendorRepository } from '../repositories/VendorRepository.ts';
import { IVendor, IVendorInput } from '../types/Vendor';
import { logAudit } from '../../../../app/lib/api.js';

export class VendorService {
  /**
   * Fetch all vendors.
   */
  static async getAllVendors(options?: { limit?: number; offset?: number }): Promise<IVendor[]> {
    return VendorRepository.findAll(options);
  }

  static async getVendorCount(): Promise<number> {
    return VendorRepository.countAll();
  }

  /**
   * Fetch vendor by name or code.
   */
  static async getVendorByName(name: string): Promise<IVendor | null> {
    if (!name) throw new Error("Vendor name/code is required");
    return VendorRepository.findByNameOrCode(name);
  }

  /**
   * Check for duplicate vendor by legal name, trade name, gstin, or pan.
   */
  static async checkVendorDuplicate(payload: {
    legalName?: string;
    tradeName?: string;
    gstin?: string;
    pan?: string;
    exclude?: { id?: number; vendorCode?: string; legalName?: string } | string;
    excludeVendorCode?: string;
  }): Promise<{ isDuplicate: boolean; duplicate?: IVendor; message?: string }> {
    const excludeArg = payload.exclude || payload.excludeVendorCode;
    const dup = await VendorRepository.findDuplicate(payload.legalName, payload.tradeName, payload.gstin, payload.pan, excludeArg);
    if (!dup) return { isDuplicate: false };

    let field = 'legal name';
    if (payload.gstin && dup.gstin && dup.gstin.toLowerCase().trim() === payload.gstin.toLowerCase().trim()) {
      field = 'GSTIN';
    } else if (payload.pan && dup.pan && dup.pan.toLowerCase().trim() === payload.pan.toLowerCase().trim()) {
      field = 'PAN';
    } else if (payload.tradeName && dup.trade_name && dup.trade_name.toLowerCase().trim() === payload.tradeName.toLowerCase().trim()) {
      field = 'trade name';
    }

    return {
      isDuplicate: true,
      duplicate: dup,
      message: `A vendor with matching ${field} already exists: "${dup.legal_name}" (${dup.vendor_code}).`
    };
  }

  /**
   * Add a new vendor with duplicate validation and audit logging.
   */
  static async addVendor(payload: IVendorInput, userEmail: string): Promise<{ ok: boolean, code: string }> {
    if (!payload.legalName) throw new Error("Legal Name is required");
    
    // Check duplicates
    const dupCheck = await VendorService.checkVendorDuplicate(payload);
    if (dupCheck.isDuplicate) {
      throw new Error(`DUPLICATE_VENDOR: ${dupCheck.message}`);
    }

    const code = `VEN-${Date.now()}`;
    const newVendor: Omit<IVendor, 'id' | 'created_at'> = {
      legal_name: payload.legalName,
      trade_name: payload.tradeName,
      vendor_code: code,
      vendor_type: payload.vendorType,
      pan: payload.pan,
      gstin: payload.gstin,
      status: payload.status || 'Active',
      address: payload.address,
      email: payload.email,
      bank_account: payload.accountNo, // Mapping UI field to DB field
      ifsc: payload.ifsc,
      primary_contact_name: payload.primaryContactName,
      primary_contact_no: payload.primaryContactNo,
      accounts_contact_name: payload.accountsContactName,
      accounts_contact_no: payload.accountsContactNo,
      purchase_contact_name: payload.purchaseContactName,
      purchase_contact_no: payload.purchaseContactNo,
      mobile_number: payload.mobileNumber
    };

    await VendorRepository.create(newVendor);
    await logAudit(userEmail, 'Vendor Added', `${code} ${payload.legalName}`, 'Vendors');
    
    return { ok: true, code };
  }

  /**
   * Update an existing vendor with duplicate validation and audit logging.
   */
  static async updateVendor(payload: IVendorInput & { expectedVersion?: number }, userEmail: string): Promise<{ ok: boolean, vendorId: string }> {
    const vendorId = payload.vendorId || payload.vendorCode;
    if (!vendorId) throw new Error("Vendor ID is required for updating");
    
    // Ensure vendor exists
    const existing = await VendorRepository.findByNameOrCode(vendorId);

    // Check duplicates excluding self by DB id, vendor_code, and existing legal_name
    const dupCheck = await VendorService.checkVendorDuplicate({
      ...payload,
      exclude: {
        id: existing?.id,
        vendorCode: existing?.vendor_code || vendorId,
        legalName: existing?.legal_name
      }
    });
    if (dupCheck.isDuplicate) {
      throw new Error(`DUPLICATE_VENDOR: ${dupCheck.message}`);
    }
    
    const updateData: Partial<IVendor> = {
      legal_name: payload.legalName,
      trade_name: payload.tradeName,
      gstin: payload.gstin,
      pan: payload.pan,
      status: payload.status,
      address: payload.address,
      vendor_type: payload.vendorType,
      email: payload.email,
      bank_account: payload.accountNo,
      ifsc: payload.ifsc,
      primary_contact_name: payload.primaryContactName,
      primary_contact_no: payload.primaryContactNo,
      accounts_contact_name: payload.accountsContactName,
      accounts_contact_no: payload.accountsContactNo,
      purchase_contact_name: payload.purchaseContactName,
      purchase_contact_no: payload.purchaseContactNo,
      mobile_number: payload.mobileNumber
    };

    if (!existing) {
      // If it somehow doesn't exist, create it (matching legacy api.js behavior)
      await VendorRepository.create({
        ...updateData,
        vendor_code: vendorId,
        legal_name: payload.legalName || 'Unknown',
        gstin: payload.gstin || ''
      } as any);
    } else {
      await VendorRepository.update(vendorId, updateData, payload.expectedVersion);
    }

    await logAudit(userEmail, 'Vendor Updated', vendorId, 'Vendors');
    
    return { ok: true, vendorId };
  }

  /**
   * Delete a vendor if no POs or Payment Requests are linked.
   */
  static async deleteVendor(vendorId: string, userEmail: string): Promise<{ ok: boolean }> {
    if (!vendorId) throw new Error("Vendor ID is required for deletion");

    const existing = await VendorRepository.findByNameOrCode(vendorId);
    if (!existing) {
      throw new Error("Vendor not found");
    }

    const { poCount, prCount } = await VendorRepository.getLinkedRecordsCount(vendorId, existing.legal_name || existing.trade_name);
    if (poCount > 0 || prCount > 0) {
      const details = [];
      if (poCount > 0) details.push(`${poCount} Purchase Order(s)`);
      if (prCount > 0) details.push(`${prCount} Payment Request(s)`);
      throw new Error(`CANNOT_DELETE: Vendor "${existing.legal_name || vendorId}" cannot be deleted because it is linked to ${details.join(' and ')}.`);
    }

    await VendorRepository.delete(vendorId);
    await logAudit(userEmail, 'Vendor Deleted', `${vendorId} (${existing.legal_name || ''})`, 'Vendors');

    return { ok: true };
  }
}
