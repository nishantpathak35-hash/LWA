import React from 'react';
import { Receipt, Download, PlusCircle } from 'lucide-react';
import { Button } from '../../ui/core';

export default function POFilters({ canCreate, filteredPOs, handleExportPOs, handleOpenModal }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-gold/10 text-gold"><Receipt className="w-5 h-5" /></div>
        <div>
          <h2 className="text-xl font-light text-slate-100 font-serif">Purchase Orders</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Full PO lifecycle — create, approve, edit, and track payments.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleExportPOs} disabled={filteredPOs.length === 0}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
        {canCreate && (
          <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
            <PlusCircle className="w-4 h-4" /> Create Purchase Order
          </Button>
        )}
      </div>
    </div>
  );
}
