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
    <div className={`backdrop-blur-md bg-slate-950/45 border ${getHealthTheme(projectSummary.projectedUtilisation).border} rounded-[18px] p-5 shadow-2xl space-y-4 mb-5 animate-fade-in select-none`}>
      <div className="flex justify-between items-start border-b border-slate-900/60 pb-3">
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Project Financial Summary</h4>
          <h3 className="text-sm font-serif font-light text-slate-200 mt-1">{projectSummary.project}</h3>
        </div>
        {projectSummary.projectedUtilisation > 100 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[9px] font-semibold uppercase tracking-wider animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Over Budget
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-900 rounded-lg">
        <table className="min-w-[820px] w-full border-collapse text-xs">
          <tbody className="divide-y divide-slate-900/80">
            <tr className="divide-x divide-slate-900/80">
              {[
                ['BOQ Value', formatCurrency(projectSummary.boqValue)],
                ['Project inflow', formatCurrency(projectSummary.inflow)],
                ['Project inflow %', `${Number(projectSummary.projectInflowPct || 0).toFixed(1)}%`],
                ['BCS', formatCurrency(projectSummary.bcs)],
                ['Project outflow', formatCurrency(projectSummary.projectOutflow)],
                ['Project Outflow %', `${Number(projectSummary.projectOutflowPct || 0).toFixed(1)}%`],
                ['Inflow /Outflow', Number(projectSummary.inflowOutflowRatio || 0) > 0 ? `${Number(projectSummary.inflowOutflowRatio).toFixed(2)}x` : '0.00x']
              ].map(([label, value]) => (
                <td key={label} className="px-3 py-2 align-top">
                  <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">{label}</span>
                  <span className="text-xs font-semibold text-slate-250 mt-1 block">{value}</span>
                </td>
              ))}
            </tr>
            <tr className="divide-x divide-slate-900/80">
              {[
                ['P.O Value', formatCurrency(projectSummary.totalPOValue)],
                ['Outflow', formatCurrency(projectSummary.currentPOOutflow)],
                ['Outflow %', `${Number(projectSummary.poCurrentOutflowPct || 0).toFixed(1)}%`],
                ['Req', `+${formatCurrency(projectSummary.currentPaymentAmount)}`],
                ['Outflow after payment', formatCurrency(projectSummary.outflowAfterApproval)]
              ].map(([label, value]) => (
                <td key={label} className="px-3 py-2 align-top" colSpan={label === 'Outflow after payment' ? 3 : 1}>
                  <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">{label}</span>
                  <span className={`text-xs font-semibold mt-1 block ${label === 'Req' ? 'text-gold' : 'text-slate-250'}`}>{value}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-900 bg-slate-950/30 px-3 py-2">
          <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Remaining PO Balance</span>
          <span className={`text-xs font-bold mt-1 block ${projectSummary.remainingPOBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatCurrency(projectSummary.remainingPOBalance)}
          </span>
        </div>
        <div className="rounded-lg border border-slate-900 bg-slate-950/30 px-3 py-2">
          <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">TDS Hold</span>
          <span className={`text-xs font-bold mt-1 block ${Number(projectSummary.tdsHoldAmount || 0) > 0 ? 'text-violet-400' : 'text-slate-400'}`}>
            {formatCurrency(projectSummary.tdsHoldAmount || 0)}
          </span>
        </div>
        <div className="rounded-lg border border-slate-900 bg-slate-950/30 px-3 py-2">
          <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Net Payable</span>
          <span className="text-xs font-bold text-gold mt-1 block">{formatCurrency(projectSummary.netPayableAfterTds || projectSummary.currentPaymentAmount)}</span>
        </div>
      </div>

      {/* Animated Progress Bar */}
      {(() => {
        const theme = getHealthTheme(projectSummary.currentUtilisation);
        const projTheme = getHealthTheme(projectSummary.projectedUtilisation);
        return (
          <div className="space-y-2 pt-2 border-t border-slate-900/60">
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>PROJECT UTILISATION</span>
              <span className="flex items-center gap-1">
                Current: <strong className={theme.text}>{projectSummary.currentUtilisation}%</strong> 
                &middot; 
                Projected: <strong className={projTheme.text}>{projectSummary.projectedUtilisation}%</strong>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-900 overflow-hidden relative">
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
        <div className="pt-3 border-t border-slate-900/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Total Project Requests</span>
            <span className="text-xs font-bold text-slate-200 mt-1 block">{formatCurrency(multiSelectSummary.totalRequested)}</span>
          </div>
          <div>
            <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Selected Amount</span>
            <span className="text-xs font-bold text-gold mt-1 block">{formatCurrency(multiSelectSummary.selectedAmount)}</span>
          </div>
          <div>
            <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Remaining Outstanding</span>
            <span className="text-xs font-bold text-slate-300 mt-1 block">{formatCurrency(multiSelectSummary.remainingOutstanding)}</span>
          </div>
          <div>
            <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Pending Approval</span>
            <span className="text-xs font-bold text-amber-500 mt-1 block">{formatCurrency(multiSelectSummary.pendingApproval)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
