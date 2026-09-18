'use client';
import React from 'react';
import { Button } from '../../ui/core';
import { CreditCard, FilePlus, CheckSquare } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { isSuperAdmin } from '../../../app/lib/config';

export default function DashboardWelcomeHeader({ user, loading, loadDashboardData, setActiveView, approvalMetrics }) {
  const { syncStatus } = useAppState();
  const isSuper = isSuperAdmin(user?.email);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-5">
      {/* Welcome — clean, no pills, no sparkles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {greeting()}, {user?.name || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Status — compact dot, not a big animated badge */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${
            syncStatus === 'reconnecting' ? 'bg-amber-500' :
            loading || syncStatus === 'syncing' ? 'bg-blue-500' : 'bg-emerald-500'
          }`} />
          <span>{syncStatus === 'reconnecting' ? 'Reconnecting' : loading ? 'Syncing' : 'Live'}</span>
        </div>
      </div>

      {/* Quick Actions — simple buttons, not decorated cards */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setActiveView('payments');
            setTimeout(() => window.dispatchEvent(new CustomEvent('lx:new-payment-request')), 100);
          }}
          className="gap-2"
        >
          <CreditCard className="w-3.5 h-3.5" />
          New Payment
        </Button>

        <Button
          onClick={() => {
            setActiveView('pos');
            setTimeout(() => window.dispatchEvent(new CustomEvent('lx:new-po')), 100);
          }}
          className="gap-2"
        >
          <FilePlus className="w-3.5 h-3.5" />
          New PO
        </Button>

        <Button
          onClick={() => setActiveView('payments')}
          className="gap-2"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Approvals
          {approvalMetrics.pending > 0 && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1">
              {approvalMetrics.pending}
            </span>
          )}
        </Button>
      </div>

      {/* Approval Summary — compact inline, not 6 identical boxes */}
      {(approvalMetrics.total > 0) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground border-t border-border pt-4">
          <span><strong className="text-foreground font-medium">{approvalMetrics.total}</strong> total claims</span>
          {approvalMetrics.pending > 0 && (
            <span><strong className="text-amber-600 dark:text-amber-400 font-medium">{approvalMetrics.pending}</strong> pending</span>
          )}
          {approvalMetrics.approved > 0 && (
            <span><strong className="text-emerald-600 dark:text-emerald-400 font-medium">{approvalMetrics.approved}</strong> approved</span>
          )}
          {approvalMetrics.rejected > 0 && (
            <span><strong className="text-red-600 dark:text-red-400 font-medium">{approvalMetrics.rejected}</strong> rejected</span>
          )}
          {approvalMetrics.overBudget > 0 && (
            <span><strong className="text-red-600 dark:text-red-400 font-medium">{approvalMetrics.overBudget}</strong> over-budget</span>
          )}
          {approvalMetrics.tdsApplicable > 0 && (
            <span><strong className="text-foreground font-medium">{approvalMetrics.tdsApplicable}</strong> with TDS</span>
          )}
        </div>
      )}
    </div>
  );
}
