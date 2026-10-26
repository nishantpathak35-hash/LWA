import React, { useState, useMemo } from 'react';
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import { History, CheckSquare, Edit3, Mail, Landmark, FileText, Layers, ArrowUpRight, Wallet } from 'lucide-react';
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
        <span className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 tracking-wider uppercase shrink-0" title="Mode: Cheque / PDC">
          <FileText className="w-2.5 h-2.5" /> CHQ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 tracking-wider uppercase shrink-0" title="Mode: NEFT">
        <Landmark className="w-2.5 h-2.5" /> {m || 'NEFT'}
      </span>
    );
  };

  const getStageBadge = (stage) => {
    const s = getPaymentStageKey(stage);
    if (s === 'remitted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Settled
        </span>
      );
    }
    if (s === 'pendingDirector') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> Director
        </span>
      );
    }
    if (s === 'pendingFinance') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Finance
        </span>
      );
    }
    if (['pending procurement', 'pending maker'].includes(String(stage || '').trim().toLowerCase())) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Procurement
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {stage}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
        {stage || 'Pending'}
      </span>
    );
  };

  // Compact currency formatter for smaller displays
  const compactCurrency = (val) => {
    const num = Number(val) || 0;
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    return formatCurrency(num);
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
            <div className="block md:hidden p-3 space-y-2.5">
              {processedRequests.map((req, idx) => {
                const relatedPO = poByNumber.get(req.po_no || req.poNo || req.po_number);
                const poValue = Number(relatedPO ? (relatedPO.po_value || relatedPO.poValue) : (req.po_value || 0));
                const paidAmount = Number(relatedPO ? (relatedPO.paid ?? relatedPO.legacy_paid ?? 0) : 0);
                const requestedAmt = Number(req.approved_amount ?? req.approvedAmount ?? req.amount_requested ?? req.gross_amount ?? req.amountRequested ?? 0);
                const approvedAmt = Number(req.approved_amount ?? req.approvedAmount ?? requestedAmt);
                const tdsAmt = Number(req.tds_amount || req.tdsAmount || 0);
                const netValue = Number(req.net_amount ?? req.net_payment_amount ?? Math.max(0, approvedAmt - tdsAmt));
                const balanceAmount = Math.max(0, poValue - paidAmount - netValue);
                const isChecked = selectedIds.has(req.id || req.pr_id);
                const canAct = canActOnReq(req);
                const reqStage = isPaymentSettled(req) ? 'Remitted' : req.stage || req.approval_stage || 'Pending';

                return (
                  <div key={req.id || req.pr_id || idx} className={`rounded-xl border ${isChecked ? 'border-primary bg-primary/5' : 'border-border/80 bg-card'} p-3.5 space-y-2.5 shadow-2xs transition-all`}>
                    {/* Row 1: ID, Mode, Status */}
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

                    {/* Row 2: Vendor & Project */}
                    <div>
                      <h4 className="font-bold text-foreground text-xs">{req.vendor_name || req.vendor}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{req.project || 'General'} • PO: <span className="font-mono font-semibold text-amber-700 dark:text-primary">{req.po_no || '—'}</span></p>
                    </div>

                    {/* Row 3: Financial Summary */}
                    <div className="grid grid-cols-3 gap-1.5 bg-muted/40 p-2.5 rounded-lg border border-border/60 text-[11px]">
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Net Amount</span>
                        <span className="font-bold text-foreground font-mono tabular-nums">{compactCurrency(netValue)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Paid / Budget</span>
                        <span className="font-medium text-muted-foreground font-mono tabular-nums text-[10px]">{compactCurrency(paidAmount)} / {compactCurrency(poValue)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 block">Balance</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">{compactCurrency(balanceAmount)}</span>
                      </div>
                    </div>

                    {/* Row 4: Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/60">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewHistory(req)} className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground">
                          <History className="w-3 h-3 mr-0.5" /> Trail
                        </Button>
                        {(isAdmin || isDirector || isFinance || String(reqStage).toLowerCase().includes('procurement') || String(reqStage).toLowerCase().includes('finance')) && onEditPayment && (
                          <Button variant="ghost" size="sm" onClick={() => onEditPayment(req)} className="h-6 px-1.5 text-[10px]">
                            Edit
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {getWorkflowActionButton && getWorkflowActionButton(req)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop View: Compact Financial Ledger ── */}
            <div className="hidden md:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-border/80 bg-muted/35 text-muted-foreground">
                    <TableHead className="w-8 text-center py-2.5 px-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-primary/30 cursor-pointer disabled:opacity-30"
                        aria-label="Select all actionable payments"
                        disabled={actionableRequests.length === 0}
                        checked={allSelected}
                        onChange={(e) => onSelectAll?.(e.target.checked)}
                      />
                    </TableHead>
                    <SortableHeader field="id" label="ID" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-16 pl-1.5" />
                    <SortableHeader field="vendor_name" label="Vendor / Project" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                    <SortableHeader field="payment_mode" label="Mode" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="center" className="w-16 text-center" />
                    <SortableHeader field="amount_requested" label="Net Amount" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} align="right" className="w-28" />
                    <TableHead className="text-right py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-xs tracking-wider text-slate-600 dark:text-slate-400">
                        <Wallet className="w-3 h-3" /> Paid / Budget
                      </span>
                    </TableHead>
                    <TableHead className="text-right py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-xs tracking-wider text-emerald-600 dark:text-emerald-400">
                        Balance
                      </span>
                    </TableHead>
                    <SortableHeader field="approval_stage" label="Status" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <TableHead className="text-right w-[180px] min-w-[180px] py-2.5 px-3 whitespace-nowrap font-semibold text-[11px] text-muted-foreground tracking-wide select-none">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((req, idx) => {
                    const relatedPO = poByNumber.get(req.po_no || req.poNo || req.po_number);
                    const poValue = Number(relatedPO ? (relatedPO.po_value || relatedPO.poValue) : (req.po_value || 0));
                    const paidAmount = Number(relatedPO ? (relatedPO.paid ?? relatedPO.legacy_paid ?? 0) : 0);
                    const paidPct = poValue > 0 ? ((paidAmount / poValue) * 100).toFixed(0) : '0';
                    const netAmount = Number(req.net_amount ?? req.approved_amount ?? req.approvedAmount ?? req.amount_requested ?? req.gross_amount ?? 0);
                    const balanceAmount = Math.max(0, poValue - paidAmount - netAmount);
                    const balancePct = poValue > 0 ? ((balanceAmount / poValue) * 100).toFixed(0) : '—';
                    const isSelected = selectedIds.has(req.id);
                    const isActionable = canActOnReq(req);
                    const reqStage = isPaymentSettled(req) ? 'Remitted' : req.stage || req.approval_stage || 'Pending';

                    return (
                      <TableRow
                        key={req.id || req.pr_id || idx}
                        className={`border-b border-border/50 hover:bg-muted/40 transition-colors duration-100 ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''} ${!isActionable ? 'opacity-80' : ''}`}
                      >
                        {/* Checkbox */}
                        <TableCell className="text-center py-2.5 px-2">
                          <input 
                            type="checkbox" 
                            className="rounded border-border text-primary focus:ring-primary/30 cursor-pointer disabled:opacity-30"
                            aria-label={`Select payment ${req.id || req.pr_id}`}
                            checked={isSelected}
                            onChange={() => isActionable && onSelectPayment?.(req.id)}
                            disabled={!isActionable}
                          />
                        </TableCell>

                        {/* ID + Date */}
                        <TableCell className="font-mono text-xs font-bold text-foreground py-2.5 pl-1.5">
                          <div className="flex flex-col">
                            <span>#{req.id}</span>
                            <span className="text-[10px] font-normal text-muted-foreground">{req.created_at ? formatDate(req.created_at) : ''}</span>
                          </div>
                        </TableCell>

                        {/* Vendor + Project + PO (merged) */}
                        <TableCell className="py-2.5 px-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-amber-700 dark:text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20 shrink-0 mt-0.5">
                              {(req.vendor_name || 'V').substring(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-foreground truncate" title={req.vendor_name || ''}>{req.vendor_name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                                <span className="truncate max-w-[80px]" title={req.project || 'General'}>{req.project || 'General'}</span>
                                <span className="text-border">·</span>
                                <a href={`/po/${encodeURIComponent(req.po_no)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-mono font-semibold text-amber-700 dark:text-primary hover:underline shrink-0" title={`Open PO ${req.po_no}`}>
                                  {req.po_no}
                                </a>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Mode */}
                        <TableCell className="text-center py-2.5 px-1.5 whitespace-nowrap">
                          {getPaymentModeBadge(req.payment_mode, req)}
                        </TableCell>

                        {/* Net Amount (this request) */}
                        <TableCell className="text-right tabular-nums whitespace-nowrap text-xs py-2.5 px-3">
                          <span className="font-mono font-bold text-foreground">
                            {formatCurrency(netAmount)}
                          </span>
                        </TableCell>

                        {/* Paid / Budget (compact) */}
                        <TableCell className="text-right tabular-nums whitespace-nowrap py-2.5 px-3">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs font-mono text-muted-foreground">
                              {compactCurrency(paidAmount)}
                              <span className="text-border mx-0.5">/</span>
                              {compactCurrency(poValue)}
                            </span>
                            {/* Micro progress bar */}
                            <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-blue-500/60 transition-all" 
                                style={{ width: `${Math.min(Number(paidPct), 100)}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground/70">{paidPct}% utilised</span>
                          </div>
                        </TableCell>

                        {/* Balance Amount */}
                        <TableCell className="text-right tabular-nums whitespace-nowrap py-2.5 px-3">
                          <div className="flex flex-col items-end">
                            <span className={`text-xs font-mono font-bold ${balanceAmount <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                              {formatCurrency(balanceAmount)}
                            </span>
                            {poValue > 0 && (
                              <span className={`text-[9px] font-mono ${balanceAmount <= 0 ? 'text-rose-500/70' : 'text-emerald-600/70 dark:text-emerald-400/70'}`}>
                                {balancePct}% remaining
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-2.5 px-3 whitespace-nowrap">
                          {getStageBadge(reqStage)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right w-[180px] min-w-[180px] py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {getWorkflowActionButton(req)}
                            
                            {(isAdmin || isDirector || isFinance || String(req.stage || req.approval_stage || '').toLowerCase().includes('procurement') || String(req.stage || req.approval_stage || '').toLowerCase().includes('finance')) && onEditPayment && (
                              <Button variant="ghost" size="icon" onClick={() => onEditPayment(req)} title="Edit Order Details" className="h-6 w-6 rounded-md text-muted-foreground hover:text-amber-700 dark:hover:text-primary hover:bg-primary/10">
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            )}

                            <Button variant="ghost" size="icon" onClick={() => handleViewHistory(req)} title="Audit Trail & Comments" className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                              <History className="w-3 h-3" />
                            </Button>
                            
                            {(String(req.stage || '').toLowerCase().trim() === 'remitted' || String(req.remittance || '').toLowerCase().trim() === 'remitted') && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleSendPaymentAdvice(req.id, 'email')} 
                                title="Send Payment Advice Email"
                                className="h-6 w-6 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Mail className="w-3 h-3" />
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
              <div className="p-3 border-t border-border flex justify-center">
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
