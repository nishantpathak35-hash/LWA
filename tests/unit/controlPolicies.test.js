import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTROL_POLICIES, normalizeControlPolicies, isApprovalOverdue } from '../../app/lib/paymentStatus.js';

describe('control policies', () => {
  it('sanitizes settings and keeps safe defaults', () => {
    expect(normalizeControlPolicies({ block_payment_over_po_balance: false, approval_sla_days: 99 })).toMatchObject({
      block_payment_over_po_balance: false,
      approval_sla_days: 30,
      require_supporting_document: DEFAULT_CONTROL_POLICIES.require_supporting_document,
    });
  });

  it('detects overdue open approvals using the configured SLA', () => {
    const now = Date.parse('2026-01-10T00:00:00Z');
    expect(isApprovalOverdue({ approval_date: '2026-01-01' }, { approval_sla_days: 3 }, now)).toBe(true);
    expect(isApprovalOverdue({ approval_date: '2026-01-09' }, { approval_sla_days: 3 }, now)).toBe(false);
    expect(isApprovalOverdue({ approval_date: null }, { approval_sla_days: 3 }, now)).toBe(false);
  });
});
