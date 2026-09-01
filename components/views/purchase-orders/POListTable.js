import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Input } from '../../ui/core';
import { Search, ChevronDown, ChevronUp, Eye, Send, Edit2, Clock, CheckCircle, XCircle, Copy, Trash2, Wallet, History, MessageSquare, Download, Layers, Filter } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
import SortableHeader from '../../ui/SortableHeader';
import { exportToCSV, sortData } from '../../../app/lib/exportUtils';
import PODetailsDrawer from './PODetailsDrawer';

export default function POListTable({
  filteredPOs,
  searchQuery, setSearchQuery,
  poDateSortDir, setPoDateSortDir,
  openActionMenuPoNo, setOpenActionMenuPoNo,
  canCreate, canApprove, canManualPay, isAdmin,
  handleOpenModal, handleSubmitForApproval, handleOpenApproval, handleDuplicatePO, handleDeletePO, handleShortClosePO,
  reloadPayments, setMpDate, setMpAmount, setMpMode, setMpUtr, setMpBank, setMpRef, setMpRemarks, setMpError, setManualPayModalOpen, setEditingPoNo,
  handleViewPOHistory,
  handleSendPOEmail,
  getStatusBadge, getPaymentStatusBadge,
  hasMorePOs, loadMorePOs,
  call
}) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortField, setSortField] = useState('po_date');
  const [sortDir, setSortDir] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'paid' | 'closed'
  const [selectedPOForDrawer, setSelectedPOForDrawer] = useState(null);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortDir(field);
      setSortDir('asc');
    }
  };

  // Status Filter Logic
  const displayPOs = useMemo(() => {
    let list = filteredPOs || [];
    if (statusFilter === 'pending') {
      list = list.filter(p => {
        const s = String(p.status || p.approval_status || '').toLowerCase();
        return s === 'pending approval' || s === 'pending_approval' || s === 'pending' || s.includes('pending') || s === 'under approval';
      });
    } else if (statusFilter === 'approved') {
      list = list.filter(p => {
        const s = String(p.status || p.approval_status || '').toLowerCase();
        return s === 'approved' || s === 'active';
      });
    } else if (statusFilter === 'paid') {
      list = list.filter(p => {
        const ps = String(p.payment_status || '').toLowerCase();
        return ps === 'fully paid' || ps === 'paid';
      });
    } else if (statusFilter === 'closed') {
      list = list.filter(p => {
        const s = String(p.status || p.approval_status || '').toLowerCase();
        return s === 'short closed' || s === 'short_closed' || s === 'closed';
      });
    }
    return sortData(list, sortField, sortDir);
  }, [filteredPOs, statusFilter, sortField, sortDir]);

  const handleExportCSV = () => {
    const columns = [
      { label: 'PO Number', key: 'po_no' },
      { label: 'PO Date', key: 'po_date', formatter: (v) => formatDate(v) },
      { label: 'Vendor', key: 'vendor_name', formatter: (v, r) => r.vendor_name || r.vendor_key },
      { label: 'Project', key: 'project' },
      { label: 'Status', key: 'status', formatter: (v, r) => r.status || r.approval_status },
      { label: 'Payment Status', key: 'payment_status' },
      { label: 'PO Value', key: 'po_value', formatter: (v) => Number(v || 0) },
      { label: 'Paid Amount', key: 'paid', formatter: (v) => Number(v || 0) },
      { label: 'Balance', key: 'balance', formatter: (v, r) => Math.max(0, Number(r.po_value || 0) - Number(r.paid || 0)) }
    ];
    exportToCSV('Purchase_Orders_Database.csv', columns, displayPOs);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadMorePOs();
    setLoadingMore(false);
  };

  return (
    <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
      {/* ── Toolbar & Segmented Filters ── */}
      <div className="p-4 border-b border-border bg-card/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-foreground text-background shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
          >
            All POs ({filteredPOs.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Needs Approval
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            Active Approved
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
            }`}
          >
            Fully Paid
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'closed'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'
            }`}
          >
            Short Closed
          </button>
        </div>

        {/* Search and Export Bar */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search PO, Vendor, Project..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 text-xs py-1.5 h-9 bg-background rounded-xl border-border"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-border shrink-0"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Export
          </Button>
        </div>

      </div>

      <CardContent className="p-0">
        {displayPOs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm font-medium space-y-2">
            <Layers className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p>No purchase orders found matching this filter.</p>
          </div>
        ) : (
          <>
            {/* ── Mobile View: Cards Layout ── */}
            <div className="block md:hidden p-3 space-y-3">
              {displayPOs.map((po, idx) => {
                const st = String(po.status || po.approval_status || 'Draft').toLowerCase();
                const isDraft    = st === 'draft';
                const isPending  = st === 'pending approval' || st === 'pending_approval' || st === 'pending' || st.includes('pending') || st.includes('submitted') || st === 'under approval';
                const isApproved = st === 'approved' || st === 'active';
                const isRejected = st === 'rejected';
                const isShortClosed = st === 'short closed' || st === 'short_closed' || st === 'closed';
                const poValue = Number(po.po_value || 0);
                const paid = Number(po.paid || 0);
                const calcBalance = isShortClosed ? 0 : Math.max(0, poValue - paid);
                const paidPct = poValue > 0 ? Math.min(100, Math.round((paid / poValue) * 100)) : 0;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedPOForDrawer(po)}
                    className="rounded-xl border border-border bg-card p-4 space-y-3 cursor-pointer hover:border-amber-500/50 transition-all shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {po.po_no}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(po.status || po.approval_status)}
                        {getPaymentStatusBadge(po.payment_status)}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-foreground text-xs">{po.vendor_name || po.vendor_key}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{po.project || 'General Project'} • {formatDate(po.po_date)}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-xl border border-border">
                      <div className="flex justify-between text-[11px] font-medium tabular-nums">
                        <span className="text-muted-foreground">PO: {formatCurrency(poValue)}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Paid: {formatCurrency(paid)} ({paidPct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${paidPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                        <span>Balance:</span>
                        <span className="font-bold text-foreground font-mono tabular-nums">{formatCurrency(calcBalance)}</span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPOForDrawer(po)}
                        className="h-7 px-2.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold"
                      >
                        <Eye className="w-3 h-3 mr-1" /> Quick View
                      </Button>

                      <div className="flex items-center gap-1">
                        {canApprove && isPending && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenApproval(po, 'approve')}
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                        )}
                        {canCreate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(po.po_no)}
                            className="h-7 px-2 text-[11px]"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop View: Table ── */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 text-muted-foreground">
                    <SortableHeader field="po_no" label="PO Number" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-32 pl-5" />
                    <SortableHeader field="po_date" label="PO Date" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <SortableHeader field="vendor_name" label="Vendor Partner" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[190px]" />
                    <SortableHeader field="project" label="Project" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[140px]" />
                    <SortableHeader field="status" label="Status" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <SortableHeader field="payment_status" label="Payment" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <SortableHeader field="po_value" label="PO Value" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="paid" label="Paid Amount" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="balance" label="Balance" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <TableHead className="text-center w-28 py-3 px-4 font-medium text-[11px] text-muted-foreground tracking-wide select-none">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayPOs.map((po, idx) => {
                    const st = String(po.status || po.approval_status || 'Draft').toLowerCase();
                    const isDraft    = st === 'draft';
                    const isPending  = st === 'pending approval' || st === 'pending_approval' || st === 'pending' || st.includes('pending') || st.includes('submitted') || st === 'under approval';
                    const isApproved = st === 'approved' || st === 'active';
                    const isRejected = st === 'rejected';
                    const isShortClosed = st === 'short closed' || st === 'short_closed' || st === 'closed';
                    const calcBalance  = isShortClosed ? 0 : Math.max(0, Number(po.po_value || 0) - Number(po.paid || 0));

                    return (
                      <TableRow
                        key={idx}
                        onClick={() => setSelectedPOForDrawer(po)}
                        className="border-b border-border/40 hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
                      >
                        <TableCell className="pl-5 py-3.5 font-mono text-xs font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          <span className="flex items-center gap-1.5">
                            {po.po_no}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(po.po_date)}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-xs font-semibold text-foreground truncate max-w-[220px]" title={po.vendor_name || po.vendor_key}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold border border-amber-500/20 shrink-0">
                              {(po.vendor_name || po.vendor_key || 'V').substring(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate">{po.vendor_name || po.vendor_key}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-xs text-muted-foreground truncate max-w-[160px]" title={po.project || ''}>
                          {po.project || 'General'}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 whitespace-nowrap">
                          {getStatusBadge(po.status || po.approval_status)}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 whitespace-nowrap">
                          {getPaymentStatusBadge(po.payment_status)}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-right font-bold text-foreground font-mono tabular-nums text-xs">
                          {formatCurrency(Number(po.po_value || 0))}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums text-xs">
                          {formatCurrency(Number(po.paid || 0))}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-right font-medium text-foreground font-mono tabular-nums text-xs">
                          {formatCurrency(calcBalance)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedPOForDrawer(po)}
                              title="Quick Inspect PO"
                              className="h-7 w-7 text-muted-foreground hover:text-amber-500 hover:bg-muted"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            <div className="relative inline-block text-left">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuPoNo(openActionMenuPoNo === po.po_no ? null : po.po_no);
                                }}
                                className="flex items-center gap-1 h-7 text-xs px-2 bg-muted/50 hover:bg-muted border border-border rounded-lg font-medium text-foreground"
                              >
                                More <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              </Button>

                              {openActionMenuPoNo === po.po_no && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuPoNo(null)} />
                                  <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-card shadow-xl py-1 z-20 animate-fade-in flex flex-col text-foreground">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        setSelectedPOForDrawer(po);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors text-left font-medium"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-amber-500" /> Side-Drawer View
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        window.open(`/po/${encodeURIComponent(po.po_no)}`, '_blank');
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors text-left font-medium"
                                    >
                                      <Download className="w-3.5 h-3.5 text-muted-foreground" /> Open PDF Sheet
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        if (handleSendPOEmail) handleSendPOEmail(po.po_no);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors text-left font-medium"
                                    >
                                      <Send className="w-3.5 h-3.5 text-muted-foreground" /> Email to Vendor
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        handleOpenModal(po.po_no);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors text-left font-medium"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" /> Edit PO
                                    </button>
                                    {canCreate && (isDraft || isRejected) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuPoNo(null);
                                          handleSubmitForApproval(po.po_no);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-muted transition-colors text-left font-medium"
                                      >
                                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Submit Approval
                                      </button>
                                    )}
                                    {canApprove && isPending && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuPoNo(null);
                                            handleOpenApproval(po, 'approve');
                                          }}
                                          className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-muted transition-colors text-left font-medium"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Approve PO
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuPoNo(null);
                                            handleOpenApproval(po, 'reject');
                                          }}
                                          className="flex items-center gap-2 px-3 py-2 text-xs text-rose-700 dark:text-rose-400 hover:bg-muted transition-colors text-left font-medium"
                                        >
                                          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Reject PO
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        handleDuplicatePO(po);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors text-left border-t border-border font-medium"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Duplicate
                                    </button>
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuPoNo(null);
                                          handleDeletePO(po.po_no);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-rose-700 dark:text-rose-400 hover:bg-muted transition-colors text-left font-medium"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Delete PO
                                      </button>
                                    )}
                                    {canManualPay && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuPoNo(null);
                                          setEditingPoNo(po.po_no);
                                          reloadPayments(po.po_no);
                                          setMpDate(new Date().toISOString().substring(0, 10));
                                          setMpAmount(''); setMpMode('Bank Transfer');
                                          setMpUtr(''); setMpBank(''); setMpRef(''); setMpRemarks('');
                                          setMpError(null);
                                          setManualPayModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-muted transition-colors text-left border-t border-border font-medium"
                                      >
                                        <Wallet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Add Manual Payment
                                      </button>
                                    )}
                                    {isApproved && !isShortClosed && handleShortClosePO && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuPoNo(null);
                                          handleShortClosePO(po.po_no);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-muted transition-colors text-left font-medium"
                                      >
                                        <XCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Short Close PO
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        handleViewPOHistory(po);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left border-t border-border font-medium"
                                    >
                                      <History className="w-3.5 h-3.5 text-muted-foreground" /> View Audit Trail
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {hasMorePOs && (
              <div className="flex justify-center p-4 border-t border-border bg-muted/20">
                <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore} className="text-muted-foreground hover:text-foreground font-medium">
                  {loadingMore ? 'Loading...' : 'Load More Purchase Orders'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Slide-Over Inspection Drawer */}
      <PODetailsDrawer
        po={selectedPOForDrawer}
        isOpen={Boolean(selectedPOForDrawer)}
        onClose={() => setSelectedPOForDrawer(null)}
        call={call}
        canApprove={canApprove}
        canCreate={canCreate}
        isAdmin={isAdmin}
        handleOpenApproval={handleOpenApproval}
        handleSubmitForApproval={handleSubmitForApproval}
        handleOpenModal={handleOpenModal}
        handleViewPOHistory={handleViewPOHistory}
        handleSendPOEmail={handleSendPOEmail}
      />
    </Card>
  );
}
