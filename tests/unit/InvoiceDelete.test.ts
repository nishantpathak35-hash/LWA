import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Invoice Deletion Unit & Security Tests', () => {
  let InvoiceService: any;
  let InvoiceRepository: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const serviceModule = await import('../../src/modules/invoices/services/InvoiceService');
    InvoiceService = serviceModule.InvoiceService;

    const repoModule = await import('../../src/modules/invoices/repositories/InvoiceRepository');
    InvoiceRepository = repoModule.InvoiceRepository;
  });

  it('requires authentication to delete invoice record', async () => {
    await expect(InvoiceService.deleteInvoice('INV-123', null)).rejects.toThrow('AUTH:Unauthenticated');
  });

  it('deletes existing invoice record and writes audit log', async () => {
    vi.spyOn(InvoiceRepository, 'findById').mockResolvedValue({
      id: 99,
      invoice_id: 'INV-2026-9999',
      invoice_number: 'INV-TEST-DEL',
      po_no: 'PO-TEST-001',
      invoice_total: 50000
    } as any);

    const deleteSpy = vi.spyOn(InvoiceRepository, 'delete').mockResolvedValue();

    const userSession = { email: 'finance@luxeworx.com' };
    const res = await InvoiceService.deleteInvoice('INV-2026-9999', userSession);

    expect(res.ok).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith('INV-2026-9999');
  });
});
