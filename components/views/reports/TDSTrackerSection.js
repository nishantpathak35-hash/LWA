import React, { useState, useMemo } from 'react';
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Select } from '../../ui/core';
import { FileText, Download, CheckCircle, Clock, AlertCircle, Search, Filter, ExternalLink, Plus, Landmark } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
import TDSChallan281Modal from './TDSChallan281Modal';
import { getITDSectionCode, generate26QFileContent } from '../../../app/lib/tdsChallan281';

export default function TDSTrackerSection({ payments = [], vendors = [] }) {
  const [activeTab, setActiveTab] = useState('quarter_tracker'); // 'quarter_tracker' | 'challan_281'
  const [selectedFy, setSelectedFy] = useState('2026-27');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1'); // Q1, Q2, Q3, Q4, All
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Storage for Form 16A status overrides & Monthly Challan 281 records
  const [form16aRecords, setForm16aRecords] = useState({});
  const [challan281Records, setChallan281Records] = useState([
    {
      id: 'CH281-17374829381',
      month: 'April 2026',
      tan: 'DELM12345F',
      minor_head: '200',
      section_code: '194C',
      itd_code: '94C',
      base_tds: 48500,
      interest: 0,
      fee_234e: 0,
      total_challan_amount: 48500,
      bsr_code: '0210001',
      challan_no: 'CH-08472',
      challan_date: '2026-05-05',
      bank_name: 'HDFC Bank',
      cin: '021000120260505CH-08472',
      status: 'Deposited',
      remarks: 'Paid via Corporate Internet Banking'
    }
  ]);

  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [selectedMonthData, setSelectedMonthData] = useState(null);

  const handleOpenCreateChallan = (monthLabel = 'April 2026', section = '194C', amount = 0) => {
    setSelectedMonthData({ monthLabel, section, tdsAmount: amount });
    setChallanModalOpen(true);
  };

  const handleSaveChallan = (newChallan) => {
    setChallan281Records(prev => [newChallan, ...prev]);
    setChallanModalOpen(false);
  };

  const handleExport26QFile = () => {
    const fileText = generate26QFileContent(challan281Records);
    const blob = new Blob([fileText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NSDL_26Q_eTDS_FVU_${selectedFy}.txt`;
    a.click();
  };

  // Filter remitted payment requests that have TDS deductions
  const tdsDeductions = useMemo(() => {
    const records = [];

    payments.forEach(p => {
      // Check if payment request is remitted / paid and has TDS section/amount
      const isRemitted = String(p.stage || p.status || p.remittance || '').toLowerCase().includes('remit');
      const tdsAmt = Number(p.tds_amount || p.tdsAmount || 0);
      const tdsSec = p.tds_section || p.tdsSection || '194C';

      if (isRemitted && tdsAmt > 0) {
        const remDate = p.remittance_date || p.created_at || new Date().toISOString();
        const dateObj = new Date(remDate);
        const month = dateObj.getMonth() + 1; // 1-12

        // Determine Financial Quarter (India FY: Apr-Mar)
        // Q1: Apr-Jun (4-6), Q2: Jul-Sep (7-9), Q3: Oct-Dec (10-12), Q4: Jan-Mar (1-3)
        let q = 'Q1';
        if (month >= 4 && month <= 6) q = 'Q1';
        else if (month >= 7 && month <= 9) q = 'Q2';
        else if (month >= 10 && month <= 12) q = 'Q3';
        else q = 'Q4';

        const vendor = vendors.find(v => 
          v.name === p.vendor_name || v.code === p.vendor_code || v.vendorId === p.vendor_key
        ) || {};

        const pan = vendor.pan || p.vendor_pan || 'ABCDE1234F';

        records.push({
          id: p.id || p.pr_id,
          po_no: p.po_no,
          vendor_name: p.vendor_name || 'Unknown Vendor',
          vendor_pan: pan,
          gstin: vendor.gstin || '—',
          gross_amount: Number(p.amount_requested || p.net_amount || 0) + tdsAmt,
          tds_amount: tdsAmt,
          tds_section: tdsSec,
          tds_rate: p.tds_percentage || (tdsSec === '194C' ? 2 : 10),
          remittance_date: remDate,
          quarter: q,
          status_key: `${p.id || p.pr_id}`
        });
      }
    });

    return records;
  }, [payments, vendors]);

  // Aggregate TDS records by Vendor + Section + Quarter
  const filteredRecords = useMemo(() => {
    return tdsDeductions.filter(r => {
      if (selectedQuarter !== 'ALL' && r.quarter !== selectedQuarter) return false;
      if (selectedSection !== 'ALL' && r.tds_section !== selectedSection) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.vendor_name.toLowerCase().includes(q) || 
               r.vendor_pan.toLowerCase().includes(q) || 
               r.po_no.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tdsDeductions, selectedQuarter, selectedSection, searchQuery]);

  // Totals Summary
  const totals = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      acc.gross += r.gross_amount;
      acc.tds += r.tds_amount;
      return acc;
    }, { gross: 0, tds: 0 });
  }, [filteredRecords]);

  const handleUpdateForm16A = (id, status, refNo = '') => {
    setForm16aRecords(prev => ({
      ...prev,
      [id]: { status, refNo, date: new Date().toISOString().substring(0, 10) }
    }));
  };

  const handleExportTDSCSV = () => {
    const csvHeader = 'Quarter,Vendor Name,PAN,TDS Section,Gross Amount (INR),TDS Deducted (INR),Date,Certificate Status,Ref No\n';
    const csvRows = filteredRecords.map(r => {
      const rec = form16aRecords[r.id] || { status: 'Pending Upload', refNo: '—' };
      return `"${r.quarter}","${r.vendor_name}","${r.vendor_pan}","${r.tds_section}",${r.gross_amount},${r.tds_amount},"${formatDate(r.remittance_date)}","${rec.status}","${rec.refNo}"`;
    }).join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TDS_Form16A_Log_${selectedFy}_${selectedQuarter}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card & Sub-Tab Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/40 p-5 rounded-2xl border border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-700 dark:text-gold" />
            TDS Compliance & TRACES Portal Tracker
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage quarterly Form 16A certificates, generate monthly Challan 281 deposit records, and export NSDL 26Q e-TDS files.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-background p-1 rounded-xl border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('quarter_tracker')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'quarter_tracker' ? 'bg-amber-600 text-white dark:bg-gold dark:text-slate-950 font-bold shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <FileText className="w-3.5 h-3.5" /> Form 16A Tracker
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('challan_281')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'challan_281' ? 'bg-amber-600 text-white dark:bg-gold dark:text-slate-950 font-bold shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Landmark className="w-3.5 h-3.5" /> Monthly Challan 281 & TRACES
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'challan_281' ? (
        <div className="space-y-6">
          {/* Monthly Challan Actions Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-card border border-border rounded-xl gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Monthly ITNS Challan 281 Deposit Records</h3>
              <p className="text-xs text-muted-foreground">Logged monthly TDS deposits with BSR Codes, CIN, and statutory Section 94C/94J codes.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open('https://eportal.incometax.gov.in/iec/foservices/#/e-pay-tax-login', '_blank')} className="gap-1.5 text-xs font-semibold">
                <ExternalLink className="w-3.5 h-3.5 text-amber-700 dark:text-gold" /> Pay on ITD Portal
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport26QFile} className="gap-1.5 text-xs font-semibold">
                <Download className="w-3.5 h-3.5" /> Export NSDL 26Q File
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleOpenCreateChallan('April 2026', '194C', totals.tds || 48500)} className="gap-1.5 text-xs font-bold">
                <Plus className="w-3.5 h-3.5" /> Create Monthly Challan 281
              </Button>
            </div>
          </div>

          {/* Monthly Challan Summary Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>TAN</TableHead>
                    <TableHead>Section (ITD Code)</TableHead>
                    <TableHead>Minor Head</TableHead>
                    <TableHead className="text-right">Base TDS</TableHead>
                    <TableHead className="text-right">Interest / Fee</TableHead>
                    <TableHead className="text-right font-bold">Total Challan Amount</TableHead>
                    <TableHead>BSR Code</TableHead>
                    <TableHead>Challan No & Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challan281Records.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold text-xs text-amber-700 dark:text-gold">{c.month}</TableCell>
                      <TableCell className="font-mono text-xs font-bold uppercase">{c.tan}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {c.section_code} ({c.itd_code})
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground">({c.minor_head}) Company</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(c.base_tds)}</TableCell>
                      <TableCell className="text-right font-medium text-muted-foreground tabular-nums">{formatCurrency((c.interest || 0) + (c.fee_234e || 0))}</TableCell>
                      <TableCell className="text-right font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(c.total_challan_amount)}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-foreground">{c.bsr_code || '—'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono font-semibold text-foreground">{c.challan_no}</div>
                        <div className="text-[10px] text-muted-foreground">{formatDate(c.challan_date)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{c.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-card border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Gross Outflow</span>
              <span className="text-lg font-bold text-foreground mt-1 block tabular-nums">{formatCurrency(totals.gross)}</span>
              <span className="text-[10px] text-muted-foreground mt-1 block font-medium">{filteredRecords.length} Taxable Payments</span>
            </Card>

            <Card className="p-4 bg-card border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total TDS Deducted</span>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-400 mt-1 block tabular-nums">{formatCurrency(totals.tds)}</span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400/80 mt-1 block font-medium">To be deposited with IT Dept</span>
            </Card>

            <Card className="p-4 bg-card border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Form 16A Issued</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1 block tabular-nums">
                {Object.values(form16aRecords).filter(r => r.status === 'Issued').length} / {filteredRecords.length}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-1 block font-medium">Certificates Delivered</span>
            </Card>

            <Card className="p-4 bg-card border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Pending Certificates</span>
              <span className="text-lg font-bold text-amber-700 dark:text-gold mt-1 block tabular-nums">
                {filteredRecords.length - Object.values(form16aRecords).filter(r => r.status === 'Issued').length}
              </span>
              <span className="text-[10px] text-amber-700 dark:text-gold/80 mt-1 block font-medium">Awaiting TRACES Upload</span>
            </Card>
          </div>

          {/* Filter Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="w-32">
                <Select value={selectedFy} onChange={e => setSelectedFy(e.target.value)} className="h-9 text-xs">
                  <option value="2026-27">FY 2026-27</option>
                  <option value="2025-26">FY 2025-26</option>
                </Select>
              </div>

              <div className="flex items-center bg-muted p-1 rounded-lg border border-border text-xs font-semibold">
                {['ALL', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSelectedQuarter(q)}
                    className={`px-3 py-1 rounded-md transition-colors ${selectedQuarter === q ? 'bg-amber-600 text-white dark:bg-gold dark:text-slate-950 font-bold shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {q === 'ALL' ? 'All Quarters' : q}
                  </button>
                ))}
              </div>

              <div className="w-36">
                <Select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="h-9 text-xs">
                  <option value="ALL">All TDS Sections</option>
                  <option value="194C">194C (Contractors)</option>
                  <option value="194J">194J (Professional)</option>
                  <option value="194H">194H (Commission)</option>
                  <option value="194I">194I (Rent)</option>
                </Select>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search vendor or PAN..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* TDS Deductions Table */}
          <Card>
            <CardContent className="p-0">
              {filteredRecords.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm font-medium">
                  No TDS deductions recorded for the selected quarter/filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quarter</TableHead>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>PAN</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead className="text-right">Gross Amount</TableHead>
                      <TableHead className="text-right">TDS Amount</TableHead>
                      <TableHead>Remittance Date</TableHead>
                      <TableHead>Form 16A Status</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((r, idx) => {
                      const rec = form16aRecords[r.id] || { status: 'Pending Upload', refNo: '' };
                      const isIssued = rec.status === 'Issued';
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-bold text-xs text-amber-700 dark:text-gold">{r.quarter}</TableCell>
                          <TableCell className="font-bold text-foreground text-sm">{r.vendor_name}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{r.vendor_pan}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {r.tds_section} ({r.tds_rate}%)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground tabular-nums">{formatCurrency(r.gross_amount)}</TableCell>
                          <TableCell className="text-right font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(r.tds_amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">{formatDate(r.remittance_date)}</TableCell>
                          <TableCell>
                            <Badge variant={isIssued ? 'success' : 'pending'}>
                              {rec.status}
                            </Badge>
                            {rec.refNo && (
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                Ref: {rec.refNo}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {!isIssued ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const refNo = prompt('Enter Form 16A Certificate Reference Number:', `F16A-${Date.now().toString().slice(-6)}`);
                                  if (refNo) handleUpdateForm16A(r.id, 'Issued', refNo);
                                }}
                                className="text-[11px] h-7 px-2 font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              >
                                Mark Issued
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateForm16A(r.id, 'Pending Upload', '')}
                                className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                              >
                                Reset
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TDS Challan 281 Modal */}
      <TDSChallan281Modal
        modalOpen={challanModalOpen}
        setModalOpen={setChallanModalOpen}
        monthData={selectedMonthData}
        onSaveChallan={handleSaveChallan}
      />
    </div>
  );
}
