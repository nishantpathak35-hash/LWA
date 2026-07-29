import React from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { CheckCircle, XCircle, FileCheck, AlertOctagon } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function POApprovalModal({
  approvalModalOpen, setApprovalModalOpen, approvalTarget, approvalAction,
  approvalRemarks, setApprovalRemarks, approvingPO, handleConfirmApproval
}) {
  const isApprove = approvalAction === 'approve';

  return (
    <>
      {/* ── Approval Dialog ────────────────────────────────────────────────── */}
      <Dialog open={approvalModalOpen} onClose={() => setApprovalModalOpen(false)}
        title={isApprove ? 'Approve Purchase Order' : 'Reject Purchase Order'}>
        <form onSubmit={handleConfirmApproval} className="space-y-5">
          <div className="p-4 bg-amber-50/50 dark:bg-slate-900/40 border border-amber-200/60 dark:border-slate-800 rounded-xl space-y-2 text-xs font-medium shadow-2xs">
            <div className="flex justify-between items-center pb-2 border-b border-amber-200/40 dark:border-slate-800">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">PO Reference</span>
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-gold">{approvalTarget?.po_no}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Vendor:</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">{approvalTarget?.vendor_name}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-muted-foreground font-bold">Total PO Net Value:</span>
              <span className="text-amber-800 dark:text-gold font-bold text-sm font-mono">{formatCurrency(Number(approvalTarget?.po_value || 0))}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">APPROVAL / REJECTION REMARKS</label>
            <Input type="text" value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)}
              placeholder={!isApprove ? 'Reason for rejection (required)' : 'Approval notes or feedback (optional)'}
              required={!isApprove} className="bg-background text-foreground text-xs" />
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setApprovalModalOpen(false)} className="text-xs">Cancel</Button>
            <Button type="submit" variant={isApprove ? 'primary' : 'destructive'} disabled={approvingPO} className="text-xs font-bold">
              {approvingPO ? 'Processing...' : isApprove ? '✓ Approve PO' : '✗ Reject PO'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
