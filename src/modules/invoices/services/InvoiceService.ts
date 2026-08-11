import { InvoiceRepository } from '../repositories/InvoiceRepository.ts';
import { IInvoiceInput, IInvoice } from '../types/Invoice';
import { PORepository } from '../../purchase-orders/repositories/PORepository.ts';
import { VendorRepository } from '../../vendors/repositories/VendorRepository.ts';
import { VendorPortalAuthService } from '../../vendor-portal/services/VendorPortalAuthService.ts';
import { AuthService } from '../../core/services/AuthService.ts';
import { logAudit } from '../../../../app/lib/api.js';
import { uploadAttachment, deleteEntityAttachments } from '../../../../app/lib/api/attachments.js';

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

    if (poVendorCode !== currentVendorCode && po.vendor_id !== vendor_id) {
      throw new Error(`AUTH: Unauthorized. Purchase Order "${cleanPoNo}" does not belong to your vendor account.`);
    }

    const st = String(po.approval_status || po.status || '').trim().toLowerCase();
    if (st !== 'approved' && st !== 'active') {
      throw new Error(`Invoices can only be uploaded against Approved Purchase Orders. PO "${cleanPoNo}" status is "${po.approval_status || po.status}".`);
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

    const { invoiceNumber, invoiceDate, poNo, vendorCode, subtotal, taxAmount, invoiceTotal, remarks, fileName, fileData, fileType, fileSize } = payload;

    if (!invoiceNumber || !invoiceNumber.trim()) throw new Error('Invoice Number is required.');
    if (!invoiceDate) throw new Error('Invoice Date is required.');
    if (!poNo) throw new Error('PO Number is required.');
    if (!invoiceTotal || Number(invoiceTotal) <= 0) throw new Error('Valid Invoice Total amount is required.');
    if (!fileName || !fileData) throw new Error('Invoice PDF/document file attachment is required.');

    const cleanPoNo = poNo.trim();
    const po = await PORepository.findById(cleanPoNo);
    if (!po) throw new Error(`Purchase Order "${cleanPoNo}" not found.`);

    let targetVendor = null;
    const vQuery = vendorCode || po.vendor_code || po.vendor_key;
    if (vQuery) {
      targetVendor = await VendorRepository.findByNameOrCode(vQuery);
    }

    const resolvedVendorCode = targetVendor ? targetVendor.vendor_code : (po.vendor_code || po.vendor_key);
    const resolvedVendorName = targetVendor ? targetVendor.legal_name : po.vendor_name;

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
    if (userSession) AuthService.requireAuth(userSession);

    const invoice = await InvoiceRepository.findById(invoiceId);
    if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

    const updates: Partial<IInvoice> = {
      status,
      rejection_reason: rejectionReason || null
    };

    if (status === 'Under Review') updates.reviewed_at = new Date().toISOString();
    if (status === 'Approved') updates.approved_at = new Date().toISOString();

    await InvoiceRepository.update(invoice.invoice_id, updates);

    // If rejected, supporting attachment is no longer needed: delete it from Cloudinary and DB
    if (status === 'Rejected') {
      try {
        await deleteEntityAttachments('invoice', invoice.invoice_id);
      } catch (err) {
        console.warn(`Failed to clean up attachments for rejected invoice ${invoice.invoice_id}:`, err);
      }
    }

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
      const belongs = vCode === cleanVendorCode || po.vendor_id === vendor_id;
      const st = (po.approval_status || po.status || '').trim().toLowerCase();
      const isApproved = st === 'approved' || st === 'active';
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
    if (vCode !== vendor_code.trim().toLowerCase() && po.vendor_id !== vendor_id) {
      throw new Error('AUTH: Unauthorized access to PO');
    }

    const st = (po.approval_status || po.status || '').trim().toLowerCase();
    if (st !== 'approved' && st !== 'active') {
      throw new Error('AUTH: PO is not approved');
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

    return {
      ...inv,
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
  static async deleteInvoice(invoiceId: string, session: any): Promise<{ ok: boolean }> {
    AuthService.requireAuth(session);
    const invoice = await InvoiceRepository.findById(invoiceId);
    if (!invoice) throw new Error("Invoice record not found");

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
