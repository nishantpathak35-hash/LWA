import React from 'react';
import { Dialog, Button, Input, Select, Textarea } from '../../ui/core';
import { ShieldCheck, Ban, CheckSquare, AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import ProjectFinancialSummaryCard from './ProjectFinancialSummaryCard';

export default function PaymentApprovalModal({
  workflowModalOpen, setWorkflowModalOpen, selectedRequest, workflowAction,
  canEditApprovalTds, approvalTdsSec, setApprovalTdsSec, approvalTdsAmt, setApprovalTdsAmt,
  approvalApprovedAmount, setApprovalApprovedAmount, displayedTdsHold, displayedApprovedAmount,
  displayedNetAfterTds, utr, setUtr, comment, setComment, submitting, handleWorkflowAction,
  loadingSummary, projectSummary, getHealthTheme, selectedRequestGross, progressWidths, formError,
  tdsSections
}) {
  return (
    <>
      {/* Workflow Actions Dialog (Approve / Reject / Remit) */}
      <Dialog 
        open={workflowModalOpen} 
        onClose={() => setWorkflowModalOpen(false)} 
        title={workflowAction === 'approve' ? 'Approve Payment Request' : workflowAction === 'remit' ? 'Remit Payment Request' : 'Reject Payment Request'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleWorkflowAction} className="space-y-6">
          {loadingSummary && (
            <div className="bg-muted/40 border border-border rounded-2xl p-8 text-center text-xs text-muted-foreground font-medium flex flex-col items-center justify-center gap-2 mb-5">
              <div className="w-5 h-5 border-2 border-amber-600/40 border-t-amber-600 dark:border-t-gold rounded-full animate-spin" />
              <span>Fetching project financials...</span>
            </div>
          )}

          <ProjectFinancialSummaryCard
            projectSummary={projectSummary}
            getHealthTheme={getHealthTheme}
            progressWidths={progressWidths}
          />

          <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-1.5 text-sm font-medium">
            <p className="text-muted-foreground">Request: <strong className="text-foreground font-bold">#{selectedRequest?.id}</strong></p>
            <p className="text-muted-foreground">Vendor: <strong className="text-foreground font-bold">{selectedRequest?.vendor_name}</strong></p>
            <p className="text-muted-foreground">Net Payable: <strong className="text-amber-700 dark:text-gold font-bold text-base tabular-nums">{formatCurrency(selectedRequest?.net_amount)}</strong></p>
          </div>

          {workflowAction === 'remit' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">UTR / REF TRANSACTION NUMBER *</label>
              <Input
                type="text"
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Enter bank transfer UTR number"
              />
            </div>
          )}

          {workflowAction === 'approve' && (
            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-amber-700 dark:text-gold uppercase tracking-wider block">Approval Details</span>
                {!canEditApprovalTds && (
                  <span className="text-xs font-medium text-muted-foreground">Read only at this approval stage</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">REQUESTED AMOUNT</label>
                  <div className="w-full px-3.5 py-2 bg-card border border-border rounded-lg text-foreground font-bold text-sm tabular-nums">
                    {formatCurrency(selectedRequestGross)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">APPROVED AMOUNT *</label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedRequestGross}
                    value={approvalApprovedAmount}
                    onChange={(e) => setApprovalApprovedAmount(Number(e.target.value))}
                    disabled={!canEditApprovalTds}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">TDS SECTION</label>
                  <Select value={approvalTdsSec} onChange={(e) => setApprovalTdsSec(e.target.value)} disabled={!canEditApprovalTds}>
                    <option value="">None (No TDS)</option>
                    {tdsSections?.map(sec => (
                      <option key={sec.section_code} value={sec.section_code}>
                        {sec.section_code} ({sec.description} - {sec.rate}%)
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">TDS AMOUNT (INR)</label>
                  <Input
                    type="number"
                    min="0"
                    max={approvalApprovedAmount}
                    value={approvalTdsAmt}
                    onChange={(e) => setApprovalTdsAmt(Number(e.target.value))}
                    disabled={!canEditApprovalTds}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground pt-3 border-t border-border">
                <span>Net Payable:</span>
                <span className="text-amber-700 dark:text-gold font-bold text-base tabular-nums">{formatCurrency(displayedNetAfterTds)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">COMMENTS / FEEDBACK</label>
            <Input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Internal review notes"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setWorkflowModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : workflowAction === 'approve' ? 'Approve' : workflowAction === 'remit' ? 'Remit' : 'Reject'}
            </Button>
          </div>
        </form>
      </Dialog>

    </>
  );
}
