'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Receipt, Clock, CheckCircle2, XCircle, AlertCircle, Eye,
  Download, Send, ExternalLink, Calendar, Building2, User,
  FileText, ShieldCheck, CreditCard, ChevronRight, Hash, Layers,
  IndianRupee, Sparkles, MessageSquare
} from 'lucide-react';
import { Badge, Button } from '../../ui/core';
import { formatCurrency, formatDate } from '../../../app/lib/utils';

export default function PODetailsDrawer({
  po,
  isOpen,
  onClose,
  call,
  canApprove,
  canCreate,
  isAdmin,
  handleOpenApproval,
  handleSubmitForApproval,
  handleOpenModal,
  handleViewPOHistory,
  handleSendPOEmail
}) {
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'financials' | 'terms' | 'pdf'
  const [poDetails, setPoDetails] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !po?.po_no) return;
    setActiveTab('items');
    
    async function loadData() {
      setLoading(true);
      try {
        if (call) {
          const [details, payRes] = await Promise.all([
            call('getPOFullDetails', po.po_no).catch(() => null),
            call('getPOPayments', po.po_no).catch(() => null)
          ]);
          setPoDetails(details || po);
          setPayments(payRes?.payments || []);
        } else {
          setPoDetails(po);
        }
      } catch (err) {
        console.error('Failed to load PO details:', err);
        setPoDetails(po);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isOpen, po, call]);

  if (!isOpen || !po) return null;

  const data = poDetails || po;
  const status = String(data.status || data.approval_status || 'Draft').toLowerCase();
  const isDraft = status === 'draft';
  const isPending = status === 'pending approval' || status === 'pending_approval' || status === 'pending' || status.includes('pending') || status === 'under approval';
  const isApproved = status === 'approved' || status === 'active';
  const isRejected = status === 'rejected';
  const isShortClosed = status === 'short closed' || status === 'short_closed' || status === 'closed';

  const poValue = Number(data.po_value || 0);
  const paidAmount = Number(data.paid || 0);
  const balance = isShortClosed ? 0 : Math.max(0, poValue - paidAmount);
  const paidPercent = poValue > 0 ? Math.min(100, Math.round((paidAmount / poValue) * 100)) : 0;
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-out animate-slide-left">
          
          {/* Header */}
          <div className="p-5 border-b border-border bg-gradient-to-b from-muted/50 to-card">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-base font-bold text-foreground flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-500" />
                    {data.po_no}
                  </span>
                  
                  {/* Status Badge */}
                  {isApproved && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending Approval
                    </span>
                  )}
                  {isShortClosed && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      Short Closed
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Rejected
                    </span>
                  )}
                  {isDraft && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                      Draft
                    </span>
                  )}

                  {/* Payment Status */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                    <CreditCard className="w-3 h-3" /> {data.payment_status || 'Unpaid'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    {data.vendor_name || data.vendor_key || '—'}
                  </span>
                  <span>•</span>
                  <span>Project: <strong className="text-foreground font-semibold">{data.project || 'General'}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(data.po_date)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center bg-muted/40 p-2.5 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">PO Value</span>
                <span className="font-mono text-sm font-bold text-foreground">{formatCurrency(poValue)}</span>
              </div>
              <div className="border-x border-border/80 px-2">
                <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 block">Paid ({paidPercent}%)</span>
                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Remaining</span>
                <span className="font-mono text-sm font-bold text-foreground">{formatCurrency(balance)}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mt-4 border-b border-border -mb-5 px-1">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'items'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Line Items ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('financials')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'financials'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Payment Ledger ({payments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'terms'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Terms & Conditions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'pdf'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Print Preview
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground text-xs animate-pulse">
                Loading purchase order details...
              </div>
            ) : (
              <>
                {/* ── TAB 1: Line Items ── */}
                {activeTab === 'items' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border overflow-hidden bg-card">
                      <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase">
                        <span>Items Breakdown</span>
                        <span>{items.length} line items</span>
                      </div>
                      
                      {items.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-xs">
                          No line items found for this purchase order.
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {items.map((item, idx) => {
                            const qty = Number(item.qty || item.quantity || 1);
                            const rate = Number(item.rate || 0);
                            const gstPct = Number(item.tax_pct !== undefined ? item.tax_pct : item.gstPct || 18);
                            const gross = qty * rate;
                            const gstAmt = Number(item.gst_amount) || Math.round(gross * gstPct / 100);
                            const lineTotal = Number(item.amount) || (gross + gstAmt);

                            return (
                              <div key={idx} className="p-4 hover:bg-muted/20 transition-colors space-y-2">
                                <div className="flex justify-between items-start gap-3">
                                  <div className="space-y-1">
                                    <span className="font-semibold text-xs text-foreground block">
                                      {idx + 1}. {item.description || 'General Item'}
                                    </span>
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                      {item.hsn_sac && (
                                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">
                                          HSN: {item.hsn_sac}
                                        </span>
                                      )}
                                      <span>Qty: <strong>{qty} {item.unit || 'Nos'}</strong></span>
                                      <span>•</span>
                                      <span>Rate: <strong>{formatCurrency(rate)}</strong></span>
                                      <span>•</span>
                                      <span>GST: <strong>{gstPct}% ({formatCurrency(gstAmt)})</strong></span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-xs font-bold text-foreground block">
                                      {formatCurrency(lineTotal)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      Taxable: {formatCurrency(gross)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Tax & Total Summary Card */}
                    <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST Mode:</span>
                        <span className="font-medium text-foreground uppercase">{data.gst_mode === 'intra' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}</span>
                      </div>
                      {data.tds_section && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>TDS Section ({data.tds_section} @ {data.tds_pct || 0}%):</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">- {formatCurrency(Number(data.tds_amount || 0))}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold">
                        <span className="text-foreground">Total Contract Value:</span>
                        <span className="font-mono text-foreground">{formatCurrency(poValue)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Financials & Payments ── */}
                {activeTab === 'financials' && (
                  <div className="space-y-4">
                    {/* Settlement Meter */}
                    <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-foreground">PO Settlement Rate</span>
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{paidPercent}% Disbursed</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                        <div className="bg-card p-3 rounded-lg border border-border">
                          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Total Paid</span>
                          <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</span>
                        </div>
                        <div className="bg-card p-3 rounded-lg border border-border">
                          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Open Balance</span>
                          <span className="text-sm font-bold font-mono text-foreground">{formatCurrency(balance)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Linked Payments Table */}
                    <div className="rounded-xl border border-border overflow-hidden bg-card">
                      <div className="px-4 py-2.5 bg-muted/60 border-b border-border flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase">
                        <span>Payment History</span>
                        <span>{payments.length} Records</span>
                      </div>

                      {payments.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs">
                          No payments recorded yet for this Purchase Order.
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {payments.map((pay, pidx) => (
                            <div key={pidx} className="p-3.5 hover:bg-muted/20 transition-colors flex justify-between items-center text-xs">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{pay.payment_mode || 'Bank Transfer'}</span>
                                  {pay.utr_ref && <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">UTR: {pay.utr_ref}</span>}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {formatDate(pay.payment_date || pay.created_at)} {pay.bank_name ? `• ${pay.bank_name}` : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                  {formatCurrency(Number(pay.amount || 0))}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB 3: Terms ── */}
                {activeTab === 'terms' && (
                  <div className="space-y-4 text-xs">
                    <div className="bg-card border border-border p-4 rounded-xl space-y-2">
                      <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-500" /> Payment & Delivery Terms
                      </h4>
                      <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                        {data.payment_delivery_terms || data.terms || 'No specific payment terms specified.'}
                      </p>
                    </div>

                    <div className="bg-card border border-border p-4 rounded-xl space-y-2">
                      <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> General Terms & Conditions
                      </h4>
                      <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                        {data.general_terms || 'Standard organization procurement terms apply.'}
                      </p>
                    </div>

                    {data.notes && (
                      <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-1">
                        <h4 className="font-semibold text-foreground">Internal Notes</h4>
                        <p className="text-muted-foreground italic">{data.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 4: PDF View ── */}
                {activeTab === 'pdf' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Embedded Purchase Order Sheet</span>
                      <a
                        href={`/po/${encodeURIComponent(data.po_no)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Open In New Tab <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="w-full h-[520px] rounded-xl border border-border overflow-hidden bg-muted/20">
                      <iframe
                        src={`/po/${encodeURIComponent(data.po_no)}`}
                        title={`PO-${data.po_no}`}
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="p-4 border-t border-border bg-card/95 backdrop-blur-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (handleViewPOHistory) handleViewPOHistory(data);
                }}
                className="text-xs font-medium h-9 rounded-xl"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Audit Trail
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`/po/${encodeURIComponent(data.po_no)}`, '_blank');
                }}
                className="text-xs font-medium h-9 rounded-xl"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Full PDF
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {canCreate && (isDraft || isRejected) && (
                <Button
                  onClick={() => {
                    handleSubmitForApproval(data.po_no);
                    onClose();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5" /> Submit For Approval
                </Button>
              )}

              {canApprove && isPending && (
                <>
                  <Button
                    onClick={() => {
                      handleOpenApproval(data, 'approve');
                      onClose();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve PO
                  </Button>
                  <Button
                    onClick={() => {
                      handleOpenApproval(data, 'reject');
                      onClose();
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </Button>
                </>
              )}

              {canCreate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleOpenModal(data.po_no);
                    onClose();
                  }}
                  className="text-xs font-medium h-9 rounded-xl"
                >
                  Edit PO
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
