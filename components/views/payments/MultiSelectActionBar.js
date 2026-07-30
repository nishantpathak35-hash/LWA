import React, { useState } from 'react';
import { Card, Button } from '../../ui/core';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, X, ChevronUp, ChevronDown, Sparkles, AlertCircle } from 'lucide-react';
import ProjectFinancialSummaryCard from './ProjectFinancialSummaryCard';
import { formatCurrency } from '../../../app/lib/utils';

export default function MultiSelectActionBar({
  selectedRequests,
  overallSummary,
  activeProjectName,
  projectsList,
  activeProjectIndex,
  setActiveProjectIndex,
  projectSummary,
  progressWidths,
  getHealthTheme,
  multiSelectSummary,
  onApproveSelected,
  onRejectSelected,
  onClearSelection,
  loadingSummary,
  allSelectedActionable = true
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (selectedRequests.length === 0) return null;

  return (
    <div className="w-full sticky top-4 z-30 animate-in fade-in slide-in-from-top-3 duration-300 my-4">
      <Card className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.4)] shadow-amber-500/10 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 w-full min-w-0">
        
        {/* Top Summary Bar */}
        <div className="bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/95 px-5 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Selection Badges & Count */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-400 font-semibold text-xs shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{overallSummary.totalRequests} Request{overallSummary.totalRequests > 1 ? 's' : ''} Selected</span>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60" title="Total Projects Selected">
                <span className="text-slate-400">Projects:</span>
                <strong className="text-slate-100 font-semibold">{overallSummary.totalProjects}</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60" title="Total Vendors Involved">
                <span className="text-slate-400">Vendors:</span>
                <strong className="text-slate-100 font-semibold">{overallSummary.totalVendors}</strong>
              </span>
            </div>
          </div>

          {/* Right: Amounts & Toggle / Clear */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Total Requested</span>
                <span className="text-amber-400 font-bold text-sm tabular-nums">{formatCurrency(overallSummary.totalRequestedAmount)}</span>
              </div>
              {overallSummary.totalPendingApproval > 0 && (
                <div className="text-right pl-3 border-l border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Pending Approval</span>
                  <span className="text-amber-500 font-bold text-xs tabular-nums">{formatCurrency(overallSummary.totalPendingApproval)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700/60 transition-all duration-200 hover:scale-[1.02] active:scale-95 text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Toggle Financial Summary Details"
              >
                {isExpanded ? (
                  <><ChevronUp className="w-3.5 h-3.5 text-amber-400" /> Hide Details</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5 text-amber-400" /> Financial Breakdown</>
                )}
              </button>

              <button 
                onClick={onClearSelection} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer" 
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Project Navigation & Content Area - ONLY VISIBLE IF EXPANDED */}
        {isExpanded && (
          <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-950/50 border-b border-slate-800/80">
            {projectsList.length > 1 && (
              <div className="flex items-center justify-between mb-4 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveProjectIndex(Math.max(0, activeProjectIndex - 1))}
                  disabled={activeProjectIndex === 0}
                  className="bg-slate-950/60 border-slate-800 text-slate-300 h-7 text-xs hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous Project
                </Button>
                <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>Project {activeProjectIndex + 1} of {projectsList.length}:</span>
                  <span className="text-slate-200 font-bold">{activeProjectName}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveProjectIndex(Math.min(projectsList.length - 1, activeProjectIndex + 1))}
                  disabled={activeProjectIndex === projectsList.length - 1}
                  className="bg-slate-950/60 border-slate-800 text-slate-300 h-7 text-xs hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Next Project <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}

            {loadingSummary ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                <span>Fetching financial summary for {activeProjectName}...</span>
              </div>
            ) : (
              <ProjectFinancialSummaryCard
                projectSummary={projectSummary}
                getHealthTheme={getHealthTheme}
                progressWidths={progressWidths}
                multiSelectSummary={multiSelectSummary}
              />
            )}
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="bg-slate-950/90 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            {!allSelectedActionable && (
              <span className="text-amber-400/90 flex items-center gap-1 font-medium bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" /> Some selected items require higher approval permissions
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearSelection} 
              className="text-slate-400 hover:text-slate-200 text-xs hover:scale-[1.02] active:scale-95 transition-all"
            >
              Clear Selection
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRejectSelected} 
              className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60 text-xs font-semibold hover:scale-[1.03] active:scale-95 transition-all duration-200 shadow-xs hover:shadow-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={!allSelectedActionable}
              title={!allSelectedActionable ? "Selection contains items you don't have permission to reject" : ""}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject Selected ({overallSummary.totalRequests})
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={onApproveSelected} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)] border-emerald-500/80 text-xs font-semibold hover:scale-[1.03] active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={!allSelectedActionable}
              title={!allSelectedActionable ? "Selection contains items you don't have permission to approve" : ""}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve Selected ({overallSummary.totalRequests})
            </Button>
          </div>
        </div>

      </Card>
    </div>
  );
}
