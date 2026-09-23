import React from 'react';
import { Dialog, Button, Input, Select, Textarea } from '../../ui/core';
import { ShieldCheck, Ban, CheckSquare, AlertTriangle, ShieldAlert, Landmark, FileText, HelpCircle } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import ProjectFinancialSummaryCard from './ProjectFinancialSummaryCard';
import { buildFinancialPreview } from '../../../app/lib/financialPreview';


const getPaymentModeBadge = (mode, req) => {
  let m = String(mode || req?.payment_mode || req?.paymentMode || '').trim();
  if (!m) {
    const combined = `${req?.remarks || ''} ${req?.po_terms || ''} ${req?.po_notes || ''} ${req?.remittance_ref || ''}`.toLowerCase();
    if (combined.includes('cheque') || combined.includes('chq') || combined.includes('pdc')) {
      m = 'Cheque';
    } else {
      m = 'NEFT';
    }
  }
  const isCheque = m.toLowerCase().includes('cheque') || m.toLowerCase().includes('chq') || m.toLowerCase().includes('pdc');

  if (isCheque) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 tracking-wider uppercase shrink-0" title="Mode: Cheque / PDC">
        <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Cheque
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 tracking-wider uppercase shrink-0" title="Mode: Electronic NEFT">
      <Landmark className="w-3 h-3 text-sky-600 dark:text-sky-400" /> {m || 'NEFT'}
    </span>
  );
};

export default function PaymentApprovalModal({
  workflowModalOpen, setWorkflowModalOpen, selectedRequest, workflowAction,
  canEditApprovalTds, approvalTdsSec, setApprovalTdsSec, approvalTdsAmt, setApprovalTdsAmt,
  approvalApprovedAmount, setApprovalApprovedAmount, displayedTdsHold, displayedApprovedAmount,
  displayedNetAfterTds, utr, setUtr, comment, setComment, submitting, handleWorkflowAction,
  loadingSummary, projectSummary, getHealthTheme, selectedRequestGross, progressWidths, formError,
  tdsSections, onOpenQueryModal
}) {
  const preview = workflowAction === 'approve'
    ? buildFinancialPreview(projectSummary, { gross: displayedApprovedAmount, tds: displayedTdsHold })
    : projectSummary;
  if (preview && workflowAction === 'approve' && canEditApprovalTds) preview.tdsHoldSection = approvalTdsSec;
  return (
    <>
      {/* Workflow Actions Dialog (Approve / Reject / Remit) */}
      <Dialog 
        open={workflowModalOpen} 
        onClose={() => setWorkflowModalOpen(false)} 
        title={workflowAction === 'approve' ? 'Approve Payment Request' : workflowAction === 'remit' ? 'Remit Payment Request' : 'Reject Payment Request'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleWorkflowAction} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-foreground">Order #{selectedRequest?.id}</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="font-semibold text-foreground">{selectedRequest?.vendor_name}</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="font-mono text-amber-700 dark:text-primary font-medium">{selectedRequest?.po_no || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium text-[11px]">Disbursement:</span>
              {getPaymentModeBadge(selectedRequest?.payment_mode || selectedRequest?.paymentMode, selectedRequest)}
            </div>
          </div>
          {loadingSummary && workflowAction !== 'reject' && (
            <div className="bg-muted/40 border border-border rounded-xl p-3 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-600/40 border-t-amber-600 dark:border-t-gold rounded-full animate-spin" />
              <span>Fetching project financials...</span>
            </div>
          )}

          {!loadingSummary && workflowAction !== 'reject' && <ProjectFinancialSummaryCard
            projectSummary={preview}
            getHealthTheme={getHealthTheme}
            progressWidths={progressWidths}
          />}

          {workflowAction === 'remit' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                {(String(selectedRequest?.payment_mode || selectedRequest?.paymentMode || '').toLowerCase().includes('cheque')
                  ? 'CHEQUE NUMBER / PAYMENT REFERENCE *'
                  : 'UTR / REF TRANSACTION NUMBER *')}
              </label>
              <Input
                type="text"
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder={String(selectedRequest?.payment_mode || selectedRequest?.paymentMode || '').toLowerCase().includes('cheque')
                  ? 'Enter Cheque number or reference'
                  : 'Enter bank transfer UTR number'}
              />
            </div>
          )}

          {workflowAction === 'approve' && (
            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-amber-700 dark:text-primary uppercase tracking-wider block">Approval Details</span>
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
                <span className="text-amber-700 dark:text-primary font-bold text-base tabular-nums">{formatCurrency(displayedNetAfterTds)}</span>
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

          <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
            <div>
              {onOpenQueryModal && selectedRequest && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-amber-700 dark:text-primary border-amber-500/30 hover:bg-amber-500/10 text-xs font-semibold"
                  onClick={() => {
                    setWorkflowModalOpen(false);
                    onOpenQueryModal(selectedRequest);
                  }}
                >
                  <HelpCircle className="w-3.5 h-3.5 mr-1.5" /> Request Clarification
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setWorkflowModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : workflowAction === 'approve' ? 'Approve' : workflowAction === 'remit' ? 'Remit' : 'Reject'}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

    </>
  );
}
