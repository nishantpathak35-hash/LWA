import React from 'react';
import { Receipt, Download, PlusCircle } from 'lucide-react';
import { Button } from '../../ui/core';

export default function POFilters({ canCreate, filteredPOs, handleExportPOs, handleOpenModal }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Purchase Orders</h2>
          <p className="text-xs text-muted-foreground font-medium">Full PO lifecycle — create, approve, edit, and track payments.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleExportPOs} disabled={filteredPOs.length === 0} className="font-medium">
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
        {canCreate && (
          <Button variant="primary" size="sm" onClick={() => handleOpenModal()} className="font-medium">
            <PlusCircle className="w-4 h-4 mr-1.5" /> Create Purchase Order
          </Button>
        )}
      </div>
    </div>
  );
}
