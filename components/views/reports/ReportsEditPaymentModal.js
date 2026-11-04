import React, { useState, useEffect, useMemo } from 'react';
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

      // Match initial vendor code
      const pCode = editingPayment.vendor_code || editingPayment.vendorCode || editingPayment.vendor_id || '';
      const pName = editingPayment.vendor_name || editingPayment.vendor || '';
      const matchedVendor = (vendors || []).find(v => {
        const vCode = String(v.code || v.vendorId || v.vendor_code || '').trim().toLowerCase();
        const vName = String(v.name || v.legalName || v.legal_name || '').trim().toLowerCase();
        const normCode = String(pCode).trim().toLowerCase();
        const normName = String(pName).trim().toLowerCase();
        if (normCode && vCode === normCode) return true;
        if (normName && (vName === normName || vName.includes(normName) || normName.includes(vName))) return true;
        return false;
      });

      const resolvedVendorCode = matchedVendor ? (matchedVendor.code || matchedVendor.vendorId || matchedVendor.vendor_code) : pCode;
      setSelectedVendorCode(resolvedVendorCode || '');
      setSelectedPoNo(editingPayment.po_no || editingPayment.poNo || '');
    }
  }, [editingPayment, vendors]);

  // Current selected vendor object
  const currentVendor = useMemo(() => {
    if (!selectedVendorCode) return null;
    const norm = String(selectedVendorCode).trim().toLowerCase();
    return (vendors || []).find(v => {
      const vCode = String(v.code || v.vendorId || v.vendor_code || '').trim().toLowerCase();
      const vName = String(v.name || v.legalName || v.legal_name || '').trim().toLowerCase();
      return vCode === norm || vName === norm;
    }) || null;
  }, [selectedVendorCode, vendors]);

  // Filter POs strictly by the selected vendor
  const vendorPOs = useMemo(() => {
    if (!selectedVendorCode && !currentVendor) return pos || [];

    const vCodes = [
      selectedVendorCode,
      currentVendor?.code,
      currentVendor?.vendorId,
      currentVendor?.vendor_code
    ].filter(Boolean).map(c => String(c).trim().toLowerCase());

    const vNames = [
      currentVendor?.name,
      currentVendor?.legalName,
      currentVendor?.legal_name,
      currentVendor?.tradeName,
      currentVendor?.trade_name
    ].filter(Boolean).map(n => String(n).trim().toLowerCase());

    const matched = (pos || []).filter(po => {
      const poVendorCode = String(po.vendor_code || po.vendor_key || po.vendorCode || '').trim().toLowerCase();
      const poVendorName = String(po.vendor_name || po.vendor || '').trim().toLowerCase();

      const codeMatch = poVendorCode && vCodes.includes(poVendorCode);
      const nameMatch = poVendorName && vNames.some(vn => vn === poVendorName || (vn && poVendorName && (vn.includes(poVendorName) || poVendorName.includes(vn))));
      const directCodeMatch = poVendorCode && vCodes.some(c => c === poVendorCode || poVendorCode.includes(c) || c.includes(poVendorCode));

      return codeMatch || nameMatch || directCodeMatch;
    });

    // If currently selected PO is not in the matched list, keep it so it stays visible
    if (selectedPoNo && !matched.some(p => (p.po_no || p.poNo) === selectedPoNo)) {
      const existingPo = (pos || []).find(p => (p.po_no || p.poNo) === selectedPoNo);
      if (existingPo) matched.unshift(existingPo);
    }

    return matched;
  }, [selectedVendorCode, currentVendor, pos, selectedPoNo]);

  const handleVendorChange = (newVendorCode) => {
    setSelectedVendorCode(newVendorCode);

    if (!newVendorCode) return;
    const norm = String(newVendorCode).trim().toLowerCase();
    const vObj = (vendors || []).find(v => {
      const vCode = String(v.code || v.vendorId || v.vendor_code || '').trim().toLowerCase();
      const vName = String(v.name || v.legalName || v.legal_name || '').trim().toLowerCase();
      return vCode === norm || vName === norm;
    });

    const vCodes = [newVendorCode, vObj?.code, vObj?.vendorId, vObj?.vendor_code].filter(Boolean).map(c => String(c).trim().toLowerCase());
    const vNames = [vObj?.name, vObj?.legalName, vObj?.legal_name, vObj?.tradeName, vObj?.trade_name].filter(Boolean).map(n => String(n).trim().toLowerCase());

    const matching = (pos || []).filter(po => {
      const poVendorCode = String(po.vendor_code || po.vendor_key || po.vendorCode || '').trim().toLowerCase();
      const poVendorName = String(po.vendor_name || po.vendor || '').trim().toLowerCase();
      return (poVendorCode && vCodes.includes(poVendorCode)) || (poVendorName && vNames.some(vn => vn === poVendorName || vn.includes(poVendorName) || poVendorName.includes(vn)));
    });

    const currentMatches = matching.some(p => (p.po_no || p.poNo) === selectedPoNo);
    if (!currentMatches) {
      setSelectedPoNo(matching[0]?.po_no || matching[0]?.poNo || '');
    }
  };

  const handlePoChange = (newPoNo) => {
    setSelectedPoNo(newPoNo);
    const poObj = (pos || []).find(p => (p.po_no || p.poNo) === newPoNo);
    if (poObj) {
      const poVendorKey = String(poObj.vendor_key || poObj.vendor_code || poObj.vendorCode || '').trim().toLowerCase();
      const poVendorName = String(poObj.vendor_name || poObj.vendor || '').trim().toLowerCase();
      const matchedV = (vendors || []).find(v => {
        const vCode = String(v.code || v.vendorId || v.vendor_code || '').trim().toLowerCase();
        const vName = String(v.name || v.legalName || v.legal_name || '').trim().toLowerCase();
        return (poVendorKey && vCode === poVendorKey) || (poVendorName && (vName === poVendorName || vName.includes(poVendorName) || poVendorName.includes(vName)));
      });
      if (matchedV) {
        setSelectedVendorCode(matchedV.code || matchedV.vendorId || matchedV.vendor_code);
      }
    }
  };

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
    const selectedVendor = (vendors || []).find(v =>
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
      is_manual: !!(editingPayment?.is_manual || String(editingPayment?.id || '').toUpperCase().startsWith('M-')),
      manual_id: editingPayment?.manual_id,
      adminOverride: true
    });
  };

  const isRemitted = String(editingPayment?.stage || '').toLowerCase() === 'remitted' || String(editingPayment?.remittance || '').toLowerCase() === 'remitted';

  return (
    <Dialog
      open={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      title={`Edit Payment Record — #${editingPayment?.id || editingPayment?.sNo || ''}`}
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

        {/* ── Vendor & Purchase Order (Vendor first, PO filtered by vendor) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              VENDOR *
            </label>
            {vendors && vendors.length > 0 ? (
              <Select
                value={selectedVendorCode}
                onChange={e => handleVendorChange(e.target.value)}
              >
                <option value="">— Select Vendor —</option>
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                PURCHASE ORDER *
              </label>
              {selectedVendorCode && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  {vendorPOs.length} PO{vendorPOs.length === 1 ? '' : 's'} available
                </span>
              )}
            </div>
            {pos && pos.length > 0 ? (
              <Select
                value={selectedPoNo}
                onChange={e => handlePoChange(e.target.value)}
              >
                <option value="">
                  {vendorPOs.length === 0 ? '— No POs for this vendor —' : '— Select Purchase Order —'}
                </option>
                {vendorPOs.map(po => {
                  const pNum = po.po_no || po.poNo;
                  return (
                    <option key={pNum} value={pNum}>
                      {pNum}{po.project ? ` · ${po.project}` : ''}
                    </option>
                  );
                })}
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
