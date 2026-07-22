import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '../../ui/core';

export default function PaymentsHeader({ canRequest, activeTab, setActiveTab, handleOpenRequestModal, pendingCount }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Payments</h2>
        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
          Manage payment requests, approvals, and remittances.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'active' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active & Paid
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'pending' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Requires Action
            {pendingCount > 0 && (
              <span className="bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
        {canRequest && (
          <Button variant="primary" size="sm" onClick={() => handleOpenRequestModal()} className="gap-2">
            <PlusCircle className="w-4 h-4" /> Request Payment
          </Button>
        )}
      </div>
    </div>
  );
}
