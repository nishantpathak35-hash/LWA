import React from 'react';
import { Dialog, Button, Input, Select, Textarea } from '../../ui/core';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function PaymentFormModal({
  requestModalOpen, setRequestModalOpen, vendorCode, setVendorCode, vendors,
  poNo, handlePOChange, vendorPOs, grossAmount, handleGrossAmountChange,
  tdsAmount, setTdsAmount, netAmount, invoiceRef, setInvoiceRef, remarks, setRemarks,
  formError, submitting, handleSubmitRequest, projectSummary, progressWidths, getHealthTheme
}) {
  return (
    <>
      {/* Create Payment Request Dialog */}
      <Dialog open={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="New Payment Request">
        <form onSubmit={handleCreateRequest} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR *</label>
              <Select value={vendorCode} onChange={(e) => {
                const newVendorCode = e.target.value;
                setVendorCode(newVendorCode);
                const validPOs = getVendorPOs(newVendorCode);
                setPoNo(validPOs[0]?.po_no || '');
              }}>
                {vendors.map((v, idx) => (
                  <option key={idx} value={v.code}>{v.name} ({v.code})</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PURCHASE ORDER *</label>
              <Select value={poNo} onChange={(e) => handlePOChange(e.target.value)}>
                <option value="">Select PO...</option>
                {vendorPOs.map((p, idx) => (
                  <option key={idx} value={p.po_no}>{p.po_no} (Project: {p.project})</option>
                ))}
              </Select>
            </div>
          </div>

          {selectedPO && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/40 border border-slate-900 rounded-xl">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider block mb-1">PROJECT</label>
                <div className="text-sm font-medium text-slate-200">{selectedPO.project || '—'}</div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider block mb-1">PO TOTAL VALUE</label>
                <div className="text-sm font-semibold text-gold">{formatCurrency(selectedPO.po_value || 0)}</div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider block mb-1">AMOUNT ALREADY REMITTED</label>
                <div className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(selectedPO.paid || 0)} ({selectedPO.po_value > 0 ? ((selectedPO.paid / selectedPO.po_value) * 100).toFixed(1) : 0}%)
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider block mb-1">PO OUTSTANDING BALANCE</label>
                <div className="text-sm font-semibold text-amber-500">
                  {formatCurrency(Math.max(0, (selectedPO.po_value || 0) - (selectedPO.paid || 0)))}
                  <span className="text-xs font-light text-slate-500 ml-2">(updates only after remittance)</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">AMOUNT REQUESTED (INR) *</label>
              <Input
                type="number"
                min="1"
                required
                value={grossAmount}
                onChange={(e) => handleGrossAmountChange(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">NET AMOUNT PAYABLE</label>
              <div className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-900 rounded-lg text-gold text-sm font-semibold">
                {formatCurrency(netAmount)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">INVOICE NO / FILE REF</label>
              <Input
                type="text"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="e.g. INV-2026-987"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REMARKS</label>
              <Input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Payment description or notes"
              />
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Dialog>

    </>
  );
}
