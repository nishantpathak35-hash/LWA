import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Input } from '../../ui/core';
import { Search, ChevronDown, ChevronUp, Eye, Send, Edit2, Clock, CheckCircle, XCircle, Copy, Trash2, Wallet, History, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../app/lib/utils';

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
  const [loadingMore, setLoadingMore] = React.useState(false);
  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadMorePOs();
    setLoadingMore(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-6">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PO Database ({filteredPOs.length})</CardTitle>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="text" placeholder="Search PO, Project, Vendor..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="pl-9 text-xs py-1.5 h-8 bg-card" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredPOs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm font-medium">No purchase orders found.</div>
        ) : (
          <>
            {/* ── Mobile View: Cards Layout ── */}
            <div className="block md:hidden p-3 space-y-3">
              {filteredPOs.map((po, idx) => {
                const st = String(po.status || po.approval_status || 'Draft').toLowerCase();
                const isDraft    = st === 'draft';
                const isPending  = st === 'pending approval' || st === 'pending_approval';
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
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                      <Button variant="ghost" size="sm" onClick={() => handleViewPOHistory(po)} className="h-7 text-[11px] text-slate-400 hover:text-slate-200">
                        <MessageSquare className="w-3 h-3 mr-1" /> History
                      </Button>
                      {canCreate && (isDraft || isApproved || isRejected) && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(po.po_no)} className="h-7 text-[11px]">
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      )}
                      {isApproved && !isShortClosed && handleShortClosePO && (
                        <Button variant="ghost" size="sm" onClick={() => handleShortClosePO(po.po_no)} className="h-7 text-[11px] text-amber-500 hover:text-amber-400">
                          <XCircle className="w-3 h-3 mr-1" /> Close
                        </Button>
                      )}
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
                    <TableHead className="w-32 py-3 px-4 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">PO Number</TableHead>
                    <TableHead className="w-28 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">
                      <button
                        type="button"
                        onClick={() => setPoDateSortDir(dir => dir === 'desc' ? 'asc' : 'desc')}
                        className="inline-flex items-center gap-1 text-left font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      >
                        PO Date {poDateSortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                      </button>
                    </TableHead>
                    <TableHead className="min-w-[180px] py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Vendor</TableHead>
                    <TableHead className="min-w-[140px] py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Project</TableHead>
                    <TableHead className="w-28 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Status</TableHead>
                    <TableHead className="w-28 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Payment</TableHead>
                    <TableHead className="text-right py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">PO Value</TableHead>
                    <TableHead className="text-right py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Paid Amount</TableHead>
                    <TableHead className="text-right py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Balance</TableHead>
                    <TableHead className="text-center w-24 py-3 px-4 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.map((po, idx) => {
                    const st = String(po.status || po.approval_status || 'Draft').toLowerCase();
                    const isDraft    = st === 'draft';
                    const isPending  = st === 'pending approval' || st === 'pending_approval';
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
                                    {!isPending && (
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
                                    )}
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
