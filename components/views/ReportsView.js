'use client';

import { toast } from '../ui/Toast';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../ui/core';
import { FileText, Download, Calendar, Loader2, Mail } from 'lucide-react';
import { cn } from '../../app/lib/utils';
import { isSuperAdmin } from '../../app/lib/config';

import TDSTrackerSection from './reports/TDSTrackerSection';

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
  const { call, user, vendors, projects, payments, refreshData } = useAppState();
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

  // P3-3: Fetch report data when filter or type changes — delegates to loadReport()
  useEffect(() => {
    loadReport();
  }, [loadReport]);

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
      csvContent += "Project,Total Gross,Total TDS,Entries\n";
      pData.forEach(p => {
        csvContent += `"${p.project_id}",${p.total_gross},${p.total_tds},${p.entries?.length || 0}\n`;
      });
    } else if (reportType === 'Approval_Audit' || reportType === 'Day_Wise') {
      const rows = data.audit || data.days || [];
      csvContent += "Date/User,Action,Details,ID\n";
      rows.forEach(r => {
        csvContent += `"${r.user || r.date || ''}","${r.action || r.count || ''}","${r.details || ''}","${r.id || ''}"\n`;
      });
    } else {
      const rows = data.rows || data.payments || [];
      csvContent += "ID,PO No,Project,Vendor,Amount,Status,Stage,Created At\n";
      rows.forEach(r => {
        csvContent += `"${r.id}","${r.po_no}","${r.project}","${r.vendor_name}",${r.net_amount},"${r.status}","${r.approval_stage}","${r.created_at}"\n`;
      });
    }

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendPaymentAdvice = async (paymentId, mode = 'email') => {
    setSendingAdviceId(paymentId);
    try {
      // Find the payment request object
      const paymentObj = (data?.rows || data?.payments || []).find(r => (r.id || r.pr_id) === paymentId);
      const matchedVendor = findVendorForPayment(paymentObj, vendors);
      const vendorEmail = matchedVendor?.email || paymentObj?.vendor_email || '';

      if (!vendorEmail) {
        setAdviceModalPaymentId(paymentId);
        setAdviceContactSource('missing');
        setAdviceEmailInput('');
        setAdviceModalOpen(true);
        return;
      }

      setAdviceModalPaymentId(paymentId);
      setAdviceContactSource('vendor_master');
      setAdviceEmailInput(vendorEmail);
      setAdviceModalOpen(true);
    } catch (err) {
      toast.error('Failed to send payment advice: ' + err.message);
    } finally {
      setSendingAdviceId(null);
    }
  };

  const [adviceModalOpen, setAdviceModalOpen] = useState(false);
  const [adviceModalPaymentId, setAdviceModalPaymentId] = useState(null);
  const [adviceEmailInput, setAdviceEmailInput] = useState('');
  const [adviceContactSource, setAdviceContactSource] = useState('vendor_master'); // 'vendor_master' | 'missing'

  const handleConfirmSendAdvice = async () => {
    if (!adviceEmailInput || !adviceEmailInput.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSubmittingAdvice(true);
    try {
      const res = await call('sendPaymentAdvice', adviceModalPaymentId, 'email', adviceEmailInput.trim());
      if (res && res.ok) {
        toast.success(res.message || 'Payment advice sent successfully!');
        setAdviceModalOpen(false);
      } else {
        toast.error(res?.error || 'Failed to send advice');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send advice');
    } finally {
      setSubmittingAdvice(false);
    }
  };
  const [submittingAdvice, setSubmittingAdvice] = useState(false);

  const handleOpenRemitModal = (payment) => {
    setSelectedRemitPayment(payment);
    setUtr('');
    setRemitModalOpen(true);
  };

  const handleRemitSubmit = async (e) => {
    e.preventDefault();
    if (!utr || !utr.trim()) {
      toast.error('UTR / Reference Number is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await call('remitPaymentRequest', selectedRemitPayment.id, utr.trim(), '');
      if (res && res.ok) {
        toast.success('Payment remitted successfully!');
        setRemitModalOpen(false);
        loadReport();
      } else {
        toast.error(res?.error || 'Failed to remit payment');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRemittedPayment = async (payment) => {
    if (!isAdmin) {
      toast.error('Only Admins can delete remitted payments.');
      return;
    }
    if (!confirm(`Are you sure you want to delete payment #${payment.id} for ${payment.vendor_name}? This action is irreversible.`)) {
      return;
    }
    try {
      await call('deleteRemittedPayment', payment.id);
      toast.success('Payment deleted successfully');
      loadReport();
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
    { id: 'TDS_Quarter_Tracker', label: 'TDS Form 16A Tracker' },
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

      {reportType === 'TDS_Quarter_Tracker' ? (
        <TDSTrackerSection payments={payments || []} vendors={vendors || []} />
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <ReportsTables
              loading={loading} data={data} reportType={reportType}
              isAdmin={isAdmin} isFinance={isFinance} isDirector={isDirector} canRemit={canRemit}
              handleSendPaymentAdvice={handleSendPaymentAdvice} 
              sendingAdviceId={sendingAdviceId}
              handleOpenRemitModal={handleOpenRemitModal} handleDeleteRemittedPayment={handleDeleteRemittedPayment}
            />
          </CardContent>
        </Card>
      )}

      <ReportsRemitModal
        remitModalOpen={remitModalOpen} setRemitModalOpen={setRemitModalOpen}
        selectedRemitPayment={selectedRemitPayment} handleRemitSubmit={handleRemitSubmit}
        utr={utr} setUtr={setUtr} submitting={submitting}
      />

      <Dialog open={adviceModalOpen} onClose={() => setAdviceModalOpen(false)} title="Send Payment Advice">
        <div className="space-y-4">
          <div className="text-sm font-medium text-muted-foreground">
            {adviceContactSource === 'vendor_master'
              ? 'Email pre-filled from Vendor Master. Confirm or update before sending.'
              : 'No email on file for this vendor. Enter an email address below.'}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Vendor Email Address
              {adviceContactSource === 'vendor_master' && (
                <span className="ml-2 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">● From Vendor Master</span>
              )}
            </label>
            <Input
              type="email"
              placeholder="vendor@example.com"
              value={adviceEmailInput}
              onChange={e => setAdviceEmailInput(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setAdviceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmSendAdvice} disabled={submittingAdvice}>
              {submittingAdvice ? 'Sending...' : 'Send via Email'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
