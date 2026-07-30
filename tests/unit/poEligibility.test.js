import { describe, it, expect } from 'vitest';
import { normalizePOStatus, isPOEligibleForPayment, getPOPaymentIneligibilityReason } from '../../app/lib/poEligibility.js';

describe('poEligibility tests', () => {
  describe('normalizePOStatus', () => {
    it('returns normalized lowercase status string', () => {
      expect(normalizePOStatus({ approval_status: ' Approved ' })).toBe('approved');
      expect(normalizePOStatus({ status: 'CANCELLED' })).toBe('cancelled');
      expect(normalizePOStatus({})).toBe('');
    });
  });

  describe('isPOEligibleForPayment', () => {
    it('returns true for active, approved, or pending status', () => {
      expect(isPOEligibleForPayment({ approval_status: 'Approved' })).toBe(true);
      expect(isPOEligibleForPayment({ status: 'Pending Finance' })).toBe(true);
      expect(isPOEligibleForPayment({ status: 'Open' })).toBe(true);
    });

    it('returns false for draft or cancelled POs', () => {
      expect(isPOEligibleForPayment({ approval_status: 'Draft' })).toBe(false);
      expect(isPOEligibleForPayment({ status: 'cancelled' })).toBe(false);
      expect(isPOEligibleForPayment({ status: 'canceled' })).toBe(false);
    });
  });

  describe('getPOPaymentIneligibilityReason', () => {
    it('returns empty string if eligible', () => {
      expect(getPOPaymentIneligibilityReason({ approval_status: 'Approved' })).toBe('');
    });

    it('returns descriptive reason if ineligible', () => {
      const reason = getPOPaymentIneligibilityReason({ po_no: 'PO-100', approval_status: 'Draft' });
      expect(reason).toContain('PO PO-100 is Draft.');
      expect(reason).toContain('Payment requests are allowed for every PO except Draft and Cancelled.');
    });
  });
});
