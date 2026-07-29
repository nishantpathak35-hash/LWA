'use client';
import React from 'react';
import { Dialog, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import AttachmentsSection from '../../ui/AttachmentsSection';
import { formatCurrency } from '../../../app/lib/utils';
import { Building2, CreditCard, Mail, Phone, MapPin, User, MessageSquare, FileText, ShieldCheck } from 'lucide-react';

export default function VendorViewModal({ viewModalOpen, setViewModalOpen, viewVendor, viewVendorPOs }) {
  const vendorCode = viewVendor?.code || viewVendor?.vendorId || viewVendor?.vendor_code || '—';
  const legalName = viewVendor?.legalName || viewVendor?.legal_name || viewVendor?.name || '—';
  const tradeName = viewVendor?.tradeName || viewVendor?.trade_name || viewVendor?.name || '—';
  const gstin = viewVendor?.gstin || '—';
  const pan = viewVendor?.pan || '—';
  const email = viewVendor?.email || viewVendor?.contact_email || viewVendor?.primary_contact_email || '—';
  const status = viewVendor?.status || 'Active';
  const address = viewVendor?.address || '—';
  const accountNo = viewVendor?.accountNo || viewVendor?.account_no || '—';
  const ifsc = viewVendor?.ifsc || '—';

  const primaryContactName = viewVendor?.primaryContactName || viewVendor?.primary_contact_name || '—';
  const primaryContactNo = viewVendor?.primaryContactNo || viewVendor?.primary_contact_no || '—';
  const accountsContactName = viewVendor?.accountsContactName || viewVendor?.accounts_contact_name || '—';
  const accountsContactNo = viewVendor?.accountsContactNo || viewVendor?.accounts_contact_no || '—';
  const purchaseContactName = viewVendor?.purchaseContactName || viewVendor?.purchase_contact_name || '—';
  const purchaseContactNo = viewVendor?.purchaseContactNo || viewVendor?.purchase_contact_no || '—';
  const whatsappNumber = viewVendor?.whatsappNumber || viewVendor?.whatsapp_number || '—';
  const mobileNumber = viewVendor?.mobileNumber || viewVendor?.mobile_number || '—';
  const preferredWhatsappContact = viewVendor?.preferredWhatsappContact || viewVendor?.preferred_whatsapp_contact || 'Primary';

  return (
    <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="max-w-4xl" title={tradeName || 'Vendor Master Details'}>
      <div className="space-y-6 animate-fade-in">
        
        {/* Header Overview Card */}
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl space-y-4">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gold flex-shrink-0" />
                <h3 className="text-lg font-bold text-slate-100">{tradeName}</h3>
                <Badge variant={String(status).toLowerCase() === 'active' ? 'success' : 'default'}>
                  {status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">Legal Name: <strong className="text-slate-200">{legalName}</strong></p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Vendor Code</span>
              <span className="font-mono text-sm font-bold text-gold">{vendorCode}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>Email: <strong className="text-slate-200">{email}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Preferred Contact: <strong className="text-amber-400">{preferredWhatsappContact}</strong></span>
            </div>
          </div>
        </div>

        {/* Tax & Banking Details */}
        <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
          <h4 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Tax & Banking Identification
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">GSTIN</span>
              <span className="font-mono text-xs font-bold text-slate-200">{gstin}</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">PAN Number</span>
              <span className="font-mono text-xs font-bold text-slate-200">{pan}</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Bank Account No</span>
              <span className="font-mono text-xs font-bold text-slate-200">{accountNo}</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">IFSC Code</span>
              <span className="font-mono text-xs font-bold text-slate-200">{ifsc}</span>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" /> Billing Address
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-light">{address}</p>
        </div>

        {/* Contact Directory */}
        <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-4">
          <h4 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" /> Contact Persons & Directory
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-800/60 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Primary Contact</span>
              <div className="text-xs font-medium text-slate-200">{primaryContactName}</div>
              <div className="text-xs text-slate-400 font-mono">{primaryContactNo}</div>
            </div>
            <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-800/60 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Accounts Contact</span>
              <div className="text-xs font-medium text-slate-200">{accountsContactName}</div>
              <div className="text-xs text-slate-400 font-mono">{accountsContactNo}</div>
            </div>
            <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-800/60 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Purchase Contact</span>
              <div className="text-xs font-medium text-slate-200">{purchaseContactName}</div>
              <div className="text-xs text-slate-400 font-mono">{purchaseContactNo}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <MessageSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>WhatsApp Number: <strong className="font-mono text-slate-200">{whatsappNumber}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Phone className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Mobile Number: <strong className="font-mono text-slate-200">{mobileNumber}</strong></span>
            </div>
          </div>
        </div>

        {/* Associated POs */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" /> Associated Purchase Orders ({viewVendorPOs.length})
          </h4>
          {viewVendorPOs.length === 0 ? (
            <p className="text-xs text-slate-500 font-light p-4 bg-slate-950/20 border border-slate-900 rounded-lg text-center">
              No Purchase Orders associated with this vendor.
            </p>
          ) : (
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-800 hover:bg-transparent">
                    <TableHead className="h-8 text-[10px] text-slate-500">PO No</TableHead>
                    <TableHead className="h-8 text-[10px] text-slate-500">Project</TableHead>
                    <TableHead className="h-8 text-[10px] text-slate-500">Status</TableHead>
                    <TableHead className="h-8 text-[10px] text-slate-500 text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewVendorPOs.map((p, i) => (
                    <TableRow key={i} className="border-b border-slate-800 hover:bg-slate-900/40">
                      <TableCell className="py-2 font-mono text-xs text-gold">{p.poNo}</TableCell>
                      <TableCell className="py-2 text-xs text-slate-300">{p.project || '—'}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant={String(p.status || '').toLowerCase() === 'active' || String(p.status || '').toLowerCase() === 'approved' ? 'success' : 'default'}>
                          {p.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-xs font-semibold text-right text-slate-200">{formatCurrency(p.poValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="pt-4 border-t border-slate-800">
          <AttachmentsSection entityType="vendor" entityId={vendorCode || viewVendor?.id} />
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <Button variant="ghost" onClick={() => setViewModalOpen(false)}>Close</Button>
        </div>

      </div>
    </Dialog>
  );
}
