import React from 'react';
import { Dialog, Button, Input, Select } from '../../ui/core';
import { ShieldAlert, CreditCard, Landmark, FileText, IndianRupee, Layers, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { useAppState } from '../../StateProvider';

export default function PaymentFormModal({
  requestModalOpen, setRequestModalOpen, vendorCode, setVendorCode, vendors,
  poNo, handlePOChange, vendorPOs, grossAmount, handleGrossAmountChange,
  tdsAmount, setTdsAmount, netAmount, invoiceRef, setInvoiceRef, remarks, setRemarks,
  formError, submitting, handleSubmitRequest, projectSummary, progressWidths, getHealthTheme,
  getVendorPOs, setPoNo, isEditMode, editingPrId, paymentMode, setPaymentMode
}) {
  const selectedPO = vendorPOs?.find(p => p.po_no === poNo) || null;

  const { activeLocks, user, call } = useAppState();
  const lockKey = `payment:${editingPrId}`;
  const currentLock = editingPrId ? activeLocks[lockKey] : null;
  const isLockedByOthers = currentLock && currentLock.email !== user?.email;

  React.useEffect(() => {
    if (!requestModalOpen || !editingPrId) return;

    let active = true;
    let intervalId = null;

    async function lockDocument() {
      try {
        const res = await call('acquireDocumentLock', 'payment', editingPrId);
        if (res && res.ok) {
          intervalId = setInterval(async () => {
            if (!active) return;
            try {
              const refreshRes = await call('acquireDocumentLock', 'payment', editingPrId);
              if (!refreshRes.ok) {
                clearInterval(intervalId);
              }
            } catch (e) {
              console.error('Lock refresh failed:', e);
            }
          }, 15000);
        }
      } catch (err) {
        console.error('Failed to acquire document lock:', err);
      }
    }

    lockDocument();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      call('releaseDocumentLock', 'payment', editingPrId).catch(() => {});
    };
  }, [requestModalOpen, editingPrId, call]);

  const poTotal = Number(selectedPO?.po_value || 0);
  const poPaid = Number(selectedPO?.paid || 0);
  const poRemaining = Math.max(0, poTotal - poPaid);
  const paidPct = poTotal > 0 ? Math.min(100, Math.round((poPaid / poTotal) * 100)) : 0;

  return (
    <Dialog 
      open={requestModalOpen} 
      onClose={() => setRequestModalOpen(false)} 
      title={isEditMode ? `Edit Payment Order — #${editingPrId}` : "New Payment Order Requisition"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmitRequest} className="space-y-5">
        {isLockedByOthers && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Collaborative Edit Lock Active</div>
              <div className="text-muted-foreground mt-0.5">
                This Payment Request is currently opened by <strong>{currentLock.name}</strong> ({currentLock.email}). Inputs are read-only.
              </div>
            </div>
          </div>
        )}

        <fieldset disabled={isLockedByOthers} className="space-y-5 border-0 p-0 m-0">
          
          {/* ── Section 1: Beneficiary & PO Allocation ── */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> Beneficiary & PO Allocation
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  VENDOR PARTNER *
                </label>
                <Select 
                  value={vendorCode} 
                  onChange={(e) => {
                    const newVendorCode = e.target.value;
                    setVendorCode(newVendorCode);
                    const validPOs = getVendorPOs(newVendorCode);
                    setPoNo(validPOs[0]?.po_no || '');
                  }} 
                  disabled={isEditMode}
                  className="text-xs font-medium"
                >
                  {vendors.map((v, idx) => (
                    <option key={idx} value={v.code}>{v.name} ({v.code})</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  PURCHASE ORDER *
                </label>
                <Select 
                  value={poNo} 
                  onChange={(e) => handlePOChange(e.target.value)} 
                  disabled={isEditMode}
                  className="text-xs font-medium"
                >
                  <option value="">Select PO...</option>
                  {vendorPOs.map((p, idx) => (
                    <option key={idx} value={p.po_no}>{p.po_no} — {p.project || 'General'}</option>
                  ))}
                </Select>
              </div>
            </div>

            {selectedPO && (
              <div className="mt-3 pt-3 border-t border-border/60">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">PO Budget</span>
                    <span className="font-mono text-xs font-bold text-foreground tabular-nums">{formatCurrency(poTotal)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Paid ({paidPct}%)</span>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(poPaid)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Available Buffer</span>
                    <span className="font-mono text-xs font-bold text-amber-700 dark:text-primary tabular-nums">{formatCurrency(poRemaining)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 2: Financials & Mode ── */}
          <div className="p-4 rounded-xl bg-card border border-border/80 space-y-4">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-primary" /> Claim Amount & Disbursement Mode
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  REQUESTED AMOUNT (INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-xs">₹</span>
                  <Input
                    type="number"
                    min="1"
                    required
                    placeholder="50,000"
                    value={grossAmount === 0 || grossAmount === '' || grossAmount == null ? '' : grossAmount}
                    onChange={(e) => handleGrossAmountChange(e.target.value === '' ? '' : Number(e.target.value))}
                    className="pl-7 font-mono text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  PAYMENT DISBURSEMENT MODE *
                </label>
                <Select 
                  value={paymentMode || 'NEFT'} 
                  onChange={(e) => setPaymentMode && setPaymentMode(e.target.value)}
                  className="text-xs font-semibold"
                >
                  <option value="NEFT">NEFT (Direct Bank Transfer)</option>
                  <option value="Cheque">Cheque / PDC</option>
                  <option value="RTGS">RTGS (High-Value Transfer)</option>
                  <option value="IMPS">IMPS (Immediate Transfer)</option>
                  <option value="UPI">UPI Digital Payment</option>
                  <option value="Cash">Cash / Petty Disbursement</option>
                </Select>
              </div>
            </div>

            {/* Calculated Breakdown Card */}
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">TDS Withheld ({selectedPO?.tds_pct || 0}%):</span>
                <span className="ml-2 font-mono font-bold text-foreground">{formatCurrency(tdsAmount || 0)}</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground font-medium">Net Payable to Vendor:</span>
                <span className="ml-2 font-mono text-sm font-bold text-amber-700 dark:text-primary tabular-nums">{formatCurrency(netAmount || 0)}</span>
              </div>
            </div>
          </div>

          {/* ── Section 3: Documentation & Audit ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                INVOICE NO / FILE REFERENCE
              </label>
              <Input
                type="text"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="e.g. INV-2026-987"
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                REMARKS / REQUISITION NOTE
              </label>
              <Input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Milestone description or notes"
                className="text-xs"
              />
            </div>
          </div>

        </fieldset>

        {formError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="pt-4 border-t border-border/80 flex justify-end gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={() => setRequestModalOpen(false)} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting || isLockedByOthers} className="text-xs px-5 shadow-xs">
            {submitting ? (isEditMode ? 'Updating Order...' : 'Submitting Order...') : (isEditMode ? 'Update Order' : 'Submit Requisition')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
