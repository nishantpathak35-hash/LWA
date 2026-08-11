import React from 'react';
import { AlertTriangle, PieChart } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function ProjectFinancialSummaryCard({
  projectSummary,
  getHealthTheme,
  progressWidths,
  multiSelectSummary
}) {
  if (!projectSummary) return null;

  const currentHealth = getHealthTheme ? getHealthTheme(projectSummary.currentUtilisation) : { text: 'text-emerald-400', bar: 'bg-emerald-500' };
  const projHealth = getHealthTheme ? getHealthTheme(projectSummary.projectedUtilisation) : { text: 'text-amber-400', bar: 'bg-amber-500' };

  return (
    <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3 animate-in fade-in duration-300 min-w-0 text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Financial Summary</span>
            <h3 className="text-sm font-bold text-slate-100">{projectSummary.project}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {projectSummary.projectedUtilisation > 100 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              Over Budget
            </div>
          )}
          <div className="text-right">
            <span className="text-[9px] font-semibold text-slate-400 block uppercase">Utilisation</span>
            <span className="text-xs font-bold text-slate-200">
              Current <span className={currentHealth.text}>{projectSummary.currentUtilisation}%</span> &middot; Projected <span className={projHealth.text}>{projectSummary.projectedUtilisation}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Modern Compact Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <div className="bg-slate-900/60 border border-slate-800/70 p-2 rounded-lg">
          <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">BOQ Value</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 block tabular-nums">{formatCurrency(projectSummary.boqValue)}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/70 p-2 rounded-lg">
          <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">Inflow ({Number(projectSummary.projectInflowPct || 0).toFixed(0)}%)</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 block tabular-nums">{formatCurrency(projectSummary.inflow)}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/70 p-2 rounded-lg">
          <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">BCS</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 block tabular-nums">{formatCurrency(projectSummary.bcs)}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/70 p-2 rounded-lg">
          <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">Outflow ({Number(projectSummary.projectOutflowPct || 0).toFixed(0)}%)</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 block tabular-nums">{formatCurrency(projectSummary.projectOutflow)}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/70 p-2 rounded-lg">
          <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">Inflow / Outflow</span>
          <span className="text-xs font-bold text-amber-400 mt-0.5 block tabular-nums">
            {Number(projectSummary.inflowOutflowRatio || 0) > 0 ? `${Number(projectSummary.inflowOutflowRatio).toFixed(2)}x` : '0.00x'}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/70 p-2 rounded-lg">
          <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">P.O Value</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 block tabular-nums">{formatCurrency(projectSummary.totalPOValue)}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/70 p-2 rounded-lg">
          <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">PO Outflow</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 block tabular-nums">{formatCurrency(projectSummary.currentPOOutflow)}</span>
        </div>
      </div>

      {/* Key Balances Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <div className="bg-slate-900/80 border border-emerald-500/25 p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Remaining PO Balance</span>
            <span className={`text-xs font-bold tabular-nums mt-0.5 block ${projectSummary.remainingPOBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatCurrency(projectSummary.remainingPOBalance)}
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Available</span>
        </div>

        <div className="bg-slate-900/80 border border-violet-500/25 p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">TDS Hold</span>
            <span className={`text-xs font-bold tabular-nums mt-0.5 block ${Number(projectSummary.tdsHoldAmount || 0) > 0 ? 'text-violet-400' : 'text-slate-400'}`}>
              {formatCurrency(projectSummary.tdsHoldAmount || 0)}
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Deduction</span>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/30 p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Net Payable</span>
            <span className="text-xs font-bold text-amber-400 tabular-nums mt-0.5 block">
              {formatCurrency(projectSummary.netPayableAfterTds || projectSummary.currentPaymentAmount)}
            </span>
          </div>
          <span className="text-[10px] font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Final</span>
        </div>
      </div>

      {/* Utilisation Progress Bar */}
      {progressWidths && (
        <div className="pt-1 space-y-1">
          <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden relative">
            <div 
              className={`h-full absolute left-0 top-0 rounded-full transition-all duration-750 ease-out ${projHealth.bar} opacity-30`}
              style={{ width: `${progressWidths.projected || 0}%` }}
            />
            <div 
              className={`h-full absolute left-0 top-0 rounded-full transition-all duration-500 ease-out ${currentHealth.bar}`}
              style={{ width: `${progressWidths.current || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Multi-Select Context Footer */}
      {multiSelectSummary && (
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">Total Project Requests</span>
            <span className="text-xs font-bold text-slate-200 tabular-nums mt-0.5 block">{formatCurrency(multiSelectSummary.totalRequested)}</span>
          </div>
          <div className="bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">Selected Amount</span>
            <span className="text-xs font-bold text-amber-400 tabular-nums mt-0.5 block">{formatCurrency(multiSelectSummary.selectedAmount)}</span>
          </div>
          <div className="bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">Remaining Outstanding</span>
            <span className="text-xs font-bold text-slate-200 tabular-nums mt-0.5 block">{formatCurrency(multiSelectSummary.remainingOutstanding)}</span>
          </div>
          <div className="bg-slate-900/40 p-2 rounded border border-slate-800/50">
            <span className="text-[9px] font-semibold text-slate-400 uppercase block tracking-wider">Pending Approval</span>
            <span className="text-xs font-bold text-amber-500 tabular-nums mt-0.5 block">{formatCurrency(multiSelectSummary.pendingApproval)}</span>
          </div>
        </div>
      )}

    </div>
  );
}
