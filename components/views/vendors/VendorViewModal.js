'use client';
import React from 'react';
import { Dialog, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import AttachmentsSection from '../../ui/AttachmentsSection';
import { formatCurrency } from '../../../app/lib/utils';

export default function VendorViewModal({ viewModalOpen, setViewModalOpen, viewVendor, viewVendorPOs }) {
  return (
    <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} title={viewVendor?.name || 'Vendor Details'}>
      <div className="space-y-6">
        <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl grid grid-cols-2 gap-4 text-sm font-light">
          <p className="text-slate-400 col-span-2">Legal Name: <strong className="text-slate-200">{viewVendor?.legalName || viewVendor?.name || '—'}</strong></p>
          <p className="text-slate-400">Vendor Code: <strong className="text-slate-200">{viewVendor?.code || '—'}</strong></p>
          <p className="text-slate-400">GSTIN: <strong className="text-slate-200">{viewVendor?.gstin || '—'}</strong></p>
          <p className="text-slate-400">Status: <strong className="text-slate-200">{viewVendor?.status || 'Active'}</strong></p>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase Orders</h4>
          {viewVendorPOs.length === 0 ? (
            <p className="text-sm text-slate-500 font-light">No Purchase Orders associated with this vendor.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO No</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewVendorPOs.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs text-gold">{p.poNo}</TableCell>
                    <TableCell>{p.project || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={String(p.status || '').toLowerCase() === 'active' || String(p.status || '').toLowerCase() === 'approved' ? 'success' : 'default'}>
                        {p.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(p.poValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="pt-4 border-t border-slate-900/60">
          <AttachmentsSection entityType="vendor" entityId={viewVendor?.code} />
        </div>

        <div className="pt-4 border-t border-slate-900/60 flex justify-end">
          <Button variant="ghost" onClick={() => setViewModalOpen(false)}>Close</Button>
        </div>
      </div>
    </Dialog>
  );
}
