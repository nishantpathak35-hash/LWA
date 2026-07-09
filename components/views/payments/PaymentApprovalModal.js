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
            <div className="backdrop-blur-md bg-slate-950/40 border border-slate-900 rounded-[18px] p-8 text-center text-xs text-slate-500 font-light flex flex-col items-center justify-center gap-2 mb-5">
              <div className="w-5 h-5 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
              <span>Fetching project financials...</span>
            </div>
          )}

          <ProjectFinancialSummaryCard
            projectSummary={projectSummary}
            getHealthTheme={getHealthTheme}
            progressWidths={progressWidths}
          />

          <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl space-y-2 text-sm font-light">
            <p className="text-slate-400">Request: <strong className="text-slate-200">#{selectedRequest?.id}</strong></p>
            <p className="text-slate-400">Vendor: <strong className="text-slate-200">{selectedRequest?.vendor_name}</strong></p>
            <p className="text-slate-400">Net Payable: <strong className="text-gold font-semibold">{formatCurrency(selectedRequest?.net_amount)}</strong></p>
          </div>

          {workflowAction === 'remit' && (
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">UTR / REF TRANSACTION NUMBER *</label>
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
            <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold text-gold tracking-wider uppercase block">Approval Details</span>
                {!canEditApprovalTds && (
                  <span className="text-[10px] text-slate-500">Read only at this approval stage</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REQUESTED AMOUNT</label>
                  <div className="w-full px-3 py-2 bg-slate-900 border border-slate-900 rounded-lg text-slate-200 text-sm">
                    {formatCurrency(selectedRequestGross)}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">APPROVED AMOUNT *</label>
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
                  <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS SECTION</label>
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
                  <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS AMOUNT (INR)</label>
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
              <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-900/60">
                <span>Net Payable:</span>
                <span className="text-gold font-semibold">{formatCurrency(displayedNetAfterTds)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">COMMENTS / FEEDBACK</label>
            <Input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Internal review notes"
            />
          </div>

          {formError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
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
