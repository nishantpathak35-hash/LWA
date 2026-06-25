'use client';

import { toast } from '../ui/Toast';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../ui/core';
import { FileText, Download, Calendar, Loader2, Mail } from 'lucide-react';
import { cn } from '../../app/lib/utils';

// Helper to format values as Indian Rupees / Lakhs
function fmtRupees(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function fmtLakhs(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00 L';
  const lakhs = Number(amount) / 100000;
  return lakhs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L';
}

function stageBadge(stage) {
  const s = String(stage || '').toLowerCase();
  if (s === 'remitted') return <Badge variant="remitted">Remitted</Badge>;
  if (s === 'rejected') return <Badge variant="rejected">Rejected</Badge>;
  if (s === 'approved') return <Badge variant="success">Approved</Badge>;
  if (s === 'pending') return <Badge variant="pending">Pending</Badge>;
  return <Badge variant="default">{stage}</Badge>;
}

function wfSteps(p) {
  // Show workflow indicators (e.g. P F D)
  const steps = [];
  const roles = p.stageRoles || [];
  const current = String(p.stage || '').toLowerCase();

  const isProc = roles.includes('proc');
  const isFin = roles.includes('finance');
  const isDir = roles.includes('director');

  return (
    <div className="flex gap-1">
      <span className={cn("text-[10px] px-1 rounded border", isProc ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-slate-800 text-slate-600")}>P</span>
      <span className={cn("text-[10px] px-1 rounded border", isFin ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-slate-800 text-slate-600")}>F</span>
      <span className={cn("text-[10px] px-1 rounded border", isDir ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-slate-800 text-slate-600")}>D</span>
    </div>
  );
}

export default function ReportsView() {
  const { call, user, vendors, projects } = useAppState();
  const [reportType, setReportType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingAdviceId, setSendingAdviceId] = useState(null);

  const [remitModalOpen, setRemitModalOpen] = useState(false);
  const [selectedRemitPayment, setSelectedRemitPayment] = useState(null);
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roles = user?.roles || [];
  const isAdmin = user?.email === 'admin@luxeworx.com' || roles.includes('admin');
  const isFinance = roles.includes('finance');
  const isDirector = roles.includes('director');
  const canRemit = isAdmin || isFinance || isDirector;

  // Fetch report data when filter or type changes
  useEffect(() => {
    let active = true;
    async function loadReport() {
      setLoading(true);
      try {
        let result = null;
        if (reportType === 'TDS_Register') {
          result = await call('getTDSRegisterReport', startDate, endDate);
        } else if (reportType === 'Vendor_TDS') {
          result = await call('getVendorTDSReport', startDate, endDate);
        } else if (reportType === 'Project_TDS') {
          result = await call('getProjectTDSReport', startDate, endDate);
        } else if (reportType === 'Approval_Audit') {
          result = await call('getApprovalAuditReport', startDate, endDate);
        } else if (reportType === 'Day_Wise') {
          result = await call('getDayWiseApprovalReport', startDate, endDate);
        } else if (['All', 'Approved', 'Rejected', 'Remit', 'Remitted'].includes(reportType)) {
          result = await call('getPaymentReportRows', {
            type: reportType,
            vendor: vendorFilter,
            project: projectFilter,
            limit: 300
          });
        }
        
        if (active) {
          setData(result);
        }
      } catch (e) {
        console.error('Failed to load report data:', e);
        if (active) {
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReport();
    return () => { active = false; };
  }, [reportType, startDate, endDate, vendorFilter, projectFilter, call]);

  // Export to CSV helper
  const handleExport = () => {
    if (!data) return;
    
    let csvContent = "";
    let fileName = `${reportType}_Report.csv`;

    if (reportType === 'TDS_Register') {
      const entries = data.entries || [];
      csvContent += "ID,Project,PO,Vendor,Gross Amount,TDS Amount,TDS %,TDS Section,Govt Status,Deducted At\n";
      entries.forEach(e => {
        csvContent += `"${e.id}","${e.project_id}","${e.po_id}","${e.vendor_id}",${e.amount_requested},${e.approved_amount ?? e.gross_amount},${e.tds_amount},${e.tds_percentage},"${e.tds_section}","${e.government_payment_status}","${e.deducted_at || ''}"\n`;
      });
    } else if (reportType === 'Vendor_TDS') {
      const vData = data.vendors || [];
      csvContent += "Vendor,Total Gross,Total TDS,Total Paid,Total Pending,Entries\n";
      vData.forEach(v => {
        csvContent += `"${v.vendor_id}",${v.total_gross},${v.total_tds},${v.total_paid},${v.total_pending},${v.entries?.length || 0}\n`;
      });
    } else if (reportType === 'Project_TDS') {
      const pData = data.projects || [];
      csvContent += "Project,Total Gross,Total TDS,Total Paid,Total Pending,Entries\n";
      pData.forEach(p => {
        csvContent += `"${p.project_id}",${p.total_gross},${p.total_tds},${p.total_paid},${p.total_pending},${p.entries?.length || 0}\n`;
      });
    } else if (reportType === 'Approval_Audit') {
      const entries = data.entries || [];
      csvContent += "Timestamp,Action,Performed By,Project,Vendor,Gross Amount,TDS,Net,Override\n";
      entries.forEach(e => {
        csvContent += `"${e.timestamp}","${e.action}","${e.performed_by}","${e.project_id}","${e.vendor_id}",${e.amount_requested},${e.approved_amount ?? e.gross_amount},${e.tds_amount},${e.net_amount},"${e.override_flag ? 'Yes' : 'No'}"\n`;
      });
    } else if (reportType === 'Day_Wise') {
      const dates = data.dates || [];
      csvContent += "Date,S.No,Vendor,Project,PO,Gross,TDS,Net,Approved By,Bank Ref\n";
      dates.forEach(d => {
        d.entries.forEach(e => {
          csvContent += `"${d.displayDate}","${e.sNo}","${e.vendor}","${e.project}","${e.poNo}",${e.grossAmount},${e.tdsAmount},${e.netAmount},"${e.approvedBy}","${e.bankRef}"\n`;
        });
      });
    } else {
      // Legacy Payment Reports
      const rows = data || [];
      csvContent += "ID,Vendor,Project,PO,Gross Amount,TDS,Net Payment,Status,Rejected By\n";
      rows.forEach(p => {
        const gross = Number(p.amountRequested || 0);
        const tds = Number(p.tdsAmount || p.tds_amount || 0);
        const net = gross - tds;
        const rejBy = p.rejectedBy ? ({ proc: 'Procurement', finance: 'Finance', director: 'Director' }[p.rejectedBy] || p.rejectedBy) : '—';
        csvContent += `"${p.sNo}","${p.vendor}","${p.project || ''}","${p.poNo || ''}",${gross},${tds},${net},"${p.stage || ''}","${rejBy}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    styleLinkAndClick(link);
  };

  const styleLinkAndClick = (link) => {
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendPaymentAdvice = async (payment) => {
    const vendor = vendors.find(v => v.code === payment?.vendor_code || v.name === payment?.vendor_name || v.name === payment?.vendor);
    const defaultEmail = vendor?.email || '';
    const email = prompt("Enter vendor's email address to send payment advice:", defaultEmail);
    if (email === null) return;
    if (!email.trim()) {
      toast.error('Email address is required.');
      return;
    }

    setSendingAdviceId(payment.id);
    try {
      await call('sendPaymentAdvice', payment.id, email.trim());
      toast.success('Payment advice email has been sent successfully to ' + email.trim() + '.');
    } catch (err) {
      toast.error('Failed to send payment advice: ' + (err.message || 'Unknown error'));
    } finally {
      setSendingAdviceId(null);
    }
  };

  const handleOpenRemitModal = (payment) => {
    setSelectedRemitPayment(payment);
    setUtr('');
    setRemitModalOpen(true);
  };

  const handleRemitSubmit = async (e) => {
    e.preventDefault();
    if (!utr.trim()) {
      toast.error('UTR / Reference number is required for remittance.');
      return;
    }
    setSubmitting(true);
    try {
      await call('remitPaymentRequest', selectedRemitPayment.id, {
        utr: utr.trim(),
        comment: 'Remitted from Reports'
      });
      toast.success('Payment remitted successfully.');
      setRemitModalOpen(false);
      // Trigger a reload by toggling a state or reloading data
      if (reportType) {
        setReportType(prev => prev);
        // We can just rely on the effect reacting to reportType changes if we force it, 
        // but it might not. We can just call loadReport manually but it's defined inside useEffect.
        // Easiest is to just do a soft reload of window or trigger a re-render
        window.location.reload();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRemittedPayment = async (payment) => {
    const reason = prompt(`WARNING: You are about to permanently delete remitted payment #${payment.id}.\nThis will also update the PO ledger.\n\nEnter reason for deletion:`);
    if (!reason) return;
    if (reason.trim().length < 5) {
      toast.error('A detailed reason (at least 5 characters) is required for audit logging.');
      return;
    }
    try {
      await call('deleteRemittedPayment', payment.id, reason.trim());
      toast.success('Remitted payment deleted successfully.');
      window.location.reload();
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  const rTypes = [
    { id: 'All', label: 'All' },
    { id: 'Approved', label: 'Approved' },
    { id: 'Rejected', label: 'Rejected' },
    { id: 'Remit', label: 'Remit' },
    { id: 'Remitted', label: 'Remitted' },
    { id: 'Day_Wise', label: 'Day-Wise Approval' },
    { id: 'TDS_Register', label: 'TDS Register' },
    { id: 'Vendor_TDS', label: 'Vendor TDS' },
    { id: 'Project_TDS', label: 'Project TDS' },
    { id: 'Approval_Audit', label: 'Approval Audit' }
  ];

  const renderActiveReport = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
          <span className="text-sm font-light">Loading report data...</span>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="text-center py-12 text-slate-500">
          No data available or error loading report.
        </div>
      );
    }

    if (reportType === 'TDS_Register') {
      const entries = data.entries || [];
      const summary = data.summary || {};
      const summaryKeys = Object.keys(summary);

      return (
        <div className="space-y-6">
          <Table id="tblReports">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>PO</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Req. Amount</TableHead>
                <TableHead className="text-right">App. Amount</TableHead>
                <TableHead className="text-right font-semibold text-violet-400">TDS Amount</TableHead>
                <TableHead className="text-right">TDS %</TableHead>
                <TableHead>TDS Section</TableHead>
                <TableHead>Govt Status</TableHead>
                <TableHead>Deducted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length > 0 ? (
                entries.map((e, idx) => (
                  <TableRow key={e.id || idx}>
                    <TableCell className="font-semibold text-gold">{e.id}</TableCell>
                    <TableCell>{e.project_id}</TableCell>
                    <TableCell className="font-mono text-xs">{e.po_id}</TableCell>
                    <TableCell>{e.vendor_id}</TableCell>
                    <TableCell className="text-right text-slate-400 line-through">{fmtLakhs(e.amount_requested)}</TableCell>
                    <TableCell className="text-right text-emerald-400">{fmtLakhs(e.approved_amount ?? e.gross_amount)}</TableCell>
                    <TableCell className="text-right text-violet-400 font-medium">{fmtLakhs(e.tds_amount)}</TableCell>
                    <TableCell className="text-right">{Number(e.tds_percentage || 0).toFixed(1)}%</TableCell>
                    <TableCell><Badge variant="default">{e.tds_section}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={e.government_payment_status === 'paid' ? 'success' : 'warning'}>
                        {e.government_payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {e.deducted_at ? new Date(e.deducted_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                    No TDS deductions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {summaryKeys.length > 0 && (
            <Card className="bg-slate-950/40 border-slate-900">
              <CardHeader>
                <CardTitle className="text-gold font-medium">TDS Summary by Section</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {summaryKeys.map(sec => {
                  const s = summary[sec];
                  return (
                    <div key={sec} className="p-4 rounded-lg bg-slate-900/30 border border-slate-900 space-y-2">
                      <div className="font-bold text-slate-200">{s.section}</div>
                      <div className="text-xs text-slate-400">Count: <span className="text-slate-200">{s.count}</span></div>
                      <div className="text-xs text-slate-400">Total TDS: <span className="text-violet-400 font-medium">{fmtLakhs(s.total_tds)}</span></div>
                      <div className="text-xs text-slate-400">Paid: <span className="text-emerald-400">{fmtLakhs(s.paid)}</span></div>
                      <div className="text-xs text-slate-400">Pending: <span className="text-amber-400">{fmtLakhs(s.pending)}</span></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    if (reportType === 'Vendor_TDS') {
      const vData = data.vendors || [];
      return (
        <Table id="tblReports">
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Total Gross</TableHead>
              <TableHead className="text-right font-semibold text-violet-400">Total TDS</TableHead>
              <TableHead className="text-right text-emerald-400">Total Paid</TableHead>
              <TableHead className="text-right text-amber-400">Total Pending</TableHead>
              <TableHead className="text-right">Entries</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vData.length > 0 ? (
              vData.map((v, idx) => (
                <TableRow key={v.vendor_id || idx}>
                  <TableCell className="font-semibold text-slate-200">{v.vendor_id}</TableCell>
                  <TableCell className="text-right">{fmtLakhs(v.total_gross)}</TableCell>
                  <TableCell className="text-right text-violet-400 font-medium">{fmtLakhs(v.total_tds)}</TableCell>
                  <TableCell className="text-right text-emerald-400 font-medium">{fmtLakhs(v.total_paid)}</TableCell>
                  <TableCell className="text-right text-amber-400 font-medium">{fmtLakhs(v.total_pending)}</TableCell>
                  <TableCell className="text-right">{v.entries?.length || 0}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                  No Vendor TDS data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }

    if (reportType === 'Project_TDS') {
      const pData = data.projects || [];
      return (
        <Table id="tblReports">
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Total Gross</TableHead>
              <TableHead className="text-right font-semibold text-violet-400">Total TDS</TableHead>
              <TableHead className="text-right text-emerald-400">Total Paid</TableHead>
              <TableHead className="text-right text-amber-400">Total Pending</TableHead>
              <TableHead className="text-right">Entries</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pData.length > 0 ? (
              pData.map((p, idx) => (
                <TableRow key={p.project_id || idx}>
                  <TableCell className="font-semibold text-slate-200">{p.project_id}</TableCell>
                  <TableCell className="text-right">{fmtLakhs(p.total_gross)}</TableCell>
                  <TableCell className="text-right text-violet-400 font-medium">{fmtLakhs(p.total_tds)}</TableCell>
                  <TableCell className="text-right text-emerald-400 font-medium">{fmtLakhs(p.total_paid)}</TableCell>
                  <TableCell className="text-right text-amber-400 font-medium">{fmtLakhs(p.total_pending)}</TableCell>
                  <TableCell className="text-right">{p.entries?.length || 0}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                  No Project TDS data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }

    if (reportType === 'Approval_Audit') {
      const entries = data.entries || [];
      return (
        <Table id="tblReports">
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Req. Amount</TableHead>
              <TableHead className="text-right">App. Amount</TableHead>
              <TableHead className="text-right text-violet-400">TDS</TableHead>
              <TableHead className="text-right text-emerald-400">Net</TableHead>
              <TableHead>Override</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length > 0 ? (
              entries.map((e, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs text-slate-400">
                    {e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    {e.action === 'approve' ? (
                      <Badge variant="success">Approved</Badge>
                    ) : e.action === 'reject' ? (
                      <Badge variant="rejected">Rejected</Badge>
                    ) : (
                      <Badge variant="default">{e.action}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{e.performed_by}</TableCell>
                  <TableCell>{e.project_id}</TableCell>
                  <TableCell>{e.vendor_id}</TableCell>
                  <TableCell className="text-right text-slate-400 line-through">{fmtLakhs(e.amount_requested)}</TableCell>
                  <TableCell className="text-right text-emerald-400">{fmtLakhs(e.approved_amount ?? e.gross_amount)}</TableCell>
                  <TableCell className="text-right text-violet-400">{fmtLakhs(e.tds_amount)}</TableCell>
                  <TableCell className="text-right text-emerald-400 font-semibold">{fmtLakhs(e.net_amount)}</TableCell>
                  <TableCell>{e.override_flag ? <Badge variant="warning">Yes</Badge> : '—'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                  No audit entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }

    if (reportType === 'Day_Wise') {
      const dates = data.dates || [];
      const summary = data.summary || { total_count: 0, total_gross: 0, total_tds: 0, total_net: 0 };
      
      return (
        <div className="space-y-6">
          <Card className="bg-slate-950/40 border-slate-900">
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Total Approved</div>
                <div className="text-2xl font-semibold text-slate-200">{summary.total_count}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Total Gross</div>
                <div className="text-2xl font-semibold text-slate-200">{fmtRupees(summary.total_gross)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Total TDS</div>
                <div className="text-2xl font-semibold text-violet-400">{fmtRupees(summary.total_tds)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Total Net Payable</div>
                <div className="text-2xl font-semibold text-emerald-400">{fmtRupees(summary.total_net)}</div>
              </div>
            </CardContent>
          </Card>

          {dates.length > 0 ? (
            dates.map((day, idx) => (
              <div key={idx} className="space-y-0 rounded-lg overflow-hidden border border-slate-900 bg-slate-950/40">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-900/40 border-b border-slate-900 gap-2">
                  <div className="font-semibold text-gold text-sm">{day.displayDate}</div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-slate-400">{day.count} entries</span>
                    <span className="text-slate-350">Gross: {fmtRupees(day.gross)}</span>
                    <span className="text-violet-400">TDS: {fmtRupees(day.tds)}</span>
                    <span className="text-emerald-400">Net: {fmtRupees(day.net)}</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>PO</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right text-violet-400">TDS</TableHead>
                      <TableHead className="text-right text-emerald-400">Net</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Bank Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {day.entries.map((e, eIdx) => (
                      <TableRow key={e.sNo || eIdx}>
                        <TableCell className="font-semibold text-gold text-xs">{e.sNo}</TableCell>
                        <TableCell>{e.vendor}</TableCell>
                        <TableCell className="text-slate-400">{e.project}</TableCell>
                        <TableCell className="font-mono text-xs">{e.poNo}</TableCell>
                        <TableCell className="text-right">{fmtRupees(e.grossAmount)}</TableCell>
                        <TableCell className="text-right text-violet-400">{fmtRupees(e.tdsAmount)}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-semibold">{fmtRupees(e.netAmount)}</TableCell>
                        <TableCell className="text-xs">{e.approvedBy}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{e.bankRef}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-500">
              No approved payments found in this range.
            </div>
          )}
        </div>
      );
    }

    // Legacy payment reports
    const rows = data || [];
    return (
      <Table id="tblReports">
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>PO</TableHead>
            <TableHead className="text-right">Gross Amount</TableHead>
            <TableHead className="text-right text-violet-400">TDS</TableHead>
            <TableHead className="text-right text-emerald-400 font-semibold">Net Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Workflow</TableHead>
            <TableHead>Rejected By</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((p, idx) => {
              const gross = Number(p.amountRequested || 0);
              const tds = Number(p.tdsAmount || p.tds_amount || 0);
              const net = gross - tds;
              const rejBy = p.rejectedBy ? ({ proc: 'Procurement', finance: 'Finance', director: 'Director' }[p.rejectedBy] || p.rejectedBy) : '—';
              
              const canSendAdvice = p.can_send_payment_advice || String(p.stage || '').toLowerCase() === 'remitted' || String(p.remittance || '').toLowerCase() === 'remitted';

              return (
                <TableRow key={p.rowNumber || idx}>
                  <TableCell className="font-semibold text-gold">{p.sNo}</TableCell>
                  <TableCell className="font-semibold text-slate-200">{p.vendor}</TableCell>
                  <TableCell>{p.project || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{p.poNo || '—'}</TableCell>
                  <TableCell className="text-right">{fmtRupees(gross)}</TableCell>
                  <TableCell className="text-right text-violet-400">{fmtRupees(tds)}</TableCell>
                  <TableCell className="text-right text-emerald-400 font-semibold">{fmtRupees(net)}</TableCell>
                  <TableCell>{stageBadge(p.stage)}</TableCell>
                  <TableCell>{wfSteps(p)}</TableCell>
                  <TableCell className={p.rejectedBy ? 'text-red-400' : 'text-slate-550'}>{rejBy}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canRemit && (String(p.stage || '').toLowerCase() === 'approved' || String(p.stage || '').toLowerCase().includes('remit')) && !String(p.stage || '').toLowerCase().includes('remitted') && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-7 text-[10px] px-2"
                          onClick={() => handleOpenRemitModal(p)}
                        >
                          Remit
                        </Button>
                      )}
                      {canSendAdvice && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSendPaymentAdvice(p)}
                          title="Send Payment Advice Email"
                          disabled={sendingAdviceId === p.id}
                          className="text-gold hover:text-gold/80"
                        >
                          {sendingAdviceId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                      {(isAdmin || isDirector) && String(p.stage || '').toLowerCase() === 'remitted' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 text-[10px] px-2"
                          onClick={() => handleDeleteRemittedPayment(p)}
                          title="Delete Remitted Payment"
                        >
                          Delete
                        </Button>
                      )}
                      {!canSendAdvice && !(canRemit && (String(p.stage || '').toLowerCase() === 'approved' || String(p.stage || '').toLowerCase().includes('remit')) && !String(p.stage || '').toLowerCase().includes('remitted')) && !((isAdmin || isDirector) && String(p.stage || '').toLowerCase() === 'remitted') && (
                        <span className="text-slate-700">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-10 text-slate-500">
                No items match your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-slate-100 flex items-center gap-2.5 font-serif">
            <FileText className="w-5 h-5 text-gold" />
            Financial Reports & Analytics
          </h2>
          <p className="text-xs font-light text-slate-400 mt-1">
            Real-time tax registers, day-wise payment audit ledgers and status registers.
          </p>
        </div>
        <Button onClick={handleExport} size="sm" variant="primary" disabled={loading || !data}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Filter and Tab Options */}
      <Card className="bg-slate-950/40 border-slate-900">
        <CardContent className="space-y-5">
          {/* Quick Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-900 pb-4">
            {rTypes.map(t => (
              <Button
                key={t.id}
                onClick={() => setReportType(t.id)}
                size="sm"
                variant={reportType === t.id ? 'primary' : 'ghost'}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {/* Contextual Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-gold" /> Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-gold" /> End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            {/* Custom filters for payment lists */}
            {['All', 'Approved', 'Rejected', 'Remit', 'Remitted'].includes(reportType) && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-light">Vendor Search</label>
                  <Input
                    placeholder="Search vendor..."
                    value={vendorFilter}
                    onChange={e => setVendorFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-light">Project Search</label>
                  <Input
                    placeholder="Search project..."
                    value={projectFilter}
                    onChange={e => setProjectFilter(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-950/40 border-slate-900">
        <CardContent className="p-0">
          {renderActiveReport()}
        </CardContent>
      </Card>

      <Dialog open={remitModalOpen} onClose={() => setRemitModalOpen(false)} title={`Remit Payment #${selectedRemitPayment?.id}`}>
        <form onSubmit={handleRemitSubmit} className="space-y-4">
          <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-4">
            <span className="text-[10px] font-semibold text-gold tracking-wider uppercase block">Remittance Details</span>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">UTR / REF TRANSACTION NUMBER</label>
              <Input
                type="text"
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Enter bank UTR or reference"
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-900/60">
              <span>Vendor:</span>
              <span className="text-slate-200">{selectedRemitPayment?.vendor}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Net Amount:</span>
              <span className="text-emerald-400 font-semibold">
                {fmtRupees(Number(selectedRemitPayment?.amountRequested || 0) - Number(selectedRemitPayment?.tdsAmount || selectedRemitPayment?.tds_amount || 0))}
              </span>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setRemitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm Remittance'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
