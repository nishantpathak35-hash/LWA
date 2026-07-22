import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function ProjectFinancialSummaryCard({
  projectSummary,
  getHealthTheme,
  progressWidths,
  multiSelectSummary // Optional: Only provided when rendering inside the Multi-Select floating bar
}) {
  if (!projectSummary) return null;

  return (
    <div className={`bg-muted/40 dark:bg-slate-900/50 border ${getHealthTheme(projectSummary.projectedUtilisation).border} rounded-2xl p-5 shadow-sm space-y-4 mb-5 animate-fade-in select-none min-w-0`}>
      <div className="flex justify-between items-start border-b border-border pb-3">
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Project Financial Summary</h4>
          <h3 className="text-base font-bold text-foreground mt-0.5">{projectSummary.project}</h3>
        </div>
        {projectSummary.projectedUtilisation > 100 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            Over Budget
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-border rounded-xl bg-card shadow-2xs">
        <table className="min-w-[820px] w-full border-collapse text-xs">
          <tbody className="divide-y divide-border">
            <tr className="divide-x divide-border">
              {[
                ['BOQ Value', formatCurrency(projectSummary.boqValue)],
                ['Project inflow', formatCurrency(projectSummary.inflow)],
                ['Project inflow %', `${Number(projectSummary.projectInflowPct || 0).toFixed(1)}%`],
                ['BCS', formatCurrency(projectSummary.bcs)],
                ['Project outflow', formatCurrency(projectSummary.projectOutflow)],
                ['Project Outflow %', `${Number(projectSummary.projectOutflowPct || 0).toFixed(1)}%`],
                ['Inflow /Outflow', Number(projectSummary.inflowOutflowRatio || 0) > 0 ? `${Number(projectSummary.inflowOutflowRatio).toFixed(2)}x` : '0.00x']
              ].map(([label, value]) => (
                <td key={label} className="px-3 py-2.5 align-top">
                  <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">{label}</span>
                  <span className="text-xs font-bold text-foreground mt-1 block tabular-nums">{value}</span>
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-border">
              {[
                ['P.O Value', formatCurrency(projectSummary.totalPOValue)],
                ['Outflow', formatCurrency(projectSummary.currentPOOutflow)],
                ['Outflow %', `${Number(projectSummary.poCurrentOutflowPct || 0).toFixed(1)}%`],
                ['Req', `+${formatCurrency(projectSummary.currentPaymentAmount)}`],
                ['Outflow after payment', formatCurrency(projectSummary.outflowAfterApproval)]
              ].map(([label, value]) => (
                <td key={label} className="px-3 py-2.5 align-top" colSpan={label === 'Outflow after payment' ? 3 : 1}>
                  <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">{label}</span>
                  <span className={`text-xs font-bold mt-1 block tabular-nums ${label === 'Req' ? 'text-amber-700 dark:text-gold' : 'text-foreground'}`}>{value}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
          <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">Remaining PO Balance</span>
          <span className={`text-sm font-bold mt-1 block tabular-nums ${projectSummary.remainingPOBalance < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {formatCurrency(projectSummary.remainingPOBalance)}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
          <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">TDS Hold</span>
          <span className={`text-sm font-bold mt-1 block tabular-nums ${Number(projectSummary.tdsHoldAmount || 0) > 0 ? 'text-violet-700 dark:text-violet-400' : 'text-muted-foreground'}`}>
            {formatCurrency(projectSummary.tdsHoldAmount || 0)}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
          <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">Net Payable</span>
          <span className="text-sm font-bold text-amber-700 dark:text-gold mt-1 block tabular-nums">{formatCurrency(projectSummary.netPayableAfterTds || projectSummary.currentPaymentAmount)}</span>
        </div>
      </div>

      {/* Animated Progress Bar */}
      {(() => {
        const theme = getHealthTheme(projectSummary.currentUtilisation);
        const projTheme = getHealthTheme(projectSummary.projectedUtilisation);
        return (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
              <span>PROJECT UTILISATION</span>
              <span className="flex items-center gap-1">
                Current: <strong className={theme.text}>{projectSummary.currentUtilisation}%</strong> 
                &middot; 
                Projected: <strong className={projTheme.text}>{projectSummary.projectedUtilisation}%</strong>
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted border border-border overflow-hidden relative">
              <div 
                className={`h-full absolute left-0 top-0 rounded-full transition-all duration-1000 ease-out ${projTheme.bar} opacity-30`}
                style={{ width: `${progressWidths.projected}%` }}
              />
              <div 
                className={`h-full absolute left-0 top-0 rounded-full transition-all duration-750 ease-out ${theme.bar}`}
                style={{ width: `${progressWidths.current}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Conditional Multi-Select Project-Level Summary */}
      {multiSelectSummary && (
        <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">Total Project Requests</span>
            <span className="text-xs font-bold text-foreground mt-1 block tabular-nums">{formatCurrency(multiSelectSummary.totalRequested)}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">Selected Amount</span>
            <span className="text-xs font-bold text-amber-700 dark:text-gold mt-1 block tabular-nums">{formatCurrency(multiSelectSummary.selectedAmount)}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">Remaining Outstanding</span>
            <span className="text-xs font-bold text-foreground mt-1 block tabular-nums">{formatCurrency(multiSelectSummary.remainingOutstanding)}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground tracking-wider block uppercase">Pending Approval</span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-500 mt-1 block tabular-nums">{formatCurrency(multiSelectSummary.pendingApproval)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
