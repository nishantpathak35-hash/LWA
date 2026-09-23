import React, { useState, useMemo } from 'react';
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import { History, CheckSquare, Edit3, Mail, Landmark, FileText, ChevronRight, ChevronLeft, Layers, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
import SortableHeader from '../../ui/SortableHeader';
import { sortData } from '../../../app/lib/exportUtils';
import { getPaymentStageKey, isPaymentSettled } from '../../../app/lib/paymentStatus';

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

  const poByNumber = useMemo(() => new Map((pos || []).map(po => [po.po_no, po])), [pos]);
  const selectedIds = useMemo(() => new Set(selectedPayments), [selectedPayments]);
  const actionableRequests = processedRequests.filter(canActOnReq);
  const allSelected = actionableRequests.length > 0 && actionableRequests.every(req => selectedIds.has(req.id || req.pr_id));
  const [loadingMore, setLoadingMore] = useState(false);
  const tableContainerRef = React.useRef(null);

  const scrollContainer = (dir) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: dir === 'left' ? -380 : 380, behavior: 'smooth' });
    }
  };

  const renderScrollNavigator = () => (
    <div className="flex items-center justify-between px-3.5 py-1.5 bg-muted/40 border-b border-border/70 text-[11px] text-muted-foreground select-none">
      <div className="flex items-center gap-1.5">
        <ArrowLeftRight className="w-3 h-3 text-primary shrink-0" />
        <span>Operational Ledger (12 Columns): Scroll sideways or click arrows</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => scrollContainer('left')}
          className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-md"
          title="Scroll Left"
        >
          <ChevronLeft className="w-3 h-3" /> Left
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => scrollContainer('right')}
          className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-md"
          title="Scroll Right"
        >
          Right <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try { await loadMorePayments(); }
    finally { setLoadingMore(false); }
  };

  const getPaymentModeBadge = (mode, req) => {
    let m = String(mode || req?.payment_mode || req?.paymentMode || '').trim();
    if (!m) {
      const combined = `${req?.remarks || ''} ${req?.po_terms || ''} ${req?.po_notes || ''} ${req?.remittance_ref || ''}`.toLowerCase();
      if (combined.includes('cheque') || combined.includes('chq') || combined.includes('pdc')) {
        m = 'Cheque';
      } else {
        m = 'NEFT';
      }
    }
    const isCheque = m.toLowerCase().includes('cheque') || m.toLowerCase().includes('chq') || m.toLowerCase().includes('pdc');

    if (isCheque) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 tracking-wider uppercase shrink-0 shadow-2xs" title="Mode: Cheque / PDC">
          <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Cheque
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 tracking-wider uppercase shrink-0 shadow-2xs" title="Mode: Direct Bank Transfer (NEFT)">
        <Landmark className="w-3 h-3 text-sky-600 dark:text-sky-400" /> {m || 'NEFT'}
      </span>
    );
  };

  const getStageBadge = (stage) => {
    const s = getPaymentStageKey(stage);
    if (s === 'remitted') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Settled / Remitted
        </span>
      );
    }
    if (s === 'pendingDirector') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> Director Sign-off
        </span>
      );
    }
    if (s === 'pendingFinance') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Finance Review
        </span>
      );
    }
    if (['pending procurement', 'pending maker'].includes(String(stage || '').trim().toLowerCase())) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Procurement Check
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {stage}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
        {stage || 'Pending'}
      </span>
    );
  };

  return (
    <Card className="rounded-xl border-border/80 shadow-xs overflow-hidden bg-card">
      <CardContent className="p-0">
        {displayedRequests.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-sm font-medium space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground/60 shadow-2xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No payment requests pending approval</p>
              <p className="text-xs text-muted-foreground mt-0.5">All caught up! Approved orders and remittances are managed in Reports.</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Mobile View: Payment Cards ── */}
            <div className="block md:hidden p-3 space-y-3">
              {processedRequests.map((req, idx) => {
                const relatedPO = poByNumber.get(req.po_no || req.poNo || req.po_number);
                const poValue = Number(relatedPO ? (relatedPO.po_value || relatedPO.poValue) : (req.po_value || 0));
                const paidAmount = Number(relatedPO ? (relatedPO.paid ?? relatedPO.legacy_paid ?? 0) : 0);
                const requestedAmt = Number(req.approved_amount ?? req.approvedAmount ?? req.amount_requested ?? req.gross_amount ?? req.amountRequested ?? 0);
                const approvedAmt = Number(req.approved_amount ?? req.approvedAmount ?? requestedAmt);
                const tdsAmt = Number(req.tds_amount || req.tdsAmount || 0);
                const netValue = Number(req.net_amount ?? req.net_payment_amount ?? Math.max(0, approvedAmt - tdsAmt));
                const isChecked = selectedIds.has(req.id || req.pr_id);
                const canAct = canActOnReq(req);
                const reqStage = isPaymentSettled(req) ? 'Remitted' : req.stage || req.approval_stage || 'Pending';

                return (
                  <div key={req.id || req.pr_id || idx} className={`rounded-xl border ${isChecked ? 'border-primary bg-primary/5' : 'border-border/80 bg-card'} p-4 space-y-3 shadow-2xs transition-all`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {canAct && (
                          <input
                            type="checkbox"
                            aria-label={`Select payment ${req.id || req.pr_id}`}
                            checked={isChecked}
                            onChange={() => onSelectPayment?.(req.id || req.pr_id)}
                            className="rounded border-border text-primary focus:ring-primary/30"
                          />
                        )}
                        <span className="font-mono text-xs font-bold text-foreground">#{req.id || req.pr_id || req.sNo}</span>
                        {getPaymentModeBadge(req.payment_mode, req)}
                      </div>
                      <div>{getStageBadge(reqStage)}</div>
                    </div>

                    <div>
                      <h4 className="font-bold text-foreground text-xs">{req.vendor_name || req.vendor}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{req.project || 'General'} • PO: <span className="font-mono font-semibold text-amber-700 dark:text-primary">{req.po_no || '—'}</span></p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border border-border/60 text-[11px]">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Gross Claim</span>
                        <span className="font-medium text-foreground font-mono tabular-nums">{formatCurrency(requestedAmt)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Net Payable</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">{formatCurrency(netValue)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/60">
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => handleViewHistory(req)} className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground">
                          <History className="w-3 h-3 mr-1" /> Trail
                        </Button>
                        {(isAdmin || isDirector || isFinance || String(reqStage).toLowerCase().includes('procurement') || String(reqStage).toLowerCase().includes('finance')) && onEditPayment && (
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

            {/* ── Desktop View: Modern Financial Ledger Table ── */}
            <div className="hidden md:block">
              {renderScrollNavigator()}
              <Table containerRef={tableContainerRef} className="min-w-[1300px]">
                <TableHeader>
                  <TableRow className="border-b border-border/80 bg-muted/35 text-muted-foreground">
                    <TableHead className="sticky left-0 z-20 bg-muted/95 dark:bg-muted/95 backdrop-blur-xs w-10 text-center py-3.5 px-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-primary/30 cursor-pointer disabled:opacity-30"
                        aria-label="Select all actionable payments"
                        disabled={actionableRequests.length === 0}
                        checked={allSelected}
                        onChange={(e) => onSelectAll?.(e.target.checked)}
                      />
                    </TableHead>
                    <SortableHeader field="id" label="ID" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="sticky left-10 z-20 bg-muted/95 dark:bg-muted/95 backdrop-blur-xs w-16 pl-2 shadow-[4px_0_8px_rgba(0,0,0,0.04)] border-r border-border/60" />
                    <SortableHeader field="created_at" label="Date" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-24" />
                    <SortableHeader field="vendor_name" label="Vendor Partner" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[170px]" />
                    <SortableHeader field="project" label="Project" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[130px]" />
                    <SortableHeader field="po_no" label="PO Ref" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <SortableHeader field="payment_mode" label="Mode" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="center" className="w-24 text-center" />
                    <SortableHeader field="po_value" label="PO Budget" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="paid" label="Paid to Date" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="amount_requested" label="Net Amount" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <SortableHeader field="approval_stage" label="Status" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-36" />
                    <TableHead className="sticky right-0 z-20 bg-muted/95 dark:bg-muted/95 backdrop-blur-xs text-right w-[210px] min-w-[210px] py-3.5 px-4 whitespace-nowrap font-semibold text-[11px] text-muted-foreground tracking-wide select-none shadow-[-4px_0_8px_rgba(0,0,0,0.04)] border-l border-border/60">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((req, idx) => {
                    const relatedPO = poByNumber.get(req.po_no || req.poNo || req.po_number);
                    const poValue = Number(relatedPO ? (relatedPO.po_value || relatedPO.poValue) : (req.po_value || 0));
                    const paidAmount = Number(relatedPO ? (relatedPO.paid ?? relatedPO.legacy_paid ?? 0) : 0);
                    const paidPct = poValue > 0 ? ((paidAmount / poValue) * 100).toFixed(1) : '0.0';
                    const netAmount = Number(req.net_amount ?? req.approved_amount ?? req.approvedAmount ?? req.amount_requested ?? req.gross_amount ?? 0);
                    const reqPct = poValue > 0 ? ((netAmount / poValue) * 100).toFixed(1) : '0.0';
                    const isSelected = selectedIds.has(req.id);
                    const isActionable = canActOnReq(req);
                    const reqStage = isPaymentSettled(req) ? 'Remitted' : req.stage || req.approval_stage || 'Pending';

                    return (
                      <TableRow
                        key={req.id || req.pr_id || idx}
                        className={`border-b border-border/50 hover:bg-muted/40 transition-colors duration-150 ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''} ${!isActionable ? 'opacity-80' : ''}`}
                      >
                        <TableCell className="sticky left-0 z-10 bg-card/95 dark:bg-card/95 backdrop-blur-xs text-center py-3.5 px-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-border text-primary focus:ring-primary/30 cursor-pointer disabled:opacity-30"
                            aria-label={`Select payment ${req.id || req.pr_id}`}
                            checked={isSelected}
                            onChange={() => isActionable && onSelectPayment?.(req.id)}
                            disabled={!isActionable}
                          />
                        </TableCell>
                        <TableCell className="sticky left-10 z-10 bg-card/95 dark:bg-card/95 backdrop-blur-xs font-mono text-xs font-bold text-foreground py-3.5 pl-2 shadow-[4px_0_8px_rgba(0,0,0,0.04)] border-r border-border/40">
                          #{req.id}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3.5 px-3">
                          {req.created_at ? formatDate(req.created_at) : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground truncate max-w-[200px] py-3.5 px-3" title={req.vendor_name || ''}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-amber-700 dark:text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20 shrink-0">
                              {(req.vendor_name || 'V').substring(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate">{req.vendor_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[140px] py-3.5 px-3" title={req.project || ''}>
                          {req.project || 'General'}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-amber-700 dark:text-primary py-3.5 px-3">
                          <a href={`/po/${encodeURIComponent(req.po_no)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline flex items-center gap-1" title={`Open PO ${req.po_no}`}>
                            {req.po_no}
                          </a>
                        </TableCell>
                        <TableCell className="text-center py-3.5 px-2 whitespace-nowrap">
                          {getPaymentModeBadge(req.payment_mode, req)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-medium text-muted-foreground tabular-nums py-3.5 px-3">
                          {formatCurrency(poValue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap text-xs py-3.5 px-3">
                          <span className="font-mono font-medium text-foreground/80">
                            {formatCurrency(paidAmount)}
                          </span>
                          <span className="ml-1 text-[10px] font-mono text-muted-foreground/75">
                            ({paidPct}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap text-xs py-3.5 px-3">
                          <span className="font-mono font-bold text-foreground">
                            {formatCurrency(netAmount)}
                          </span>
                          <span className="ml-1 text-[10px] font-mono text-muted-foreground/75">
                            ({reqPct}%)
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-3 whitespace-nowrap">
                          {getStageBadge(reqStage)}
                        </TableCell>
                        <TableCell className="sticky right-0 z-10 bg-card/95 dark:bg-card/95 backdrop-blur-xs text-right w-[210px] min-w-[210px] py-3.5 px-4 whitespace-nowrap shadow-[-4px_0_8px_rgba(0,0,0,0.04)] border-l border-border/40">
                          <div className="flex items-center justify-end gap-1.5">
                            {getWorkflowActionButton(req)}
                            
                            {(isAdmin || isDirector || isFinance || String(req.stage || req.approval_stage || '').toLowerCase().includes('procurement') || String(req.stage || req.approval_stage || '').toLowerCase().includes('finance')) && onEditPayment && (
                              <Button variant="ghost" size="icon" onClick={() => onEditPayment(req)} title="Edit Order Details" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-amber-700 dark:hover:text-primary hover:bg-primary/10">
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            <Button variant="ghost" size="icon" onClick={() => handleViewHistory(req)} title="Audit Trail & Comments" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                              <History className="w-3.5 h-3.5" />
                            </Button>
                            
                            {(String(req.stage || '').toLowerCase().trim() === 'remitted' || String(req.remittance || '').toLowerCase().trim() === 'remitted') && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleSendPaymentAdvice(req.id, 'email')} 
                                title="Send Payment Advice Email"
                                className="h-7 w-7 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
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
              <div className="p-4 border-t border-border flex justify-center">
                <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore} className="text-xs">
                  {loadingMore ? 'Loading orders...' : 'Load More Orders'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
