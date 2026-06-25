import React from 'react';
import { Dialog, Button, Input, Select, Textarea } from '../../ui/core';
import { ShieldCheck, Ban, CheckSquare } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function PaymentApprovalModal({
  workflowModalOpen, setWorkflowModalOpen, selectedRequest, workflowAction,
  canEditApprovalTds, approvalTdsSec, setApprovalTdsSec, approvalTdsAmt, setApprovalTdsAmt,
  approvalApprovedAmount, setApprovalApprovedAmount, displayedTdsHold, displayedApprovedAmount,
  displayedNetAfterTds, utr, setUtr, comment, setComment, submitting, handleWorkflowAction
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
        <form onSubmit={handleWorkflowActionSubmit} className="space-y-6">
          {loadingSummary && (
            <div className="backdrop-blur-md bg-slate-950/40 border border-slate-900 rounded-[18px] p-8 text-center text-xs text-slate-500 font-light flex flex-col items-center justify-center gap-2 mb-5">
              <div className="w-5 h-5 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
              <span>Fetching project financials...</span>
            </div>
          )}

          {projectSummary && (
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
            </div>
          )}

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
                    <option value="194C">194C (Contractors - 2%)</option>
                    <option value="194J">194J (Professional - 10%)</option>
                    <option value="194I">194I (Rent - 10%)</option>
                    <option value="194H">194H (Commission - 5%)</option>
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
