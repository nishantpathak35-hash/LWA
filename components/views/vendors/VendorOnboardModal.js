'use client';
import React from 'react';
import { Dialog, Button, Input, Select } from '../../ui/core';
import { ShieldAlert } from 'lucide-react';

export default function VendorOnboardModal({ 
  modalOpen, setModalOpen, name, setName, legalName, setLegalName, vendorCode, setVendorCode, 
  gstin, setGstin, address, setAddress, formError, submitting, handleOnboardSubmit,
  primaryContactName, setPrimaryContactName, primaryContactNo, setPrimaryContactNo,
  accountsContactName, setAccountsContactName, accountsContactNo, setAccountsContactNo,
  purchaseContactName, setPurchaseContactName, purchaseContactNo, setPurchaseContactNo,
  whatsappNumber, setWhatsappNumber, mobileNumber, setMobileNumber,
  preferredWhatsappContact, setPreferredWhatsappContact
}) {
  return (
    <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Onboard New Vendor">
      <form onSubmit={handleOnboardSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR DISPLAY NAME *</label>
            <Input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Atelier Marble Studio" />
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

        <div className="mt-6 space-y-4 border-t border-slate-700/50 pt-4">
          <h3 className="text-sm font-medium text-slate-300">Contact Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PRIMARY CONTACT NAME</label>
              <Input type="text" value={primaryContactName} onChange={(e) => setPrimaryContactName(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PRIMARY CONTACT NO</label>
              <Input type="text" value={primaryContactNo} onChange={(e) => setPrimaryContactNo(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">ACCOUNTS CONTACT NAME</label>
              <Input type="text" value={accountsContactName} onChange={(e) => setAccountsContactName(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">ACCOUNTS CONTACT NO</label>
              <Input type="text" value={accountsContactNo} onChange={(e) => setAccountsContactNo(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PURCHASE CONTACT NAME</label>
              <Input type="text" value={purchaseContactName} onChange={(e) => setPurchaseContactName(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PURCHASE CONTACT NO</label>
              <Input type="text" value={purchaseContactNo} onChange={(e) => setPurchaseContactNo(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">WHATSAPP NUMBER</label>
              <Input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">MOBILE NUMBER</label>
              <Input type="text" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PREFERRED WHATSAPP CONTACT</label>
              <Select value={preferredWhatsappContact} onChange={(e) => setPreferredWhatsappContact(e.target.value)}>
                <option value="Primary">Primary Contact</option>
                <option value="Accounts">Accounts Contact</option>
                <option value="Purchase">Purchase Contact</option>
                <option value="Other">WhatsApp/Mobile Number</option>
              </Select>
            </div>
          </div>
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
