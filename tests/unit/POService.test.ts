import { describe, it, expect, vi } from 'vitest';
import { POService } from '../../src/modules/purchase-orders/services/POService';
import { PORepository } from '../../src/modules/purchase-orders/repositories/PORepository';

describe('POService unit tests', () => {
  it('throws error when getPO is called without PO Number', async () => {
    await expect(POService.getPO('')).rejects.toThrow('PO Number is required');
  });

  it('throws error when getPOItems is called without PO Number', async () => {
    await expect(POService.getPOItems('')).rejects.toThrow('PO Number is required');
  });

  it('throws duplicate error when creating PO with existing PO Number', async () => {
    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-EXISTING',
      vendor_name: 'Vendor X',
      po_value: 10000
    } as any);

    await expect(
      POService.createPO({ poNo: 'PO-EXISTING', vendorName: 'Vendor X', poValue: 10000 } as any, 'user@luxe.com')
    ).rejects.toThrow('already exists');
  });

  it('updates PO status to Short Closed when shortClosePO is called', async () => {
    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-101',
      status: 'Approved',
      notes: ''
    } as any);

    let updatedPayload: any = null;
    vi.spyOn(PORepository, 'update').mockImplementation(async (poNo, updates) => {
      updatedPayload = updates;
    });

    const res = await POService.shortClosePO('PO-101', 'user@luxe.com', 'Done');
    expect(res.ok).toBe(true);
    expect(updatedPayload.status).toBe('Short Closed');
    expect(updatedPayload.approval_status).toBe('Short Closed');
  });

  it('updates po_value and revised_po_value to paid amount or custom final value on short close', async () => {
    vi.spyOn(PORepository, 'findById').mockResolvedValue({
      po_no: 'PO-102',
      status: 'Approved',
      po_value: 100000,
      legacy_paid: 60000,
      paid: 60000,
      notes: ''
    } as any);

    let updatedPayload: any = null;
    vi.spyOn(PORepository, 'update').mockImplementation(async (poNo, updates) => {
      updatedPayload = updates;
    });

    // Case 1: with explicit final value
    await POService.shortClosePO('PO-102', 'user@luxe.com', 'Closed with extra settlement', 65000);
    expect(updatedPayload.po_value).toBe(65000);
    expect(updatedPayload.revised_po_value).toBe(65000);
    expect(updatedPayload.notes).toContain('PO Value revised from ₹1,00,000 to ₹65,000');

    // Case 2: default to paid amount when final value not explicitly passed
    await POService.shortClosePO('PO-102', 'user@luxe.com', 'Closed at paid amount');
    expect(updatedPayload.po_value).toBe(60000);
    expect(updatedPayload.revised_po_value).toBe(60000);
    expect(updatedPayload.notes).toContain('PO Value revised from ₹1,00,000 to ₹60,000');
  });
});
