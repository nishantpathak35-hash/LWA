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
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/30 rounded-xl border border-slate-900">
              {[
                { label: 'PO Value',    value: paymentData.summary.po_value,    color: 'text-slate-200' },
                { label: 'Paid So Far', value: paymentData.summary.total_paid,  color: 'text-emerald-400' },
                { label: 'Outstanding', value: paymentData.summary.outstanding, color: 'text-amber-400' },
              ].map(k => (
                <div key={k.label} className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{k.label}</div>
                  <div className={`text-sm font-semibold ${k.color}`}>{formatCurrency(k.value)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PAYMENT DATE *</label>
              <Input type="date" required value={mpDate} onChange={e => setMpDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">AMOUNT PAID (₹) *</label>
              <Input type="number" required min="1" step="0.01" value={mpAmount}
                onChange={e => setMpAmount(e.target.value)} placeholder="Enter amount" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PAYMENT MODE *</label>
              <Select value={mpMode} onChange={e => setMpMode(e.target.value)}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TRANSACTION / UTR / CHEQUE NO</label>
              <Input type="text" value={mpUtr} onChange={e => setMpUtr(e.target.value)}
                placeholder="e.g. UTR123456789" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">BANK NAME (optional)</label>
              <Input type="text" value={mpBank} onChange={e => setMpBank(e.target.value)}
                placeholder="e.g. HDFC Bank" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REFERENCE NUMBER</label>
              <Input type="text" value={mpRef} onChange={e => setMpRef(e.target.value)}
                placeholder="Internal reference" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REMARKS</label>
            <Input type="text" value={mpRemarks} onChange={e => setMpRemarks(e.target.value)}
              placeholder="Payment notes or description" />
          </div>

          {mpError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" /><span>{mpError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setManualPayModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={mpSubmitting}>
              {mpSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
