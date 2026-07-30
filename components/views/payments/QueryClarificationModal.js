'use client';
import React, { useState } from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { HelpCircle, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from '../../ui/Toast';

export default function QueryClarificationModal({
  open,
  onClose,
  payment,
  mode = 'ask', // 'ask' | 'answer'
  onSubmitSuccess
}) {
  const [queryText, setQueryText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!payment) return null;

  const handleAskQuery = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) {
      toast.error('Please enter a question or clarification request');
      return;
    }
    setSubmitting(true);
    try {
      const { requestPaymentClarification } = await import('../../../app/lib/api/collaboration');
      const res = await requestPaymentClarification(null, payment.id || payment.pr_id, queryText.trim());
      if (res && res.ok) {
        toast.success('Payment placed on Query Hold. Requester notified.');
        setQueryText('');
        onClose();
        if (onSubmitSuccess) onSubmitSuccess();
      } else {
        toast.error(res?.message || 'Failed to submit query hold');
      }
    } catch (err) {
      toast.error(err.message || 'Error submitting query hold');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerQuery = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) {
      toast.error('Please enter your response to the clarification query');
      return;
    }
    setSubmitting(true);
    try {
      const { answerPaymentClarification } = await import('../../../app/lib/api/collaboration');
      const res = await answerPaymentClarification(null, payment.id || payment.pr_id, responseText.trim());
      if (res && res.ok) {
        toast.success('Clarification response submitted.');
        setResponseText('');
        onClose();
        if (onSubmitSuccess) onSubmitSuccess();
      } else {
        toast.error(res?.message || 'Failed to submit answer');
      }
    } catch (err) {
      toast.error(err.message || 'Error submitting answer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'ask' ? `Request Clarification — Payment #${payment.id || payment.pr_id}` : `Answer Query — Payment #${payment.id || payment.pr_id}`}
    >
      {mode === 'ask' ? (
        <form onSubmit={handleAskQuery} className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-gold font-medium">
            <HelpCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-gold" />
            <div>
              Placing this payment on <strong>Query Hold</strong> notifies the requester without rejecting the payment request. Workflows remain intact.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Clarification Details / Question
            </label>
            <textarea
              className="w-full bg-muted/20 border border-border rounded-lg p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all resize-none font-medium"
              rows="3"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="e.g. Please upload site verification photos for Milestone 2, or explain why net amount exceeds PO balance..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting || !queryText.trim()}>
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />} Place on Query Hold
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleAnswerQuery} className="space-y-4">
          {payment.query_text && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1 text-xs">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
                <span>Question from {payment.query_asked_by || 'Approver'}:</span>
              </div>
              <p className="text-muted-foreground font-medium italic">"{payment.query_text}"</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Your Answer / Resolution Note
            </label>
            <textarea
              className="w-full bg-muted/20 border border-border rounded-lg p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all resize-none font-medium"
              rows="3"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Provide requested details or confirm updated documents..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting || !responseText.trim()}>
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />} Submit Response
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
