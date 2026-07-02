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
  getStatusBadge, getPaymentStatusBadge
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row gap-4">
        <CardTitle className="text-sm font-semibold text-slate-400">PO DATABASE ({filteredPOs.length})</CardTitle>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input type="text" placeholder="Search PO, Project, Vendor..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="pl-9 text-xs py-1.5 h-8 bg-slate-950/40" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredPOs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-light">No purchase orders found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO No</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => setPoDateSortDir(dir => dir === 'desc' ? 'asc' : 'desc')}
                    className="inline-flex items-center gap-1 text-left uppercase"
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
                    <TableCell className="font-medium text-slate-200">{po.po_no}</TableCell>
                    <TableCell className="text-slate-300">{formatDate(po.po_date)}</TableCell>
                    <TableCell>{po.project}</TableCell>
                    <TableCell>{po.vendor_name || po.vendor_key}</TableCell>
                    <TableCell>{getStatusBadge(po.status || po.approval_status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(po.payment_status)}</TableCell>
                    <TableCell className="text-right font-medium text-slate-200">{formatCurrency(Number(po.po_value || 0))}</TableCell>
                    <TableCell className="text-right text-emerald-400">{formatCurrency(Number(po.paid || 0))}</TableCell>
                    <TableCell className="text-right text-gold">{formatCurrency(Math.max(0, Number(po.po_value || 0) - Number(po.paid || 0)))}</TableCell>
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
                            className="flex items-center gap-1 h-7 text-xs px-2.5 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-900/60 rounded-md"
                          >
                            Actions <ChevronDown className="w-3 h-3 text-slate-400" />
                          </Button>
                          {openActionMenuPoNo === po.po_no && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuPoNo(null)} />
                              <div className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-800 bg-slate-950 shadow-2xl py-1 z-20 animate-fade-in flex flex-col">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuPoNo(null);
                                    window.open(`/po/${encodeURIComponent(po.po_no)}`, '_blank');
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-900 transition-colors text-left font-sans"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" /> Print / View PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuPoNo(null);
                                    if (handleSendPOEmail) handleSendPOEmail(po.po_no);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-900 transition-colors text-left font-sans"
                                >
                                  <Send className="w-3.5 h-3.5 text-slate-400" /> Email PO
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuPoNo(null);
                                    if (handleSendPOWhatsApp) handleSendPOWhatsApp(po.po_no);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-emerald-400 hover:bg-slate-900 transition-colors text-left font-sans"
                                >
                                  <Send className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp PO
                                </button>
                                {!isPending && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuPoNo(null);
                                      handleOpenModal(po.po_no);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-900 transition-colors text-left font-sans"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit PO
                                  </button>
                                )}
                                {canCreate && (isDraft || isRejected) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuPoNo(null);
                                      handleSubmitForApproval(po.po_no);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-900 transition-colors text-left font-sans"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-amber-500" /> Submit Approval
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
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-slate-900 transition-colors text-left font-sans"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Approve PO
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuPoNo(null);
                                        handleOpenApproval(po, 'reject');
                                      }}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-slate-900 transition-colors text-left font-sans"
                                    >
                                      <XCircle className="w-3.5 h-3.5 text-red-500" /> Reject PO
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuPoNo(null);
                                    handleDuplicatePO(po);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-900 transition-colors text-left border-t border-slate-900/60 font-sans"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicate
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuPoNo(null);
                                      handleDeletePO(po.po_no);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-slate-900 transition-colors text-left font-sans"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete PO
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
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-gold hover:text-gold-hover hover:bg-slate-900 transition-colors text-left border-t border-slate-900/60 font-sans"
                                  >
                                    <Wallet className="w-3.5 h-3.5 text-gold" /> Add Manual Payment
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuPoNo(null);
                                    handleViewPOHistory(po);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors text-left border-t border-slate-900/40 font-sans"
                                >
                                  <History className="w-3.5 h-3.5 text-slate-500" /> View History
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
        )}
      </CardContent>
    </Card>
  );
}
