import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Input } from '../../ui/core';
import { Search, ChevronDown, ChevronUp, Eye, Send, Edit2, Clock, CheckCircle, XCircle, Copy, Trash2, Wallet, History, MessageSquare, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
import SortableHeader from '../../ui/SortableHeader';
import { exportToCSV, sortData } from '../../../app/lib/exportUtils';

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
  hasMorePOs, loadMorePOs
}) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortField, setSortField] = useState('po_date');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedPOs = useMemo(() => {
    return sortData(filteredPOs || [], sortField, sortDir);
  }, [filteredPOs, sortField, sortDir]);

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
    exportToCSV('Purchase_Orders_Database.csv', columns, sortedPOs);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadMorePOs();
    setLoadingMore(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-6">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          PO Database ({sortedPOs.length})
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs font-medium">
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Export CSV
          </Button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="text" placeholder="Search PO, Project, Vendor..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pl-9 text-xs py-1.5 h-8 bg-card" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sortedPOs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm font-medium">No purchase orders found.</div>
        ) : (
          <>
            {/* ── Mobile View: Cards Layout ── */}
            <div className="block md:hidden p-3 space-y-3">
              {sortedPOs.map((po, idx) => {
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
                  <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <a href={`/po/${encodeURIComponent(po.po_no)}`} target="_blank" rel="noreferrer" className="font-mono text-xs font-semibold text-amber-500 hover:underline">
                        {po.po_no}
                      </a>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(po.status || po.approval_status)}
                        {getPaymentStatusBadge(po.payment_status)}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-100 text-xs">{po.vendor_name || po.vendor_key}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{po.project} • {formatDate(po.po_date)}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <div className="flex justify-between text-[11px] font-medium tabular-nums">
                        <span className="text-slate-400">PO: {formatCurrency(poValue)}</span>
                        <span className="text-emerald-400">Paid: {formatCurrency(paid)} ({paidPct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${paidPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                        <span>Balance:</span>
                        <span className="font-medium text-slate-200 tabular-nums">{formatCurrency(calcBalance)}</span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => handleViewPOHistory(po)} className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-200">
                          <MessageSquare className="w-3 h-3 mr-1" /> Trail
                        </Button>
                        <a href={`/po/${encodeURIComponent(po.po_no)}`} target="_blank" rel="noreferrer" className="inline-flex items-center h-7 px-2 text-[11px] font-medium text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800/50">
                          <Eye className="w-3 h-3 mr-1" /> View
                        </a>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {canCreate && (isDraft || isRejected) && (
                          <Button variant="primary" size="sm" onClick={() => handleSubmitForApproval(po.po_no)} className="h-7 px-2.5 text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-medium">
                            <Clock className="w-3 h-3 mr-1" /> Submit
                          </Button>
                        )}
                        {canApprove && isPending && (
                          <>
                            <Button variant="primary" size="sm" onClick={() => handleOpenApproval(po, 'approve')} className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                              <CheckCircle className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleOpenApproval(po, 'reject')} className="h-7 px-2.5 text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-medium">
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {canCreate && (isDraft || isPending || isApproved || isRejected) && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(po.po_no)} className="h-7 px-2 text-[11px]">
                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        )}
                        {isApproved && !isShortClosed && handleShortClosePO && (
                          <Button variant="ghost" size="sm" onClick={() => handleShortClosePO(po.po_no)} className="h-7 px-2 text-[11px] text-amber-500 hover:text-amber-400">
                            <XCircle className="w-3 h-3 mr-1" /> Close
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* ── Desktop View: Table ── */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-slate-50/70 dark:bg-slate-900/50">
                    <SortableHeader field="po_no" label="PO Number" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-32" />
                    <SortableHeader field="po_date" label="PO Date" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <SortableHeader field="vendor_name" label="Vendor" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                    <SortableHeader field="project" label="Project" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[140px]" />
                    <SortableHeader field="status" label="Status" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <SortableHeader field="payment_status" label="Payment" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <SortableHeader field="po_value" label="PO Value" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="paid" label="Paid Amount" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="balance" label="Balance" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <TableHead className="text-center w-24 py-3 px-4 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPOs.map((po, idx) => {
                    const st = String(po.status || po.approval_status || 'Draft').toLowerCase();
                    const isDraft    = st === 'draft';
                    const isPending  = st === 'pending approval' || st === 'pending_approval' || st === 'pending' || st.includes('pending') || st.includes('submitted') || st === 'under approval';
                    const isApproved = st === 'approved' || st === 'active';
                    const isRejected = st === 'rejected';
                    const isShortClosed = st === 'short closed' || st === 'short_closed' || st === 'closed';
                    const calcBalance  = isShortClosed ? 0 : Math.max(0, Number(po.po_value || 0) - Number(po.paid || 0));
                    return (
                      <TableRow key={idx} className="border-b border-border/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150">
                        <TableCell className="px-4 py-3 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                          <a href={`/po/${encodeURIComponent(po.po_no)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={`Open PO ${po.po_no}`}>
                            {po.po_no}
                          </a>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap">{formatDate(po.po_date)}</TableCell>
                        <TableCell className="px-3 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[220px]" title={po.vendor_name || po.vendor_key}>{po.vendor_name || po.vendor_key}</TableCell>
                        <TableCell className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 font-normal truncate max-w-[180px]" title={po.project || ''}>{po.project || '—'}</TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap">{getStatusBadge(po.status || po.approval_status)}</TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap">{getPaymentStatusBadge(po.payment_status)}</TableCell>
                        <TableCell className="px-3 py-3 text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums text-xs">{formatCurrency(Number(po.po_value || 0))}</TableCell>
                        <TableCell className="px-3 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums text-xs">{formatCurrency(Number(po.paid || 0))}</TableCell>
                        <TableCell className="px-3 py-3 text-right font-medium text-slate-700 dark:text-slate-300 tabular-nums text-xs">{formatCurrency(calcBalance)}</TableCell>
                        <TableCell className="px-4 py-3 text-center relative">
                          <div className="flex justify-center items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPOHistory(po);
                              }}
                              title="Discussion & Team Activity Thread"
                              className="h-7 w-7 text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                            <div className="relative inline-block text-left">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuPoNo(openActionMenuPoNo === po.po_no ? null : po.po_no);
                                }}
                                className="flex items-center gap-1 h-7 text-xs px-2.5 bg-muted/40 hover:bg-muted border border-border/80 rounded-md font-medium text-foreground"
                              >
                                Actions <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              </Button>
                              {openActionMenuPoNo === po.po_no && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuPoNo(null)} />
                                  <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-card shadow-xl py-1 z-20 animate-fade-in flex flex-col text-foreground">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        window.open(`/po/${encodeURIComponent(po.po_no)}`, '_blank');
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors text-left font-medium"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-muted-foreground" /> Print / View PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        if (handleSendPOEmail) handleSendPOEmail(po.po_no);
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors text-left font-medium"
                                    >
                                      <Send className="w-3.5 h-3.5 text-muted-foreground" /> Email PO
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
                                       <History className="w-3.5 h-3.5 text-muted-foreground" /> View History
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
    </Card>
  );
}
