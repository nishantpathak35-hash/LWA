import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '../../ui/core';

export default function PaymentsHeader({ canRequest, activeTab, setActiveTab, handleOpenRequestModal, pendingCount }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-light text-slate-100 font-serif tracking-wide">Payments</h2>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
          Manage payment requests, approvals, and remittances.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800/50">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'active' ? 'bg-slate-800 text-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Active & Paid
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'pending' ? 'bg-slate-800 text-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Requires Action
            {pendingCount > 0 && (
              <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
        {canRequest && (
          <Button onClick={() => handleOpenRequestModal()} className="gap-2 bg-gold hover:bg-gold/90 text-slate-900">
            <PlusCircle className="w-4 h-4" /> Request Payment
          </Button>
        )}
      </div>
    </div>
  );
}
