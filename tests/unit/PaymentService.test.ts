import { describe, it, expect, vi } from 'vitest';
import { PaymentService } from '../../src/modules/payments/services/PaymentService';
import { POService } from '../../src/modules/purchase-orders/services/POService';

describe('PaymentService unit tests', () => {
  it('throws error when vendor is missing in payment request', async () => {
    await expect(
      PaymentService.createPaymentRequest({ vendor: '', poNo: 'PO-100', amountRequested: 5000 } as any, 'user@luxe.com')
    ).rejects.toThrow('Vendor name is required');
  });

  it('throws error when PO number is missing in payment request', async () => {
    await expect(
      PaymentService.createPaymentRequest({ vendor: 'Vendor A', poNo: '', amountRequested: 5000 } as any, 'user@luxe.com')
    ).rejects.toThrow('PO number is required');
  });

  it('throws error when requested amount is zero or negative', async () => {
    vi.spyOn(POService, 'getPO').mockResolvedValue({ po_no: 'PO-100' } as any);

    await expect(
      PaymentService.createPaymentRequest({ vendor: 'Vendor A', poNo: 'PO-100', amountRequested: 0 } as any, 'user@luxe.com')
    ).rejects.toThrow('Amount Requested must be greater than zero');

    await expect(
      PaymentService.createPaymentRequest({ vendor: 'Vendor A', poNo: 'PO-100', amountRequested: -100 } as any, 'user@luxe.com')
    ).rejects.toThrow('Amount Requested must be greater than zero');
  });

  it('throws error for invalid manual payment amount', async () => {
    await expect(
      PaymentService.createManualPayment({ poNo: 'PO-100', amount: 0 } as any, 'user@luxe.com')
    ).rejects.toThrow('Valid amount is required for manual payment');
  });
});
