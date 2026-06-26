import React from 'react';
import { PlusCircle, Search, Download } from 'lucide-react';
import { Button } from '../../ui/core';

export default function POsHeader({ canCreate, handleOpenCreateModal, filteredCount, handleExportPOs }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-light text-slate-100 font-serif tracking-wide">Purchase Orders</h2>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
          {filteredCount} {filteredCount === 1 ? 'Record' : 'Records'} Found
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleExportPOs} className="gap-2">
          <Download className="w-4 h-4" /> Export
        </Button>
        {canCreate && (
          <Button onClick={() => handleOpenCreateModal()} className="gap-2 bg-gold hover:bg-gold/90 text-slate-900">
            <PlusCircle className="w-4 h-4" /> New PO
          </Button>
        )}
      </div>
    </div>
  );
}
