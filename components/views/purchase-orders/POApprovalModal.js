import React from 'react';
import { Dialog, Button, Textarea, Input } from '../../ui/core';
import { CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function POApprovalModal({
  approvalModalOpen, setApprovalModalOpen, approvalTarget, approvalAction,
  approvalRemarks, setApprovalRemarks, approvingPO, handleConfirmApproval
}) {
  return (
    <>
      {/* ── Approval Dialog ────────────────────────────────────────────────── */}
      <Dialog open={approvalModalOpen} onClose={() => setApprovalModalOpen(false)}
        title={approvalAction === 'approve' ? 'Approve Purchase Order' : 'Reject Purchase Order'}>
        <form onSubmit={handleConfirmApproval} className="space-y-5">
          <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2 text-sm font-light">
            <p className="text-slate-600 dark:text-slate-400 font-medium">PO Number: <strong className="text-slate-900 dark:text-slate-100 font-bold">{approvalTarget?.po_no}</strong></p>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Vendor: <strong className="text-slate-900 dark:text-slate-100 font-bold">{approvalTarget?.vendor_name}</strong></p>
            <p className="text-slate-600 dark:text-slate-400 font-medium">PO Value: <strong className="text-amber-700 dark:text-gold font-bold">{formatCurrency(Number(approvalTarget?.po_value || 0))}</strong></p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tracking-wider block mb-1.5">REMARKS</label>
            <Input type="text" value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)}
              placeholder={approvalAction === 'reject' ? 'Reason for rejection (required)' : 'Approval notes (optional)'}
              required={approvalAction === 'reject'} />
          </div>
          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setApprovalModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant={approvalAction === 'approve' ? 'primary' : 'destructive'} disabled={approvingPO}>
              {approvingPO ? 'Processing...' : approvalAction === 'approve' ? '✓ Approve PO' : '✗ Reject PO'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
