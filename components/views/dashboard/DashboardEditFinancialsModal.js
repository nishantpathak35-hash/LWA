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
    <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Project Financials">
      <form onSubmit={handleSaveFinancials} className="space-y-4">
        <div className="text-xs text-slate-400">
          Project: <strong className="text-slate-200">{editProject?.project}</strong>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-light">Total Project Value / BOQ (₹)</label>
            <Input
              type="number"
              value={boqVal}
              onChange={e => setBoqVal(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-light">Budgeted Cost Summary (BCS) (₹)</label>
            <Input
              type="number"
              value={bcsVal}
              onChange={e => setBcsVal(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-light">Total Inflow Received (₹)</label>
            <Input
              type="number"
              value={inflowVal}
              onChange={e => setInflowVal(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-light">Client Debit / Invoice Value (₹)</label>
            <Input
              type="number"
              value={clientDebitVal}
              onChange={e => setClientDebitVal(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs text-slate-400 font-light">Total TDS (₹)</label>
            <Input
              type="number"
              value={tdsVal}
              onChange={e => setTdsVal(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
          <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={savingFinancials}>
            {savingFinancials ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
