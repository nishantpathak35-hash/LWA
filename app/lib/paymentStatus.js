const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
const settled = new Set(['remitted', 'paid', 'settled']);
const rejected = new Set(['rejected', 'cancelled', 'canceled']);

export const DEFAULT_CONTROL_POLICIES = Object.freeze({
  show_payment_attention: true,
  block_payment_over_po_balance: true,
  require_supporting_document: false,
  allow_payment_holds: true,
  approval_sla_days: 3,
  overdue_approval_alerts: true,
});

export function normalizeControlPolicies(raw = {}) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const days = Number(value.approval_sla_days);
  return {
    ...DEFAULT_CONTROL_POLICIES,
    show_payment_attention: value.show_payment_attention !== false,
    block_payment_over_po_balance: value.block_payment_over_po_balance !== false,
    require_supporting_document: value.require_supporting_document === true,
    allow_payment_holds: value.allow_payment_holds !== false,
    overdue_approval_alerts: value.overdue_approval_alerts !== false,
    approval_sla_days: Number.isFinite(days) ? Math.min(30, Math.max(1, Math.round(days))) : DEFAULT_CONTROL_POLICIES.approval_sla_days,
  };
}

export function isApprovalOverdue(payment, policies = DEFAULT_CONTROL_POLICIES, now = Date.now()) {
  const dateValue = payment?.approval_date || payment?.created_at || payment?.requested_at;
  const started = Date.parse(dateValue || '');
  if (!Number.isFinite(started)) return false;
  const slaDays = normalizeControlPolicies(policies).approval_sla_days;
  return now - started >= slaDays * 24 * 60 * 60 * 1000;
}

export function isPaymentSettled(value) {
  if (value && typeof value === 'object') {
    return settled.has(normalize(value.stage || value.approval_stage)) || settled.has(normalize(value.remittance));
  }
  return settled.has(normalize(value));
}

export function getPaymentStageKey(value) {
  if (isPaymentSettled(value)) return 'remitted';
  const stage = normalize(value && typeof value === 'object' ? value.stage || value.approval_stage || value.status : value);
  if (rejected.has(stage)) return 'rejected';
  if (stage === 'ready to remit' || stage === 'approved') return 'readyToRemit';
  if (stage === 'pending finance' || stage === 'finance review') return 'pendingFinance';
  if (stage === 'pending director' || stage === 'director approval') return 'pendingDirector';
  // Custom workflow steps remain open until explicitly completed.
  return 'pendingProc';
}

export function isPaymentPending(payment) {
  const key = getPaymentStageKey(payment);
  return key !== 'remitted' && key !== 'rejected';
}

// Mutually exclusive queues: a held payout must not appear ready for release.
export function getPaymentAttention(payment, policies = {}, now = Date.now()) {
  if (!isPaymentPending(payment)) return null;
  if (normalize(payment.query_status) === 'hold') return 'hold';
  if (getPaymentStageKey(payment) === 'readyToRemit') return 'ready';
  const controls = normalizeControlPolicies(policies);
  if (controls.overdue_approval_alerts && isApprovalOverdue(payment, controls, now)) return 'overdue';
  return null;
}

export function aggregatePaymentStages(payments) {
  const totals = { pendingProc: 0, pendingFinance: 0, pendingDirector: 0, readyToRemit: 0, remitted: 0, rejected: 0 };
  for (const payment of payments) totals[getPaymentStageKey(payment)] += Number(payment.approved_amount ?? payment.amount_requested) || 0;
  return totals;
}
