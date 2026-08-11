'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Dialog, Input, Textarea } from '../../ui/core';
import { UserCheck, ShieldAlert, CheckCircle2, XCircle, Eye, Loader2, Download, AlertTriangle, Send } from 'lucide-react';

async function call(method, ...args) {
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'API call failed');
  }
  return data.result;
}

export default function VendorOnboardingAdminView({ onVendorApproved }) {
  const [loading, setLoading] = useState(true);
  const [pendingList, setPendingList] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewDetails, setReviewDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Action state
  const [grantPortalAccess, setGrantPortalAccess] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await call('listPendingOnboardings');
      setPendingList(res || []);
    } catch (err) {
      console.error('Failed to fetch pending onboardings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleOpenReview = async (sub) => {
    setSelectedSubmission(sub);
    setLoadingDetails(true);
    setActionError('');
    setShowRejectForm(false);
    setRejectionReason('');
    setGrantPortalAccess(false);

    try {
      const res = await call('getOnboardingDetails', sub.submission_id);
      setReviewDetails(res);
    } catch (err) {
      setActionError(err.message || 'Failed to load details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    setSubmitting(true);
    setActionError('');
    try {
      const res = await call('approveVendorOnboarding', selectedSubmission.submission_id, grantPortalAccess);
      if (res.ok) {
        setSelectedSubmission(null);
        setReviewDetails(null);
        await loadPending();
        if (onVendorApproved) onVendorApproved();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to approve onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) {
      setActionError("Rejection reason is required");
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      const res = await call('rejectVendorOnboarding', selectedSubmission.submission_id, rejectionReason.trim());
      if (res.ok) {
        setSelectedSubmission(null);
        setReviewDetails(null);
        await loadPending();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to reject onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* View Title & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-border/40">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2 tracking-tight">
            <UserCheck className="w-4 h-4 text-amber-500" /> Pending Vendor Onboardings
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review vendor self-registrations, tax proofs, banking details, and portal access settings.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadPending} className="text-xs font-semibold h-8 bg-card border-border hover:bg-muted text-foreground">
          <Loader2 className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-amber-500' : 'text-muted-foreground'}`} />
          Refresh List
        </Button>
      </div>

      <Card className="bg-card text-card-foreground border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <span className="font-medium">Fetching pending vendor self-registrations...</span>
            </div>
          ) : pendingList.length === 0 ? (
            <div className="py-16 px-6 text-center flex flex-col items-center justify-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4 shadow-sm">
                <UserCheck className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-foreground tracking-tight">No Pending Vendor Onboardings</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                All vendor self-registrations have been reviewed. Send a new onboarding invite link to suppliers to collect their GSTIN, banking, and tax documents directly.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40">
                  <TableHead className="text-xs font-bold text-muted-foreground">Company Name</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Email & Contact</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">GSTIN / PAN</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Docs</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Submitted</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingList.map(sub => (
                  <TableRow key={sub.submission_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs font-semibold text-foreground">
                      <div>{sub.legal_name}</div>
                      {sub.trade_name && <div className="text-[10px] text-muted-foreground font-normal">{sub.trade_name}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      <div>{sub.email}</div>
                      <div className="text-[10px] text-muted-foreground">{sub.primary_contact_name} ({sub.primary_contact_no})</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-foreground">
                      <div>GST: {sub.gstin || '—'}</div>
                      <div className="text-[10px] text-muted-foreground">PAN: {sub.pan || '—'}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground font-semibold">
                        {sub.document_count || 0} File(s)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleOpenReview(sub)} className="text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-semibold h-7">
                        <Eye className="w-3.5 h-3.5 mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Review Modal */}
      {selectedSubmission && (
        <Dialog open={true} onClose={() => setSelectedSubmission(null)} title={`Review Onboarding — ${selectedSubmission.legal_name}`} maxWidth="max-w-3xl">
          <div className="space-y-6">

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {loadingDetails ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> Fetching detailed submission data & attachment links...
              </div>
            ) : reviewDetails && (
              <>
                {/* Duplicate Warning */}
                {reviewDetails.duplicateMatch && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Potential Duplicate Vendor Match Found
                    </div>
                    <p className="text-[11px] text-amber-200/80">{reviewDetails.duplicateMessage}</p>
                  </div>
                )}

                {/* Grid Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Company Details */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1">Company Details</h4>
                    <p><span className="text-slate-400">Legal Name:</span> <strong className="text-slate-200">{reviewDetails.submission.legal_name}</strong></p>
                    <p><span className="text-slate-400">Trade Name:</span> <strong className="text-slate-200">{reviewDetails.submission.trade_name || '—'}</strong></p>
                    <p><span className="text-slate-400">GSTIN:</span> <strong className="text-slate-200 font-mono">{reviewDetails.submission.gstin || '—'}</strong></p>
                    <p><span className="text-slate-400">PAN:</span> <strong className="text-slate-200 font-mono">{reviewDetails.submission.pan || '—'}</strong></p>
                    <p><span className="text-slate-400">Address:</span> <strong className="text-slate-200">{[reviewDetails.submission.address, reviewDetails.submission.city, reviewDetails.submission.state, reviewDetails.submission.pincode].filter(Boolean).join(', ') || '—'}</strong></p>
                  </div>

                  {/* Contact & Banking */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1">Contact & Banking Info</h4>
                    <p><span className="text-slate-400">Primary Contact:</span> <strong className="text-slate-200">{reviewDetails.submission.primary_contact_name} ({reviewDetails.submission.primary_contact_no})</strong></p>
                    <p><span className="text-slate-400">Accounts Contact:</span> <strong className="text-slate-200">{reviewDetails.submission.accounts_contact_name || '—'}</strong></p>
                    <p><span className="text-slate-400">Bank Name:</span> <strong className="text-slate-200">{reviewDetails.submission.bank_name || '—'}</strong></p>
                    <p><span className="text-slate-400">Account No:</span> <strong className="text-slate-200 font-mono">{reviewDetails.submission.bank_account || '—'}</strong></p>
                    <p><span className="text-slate-400">IFSC / Branch:</span> <strong className="text-slate-200 font-mono">{reviewDetails.submission.ifsc || '—'} ({reviewDetails.submission.branch || '—'})</strong></p>
                  </div>
                </div>

                {/* Submitted Documents */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1 text-xs">Submitted Documents (Cloudinary Storage)</h4>
                  {reviewDetails.documents?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No documents attached by vendor.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {reviewDetails.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <span className="font-mono text-slate-300">{doc.file_name}</span>
                          <a
                            href={doc.file_data}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:underline text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> View / Download Document
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Portal Access Setting */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                    <input
                      type="checkbox"
                      checked={grantPortalAccess}
                      onChange={e => setGrantPortalAccess(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400"
                    />
                    <span>Grant B2B Vendor Portal Access upon Approval</span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6">
                    If checked, portal user credentials will be generated and a Portal Welcome Email containing access instructions will be sent to <strong className="text-slate-200">{reviewDetails.submission.email}</strong>.
                    If unchecked, the vendor will be onboarded into the Vendor Master with Portal Access <strong className="text-amber-400">Disabled</strong>.
                  </p>
                </div>

                {/* Rejection Form Box */}
                {showRejectForm && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2 text-xs">
                    <label className="font-semibold text-rose-300">Rejection Reason *</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Specify required corrections or reason for rejection..."
                      rows={2}
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setSelectedSubmission(null)} className="text-xs">
                Cancel
              </Button>

              <div className="flex gap-2">
                {!showRejectForm ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => setShowRejectForm(true)} className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                    <Button type="button" onClick={handleApprove} disabled={submitting} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4">
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                      Approve Vendor
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={handleReject} disabled={submitting || !rejectionReason.trim()} className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                    Confirm Rejection
                  </Button>
                )}
              </div>
            </div>

          </div>
        </Dialog>
      )}
    </div>
  );
}
