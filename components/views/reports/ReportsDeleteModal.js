import React, { useState } from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * ReportsDeleteModal — replaces native confirm() + prompt() for payment deletion.
 * Requires a reason (≥5 chars) before confirming.
 */
export default function ReportsDeleteModal({ open, payment, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  const reasonValid = reason.trim().length >= 5;

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (!reasonValid) return;
    onConfirm(payment, reason.trim());
  };

  if (!open || !payment) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <Trash2 className="w-4 h-4" />
          Delete Payment Request
        </span>
      }
    >
      <div className="space-y-4">
        {/* Warning block */}
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-200 text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>This action is irreversible</span>
          </div>
          <div className="text-xs text-rose-300/90 leading-relaxed space-y-1 pl-6">
            <p>
              You are about to permanently delete payment{' '}
              <span className="font-mono font-bold text-rose-200">#{payment.id}</span>{' '}
              for vendor{' '}
              <span className="font-bold text-rose-200">{payment.vendor_name || payment.vendor || '—'}</span>.
            </p>
            <p>Amount: <span className="font-bold text-rose-200">₹{Number(payment.approved_amount || payment.amount_requested || 0).toLocaleString('en-IN')}</span></p>
          </div>
        </div>

        {/* Reason input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Reason for Deletion <span className="text-rose-500">*</span>
            <span className="ml-1 text-[10px] font-normal text-muted-foreground normal-case">(minimum 5 characters)</span>
          </label>
          <Input
            placeholder="e.g. Duplicate entry, entered incorrectly..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            className={`text-sm ${!reasonValid && reason.length > 0 ? 'border-rose-500/50 focus:border-rose-500' : ''}`}
            autoFocus
          />
          {!reasonValid && reason.length > 0 && (
            <p className="text-[10px] text-rose-400 font-semibold">Reason must be at least 5 characters</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="ghost" onClick={handleClose} disabled={loading} className="text-xs">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!reasonValid || loading}
            className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            {loading ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
