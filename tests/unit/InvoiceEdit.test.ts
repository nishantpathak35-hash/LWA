import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Invoice Editing Unit & Security Tests', () => {
  let InvoiceService: any;
  let InvoiceRepository: any;
  let PORepository: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const serviceModule = await import('../../src/modules/invoices/services/InvoiceService');
    InvoiceService = serviceModule.InvoiceService;

    const repoModule = await import('../../src/modules/invoices/repositories/InvoiceRepository');
    InvoiceRepository = repoModule.InvoiceRepository;

    const poModule = await import('../../src/modules/purchase-orders/repositories/PORepository');
    PORepository = poModule.PORepository;
  });

  it('requires authentication to edit invoice record', async () => {
    await expect(InvoiceService.updateInvoice('INV-123', {}, null)).rejects.toThrow('AUTH:Unauthenticated');
  });

  it('throws error if invoice record is not found', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue(null);
    await expect(InvoiceService.updateInvoice('INV-NON-EXISTENT', {}, { email: 'admin@luxeworx.com', roles: ['admin'] }))
      .rejects.toThrow('Invoice record not found');
  });

  it('rejects invoice edits from users without finance permission', async () => {
    await expect(InvoiceService.updateInvoice('INV-10', {}, { email: 'site@luxeworx.com', roles: ['procurement'] }))
      .rejects.toThrow('Finance permission required');
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
    }, { email: 'admin@luxeworx.com', roles: ['admin'] })).rejects.toThrow('already exists for vendor');
  });

  it('successfully updates invoice details when valid', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      id: 10,
      invoice_id: 'INV-10',
      invoice_number: 'INV-OLD',
      invoice_date: '2026-03-01',
      po_no: 'PO-001',
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
    }, { email: 'admin@luxeworx.com', roles: ['admin'] });

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

  it('successfully updates invoice and remaps to a new valid PO', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      id: 10,
      invoice_id: 'INV-10',
      invoice_number: 'INV-100',
      invoice_date: '2026-03-01',
      po_no: 'PO-OLD-01',
      project: 'Project Alpha',
      vendor_code: 'VEND001',
      vendor_name: 'Vendor One',
      subtotal: 1000,
      tax_amount: 180,
      invoice_total: 1180
    } as any);

    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-NEW-02',
      approval_status: 'Approved',
      project: 'Project Beta',
      vendor_code: 'VEND002',
      vendor_name: 'Vendor Two',
      vendor_id: 42
    } as any);

    vi.spyOn(InvoiceRepository, 'checkDuplicateInvoice').mockResolvedValue(null);
    const updateSpy = vi.spyOn(InvoiceRepository, 'update').mockResolvedValue(undefined);

    const res = await InvoiceService.updateInvoice('INV-10', {
      poNo: 'PO-NEW-02',
      invoiceNumber: 'INV-100',
      invoiceTotal: 1180
    }, { email: 'admin@luxeworx.com', roles: ['admin'] });

    expect(res.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith('INV-10', expect.objectContaining({
      po_no: 'PO-NEW-02',
      project: 'Project Beta',
      vendor_code: 'VEND002',
      vendor_name: 'Vendor Two',
      vendor_id: 42
    }));
  });

  it('rejects remapping to a non-existent PO', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      id: 10,
      invoice_id: 'INV-10',
      invoice_number: 'INV-100',
      po_no: 'PO-OLD-01',
      vendor_code: 'VEND001',
      vendor_name: 'Vendor One',
      invoice_total: 1000
    } as any);

    vi.spyOn(PORepository, 'findById').mockResolvedValue(null);

    await expect(InvoiceService.updateInvoice('INV-10', {
      poNo: 'PO-NON-EXISTENT'
    }, { email: 'admin@luxeworx.com', roles: ['admin'] })).rejects.toThrow('Purchase Order "PO-NON-EXISTENT" not found.');
  });

  it('rejects remapping to a rejected/cancelled PO', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      id: 10,
      invoice_id: 'INV-10',
      invoice_number: 'INV-100',
      po_no: 'PO-OLD-01',
      vendor_code: 'VEND001',
      vendor_name: 'Vendor One',
      invoice_total: 1000
    } as any);

    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-CANCELLED',
      approval_status: 'Cancelled',
      status: 'Cancelled'
    } as any);

    await expect(InvoiceService.updateInvoice('INV-10', {
      poNo: 'PO-CANCELLED'
    }, { email: 'admin@luxeworx.com', roles: ['admin'] })).rejects.toThrow('Invoices can only be mapped to Open, Approved, or Short Closed Purchase Orders');
  });

  it('rejects remapping if invoice number already exists for the new PO vendor', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      id: 10,
      invoice_id: 'INV-10',
      invoice_number: 'INV-COMMON',
      po_no: 'PO-OLD-01',
      vendor_code: 'VEND001',
      vendor_name: 'Vendor One',
      invoice_total: 1000
    } as any);

    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-NEW-02',
      approval_status: 'Approved',
      vendor_code: 'VEND002',
      vendor_name: 'Vendor Two'
    } as any);

    vi.spyOn(InvoiceRepository, 'checkDuplicateInvoice').mockResolvedValue({
      invoice_id: 'EXISTING-INV'
    } as any);

    await expect(InvoiceService.updateInvoice('INV-10', {
      poNo: 'PO-NEW-02'
    }, { email: 'admin@luxeworx.com', roles: ['admin'] })).rejects.toThrow('already exists for vendor "Vendor Two"');
  });

  it('updates invoice with GST breakdown and place of supply', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      id: 10,
      invoice_id: 'INV-10',
      invoice_number: 'INV-2026-GST',
      po_no: 'PO-TEST-01',
      vendor_code: 'VEND001',
      vendor_name: 'Vendor One',
      subtotal: 1000,
      tax_amount: 180,
      invoice_total: 1180
    } as any);

    const updateSpy = vi.spyOn(InvoiceRepository, 'update').mockResolvedValue(undefined as any);

    await InvoiceService.updateInvoice('INV-10', {
      invoiceNumber: 'INV-2026-GST',
      invoiceDate: '2026-09-01',
      subtotal: 1000,
      taxAmount: 180,
      cgstAmount: 90,
      sgstAmount: 90,
      placeOfSupply: '07-Delhi',
      invoiceTotal: 1180
    }, { email: 'admin@luxeworx.com', roles: ['admin'] });

    expect(updateSpy).toHaveBeenCalledWith('INV-10', expect.objectContaining({
      cgst_amount: 90,
      sgst_amount: 90,
      place_of_supply: '07-Delhi'
    }));
  });
});
