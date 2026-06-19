'use client';

import React, { useState } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Dialog } from '../ui/core';
import { PlusCircle, Search, Users, MapPin, Building, ShieldAlert } from 'lucide-react';

export default function VendorsView() {
  const { vendors, user, call, refreshData } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const roles = user?.roles || [];
  const isProcurement = roles.includes('procurement') || roles.includes('maker');
  const isAdmin = roles.includes('admin');
  const canOnboard = isProcurement || isAdmin;

  // Filter vendors list based on query
  const filteredVendors = vendors.filter(v => {
    const q = searchQuery.toLowerCase();
    return (v.name || '').toLowerCase().includes(q) || 
           (v.legalName || '').toLowerCase().includes(q) || 
           (v.code || '').toLowerCase().includes(q);
  });

  const handleOpenModal = () => {
    setName('');
    setLegalName('');
    setVendorCode('');
    setGstin('');
    setAddress('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!name || !vendorCode) {
      setFormError('Vendor Name and Vendor Code are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        name,
        legal_name: legalName || name,
        vendor_code: vendorCode.trim().toUpperCase(),
        gstin: gstin.trim(),
        address: address.trim(),
        status: 'Active'
      };
      await call('addVendor', payload);
      await refreshData();
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to onboard vendor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gold/10 text-gold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-light text-slate-100 font-serif">Vendors</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Manage onboarded vendor files and profiles.</p>
          </div>
        </div>

        {canOnboard && (
          <Button variant="primary" size="sm" onClick={handleOpenModal}>
            <PlusCircle className="w-4 h-4" />
            Onboard Vendor
          </Button>
        )}
      </div>

      {/* Search and Table Grid */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4">
          <CardTitle className="text-sm font-semibold text-slate-400">REGISTERED VENDORS ({filteredVendors.length})</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs py-1.5 h-8 bg-slate-950/40"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredVendors.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-light">
              No vendors found matching your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Legal Name</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((v, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-slate-200">{v.code}</TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell className="text-slate-400">{v.legalName || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{v.gstin || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={String(v.status || '').toLowerCase() === 'active' ? 'success' : 'inactive'}>
                        {v.status || 'Active'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Onboard Vendor Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Onboard New Vendor">
        <form onSubmit={handleOnboardSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR DISPLAY NAME *</label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Atelier Marble Studio"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR CODE (UNIQUE) *</label>
              <Input
                type="text"
                required
                value={vendorCode}
                onChange={(e) => setVendorCode(e.target.value)}
                placeholder="e.g. VEND-AM01"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">LEGAL BUSINESS NAME (FOR POs)</label>
            <Input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. Atelier Marble Studio Private Limited"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">GSTIN NUMBER</label>
              <Input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 07AAAAA1111A1Z1"
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">BILLING ADDRESS</label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address, City, PIN code"
              />
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Onboarding...' : 'Onboard Vendor'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
