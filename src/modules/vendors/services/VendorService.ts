import { VendorRepository } from '../repositories/VendorRepository';
import { IVendor, IVendorInput } from '../types/Vendor';
import { logAudit } from '../../../../app/lib/api.js';

export class VendorService {
  /**
   * Fetch all vendors.
   */
  static async getAllVendors(): Promise<IVendor[]> {
    return VendorRepository.findAll();
  }

  /**
   * Fetch vendor by name or code.
   */
  static async getVendorByName(name: string): Promise<IVendor | null> {
    if (!name) throw new Error("Vendor name/code is required");
    return VendorRepository.findByNameOrCode(name);
  }

  /**
   * Add a new vendor with validation and audit logging.
   */
  static async addVendor(payload: IVendorInput, userEmail: string): Promise<{ ok: boolean, code: string }> {
    if (!payload.legalName) throw new Error("Legal Name is required");
    
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
      ifsc: payload.ifsc
    };

    await VendorRepository.create(newVendor);
    await logAudit(userEmail, 'Vendor Added', `${code} ${payload.legalName}`, 'Vendors');
    
    return { ok: true, code };
  }

  /**
   * Update an existing vendor with validation and audit logging.
   */
  static async updateVendor(payload: IVendorInput, userEmail: string): Promise<{ ok: boolean, vendorId: string }> {
    const vendorId = payload.vendorId || payload.vendorCode;
    if (!vendorId) throw new Error("Vendor ID is required for updating");
    
    // Ensure vendor exists
    const existing = await VendorRepository.findByNameOrCode(vendorId);
    
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
      ifsc: payload.ifsc
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
      await VendorRepository.update(vendorId, updateData);
    }

    await logAudit(userEmail, 'Vendor Updated', vendorId, 'Vendors');
    
    return { ok: true, vendorId };
  }
}
