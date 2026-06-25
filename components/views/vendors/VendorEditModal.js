'use client';
import React from 'react';
import { Dialog, Button, Input, Select } from '../../ui/core';
import { ShieldAlert } from 'lucide-react';

export default function VendorEditModal({
  editModalOpen, setEditModalOpen, editVendorId,
  editTradeName, setEditTradeName, editLegalName, setEditLegalName,
  editGstin, setEditGstin, editPan, setEditPan,
  editEmail, setEditEmail, editStatus, setEditStatus,
  editAccountNo, setEditAccountNo, editIfsc, setEditIfsc,
  editAddress, setEditAddress, formError, submitting, handleEditSubmit
}) {
  return (
    <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Vendor Details">
      <form onSubmit={handleEditSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR DISPLAY NAME *</label>
            <Input type="text" required value={editTradeName} onChange={(e) => setEditTradeName(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR CODE (READ-ONLY)</label>
            <Input type="text" disabled value={editVendorId} className="bg-slate-900/50" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">LEGAL BUSINESS NAME (FOR POs) *</label>
          <Input type="text" required value={editLegalName} onChange={(e) => setEditLegalName(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">GSTIN NUMBER</label>
            <Input type="text" value={editGstin} onChange={(e) => setEditGstin(e.target.value)} className="font-mono" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PAN NUMBER</label>
            <Input type="text" value={editPan} onChange={(e) => setEditPan(e.target.value)} className="font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">EMAIL ADDRESS *</label>
            <Input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">STATUS</label>
            <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">BANK ACCOUNT NUMBER</label>
            <Input type="text" value={editAccountNo} onChange={(e) => setEditAccountNo(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">IFSC CODE</label>
            <Input type="text" value={editIfsc} onChange={(e) => setEditIfsc(e.target.value)} className="font-mono" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">BILLING ADDRESS</label>
          <Input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
        </div>

        {formError && (
          <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
