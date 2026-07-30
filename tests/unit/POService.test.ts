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
});
