import React, { useState, useEffect } from 'react';
import { Dialog, Button, Input, Select } from '../../ui/core';
import { ShieldCheck, ShieldAlert, Edit3 } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function ReportsEditPaymentModal({
  editModalOpen, setEditModalOpen, editingPayment, tdsSections = [], onSavePayment, submitting
}) {
  const [amountRequested, setAmountRequested] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [tdsSection, setTdsSection] = useState('');
  const [tdsPct, setTdsPct] = useState(0);
  const [tdsAmount, setTdsAmount] = useState(0);
  const [remarks, setRemarks] = useState('');

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
    }
  }, [editingPayment]);

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
    onSavePayment({
      id: editingPayment?.id || editingPayment?.pr_id || editingPayment?.sNo,
      amountRequested: Number(amountRequested),
      approved_amount: Number(approvedAmount),
      tds_section: tdsSection,
      tds_percentage: Number(tdsPct),
      tds_amount: Number(tdsAmount),
      remarks,
      adminOverride: true
    });
  };

  return (
    <Dialog
      open={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      title={`Admin Edit Payment & TDS — #${editingPayment?.id || editingPayment?.sNo || ''}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Vendor:</span>
            <span className="font-bold text-foreground">{editingPayment?.vendor || editingPayment?.vendor_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">PO Number:</span>
            <span className="font-mono font-bold text-amber-700 dark:text-gold">{editingPayment?.poNo || editingPayment?.po_no}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Current Stage:</span>
            <span className="font-semibold text-foreground">{editingPayment?.stage || editingPayment?.approval_stage || 'Completed'}</span>
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
              onChange={e => setAmountRequested(e.target.value)}
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
          <span className="text-amber-700 dark:text-gold text-sm tabular-nums">{formatCurrency(netPayable)}</span>
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
