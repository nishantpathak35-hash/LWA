import React, { useState, useEffect } from 'react';
import { Dialog, Button, Input, Select } from '../../ui/core';
import { ShieldCheck, Calendar, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { getITDSectionCode, validateBSRCode, validateTAN, calculateChallanInterest } from '../../../app/lib/tdsChallan281';

export default function TDSChallan281Modal({
  modalOpen, setModalOpen, monthData, onSaveChallan, submitting
}) {
  const [tan, setTan] = useState('DELM12345F');
  const [minorHead, setMinorHead] = useState('200'); // 200 (Company) or 400 (Regular)
  const [section, setSection] = useState('194C');
  const [baseTds, setBaseTds] = useState(0);
  const [interestAmt, setInterestAmt] = useState(0);
  const [fee234E, setFee234E] = useState(0);
  const [bsrCode, setBsrCode] = useState('0210001');
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().substring(0, 10));
  const [bankName, setBankName] = useState('HDFC Bank');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (monthData) {
      setSection(monthData.section || '194C');
      setBaseTds(Number(monthData.tdsAmount || 0));
      setChallanNo(`CH-${Date.now().toString().slice(-5)}`);
    }
  }, [monthData]);

  const totalChallanPayable = Number(baseTds || 0) + Number(interestAmt || 0) + Number(fee234E || 0);
  const itdCode = getITDSectionCode(section);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (bsrCode && !validateBSRCode(bsrCode)) {
      setErrorMsg('BSR Code must be a 7-digit numeric code (e.g. 0210001).');
      return;
    }

    if (tan && !validateTAN(tan)) {
      setErrorMsg('Invalid TAN number format (e.g. DELM12345F).');
      return;
    }

    onSaveChallan({
      id: `CH281-${Date.now()}`,
      month: monthData?.monthLabel || 'April 2026',
      tan: tan.toUpperCase(),
      minor_head: minorHead,
      section_code: section,
      itd_code: itdCode,
      base_tds: Number(baseTds),
      interest: Number(interestAmt),
      fee_234e: Number(fee234E),
      total_challan_amount: totalChallanPayable,
      bsr_code: bsrCode,
      challan_no: challanNo,
      challan_date: challanDate,
      bank_name: bankName,
      cin: `${bsrCode}${challanDate.replace(/-/g, '')}${challanNo}`,
      status: 'Deposited',
      remarks
    });
  };

  const handleOpenITDPortal = () => {
    // Open Income Tax e-Pay Tax / NSDL Challan 281 Direct Portal
    window.open('https://eportal.incometax.gov.in/iec/foservices/#/e-pay-tax-login', '_blank');
  };

  return (
    <Dialog
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      title={`Create Monthly Challan 281 — ${monthData?.monthLabel || 'Current Month'}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Info Banner */}
        <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-xl">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Target Month & TDS Section</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {monthData?.monthLabel || 'Current Month'} &middot; <span className="text-amber-700 dark:text-gold">{section} (ITD Code: {itdCode})</span>
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenITDPortal}
            className="text-xs font-semibold gap-1.5 text-amber-700 dark:text-gold border-amber-500/30 hover:bg-amber-500/10"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Pay Online on ITD Portal
          </Button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              TAN NUMBER *
            </label>
            <Input
              type="text"
              required
              value={tan}
              onChange={e => setTan(e.target.value)}
              placeholder="DELM12345F"
              className="font-mono uppercase"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              MINOR HEAD (PAYMENT TYPE)
            </label>
            <Select value={minorHead} onChange={e => setMinorHead(e.target.value)}>
              <option value="200">(200) TDS Payable by Company</option>
              <option value="400">(400) TDS Regular Assessment</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              BASE TDS AMOUNT (INR) *
            </label>
            <Input
              type="number"
              required
              min="1"
              value={baseTds}
              onChange={e => setBaseTds(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              INTEREST U/S 201(1A)
            </label>
            <Input
              type="number"
              min="0"
              value={interestAmt}
              onChange={e => setInterestAmt(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              FEE U/S 234E
            </label>
            <Input
              type="number"
              min="0"
              value={fee234E}
              onChange={e => setFee234E(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-between items-center p-3.5 rounded-xl bg-card border border-border">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Net Payable Challan Deposit:</span>
          <span className="text-base font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(totalChallanPayable)}</span>
        </div>

        {/* Bank Deposit Verification Fields */}
        <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
          <span className="text-xs font-bold text-amber-700 dark:text-gold uppercase tracking-wider block">
            Bank Deposit Verification Details (CIN / BSR)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                BSR CODE (7 DIGITS)
              </label>
              <Input
                type="text"
                maxLength={7}
                placeholder="0210001"
                value={bsrCode}
                onChange={e => setBsrCode(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                CHALLAN SERIAL NO
              </label>
              <Input
                type="text"
                placeholder="CH-00123"
                value={challanNo}
                onChange={e => setChallanNo(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                DEPOSIT DATE
              </label>
              <Input
                type="date"
                value={challanDate}
                onChange={e => setChallanDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
            REMARKS / NOTES
          </label>
          <Input
            type="text"
            placeholder="e.g. Deposited via HDFC Corporate Netbanking"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Record Challan 281 Deposit'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
