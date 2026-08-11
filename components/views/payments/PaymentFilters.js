import React from 'react';
import { Button, Input } from '../../ui/core';
import { CreditCard, PlusCircle, Search, Download } from 'lucide-react';

export default function PaymentFilters({
  canOnboard, handleOpenRequestModal, activeTab, setActiveTab, searchQuery, setSearchQuery, onExportCSV
}) {
  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Payment Requests</h2>
            <p className="text-xs text-muted-foreground font-medium">Submit invoices, approve requests, and log UTR remissions.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExportCSV && (
            <Button variant="outline" size="sm" onClick={onExportCSV} className="font-medium text-xs">
              <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              Export CSV
            </Button>
          )}
          {canOnboard && (
            <Button variant="primary" size="sm" onClick={handleOpenRequestModal} className="font-medium">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              New Payment Request
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-border flex justify-between items-center pt-2">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all focus:outline-none ${
              activeTab === 'active' 
                ? 'border-amber-500 text-amber-700 dark:text-amber-400' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Active Requests
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all focus:outline-none ${
              activeTab === 'pending' 
                ? 'border-amber-500 text-amber-700 dark:text-amber-400' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            My Pending Approvals
          </button>
        </div>

        <div className="relative w-full sm:w-72 mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search vendor, PO No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs py-1.5 h-8 bg-card"
          />
        </div>
      </div>
    </>
  );
}
