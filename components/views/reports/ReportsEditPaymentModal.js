import React, { useState, useEffect } from 'react';
import { Dialog, Button, Input, Select } from '../../ui/core';
import { ShieldCheck, ShieldAlert, Edit3 } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function ReportsEditPaymentModal({
  editModalOpen, setEditModalOpen, editingPayment, tdsSections = [], onSavePayment, submitting,
  vendors = [], pos = []
}) {
  const [amountRequested, setAmountRequested] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [tdsSection, setTdsSection] = useState('');
  const [tdsPct, setTdsPct] = useState(0);
  const [tdsAmount, setTdsAmount] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [remittanceRef, setRemittanceRef] = useState('');
  const [remittanceDate, setRemittanceDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [selectedPoNo, setSelectedPoNo] = useState('');
  const [selectedVendorCode, setSelectedVendorCode] = useState('');

  useEffect(() => {
    if (editingPayment) {
      const gross = Number(editingPayment.amountRequested || editingPayment.amount_requested || editingPayment.gross_amount || 0);
      const app = Number(editingPayment.approved_amount ?? editingPayment.approvedAmount ?? gross);
      const sec = editingPayment.tds_section || editingPayment.tdsSection || '';
      const pct = Number(editingPayment.tds_percentage || editingPayment.tds_pct || editingPayment.tdsPct || 0);
      const amt = Number(editingPayment.tds_amount || editingPayment.tdsAmount || 0);

      setAmountRequested(gross || '');
      setApprovedAmount(app || '');
      setTdsSection(sec);
      setTdsPct(pct);
      setTdsAmount(amt);
      setRemarks(editingPayment.remarks || '');
      setRemittanceRef(editingPayment.remittance_ref || editingPayment.utr || '');
      setRemittanceDate(editingPayment.remittance_date || (editingPayment.created_at ? editingPayment.created_at.split('T')[0] : ''));
      const pMode = editingPayment.payment_mode || editingPayment.paymentMode || (
        `${editingPayment.remarks || ''} ${editingPayment.terms || ''}`.toLowerCase().match(/cheque|chq|pdc/) ? 'Cheque' : 'NEFT'
      );
      setPaymentMode(pMode);
      setSelectedPoNo(editingPayment.po_no || editingPayment.poNo || '');
      setSelectedVendorCode(editingPayment.vendor_code || editingPayment.vendorCode || editingPayment.vendor_id || '');
    }
  }, [editingPayment]);

  const handleAmountRequestedChange = (val) => {
    setAmountRequested(val);
    if (!approvedAmount || Number(approvedAmount) === Number(amountRequested)) {
      handleApprovedAmountChange(val);
    }
  };

  const handleTdsSectionChange = (secCode) => {
    setTdsSection(secCode);
    if (!secCode) {
      setTdsPct(0);
      setTdsAmount(0);
      return;
    }
    const sec = tdsSections.find(s => s.section_code === secCode);
    const rate = sec ? Number(sec.rate || 0) : 0;
    setTdsPct(rate);
    const appAmt = Number(approvedAmount || amountRequested || 0);
    const calculatedTds = Math.round(appAmt * (rate / 100));
    setTdsAmount(calculatedTds);
  };

  const handleApprovedAmountChange = (val) => {
    const appAmt = Number(val);
    setApprovedAmount(val);
    if (tdsPct > 0) {
      const calculatedTds = Math.round(appAmt * (tdsPct / 100));
      setTdsAmount(calculatedTds);
    }
  };

  const netPayable = Math.max(0, Number(approvedAmount || amountRequested || 0) - Number(tdsAmount || 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Resolve vendor info from selected vendor code
    const selectedVendor = vendors.find(v =>
      String(v.code || v.vendorId || v.vendor_code || '').trim() === String(selectedVendorCode).trim()
    );
    onSavePayment({
      id: editingPayment?.id || editingPayment?.pr_id || editingPayment?.sNo,
      amountRequested: Number(amountRequested),
      approved_amount: Number(approvedAmount),
      tds_section: tdsSection,
      tds_percentage: Number(tdsPct),
      tds_amount: Number(tdsAmount),
      payment_mode: paymentMode,
      remarks,
      remittance_ref: remittanceRef,
      remittance_date: remittanceDate,
      // PO & Vendor overrides
      po_no: selectedPoNo || undefined,
      vendor_code: selectedVendorCode || undefined,
      vendor_id: selectedVendorCode || undefined,
      vendor_name: selectedVendor
        ? (selectedVendor.name || selectedVendor.legalName || selectedVendor.legal_name || '')
        : undefined,
      adminOverride: true
    });
  };

  const isRemitted = String(editingPayment?.stage || '').toLowerCase() === 'remitted' || String(editingPayment?.remittance || '').toLowerCase() === 'remitted';

  return (
    <Dialog
      open={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      title={`Admin Edit Payment & TDS — #${editingPayment?.id || editingPayment?.sNo || ''}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Read-only context strip */}
        <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Current Stage:</span>
            <span className="font-semibold text-foreground">{editingPayment?.stage || editingPayment?.approval_stage || 'Completed'}</span>
          </div>
        </div>

        {/* ── PO & Vendor (editable) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              PURCHASE ORDER
            </label>
            {pos && pos.length > 0 ? (
              <Select
                value={selectedPoNo}
                onChange={e => setSelectedPoNo(e.target.value)}
              >
                <option value="">— Keep current ({editingPayment?.poNo || editingPayment?.po_no || 'None'}) —</option>
                {pos.map(po => (
                  <option key={po.po_no || po.poNo} value={po.po_no || po.poNo}>
                    {po.po_no || po.poNo}{po.project ? ` · ${po.project}` : ''}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                type="text"
                placeholder={editingPayment?.poNo || editingPayment?.po_no || 'e.g. LAIPL/PO/26-27/001'}
                value={selectedPoNo}
                onChange={e => setSelectedPoNo(e.target.value)}
              />
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              VENDOR
            </label>
            {vendors && vendors.length > 0 ? (
              <Select
                value={selectedVendorCode}
                onChange={e => setSelectedVendorCode(e.target.value)}
              >
                <option value="">— Keep current ({editingPayment?.vendor || editingPayment?.vendor_name || 'None'}) —</option>
                {vendors.map(v => {
                  const code = v.code || v.vendorId || v.vendor_code || '';
                  const name = v.name || v.legalName || v.legal_name || code;
                  return (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  );
                })}
              </Select>
            ) : (
              <Input
                type="text"
                placeholder={editingPayment?.vendor || editingPayment?.vendor_name || 'Vendor name'}
                value={selectedVendorCode}
                onChange={e => setSelectedVendorCode(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              REQUESTED GROSS AMOUNT *
            </label>
            <Input
              type="number"
              required
              min="1"
              value={amountRequested}
              onChange={e => handleAmountRequestedChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              APPROVED AMOUNT *
            </label>
            <Input
              type="number"
              required
              min="1"
              value={approvedAmount}
              onChange={e => handleApprovedAmountChange(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              TDS SECTION
            </label>
            <Select value={tdsSection} onChange={e => handleTdsSectionChange(e.target.value)}>
              <option value="">None (No TDS)</option>
              {tdsSections.map(sec => (
                <option key={sec.section_code} value={sec.section_code}>
                  {sec.section_code} ({sec.description} - {sec.rate}%)
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              TDS AMOUNT (INR)
            </label>
            <Input
              type="number"
              min="0"
              value={tdsAmount}
              onChange={e => setTdsAmount(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border text-xs font-bold">
          <span className="text-muted-foreground">Net Payable After TDS:</span>
          <span className="text-amber-700 dark:text-primary text-sm tabular-nums">{formatCurrency(netPayable)}</span>
        </div>

        {isRemitted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                UTR / PAYMENT REFERENCE
              </label>
              <Input
                type="text"
                placeholder="e.g. UTR12345678"
                value={remittanceRef}
                onChange={e => setRemittanceRef(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                REMITTANCE DATE
              </label>
              <Input
                type="date"
                value={remittanceDate}
                onChange={e => setRemittanceDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
            PAYMENT MODE *
          </label>
          <Select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
            <option value="NEFT">NEFT (Direct Bank Transfer)</option>
            <option value="Cheque">Cheque / PDC</option>
            <option value="RTGS">RTGS</option>
            <option value="IMPS">IMPS</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
            ADMIN REMARKS / EDIT REASON
          </label>
          <Input
            type="text"
            placeholder="Audit notes for this administrative modification"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
