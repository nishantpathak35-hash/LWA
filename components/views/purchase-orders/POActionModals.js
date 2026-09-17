'use client';
import React, { useState } from 'react';
import { Dialog, Button, Input, Textarea } from '../../ui/core';
import {
  AlertTriangle, Send, Mail, Scissors, Trash2,
  CheckCircle2, XCircle, Loader2
} from 'lucide-react';

// ─── 1. Email PO Modal ────────────────────────────────────────────────────────
export function EmailPOModal({ open, po, defaultEmail, onClose, onConfirm, sending }) {
  const [email, setEmail] = useState(defaultEmail || '');

  const handleOpen = () => setEmail(defaultEmail || '');

  // Sync email when defaultEmail changes (vendor selected)
  React.useEffect(() => { if (open) setEmail(defaultEmail || ''); }, [open, defaultEmail]);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <Dialog open={open} onClose={onClose} title={
      <span className="flex items-center gap-2 text-amber-600 dark:text-gold">
        <Mail className="w-4 h-4" /> Email Purchase Order
      </span>
    }>
      <div className="space-y-4">
        <div className="p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200/80 leading-relaxed">
          The latest PO PDF will be generated and emailed to the vendor.
          {po && (
            <div className="mt-1.5 font-bold text-amber-100">
              PO: <span className="font-mono">{po.po_no}</span>
              {po.vendor_name && <> · {po.vendor_name}</>}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Recipient Email <span className="text-rose-500">*</span>
          </label>
          <Input
            type="email"
            placeholder="vendor@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            className={`text-sm ${!isValid && email.length > 0 ? 'border-rose-500/50' : ''}`}
          />
          {!isValid && email.length > 4 && (
            <p className="text-[10px] text-rose-400 font-semibold">Enter a valid email address</p>
          )}
          <p className="text-[10px] text-muted-foreground">Default CCs will also be included per settings.</p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={sending} className="text-xs">Cancel</Button>
          <Button
            onClick={() => onConfirm(email.trim())}
            disabled={!isValid || sending}
            className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 flex items-center gap-1.5"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── 2. Short Close PO Modal ──────────────────────────────────────────────────
export function ShortClosePOModal({ open, po, onClose, onConfirm, loading }) {
  const origPoValue = Math.round(Number(po?.po_value || 0));
  const paidAmount = Math.round(Number(po?.paid ?? po?.legacy_paid ?? 0));

  const [finalValue, setFinalValue] = useState(String(paidAmount));
  const [remarks, setRemarks] = useState('Delivery complete – short close remaining balance');

  React.useEffect(() => {
    if (open) {
      setFinalValue(String(paidAmount));
      setRemarks('Delivery complete – short close remaining balance');
    }
  }, [open, paidAmount]);

  const numVal = Number(finalValue);
  const isNumValid = !isNaN(numVal) && numVal >= 0 && finalValue.trim() !== '';
  const isRemarksValid = remarks.trim().length >= 3;
  const isValid = isNumValid && isRemarksValid;

  const releasedAmount = Math.max(0, origPoValue - numVal);
  const remainingPayable = Math.max(0, numVal - paidAmount);
  const isBelowPaid = isNumValid && numVal < paidAmount;
  const isExceedingOriginal = isNumValid && origPoValue > 0 && numVal > origPoValue;

  return (
    <Dialog open={open} onClose={onClose} title={
      <span className="flex items-center gap-2 text-amber-600 dark:text-gold">
        <Scissors className="w-4 h-4" /> Short Close Purchase Order
      </span>
    }>
      <div className="space-y-4">
        <div className="p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200/80 space-y-1.5 leading-relaxed">
          <div className="font-bold text-amber-100 text-sm flex items-center justify-between">
            <span>PO: <span className="font-mono">{po?.po_no}</span></span>
            {po?.vendor_name && <span className="text-amber-300 font-normal text-xs">{po.vendor_name}</span>}
          </div>
          <p>
            Short closing updates the official PO value, releases the uncommitted balance, and marks the order closed.
          </p>
        </div>

        {/* Financial Overview Grid */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-muted/40 rounded-xl border border-border text-center">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Original PO</div>
            <div className="text-xs font-bold text-foreground font-mono mt-0.5">
              ₹{origPoValue.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Paid So Far</div>
            <div className="text-xs font-bold text-emerald-500 font-mono mt-0.5">
              ₹{paidAmount.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Current Balance</div>
            <div className="text-xs font-bold text-amber-500 font-mono mt-0.5">
              ₹{Math.max(0, origPoValue - paidAmount).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Final PO Value Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Revised Final PO Value (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFinalValue(String(paidAmount))}
                className="text-[11px] text-amber-500 hover:text-amber-400 font-medium underline cursor-pointer"
              >
                Set to Paid (₹{paidAmount.toLocaleString('en-IN')})
              </button>
            </div>
          </div>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="Enter final PO value"
            value={finalValue}
            onChange={e => setFinalValue(e.target.value)}
            className={`text-sm font-mono ${!isNumValid ? 'border-rose-500/50' : ''}`}
            autoFocus
          />

          {/* Real-time Calculation Breakdown */}
          {isNumValid && (
            <div className="text-[11px] rounded-lg p-2.5 bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Commitment Released (Savings):</span>
                <span className="font-mono font-semibold text-emerald-400">₹{releasedAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Outstanding Payable After Close:</span>
                <span className="font-mono font-semibold text-amber-400">₹{remainingPayable.toLocaleString('en-IN')}</span>
              </div>
              {isBelowPaid && (
                <div className="text-[10px] text-rose-400 font-medium mt-1">
                  ⚠️ Note: New value is ₹{(paidAmount - numVal).toLocaleString('en-IN')} less than total amount already paid.
                </div>
              )}
              {isExceedingOriginal && (
                <div className="text-[10px] text-amber-400 font-medium mt-1">
                  ⚠️ Note: New value is higher than the original PO value.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Remarks Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Remarks / Reason <span className="text-rose-500">*</span>
          </label>
          <Textarea
            placeholder="Enter reason for short closing this PO..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-xs">Cancel</Button>
          <Button
            onClick={() => onConfirm({ remarks: remarks.trim(), finalPoValue: numVal })}
            disabled={!isValid || loading}
            className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
            {loading ? 'Short Closing...' : `Confirm Short Close at ₹${isNumValid ? numVal.toLocaleString('en-IN') : '0'}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── 3. Delete PO Modal ───────────────────────────────────────────────────────
export function DeletePOModal({ open, po, onClose, onConfirm, loading }) {
  const [typed, setTyped] = useState('');
  const poNo = po?.po_no || '';
  const isValid = typed.trim() === poNo;

  React.useEffect(() => { if (open) setTyped(''); }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title={
      <span className="flex items-center gap-2 text-rose-500">
        <Trash2 className="w-4 h-4" /> Delete Purchase Order
      </span>
    }>
      <div className="space-y-4">
        <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-200 text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" /> This action is irreversible
          </div>
          <div className="pl-6 space-y-1 text-rose-300/90">
            <p>PO <span className="font-mono font-bold text-rose-200">{poNo}</span> and all its line items will be permanently deleted.</p>
            {po?.vendor_name && <p>Vendor: <span className="font-bold text-rose-200">{po.vendor_name}</span></p>}
            {po?.po_value > 0 && <p>Value: <span className="font-bold text-rose-200">₹{Number(po.po_value).toLocaleString('en-IN')}</span></p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Type <span className="font-mono bg-muted px-1 py-0.5 rounded text-foreground">{poNo}</span> to confirm
          </label>
          <Input
            placeholder={`Type "${poNo}" here`}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            autoFocus
            className={`text-sm font-mono ${typed.length > 0 && !isValid ? 'border-rose-500/50' : isValid ? 'border-emerald-500/50' : ''}`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-xs">Cancel</Button>
          <Button
            onClick={() => onConfirm(poNo)}
            disabled={!isValid || loading}
            className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {loading ? 'Deleting...' : 'Delete PO'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── 4. Submit for Approval Modal ─────────────────────────────────────────────
export function SubmitForApprovalModal({ open, po, onClose, onConfirm, loading }) {
  return (
    <Dialog open={open} onClose={onClose} title={
      <span className="flex items-center gap-2 text-sky-500">
        <CheckCircle2 className="w-4 h-4" /> Submit for Approval
      </span>
    }>
      <div className="space-y-4">
        <div className="p-3.5 bg-sky-950/30 border border-sky-800/40 rounded-xl text-xs text-sky-200/80 leading-relaxed">
          <div className="font-bold text-sky-100 text-sm mb-1">
            PO <span className="font-mono">{po?.po_no}</span> will be submitted to the approvers.
          </div>
          <p>Once submitted, you will not be able to edit it until it is reviewed. The assigned approvers will be notified.</p>
          {po?.vendor_name && <p className="mt-1 text-sky-300">Vendor: <span className="font-bold">{po.vendor_name}</span></p>}
          {po?.po_value > 0 && <p className="text-sky-300">Value: <span className="font-bold">₹{Number(po.po_value).toLocaleString('en-IN')}</span></p>}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-xs">Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
