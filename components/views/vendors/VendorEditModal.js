'use client';
import React from 'react';
import { Dialog, Button, Input, Select } from '../../ui/core';
import { ShieldAlert } from 'lucide-react';
import AttachmentsSection from '../../ui/AttachmentsSection';

export default function VendorEditModal({
  editModalOpen, setEditModalOpen, editVendorId,
  editTradeName, setEditTradeName, editLegalName, setEditLegalName,
  editGstin, setEditGstin, editPan, setEditPan,
  editEmail, setEditEmail, editStatus, setEditStatus,
  editAccountNo, setEditAccountNo, editIfsc, setEditIfsc,
  editAddress, setEditAddress, formError, submitting, handleEditSubmit,
  editPrimaryContactName, setEditPrimaryContactName, editPrimaryContactNo, setEditPrimaryContactNo,
  editAccountsContactName, setEditAccountsContactName, editAccountsContactNo, setEditAccountsContactNo,
  editPurchaseContactName, setEditPurchaseContactName, editPurchaseContactNo, setEditPurchaseContactNo,
  editWhatsappNumber, setEditWhatsappNumber, editMobileNumber, setEditMobileNumber,
  editPreferredWhatsappContact, setEditPreferredWhatsappContact
}) {
  return (
    <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Vendor Master Record">
      <form onSubmit={handleEditSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">VENDOR DISPLAY NAME *</label>
            <Input type="text" required value={editTradeName} onChange={(e) => setEditTradeName(e.target.value)} className="bg-background text-foreground text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">VENDOR CODE (READ-ONLY)</label>
            <Input type="text" disabled value={editVendorId} className="bg-muted text-muted-foreground font-mono text-xs cursor-not-allowed" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">LEGAL BUSINESS NAME (FOR POs) *</label>
          <Input type="text" required value={editLegalName} onChange={(e) => setEditLegalName(e.target.value)} className="bg-background text-foreground text-xs" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">GSTIN NUMBER</label>
            <Input type="text" value={editGstin} onChange={(e) => setEditGstin(e.target.value)} className="font-mono bg-background text-foreground text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PAN NUMBER</label>
            <Input type="text" value={editPan} onChange={(e) => setEditPan(e.target.value)} className="font-mono bg-background text-foreground text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">EMAIL ADDRESS *</label>
            <Input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="bg-background text-foreground text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">STATUS</label>
            <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="bg-background text-foreground text-xs font-semibold">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">BANK ACCOUNT NUMBER</label>
            <Input type="text" value={editAccountNo} onChange={(e) => setEditAccountNo(e.target.value)} className="bg-background text-foreground text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">IFSC CODE</label>
            <Input type="text" value={editIfsc} onChange={(e) => setEditIfsc(e.target.value)} className="font-mono bg-background text-foreground text-xs" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">BILLING ADDRESS</label>
          <Input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="bg-background text-foreground text-xs" />
        </div>

        {editVendorId && editVendorId.trim() !== '' && (
          <div className="pt-3 border-t border-border">
            <AttachmentsSection entityType="vendor" entityId={editVendorId} />
          </div>
        )}

        <div className="mt-6 space-y-4 border-t border-border pt-4">
          <h3 className="text-xs font-bold text-amber-800 dark:text-gold uppercase tracking-wider">Contact Persons & Communication Directory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PRIMARY CONTACT NAME</label>
              <Input type="text" value={editPrimaryContactName} onChange={(e) => setEditPrimaryContactName(e.target.value)} className="bg-background text-foreground text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PRIMARY CONTACT NO</label>
              <Input type="text" value={editPrimaryContactNo} onChange={(e) => setEditPrimaryContactNo(e.target.value)} className="bg-background text-foreground text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">ACCOUNTS CONTACT NAME</label>
              <Input type="text" value={editAccountsContactName} onChange={(e) => setEditAccountsContactName(e.target.value)} className="bg-background text-foreground text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">ACCOUNTS CONTACT NO</label>
              <Input type="text" value={editAccountsContactNo} onChange={(e) => setEditAccountsContactNo(e.target.value)} className="bg-background text-foreground text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PURCHASE CONTACT NAME</label>
              <Input type="text" value={editPurchaseContactName} onChange={(e) => setEditPurchaseContactName(e.target.value)} className="bg-background text-foreground text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PURCHASE CONTACT NO</label>
              <Input type="text" value={editPurchaseContactNo} onChange={(e) => setEditPurchaseContactNo(e.target.value)} className="bg-background text-foreground text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">WHATSAPP NUMBER</label>
              <Input type="text" value={editWhatsappNumber} onChange={(e) => setEditWhatsappNumber(e.target.value)} className="bg-background text-foreground text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">MOBILE NUMBER</label>
              <Input type="text" value={editMobileNumber} onChange={(e) => setEditMobileNumber(e.target.value)} className="bg-background text-foreground text-xs" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PREFERRED WHATSAPP CONTACT</label>
              <Select value={editPreferredWhatsappContact} onChange={(e) => setEditPreferredWhatsappContact(e.target.value)} className="bg-background text-foreground text-xs font-semibold">
                <option value="Primary">Primary Contact</option>
                <option value="Accounts">Accounts Contact</option>
                <option value="Purchase">Purchase Contact</option>
                <option value="Other">WhatsApp/Mobile Number</option>
              </Select>
            </div>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="pt-4 border-t border-border flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)} className="text-xs">Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting} className="text-xs font-bold">
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
