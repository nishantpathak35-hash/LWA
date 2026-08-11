import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceService } from '../../src/modules/invoices/services/InvoiceService';
import { InvoiceRepository } from '../../src/modules/invoices/repositories/InvoiceRepository';
import { PORepository } from '../../src/modules/purchase-orders/repositories/PORepository';
import { VendorPortalAuthService } from '../../src/modules/vendor-portal/services/VendorPortalAuthService';
import * as attachmentsApi from '../../app/lib/api/attachments';

describe('InvoiceService Unit & Security Tests', () => {
  const mockVendorSession = {
    user_type: 'vendor',
    vendor_id: 101,
    vendor_code: 'VND-001',
    vendor_name: 'ABC Suppliers Ltd',
    email: 'accounts@abc.com'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error when vendor submits invoice without vendor auth session', async () => {
    const invalidSession = { email: 'user@luxe.com' }; // internal user session
    await expect(
      InvoiceService.submitVendorInvoice(
        { invoiceNumber: 'INV-101', invoiceDate: '2026-08-11', poNo: 'PO-001', invoiceTotal: 50000, fileName: 'inv.pdf', fileData: 'base64...' },
        invalidSession
      )
    ).rejects.toThrow(/Vendor portal access required/);
  });

  it('rejects invoice upload if PO belongs to a different vendor (Security Isolation)', async () => {
    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-SECRET-999',
      vendor_id: 999,
      vendor_code: 'VND-999',
      vendor_name: 'Other Vendor Ltd',
      approval_status: 'Approved',
      po_value: 100000
    } as any);

    await expect(
      InvoiceService.submitVendorInvoice(
        { invoiceNumber: 'INV-101', invoiceDate: '2026-08-11', poNo: 'PO-SECRET-999', invoiceTotal: 50000, fileName: 'inv.pdf', fileData: 'base64...' },
        mockVendorSession
      )
    ).rejects.toThrow(/does not belong to your vendor account/);
  });

  it('rejects invoice upload if PO status is not Approved', async () => {
    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-DRAFT-101',
      vendor_id: 101,
      vendor_code: 'VND-001',
      vendor_name: 'ABC Suppliers Ltd',
      approval_status: 'Draft',
      status: 'Draft',
      po_value: 100000
    } as any);

    await expect(
      InvoiceService.submitVendorInvoice(
        { invoiceNumber: 'INV-101', invoiceDate: '2026-08-11', poNo: 'PO-DRAFT-101', invoiceTotal: 50000, fileName: 'inv.pdf', fileData: 'base64...' },
        mockVendorSession
      )
    ).rejects.toThrow(/Approved Purchase Orders/);
  });

  it('rejects duplicate invoice number for the same vendor', async () => {
    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-001',
      vendor_id: 101,
      vendor_code: 'VND-001',
      vendor_name: 'ABC Suppliers Ltd',
      approval_status: 'Approved',
      po_value: 100000
    } as any);

    vi.spyOn(InvoiceRepository, 'checkDuplicateInvoice').mockResolvedValue({
      invoice_id: 'INV-EXISTING',
      invoice_number: 'INV-101',
      vendor_code: 'VND-001'
    } as any);

    await expect(
      InvoiceService.submitVendorInvoice(
        { invoiceNumber: 'INV-101', invoiceDate: '2026-08-11', poNo: 'PO-001', invoiceTotal: 50000, fileName: 'inv.pdf', fileData: 'base64...' },
        mockVendorSession
      )
    ).rejects.toThrow(/already been submitted/);
  });

  it('creates invoice and calls Cloudinary upload layer when validation passes', async () => {
    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-001',
      vendor_id: 101,
      vendor_code: 'VND-001',
      vendor_name: 'ABC Suppliers Ltd',
      approval_status: 'Approved',
      po_value: 100000
    } as any);

    vi.spyOn(InvoiceRepository, 'checkDuplicateInvoice').mockResolvedValue(null);
    const uploadSpy = vi.spyOn(attachmentsApi, 'uploadAttachment').mockResolvedValue({ ok: true, url: 'https://res.cloudinary.com/test/inv.pdf' } as any);
    const createSpy = vi.spyOn(InvoiceRepository, 'create').mockResolvedValue();

    const res = await InvoiceService.submitVendorInvoice(
      { invoiceNumber: 'INV-999', invoiceDate: '2026-08-11', poNo: 'PO-001', invoiceTotal: 50000, fileName: 'bill.pdf', fileData: 'base64Data' },
      mockVendorSession
    );

    expect(res.ok).toBe(true);
    expect(res.invoice_id).toMatch(/^INV-/);
    expect(uploadSpy).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'invoice', fileName: 'bill.pdf' }),
      expect.objectContaining({ email: 'accounts@abc.com' })
    );
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_number: 'INV-999',
        vendor_code: 'VND-001',
        po_no: 'PO-001',
        source: 'vendor_portal',
        uploaded_by_type: 'vendor'
      })
    );
  });

  it('updates invoice status successfully', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      invoice_id: 'INV-2026-001',
      invoice_number: 'INV-001',
      status: 'Submitted'
    } as any);

    let updatedFields: any = null;
    vi.spyOn(InvoiceRepository, 'update').mockImplementation(async (id, updates) => {
      updatedFields = updates;
    });

    const res = await InvoiceService.updateInvoiceStatus('INV-2026-001', 'Approved');
    expect(res.ok).toBe(true);
    expect(updatedFields.status).toBe('Approved');
    expect(updatedFields.approved_at).toBeDefined();
  });
});
