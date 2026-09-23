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

  it('updates amount_requested and approved_amount when editing payment request', async () => {
    const { PaymentRepository } = await import('../../src/modules/payments/repositories/PaymentRepository');
    vi.spyOn(PaymentRepository, 'findRequestById').mockResolvedValue({
      pr_id: 101,
      po_no: 'PO-100',
      stage: 'Pending Procurement',
      amount_requested: 5000,
      approved_amount: 5000
    } as any);

    let capturedUpdates: any = null;
    vi.spyOn(PaymentRepository, 'updateRequest').mockImplementation(async (id, updates) => {
      capturedUpdates = updates;
    });

    const res = await PaymentService.updatePaymentRequest(101, { amountRequested: 7500 }, { email: 'user@luxe.com', roles: ['maker'], active: true });
    expect(res.ok).toBe(true);
    expect(capturedUpdates.amount_requested).toBe(7500);
    expect(capturedUpdates.approved_amount).toBe(7500);
  });
  it('allows admin or finance to edit remitted payment request and routes to updateRemittedRequest', async () => {
    const { PaymentRepository } = await import('../../src/modules/payments/repositories/PaymentRepository');
    vi.spyOn(PaymentRepository, 'findRequestById').mockResolvedValue({
      pr_id: 202,
      po_no: 'PO-200',
      stage: 'Remitted',
      remittance: 'Remitted',
      amount_requested: 50000,
      approved_amount: 50000,
      tds_amount: 1000
    } as any);

    let capturedRemittedUpdates: any = null;
    let capturedPoNo: string = '';
    vi.spyOn(PaymentRepository, 'updateRemittedRequest').mockImplementation(async (id, updates, poNo) => {
      capturedRemittedUpdates = updates;
      capturedPoNo = poNo;
    });

    const res = await PaymentService.updatePaymentRequest(
      202,
      { amountRequested: 60000, approved_amount: 60000, tds_amount: 1200, remittance_ref: 'UTR-999', adminOverride: true },
      { email: 'finance@luxeworxatelier.com', roles: ['finance'], active: true }
    );

    expect(res.ok).toBe(true);
    expect(capturedRemittedUpdates.amount_requested).toBe(60000);
    expect(capturedRemittedUpdates.approved_amount).toBe(60000);
    expect(capturedRemittedUpdates.tds_amount).toBe(1200);
    expect(capturedRemittedUpdates.remittance_ref).toBe('UTR-999');
    expect(capturedPoNo).toBe('PO-200');
  });

  it('rejects unauthorized non-admin/non-finance user from editing remitted payment request', async () => {
    const { PaymentRepository } = await import('../../src/modules/payments/repositories/PaymentRepository');
    vi.spyOn(PaymentRepository, 'findRequestById').mockResolvedValue({
      pr_id: 202,
      po_no: 'PO-200',
      stage: 'Remitted',
      remittance: 'Remitted',
      amount_requested: 50000
    } as any);

    await expect(
      PaymentService.updatePaymentRequest(
        202,
        { amountRequested: 60000 },
        { email: 'site@luxe.com', roles: ['site'], active: true }
      )
    ).rejects.toThrow('AUTH:Unauthorized - Only Director, Admin, or Finance can edit remitted payments');
  });
  it('creates payment request with payment_mode and updates payment_mode on edit', async () => {
    const { PaymentRepository } = await import('../../src/modules/payments/repositories/PaymentRepository');
    vi.spyOn(POService, 'getPO').mockResolvedValue({ po_no: 'PO-100', vendor: 'Vendor A', vendor_key: 'V-001', vendor_name: 'Vendor A' } as any);
    vi.spyOn(PaymentRepository, 'findActiveRequestsByPOAndAmount').mockResolvedValue([]);
    
    let capturedCreatePayload: any = null;
    vi.spyOn(PaymentRepository, 'createRequest').mockImplementation(async (payload) => {
      capturedCreatePayload = payload;
    });

    const createRes = await PaymentService.createPaymentRequest({
      vendor: 'Vendor A',
      poNo: 'PO-100',
      amountRequested: 15000,
      payment_mode: 'Cheque'
    } as any, 'maker@luxe.com');

    expect(createRes.ok).toBe(true);
    expect(capturedCreatePayload.payment_mode).toBe('Cheque');

    // Test update with payment_mode
    vi.spyOn(PaymentRepository, 'findRequestById').mockResolvedValue({
      pr_id: 303,
      po_no: 'PO-100',
      stage: 'Pending Procurement',
      amount_requested: 15000,
      payment_mode: 'Cheque'
    } as any);

    let capturedUpdates: any = null;
    vi.spyOn(PaymentRepository, 'updateRequest').mockImplementation(async (id, updates) => {
      capturedUpdates = updates;
    });

    const updateRes = await PaymentService.updatePaymentRequest(303, {
      payment_mode: 'NEFT'
    }, { email: 'admin@luxe.com', roles: ['admin'], active: true });

    expect(updateRes.ok).toBe(true);
    expect(capturedUpdates.payment_mode).toBe('NEFT');
  });
});
