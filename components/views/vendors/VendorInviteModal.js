'use client';

import React, { useState } from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { Mail, Send, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

async function call(method, ...args) {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('lx_auth_token') || '') : '';
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-lwa-token': token
    },
    body: JSON.stringify({ method, args })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'API call failed');
  }
  return data.result !== undefined ? data.result : data;
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
      if (res && (res.ok || res.token || res.invitation_id)) {
        setSuccessMsg(`Onboarding invitation email sent successfully to ${email.trim()}`);
        setEmail('');
        if (onInviteSuccess) onInviteSuccess();
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 2000);
      } else {
        throw new Error('Failed to send vendor onboarding invitation.');
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
        <p className="text-xs text-muted-foreground leading-relaxed">
          Enter the vendor's email address below. An onboarding invitation link will be sent directly to the vendor to complete their registration, GSTIN/PAN documents, and banking details.
        </p>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-500 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-amber-500" /> Vendor Email Address *
          </label>
          <Input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            placeholder="vendor@company.com"
            className="bg-background border-input text-foreground text-xs h-9 focus:border-amber-500 font-medium"
            required
            autoFocus
          />
        </div>

        <div className="pt-3 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-sm">
            {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Sending...</> : <><Send className="w-3.5 h-3.5 mr-1" /> Send Invitation</>}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
