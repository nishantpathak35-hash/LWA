'use client';

import { toast } from '../ui/Toast';
import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Select, Dialog } from '../ui/core';
import { formatCurrency, formatDate } from '../../app/lib/utils';
import { isPOEligibleForPayment } from '../../app/lib/poEligibility';
import { PlusCircle, Search, CreditCard, ShieldCheck, ShieldAlert, History, Ban, CheckSquare, Eye, Mail, AlertTriangle } from 'lucide-react';

import PaymentFilters from './payments/PaymentFilters';
import PaymentListTable from './payments/PaymentListTable';
import PaymentFormModal from './payments/PaymentFormModal';
import PaymentApprovalModal from './payments/PaymentApprovalModal';
import PaymentHistoryModal from './payments/PaymentHistoryModal';
import MultiSelectActionBar from './payments/MultiSelectActionBar';
import BulkApprovalReviewModal from './payments/BulkApprovalReviewModal';
import BulkRejectModal from './payments/BulkRejectModal';
import InvoiceUploadModal from './payments/InvoiceUploadModal';

export default function PaymentsView() {
  const { payments, setPayments, vendors, pos, user, call, refreshData } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // active, pending
  
  // Payment Request Form state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [editingPrId, setEditingPrId] = useState(null); // Edit mode state
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
  const [approvalTdsAmt, setApprovalTdsAmt] = useState(0);
  const [approvalApprovedAmount, setApprovalApprovedAmount] = useState(0);

  // Multi-Select & Bulk Workflow state
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [activeMultiSelectProjectIndex, setActiveMultiSelectProjectIndex] = useState(0);
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false);
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false);
  const [bulkRejectComment, setBulkRejectComment] = useState('');
  const [bulkApprovalData, setBulkApprovalData] = useState([]); // Array of request details for review grid

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
  const isProcurement = roles.some(role => ['proc', 'procurement', 'maker'].includes(role));
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

  const handleEditPayment = (pr) => {
    setEditingPrId(pr.id);
    
    // Find the vendor code for this vendor name
    const prVendor = vendors.find(v => v.name === pr.vendor_name || v.name === pr.vendor) || vendors[0];
    if (prVendor) {
      setVendorCode(prVendor.code);
    }
    
    setPoNo(pr.po_no || '');
    setGrossAmount(Number(pr.amount_requested || pr.gross_amount || 0));
    setTdsAmount(Number(pr.tds_amount || 0));
    setRemarks(pr.remarks || '');
    // Invoice ref is part of remarks or payload? The codebase sets invoiceRef into remarks.
    setInvoiceRef('');
    setFormError(null);
    setRequestModalOpen(true);
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
  const selectedRequestStage = String(selectedRequest?.approval_stage || selectedRequest?.stage || '').toLowerCase();
  const selectedRequestGross = Number(selectedRequest?.amount_requested || selectedRequest?.gross_amount || selectedRequest?.amountRequested || 0);
  const selectedRequestStoredTds = Number(selectedRequest?.tds_amount || 0);
  const canEditApprovalTds = workflowAction === 'approve' && (
    isAdmin ||
    isDirector ||
    isFinance ||
    String(user?.role || '').toLowerCase().includes('finance') ||
    String(user?.role || '').toLowerCase().includes('director') ||
    String(user?.role || '').toLowerCase().includes('admin') ||
    selectedRequestStage.includes('finance') ||
    selectedRequestStage.includes('director')
  );
  const displayedTdsHold = canEditApprovalTds ? Number(approvalTdsAmt) : selectedRequestStoredTds;
  const displayedApprovedAmount = canEditApprovalTds ? Number(approvalApprovedAmount) : Number(selectedRequest?.approved_amount ?? selectedRequestGross);
  const displayedNetAfterTds = Math.max(displayedApprovedAmount - displayedTdsHold, 0);

  const assertWorkflowResult = (result, fallbackMessage) => {
    if (!result || result.ok === false || (Array.isArray(result.errors) && result.errors.length > 0)) {
      const message = Array.isArray(result?.errors) && result.errors.length > 0
        ? result.errors.join(', ')
        : fallbackMessage;
      throw new Error(message);
    }
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    return payments.filter(p => {
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
  }, [payments, searchQuery, activeTab, isAdmin, isProcurement, isFinance, isDirector]);

  // Multi-Select Computation Logic
  const selectedRequestsData = useMemo(() => {
    return payments.filter(p => selectedPayments.includes(p.id));
  }, [payments, selectedPayments]);

  const projectsForSelection = useMemo(() => {
    const projectsMap = new Map(); // Project Name -> [Requests]
    selectedRequestsData.forEach(req => {
      const proj = req.project || 'Unassigned Project';
      if (!projectsMap.has(proj)) projectsMap.set(proj, []);
      projectsMap.get(proj).push(req);
    });
    return Array.from(projectsMap.entries()).map(([name, requests]) => ({ name, requests }));
  }, [selectedRequestsData]);

  const overallSelectionSummary = useMemo(() => {
    let totalProjects = projectsForSelection.length;
    let totalRequests = selectedRequestsData.length;
    let totalVendors = new Set(selectedRequestsData.map(r => r.vendor_name)).size;
    let totalRequestedAmount = selectedRequestsData.reduce((sum, r) => sum + Number(r.amount_requested || r.gross_amount || 0), 0);
    let totalPendingApproval = selectedRequestsData.reduce((sum, r) => {
      const stage = String(r.approval_stage || r.stage || '').toLowerCase();
      // If it is pending or not fully remitted yet, count it as pending approval
      if (!stage.includes('remitted')) return sum + Number(r.amount_requested || r.gross_amount || 0);
      return sum;
    }, 0);

    return { totalProjects, totalRequests, totalVendors, totalRequestedAmount, totalPendingApproval };
  }, [projectsForSelection, selectedRequestsData]);

  const activeMultiSelectProject = projectsForSelection[activeMultiSelectProjectIndex];

  const activeProjectMultiSelectSummary = useMemo(() => {
    if (!activeMultiSelectProject) return null;
    const requests = activeMultiSelectProject.requests;
    const selectedAmount = requests.reduce((sum, r) => sum + Number(r.amount_requested || r.gross_amount || 0), 0);
    // Find ALL requests for this project to calculate total requested, remaining, pending
    const allProjectRequests = payments.filter(p => p.project === activeMultiSelectProject.name);
    const totalRequested = allProjectRequests.reduce((sum, r) => sum + Number(r.amount_requested || r.gross_amount || 0), 0);
    const remainingOutstanding = totalRequested - selectedAmount;
    
    const pendingApproval = allProjectRequests.reduce((sum, r) => {
      const stage = String(r.approval_stage || r.stage || '').toLowerCase();
      if (!stage.includes('remitted') && !stage.includes('reject')) return sum + Number(r.amount_requested || r.gross_amount || 0);
      return sum;
    }, 0);

    return {
      totalRequested,
      selectedAmount,
      remainingOutstanding: Math.max(0, remainingOutstanding),
      pendingApproval
    };
  }, [activeMultiSelectProject, payments]);

  // Fetch Project Financials automatically when activeMultiSelectProject changes
  useEffect(() => {
    if (!activeMultiSelectProject) return;
    const req = activeMultiSelectProject.requests[0];
    if (req) {
      setLoadingSummary(true);
      call('getProjectFinancialSummary', req.id)
        .then(summary => setProjectSummary(summary))
        .catch(err => {
          console.error("Failed to fetch multi-select project summary", err);
          setProjectSummary(null);
        })
        .finally(() => setLoadingSummary(false));
    }
  }, [activeMultiSelectProject, call]);

  const canActOnReq = (req) => {
    const stage = String(req.approval_stage || req.stage || '').toLowerCase();
    const isPending = String(req.status || '').toLowerCase() === 'pending';
    const isRemitStage = stage.includes('remit');
    if (!isPending && !isRemitStage) return false;
    if (isAdmin) return true;
    if (isProcurement && stage.includes('proc')) return true;
    if (isFinance && stage.includes('finance')) return true;
    if (isDirector && stage.includes('director')) return true;
    if (isFinance && stage.includes('remit')) return true;
    return false;
  };

  const handleSelectPayment = (id) => {
    setSelectedPayments(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAllPayments = (checked) => {
    if (checked) {
      // Only select rows the user actually has permission to act on
      setSelectedPayments(filteredRequests.filter(canActOnReq).map(r => r.id));
    } else {
      setSelectedPayments([]);
    }
  };

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

  // ── Keyboard shortcut: G → P → N opens New Payment Request modal ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handler = () => { if (canOnboard) handleOpenRequestModal(); };
    window.addEventListener('lx:new-payment-request', handler);
    return () => window.removeEventListener('lx:new-payment-request', handler);
  }, [canOnboard, vendors, pos]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!vendorCode || !poNo || !grossAmount) {
      setFormError('Please fill all required fields');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const v = vendors.find(x => x.code === vendorCode) || {};
      const selectedPO = pos.find(p => p.po_no === poNo);
      const payload = {
        vendor: v.name || v.legalName || v.vendor_name || vendorCode,
        vendorCode: v.code || vendorCode,
        poNo: poNo,
        project: selectedPO ? selectedPO.project : '',
        amountRequested: grossAmount,
        gross_amount: grossAmount,
        tds_deducted: tdsAmount,
        tds_amount: tdsAmount,
        tds_percentage: Number(selectedPO?.tds_pct || 0),
        tds_section: selectedPO?.tds_section || '',
        net_amount: netAmount,
        invoice_no: invoiceRef.trim(),
        invoiceRef,
        remarks: remarks.trim()
      };
      
      let res;
      if (editingPrId) {
        res = await call('updatePaymentRequest', editingPrId, payload);
      } else {
        res = await call('createPaymentRequest', payload);
      }
      
      if (res && res.ok) {
        toast.success(editingPrId ? 'Payment Request Updated' : 'Payment Request Created');
        setRequestModalOpen(false);
        setEditingPrId(null);
        setVendorCode('');
        setPoNo('');
        setGrossAmount(0);
        setTdsAmount(0);
        setInvoiceRef('');
        setRemarks('');
        await refreshData();
      } else {
        setFormError(res?.error || 'Failed to save request');
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWorkflowModal = (req, action) => {
    const relatedPO = pos.find(p => p.po_no === req.po_no || p.po_no === req.poNo || p.po_no === req.po_number);
    setSelectedRequest(req);
    setWorkflowAction(action);
    setComment('');
    setUtr('');
    setApprovalTdsSec(req?.tds_section || relatedPO?.tds_section || '194C');
    const baseRequestedAmt = Number(req?.amount_requested || req?.gross_amount || 0);
    setApprovalApprovedAmount(Number(req?.approved_amount ?? baseRequestedAmt));
    setApprovalTdsAmt(Number(req?.tds_amount || 0));
    setFormError(null);
    setWorkflowModalOpen(true);
    setProjectSummary(null);

    const isApprover = isAdmin || isDirector || isFinance;
    const isCreator = req && user && req.created_by === user.email;
    if (isApprover && (!isCreator || isAdmin || isDirector) && req?.id) {
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
        let payload = {
          approval_status: 'Approved',
          comments: comment.trim()
        };
        setPayments(prev => prev.map(p => p.id === selectedRequest.id ? { ...p, status: 'approved', approval_stage: 'Approved', stage: 'Approved' } : p));
        if (canEditApprovalTds) {
          payload.tds_configs = {
            [selectedRequest.id]: {
              approved_amount: displayedApprovedAmount,
              amount: displayedTdsHold,
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
        setPayments(prev => prev.map(p => p.id === selectedRequest.id ? { ...p, status: 'rejected', approval_stage: 'Rejected', stage: 'Rejected' } : p));
        const result = await call('bulkRejectPayments', [selectedRequest.id], payload);
        assertWorkflowResult(result, 'Payment rejection failed.');
      } else if (workflowAction === 'remit') {
        if (!utr) {
          throw new Error('UTR / Reference is required for remittance.');
        }
        setPayments(prev => prev.map(p => p.id === selectedRequest.id ? { ...p, status: 'approved', stage: 'Remitted' } : p));
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

  // Reloads the history trail in-place after a comment is added (no modal close needed)
  const handlePaymentCommentAdded = async (req) => {
    try {
      const history = await call('getApprovalHistory', req.id);
      setHistoryTrail(history || []);
    } catch (e) { console.error('Failed to reload payment history:', e); }
  };

  const [adviceModalOpen, setAdviceModalOpen] = useState(false);
  const [adviceTargetIds, setAdviceTargetIds] = useState([]);
  const [adviceContact, setAdviceContact] = useState('');
  
  const handleSendPaymentAdvice = async (reqId) => {
    setAdviceTargetIds([reqId]);
    setAdviceContact('');
    setAdviceModalOpen(true);
  };

  const handleSendMultiWhatsApp = () => {
    setAdviceTargetIds(selectedPayments);
    setAdviceContact('');
    setAdviceModalOpen(true);
  };

  const executeSendAdvice = async (method) => {
    if (!adviceContact) return toast('Please enter a contact (email or phone).');
    try {
      if (method === 'email') {
        for (const targetId of adviceTargetIds) {
          await call('sendPaymentAdvice', targetId, adviceContact.trim());
        }
        toast.success(`Payment advice email sent to ${adviceContact.trim()}`);
      } else if (method === 'whatsapp') {
        for (const targetId of adviceTargetIds) {
          await call('sendPaymentAdviceWhatsApp', targetId, adviceContact.trim());
        }
        toast.success(`Payment advice WhatsApp sent to ${adviceContact.trim()}`);
      }
      setAdviceModalOpen(false);
      if (adviceTargetIds.length > 1) {
        setSelectedPayments([]);
      }
    } catch (err) {
      toast.error('Failed to send payment advice: ' + (err.message || 'Unknown error'));
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

  const handleBulkApproveReview = () => {
    const data = selectedRequestsData.map(req => {
      const relatedPO = pos.find(p => p.po_no === req.po_no || p.po_no === req.poNo || p.po_no === req.po_number);
      const gross = Number(req.amount_requested || req.gross_amount || 0);
      const tdsSec = req.tds_section || relatedPO?.tds_section || '194C';
      const tdsAmt = Number(req.tds_amount || 0);
      return {
        id: req.id,
        vendor_name: req.vendor_name,
        po_no: req.po_no,
        project: req.project,
        grossAmount: gross,
        approvedAmount: Number(req.approved_amount ?? gross),
        tdsSec: tdsSec,
        tdsAmt: tdsAmt,
        netPayable: Math.max((Number(req.approved_amount ?? gross)) - tdsAmt, 0)
      };
    });
    setBulkApprovalData(data);
    setBulkApproveModalOpen(true);
  };

  const handleUpdateBulkApprovalData = (id, field, value) => {
    setBulkApprovalData(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'approvedAmount' || field === 'tdsAmt') {
        updated.netPayable = Math.max(Number(updated.approvedAmount || 0) - Number(updated.tdsAmt || 0), 0);
      }
      return updated;
    }));
  };

  const submitBulkApprove = async () => {
    setSubmitting(true);
    try {
      const tdsConfigs = {};
      bulkApprovalData.forEach(item => {
        tdsConfigs[item.id] = {
          approved_amount: item.approvedAmount,
          amount: item.tdsAmt,
          section: item.tdsSec
        };
      });
      const result = await call('bulkApprovePayments', selectedPayments, { comments: 'Bulk Approved', tds_configs: tdsConfigs });
      if (result.failed && result.failed.length > 0) {
        toast.error(`Approved ${result.total_approved}. Failed ${result.total_failed}.`);
      } else {
        toast.success(`Successfully approved ${result.total_approved} payments!`);
        setSelectedPayments([]);
      }
      await refreshData();
      setBulkApproveModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Bulk approve failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitBulkReject = async () => {
    setSubmitting(true);
    try {
      const result = await call('bulkRejectPayments', selectedPayments, { remarks: bulkRejectComment });
      if (result.failed && result.failed.length > 0) {
        toast.error(`Rejected ${result.total_rejected}. Failed ${result.total_failed}.`);
      } else {
        toast.success(`Successfully rejected ${result.total_rejected} payments.`);
        setSelectedPayments([]);
      }
      await refreshData();
      setBulkRejectModalOpen(false);
      setBulkRejectComment('');
    } catch (err) {
      toast.error(err.message || 'Bulk reject failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-32 relative">

      <PaymentFilters
        canOnboard={canOnboard} 
        handleOpenRequestModal={handleOpenRequestModal}
        handleOpenInvoiceModal={() => setInvoiceModalOpen(true)}
        activeTab={activeTab} setActiveTab={setActiveTab}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
      />
      
      <PaymentListTable
        displayedRequests={filteredRequests} handleViewHistory={handleViewHistory}
        handleOpenWorkflowModal={handleOpenWorkflowModal} user={user}
        isAdmin={isAdmin} isFinance={isFinance} isDirector={isDirector}
        pos={pos} getWorkflowActionButton={getWorkflowActionButton} handleSendPaymentAdvice={handleSendPaymentAdvice}
        selectedPayments={selectedPayments}
        onSelectPayment={handleSelectPayment}
        onSelectAll={handleSelectAllPayments}
        canActOnReq={canActOnReq}
        onEditPayment={handleEditPayment}
      />
      
      <MultiSelectActionBar
        selectedRequests={selectedRequestsData}
        overallSummary={overallSelectionSummary}
        activeProjectName={activeMultiSelectProject?.name}
        projectsList={projectsForSelection}
        activeProjectIndex={activeMultiSelectProjectIndex}
        setActiveProjectIndex={setActiveMultiSelectProjectIndex}
        projectSummary={projectSummary}
        progressWidths={progressWidths}
        getHealthTheme={getHealthTheme}
        multiSelectSummary={activeProjectMultiSelectSummary}
        loadingSummary={loadingSummary}
        allSelectedActionable={selectedRequestsData.length > 0 && selectedRequestsData.every(canActOnReq)}
        onApproveSelected={handleBulkApproveReview}
        onRejectSelected={() => setBulkRejectModalOpen(true)}
        onClearSelection={() => setSelectedPayments([])}
        onSendToWhatsApp={handleSendMultiWhatsApp}
      />

      <BulkApprovalReviewModal
        open={bulkApproveModalOpen}
        onClose={() => setBulkApproveModalOpen(false)}
        selectedRequestsDetails={bulkApprovalData}
        onUpdateApprovalData={handleUpdateBulkApprovalData}
        onConfirmApprove={submitBulkApprove}
        submitting={submitting}
        canEditApprovalTds={canEditApprovalTds}
      />

      <BulkRejectModal
        open={bulkRejectModalOpen}
        onClose={() => setBulkRejectModalOpen(false)}
        selectedCount={selectedPayments.length}
        rejectComment={bulkRejectComment}
        setRejectComment={setBulkRejectComment}
        onConfirmReject={submitBulkReject}
        submitting={submitting}
      />

      {requestModalOpen && (
        <PaymentFormModal
          requestModalOpen={requestModalOpen}
          setRequestModalOpen={setRequestModalOpen}
          vendorCode={vendorCode}
          setVendorCode={setVendorCode}
          vendors={vendors}
          poNo={poNo}
          handlePOChange={handlePOChange}
          vendorPOs={vendorPOs}
          grossAmount={grossAmount}
          handleGrossAmountChange={handleGrossAmountChange}
          tdsAmount={tdsAmount}
          setTdsAmount={setTdsAmount}
          netAmount={netAmount}
          invoiceRef={invoiceRef}
          setInvoiceRef={setInvoiceRef}
          remarks={remarks}
          setRemarks={setRemarks}
          formError={formError}
          submitting={submitting}
          handleSubmitRequest={handleSubmitRequest}
          projectSummary={projectSummary}
          progressWidths={progressWidths}
          getHealthTheme={getHealthTheme}
          getVendorPOs={getVendorPOs}
          setPoNo={setPoNo}
          isEditMode={!!editingPrId}
        />
      )}
      
      <PaymentApprovalModal
        workflowModalOpen={workflowModalOpen} setWorkflowModalOpen={setWorkflowModalOpen}
        selectedRequest={selectedRequest} workflowAction={workflowAction}
        canEditApprovalTds={canEditApprovalTds} approvalTdsSec={approvalTdsSec} setApprovalTdsSec={setApprovalTdsSec}
        approvalTdsAmt={approvalTdsAmt} setApprovalTdsAmt={setApprovalTdsAmt}
        approvalApprovedAmount={approvalApprovedAmount} setApprovalApprovedAmount={setApprovalApprovedAmount}
        displayedTdsHold={displayedTdsHold} displayedApprovedAmount={displayedApprovedAmount}
        displayedNetAfterTds={displayedNetAfterTds} utr={utr} setUtr={setUtr}
        comment={comment} setComment={setComment} submitting={submitting} handleWorkflowAction={handleWorkflowActionSubmit}
        loadingSummary={loadingSummary} projectSummary={projectSummary} getHealthTheme={getHealthTheme}
        selectedRequestGross={selectedRequestGross} progressWidths={progressWidths} formError={formError}
      />
      
      <PaymentHistoryModal
        historyModalOpen={historyModalOpen} setHistoryModalOpen={setHistoryModalOpen}
        selectedRequest={selectedRequest} loadingHistory={loadingHistory} historyTrail={historyTrail}
        onCommentAdded={handlePaymentCommentAdded}
      />

      <InvoiceUploadModal 
        open={invoiceModalOpen} 
        onClose={() => setInvoiceModalOpen(false)} 
      />

      {/* Payment Advice Modal */}
      <Dialog open={adviceModalOpen} onClose={() => setAdviceModalOpen(false)} title="Send Payment Advice">
        <div className="space-y-4">
          <div className="text-sm text-slate-400">
            Enter the vendor's email address or WhatsApp number (with country code, e.g. 919876543210).
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-light">Contact Detail</label>
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
            <Button variant="primary" onClick={() => executeSendAdvice('whatsapp')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Send via WhatsApp
            </Button>
            <Button variant="primary" onClick={() => executeSendAdvice('email')}>
              Send via Email
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog open={adviceModalOpen} onClose={() => setAdviceModalOpen(false)} title="Send Payment Advice">
        <div className="space-y-4">
          <div className="text-sm text-slate-400">
            Enter the vendor's email address or WhatsApp number (with country code, e.g. 919876543210).
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-light">Contact Detail</label>
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
            <Button variant="primary" onClick={() => executeSendAdvice('whatsapp')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Send via WhatsApp
            </Button>
            <Button variant="primary" onClick={() => executeSendAdvice('email')}>
              Send via Email
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
