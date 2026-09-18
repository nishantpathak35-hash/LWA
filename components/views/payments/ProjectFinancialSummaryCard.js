import React from 'react';
import { AlertTriangle, Building2, TrendingUp, CheckCircle, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

const numeric = value => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const money = value => numeric(value) == null ? '—' : formatCurrency(Number(value));

function Metric({ label, value, subtext, emphasis = false, variant = 'default' }) {
  const textColor = variant === 'danger' 
    ? 'text-rose-600 dark:text-rose-400' 
    : variant === 'success' 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : variant === 'warning'
    ? 'text-amber-600 dark:text-amber-400'
    : emphasis 
    ? 'text-emerald-700 dark:text-emerald-400 font-bold' 
    : 'text-foreground';

  return (
    <div className="min-w-0 bg-muted/30 rounded-lg p-2.5 border border-border">
      <dt className="text-[11px] font-medium text-muted-foreground truncate">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold tabular-nums break-words ${textColor}`}>
        {money(value)}
      </dd>
      {subtext && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtext}</p>}
    </div>
  );
}

export default function ProjectFinancialSummaryCard({ projectSummary: s, multiSelectSummary, progressWidths }) {
  if (!s) return null;

  const gross = numeric(s.currentPaymentAmount ?? s.requestedAmount);
  const tds = numeric(s.tdsHoldAmount) ?? 0;
  const net = s.netPayableAfterTds ?? (gross == null ? null : Math.max(0, gross - tds));
  const poValue = numeric(s.totalPOValue);
  const paid = numeric(s.currentPOOutflow);
  const before = poValue == null || paid == null ? null : poValue - paid;
  const after = numeric(s.remainingPOBalance);
  const inflow = numeric(s.inflow) ?? 0;
  const currentOutflow = numeric(s.currentOutflow ?? s.projectOutflow) ?? 0;
  const projected = numeric(s.projectedOutflow) ?? (currentOutflow + (gross || 0));
  const remainingInflowBuffer = inflow > 0 ? inflow - projected : null;
  const boqVal = numeric(s.boqValue);
  const bcsVal = numeric(s.bcs);

  const overPO = after != null && after < 0;
  const overInflow = inflow > 0 && projected > inflow;

  const currentUtil = inflow > 0 ? Math.min(100, Math.round((currentOutflow / inflow) * 100)) : 0;
  const projectedUtil = inflow > 0 ? Math.min(100, Math.round((projected / inflow) * 100)) : 0;

  // The API supplies a single request's PO summary, not a consolidated batch.
  if (multiSelectSummary) return (
    <section aria-label="Selected project requests" className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-primary flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" /> {s.project || 'Selected Project'}
        </span>
        <span className="text-xs text-muted-foreground">Batch Selection Review</span>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <Metric label="Selected Gross Amount" value={multiSelectSummary.selectedAmount} emphasis />
        <Metric label="Requests Pending Approval" value={multiSelectSummary.pendingApproval} />
      </dl>
      <p className="text-[11px] text-muted-foreground">Check each PO in the approval review. Balances are not consolidated across different POs.</p>
    </section>
  );

  return (
    <section aria-label="Project financials & payment impact" className="rounded-xl border border-border bg-card overflow-hidden shadow-xs space-y-0">
      {/* Header with Project and PO info */}
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-primary flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            {s.project || 'Project not linked'}
          </span>
          {s.poNo && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-background border border-border text-muted-foreground">
              {s.poNo}
            </span>
          )}
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">
          Project Financial Impact
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Section 1: Payment Payout Breakdown ── */}
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Payment Request Amount</span>
            <span className="text-muted-foreground font-normal">TDS Section: <strong className="text-foreground">{s.tdsHoldSection || 'None'}</strong></span>
          </div>
          <dl className="grid grid-cols-3 gap-2.5">
            <Metric label="Gross Amount" value={gross} />
            <Metric label="TDS Hold" value={tds} variant={tds > 0 ? 'warning' : 'default'} />
            <Metric label="Net Payable to Vendor" value={net} emphasis variant="success" />
          </dl>
        </div>

        {/* ── Section 2: Purchase Order Outflow & Balance ── */}
        <div className="pt-2 border-t border-border">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Purchase Order Allocation
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Metric label="PO Total Value" value={poValue} />
            <Metric label="Paid to Date" value={paid} />
            <Metric label="Balance Before Payment" value={before} />
            <Metric 
              label="Remaining PO Balance" 
              value={after} 
              variant={overPO ? 'danger' : 'success'} 
              subtext={overPO ? 'Exceeds PO value' : 'After this payment'} 
            />
          </dl>
        </div>

        {/* ── Section 3: Project Financials (BOQ, BCS, Inflow vs Outflow) ── */}
        <div className="pt-2 border-t border-border">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Project Level Cashflow & Budget</span>
            {inflow > 0 && (
              <span className="text-[11px] font-mono font-medium text-muted-foreground">
                Utilization: <strong className={overInflow ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}>{projectedUtil}%</strong>
              </span>
            )}
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Metric label="BOQ Value" value={boqVal} />
            <Metric label="BCS Budget" value={bcsVal} />
            <Metric label="Recorded Inflow" value={inflow} variant="success" />
            <Metric label="Outflow to Date" value={currentOutflow} />
            <Metric label="Projected Outflow" value={projected} />
            <Metric 
              label="Net Cash Buffer" 
              value={remainingInflowBuffer} 
              variant={overInflow ? 'danger' : remainingInflowBuffer > 0 ? 'success' : 'default'} 
              subtext={inflow > 0 ? 'Inflow less projected' : 'No inflow recorded'}
            />
          </dl>

          {/* Inflow Utilisation Bar */}
          {inflow > 0 ? (
            <div className="mt-3 space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border">
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                <span>Inflow Cash Absorption</span>
                <span className="tabular-nums">
                  {currentUtil}% current → <strong className={overInflow ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}>{projectedUtil}% projected</strong>
                </span>
              </div>
              <div role="img" aria-label={`Inflow utilisation: ${currentUtil}% currently, ${projectedUtil}% projected`} className="relative h-2 rounded-full overflow-hidden bg-muted">
                <div 
                  className={`absolute inset-y-0 left-0 transition-all ${overInflow ? 'bg-rose-500/60' : 'bg-emerald-500/40'}`} 
                  style={{ width: `${Math.min(100, projectedUtil)}%` }} 
                />
                <div 
                  className="absolute inset-y-0 left-0 bg-amber-500 dark:bg-amber-400" 
                  style={{ width: `${Math.min(100, currentUtil)}%` }} 
                />
              </div>
              <div className="flex gap-4 text-[10px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Current Outflow</span>
                <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${overInflow ? 'bg-rose-500' : 'bg-emerald-500'} inline-block`} /> Including This Payment</span>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded border border-border/50">
              ℹ️ No positive project inflow recorded in project financials ledger; cash coverage cannot be assessed.
            </p>
          )}
        </div>

        {/* Alerts for Over-Budget or Deficit */}
        {(overPO || overInflow) && (
          <div role="status" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="space-y-0.5">
              {overPO && (
                <p><strong>Warning:</strong> This payment exceeds the remaining PO value by <strong>{money(-after)}</strong>.</p>
              )}
              {overInflow && (
                <p><strong>Warning:</strong> Projected project outflow exceeds recorded project inflow by <strong>{money(projected - inflow)}</strong>.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

