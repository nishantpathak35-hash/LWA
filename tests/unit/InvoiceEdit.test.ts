import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Invoice Editing Unit & Security Tests', () => {
  let InvoiceService: any;
  let InvoiceRepository: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const serviceModule = await import('../../src/modules/invoices/services/InvoiceService');
    InvoiceService = serviceModule.InvoiceService;

    const repoModule = await import('../../src/modules/invoices/repositories/InvoiceRepository');
    InvoiceRepository = repoModule.InvoiceRepository;
  });

  it('requires authentication to edit invoice record', async () => {
    await expect(InvoiceService.updateInvoice('INV-123', {}, null)).rejects.toThrow('AUTH:Unauthenticated');
  });

  it('throws error if invoice record is not found', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue(null);
    await expect(InvoiceService.updateInvoice('INV-NON-EXISTENT', {}, { email: 'admin@luxeworx.com' }))
      .rejects.toThrow('Invoice record not found');
  });

  it('prevents duplicate invoice number for the same vendor', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      id: 10,
      invoice_id: 'INV-10',
      invoice_number: 'INV-OLD',
      vendor_code: 'VEND001',
      vendor_name: 'Test Vendor',
      invoice_total: 1000
    } as any);

    vi.spyOn(InvoiceRepository, 'checkDuplicateInvoice').mockResolvedValue({
      invoice_id: 'INV-ANOTHER'
    } as any);

    await expect(InvoiceService.updateInvoice('INV-10', {
      invoiceNumber: 'INV-DUPLICATE'
    }, { email: 'admin@luxeworx.com' })).rejects.toThrow('already exists for vendor');
  });

  it('successfully updates invoice details when valid', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      id: 10,
      invoice_id: 'INV-10',
      invoice_number: 'INV-OLD',
      invoice_date: '2026-03-01',
      vendor_code: 'VEND001',
      vendor_name: 'Test Vendor',
      subtotal: 1000,
      tax_amount: 180,
      invoice_total: 1180,
      remarks: 'Old notes'
    } as any);

    vi.spyOn(InvoiceRepository, 'checkDuplicateInvoice').mockResolvedValue(null);
    const updateSpy = vi.spyOn(InvoiceRepository, 'update').mockResolvedValue(undefined);

    const res = await InvoiceService.updateInvoice('INV-10', {
      invoiceNumber: 'INV-NEW-99',
      invoiceDate: '2026-03-15',
      subtotal: 2000,
      taxAmount: 360,
      invoiceTotal: 2360,
      remarks: 'Updated remarks'
    }, { email: 'admin@luxeworx.com' });

    expect(res.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith('INV-10', {
      invoice_number: 'INV-NEW-99',
      invoice_date: '2026-03-15',
      subtotal: 2000,
      tax_amount: 360,
      invoice_total: 2360,
      remarks: 'Updated remarks'
    });
  });
});
