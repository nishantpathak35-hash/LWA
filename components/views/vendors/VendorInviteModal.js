'use client';

import React, { useState } from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { Mail, Send, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

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

export default function VendorInviteModal({ open, onClose, onInviteSuccess }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!email || !email.trim()) {
      setError('Vendor email address is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await call('createVendorInvitation', email.trim());
      if (res.ok) {
        setSuccessMsg(`Onboarding invitation email sent successfully to ${email.trim()}`);
        setEmail('');
        if (onInviteSuccess) onInviteSuccess();
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Failed to send vendor onboarding invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Invite Vendor for Onboarding" maxWidth="max-w-md">
      <form onSubmit={handleSendInvite} className="space-y-4 select-none">
        <p className="text-xs text-slate-400">
          Enter the vendor's email address below. An onboarding invitation link will be sent directly to the vendor to complete their registration, GSTIN/PAN documents, and banking details.
        </p>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-amber-400" /> Vendor Email Address *
          </label>
          <Input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            placeholder="vendor@company.com"
            className="bg-slate-950 border-slate-800 text-xs"
            required
            autoFocus
          />
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Sending...</> : <><Send className="w-3.5 h-3.5 mr-1" /> Send Invitation</>}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
