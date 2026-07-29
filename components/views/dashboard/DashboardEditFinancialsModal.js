'use client';
import React from 'react';
import { Dialog, Button, Input } from '../../ui/core';

export default function DashboardEditFinancialsModal({
  editModalOpen, setEditModalOpen, editProject,
  boqVal, setBoqVal, bcsVal, setBcsVal, inflowVal, setInflowVal,
  clientDebitVal, setClientDebitVal, tdsVal, setTdsVal,
  savingFinancials, handleSaveFinancials
}) {
  return (
    <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Project Financial Performance">
      <form onSubmit={handleSaveFinancials} className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Project: <strong className="text-slate-900 dark:text-slate-100 font-bold">{editProject?.project}</strong>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Total Project Value / BOQ (₹)</label>
            <Input
              type="number"
              value={boqVal}
              onChange={e => setBoqVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Budgeted Cost Summary (BCS) (₹)</label>
            <Input
              type="number"
              value={bcsVal}
              onChange={e => setBcsVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Total Inflow Received (₹)</label>
            <Input
              type="number"
              value={inflowVal}
              onChange={e => setInflowVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Client Debit / Invoice Value (₹)</label>
            <Input
              type="number"
              value={clientDebitVal}
              onChange={e => setClientDebitVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Total TDS (₹)</label>
            <Input
              type="number"
              value={tdsVal}
              onChange={e => setTdsVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={savingFinancials} className="text-xs font-bold">
            {savingFinancials ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
