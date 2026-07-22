import React from 'react';
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import { ShieldCheck, ShieldAlert, History, Ban, CheckSquare, Eye, Mail } from 'lucide-react';
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 dark:border-slate-700 text-amber-600 dark:text-gold focus:ring-amber-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        checked={allSelected}
                        onChange={(e) => onSelectAll?.(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead className="text-right">PO Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Net Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Stage</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
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
                      <TableRow key={idx} className={`${isSelected ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-l-amber-600 dark:border-l-gold' : ''} ${!isActionable ? 'opacity-65 bg-muted/30' : ''}`}>
                        <TableCell className="text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 dark:border-slate-700 text-amber-600 dark:text-gold focus:ring-amber-500/30 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            checked={isSelected}
                            onChange={() => isActionable && onSelectPayment?.(req.id)}
                            disabled={!isActionable}
                          />
                        </TableCell>
                        <TableCell className="font-bold text-xs text-muted-foreground">#{req.id}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">{req.created_at ? formatDate(req.created_at) : '—'}</TableCell>
                        <TableCell className="font-medium text-foreground text-sm">{req.project || '—'}</TableCell>
                        <TableCell className="font-bold text-foreground text-sm">{req.vendor_name}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer" title="View Purchase Order">
                          <a href={`/po/${encodeURIComponent(req.po_no)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                            {req.po_no}
                          </a>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground font-medium tabular-nums">{formatCurrency(poValue)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                            {formatCurrency(paidAmount)}
                          </span>
                          <span className="ml-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400/80">
                            ({paidPct}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          <span className="font-bold text-foreground text-sm">
                            {formatCurrency(netAmount)}
                          </span>
                          <span className="ml-1 text-[11px] font-semibold text-amber-700 dark:text-gold">
                            ({reqPct}%)
                          </span>
                        </TableCell>
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
                        {String(req.status || '').toLowerCase() === 'pending' && getPaymentPriorityScore(req) !== null && (
                          <div className="mt-1">
                            <Badge variant={getPaymentPriorityScore(req) > 75 ? 'success' : getPaymentPriorityScore(req) < 40 ? 'error' : 'secondary'} className="text-[10px] py-0 px-1 border-dashed">
                              ⚡ AI Priority: {getPaymentPriorityScore(req)}%
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">{req.approval_stage || 'Completed'}</TableCell>
                        <TableCell className="text-center flex items-center justify-center gap-1.5">
                        {getWorkflowActionButton(req)}
                        
                        {/* Edit Button - only for pre-approval stages */}
                        {(String(req.stage || req.approval_stage || '').toLowerCase().includes('procurement') || String(req.stage || req.approval_stage || '').toLowerCase().includes('finance')) && onEditPayment && (
                          <Button variant="ghost" size="icon" onClick={() => onEditPayment(req)} title="Edit Payment Request">
                            <CheckSquare className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        )}
 
                        <Button variant="ghost" size="icon" onClick={() => handleViewHistory(req)} title="View Logs Trail">
                          <History className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        {/* Payment Advice — ONLY for successfully remitted payments, NEVER for rejected */}
                        {(String(req.stage || '').toLowerCase().trim() === 'remitted' || String(req.remittance || '').toLowerCase().trim() === 'remitted') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleSendPaymentAdvice(req.id, 'email')} 
                            title="Send Payment Advice Email"
                            className="text-amber-700 dark:text-gold hover:text-amber-800"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
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
