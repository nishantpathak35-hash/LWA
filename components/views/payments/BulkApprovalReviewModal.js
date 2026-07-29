import React from 'react';
import { Dialog, Button, Input, Select } from '../../ui/core';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function BulkApprovalReviewModal({
  open,
  onClose,
  selectedRequestsDetails, // Array of { id, vendor_name, po_no, project, grossAmount, approvedAmount, tdsSec, tdsAmt, netPayable }
  onUpdateApprovalData,    // Function to update a specific request's data
  onConfirmApprove,
  submitting,
  canEditApprovalTds,
  tdsSections
}) {
  const totalApproved = selectedRequestsDetails.reduce((sum, req) => sum + (req.approvedAmount || 0), 0);
  const totalTds = selectedRequestsDetails.reduce((sum, req) => sum + (req.tdsAmt || 0), 0);
  const totalNet = selectedRequestsDetails.reduce((sum, req) => sum + (req.netPayable || 0), 0);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title="Review & Confirm Bulk Approval"
      maxWidth="max-w-7xl"
    >
      <div className="space-y-6">
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-xl p-4 flex gap-3 text-xs font-medium shadow-2xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p>
            You are about to approve <strong>{selectedRequestsDetails.length}</strong> payment requests. 
            Please review the Approved Amounts and TDS calculations below. You can adjust them inline before confirming.
          </p>
        </div>

        <div className="overflow-x-auto border border-border rounded-xl max-h-[60vh] custom-scrollbar shadow-2xs">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Request</th>
                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Requested</th>
                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] w-32">Approved Amt</th>
                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] w-36">TDS Sec</th>
                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] w-28">TDS Amt</th>
                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {selectedRequestsDetails.map((req) => (
                <tr key={req.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="font-bold text-slate-900 dark:text-slate-100">#{req.id} &middot; {req.vendor_name}</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-mono">{req.po_no}</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">{req.project}</div>
                  </td>
                  <td className="px-4 py-3 align-top font-bold text-slate-800 dark:text-slate-200 pt-4 font-mono">
                    {formatCurrency(req.grossAmount)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Input
                      type="number"
                      min="1"
                      max={req.grossAmount}
                      value={req.approvedAmount}
                      onChange={(e) => onUpdateApprovalData(req.id, 'approvedAmount', Number(e.target.value))}
                      disabled={!canEditApprovalTds}
                      className="h-8 text-xs w-full bg-background text-foreground font-mono"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Select 
                      value={req.tdsSec} 
                      onChange={(e) => onUpdateApprovalData(req.id, 'tdsSec', e.target.value)} 
                      disabled={!canEditApprovalTds}
                      className="h-8 text-xs w-full bg-background text-foreground font-semibold"
                    >
                      <option value="">None (0%)</option>
                      {tdsSections?.map(sec => (
                        <option key={sec.section_code} value={sec.section_code}>
                          {sec.section_code} ({sec.rate}%)
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Input
                      type="number"
                      min="0"
                      max={req.approvedAmount}
                      value={req.tdsAmt}
                      onChange={(e) => onUpdateApprovalData(req.id, 'tdsAmt', Number(e.target.value))}
                      disabled={!canEditApprovalTds}
                      className="h-8 text-xs w-full bg-background text-foreground font-mono"
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-right font-bold text-amber-700 dark:text-gold pt-4 font-mono">
                    {formatCurrency(req.netPayable)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-900 sticky bottom-0 z-10 border-t border-border font-bold text-slate-900 dark:text-slate-100">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 uppercase text-[10px]">GRAND TOTALS:</td>
                <td className="px-4 py-3 font-mono">{formatCurrency(totalApproved)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 font-mono text-purple-700 dark:text-purple-400">{formatCurrency(totalTds)}</td>
                <td className="px-4 py-3 text-right text-amber-700 dark:text-gold font-mono">{formatCurrency(totalNet)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting} className="text-xs">
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="primary" 
            onClick={onConfirmApprove} 
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white font-bold text-xs"
          >
            {submitting ? 'Processing...' : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Confirm & Approve {selectedRequestsDetails.length} Payments</>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
