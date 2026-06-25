import React from 'react';
import { Dialog, Button, Textarea } from '../../ui/core';
import { CheckCircle, XCircle } from 'lucide-react';

export default function POApprovalModal({
  approvalModalOpen, setApprovalModalOpen, approvalTarget, approvalAction,
  approvalRemarks, setApprovalRemarks, approvingPO, handleConfirmApproval
}) {
  return (
    <>
      {/* ── Approval Dialog ────────────────────────────────────────────────── */}
      <Dialog open={approvalModalOpen} onClose={() => setApprovalModalOpen(false)}
        title={approvalAction === 'approve' ? 'Approve Purchase Order' : 'Reject Purchase Order'}>
        <form onSubmit={handleApprovalSubmit} className="space-y-5">
          <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl space-y-2 text-sm font-light">
            <p className="text-slate-400">PO Number: <strong className="text-slate-200">{approvalTarget?.po_no}</strong></p>
            <p className="text-slate-400">Vendor: <strong className="text-slate-200">{approvalTarget?.vendor_name}</strong></p>
            <p className="text-slate-400">PO Value: <strong className="text-gold font-semibold">{formatCurrency(Number(approvalTarget?.po_value || 0))}</strong></p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REMARKS</label>
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
