'use client';
import React from 'react';
import { Dialog, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import AttachmentsSection from '../../ui/AttachmentsSection';
import { formatCurrency } from '../../../app/lib/utils';
import { Building2, CreditCard, Mail, Phone, MapPin, User, MessageSquare, FileText, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react';

export default function VendorViewModal({ viewModalOpen, setViewModalOpen, viewVendor, viewVendorPOs, canDelete, handleDeleteVendor }) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState(null);
  const vendorCode = viewVendor?.code || viewVendor?.vendorId || viewVendor?.vendor_code || '—';
  const legalName = viewVendor?.legalName || viewVendor?.legal_name || viewVendor?.name || '—';
  const tradeName = viewVendor?.tradeName || viewVendor?.trade_name || viewVendor?.name || '—';
  const gstin = viewVendor?.gstin || '—';
  const pan = viewVendor?.pan || '—';
  const email = viewVendor?.email || viewVendor?.contact_email || viewVendor?.primary_contact_email || '—';
  const status = viewVendor?.status || 'Active';
  const address = viewVendor?.address || '—';
  const accountNo = viewVendor?.accountNo || viewVendor?.account_no || viewVendor?.bank_account || viewVendor?.bankAccount || '—';
  const ifsc = viewVendor?.ifsc || viewVendor?.ifsc_code || viewVendor?.ifscCode || '—';

  const primaryContactName = viewVendor?.primaryContactName || viewVendor?.primary_contact_name || '—';
  const primaryContactNo = viewVendor?.primaryContactNo || viewVendor?.primary_contact_no || '—';
  const accountsContactName = viewVendor?.accountsContactName || viewVendor?.accounts_contact_name || '—';
  const accountsContactNo = viewVendor?.accountsContactNo || viewVendor?.accounts_contact_no || '—';
  const purchaseContactName = viewVendor?.purchaseContactName || viewVendor?.purchase_contact_name || '—';
  const purchaseContactNo = viewVendor?.purchaseContactNo || viewVendor?.purchase_contact_no || '—';
  const mobileNumber = viewVendor?.mobileNumber || viewVendor?.mobile_number || viewVendor?.mobile || '—';

  return (
    <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="max-w-4xl" title={tradeName || 'Vendor Master Details'}>
      <div className="space-y-5 animate-fade-in">
        
        {/* Header Overview Card */}
        <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600 dark:text-gold flex-shrink-0" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{tradeName}</h3>
                <Badge variant={String(status).toLowerCase() === 'active' ? 'success' : 'default'}>
                  {status}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Legal Name: <strong className="text-slate-900 dark:text-slate-200 font-bold">{legalName}</strong></p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vendor Code</span>
              <span className="font-mono text-sm font-bold text-amber-700 dark:text-gold">{vendorCode}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Email: <strong className="text-slate-900 dark:text-slate-200 font-semibold">{email}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>Mobile Number: <strong className="font-mono text-slate-900 dark:text-slate-200 font-bold">{mobileNumber}</strong></span>
            </div>
          </div>
        </div>

        {/* Tax & Banking Details */}
        <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
          <h4 className="text-xs font-bold text-amber-800 dark:text-gold uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Tax & Banking Identification
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
            <div className="p-3 bg-amber-50/50 dark:bg-slate-900/60 rounded-lg border border-amber-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">GSTIN</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{gstin}</span>
            </div>
            <div className="p-3 bg-amber-50/50 dark:bg-slate-900/60 rounded-lg border border-amber-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">PAN Number</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{pan}</span>
            </div>
            <div className="p-3 bg-amber-50/50 dark:bg-slate-900/60 rounded-lg border border-amber-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Bank Account No</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{accountNo}</span>
            </div>
            <div className="p-3 bg-amber-50/50 dark:bg-slate-900/60 rounded-lg border border-amber-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">IFSC Code</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{ifsc}</span>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" /> Billing Address
          </h4>
          <p className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-medium">{address}</p>
        </div>

        {/* Contact Directory */}
        <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
          <h4 className="text-xs font-bold text-amber-800 dark:text-gold uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" /> Contact Persons & Directory
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-3 bg-amber-50/50 dark:bg-slate-900/60 rounded-lg border border-amber-200/60 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Primary Contact</span>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">{primaryContactName}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">{primaryContactNo}</div>
            </div>
            <div className="p-3 bg-amber-50/50 dark:bg-slate-900/60 rounded-lg border border-amber-200/60 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Accounts Contact</span>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">{accountsContactName}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">{accountsContactNo}</div>
            </div>
            <div className="p-3 bg-amber-50/50 dark:bg-slate-900/60 rounded-lg border border-amber-200/60 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Purchase Contact</span>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">{purchaseContactName}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">{purchaseContactNo}</div>
            </div>
          </div>
        </div>

        {/* Associated POs */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" /> Associated Purchase Orders ({viewVendorPOs.length})
          </h4>
          {viewVendorPOs.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
              No Purchase Orders associated with this vendor.
            </p>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-transparent">
                    <TableHead className="h-8 text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase">PO No</TableHead>
                    <TableHead className="h-8 text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase">Project</TableHead>
                    <TableHead className="h-8 text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase">Status</TableHead>
                    <TableHead className="h-8 text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewVendorPOs.map((p, i) => (
                    <TableRow key={i} className="border-b border-slate-200 dark:border-slate-800/80 hover:bg-amber-50/40 dark:hover:bg-slate-900/40">
                      <TableCell className="py-2.5 font-mono text-xs text-amber-700 dark:text-gold font-bold">{p.poNo}</TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-900 dark:text-slate-300 font-medium">{p.project || '—'}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant={String(p.status || '').toLowerCase() === 'active' || String(p.status || '').toLowerCase() === 'approved' ? 'success' : 'default'}>
                          {p.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs font-bold text-right text-slate-900 dark:text-slate-100">{formatCurrency(p.poValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <AttachmentsSection entityType="vendor" entityId={vendorCode || viewVendor?.id} />
        </div>

        {confirmDelete && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Are you sure you want to delete vendor "{tradeName || legalName}"?</span>
            </div>
            <p className="text-[11px] text-red-300/90">This operation cannot be undone. Vendors linked to existing Purchase Orders or Payment Requests cannot be deleted.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setConfirmDelete(false); setDeleteError(null); }} className="text-xs text-slate-300">Cancel</Button>
              <Button type="button" variant="danger" size="sm" disabled={deleting} onClick={async () => {
                setDeleting(true); setDeleteError(null);
                try {
                  await handleDeleteVendor(vendorCode || viewVendor?.id);
                  setViewModalOpen(false);
                } catch (err) {
                  setDeleteError(err.message || 'Failed to delete vendor.');
                } finally {
                  setDeleting(false);
                  setConfirmDelete(false);
                }
              }} className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white">
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        )}

        {deleteError && (
          <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            {canDelete && !confirmDelete && (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center gap-1.5 font-semibold">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Vendor</span>
              </Button>
            )}
          </div>
          <Button variant="ghost" onClick={() => setViewModalOpen(false)} className="text-xs">Close</Button>
        </div>

      </div>
    </Dialog>
  );
}
