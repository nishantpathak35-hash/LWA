import { describe, it, expect } from 'vitest';
import { getPaymentAttention } from '../../app/lib/paymentStatus.js';

const now = Date.parse('2026-09-15T12:00:00Z');
describe('payment attention queues', () => {
  it('keeps held payouts out of ready queue and excludes closed requests', () => {
    expect(getPaymentAttention({ stage: 'Ready to Remit' }, {}, now)).toBe('ready');
    expect(getPaymentAttention({ stage: 'Ready to Remit', query_status: 'hold' }, {}, now)).toBe('hold');
    for (const stage of ['Remitted', 'Rejected', 'Cancelled']) {
      expect(getPaymentAttention({ stage, query_status: 'hold', created_at: '2020-01-01' }, {}, now)).toBe(null);
    }
  });
  it('respects SLA and alert settings with explicit age boundaries', () => {
    const payment = { stage: 'Pending Finance', created_at: '2026-09-12T12:00:00Z' };
    expect(getPaymentAttention(payment, { approval_sla_days: 3 }, now)).toBe('overdue');
    expect(getPaymentAttention(payment, { approval_sla_days: 4 }, now)).toBe(null);
    expect(getPaymentAttention(payment, { overdue_approval_alerts: false }, now)).toBe(null);
    expect(getPaymentAttention({ stage: 'Pending Finance', created_at: 'invalid' }, {}, now)).toBe(null);
  });
});
