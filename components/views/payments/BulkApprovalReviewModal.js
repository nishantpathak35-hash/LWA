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
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500/90 rounded-lg p-4 flex gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            You are about to approve <strong>{selectedRequestsDetails.length}</strong> payment requests. 
            Please review the Approved Amounts and TDS calculations below. You can adjust them inline before confirming.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-900 rounded-lg max-h-[60vh] custom-scrollbar">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-950/80 sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Request</th>
                <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Requested</th>
                <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider w-32">Approved Amt</th>
                <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider w-36">TDS Sec</th>
                <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider w-28">TDS Amt</th>
                <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 bg-slate-900/20">
              {selectedRequestsDetails.map((req) => (
                <tr key={req.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="font-bold text-slate-900 dark:text-slate-100">#{req.id} &middot; {req.vendor_name}</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-mono">{req.po_no}</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">{req.project}</div>
                  </td>
                  <td className="px-4 py-3 align-top font-medium text-slate-800 dark:text-slate-200 pt-4">
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
                      className="h-8 text-xs w-full"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Select 
                      value={req.tdsSec} 
                      onChange={(e) => onUpdateApprovalData(req.id, 'tdsSec', e.target.value)} 
                      disabled={!canEditApprovalTds}
                      className="h-8 text-xs w-full"
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
                      className="h-8 text-xs w-full"
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-right font-bold text-gold pt-4">
                    {formatCurrency(req.netPayable)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950/80 sticky bottom-0 z-10 border-t border-slate-800 font-bold text-slate-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right text-slate-400">GRAND TOTALS:</td>
                <td className="px-4 py-3">{formatCurrency(totalApproved)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-violet-400">{formatCurrency(totalTds)}</td>
                <td className="px-4 py-3 text-right text-gold">{formatCurrency(totalNet)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="primary" 
            onClick={onConfirmApprove} 
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white"
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
