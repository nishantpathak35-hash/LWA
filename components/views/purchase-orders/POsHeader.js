import React from 'react';
import { PlusCircle, Search, Download } from 'lucide-react';
import { Button } from '../../ui/core';

export default function POsHeader({ canCreate, handleOpenCreateModal, filteredCount, handleExportPOs }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Purchase Orders</h2>
        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
          {filteredCount} {filteredCount === 1 ? 'Record' : 'Records'} Found
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="default" size="sm" onClick={handleExportPOs} className="gap-2">
          <Download className="w-4 h-4" /> Export
        </Button>
        {canCreate && (
          <Button variant="primary" size="sm" onClick={() => handleOpenCreateModal()} className="gap-2">
            <PlusCircle className="w-4 h-4" /> New PO
          </Button>
        )}
      </div>
    </div>
  );
}
