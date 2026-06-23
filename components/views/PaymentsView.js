'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Select, Dialog } from '../ui/core';
import { formatCurrency, formatDate } from '../../app/lib/utils';
import { isPOEligibleForPayment } from '../../app/lib/poEligibility';
import { PlusCircle, Search, CreditCard, ShieldCheck, ShieldAlert, History, Ban, CheckSquare, Eye, Mail, AlertTriangle } from 'lucide-react';

export default function PaymentsView() {
  const { payments, vendors, pos, user, call, refreshData } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // active, pending
  
  // Payment Request Form state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [vendorCode, setVendorCode] = useState('');
  const [poNo, setPoNo] = useState('');
  const [grossAmount, setGrossAmount] = useState(0);
  const [tdsAmount, setTdsAmount] = useState(0);
  const [invoiceRef, setInvoiceRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Workflow modals
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [workflowAction, setWorkflowAction] = useState('approve'); // approve, reject, remit
  const [comment, setComment] = useState('');
  const [utr, setUtr] = useState('');
  const [approvalTdsSec, setApprovalTdsSec] = useState('194C');
  const [approvalTdsPct, setApprovalTdsPct] = useState(2);

  // Project Financial Summary state
  const [projectSummary, setProjectSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [progressWidths, setProgressWidths] = useState({ current: 0, projected: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgressWidths(projectSummary
        ? {
            current: Math.min(projectSummary.currentUtilisation, 100),
            projected: Math.min(projectSummary.projectedUtilisation, 100)
          }
        : { current: 0, projected: 0 });
    }, projectSummary ? 100 : 0);
    return () => clearTimeout(timer);
  }, [projectSummary]);

  const getHealthTheme = (pct) => {
    if (pct <= 70) {
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        bar: 'bg-emerald-500',
        lightBar: 'bg-emerald-500/30'
      };
    }
    if (pct <= 90) {
      return {
        text: 'text-amber-550',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        bar: 'bg-amber-500',
        lightBar: 'bg-amber-500/30'
      };
    }
    if (pct <= 100) {
      return {
        text: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        bar: 'bg-red-500',
        lightBar: 'bg-red-500/30'
      };
    }
    return {
      text: 'text-rose-500 font-bold',
      bg: 'bg-rose-950/20',
      border: 'border-rose-900/40 border-2',
      bar: 'bg-rose-600',
      lightBar: 'bg-rose-600/30',
      overBudget: true
    };
  };

  // History modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTrail, setHistoryTrail] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const roles = user?.roles || [];
  const isDirector = roles.includes('director');
  const isFinance = roles.includes('finance');
  const isProcurement = roles.includes('procurement') || roles.includes('maker');
  const isAdmin = roles.includes('admin');
  const canOnboard = isProcurement || isAdmin;

  const getVendorPOs = (vCode) => {
    return pos.filter(po => {
      return po.vendor_key === vCode && isPOEligibleForPayment(po);
    });
  };

  // Find payment-eligible POs for payment request creation.
  const vendorPOs = getVendorPOs(vendorCode);
  const selectedPO = pos.find(p => p.po_no === poNo);

  // Handle PO selection to auto-calculate TDS
  const handlePOChange = (selectedPONo) => {
    setPoNo(selectedPONo);
    const selectedPO = pos.find(p => p.po_no === selectedPONo);
    if (selectedPO) {
      const tdsPct = Number(selectedPO.tds_pct) || 0;
      setTdsAmount(Math.round(grossAmount * (tdsPct / 100)));
    }
  };

  const handleGrossAmountChange = (val) => {
    setGrossAmount(val);
    const selectedPO = pos.find(p => p.po_no === poNo);
    if (selectedPO) {
      const tdsPct = Number(selectedPO.tds_pct) || 0;
      setTdsAmount(Math.round(val * (tdsPct / 100)));
    }
  };

  const netAmount = Math.max(grossAmount - tdsAmount, 0);

  const assertWorkflowResult = (result, fallbackMessage) => {
    if (!result || result.ok === false || (Array.isArray(result.errors) && result.errors.length > 0)) {
      const message = Array.isArray(result?.errors) && result.errors.length > 0
        ? result.errors.join(', ')
        : fallbackMessage;
      throw new Error(message);
    }
  };

  // Filter requests
  const filteredRequests = payments.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (p.vendor_name || '').toLowerCase().includes(q) || 
                          (p.po_no || '').toLowerCase().includes(q) || 
                          String(p.id).includes(q);
    
    if (!matchesSearch) return false;

    const status = String(p.status || '').toLowerCase();
    const stage = String(p.approval_stage || p.stage || '').toLowerCase();
    const isPending = status === 'pending';
    const isCompleted = status === 'approved' || status === 'rejected' || stage.includes('remitted');

    if (isCompleted) return false;

    if (activeTab === 'active') {
      return isPending;
    }

    // Filter pending for active user's roles
    const isRemitStage = stage.includes('remit');
    if (!isPending && !isRemitStage) return false;
    
    if (isAdmin) return true;
    if (isProcurement && stage.includes('proc')) return true;
    if (isFinance && stage.includes('finance')) return true;
    if (isDirector && stage.includes('director')) return true;
    if (isFinance && stage.includes('remit')) return true;
    return false;
  });

  const handleOpenRequestModal = () => {
    const defaultVendor = vendors[0]?.code || '';
    setVendorCode(defaultVendor);
    const validPOs = getVendorPOs(defaultVendor);
    setPoNo(validPOs[0]?.po_no || '');
    setGrossAmount(0);
    setTdsAmount(0);
    setInvoiceRef('');
    setRemarks('');
    setFormError(null);
    setRequestModalOpen(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!vendorCode || !poNo || grossAmount <= 0) {
      setFormError('Please fill out all required fields and ensure Gross Amount is positive.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const selectedPO = pos.find(p => p.po_no === poNo);
      const payload = {
        vendor: vendors.find(v => v.code === vendorCode)?.name || '',
        vendorCode: vendorCode,
        poNo: poNo,
        project: selectedPO ? selectedPO.project : '',
        amountRequested: grossAmount,
        gross_amount: grossAmount,
        tds_deducted: tdsAmount,
        net_amount: netAmount,
        invoice_no: invoiceRef.trim(),
        remarks: remarks.trim(),
        status: 'Pending',
        approval_stage: 'Procurement Approval'
      };

      await call('createPaymentRequest', payload);
      await refreshData();
      setRequestModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create payment request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWorkflowModal = (req, action) => {
    setSelectedRequest(req);
    setWorkflowAction(action);
    setComment('');
    setUtr('');
    setApprovalTdsSec('194C');
    setApprovalTdsPct(2);
    setFormError(null);
    setWorkflowModalOpen(true);
    setProjectSummary(null);

    const isApprover = isAdmin || isDirector || isFinance;
    const isCreator = req && user && req.created_by === user.email;
    if (isApprover && !isCreator && req?.id) {
      setLoadingSummary(true);
      call('getProjectFinancialSummary', req.id)
        .then(res => {
          setProjectSummary(res);
        })
        .catch(e => {
          console.error("Failed to load project financial summary:", e);
        })
        .finally(() => {
          setLoadingSummary(false);
        });
    }
  };

  const handleWorkflowActionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (workflowAction === 'approve') {
        const stage = String(selectedRequest?.approval_stage || selectedRequest?.stage || '').toLowerCase();
        let payload = {
          approval_status: 'Approved',
          comments: comment.trim()
        };
        if (stage.includes('finance')) {
          const calculatedTdsAmt = Math.round(Number(selectedRequest.gross_amount) * (Number(approvalTdsPct) / 100));
          payload.tds_configs = {
            [selectedRequest.id]: {
              amount: calculatedTdsAmt,
              percentage: Number(approvalTdsPct),
              section: approvalTdsSec
            }
          };
        }
        const result = await call('bulkApprovePayments', [selectedRequest.id], payload);
        assertWorkflowResult(result, 'Payment approval failed.');
      } else if (workflowAction === 'reject') {
        const payload = {
          comments: comment.trim()
        };
        const result = await call('bulkRejectPayments', [selectedRequest.id], payload);
        assertWorkflowResult(result, 'Payment rejection failed.');
      } else if (workflowAction === 'remit') {
        if (!utr) {
          setFormError('UTR reference is required to remit a payment.');
          setSubmitting(false);
          return;
        }
        const payload = {
          utr_ref: utr.trim(),
          comments: comment.trim()
        };
        const result = await call('bulkRemitPayments', [selectedRequest.id], payload);
        assertWorkflowResult(result, 'Payment remittance failed.');
      }
      await refreshData();
      setWorkflowModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Workflow transition failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHistory = async (req) => {
    setSelectedRequest(req);
    setLoadingHistory(true);
    setHistoryTrail([]);
    setHistoryModalOpen(true);
    try {
      const history = await call('getApprovalHistory', req.id);
      setHistoryTrail(history || []);
    } catch (e) {
      console.error('History load failed:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendPaymentAdvice = async (reqId) => {
    const req = payments.find(p => p.id === reqId);
    const vendor = vendors.find(v => v.code === req?.vendor_code || v.name === req?.vendor_name);
    const defaultEmail = vendor?.email || '';
    const email = prompt("Enter vendor's email address to send payment advice:", defaultEmail);
    if (email === null) return;
    if (!email.trim()) {
      alert('Email address is required.');
      return;
    }
    try {
      await call('sendPaymentAdvice', reqId, email.trim());
      alert('Payment advice email has been sent successfully to ' + email.trim() + '.');
    } catch (err) {
      alert('Failed to send payment advice: ' + err.message);
    }
  };

  const getWorkflowActionButton = (req) => {
    const stage = String(req.approval_stage || req.stage || '').toLowerCase();
    const isPending = String(req.status || '').toLowerCase() === 'pending';
    const isRemitStage = stage.includes('remit');
    if (!isPending && !isRemitStage) return null;

    let showActions = false;
    let isRemit = false;

    if (isProcurement && stage.includes('proc')) showActions = true;
    if (isFinance && stage.includes('finance')) showActions = true;
    if (isDirector && stage.includes('director')) showActions = true;
    if (isFinance && stage.includes('remit')) { showActions = true; isRemit = true; }

    // Admin can perform all actions
    if (isAdmin) {
      showActions = true;
      if (stage.includes('remit')) isRemit = true;
    }

    if (!showActions) return null;

    if (isRemit) {
      return (
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => handleOpenWorkflowModal(req, 'remit')}>
            <CheckSquare className="w-3.5 h-3.5" />
            Remit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleOpenWorkflowModal(req, 'reject')}>
            <Ban className="w-3.5 h-3.5" />
            Reject
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => handleOpenWorkflowModal(req, 'approve')}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Approve
        </Button>
        <Button variant="destructive" size="sm" onClick={() => handleOpenWorkflowModal(req, 'reject')}>
          <Ban className="w-3.5 h-3.5" />
          Reject
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gold/10 text-gold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-light text-slate-100 font-serif">Payment Requests</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Submit invoices, approve requests, and log UTR remissions.</p>
          </div>
        </div>

        {canOnboard && (
          <Button variant="primary" size="sm" onClick={handleOpenRequestModal}>
            <PlusCircle className="w-4 h-4" />
            New Payment Request
          </Button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-900/60 flex justify-between items-center">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all focus:outline-none ${activeTab === 'active' ? 'border-gold text-gold' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
          >
            Active Requests
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all focus:outline-none ${activeTab === 'pending' ? 'border-gold text-gold' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
          >
            My Pending Approvals
          </button>
        </div>

        <div className="relative w-full sm:w-72 mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search vendor, PO No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs py-1.5 h-8 bg-slate-950/40"
          />
        </div>
      </div>

      {/* Requests Table Card */}
      <Card>
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-light">
              No payment requests found matching your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead className="text-right">PO Amount</TableHead>
                  <TableHead className="text-right">Net Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req, idx) => {
                  const relatedPO = pos.find(p => p.po_no === req.po_no || p.po_no === req.poNo || p.po_no === req.po_number);
                  const poValue = relatedPO ? relatedPO.po_value : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-semibold text-xs text-slate-400">#{req.id}</TableCell>
                      <TableCell>{req.project || '—'}</TableCell>
                      <TableCell className="font-medium text-slate-200">{req.vendor_name}</TableCell>
                      <TableCell className="font-mono text-xs">{req.po_no}</TableCell>
                      <TableCell className="text-right">{formatCurrency(poValue)}</TableCell>
                      <TableCell className="text-right font-medium text-slate-200">{formatCurrency(req.net_amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          String(req.status || '').toLowerCase().includes('remitted')
                            ? 'success'
                            : String(req.status || '').toLowerCase().includes('reject')
                            ? 'error'
                            : 'pending'
                        }
                      >
                        {req.status || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-light">{req.approval_stage || 'Completed'}</TableCell>
                    <TableCell className="text-center flex items-center justify-center gap-2">
                      {getWorkflowActionButton(req)}
                      <Button variant="ghost" size="icon" onClick={() => handleViewHistory(req)} title="View Logs Trail">
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      {/* Payment Advice — ONLY for successfully remitted payments, NEVER for rejected */}
                      {String(req.stage).toLowerCase() === 'remitted' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleSendPaymentAdvice(req.id)} 
                          title="Send Payment Advice Email"
                          className="text-gold hover:text-gold/80"
                        >
                          <Mail className="w-3.5 h-3.5" />
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

      {/* Create Payment Request Dialog */}
      <Dialog open={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="New Payment Request">
        <form onSubmit={handleCreateRequest} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR *</label>
              <Select value={vendorCode} onChange={(e) => {
                const newVendorCode = e.target.value;
                setVendorCode(newVendorCode);
                const validPOs = getVendorPOs(newVendorCode);
                setPoNo(validPOs[0]?.po_no || '');
              }}>
                {vendors.map((v, idx) => (
                  <option key={idx} value={v.code}>{v.name} ({v.code})</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PURCHASE ORDER *</label>
              <Select value={poNo} onChange={(e) => handlePOChange(e.target.value)}>
                <option value="">Select PO...</option>
                {vendorPOs.map((p, idx) => (
                  <option key={idx} value={p.po_no}>{p.po_no} (Project: {p.project})</option>
                ))}
              </Select>
            </div>
          </div>

          {selectedPO && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/40 border border-slate-900 rounded-xl">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider block mb-1">PROJECT</label>
                <div className="text-sm font-medium text-slate-200">{selectedPO.project || '—'}</div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider block mb-1">PO TOTAL VALUE</label>
                <div className="text-sm font-semibold text-gold">{formatCurrency(selectedPO.po_value || 0)}</div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider block mb-1">AMOUNT ALREADY REMITTED</label>
                <div className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(selectedPO.paid || 0)} ({selectedPO.po_value > 0 ? ((selectedPO.paid / selectedPO.po_value) * 100).toFixed(1) : 0}%)
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 tracking-wider block mb-1">PO OUTSTANDING BALANCE</label>
                <div className="text-sm font-semibold text-amber-500">
                  {formatCurrency(Math.max(0, (selectedPO.po_value || 0) - (selectedPO.paid || 0)))}
                  <span className="text-xs font-light text-slate-500 ml-2">(updates only after remittance)</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">AMOUNT REQUESTED (INR) *</label>
              <Input
                type="number"
                min="1"
                required
                value={grossAmount}
                onChange={(e) => {
                  setGrossAmount(Number(e.target.value));
                  setTdsAmount(0);
                }}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">NET AMOUNT PAYABLE</label>
              <div className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-900 rounded-lg text-gold text-sm font-semibold">
                {formatCurrency(grossAmount)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">INVOICE NO / FILE REF</label>
              <Input
                type="text"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="e.g. INV-2026-987"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">REMARKS</label>
              <Input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Payment description or notes"
              />
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Workflow Actions Dialog (Approve / Reject / Remit) */}
      <Dialog 
        open={workflowModalOpen} 
        onClose={() => setWorkflowModalOpen(false)} 
        title={workflowAction === 'approve' ? 'Approve Payment Request' : workflowAction === 'remit' ? 'Remit Payment Request' : 'Reject Payment Request'}
      >
        <form onSubmit={handleWorkflowActionSubmit} className="space-y-6">
          {loadingSummary && (
            <div className="backdrop-blur-md bg-slate-950/40 border border-slate-900 rounded-[18px] p-8 text-center text-xs text-slate-500 font-light flex flex-col items-center justify-center gap-2 mb-5">
              <div className="w-5 h-5 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
              <span>Fetching project financials...</span>
            </div>
          )}

          {projectSummary && (
            <div className={`backdrop-blur-md bg-slate-950/45 border ${getHealthTheme(projectSummary.projectedUtilisation).border} rounded-[18px] p-5 shadow-2xl space-y-4 mb-5 animate-fade-in select-none`}>
              <div className="flex justify-between items-start border-b border-slate-900/60 pb-3">
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Project Financial Summary</h4>
                  <h3 className="text-sm font-serif font-light text-slate-200 mt-1">{projectSummary.project}</h3>
                </div>
                {projectSummary.projectedUtilisation > 100 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[9px] font-semibold uppercase tracking-wider animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    Over Budget
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                <div>
                  <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Total PO Value</span>
                  <span className="text-xs font-semibold text-slate-250 mt-1 block">{formatCurrency(projectSummary.totalPOValue)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Project Inflow</span>
                  <span className="text-xs font-semibold text-slate-250 mt-1 block">{formatCurrency(projectSummary.inflow)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">PO Outflow</span>
                  <span className="text-xs font-semibold text-slate-250 mt-1 block">{formatCurrency(projectSummary.currentPOOutflow)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Requested Amount</span>
                  <span className="text-xs font-semibold text-gold mt-1 block">+{formatCurrency(projectSummary.currentPaymentAmount)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Outflow After Approval</span>
                  <span className="text-xs font-bold text-slate-200 mt-1 block">{formatCurrency(projectSummary.outflowAfterApproval)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Outflow %</span>
                  <span className={`text-xs font-bold mt-1 block ${projectSummary.outflowPct > 100 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {Number(projectSummary.outflowPct || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-2 flex flex-col justify-end">
                  <span className="text-[9px] font-medium text-slate-500 tracking-wider block uppercase">Remaining PO Balance</span>
                  <span className={`text-xs font-bold mt-1 block ${projectSummary.remainingPOBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatCurrency(projectSummary.remainingPOBalance)}
                  </span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              {(() => {
                const theme = getHealthTheme(projectSummary.currentUtilisation);
                const projTheme = getHealthTheme(projectSummary.projectedUtilisation);
                return (
                  <div className="space-y-2 pt-2 border-t border-slate-900/60">
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>PROJECT UTILISATION</span>
                      <span className="flex items-center gap-1">
                        Current: <strong className={theme.text}>{projectSummary.currentUtilisation}%</strong> 
                        &middot; 
                        Projected: <strong className={projTheme.text}>{projectSummary.projectedUtilisation}%</strong>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-900 overflow-hidden relative">
                      <div 
                        className={`h-full absolute left-0 top-0 rounded-full transition-all duration-1000 ease-out ${projTheme.bar} opacity-30`}
                        style={{ width: `${progressWidths.projected}%` }}
                      />
                      <div 
                        className={`h-full absolute left-0 top-0 rounded-full transition-all duration-750 ease-out ${theme.bar}`}
                        style={{ width: `${progressWidths.current}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl space-y-2 text-sm font-light">
            <p className="text-slate-400">Request: <strong className="text-slate-200">#{selectedRequest?.id}</strong></p>
            <p className="text-slate-400">Vendor: <strong className="text-slate-200">{selectedRequest?.vendor_name}</strong></p>
            <p className="text-slate-400">Net Payable: <strong className="text-gold font-semibold">{formatCurrency(selectedRequest?.net_amount)}</strong></p>
          </div>

          {workflowAction === 'remit' && (
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">UTR / REF TRANSACTION NUMBER *</label>
              <Input
                type="text"
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Enter bank transfer UTR number"
              />
            </div>
          )}

          {workflowAction === 'approve' && String(selectedRequest?.approval_stage || selectedRequest?.stage || '').toLowerCase().includes('finance') && (
            <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-4">
              <span className="text-[10px] font-semibold text-gold tracking-wider uppercase block">TDS Deduction Details</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS SECTION</label>
                  <Select value={approvalTdsSec} onChange={(e) => setApprovalTdsSec(e.target.value)}>
                    <option value="194C">194C (Contractors - 2%)</option>
                    <option value="194J">194J (Professional - 10%)</option>
                    <option value="194I">194I (Rent - 10%)</option>
                    <option value="194H">194H (Commission - 5%)</option>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS PERCENT (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={approvalTdsPct}
                    onChange={(e) => setApprovalTdsPct(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-900/60">
                <span>Calculated TDS Amount:</span>
                <span className="text-red-400 font-semibold">{formatCurrency(Math.round(Number(selectedRequest?.gross_amount || 0) * (Number(approvalTdsPct) / 100)))}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Net Payable After TDS:</span>
                <span className="text-gold font-semibold">{formatCurrency(Number(selectedRequest?.gross_amount || 0) - Math.round(Number(selectedRequest?.gross_amount || 0) * (Number(approvalTdsPct) / 100)))}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">COMMENTS / FEEDBACK</label>
            <Input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Internal review notes"
            />
          </div>

          {formError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setWorkflowModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : workflowAction === 'approve' ? 'Approve' : workflowAction === 'remit' ? 'Remit' : 'Reject'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* History Trail Dialog */}
      <Dialog open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title={`Audit Trail for Request #${selectedRequest?.id}`}>
        {loadingHistory ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading history logs...</div>
        ) : historyTrail.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-light">No approval history logged for this request.</div>
        ) : (
          <div className="relative border-l border-slate-900 pl-6 ml-3 space-y-8 py-3 text-sm font-light text-slate-350">
            {historyTrail.map((h, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-gold border border-slate-950 ring-4 ring-slate-950" />
                <p className="text-[11px] text-slate-500">{formatDate(h.timestamp)}</p>
                <p className="text-slate-200 font-medium mt-1 uppercase text-xs tracking-wider">
                  {h.action_type || 'Workflow Action'} &middot; <span className="text-slate-400 normal-case font-light text-xs">{h.user}</span>
                </p>
                {h.details && <p className="text-slate-400 mt-1 bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 leading-relaxed">{h.details}</p>}
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}
