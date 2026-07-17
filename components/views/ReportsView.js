'use client';

import { toast } from '../ui/Toast';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../ui/core';
import { FileText, Download, Calendar, Loader2, Mail } from 'lucide-react';
import { cn } from '../../app/lib/utils';
import { isSuperAdmin } from '../../app/lib/config';

// Helper to format values as Indian Rupees / Lakhs

import ReportsHeader from './reports/ReportsHeader';
import ReportsTables from './reports/ReportsTables';
import ReportsRemitModal from './reports/ReportsRemitModal';

// Bug 1 helper: find a vendor from the Vendor Master that matches this payment
function findVendorForPayment(payment, vendors) {
  if (!payment || !vendors || vendors.length === 0) return null;
  // First try by vendor_code
  if (payment.vendor_code) {
    const v = vendors.find(v =>
      (v.code && v.code === payment.vendor_code) ||
      (v.vendorId && v.vendorId === payment.vendor_code)
    );
    if (v) return v;
  }
  // Fallback: match by name
  const vendorName = payment.vendor || payment.vendor_name;
  if (vendorName) {
    return vendors.find(v =>
      (v.name && v.name.toLowerCase() === vendorName.toLowerCase()) ||
      (v.legalName && v.legalName.toLowerCase() === vendorName.toLowerCase())
    ) || null;
  }
  return null;
}

export default function ReportsView() {
  const { call, user, vendors, projects, refreshData } = useAppState();
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
  const isAdmin = isSuperAdmin(user?.email) || roles.includes('admin');
  const isFinance = roles.includes('finance');
  const isDirector = roles.includes('director');
  const canRemit = isAdmin || isFinance || isDirector;

  // Bug 5: Extract loadReport into a stable useCallback so handlers can call it
  const loadReport = useCallback(async () => {
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
      setData(result);
    } catch (e) {
      console.error('Failed to load report data:', e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [call, reportType, startDate, endDate, vendorFilter, projectFilter]);

  // Fetch report data when filter or type changes
  useEffect(() => {
    let active = true;
    async function fetchReport() {
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

    fetchReport();
    return () => { active = false; };
  }, [reportType, startDate, endDate, vendorFilter, projectFilter, call]);

  // Export to CSV helper
  const handleExport = () => {
    if (!data) return;
    
    let csvContent = "";
    let fileName = `${reportType}_Report.csv`;

    if (reportType === 'TDS_Register') {
      const entries = data.entries || [];
      csvContent += "ID,Date,Project,PO,Vendor,Gross Amount,TDS Amount,TDS %,TDS Section,Govt Status,Deducted At\n";
      entries.forEach(e => {
        const dateStr = e.transaction_date ? new Date(e.transaction_date).toLocaleDateString('en-IN') : '';
        csvContent += `"${e.id}","${dateStr}","${e.project_id}","${e.po_id}","${e.vendor_id}",${e.amount_requested},${e.approved_amount ?? e.gross_amount},${e.tds_amount},${e.tds_percentage},"${e.tds_section}","${e.government_payment_status}","${e.deducted_at || ''}"\n`;
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
      // Bug 3e (CSV): Legacy Payment Reports — now includes UTR column
      const rows = data || [];
      csvContent += "ID,Vendor,Project,PO,Gross Amount,TDS,Net Payment,UTR / Ref No.,Status,Rejected By\n";
      rows.forEach(p => {
        const gross = Number(p.amountRequested || 0);
        const tds = Number(p.tdsAmount || p.tds_amount || 0);
        const net = gross - tds;
        const rejBy = p.rejectedBy ? ({ proc: 'Procurement', finance: 'Finance', director: 'Director' }[p.rejectedBy] || p.rejectedBy) : '—';
        const utrVal = p.remittance_ref || p.utr || '';
        csvContent += `"${p.sNo}","${p.vendor}","${p.project || ''}","${p.poNo || ''}",${gross},${tds},${net},"${utrVal}","${p.stage || ''}","${rejBy}"\n`;
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

  const [adviceModalOpen, setAdviceModalOpen] = useState(false);
  const [adviceTargetId, setAdviceTargetId] = useState(null);
  const [adviceContact, setAdviceContact] = useState('');
  const [adviceContactSource, setAdviceContactSource] = useState(''); // 'vendor_master' | 'empty'

  // Bug 1: Pre-fill vendor email from Vendor Master when opening the modal
  const handleSendPaymentAdvice = async (payment) => {
    setAdviceTargetId(payment.id);
    const vendor = findVendorForPayment(payment, vendors);
    const vendorEmail = vendor?.email || '';
    setAdviceContact(vendorEmail);
    setAdviceContactSource(vendorEmail ? 'vendor_master' : 'empty');
    setAdviceModalOpen(true);
  };

  const handleSendPaymentAdviceWhatsApp = async (payment) => {
    setSendingAdviceId(payment.id);
    try {
      await call('whatsappPaymentAdvice', payment.id);
      toast.success('Payment advice WhatsApp queued successfully');
    } catch (err) {
      toast.error('Failed to send WhatsApp: ' + (err.message || 'Unknown error'));
    } finally {
      setSendingAdviceId(null);
    }
  };

  const executeSendAdvice = async (method) => {
    if (!adviceContact) return toast('Please enter a contact (email or phone).');
    
    setSendingAdviceId(adviceTargetId);
    try {
      if (method === 'email') {
        await call('sendPaymentAdvice', adviceTargetId, adviceContact.trim());
        toast.success(`Payment advice email sent to ${adviceContact.trim()}`);
      } else if (method === 'whatsapp') {
        await call('sendPaymentAdviceWhatsApp', adviceTargetId, adviceContact.trim());
        toast.success(`Payment advice WhatsApp sent to ${adviceContact.trim()}`);
      }
      setAdviceModalOpen(false);
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
      const res = await call('bulkRemitPayments', [selectedRemitPayment.id], {
        utr_ref: utr.trim(),
        remarks: 'Remitted from Reports'
      });
      if (res && !res.ok) {
        throw new Error(res.errors?.[0] || 'Bulk remit failed internally');
      }
      toast.success('Payment remitted successfully.');
      setRemitModalOpen(false);
      // Bug 5: Refresh data in-place — no full page reload
      await loadReport();
      await refreshData();
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
      // Bug 5: Refresh data in-place — no full page reload
      await loadReport();
      await refreshData();
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


  return (
    <div className="space-y-6">
      <ReportsHeader
        handleExport={handleExport} loading={loading} data={data} rTypes={rTypes}
        reportType={reportType} setReportType={setReportType}
        startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}
        vendorFilter={vendorFilter} setVendorFilter={setVendorFilter}
        projectFilter={projectFilter} setProjectFilter={setProjectFilter}
      />

      <Card className="bg-slate-950/40 border-slate-900">
        <CardContent className="p-0">
          <ReportsTables
            loading={loading} data={data} reportType={reportType}
            isAdmin={isAdmin} isFinance={isFinance} isDirector={isDirector} canRemit={canRemit}
            handleSendPaymentAdvice={handleSendPaymentAdvice} 
            handleSendPaymentAdviceWhatsApp={handleSendPaymentAdviceWhatsApp}
            sendingAdviceId={sendingAdviceId}
            handleOpenRemitModal={handleOpenRemitModal} handleDeleteRemittedPayment={handleDeleteRemittedPayment}
          />
        </CardContent>
      </Card>

      <ReportsRemitModal
        remitModalOpen={remitModalOpen} setRemitModalOpen={setRemitModalOpen}
        selectedRemitPayment={selectedRemitPayment} handleRemitSubmit={handleRemitSubmit}
        utr={utr} setUtr={setUtr} submitting={submitting}
      />

      <Dialog open={adviceModalOpen} onClose={() => setAdviceModalOpen(false)} title="Send Payment Advice">
        <div className="space-y-4">
          <div className="text-sm text-slate-400">
            {adviceContactSource === 'vendor_master'
              ? 'Email pre-filled from Vendor Master. Confirm or update before sending.'
              : 'No email on file for this vendor. Enter an email address or WhatsApp number (with country code, e.g. 919876543210).'}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-light">
              Contact Detail
              {adviceContactSource === 'vendor_master' && (
                <span className="ml-2 text-emerald-400 text-[10px] font-medium">● From Vendor Master</span>
              )}
            </label>
            <Input
              type="text"
              placeholder="Email or Phone Number"
              value={adviceContact}
              onChange={e => setAdviceContact(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
            <Button variant="ghost" onClick={() => setAdviceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => executeSendAdvice('whatsapp')} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={sendingAdviceId !== null}>
              {sendingAdviceId === adviceTargetId ? 'Sending...' : 'Send via WhatsApp'}
            </Button>
            <Button variant="primary" onClick={() => executeSendAdvice('email')} disabled={sendingAdviceId !== null}>
              {sendingAdviceId === adviceTargetId ? 'Sending...' : 'Send via Email'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
