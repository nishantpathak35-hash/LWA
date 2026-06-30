import React from 'react';
import { Button, Input } from '../../ui/core';
import { CreditCard, PlusCircle, Search } from 'lucide-react';

export default function PaymentFilters({
  canOnboard, handleOpenRequestModal, handleOpenInvoiceModal, activeTab, setActiveTab, searchQuery, setSearchQuery
}) {
  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gold/10 text-gold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-light text-slate-100 font-serif">Payment Requests</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Submit invoices, approve requests, and log UTR remissions.</p>
          </div>
        </div>

        {canOnboard && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenInvoiceModal} className="border-gold text-gold hover:bg-gold/10">
              🤖 AI Invoice Upload
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenRequestModal}>
              <PlusCircle className="w-4 h-4" />
              New Payment Request
            </Button>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-900/60 flex justify-between items-center">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all focus:outline-none ${activeTab === 'active' ? 'border-gold text-gold' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
          >
            Active Requests
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all focus:outline-none ${activeTab === 'pending' ? 'border-gold text-gold' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
          >
            My Pending Approvals
          </button>
        </div>

        <div className="relative w-full sm:w-72 mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search vendor, PO No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs py-1.5 h-8 bg-slate-950/40"
          />
        </div>
      </div>
    </>
  );
}
