import React from 'react';
import { ArrowRight, Building2, ChevronDown, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

const money = value => value == null || !Number.isFinite(Number(value)) ? '—' : formatCurrency(Number(value));
const number = value => Number(value) || 0;

function Metric({ label, value, className = '' }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`mt-1 text-sm font-semibold tabular-nums break-words ${className || 'text-foreground'}`}>{money(value)}</dd></div>;
}

export default function ProjectFinancialSummaryCard({ projectSummary: s, multiSelectSummary }) {
  if (!s) return null;
  const gross = s.currentPaymentAmount ?? s.requestedAmount;
  const net = s.netPayableAfterTds ?? Math.max(0, number(gross) - number(s.tdsHoldAmount));
  const before = number(s.totalPOValue) - number(s.currentPOOutflow);
  const after = s.remainingPOBalance;
  const inflow = number(s.inflow);
  const currentOutflow = number(s.currentOutflow ?? s.projectOutflow);
  const projected = number(s.projectedOutflow);
  const currentPct = inflow > 0 ? currentOutflow / inflow * 100 : null;
  const projectedPct = inflow > 0 ? projected / inflow * 100 : null;
  const shortfall = inflow > 0 && projected > inflow;
  const overPO = after != null && number(after) < 0;
  const clamp = value => Math.min(100, Math.max(0, value));

  return (
    <section aria-label="Payment financial impact" className="overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-sm min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="rounded-xl bg-muted p-2.5 text-muted-foreground"><Building2 size={19} /></span>
          <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment impact</p><h3 className="text-sm font-semibold break-words mt-0.5">{s.project || 'Project not linked'}</h3></div>
        </div>
        <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">Approval preview</span>
      </header>

      <div className="grid md:grid-cols-2">
        <div className="p-5 sm:p-6 bg-emerald-500/[0.04] border-b md:border-b-0 md:border-r border-border">
          <p className="text-sm text-muted-foreground">Net payable to vendor</p>
          <p className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums break-words text-emerald-700 dark:text-emerald-400">{money(net)}</p>
          <p className="text-xs text-muted-foreground mt-2">Amount after TDS deduction</p>
          <dl className="mt-5 pt-4 border-t border-border grid grid-cols-2 gap-4">
            <Metric label="Gross payment" value={gross} />
            <Metric label={s.tdsHoldSection ? `TDS · ${s.tdsHoldSection}` : 'TDS deduction'} value={s.tdsHoldAmount ?? 0} />
          </dl>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">PO balance</h4>{s.poNo && <span className="text-xs text-muted-foreground break-all">{s.poNo}</span>}</div>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div><p className="text-xs text-muted-foreground">Before this payment</p><p className="mt-2 font-semibold tabular-nums break-words">{money(before)}</p></div>
            <ArrowRight size={17} className="text-muted-foreground" aria-hidden="true" />
            <div className={`rounded-xl p-3 ${overPO ? 'bg-rose-500/10' : 'bg-muted/60'}`}><p className="text-xs text-muted-foreground">After this payment</p><p className={`mt-2 font-semibold tabular-nums break-words ${overPO ? 'text-rose-600 dark:text-rose-400' : ''}`}>{money(after)}</p></div>
          </div>
          <dl className="mt-5 pt-4 border-t border-border grid grid-cols-2 gap-4"><Metric label="PO value" value={s.totalPOValue} /><Metric label="Recorded PO outflow" value={s.currentPOOutflow} /></dl>
        </div>
      </div>

      {(overPO || shortfall) && <div role="status" className="mx-5 sm:mx-6 mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 flex gap-2.5 text-sm text-amber-800 dark:text-amber-300"><AlertTriangle size={17} className="shrink-0 mt-0.5" /><div>{overPO && <p>This payment exceeds the PO balance by <strong>{money(-number(after))}</strong>.</p>}{shortfall && <p>Projected project outflow exceeds recorded inflow by <strong>{money(projected - inflow)}</strong>.</p>}</div></div>}

      <div className="border-t border-border p-5 sm:p-6">
        <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-semibold">Project cash position</h4><span className="text-xs text-muted-foreground">Recorded inflow and gross outflow</span></div>
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4"><Metric label="Recorded inflow" value={s.inflow} /><Metric label="Current outflow" value={currentOutflow} /><Metric label="After this payment" value={s.projectedOutflow} /><Metric label="Projected balance" value={inflow > 0 ? inflow - projected : null} className={shortfall ? 'text-rose-600 dark:text-rose-400' : ''} /></dl>
        {inflow > 0 ? <div className="mt-5">
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground mb-2"><span>Inflow utilisation</span><span className="tabular-nums">{currentPct.toFixed(1)}% now → <strong className={shortfall ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}>{projectedPct.toFixed(1)}% projected</strong></span></div>
          <div role="img" aria-label={`Inflow utilisation: ${currentPct.toFixed(1)} percent currently, ${projectedPct.toFixed(1)} percent projected`} className="relative h-2 rounded-full overflow-hidden bg-muted">
            <div className={`absolute inset-y-0 left-0 ${shortfall ? 'bg-rose-400/50' : 'bg-emerald-500/35'}`} style={{ width: `${clamp(projectedPct)}%` }} />
            <div className="absolute inset-y-0 left-0 bg-slate-500 dark:bg-slate-400" style={{ width: `${clamp(currentPct)}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground"><span>● Current outflow</span><span className={shortfall ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>● Including this payment</span></div>
        </div> : <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">No positive project inflow recorded. Cash coverage cannot be assessed.</p>}
      </div>

      <details className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 sm:px-6 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Project reference figures<ChevronDown size={15} className="group-open:rotate-180" /></summary>
        <dl className="px-5 sm:px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 gap-4"><Metric label="BOQ value" value={s.boqValue} /><Metric label="BCS" value={s.bcs} /><div><dt className="text-xs text-muted-foreground">Inflow / outflow ratio</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{currentOutflow > 0 ? `${(inflow / currentOutflow).toFixed(2)}x` : '—'}</dd></div></dl>
      </details>

      {multiSelectSummary && <div className="border-t border-border bg-muted/20 px-5 sm:px-6 py-4"><p className="text-xs font-medium text-muted-foreground mb-3">Selection overview · financial preview above is for the first selected request</p><dl className="grid grid-cols-2 sm:grid-cols-4 gap-4"><Metric label="Total project requests" value={multiSelectSummary.totalRequested} /><Metric label="Selected amount" value={multiSelectSummary.selectedAmount} /><Metric label="Remaining outstanding" value={multiSelectSummary.remainingOutstanding} /><Metric label="Pending approval" value={multiSelectSummary.pendingApproval} /></dl></div>}
    </section>
  );
}
