'use client';
import React from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { Edit3, Check, DollarSign, Building2 } from 'lucide-react';
import { fmtRupees } from './dashboard-utils';

export default function DashboardEditFinancialsModal({
  editModalOpen, setEditModalOpen, editProject,
  boqVal, setBoqVal, bcsVal, setBcsVal, inflowVal, setInflowVal,
  clientDebitVal, setClientDebitVal, tdsVal, setTdsVal,
  savingFinancials, handleSaveFinancials
}) {
  return (
    <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Update Project Financial Baseline">
      <form onSubmit={handleSaveFinancials} className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs">
          <Building2 className="w-4 h-4 text-amber-600 dark:text-primary shrink-0" />
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Project Reference</span>
            <strong className="text-foreground font-bold text-sm">{editProject?.project}</strong>
            {editProject?.clientName && editProject?.clientName !== editProject?.project && (
              <span className="text-muted-foreground ml-1.5">({editProject.clientName})</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Total Project Value / BOQ (₹)
            </label>
            <Input
              type="number"
              value={boqVal}
              onChange={e => setBoqVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
              placeholder="0"
            />
            <span className="text-[10px] text-muted-foreground block font-mono">
              {fmtRupees(boqVal)}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Budgeted Cost Summary (BCS) (₹)
            </label>
            <Input
              type="number"
              value={bcsVal}
              onChange={e => setBcsVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
              placeholder="0"
            />
            <span className="text-[10px] text-muted-foreground block font-mono">
              {fmtRupees(bcsVal)}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Total Inflow Received (₹)
            </label>
            <Input
              type="number"
              value={inflowVal}
              onChange={e => setInflowVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
              placeholder="0"
            />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
              {fmtRupees(inflowVal)}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Client Debit / Invoiced (₹)
            </label>
            <Input
              type="number"
              value={clientDebitVal}
              onChange={e => setClientDebitVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
              placeholder="0"
            />
            <span className="text-[10px] text-muted-foreground block font-mono">
              {fmtRupees(clientDebitVal)}
            </span>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Total Client TDS Deducted (₹)
            </label>
            <Input
              type="number"
              value={tdsVal}
              onChange={e => setTdsVal(Number(e.target.value))}
              className="bg-background text-foreground text-xs font-mono"
              placeholder="0"
            />
            <span className="text-[10px] text-muted-foreground block font-mono">
              {fmtRupees(tdsVal)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)} className="text-xs">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={savingFinancials} className="text-xs font-bold gap-1.5">
            <Check className="w-3.5 h-3.5" />
            {savingFinancials ? 'Saving...' : 'Save Performance Data'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
