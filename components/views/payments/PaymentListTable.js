import React, { useState, useMemo } from 'react';
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import { ShieldCheck, ShieldAlert, History, Ban, CheckSquare, Eye, Mail, MessageSquare, IndianRupee, Layers } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
import { getPaymentPriorityScore } from '../../../app/lib/paymentAI';
import SortableHeader from '../../ui/SortableHeader';
import { sortData } from '../../../app/lib/exportUtils';

export default function PaymentListTable({
  displayedRequests, handleViewHistory, handleOpenWorkflowModal, user, isAdmin, isFinance, isDirector, pos, getWorkflowActionButton, handleSendPaymentAdvice,
  selectedPayments = [], onSelectPayment, onSelectAll, canActOnReq, onEditPayment,
  hasMorePayments, loadMorePayments
}) {
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const processedRequests = useMemo(() => {
    return sortData(displayedRequests || [], sortField, sortDir);
  }, [displayedRequests, sortField, sortDir]);

  const allSelected = processedRequests.length > 0 && selectedPayments.length === processedRequests.filter(canActOnReq).length;
  const [loadingMore, setLoadingMore] = useState(false);
  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadMorePayments();
    setLoadingMore(false);
  };

  const getStageBadge = (stage) => {
    const s = String(stage || '').toLowerCase();
    if (s.includes('remit') || s.includes('paid')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Settled / Remitted
        </span>
      );
    }
    if (s.includes('director')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> Director Sign-off
        </span>
      );
    }
    if (s.includes('finance')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Finance Review
        </span>
      );
    }
    if (s.includes('procurement') || s.includes('maker')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Procurement Check
        </span>
      );
    }
    if (s.includes('reject')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
        {stage || 'Pending'}
      </span>
    );
  };

  return (
    <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
      <CardContent className="p-0">
        {displayedRequests.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm font-medium space-y-2">
            <Layers className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p>No payment requests found matching your filters.</p>
          </div>
        ) : (
          <>
            {/* ── Mobile View: Payment Cards ── */}
            <div className="block md:hidden p-3 space-y-3">
              {displayedRequests.map((req, idx) => {
                const relatedPO = pos.find(p => p.po_no === req.po_no || p.po_no === req.poNo || p.po_no === req.po_number);
                const poValue = Number(relatedPO ? (relatedPO.po_value || relatedPO.poValue) : (req.po_value || 0));
                const paidAmount = Number(relatedPO ? (relatedPO.paid ?? relatedPO.legacy_paid ?? 0) : 0);
                const requestedAmt = Number(req.amount_requested || req.gross_amount || req.amountRequested || 0);
                const approvedAmt = Number(req.approved_amount ?? req.approvedAmount ?? requestedAmt);
                const tdsAmt = Number(req.tds_amount || req.tdsAmount || 0);
                const netValue = Math.max(0, approvedAmt - tdsAmt);
                const isChecked = selectedPayments.includes(req.id || req.pr_id);
                const canAct = canActOnReq(req);
                const reqStage = req.approval_stage || req.stage || 'Pending';

                return (
                  <div key={idx} className={`rounded-xl border ${isChecked ? 'border-amber-500 bg-amber-500/5' : 'border-border bg-card'} p-4 space-y-3 shadow-xs transition-colors`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {canAct && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onSelectPayment?.(req.id || req.pr_id)}
                            className="rounded border-border text-amber-500 focus:ring-amber-500/30"
                          />
                        )}
                        <span className="font-mono text-xs font-bold text-foreground">#{req.id || req.pr_id || req.sNo}</span>
                      </div>
                      <div>{getStageBadge(reqStage)}</div>
                    </div>

                    <div>
                      <h4 className="font-bold text-foreground text-xs">{req.vendor_name || req.vendor}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{req.project || 'General'} • PO: <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{req.po_no || '—'}</span></p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-xl border border-border text-[11px]">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Gross Claim</span>
                        <span className="font-medium text-foreground font-mono tabular-nums">{formatCurrency(requestedAmt)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Net Payable</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{formatCurrency(netValue)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => handleViewHistory(req)} className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground">
                          <History className="w-3 h-3 mr-1" /> Trail
                        </Button>
                        {(String(reqStage).toLowerCase().includes('procurement') || String(reqStage).toLowerCase().includes('finance')) && onEditPayment && (
                          <Button variant="ghost" size="sm" onClick={() => onEditPayment(req)} className="h-7 px-2 text-[11px]">
                            Edit
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getWorkflowActionButton && getWorkflowActionButton(req)}
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
                    <TableHead className="w-10 text-center py-3.5 px-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-amber-600 focus:ring-amber-500/30 cursor-pointer disabled:opacity-30"
                        checked={allSelected}
                        onChange={(e) => onSelectAll?.(e.target.checked)}
                      />
                    </TableHead>
                    <SortableHeader field="id" label="ID" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-16 pl-2" />
                    <SortableHeader field="created_at" label="Date" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-24" />
                    <SortableHeader field="vendor_name" label="Vendor Partner" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[170px]" />
                    <SortableHeader field="project" label="Project" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[130px]" />
                    <SortableHeader field="po_no" label="PO Reference" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <SortableHeader field="po_value" label="PO Budget" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="paid" label="Paid To Date" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="amount_requested" label="Net Amount" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="approval_stage" label="Approval Stage" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-36" />
                    <TableHead className="text-center w-28 py-3 px-3 font-medium text-[11px] text-muted-foreground tracking-wide select-none">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((req, idx) => {
                    const relatedPO = pos.find(p => p.po_no === req.po_no || p.po_no === req.poNo || p.po_no === req.po_number);
                    const poValue = Number(relatedPO ? (relatedPO.po_value || relatedPO.poValue) : (req.po_value || 0));
                    const paidAmount = Number(relatedPO ? (relatedPO.paid ?? relatedPO.legacy_paid ?? 0) : 0);
                    const paidPct = poValue > 0 ? ((paidAmount / poValue) * 100).toFixed(1) : '0.0';
                    const netAmount = Number(req.net_amount ?? req.amount_requested ?? req.gross_amount ?? 0);
                    const reqPct = poValue > 0 ? ((netAmount / poValue) * 100).toFixed(1) : '0.0';
                    const isSelected = selectedPayments.includes(req.id);
                    const isActionable = canActOnReq(req);
                    const reqStage = req.approval_stage || req.stage || 'Pending';

                    return (
                      <TableRow
                        key={idx}
                        className={`border-b border-border/40 hover:bg-muted/30 transition-colors duration-150 ${isSelected ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : ''} ${!isActionable ? 'opacity-70' : ''}`}
                      >
                        <TableCell className="text-center py-3.5 px-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-border text-amber-600 focus:ring-amber-500/30 cursor-pointer disabled:opacity-30"
                            checked={isSelected}
                            onChange={() => isActionable && onSelectPayment?.(req.id)}
                            disabled={!isActionable}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-foreground py-3.5 pl-2">
                          #{req.id}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3.5 px-3">
                          {req.created_at ? formatDate(req.created_at) : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground truncate max-w-[200px] py-3.5 px-3" title={req.vendor_name || ''}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/20 shrink-0">
                              {(req.vendor_name || 'V').substring(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate">{req.vendor_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[140px] py-3.5 px-3" title={req.project || ''}>
                          {req.project || 'General'}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 py-3.5 px-3">
                          <a href={`/po/${encodeURIComponent(req.po_no)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={`Open PO ${req.po_no}`}>
                            {req.po_no}
                          </a>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-medium text-muted-foreground tabular-nums py-3.5 px-3">
                          {formatCurrency(poValue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap text-xs py-3.5 px-3">
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(paidAmount)}
                          </span>
                          <span className="ml-1 text-[10px] font-mono text-muted-foreground">
                            ({paidPct}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap text-xs py-3.5 px-3">
                          <span className="font-mono font-bold text-foreground">
                            {formatCurrency(netAmount)}
                          </span>
                          <span className="ml-1 text-[10px] font-mono text-muted-foreground">
                            ({reqPct}%)
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-3 whitespace-nowrap">
                          {getStageBadge(reqStage)}
                          {String(req.status || '').toLowerCase() === 'pending' && getPaymentPriorityScore(req) !== null && (
                            <div className="mt-1">
                              <Badge variant={getPaymentPriorityScore(req) > 75 ? 'success' : getPaymentPriorityScore(req) < 40 ? 'error' : 'secondary'} className="text-[10px] py-0 px-1 border-dashed">
                                ⚡ AI Priority: {getPaymentPriorityScore(req)}%
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-3.5 px-3">
                          <div className="flex items-center justify-center gap-1">
                            {getWorkflowActionButton(req)}
                            
                            {(String(req.stage || req.approval_stage || '').toLowerCase().includes('procurement') || String(req.stage || req.approval_stage || '').toLowerCase().includes('finance')) && onEditPayment && (
                              <Button variant="ghost" size="icon" onClick={() => onEditPayment(req)} title="Edit Payment Request" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                <CheckSquare className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            <Button variant="ghost" size="icon" onClick={() => handleViewHistory(req)} title="Discussion & Team Activity Thread" className="h-7 w-7 text-muted-foreground hover:text-amber-500">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleViewHistory(req)} title="View Logs Trail" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <History className="w-3.5 h-3.5" />
                            </Button>
                            {(String(req.stage || '').toLowerCase().trim() === 'remitted' || String(req.remittance || '').toLowerCase().trim() === 'remitted') && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleSendPaymentAdvice(req.id, 'email')} 
                                title="Send Payment Advice Email"
                                className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:text-amber-700"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {hasMorePayments && (
              <div className="flex justify-center p-4 border-t border-border bg-muted/20">
                <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore} className="text-muted-foreground hover:text-foreground font-medium">
                  {loadingMore ? 'Loading...' : 'Load More Payments'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
