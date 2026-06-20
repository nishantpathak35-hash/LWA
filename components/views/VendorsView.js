'use client';

import React, { useState } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Dialog, Select } from '../ui/core';
import { formatCurrency } from '../../app/lib/utils';
import { PlusCircle, Search, Users, MapPin, Building, ShieldAlert, Edit2, Eye, CreditCard } from 'lucide-react';

export default function VendorsView() {
  const { vendors, user, call, refreshData, setActiveView } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // View/Edit dialog state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewVendor, setViewVendor] = useState(null);
  const [viewVendorPOs, setViewVendorPOs] = useState([]);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editVendorId, setEditVendorId] = useState('');
  const [editLegalName, setEditLegalName] = useState('');
  const [editTradeName, setEditTradeName] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editPan, setEditPan] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editAddress, setEditAddress] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAccountNo, setEditAccountNo] = useState('');
  const [editIfsc, setEditIfsc] = useState('');

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
        legalName: legalName || name,
        tradeName: name,
        vendorCode: vendorCode.trim().toUpperCase(),
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

  const handleOpenViewModal = async (v) => {
    setViewVendor(v);
    setViewVendorPOs([]);
    setViewModalOpen(true);
    try {
      const allPOs = await call('getPOsByVendor', v.code);
      setViewVendorPOs(allPOs || []);
    } catch (e) {
      console.error('Failed to load POs for vendor:', e);
    }
  };

  const handleOpenEditModal = async (v) => {
    setFormError(null);
    setSubmitting(false);
    try {
      const fullVendor = await call('getVendorByName', v.code || v.name);
      if (fullVendor) {
        setEditVendorId(fullVendor.vendorId || v.code || '');
        setEditLegalName(fullVendor.legalName || v.legalName || v.name || '');
        setEditTradeName(fullVendor.tradeName || v.name || '');
        setEditGstin(fullVendor.gstin || v.gstin || '');
        setEditPan(fullVendor.pan || '');
        setEditStatus(fullVendor.status || 'Active');
        setEditAddress(fullVendor.address || v.address || '');
        setEditEmail(fullVendor.email || v.email || '');
        setEditAccountNo(fullVendor.accountNo || v.accountNo || '');
        setEditIfsc(fullVendor.ifsc || v.ifsc || '');
        setEditModalOpen(true);
      } else {
        alert('Vendor details not found in master data.');
      }
    } catch (err) {
      alert('Failed to load vendor: ' + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editLegalName) {
      setFormError('Legal Name is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        vendorId: editVendorId,
        legalName: editLegalName,
        tradeName: editTradeName,
        gstin: editGstin.trim().toUpperCase(),
        pan: editPan.trim().toUpperCase(),
        status: editStatus,
        address: editAddress.trim(),
        email: editEmail.trim(),
        accountNo: editAccountNo.trim(),
        ifsc: editIfsc.trim().toUpperCase()
      };
      await call('updateVendor', payload);
      await refreshData();
      setEditModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to update vendor.');
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
                  <TableHead className="text-center">Actions</TableHead>
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
                    <TableCell className="text-center flex justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenViewModal(v)} title="View Vendor Details">
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Button>
                      {canOnboard && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(v)} title="Edit Vendor">
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setActiveView('payments')} title="Request Payment">
                        <CreditCard className="w-3.5 h-3.5" />
                        Request
                      </Button>
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

      {/* View Vendor Modal */}
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

          <div className="pt-4 border-t border-slate-900/60 flex justify-end">
            <Button variant="ghost" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Vendor Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Vendor Details">
        <form onSubmit={handleEditSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR DISPLAY NAME *</label>
              <Input
                type="text"
                required
                value={editTradeName}
                onChange={(e) => setEditTradeName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR CODE (READ-ONLY)</label>
              <Input
                type="text"
                disabled
                value={editVendorId}
                className="bg-slate-900/50"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">LEGAL BUSINESS NAME (FOR POs) *</label>
            <Input
              type="text"
              required
              value={editLegalName}
              onChange={(e) => setEditLegalName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">GSTIN NUMBER</label>
              <Input
                type="text"
                value={editGstin}
                onChange={(e) => setEditGstin(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PAN NUMBER</label>
              <Input
                type="text"
                value={editPan}
                onChange={(e) => setEditPan(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">EMAIL ADDRESS *</label>
              <Input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
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
              <Input
                type="text"
                value={editAccountNo}
                onChange={(e) => setEditAccountNo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">IFSC CODE</label>
              <Input
                type="text"
                value={editIfsc}
                onChange={(e) => setEditIfsc(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">BILLING ADDRESS</label>
            <Input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
          </div>

          {formError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
