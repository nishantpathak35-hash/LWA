import React from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { fmtRupees } from './report-utils';

export default function ReportsRemitModal({
  remitModalOpen, setRemitModalOpen, selectedRemitPayment, handleRemitSubmit, utr, setUtr, submitting
}) {
  return (
    <>
      <Dialog open={remitModalOpen} onClose={() => setRemitModalOpen(false)} title={`Remit Payment #${selectedRemitPayment?.id}`}>
        <form onSubmit={handleRemitSubmit} className="space-y-4">
          <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-4">
            <span className="text-[10px] font-bold text-amber-700 dark:text-gold tracking-wider uppercase block">Remittance Details</span>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tracking-wider block mb-1.5">UTR / REF TRANSACTION NUMBER</label>
              <Input
                type="text"
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Enter bank UTR or reference"
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-400 font-medium pt-2 border-t border-border">
              <span>Vendor:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{selectedRemitPayment?.vendor}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-400 font-medium">
              <span>Net Amount:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {fmtRupees(Number(selectedRemitPayment?.amountRequested || 0) - Number(selectedRemitPayment?.tdsAmount || selectedRemitPayment?.tds_amount || 0))}
              </span>
            </div>
          </div>
          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setRemitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm Remittance'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}