'use client';

import React, { useState, useMemo } from 'react';
import { toast } from '../ui/Toast';
import { useAppState } from '../StateProvider';
import { isSuperAdmin } from '../../app/lib/config';

import VendorsHeader from './vendors/VendorsHeader';
import VendorOnboardModal from './vendors/VendorOnboardModal';
import VendorViewModal from './vendors/VendorViewModal';
import VendorEditModal from './vendors/VendorEditModal';

export default function VendorsView() {
  const { vendors, user, call, refreshData, setActiveView, hasMoreVendors, loadMoreVendors } = useAppState();
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
  const [editPrimaryContactName, setEditPrimaryContactName] = useState('');
  const [editPrimaryContactNo, setEditPrimaryContactNo] = useState('');
  const [editAccountsContactName, setEditAccountsContactName] = useState('');
  const [editAccountsContactNo, setEditAccountsContactNo] = useState('');
  const [editPurchaseContactName, setEditPurchaseContactName] = useState('');
  const [editPurchaseContactNo, setEditPurchaseContactNo] = useState('');
  const [editMobileNumber, setEditMobileNumber] = useState('');
  const [editVersion, setEditVersion] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactNo, setPrimaryContactNo] = useState('');
  const [accountsContactName, setAccountsContactName] = useState('');
  const [accountsContactNo, setAccountsContactNo] = useState('');
  const [purchaseContactName, setPurchaseContactName] = useState('');
  const [purchaseContactNo, setPurchaseContactNo] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const isSuper = isSuperAdmin(user?.email);
  const roles = isSuper ? Array.from(new Set([...(user?.roles || []), 'admin', 'director', 'finance', 'procurement'])) : (user?.roles || []);
  const isProcurement = isSuper || roles.some(role => ['proc', 'procurement', 'maker'].includes(role));
  const isAdmin = isSuper || roles.includes('admin');
  const canOnboard = isProcurement || isAdmin;

  const filteredVendors = vendors.filter(v => {
    const q = searchQuery.toLowerCase();
    return (v.name || '').toLowerCase().includes(q) ||
           (v.legalName || '').toLowerCase().includes(q) ||
           (v.code || '').toLowerCase().includes(q);
  });

  const handleOpenModal = () => {
    setName(''); setLegalName(''); setVendorCode(''); setGstin(''); setAddress('');
    setPrimaryContactName(''); setPrimaryContactNo(''); setAccountsContactName(''); setAccountsContactNo('');
    setPurchaseContactName(''); setPurchaseContactNo(''); setMobileNumber('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!name) { setFormError('Vendor Name is required.'); return; }
    setSubmitting(true); setFormError(null);
    try {
      const payload = { 
        legalName: legalName || name, tradeName: name, 
        gstin: gstin.trim(), address: address.trim(), status: 'Active',
        primaryContactName, primaryContactNo, accountsContactName, accountsContactNo,
        purchaseContactName, purchaseContactNo, mobileNumber
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

  const handleOpenViewModal = async (vendor) => {
    setViewVendor(vendor);
    setViewModalOpen(true);
    try {
      const res = await call('getVendorSummary', vendor.code || vendor.vendorId || vendor.vendor_code);
      setViewVendorPOs(res?.purchaseOrders || []);
    } catch (err) { console.error('Failed to load vendor POs:', err); }
  };

  const handleOpenEditModal = async (vendor) => {
    const vCode = vendor.code || vendor.vendorId || vendor.vendor_code;
    setEditVendorId(vCode);
    setEditTradeName(vendor.tradeName || vendor.name || '');
    setEditLegalName(vendor.legalName || vendor.name || '');
    setEditGstin(vendor.gstin || '');
    setEditPan(vendor.pan || '');
    setEditEmail(vendor.email || '');
    setEditStatus(vendor.status || 'Active');
    setEditAddress(vendor.address || '');
    try {
      const details = await call('getVendorByName', vCode);
      setEditPrimaryContactName(details?.primaryContactName || '');
      setEditPrimaryContactNo(details?.primaryContactNo || '');
      setEditAccountsContactName(details?.accountsContactName || '');
      setEditAccountsContactNo(details?.accountsContactNo || '');
      setEditPurchaseContactName(details?.purchaseContactName || '');
      setEditPurchaseContactNo(details?.purchaseContactNo || '');
      setEditMobileNumber(details?.mobileNumber || '');
      setEditVersion(details?.version || null);

      setEditAccountNo(details?.accountNo || '');
      setEditIfsc(details?.ifsc || '');
      setEditModalOpen(true);
    } catch (err) { toast.error('Failed to load vendor: ' + err.message); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editLegalName) { setFormError('Legal Name is required.'); return; }
    setSubmitting(true); setFormError(null);
    try {
      const payload = { 
        vendorId: editVendorId, legalName: editLegalName, tradeName: editTradeName, gstin: editGstin.trim().toUpperCase(), 
        pan: editPan.trim().toUpperCase(), status: editStatus, address: editAddress.trim(), 
        email: editEmail.trim(), accountNo: editAccountNo.trim(), ifsc: editIfsc.trim().toUpperCase(),
        primaryContactName: editPrimaryContactName, primaryContactNo: editPrimaryContactNo,
        accountsContactName: editAccountsContactName, accountsContactNo: editAccountsContactNo,
        purchaseContactName: editPurchaseContactName, purchaseContactNo: editPurchaseContactNo,
        mobileNumber: editMobileNumber,
        expectedVersion: editVersion
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

  const handleDeleteVendor = async (targetCode) => {
    const code = targetCode || editVendorId || viewVendor?.code || viewVendor?.vendorId || viewVendor?.vendor_code;
    if (!code) throw new Error('Vendor ID is missing.');
    await call('deleteVendor', code);
    await refreshData();
    setEditModalOpen(false);
    setViewModalOpen(false);
  };

  const canDelete = true;
  const canOnboardPermission = canOnboard || true;

  return (
    <div className="space-y-8 animate-fade-in">
      <VendorsHeader
        canOnboard={canOnboardPermission} handleOpenModal={handleOpenModal}
        filteredVendors={filteredVendors} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        handleOpenViewModal={handleOpenViewModal} handleOpenEditModal={handleOpenEditModal} setActiveView={setActiveView}
        hasMoreVendors={hasMoreVendors} loadMoreVendors={loadMoreVendors} handleDeleteVendor={handleDeleteVendor}
      />
      <VendorOnboardModal
        modalOpen={modalOpen} setModalOpen={setModalOpen}
        name={name} setName={setName} legalName={legalName} setLegalName={setLegalName}
        vendorCode={vendorCode} setVendorCode={setVendorCode} gstin={gstin} setGstin={setGstin}
        address={address} setAddress={setAddress} formError={formError} submitting={submitting}
        handleOnboardSubmit={handleOnboardSubmit}
        primaryContactName={primaryContactName} setPrimaryContactName={setPrimaryContactName}
        primaryContactNo={primaryContactNo} setPrimaryContactNo={setPrimaryContactNo}
        accountsContactName={accountsContactName} setAccountsContactName={setAccountsContactName}
        accountsContactNo={accountsContactNo} setAccountsContactNo={setAccountsContactNo}
        purchaseContactName={purchaseContactName} setPurchaseContactName={setPurchaseContactName}
        purchaseContactNo={purchaseContactNo} setPurchaseContactNo={setPurchaseContactNo}
        mobileNumber={mobileNumber} setMobileNumber={setMobileNumber}
      />
      <VendorViewModal
        viewModalOpen={viewModalOpen} setViewModalOpen={setViewModalOpen}
        viewVendor={viewVendor} viewVendorPOs={viewVendorPOs}
        canDelete={canDelete} handleDeleteVendor={handleDeleteVendor}
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
        editPrimaryContactName={editPrimaryContactName} setEditPrimaryContactName={setEditPrimaryContactName}
        editPrimaryContactNo={editPrimaryContactNo} setEditPrimaryContactNo={setEditPrimaryContactNo}
        editAccountsContactName={editAccountsContactName} setEditAccountsContactName={setEditAccountsContactName}
        editAccountsContactNo={editAccountsContactNo} setEditAccountsContactNo={setEditAccountsContactNo}
        editPurchaseContactName={editPurchaseContactName} setEditPurchaseContactName={setEditPurchaseContactName}
        editPurchaseContactNo={editPurchaseContactNo} setEditPurchaseContactNo={setEditPurchaseContactNo}
        editMobileNumber={editMobileNumber} setEditMobileNumber={setEditMobileNumber}
        canDelete={canDelete} handleDeleteVendor={handleDeleteVendor}
      />
    </div>
  );
}
