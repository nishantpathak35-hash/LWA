import React from 'react';
import { Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import { ShieldCheck, ShieldAlert, History, Ban, CheckSquare, Eye, Mail } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../app/lib/utils';

export default function PaymentListTable({
  displayedRequests, handleViewHistory, handleOpenWorkflowModal, user, isAdmin, isFinance, isDirector, pos, getWorkflowActionButton, handleSendPaymentAdvice,
  selectedPayments = [], onSelectPayment, onSelectAll, canActOnReq
}) {
  const allSelected = displayedRequests.length > 0 && selectedPayments.length === displayedRequests.filter(canActOnReq).length;

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-700 bg-slate-900 text-gold focus:ring-gold/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      checked={allSelected}
                      onChange={(e) => onSelectAll?.(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead className="text-right">PO Amount</TableHead>
                  <TableHead className="text-right">Net Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedRequests.map((req, idx) => {
                  const relatedPO = pos.find(p => p.po_no === req.po_no || p.po_no === req.poNo || p.po_no === req.po_number);
                  const poValue = relatedPO ? relatedPO.po_value : 0;
                  const isSelected = selectedPayments.includes(req.id);
                  const isActionable = canActOnReq(req);
                  return (
                    <TableRow key={idx} className={`${isSelected ? 'bg-gold/5' : ''} ${!isActionable ? 'opacity-60 bg-slate-950/40' : ''}`}>
                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-700 bg-slate-900 text-gold focus:ring-gold/50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          checked={isSelected}
                          onChange={() => isActionable && onSelectPayment?.(req.id)}
                          disabled={!isActionable}
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-slate-400">#{req.id}</TableCell>
                      <TableCell>{req.project || '—'}</TableCell>
                      <TableCell className="font-medium text-slate-200">{req.vendor_name}</TableCell>
                      <TableCell className="font-mono text-xs">{req.po_no}</TableCell>
                      <TableCell className="text-right">{formatCurrency(poValue)}</TableCell>
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
                      {/* Payment Advice — ONLY for successfully remitted payments, NEVER for rejected */}
                      {(String(req.stage || '').toLowerCase().trim() === 'remitted' || String(req.remittance || '').toLowerCase().trim() === 'remitted') && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleSendPaymentAdvice(req.id)} 
                          title="Send Payment Advice Email"
                          className="text-gold hover:text-gold/80"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </>
  );
}
