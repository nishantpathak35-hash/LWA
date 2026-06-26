import React from 'react';
import { Dialog, Button, Textarea } from '../../ui/core';
import { XCircle, AlertTriangle } from 'lucide-react';

export default function BulkRejectModal({
  open,
  onClose,
  selectedCount,
  rejectComment,
  setRejectComment,
  onConfirmReject,
  submitting
}) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title="Bulk Reject Payment Requests"
      maxWidth="max-w-xl"
    >
      <form onSubmit={(e) => { e.preventDefault(); onConfirmReject(); }} className="space-y-6">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg p-4 flex gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            You are about to permanently reject <strong>{selectedCount}</strong> payment requests. 
            This action cannot be undone. Please provide a blanket rejection reason that will be applied to all selected requests.
          </p>
        </div>

        <div>
          <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REJECTION REASON *</label>
          <Textarea
            required
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Enter a detailed reason for rejecting these payments..."
            className="h-24"
            disabled={submitting}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="outline" 
            disabled={submitting || !rejectComment.trim()}
            className="border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
          >
            {submitting ? 'Processing...' : (
              <><XCircle className="w-4 h-4 mr-2" /> Reject {selectedCount} Payments</>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
