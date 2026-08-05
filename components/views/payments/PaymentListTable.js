import React from 'react';
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import { ShieldCheck, ShieldAlert, History, Ban, CheckSquare, Eye, Mail, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
import { getPaymentPriorityScore } from '../../../app/lib/paymentAI';

export default function PaymentListTable({
  displayedRequests, handleViewHistory, handleOpenWorkflowModal, user, isAdmin, isFinance, isDirector, pos, getWorkflowActionButton, handleSendPaymentAdvice,
  selectedPayments = [], onSelectPayment, onSelectAll, canActOnReq, onEditPayment,
  hasMorePayments, loadMorePayments
}) {
  const allSelected = displayedRequests.length > 0 && selectedPayments.length === displayedRequests.filter(canActOnReq).length;
  const [loadingMore, setLoadingMore] = React.useState(false);
  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadMorePayments();
    setLoadingMore(false);
  };

  return (
    <>
      {/* Requests Table Card */}
      <Card>
        <CardContent className="p-0">
          {displayedRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-light">
              No payment requests found matching your filters.
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
                    <div key={idx} className={`rounded-xl border ${isChecked ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-900/40'} p-3.5 space-y-2.5 transition-colors`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {canAct && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => onSelectPayment?.(req.id || req.pr_id)}
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/30"
                            />
                          )}
                          <span className="font-mono text-xs font-semibold text-slate-200">#{req.id || req.pr_id || req.sNo}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          reqStage.includes('Approved') || reqStage.includes('Remitted') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          reqStage.includes('Rejected') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {reqStage}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-100 text-xs">{req.vendor_name || req.vendor}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{req.project || '—'} • PO: <span className="font-mono text-amber-500">{req.po_no || '—'}</span></p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 text-[11px]">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">Requested</span>
                          <span className="font-medium text-slate-300 tabular-nums">{formatCurrency(requestedAmt)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">Net Payable</span>
                          <span className="font-semibold text-slate-100 tabular-nums">{formatCurrency(netValue)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                        <Button variant="ghost" size="sm" onClick={() => handleViewHistory(req)} className="h-7 text-[11px] text-slate-400 hover:text-slate-200">
                          <History className="w-3 h-3 mr-1" /> Trail
                        </Button>
                        {(String(reqStage).toLowerCase().includes('procurement') || String(reqStage).toLowerCase().includes('finance')) && onEditPayment && (
                          <Button variant="ghost" size="sm" onClick={() => onEditPayment(req)} className="h-7 text-[11px]">
                            Edit
                          </Button>
                        )}
                        {canAct && getWorkflowActionButton && getWorkflowActionButton(req)}
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
                    <TableHead className="w-10 text-center py-3 px-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 dark:border-slate-700 text-amber-600 dark:text-amber-500 focus:ring-amber-500/30 cursor-pointer disabled:opacity-30"
                        checked={allSelected}
                        onChange={(e) => onSelectAll?.(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead className="w-16 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">ID</TableHead>
                    <TableHead className="w-24 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Date</TableHead>
                    <TableHead className="min-w-[140px] py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Vendor</TableHead>
                    <TableHead className="min-w-[130px] py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Project</TableHead>
                    <TableHead className="w-28 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">PO Number</TableHead>
                    <TableHead className="text-right py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">PO Amount</TableHead>
                    <TableHead className="text-right py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Paid Amount</TableHead>
                    <TableHead className="text-right py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Net Value</TableHead>
                    <TableHead className="w-28 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Status</TableHead>
                    <TableHead className="w-32 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Current Stage</TableHead>
                    <TableHead className="text-center w-28 py-3 px-3 font-medium text-[11px] text-slate-500 dark:text-slate-400 tracking-wide select-none">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRequests.map((req, idx) => {
                    const relatedPO = pos.find(p => p.po_no === req.po_no || p.po_no === req.poNo || p.po_no === req.po_number);
                    const poValue = Number(relatedPO ? (relatedPO.po_value || relatedPO.poValue) : (req.po_value || 0));
                    const paidAmount = Number(relatedPO ? (relatedPO.paid ?? relatedPO.legacy_paid ?? 0) : 0);
                    const paidPct = poValue > 0 ? ((paidAmount / poValue) * 100).toFixed(1) : '0.0';
                    const netAmount = Number(req.net_amount ?? req.amount_requested ?? req.gross_amount ?? 0);
                    const reqPct = poValue > 0 ? ((netAmount / poValue) * 100).toFixed(1) : '0.0';
                    const isSelected = selectedPayments.includes(req.id);
                    const isActionable = canActOnReq(req);
                    return (
                      <TableRow key={idx} className={`border-b border-border/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150 ${isSelected ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : ''} ${!isActionable ? 'opacity-60' : ''}`}>
                        <TableCell className="text-center py-3 px-2">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 dark:border-slate-700 text-amber-600 dark:text-amber-500 focus:ring-amber-500/30 cursor-pointer disabled:opacity-30"
                            checked={isSelected}
                            onChange={() => isActionable && onSelectPayment?.(req.id)}
                            disabled={!isActionable}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 py-3 px-3">#{req.id}</TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap py-3 px-3">{req.created_at ? formatDate(req.created_at) : '—'}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px] py-3 px-3" title={req.vendor_name || ''}>{req.vendor_name}</TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-normal truncate max-w-[160px] py-3 px-3" title={req.project || ''}>{req.project || '—'}</TableCell>
                        <TableCell className="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors py-3 px-3">
                          <a href={`/po/${encodeURIComponent(req.po_no)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={`Open PO ${req.po_no}`}>
                            {req.po_no}
                          </a>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums py-3 px-3">{formatCurrency(poValue)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap text-xs py-3 px-3">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(paidAmount)}
                          </span>
                          <span className="ml-1 text-[10px] font-normal text-slate-400 dark:text-slate-500">
                            ({paidPct}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap text-xs py-3 px-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(netAmount)}
                          </span>
                          <span className="ml-1 text-[10px] font-normal text-slate-400 dark:text-slate-500">
                            ({reqPct}%)
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-3 whitespace-nowrap">
                          <Badge
                            variant={
                              req.query_status === 'hold'
                                ? 'warning'
                                : String(req.status || '').toLowerCase().includes('remitted')
                                ? 'success'
                                : String(req.status || '').toLowerCase().includes('reject')
                                ? 'error'
                                : 'pending'
                            }
                          >
                            {req.query_status === 'hold' ? 'Query Hold' : (req.status || 'Pending')}
                          </Badge>
                          {String(req.status || '').toLowerCase() === 'pending' && getPaymentPriorityScore(req) !== null && (
                            <div className="mt-1">
                              <Badge variant={getPaymentPriorityScore(req) > 75 ? 'success' : getPaymentPriorityScore(req) < 40 ? 'error' : 'secondary'} className="text-[10px] py-0 px-1 border-dashed">
                                ⚡ AI Priority: {getPaymentPriorityScore(req)}%
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-medium py-3 px-3">{req.approval_stage || 'Completed'}</TableCell>
                        <TableCell className="text-center py-3 px-3">
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

    </>
  );
}
