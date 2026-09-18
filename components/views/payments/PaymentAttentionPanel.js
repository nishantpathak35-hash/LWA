'use client';

import React from 'react';
import { AlertTriangle, MessageCircle, CreditCard, ArrowRight, X } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

const queues = [
  { key: 'overdue', title: 'Overdue approvals', hint: 'Follow up with the current approver', Icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', background: 'bg-amber-500/10' },
  { key: 'hold', title: 'On hold', hint: 'Resolve the query before proceeding', Icon: MessageCircle, color: 'text-rose-600 dark:text-rose-400', background: 'bg-rose-500/10' },
  { key: 'ready', title: 'Ready to pay', hint: 'Review and record the bank remittance', Icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-400', background: 'bg-emerald-500/10' },
];

export default function PaymentAttentionPanel({ items, activeFilter, onFilter, policies, hasMore, onLoadMore, loadingPolicies, policyError, onRetry }) {
  return (
    <section aria-labelledby="payment-attention-heading" className="rounded-lg border border-border bg-card p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Your next actions</div>
          <h2 id="payment-attention-heading" className="text-xl font-bold text-foreground mt-1">Needs attention</h2>
          <p className="text-xs text-muted-foreground mt-1">Choose a queue to focus the payment list. Approval age is measured from request creation.</p>
        </div>
        {activeFilter && <button type="button" onClick={() => onFilter(null)} className="flex items-center gap-1 text-xs rounded-lg border border-border px-3 py-2 hover:bg-muted"><X size={14} /> Clear queue filter</button>}
      </div>
      {policyError && <p role="status" className="text-xs text-amber-600">Settings could not load; showing the default 3-day SLA. <button type="button" className="underline" onClick={onRetry}>Retry</button></p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {queues.map(({ key, title, hint, Icon, color, background }) => {
          const rows = items.filter(item => item.queue === key);
          const amount = rows.reduce((sum, { payment }) => sum + (Number(payment.approved_amount ?? payment.amount_requested) || 0), 0);
          const disabled = key === 'overdue' && !policies.overdue_approval_alerts;
          return <button key={key} type="button" aria-pressed={activeFilter === key} disabled={loadingPolicies || disabled} onClick={() => onFilter(activeFilter === key ? null : key)} className={`text-left p-4 rounded-xl border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:opacity-50 ${activeFilter === key ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-border hover:bg-muted/50'}`}>
            <div className="flex items-center justify-between"><span className={`rounded-lg p-2 ${background} ${color}`}><Icon size={19} /></span><ArrowRight size={16} className="text-muted-foreground" /></div>
            <div className="mt-3 text-sm font-semibold text-foreground">{title}</div>
            <div className="flex flex-wrap justify-between items-baseline gap-2 mt-1"><span className={`text-3xl font-bold ${color}`}>{loadingPolicies ? '…' : rows.length}</span><span className="text-sm font-mono text-foreground">{formatCurrency(amount)}</span></div>
            <p className="text-xs text-muted-foreground mt-2">{disabled ? 'Alerts disabled in Settings' : key === 'overdue' ? `${policies.approval_sla_days}+ days old · ${hint}` : hint}</p>
          </button>;
        })}
      </div>
      <p className="text-xs text-muted-foreground">{hasMore ? 'Counts cover loaded payments only. ' : 'Counts cover all loaded payments. '}Amounts show gross request / approved values.
        {hasMore && <button type="button" className="ml-1 underline font-semibold" onClick={onLoadMore}>Load more payments</button>}
      </p>
    </section>
  );
}
