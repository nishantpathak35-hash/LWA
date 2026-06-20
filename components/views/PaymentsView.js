'use client';

import React, { useState } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Select, Dialog } from '../ui/core';
import { formatCurrency, formatDate } from '../../app/lib/utils';
import { PlusCircle, Search, CreditCard, ShieldCheck, ShieldAlert, History, Ban, CheckSquare, Eye } from 'lucide-react';

export default function PaymentsView() {
  const { payments, vendors, pos, user, call, refreshData } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, pending
  
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

  // Find POs for selected vendor
  const vendorPOs = pos.filter(po => po.vendor_key === vendorCode);

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

  // Filter requests
  const filteredRequests = payments.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (p.vendor_name || '').toLowerCase().includes(q) || 
                          (p.po_no || '').toLowerCase().includes(q) || 
                          String(p.id).includes(q);
    
    if (!matchesSearch) return false;
    if (activeTab === 'all') return true;

    // Filter pending for active user's roles
    const isPending = String(p.status || '').toLowerCase() === 'pending';
    if (!isPending) return false;
    const stage = String(p.approval_stage || p.stage || '').toLowerCase();
    
    if (isProcurement && stage.includes('proc')) return true;
    if (isFinance && stage.includes('finance')) return true;
    if (isDirector && stage.includes('director')) return true;
    return false;
  });

  const handleOpenRequestModal = () => {
    setVendorCode(vendors[0]?.code || '');
    const initialPO = pos.filter(po => po.vendor_key === (vendors[0]?.code || ''))[0]?.po_no || '';
    setPoNo(initialPO);
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
    setFormError(null);
    setWorkflowModalOpen(true);
  };

  const handleWorkflowActionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (workflowAction === 'approve') {
        const payload = {
          approval_status: 'Approved',
          comments: comment.trim()
        };
        await call('bulkApprovePayments', [selectedRequest.id], payload);
      } else if (workflowAction === 'reject') {
        const payload = {
          comments: comment.trim()
        };
        await call('bulkRejectPayments', [selectedRequest.id], payload);
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
        await call('bulkRemitPayments', [selectedRequest.id], payload);
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

  const getWorkflowActionButton = (req) => {
    const stage = String(req.approval_stage || req.stage || '').toLowerCase();
    const isPending = String(req.status || '').toLowerCase() === 'pending';
    if (!isPending) return null;

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
            onClick={() => setActiveTab('all')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all focus:outline-none ${activeTab === 'all' ? 'border-gold text-gold' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
          >
            All Requests
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
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead className="text-right">Net Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-xs text-slate-400">#{req.id}</TableCell>
                    <TableCell className="font-medium text-slate-200">{req.vendor_name}</TableCell>
                    <TableCell className="font-mono text-xs">{req.po_no}</TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
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
              <Select value={vendorCode} onChange={(e) => { setVendorCode(e.target.value); setPoNo(''); }}>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">GROSS AMOUNT (INR) *</label>
              <Input
                type="number"
                min="1"
                required
                value={grossAmount}
                onChange={(e) => handleGrossAmountChange(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS AMOUNT (INR)</label>
              <Input
                type="number"
                min="0"
                value={tdsAmount}
                onChange={(e) => setTdsAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">NET AMOUNT PAYABLE</label>
              <div className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-900 rounded-lg text-gold text-sm font-semibold">
                {formatCurrency(netAmount)}
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
