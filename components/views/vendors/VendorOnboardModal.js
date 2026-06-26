'use client';
import React from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { ShieldAlert } from 'lucide-react';

export default function VendorOnboardModal({ modalOpen, setModalOpen, name, setName, legalName, setLegalName, vendorCode, setVendorCode, gstin, setGstin, address, setAddress, formError, submitting, handleOnboardSubmit }) {
  return (
    <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Onboard New Vendor">
      <form onSubmit={handleOnboardSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR DISPLAY NAME *</label>
            <Input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Atelier Marble Studio" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR CODE (UNIQUE) *</label>
            <Input type="text" required value={vendorCode} onChange={(e) => setVendorCode(e.target.value)} placeholder="e.g. VEND-AM01" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">LEGAL BUSINESS NAME (FOR POs)</label>
          <Input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="e.g. Atelier Marble Studio Private Limited" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">GSTIN NUMBER</label>
            <Input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="e.g. 07AAAAA1111A1Z1" className="font-mono" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">BILLING ADDRESS</label>
            <Input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address, City, PIN code" />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-500 italic">
          After saving, open the vendor in <strong className="text-slate-400">Edit</strong> to upload documents (GST Certificate, PAN, Cancelled Cheque, etc.).
        </div>

        {formError && (
          <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Onboarding...' : 'Onboard Vendor'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
