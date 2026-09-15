import test from 'node:test';
import assert from 'node:assert/strict';
import { getPaymentStageKey, isPaymentPending, isPaymentSettled, aggregatePaymentStages } from '../app/lib/paymentStatus.js';

test('ready to remit remains pending rather than settled', () => {
  assert.equal(getPaymentStageKey('Ready to Remit'), 'readyToRemit');
  assert.equal(isPaymentSettled('Ready to Remit'), false);
  assert.equal(isPaymentPending({ stage: 'Ready to Remit' }), true);
});
test('terminal states override stale pending status', () => {
  for (const stage of ['Remitted', 'Paid', 'Rejected', 'Cancelled']) {
    assert.equal(isPaymentPending({ stage, status: 'Pending' }), false);
  }
  assert.equal(isPaymentPending({ stage: 'Pending Finance', remittance: 'Remitted' }), false);
  assert.equal(isPaymentSettled('unpaid'), false);
});
test('approval and remittance pipeline totals retain approved zero amounts', () => {
  assert.deepEqual(aggregatePaymentStages([
    { stage: 'Ready to Remit', amount_requested: 100 },
    { stage: 'Remitted', amount_requested: 200 },
    { stage: 'Pending Finance', amount_requested: 60, approved_amount: 0 },
    { stage: 'Rejected', amount_requested: 40 },
    { stage: 'Custom approval', amount_requested: 10 },
  ]), { pendingProc: 10, pendingFinance: 0, pendingDirector: 0, readyToRemit: 100, remitted: 200, rejected: 40 });
});
