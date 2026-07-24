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
import ReportsEditPaymentModal from './reports/ReportsEditPaymentModal';

function findVendorForPayment(payment, vendors) {
  if (!payment || !vendors || vendors.length === 0) return null;
  
  // 1. Try match by vendor_code / vendor_id / vendorId
  const pCode = payment.vendor_code || payment.vendor_id || payment.vendor_key || payment.vendorId;
  if (pCode) {
    const v = vendors.find(v =>
      (v.code && String(v.code).toLowerCase() === String(pCode).toLowerCase()) ||
      (v.vendorId && String(v.vendorId).toLowerCase() === String(pCode).toLowerCase()) ||
      (v.id && String(v.id).toLowerCase() === String(pCode).toLowerCase())
    );
    if (v) return v;
  }
  
  // 2. Try match by vendor name
  const vendorName = payment.vendor_name || payment.vendor;
  if (vendorName) {
    const norm = String(vendorName).trim().toLowerCase();
    return vendors.find(v =>
      (v.name && String(v.name).trim().toLowerCase() === norm) ||
      (v.legalName && String(v.legalName).trim().toLowerCase() === norm) ||
      (v.legal_name && String(v.legal_name).trim().toLowerCase() === norm) ||
      (v.tradeName && String(v.tradeName).trim().toLowerCase() === norm) ||
      (v.trade_name && String(v.trade_name).trim().toLowerCase() === norm) ||
      (v.name && String(v.name).trim().toLowerCase().includes(norm)) ||
      (v.name && norm.includes(String(v.name).trim().toLowerCase()))
    ) || null;
  }
  return null;
}

export default function ReportsView() {
  const { call, user, vendors, projects, payments, tdsSections, refreshData } = useAppState();
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

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const handleOpenEditModal = (payment) => {
    setEditingPayment(payment);
    setEditModalOpen(true);
  };

  const handleSaveEditedPayment = async (payload) => {
    setSubmittingEdit(true);
    try {
      const res = await call('updatePaymentRequest', payload.id, payload);
      if (res && (res.ok || res.status === 'OK')) {
        toast.success(`Payment #${payload.id} updated successfully.`);
        setEditModalOpen(false);
        loadReport();
        await refreshData();
      } else {
        toast.error(res?.error || 'Failed to update payment');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update payment');
    } finally {
      setSubmittingEdit(false);
    }
  };

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
          startDate,
          endDate,
          limit: 0
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

    const helperCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    if (reportType === 'TDS_Register') {
      const entries = data.entries || [];
      csvContent += "ID,Date,Project,PO,Vendor,Gross Amount,TDS Amount,TDS %,TDS Section,Govt Status,Deducted At\n";
      entries.forEach(e => {
        const dateStr = e.transaction_date ? new Date(e.transaction_date).toLocaleDateString('en-IN') : '';
        csvContent += [
          helperCsvCell(e.id),
          helperCsvCell(dateStr),
          helperCsvCell(e.project_id),
          helperCsvCell(e.po_id),
          helperCsvCell(e.vendor_id),
          e.gross_amount ?? e.amount_requested ?? 0,
          e.tds_amount ?? 0,
          e.tds_percentage ?? 0,
          helperCsvCell(e.tds_section),
          helperCsvCell(e.government_payment_status),
          helperCsvCell(e.deducted_at || '')
        ].join(',') + '\n';
      });
    } else if (reportType === 'Vendor_TDS') {
      const vData = data.vendors || [];
      csvContent += "Vendor,Total Gross,Total TDS,Total Paid,Total Pending,Entries\n";
      vData.forEach(v => {
        csvContent += [
          helperCsvCell(v.vendor_id),
          v.total_gross || 0,
          v.total_tds || 0,
          v.total_paid || 0,
          v.total_pending || 0,
          v.entries?.length || 0
        ].join(',') + '\n';
      });
    } else if (reportType === 'Project_TDS') {
      const pData = data.projects || [];
      csvContent += "Project,Total Gross,Total TDS,Entries\n";
      pData.forEach(p => {
        csvContent += [
          helperCsvCell(p.project_id),
          p.total_gross || 0,
          p.total_tds || 0,
          p.entries?.length || 0
        ].join(',') + '\n';
      });
    } else if (reportType === 'Approval_Audit') {
      const rows = data.entries || data.audit || [];
      csvContent += "Timestamp,Action,Performed By,Project,Vendor,Gross Amount,TDS Amount,Net Amount\n";
      rows.forEach(r => {
        csvContent += [
          helperCsvCell(r.timestamp || ''),
          helperCsvCell(r.action || ''),
          helperCsvCell(r.performed_by || ''),
          helperCsvCell(r.project_id || ''),
          helperCsvCell(r.vendor_id || ''),
          r.gross_amount || 0,
          r.tds_amount || 0,
          r.net_amount || 0
        ].join(',') + '\n';
      });
    } else if (reportType === 'Day_Wise') {
      const rows = data.days || [];
      csvContent += "Date,Approved Count,Total Gross,Total TDS,Total Net\n";
      rows.forEach(r => {
        csvContent += [
          helperCsvCell(r.date || ''),
          r.count || 0,
          r.total_gross || 0,
          r.total_tds || 0,
          r.total_net || 0
        ].join(',') + '\n';
      });
    } else {
      const rows = Array.isArray(data) ? data : (data.rows || data.payments || []);
      csvContent += "PR ID,PO No,Project,Vendor,Gross Amount,TDS Amount,Net Amount,Status,Stage,Created At\n";
      rows.forEach(r => {
        const id = r.pr_id || r.id || '';
        const poNo = r.po_no || '';
        const project = r.project || '';
        const vendor = r.vendor_name || r.vendor || '';
        const gross = r.amount_requested || r.gross_amount || 0;
        const tds = r.tds_amount || 0;
        const net = r.net_amount || (gross - tds);
        const status = r.status || '';
        const stage = r.stage || r.approval_stage || '';
        const createdAt = r.created_at || '';
        csvContent += [
          helperCsvCell(id),
          helperCsvCell(poNo),
          helperCsvCell(project),
          helperCsvCell(vendor),
          gross,
          tds,
          net,
          helperCsvCell(status),
          helperCsvCell(stage),
          helperCsvCell(createdAt)
        ].join(',') + '\n';
      });
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSendPaymentAdvice = async (paymentParam, mode = 'email') => {
    const rawId = typeof paymentParam === 'object' && paymentParam !== null
      ? (paymentParam.payment_request_id || paymentParam.pr_id || paymentParam.prId || paymentParam.id)
      : paymentParam;

    const paymentId = typeof rawId === 'string' ? rawId.replace(/^(TDS|PR)-/i, '').trim() : rawId;

    setSendingAdviceId(paymentId);
    try {
      const list = Array.isArray(data) ? data : (data?.rows || data?.payments || data?.entries || []);
      const paymentObj = (typeof paymentParam === 'object' && paymentParam !== null)
        ? paymentParam
        : list.find(r => {
            const rId = String(r.payment_request_id || r.pr_id || r.prId || r.id || '').replace(/^(TDS|PR)-/i, '').trim();
            return rId === String(paymentId);
          });

      const matchedVendor = findVendorForPayment(paymentObj, vendors);
      const vendorEmail = (
        matchedVendor?.email ||
        matchedVendor?.email_id ||
        matchedVendor?.primary_contact_email ||
        matchedVendor?.accounts_contact_email ||
        matchedVendor?.contact_email ||
        paymentObj?.vendor_email ||
        paymentObj?.email ||
        ''
      ).trim();

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
      const res = await call('sendPaymentAdvice', adviceModalPaymentId, adviceEmailInput.trim());
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
    if (!isAdmin && !isDirector && !isFinance) {
      toast.error('Only Admin, Director, or Finance users can delete payment requests.');
      return;
    }
    if (!confirm(`Are you sure you want to delete payment #${payment.id} for ${payment.vendor_name}? This action is irreversible.`)) {
      return;
    }
    const reason = prompt('Please enter a reason for deleting this payment request (at least 5 characters):', 'Deleted via Reports UI');
    if (reason === null) return;
    try {
      await call('deleteRemittedPayment', payment.id, reason || 'Deleted via Reports UI');
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
              handleOpenEditModal={handleOpenEditModal}
            />
          </CardContent>
        </Card>
      )}

      <ReportsRemitModal
        remitModalOpen={remitModalOpen} setRemitModalOpen={setRemitModalOpen}
        selectedRemitPayment={selectedRemitPayment} handleRemitSubmit={handleRemitSubmit}
        utr={utr} setUtr={setUtr} submitting={submitting}
      />

      <ReportsEditPaymentModal
        editModalOpen={editModalOpen}
        setEditModalOpen={setEditModalOpen}
        editingPayment={editingPayment}
        tdsSections={tdsSections || []}
        onSavePayment={handleSaveEditedPayment}
        submitting={submittingEdit}
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
