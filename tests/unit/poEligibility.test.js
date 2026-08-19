import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePOStatus, isPOEligibleForPayment, getPOPaymentIneligibilityReason } from '../../app/lib/poEligibility.js';

describe('poEligibility tests', () => {
  describe('normalizePOStatus', () => {
    it('returns normalized lowercase status string', () => {
      assert.equal(normalizePOStatus({ approval_status: ' Approved ' }), 'approved');
      assert.equal(normalizePOStatus({ status: 'CANCELLED' }), 'cancelled');
      assert.equal(normalizePOStatus({}), '');
    });
  });

  describe('isPOEligibleForPayment', () => {
    it('returns true for active, approved, or pending status', () => {
      assert.equal(isPOEligibleForPayment({ approval_status: 'Approved' }), true);
      assert.equal(isPOEligibleForPayment({ status: 'Pending Finance' }), true);
      assert.equal(isPOEligibleForPayment({ status: 'Open' }), true);
    });

    it('returns false for draft or cancelled POs', () => {
      assert.equal(isPOEligibleForPayment({ approval_status: 'Draft' }), false);
      assert.equal(isPOEligibleForPayment({ status: 'cancelled' }), false);
      assert.equal(isPOEligibleForPayment({ status: 'canceled' }), false);
    });
  });

  describe('getPOPaymentIneligibilityReason', () => {
    it('returns empty string if eligible', () => {
      assert.equal(getPOPaymentIneligibilityReason({ approval_status: 'Approved' }), '');
    });

    it('returns descriptive reason if ineligible', () => {
      const reason = getPOPaymentIneligibilityReason({ po_no: 'PO-100', approval_status: 'Draft' });
      assert.ok(reason.includes('PO PO-100 is Draft.'));
      assert.ok(reason.includes('Payment requests are allowed for every PO except Draft and Cancelled.'));
    });
  });
});
