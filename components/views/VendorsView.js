'use client';

import React, { useState, useMemo } from 'react';
import { toast } from '../ui/Toast';
import { useAppState } from '../StateProvider';

import VendorsHeader from './vendors/VendorsHeader';
import VendorOnboardModal from './vendors/VendorOnboardModal';
import VendorViewModal from './vendors/VendorViewModal';
import VendorEditModal from './vendors/VendorEditModal';

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
  const isProcurement = roles.some(role => ['proc', 'procurement', 'maker'].includes(role));
  const isAdmin = roles.includes('admin');
  const canOnboard = isProcurement || isAdmin;

  const filteredVendors = vendors.filter(v => {
    const q = searchQuery.toLowerCase();
    return (v.name || '').toLowerCase().includes(q) ||
           (v.legalName || '').toLowerCase().includes(q) ||
           (v.code || '').toLowerCase().includes(q);
  });

  const handleOpenModal = () => {
    setName(''); setLegalName(''); setVendorCode(''); setGstin(''); setAddress('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!name || !vendorCode) { setFormError('Vendor Name and Vendor Code are required.'); return; }
    setSubmitting(true); setFormError(null);
    try {
      const payload = { legalName: legalName || name, tradeName: name, vendorCode: vendorCode.trim().toUpperCase(), gstin: gstin.trim(), address: address.trim(), status: 'Active' };
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
    setViewVendor(v); setViewVendorPOs([]); setViewModalOpen(true);
    try {
      const allPOs = await call('getPOsByVendor', v.code);
      setViewVendorPOs(allPOs || []);
    } catch (e) { console.error('Failed to load POs for vendor:', e); }
  };

  const handleOpenEditModal = async (v) => {
    setFormError(null); setSubmitting(false);
    try {
      const fullVendor = await call('getVendorByName', v.code || v.name);
      const src = fullVendor || v;
      // Use vendor_code as the stable entityId for attachments.
      // Fall back through v.code → legalName → name for legacy PO-sourced vendors.
      const resolvedId = src.vendorId || v.code || src.legalName || v.legalName || v.name || '';
      setEditVendorId(resolvedId);
      setEditLegalName(src.legalName || v.legalName || v.name || '');
      setEditTradeName(src.tradeName || v.name || '');
      setEditGstin(src.gstin || v.gstin || '');
      setEditPan(src.pan || '');
      setEditStatus(src.status || 'Active');
      setEditAddress(src.address || v.address || '');
      setEditEmail(src.email || v.email || '');
      setEditAccountNo(src.accountNo || v.accountNo || '');
      setEditIfsc(src.ifsc || v.ifsc || '');
      setEditModalOpen(true);
    } catch (err) { toast.error('Failed to load vendor: ' + err.message); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editLegalName) { setFormError('Legal Name is required.'); return; }
    setSubmitting(true); setFormError(null);
    try {
      const payload = { vendorId: editVendorId, legalName: editLegalName, tradeName: editTradeName, gstin: editGstin.trim().toUpperCase(), pan: editPan.trim().toUpperCase(), status: editStatus, address: editAddress.trim(), email: editEmail.trim(), accountNo: editAccountNo.trim(), ifsc: editIfsc.trim().toUpperCase() };
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
      <VendorsHeader
        canOnboard={canOnboard} handleOpenModal={handleOpenModal}
        filteredVendors={filteredVendors} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        handleOpenViewModal={handleOpenViewModal} handleOpenEditModal={handleOpenEditModal} setActiveView={setActiveView}
      />
      <VendorOnboardModal
        modalOpen={modalOpen} setModalOpen={setModalOpen}
        name={name} setName={setName} legalName={legalName} setLegalName={setLegalName}
        vendorCode={vendorCode} setVendorCode={setVendorCode} gstin={gstin} setGstin={setGstin}
        address={address} setAddress={setAddress} formError={formError} submitting={submitting}
        handleOnboardSubmit={handleOnboardSubmit}
      />
      <VendorViewModal
        viewModalOpen={viewModalOpen} setViewModalOpen={setViewModalOpen}
        viewVendor={viewVendor} viewVendorPOs={viewVendorPOs}
      />
      <VendorEditModal
        editModalOpen={editModalOpen} setEditModalOpen={setEditModalOpen}
        editVendorId={editVendorId} editTradeName={editTradeName} setEditTradeName={setEditTradeName}
        editLegalName={editLegalName} setEditLegalName={setEditLegalName}
        editGstin={editGstin} setEditGstin={setEditGstin} editPan={editPan} setEditPan={setEditPan}
        editEmail={editEmail} setEditEmail={setEditEmail} editStatus={editStatus} setEditStatus={setEditStatus}
        editAccountNo={editAccountNo} setEditAccountNo={setEditAccountNo}
        editIfsc={editIfsc} setEditIfsc={setEditIfsc} editAddress={editAddress} setEditAddress={setEditAddress}
        formError={formError} submitting={submitting} handleEditSubmit={handleEditSubmit}
      />
    </div>
  );
}
