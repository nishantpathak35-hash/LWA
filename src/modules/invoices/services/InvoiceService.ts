import { InvoiceRepository } from '../repositories/InvoiceRepository.ts';
import { queryGet } from '../../../../app/lib/db.js';
import { IInvoiceInput, IInvoice } from '../types/Invoice';
import { PORepository } from '../../purchase-orders/repositories/PORepository.ts';
import { VendorRepository } from '../../vendors/repositories/VendorRepository.ts';
import { VendorPortalAuthService } from '../../vendor-portal/services/VendorPortalAuthService.ts';
import { AuthService } from '../../core/services/AuthService.ts';
import { logAudit } from '../../../../app/lib/api.js';
import { uploadAttachment, deleteEntityAttachments } from '../../../../app/lib/api/attachments.js';
import { validateInvoiceFields, belongsToVendor } from './invoiceValidation.js';

/**
 * Verifies whether a Purchase Order is in an active/approved state capable of accepting invoices.
 * Allows Open, Approved, Active, Partially Billed, Billed, Partially Paid, and In Execution.
 */
export function isPOAcceptingInvoices(po: any): boolean {
  if (!po) return false;
  const approvalSt = String(po.approval_status || '').trim().toLowerCase();
  const statusSt = String(po.status || '').trim().toLowerCase();

  const validStatuses = [
    'approved',
    'active',
    'open',
    'partially billed',
    'billed',
    'partially paid',
    'in execution',
    'in progress',
    'short closed',
    'short_closed',
    'closed'
  ];

  if (['rejected', 'cancelled', 'canceled', 'draft'].includes(approvalSt)) {
    return false;
  }
  if (['rejected', 'cancelled', 'canceled'].includes(statusSt)) {
    return false;
  }

  return validStatuses.includes(approvalSt) || validStatuses.includes(statusSt);
}

function requireInvoiceFinancePermission(session: any): void {
  AuthService.requireAuth(session);
  if (AuthService.isSuperAdmin(session?.email)) return;
  const roles = (session?.roles || []).map((role: string) => String(role || '').toLowerCase());
  if (!roles.some((role: string) => ['admin', 'director', 'finance', 'accountant'].includes(role))) {
    throw new Error('AUTH:Unauthorized - Finance permission required');
  }
}


export class InvoiceService {
  /**
   * Generates a stable internal invoice ID: INV-YYYY-XXXX
   */
  private static generateInvoiceId(): string {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${year}-${rand}-${suffix}`;
  }

  /**
   * Vendor Portal — Submit an Invoice against an Approved PO.
   */
  static async submitVendorInvoice(payload: IInvoiceInput, vendorSession: any): Promise<{ ok: boolean; invoice_id: string }> {
    const vendorAuth = VendorPortalAuthService.requireVendorAuth(vendorSession);
    const { vendor_code, vendor_name, vendor_id, email } = vendorAuth;
    validateInvoiceFields(payload);

    const { invoiceNumber, invoiceDate, poNo, subtotal, taxAmount, invoiceTotal, remarks, fileName, fileData, fileType, fileSize } = payload;

    if (!invoiceNumber || !invoiceNumber.trim()) throw new Error('Invoice Number is required.');
    if (!invoiceDate) throw new Error('Invoice Date is required.');
    if (!poNo) throw new Error('PO Number is required.');
    if (!invoiceTotal || Number(invoiceTotal) <= 0) throw new Error('Valid Invoice Total amount is required.');
    if (!fileName || !fileData) throw new Error('Invoice PDF/document file attachment is required.');

    const cleanPoNo = poNo.trim();
    const po = await PORepository.findById(cleanPoNo);
    if (!po) {
      throw new Error(`Purchase Order "${cleanPoNo}" not found.`);
    }

    // MANDATORY APPROVED PO & VENDOR OWNERSHIP VERIFICATION
    const poVendorCode = (po.vendor_code || po.vendor_key || '').trim().toLowerCase();
    const currentVendorCode = vendor_code.trim().toLowerCase();

    if (!belongsToVendor(po, currentVendorCode, vendor_id)) {
      throw new Error(`AUTH: Unauthorized. Purchase Order "${cleanPoNo}" does not belong to your vendor account.`);
    }

    if (!isPOAcceptingInvoices(po)) {
      throw new Error(`Invoices can only be uploaded against Open, Approved, or Short Closed Purchase Orders. PO "${cleanPoNo}" status is "${po.approval_status || po.status}".`);
    }

    // Server-side Duplicate Invoice Prevention
    const duplicate = await InvoiceRepository.checkDuplicateInvoice(vendor_code, invoiceNumber);
    if (duplicate) {
      throw new Error(`Invoice Number "${invoiceNumber.trim()}" has already been submitted for vendor "${vendor_name}".`);
    }

    const invoice_id = InvoiceService.generateInvoiceId();

    // Store Invoice Metadata first in object representation
    const newInvoice: Omit<IInvoice, 'id' | 'created_at'> = {
      invoice_id,
      invoice_number: invoiceNumber.trim(),
      invoice_date: invoiceDate,
      vendor_id: vendor_id || po.vendor_id || null,
      vendor_code: vendor_code,
      vendor_name: vendor_name,
      po_no: po.po_no,
      project: po.project || '',
      subtotal: Number(subtotal || 0),
      tax_amount: Number(taxAmount || 0),
      cgst_amount: Number(payload.cgstAmount ?? (payload as any).cgst_amount ?? 0),
      sgst_amount: Number(payload.sgstAmount ?? (payload as any).sgst_amount ?? 0),
      igst_amount: Number(payload.igstAmount ?? (payload as any).igst_amount ?? 0),
      place_of_supply: payload.placeOfSupply ?? (payload as any).place_of_supply ?? '',
      invoice_total: Number(invoiceTotal),
      status: 'Submitted',
      source: 'vendor_portal',
      uploaded_by: email,
      uploaded_by_type: 'vendor',
      remarks: remarks || '',
      submitted_at: new Date().toISOString()
    };

    // Upload attachment to Cloudinary via existing attachment infrastructure
    try {
      await uploadAttachment({
        entityType: 'invoice',
        entityId: invoice_id,
        fileName: fileName,
        fileType: fileType || 'application/pdf',
        fileSize: fileSize || 0,
        fileData: fileData
      }, { email });
    } catch (uploadErr: any) {
      throw new Error(`Document upload to Cloudinary failed: ${uploadErr.message}`);
    }

    // Persist Invoice to Turso DB
    try {
      await InvoiceRepository.create(newInvoice);
    } catch (dbErr: any) {
      console.error(`Database persistence failed for invoice ${invoice_id}:`, dbErr);
      throw new Error(`Failed to create invoice record: ${dbErr.message}`);
    }

    await logAudit(email, 'Vendor Invoice Uploaded', `Invoice ${invoiceNumber} (${invoice_id}) uploaded against PO ${po.po_no} by ${email}`, 'VendorPortal');

    return { ok: true, invoice_id };
  }

  /**
   * Internal ERP — Upload an Invoice on behalf of a vendor.
   */
  static async submitInternalInvoice(payload: IInvoiceInput, userSession: any): Promise<{ ok: boolean; invoice_id: string }> {
    AuthService.requireAuth(userSession);
    const { email } = userSession;
    validateInvoiceFields(payload);

    const { invoiceNumber, invoiceDate, poNo, vendorCode, subtotal, taxAmount, invoiceTotal, remarks, fileName, fileData, fileType, fileSize } = payload;

    if (!invoiceNumber || !invoiceNumber.trim()) throw new Error('Invoice Number is required.');
    if (!invoiceDate) throw new Error('Invoice Date is required.');
    if (!poNo) throw new Error('PO Number is required.');
    if (!invoiceTotal || Number(invoiceTotal) <= 0) throw new Error('Valid Invoice Total amount is required.');
    if (!fileName || !fileData) throw new Error('Invoice PDF/document file attachment is required.');

    const cleanPoNo = poNo.trim();
    const po = await PORepository.findById(cleanPoNo);
    if (!po) throw new Error(`Purchase Order "${cleanPoNo}" not found.`);

    if (!isPOAcceptingInvoices(po)) {
      throw new Error(`Invoices can only be uploaded against Open, Approved, or Short Closed Purchase Orders. PO "${cleanPoNo}" status is "${po.approval_status || po.status}".`);
    }

    let targetVendor = null;
    const vQuery = vendorCode || po.vendor_code || po.vendor_key;
    if (vQuery) {
      targetVendor = await VendorRepository.findByNameOrCode(vQuery);
    }

    const resolvedVendorCode = targetVendor ? targetVendor.vendor_code : (po.vendor_code || po.vendor_key);
    const resolvedVendorName = targetVendor ? targetVendor.legal_name : po.vendor_name;
    if (!resolvedVendorCode || !belongsToVendor(po, resolvedVendorCode, targetVendor?.id)) throw new Error('Invoice vendor must match the Purchase Order vendor.');

    const duplicate = await InvoiceRepository.checkDuplicateInvoice(resolvedVendorCode, invoiceNumber);
    if (duplicate) {
      throw new Error(`Invoice Number "${invoiceNumber.trim()}" already exists for vendor "${resolvedVendorName}".`);
    }

    const invoice_id = InvoiceService.generateInvoiceId();

    const newInvoice: Omit<IInvoice, 'id' | 'created_at'> = {
      invoice_id,
      invoice_number: invoiceNumber.trim(),
      invoice_date: invoiceDate,
      vendor_id: targetVendor ? targetVendor.id : po.vendor_id || null,
      vendor_code: resolvedVendorCode,
      vendor_name: resolvedVendorName,
      po_no: po.po_no,
      project: po.project || '',
      subtotal: Number(subtotal || 0),
      tax_amount: Number(taxAmount || 0),
      cgst_amount: Number(payload.cgstAmount ?? (payload as any).cgst_amount ?? 0),
      sgst_amount: Number(payload.sgstAmount ?? (payload as any).sgst_amount ?? 0),
      igst_amount: Number(payload.igstAmount ?? (payload as any).igst_amount ?? 0),
      place_of_supply: payload.placeOfSupply ?? (payload as any).place_of_supply ?? '',
      invoice_total: Number(invoiceTotal),
      status: 'Submitted',
      source: 'internal_upload',
      uploaded_by: email,
      uploaded_by_type: 'internal',
      remarks: remarks || '',
      submitted_at: new Date().toISOString()
    };

    // Upload document to Cloudinary
    await uploadAttachment({
      entityType: 'invoice',
      entityId: invoice_id,
      fileName,
      fileType: fileType || 'application/pdf',
      fileSize: fileSize || 0,
      fileData
    }, { email });

    // Insert invoice record
    await InvoiceRepository.create(newInvoice);

    await logAudit(email, 'Internal Invoice Created', `Invoice ${invoiceNumber} (${invoice_id}) uploaded internally for vendor ${resolvedVendorName} against PO ${po.po_no}`, 'Invoices');

    return { ok: true, invoice_id };
  }

  /**
   * Internal ERP — Update invoice status (e.g. Approved, Rejected, Under Review).
   */
  static async updateInvoiceStatus(invoiceId: string, status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Paid', rejectionReason?: string, userSession?: any): Promise<{ ok: boolean }> {
    requireInvoiceFinancePermission(userSession);
    if (!['Submitted', 'Under Review', 'Approved', 'Rejected', 'Paid'].includes(status)) throw new Error('Invalid invoice status');

    const invoice = await InvoiceRepository.findById(invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

    const updates: Partial<IInvoice> = {
      status,
      rejection_reason: rejectionReason || null
    };

    if (status === 'Under Review') updates.reviewed_at = new Date().toISOString();
    if (status === 'Approved') updates.approved_at = new Date().toISOString();

    await InvoiceRepository.update(invoice.invoice_id, updates);

    // Rejected invoices retain their supporting documents for review and audit.

    if (userSession) {
      await logAudit(userSession.email, 'Invoice Status Updated', `Invoice ${invoice.invoice_number} status changed to ${status}${rejectionReason ? ` (Reason: ${rejectionReason})` : ''}`, 'Invoices');
    }

    return { ok: true };
  }

  /**
   * Vendor Portal — List Approved POs for the authenticated vendor.
   */
  static async getVendorPortalPOs(vendorSession: any): Promise<any[]> {
    const vendorAuth = VendorPortalAuthService.requireVendorAuth(vendorSession);
    const { vendor_code, vendor_id } = vendorAuth;

    const allPOs = await PORepository.findAll();
    const cleanVendorCode = vendor_code.trim().toLowerCase();

    // Filter to Approved POs belonging to vendor
    const vendorPOs = allPOs.filter(po => {
      const vCode = (po.vendor_code || po.vendor_key || '').trim().toLowerCase();
      const belongs = belongsToVendor(po, cleanVendorCode, vendor_id);
      const isApproved = isPOAcceptingInvoices(po);
      return belongs && isApproved;
    });

    // Attach invoice summary per PO
    const result = [];
    for (const po of vendorPOs) {
      const summary = await InvoiceRepository.getPOInvoiceSummary(po.po_no);
      result.push({
        ...po,
        total_invoiced: summary.totalInvoiced,
        total_approved_invoices: summary.totalApproved,
        invoice_count: summary.invoiceCount,
        remaining_balance: Math.max(0, (po.revised_po_value || po.po_value || 0) - summary.totalApproved)
      });
    }

    return result;
  }

  /**
   * Vendor Portal — Get details of a specific Approved PO.
   */
  static async getVendorPortalPO(poNo: string, vendorSession: any): Promise<any> {
    const vendorAuth = VendorPortalAuthService.requireVendorAuth(vendorSession);
    const { vendor_code, vendor_id } = vendorAuth;

    const po = await PORepository.findById(poNo);
    if (!po) throw new Error(`PO not found: ${poNo}`);

    const vCode = (po.vendor_code || po.vendor_key || '').trim().toLowerCase();
    if (!belongsToVendor(po, vendor_code, vendor_id)) {
      throw new Error('AUTH: Unauthorized access to PO');
    }

    if (!isPOAcceptingInvoices(po)) {
      throw new Error('AUTH: PO is not open or approved');
    }

    const items = await PORepository.findItemsByPoNo(po.po_no);
    const summary = await InvoiceRepository.getPOInvoiceSummary(po.po_no);

    return {
      ...po,
      items,
      total_invoiced: summary.totalInvoiced,
      total_approved_invoices: summary.totalApproved,
      remaining_balance: Math.max(0, (po.revised_po_value || po.po_value || 0) - summary.totalApproved)
    };
  }

  /**
   * Vendor Portal — List Invoices submitted by vendor.
   */
  static async getVendorPortalInvoices(vendorSession: any): Promise<IInvoice[]> {
    const vendorAuth = VendorPortalAuthService.requireVendorAuth(vendorSession);
    return InvoiceRepository.findByVendor(vendorAuth.vendor_code);
  }

  /**
   * Internal ERP — List all invoices with filtering.
   */
  static async listInvoices(filters: any = {}, userSession: any): Promise<any[]> {
    AuthService.requireAuth(userSession);
    const invoices = await InvoiceRepository.findAll(filters);

    // Attach PO details for context safely
    const enriched = [];
    for (const inv of invoices) {
      try {
        const summary = inv.po_no ? await InvoiceRepository.getPOInvoiceSummary(inv.po_no) : { totalInvoiced: 0, totalApproved: 0, count: 0 };
        enriched.push({
          ...inv,
          po_summary: summary
        });
      } catch (err) {
        enriched.push({
          ...inv,
          po_summary: { totalInvoiced: 0, totalApproved: 0, count: 0 }
        });
      }
    }

    return enriched;
  }

  /**
   * Get single invoice details with attachments.
   */
  static async getInvoice(invoiceId: string, session: any): Promise<any> {
    if (!session) throw new Error('AUTH:Unauthenticated');
    const inv = await InvoiceRepository.findById(invoiceId);
    if (!inv) throw new Error(`Invoice not found: ${invoiceId}`);

    // If vendor session, enforce ownership check
    if (session && session.user_type === 'vendor') {
      if (inv.vendor_code.trim().toLowerCase() !== session.vendor_code.trim().toLowerCase()) {
        throw new Error('AUTH: Unauthorized access to invoice');
      }
    } else if (session) {
      AuthService.requireAuth(session);
    }

    const { getAttachments } = await import('../../../../app/lib/api/attachments.js');
    const attachments = await getAttachments({ entityType: 'invoice', entityId: inv.invoice_id }, session);

    const { PORepository } = await import('../../purchase-orders/repositories/PORepository.ts');
    const { VendorRepository } = await import('../../vendors/repositories/VendorRepository.ts');

    let po: any = null;
    let items: any[] = [];
    if (inv.po_no) {
      try {
        po = await PORepository.findById(inv.po_no);
        items = await PORepository.findItemsByPoNo(inv.po_no);
      } catch (e) {
        console.warn('Failed to load PO/items:', e);
      }
    }

    let vendor: any = null;
    if (inv.vendor_code || inv.vendor_name) {
      try {
        vendor = await VendorRepository.findByNameOrCode(inv.vendor_code || inv.vendor_name);
      } catch (e) {
        console.warn('Failed to load vendor:', e);
      }
    }

    const isPaid = String(inv.status).toLowerCase() === 'paid';
    const balanceDue = isPaid ? 0 : Number(inv.invoice_total || 0);

    return {
      ...inv,
      po,
      items: items || [],
      vendor,
      balance_due: balanceDue,
      attachments: attachments || []
    };
  }

  /**
   * Internal ERP — Get all invoices for a specific PO with summary calculations.
   */
  static async getPOInvoices(poNo: string, session: any): Promise<any> {
    AuthService.requireAuth(session);
    const po = await PORepository.findById(poNo);
    if (!po) throw new Error(`PO not found: ${poNo}`);

    const invoices = await InvoiceRepository.findByPO(poNo);
    const summary = await InvoiceRepository.getPOInvoiceSummary(poNo);

    return {
      po_no: po.po_no,
      po_value: po.revised_po_value || po.po_value || 0,
      total_invoiced: summary.totalInvoiced,
      total_approved: summary.totalApproved,
      remaining_balance: Math.max(0, (po.revised_po_value || po.po_value || 0) - summary.totalApproved),
      invoices
    };
  }

  /**
   * Internal ERP — Delete an invoice line item / record.
   */
  /**
   * Internal ERP - Edit an existing invoice record.
   */
  static async updateInvoice(invoiceId: string, updates: any, session: any): Promise<{ ok: boolean }> {
    requireInvoiceFinancePermission(session);
    const invoice = await InvoiceRepository.findById(invoiceId);
    if (!invoice) throw new Error("Invoice record not found");

    const newInvoiceNumber = updates.invoiceNumber ? String(updates.invoiceNumber).trim() : invoice.invoice_number;

    let targetPoNo = invoice.po_no;
    let targetProject = invoice.project;
    let targetVendorId = invoice.vendor_id;
    let targetVendorCode = invoice.vendor_code;
    let targetVendorName = invoice.vendor_name;

    if (updates.poNo && String(updates.poNo).trim() !== invoice.po_no) {
      const cleanPoNo = String(updates.poNo).trim();
      const po = await PORepository.findById(cleanPoNo);
      if (!po) {
        throw new Error(`Purchase Order "${cleanPoNo}" not found.`);
      }

      if (!isPOAcceptingInvoices(po)) {
        throw new Error(`Invoices can only be mapped to Open, Approved, or Short Closed Purchase Orders. PO "${cleanPoNo}" status is "${po.approval_status || po.status}".`);
      }

      targetPoNo = po.po_no;
      const rawPo = po as any;
      targetProject = po.project || rawPo.project_name || invoice.project || '';

      if (po.vendor_code || po.vendor_key) {
        targetVendorCode = po.vendor_code || po.vendor_key;
      }
      if (po.vendor_name || rawPo.vendor) {
        targetVendorName = po.vendor_name || rawPo.vendor;
      }
      if (po.vendor_id) {
        targetVendorId = po.vendor_id;
      } else if (targetVendorCode) {
        try {
          const v = await VendorRepository.findByNameOrCode(targetVendorCode);
          if (v?.id) targetVendorId = v.id;
        } catch {
          // Keep existing vendor_id if lookup fails or mock unneeded
        }
      }
    }

    if (newInvoiceNumber !== invoice.invoice_number || targetVendorCode !== invoice.vendor_code) {
      const duplicate = await InvoiceRepository.checkDuplicateInvoice(targetVendorCode, newInvoiceNumber, invoice.invoice_id);
      if (duplicate) {
        throw new Error(`Invoice Number "${newInvoiceNumber}" already exists for vendor "${targetVendorName}".`);
      }
    }

    let invoice_total = updates.invoiceTotal !== undefined && updates.invoiceTotal !== null && updates.invoiceTotal !== '' 
      ? Number(updates.invoiceTotal) 
      : invoice.invoice_total;
    let subtotal = updates.subtotal !== undefined && updates.subtotal !== null && updates.subtotal !== ''
      ? Number(updates.subtotal) 
      : invoice.subtotal;
    let tax_amount = updates.taxAmount !== undefined && updates.taxAmount !== null && updates.taxAmount !== ''
      ? Number(updates.taxAmount) 
      : invoice.tax_amount;

    if (!Number.isFinite(invoice_total) || invoice_total <= 0) throw new Error('Valid Invoice Total amount is required.');

    // Validate fields
    validateInvoiceFields({
      invoiceNumber: newInvoiceNumber,
      invoiceDate: updates.invoiceDate || invoice.invoice_date,
      subtotal,
      taxAmount: tax_amount,
      invoiceTotal: invoice_total
    }, { partial: true });

    // Optional replacement attachment
    if (updates.fileName && updates.fileData) {
      try {
        await deleteEntityAttachments('invoice', invoice.invoice_id);
        await uploadAttachment({
          entityType: 'invoice',
          entityId: invoice.invoice_id,
          fileName: updates.fileName,
          fileType: updates.fileType || 'application/pdf',
          fileSize: updates.fileSize || 0,
          fileData: updates.fileData
        }, session);
      } catch (uploadErr: any) {
        throw new Error(`Failed to upload updated attachment: ${uploadErr.message}`);
      }
    }

    const repoUpdates: Partial<IInvoice> = {
      invoice_number: newInvoiceNumber,
      invoice_date: updates.invoiceDate || invoice.invoice_date,
      subtotal,
      tax_amount,
      invoice_total,
      remarks: updates.remarks !== undefined ? updates.remarks : invoice.remarks
    };

    if (updates.cgstAmount !== undefined || updates.cgst_amount !== undefined) {
      repoUpdates.cgst_amount = Number(updates.cgstAmount ?? updates.cgst_amount ?? 0);
    }
    if (updates.sgstAmount !== undefined || updates.sgst_amount !== undefined) {
      repoUpdates.sgst_amount = Number(updates.sgstAmount ?? updates.sgst_amount ?? 0);
    }
    if (updates.igstAmount !== undefined || updates.igst_amount !== undefined) {
      repoUpdates.igst_amount = Number(updates.igstAmount ?? updates.igst_amount ?? 0);
    }
    if (updates.placeOfSupply !== undefined || updates.place_of_supply !== undefined) {
      repoUpdates.place_of_supply = updates.placeOfSupply ?? updates.place_of_supply ?? '';
    }

    if (targetPoNo !== invoice.po_no) {
      repoUpdates.po_no = targetPoNo;
      repoUpdates.project = targetProject;
      repoUpdates.vendor_id = targetVendorId;
      repoUpdates.vendor_code = targetVendorCode;
      repoUpdates.vendor_name = targetVendorName;
    }

    await InvoiceRepository.update(invoice.invoice_id, repoUpdates);

    if (session?.email) {
      const diffs: string[] = [];
      if (newInvoiceNumber !== invoice.invoice_number) diffs.push(`Invoice #: ${invoice.invoice_number} → ${newInvoiceNumber}`);
      if (targetPoNo !== invoice.po_no) diffs.push(`PO: ${invoice.po_no} → ${targetPoNo}`);
      if (updates.invoiceDate && updates.invoiceDate !== invoice.invoice_date) diffs.push(`Date: ${invoice.invoice_date} → ${updates.invoiceDate}`);
      if (invoice_total !== invoice.invoice_total) diffs.push(`Total: ₹${invoice.invoice_total} → ₹${invoice_total}`);
      if (subtotal !== invoice.subtotal) diffs.push(`Subtotal: ₹${invoice.subtotal} → ₹${subtotal}`);
      if (tax_amount !== invoice.tax_amount) diffs.push(`Tax: ₹${invoice.tax_amount} → ₹${tax_amount}`);
      if (updates.remarks !== undefined && updates.remarks !== invoice.remarks) diffs.push(`Remarks: "${invoice.remarks || ''}" → "${updates.remarks}"`);
      if (updates.fileName) diffs.push(`Replaced attachment with: ${updates.fileName}`);

      const auditDetail = diffs.length > 0 
        ? `Updated invoice ${newInvoiceNumber} (${invoice.invoice_id}): ${diffs.join('; ')}`
        : `Updated invoice ${newInvoiceNumber} (${invoice.invoice_id})`;

      await logAudit(session.email, 'Invoice Updated', auditDetail, 'Invoices');
    }

    return { ok: true };
  }

  static async deleteInvoice(invoiceId: string, session: any): Promise<{ ok: boolean }> {
    requireInvoiceFinancePermission(session);
    const invoice = await InvoiceRepository.findById(invoiceId);
    if (!invoice) throw new Error("Invoice record not found");

    if (invoice.status === 'Paid') {
      throw new Error('Cannot delete a paid or settled invoice. Please record a credit note or adjustment instead.');
    }

    try {
      const linkedPR = await queryGet(
        `SELECT pr_id FROM payment_requests WHERE invoice_id = ? AND stage != 'Rejected' LIMIT 1`,
        [invoice.invoice_id]
      );
      if (linkedPR?.pr_id) {
        throw new Error(`Cannot delete invoice "${invoice.invoice_number}" because Payment Request #${linkedPR.pr_id} is linked to it.`);
      }
    } catch (e: any) {
      if (e.message?.includes('Cannot delete invoice')) throw e;
    }

    try {
      const linkedCN = await queryGet(
        `SELECT cn_number FROM credit_notes WHERE invoice_id = ? AND status != 'Deleted' LIMIT 1`,
        [invoice.invoice_id]
      );
      if (linkedCN?.cn_number) {
        throw new Error(`Cannot delete invoice "${invoice.invoice_number}" because Credit Note "${linkedCN.cn_number}" is linked to it.`);
      }
    } catch (e: any) {
      if (e.message?.includes('Cannot delete invoice')) throw e;
    }

    await InvoiceRepository.delete(invoice.invoice_id || invoiceId);

    // Clean up all attachments of deleted invoice from Cloudinary & DB
    try {
      await deleteEntityAttachments('invoice', invoice.invoice_id || invoiceId);
    } catch (err) {
      console.warn(`Failed to clean up attachments for deleted invoice ${invoice.invoice_id}:`, err);
    }

    if (session?.email) {
      await logAudit(session.email, 'Invoice Deleted', `Deleted invoice ${invoice.invoice_number} (${invoice.invoice_id})`, 'Invoices');
    }

    return { ok: true };
  }
}
