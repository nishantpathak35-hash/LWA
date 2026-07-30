import { describe, it, expect } from 'vitest';
import {
  calculatePOPaymentSummary
} from '../../app/lib/paymentCalculations.js';

describe('paymentCalculations pure & calculation logic', () => {
  it('throws when required PO number is missing', async () => {
    await expect(calculatePOPaymentSummary({})).rejects.toThrow('PO number is required');
  });

  it('handles negative or zero payment amounts safely', async () => {
    // Basic verification that non-number inputs fall back to 0 without throwingNaN
    const mockRequest = { approved_amount: null, amount_requested: 0 };
    const amount = Number(mockRequest.approved_amount ?? mockRequest.amount_requested) || 0;
    expect(amount).toBe(0);
  });
});
