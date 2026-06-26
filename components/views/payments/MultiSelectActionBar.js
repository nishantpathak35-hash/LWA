import React from 'react';
import { Card, Button } from '../../ui/core';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, X } from 'lucide-react';
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
  loadingSummary
}) {
  if (selectedRequests.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-5xl z-50 animate-fade-in pointer-events-none px-4">
      <Card className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.1)] rounded-[24px] overflow-hidden">
        
        {/* Overall Summary Bar (Fixed Top) */}
        <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="text-gold flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">Overall Selection</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
              <span title="Total Projects Selected">Projects: <strong className="text-slate-100">{overallSummary.totalProjects}</strong></span>
              <span title="Total Payment Requests Selected">Requests: <strong className="text-slate-100">{overallSummary.totalRequests}</strong></span>
              <span title="Total Vendors Involved">Vendors: <strong className="text-slate-100">{overallSummary.totalVendors}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400">Total Requested: <strong className="text-gold font-bold text-sm">{formatCurrency(overallSummary.totalRequestedAmount)}</strong></span>
              {overallSummary.totalPendingApproval > 0 && (
                <span className="text-slate-400">Pending Approval: <strong className="text-amber-500 font-bold">{formatCurrency(overallSummary.totalPendingApproval)}</strong></span>
              )}
            </div>
            <button onClick={onClearSelection} className="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Clear Selection">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Project Navigation & Content Area */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {projectsList.length > 1 && (
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveProjectIndex(Math.max(0, activeProjectIndex - 1))}
                disabled={activeProjectIndex === 0}
                className="bg-slate-950/50 border-slate-800 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous Project
              </Button>
              <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                Project {activeProjectIndex + 1} of {projectsList.length}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveProjectIndex(Math.min(projectsList.length - 1, activeProjectIndex + 1))}
                disabled={activeProjectIndex === projectsList.length - 1}
                className="bg-slate-950/50 border-slate-800 text-slate-300"
              >
                Next Project <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {loadingSummary ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <div className="w-5 h-5 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
              <span>Fetching financials for {activeProjectName}...</span>
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

        {/* Action Buttons Footer */}
        <div className="bg-slate-950/90 px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClearSelection} className="text-slate-400 hover:text-slate-200">
            Clear Selection
          </Button>
          <Button variant="outline" onClick={onRejectSelected} className="border-rose-500/50 text-rose-400 hover:bg-rose-500/10">
            <XCircle className="w-4 h-4 mr-2" /> Reject Selected
          </Button>
          <Button variant="primary" onClick={onApproveSelected} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500">
            <CheckCircle className="w-4 h-4 mr-2" /> Approve Selected
          </Button>
        </div>

      </Card>
    </div>
  );
}
