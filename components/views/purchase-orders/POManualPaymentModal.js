import React from 'react';
import { Dialog, Button, Input, Select, Textarea } from '../../ui/core';
import { ShieldAlert } from 'lucide-react';
import { PAYMENT_MODES } from './po-constants';
import { formatCurrency } from '../../../app/lib/utils';

export default function POManualPaymentModal({
  manualPayModalOpen, setManualPayModalOpen, editingPoNo, mpDate, setMpDate,
  mpAmount, setMpAmount, mpMode, setMpMode, mpUtr, setMpUtr, mpBank, setMpBank,
  mpRef, setMpRef, mpRemarks, setMpRemarks, mpError, mpSubmitting, handleAddManualPayment,
  paymentData
}) {
  return (
    <>
      {/* ── Manual Payment Dialog ──────────────────────────────────────────── */}
      <Dialog open={manualPayModalOpen} onClose={() => setManualPayModalOpen(false)}
        title={`Add Manual Payment — ${editingPoNo}`}>
        <form onSubmit={handleAddManualPayment} className="space-y-5">

          {/* Outstanding balance info */}
          {paymentData?.summary && (
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-amber-50/50 dark:bg-slate-900/40 rounded-xl border border-amber-200/60 dark:border-slate-800 shadow-2xs">
              {[
                { label: 'PO Value',    value: paymentData.summary.po_value,    color: 'text-slate-900 dark:text-slate-100 font-bold' },
                { label: 'Paid So Far', value: paymentData.summary.total_paid,  color: 'text-emerald-700 dark:text-emerald-400 font-bold' },
                { label: 'Outstanding', value: paymentData.summary.outstanding, color: 'text-amber-700 dark:text-amber-400 font-bold' },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">{k.label}</div>
                  <div className={`text-xs font-mono ${k.color}`}>{formatCurrency(k.value)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PAYMENT DATE *</label>
              <Input type="date" required value={mpDate} onChange={e => setMpDate(e.target.value)} className="bg-background text-foreground text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">AMOUNT PAID (₹) *</label>
              <Input type="number" required min="1" step="0.01" value={mpAmount}
                onChange={e => setMpAmount(e.target.value)} placeholder="Enter amount" className="bg-background text-foreground text-xs font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PAYMENT MODE *</label>
              <Select value={mpMode} onChange={e => setMpMode(e.target.value)} className="bg-background text-foreground text-xs font-semibold">
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">TRANSACTION / UTR / CHEQUE NO</label>
              <Input type="text" value={mpUtr} onChange={e => setMpUtr(e.target.value)}
                placeholder="e.g. UTR123456789" className="bg-background text-foreground text-xs font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">BANK NAME (optional)</label>
              <Input type="text" value={mpBank} onChange={e => setMpBank(e.target.value)}
                placeholder="e.g. HDFC Bank" className="bg-background text-foreground text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">REFERENCE NUMBER</label>
              <Input type="text" value={mpRef} onChange={e => setMpRef(e.target.value)}
                placeholder="Internal reference" className="bg-background text-foreground text-xs" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">REMARKS</label>
            <Input type="text" value={mpRemarks} onChange={e => setMpRemarks(e.target.value)}
              placeholder="Payment notes or description" className="bg-background text-foreground text-xs" />
          </div>

          {mpError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" /><span>{mpError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setManualPayModalOpen(false)} className="text-xs">Cancel</Button>
            <Button type="submit" variant="primary" disabled={mpSubmitting} className="text-xs font-bold">
              {mpSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
