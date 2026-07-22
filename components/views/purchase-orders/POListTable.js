import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Input } from '../../ui/core';
import { Search, ChevronDown, ChevronUp, Eye, Send, Edit2, Clock, CheckCircle, XCircle, Copy, Trash2, Wallet, History } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../app/lib/utils';

export default function POListTable({
  filteredPOs,
  searchQuery, setSearchQuery,
  poDateSortDir, setPoDateSortDir,
  openActionMenuPoNo, setOpenActionMenuPoNo,
  canCreate, canApprove, canManualPay, isAdmin,
  handleOpenModal, handleSubmitForApproval, handleOpenApproval, handleDuplicatePO, handleDeletePO,
  reloadPayments, setMpDate, setMpAmount, setMpMode, setMpUtr, setMpBank, setMpRef, setMpRemarks, setMpError, setManualPayModalOpen, setEditingPoNo,
  handleViewPOHistory,
  handleSendPOWhatsApp, handleSendPOEmail,
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
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">PO DATABASE ({filteredPOs.length})</CardTitle>
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
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO No</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => setPoDateSortDir(dir => dir === 'desc' ? 'asc' : 'desc')}
                    className="inline-flex items-center gap-1 text-left uppercase font-bold"
                  >
                    P.O. Date {poDateSortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </button>
                </TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">PO Value</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.map((po, idx) => {
                const st = String(po.status || po.approval_status || 'Draft').toLowerCase();
                const isDraft    = st === 'draft';
                const isPending  = st === 'pending approval' || st === 'pending_approval';
                const isApproved = st === 'approved' || st === 'active';
                const isRejected = st === 'rejected';
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer" title="View PO Details">
                      <a href={`/po/${encodeURIComponent(po.po_no)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        {po.po_no}
                      </a>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">{formatDate(po.po_date)}</TableCell>
                    <TableCell className="font-medium text-foreground text-sm">{po.project}</TableCell>
                    <TableCell className="font-bold text-foreground text-sm">{po.vendor_name || po.vendor_key}</TableCell>
                    <TableCell>{getStatusBadge(po.status || po.approval_status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(po.payment_status)}</TableCell>
                    <TableCell className="text-right font-bold text-foreground tabular-nums text-sm">{formatCurrency(Number(po.po_value || 0))}</TableCell>
                    <TableCell className="text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums text-sm">{formatCurrency(Number(po.paid || 0))}</TableCell>
                    <TableCell className="text-right text-amber-700 dark:text-gold font-bold tabular-nums text-sm">{formatCurrency(Math.max(0, Number(po.po_value || 0) - Number(po.paid || 0)))}</TableCell>
                    <TableCell className="text-center relative">
                      <div className="flex justify-center">
                        <div className="relative inline-block text-left">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuPoNo(openActionMenuPoNo === po.po_no ? null : po.po_no);
                            }}
                            className="flex items-center gap-1 h-7 text-xs px-2.5 bg-muted/50 hover:bg-muted border border-border rounded-md font-medium"
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
                                    if (handleSendPOWhatsApp) handleSendPOWhatsApp(po.po_no);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors text-left font-medium"
                                >
                                  <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> WhatsApp PO
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
                                     className="flex items-center gap-2 px-3 py-2 text-xs text-amber-700 dark:text-gold hover:bg-muted transition-colors text-left border-t border-border font-medium"
                                   >
                                     <Wallet className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> Add Manual Payment
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
