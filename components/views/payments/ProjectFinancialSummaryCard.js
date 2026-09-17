import React from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

const numeric = value => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const money = value => numeric(value) == null ? '—' : formatCurrency(Number(value));

function Metric({ label, value, emphasis = false }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`mt-1 text-sm font-semibold tabular-nums break-words ${emphasis ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>{money(value)}</dd></div>;
}

export default function ProjectFinancialSummaryCard({ projectSummary: s, multiSelectSummary }) {
  if (!s) return null;
  const gross = numeric(s.currentPaymentAmount ?? s.requestedAmount);
  const tds = numeric(s.tdsHoldAmount) ?? 0;
  const net = s.netPayableAfterTds ?? (gross == null ? null : Math.max(0, gross - tds));
  const poValue = numeric(s.totalPOValue);
  const paid = numeric(s.currentPOOutflow);
  const before = poValue == null || paid == null ? null : poValue - paid;
  const after = numeric(s.remainingPOBalance);
  const inflow = numeric(s.inflow);
  const projected = numeric(s.projectedOutflow);
  const overPO = after != null && after < 0;
  const overInflow = inflow > 0 && projected != null && projected > inflow;

  // The API supplies a single request's PO summary, not a consolidated batch.
  if (multiSelectSummary) return (
    <section aria-label="Selected project requests" className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground mb-3">{s.project || 'Selected project'}</p>
      <dl className="grid grid-cols-2 gap-4">
        <Metric label="Selected gross amount" value={multiSelectSummary.selectedAmount} />
        <Metric label="Project requests pending approval" value={multiSelectSummary.pendingApproval} />
      </dl>
      <p className="text-xs text-muted-foreground mt-3">Check each PO in the approval review. Balances are not combined across POs.</p>
    </section>
  );

  return (
    <section aria-label="Payment summary" className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">Payment summary</h3>
        <span className="text-xs text-muted-foreground break-words">{s.project || 'Project not linked'}</span>
      </div>
      <dl className="grid grid-cols-3 gap-3 px-4 py-3">
        <Metric label="Gross amount" value={gross} />
        <Metric label="Less TDS" value={tds} />
        <Metric label="Vendor receives" value={net} emphasis />
      </dl>
      <div className="border-t border-border px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">PO balance · before → after this payment</span>
          <span className={`font-semibold tabular-nums ${overPO ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>{money(before)} → {money(after)}</span>
        </div>
        <p className="text-muted-foreground mt-1">Uses the gross amount, including TDS. Other unpaid requests are not deducted.</p>
      </div>
      {(overPO || overInflow) && <div role="status" className="px-4 py-2 border-t border-amber-500/20 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <div>{overPO && <p>Exceeds remaining PO value by {money(-after)}.</p>}{overInflow && <p>Recorded inflow is {money(projected - inflow)} below projected gross outflow.</p>}</div>
      </div>}
      <details className="group border-t border-border">
        <summary className="flex items-center justify-between cursor-pointer list-none px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">
          PO & project figures<ChevronDown size={14} className="group-open:rotate-180" />
        </summary>
        <dl className="px-4 pb-3 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Metric label="PO value" value={s.totalPOValue} /><Metric label="Recorded PO outflow" value={s.currentPOOutflow} />
          <Metric label="Project inflow" value={s.inflow} /><Metric label="Project outflow to date" value={s.currentOutflow ?? s.projectOutflow} />
          <Metric label="Outflow including this payment" value={s.projectedOutflow} />
          <Metric label="Inflow less projected gross outflow" value={inflow > 0 && projected != null ? inflow - projected : null} />
          <Metric label="BOQ value" value={s.boqValue} /><Metric label="BCS" value={s.bcs} />
        </dl>
        <p className="px-4 pb-3 text-xs text-muted-foreground">{inflow > 0 ? 'Recorded figures only; this is not a bank balance or a reservation against other approvals.' : 'No positive project inflow recorded; cash coverage is unavailable.'}</p>
      </details>
    </section>
  );
}
