'use client';

import React, { useState, useMemo } from 'react';
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
  const [editWhatsappNumber, setEditWhatsappNumber] = useState('');
  const [editMobileNumber, setEditMobileNumber] = useState('');
  const [editPreferredWhatsappContact, setEditPreferredWhatsappContact] = useState('Primary');
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
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [preferredWhatsappContact, setPreferredWhatsappContact] = useState('Primary');

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
    setPurchaseContactName(''); setPurchaseContactNo(''); setWhatsappNumber(''); setMobileNumber(''); setPreferredWhatsappContact('Primary');
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
        purchaseContactName, purchaseContactNo, whatsappNumber, mobileNumber, preferredWhatsappContact
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
    setViewVendor(v); setViewVendorPOs([]); setViewModalOpen(true);
    try {
      const allPOs = await call('getPOsByVendor', v.code);
      setViewVendorPOs(allPOs || []);
    } catch (e) { console.error('Failed to load POs for vendor:', e); }
  };

  const handleOpenEditModal = async (v) => {
    setFormError(null); setSubmitting(false);
    const vendorCode = v.code || v.vendorId || v.vendor_code;
    
    try {
      const details = await call('getVendorByName', vendorCode);
      
      setEditVendorId(details?.vendorId || vendorCode); 
      setEditLegalName(details?.legalName || v.legalName || ''); 
      setEditTradeName(details?.tradeName || v.name || '');
      setEditGstin(details?.gstin || v.gstin || ''); 
      setEditPan(details?.pan || v.pan || ''); 
      setEditStatus(details?.status || v.status || 'Active');
      setEditAddress(details?.address || v.address || '');
      setEditEmail(details?.email || v.email || '');
      setEditPrimaryContactName(details?.primaryContactName || '');
      setEditPrimaryContactNo(details?.primaryContactNo || '');
      setEditAccountsContactName(details?.accountsContactName || '');
      setEditAccountsContactNo(details?.accountsContactNo || '');
      setEditPurchaseContactName(details?.purchaseContactName || '');
      setEditPurchaseContactNo(details?.purchaseContactNo || '');
      setEditWhatsappNumber(details?.whatsappNumber || '');
      setEditMobileNumber(details?.mobileNumber || '');
      setEditPreferredWhatsappContact(details?.preferredWhatsappContact || 'Primary');
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
        whatsappNumber: editWhatsappNumber, mobileNumber: editMobileNumber, preferredWhatsappContact: editPreferredWhatsappContact,
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

  return (
    <div className="space-y-8 animate-fade-in">
      <VendorsHeader
        canOnboard={canOnboard} handleOpenModal={handleOpenModal}
        filteredVendors={filteredVendors} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        handleOpenViewModal={handleOpenViewModal} handleOpenEditModal={handleOpenEditModal} setActiveView={setActiveView}
        hasMoreVendors={hasMoreVendors} loadMoreVendors={loadMoreVendors}
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
        whatsappNumber={whatsappNumber} setWhatsappNumber={setWhatsappNumber}
        mobileNumber={mobileNumber} setMobileNumber={setMobileNumber}
        preferredWhatsappContact={preferredWhatsappContact} setPreferredWhatsappContact={setPreferredWhatsappContact}
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
        editPrimaryContactName={editPrimaryContactName} setEditPrimaryContactName={setEditPrimaryContactName}
        editPrimaryContactNo={editPrimaryContactNo} setEditPrimaryContactNo={setEditPrimaryContactNo}
        editAccountsContactName={editAccountsContactName} setEditAccountsContactName={setEditAccountsContactName}
        editAccountsContactNo={editAccountsContactNo} setEditAccountsContactNo={setEditAccountsContactNo}
        editPurchaseContactName={editPurchaseContactName} setEditPurchaseContactName={setEditPurchaseContactName}
        editPurchaseContactNo={editPurchaseContactNo} setEditPurchaseContactNo={setEditPurchaseContactNo}
        editWhatsappNumber={editWhatsappNumber} setEditWhatsappNumber={setEditWhatsappNumber}
        editMobileNumber={editMobileNumber} setEditMobileNumber={setEditMobileNumber}
        editPreferredWhatsappContact={editPreferredWhatsappContact} setEditPreferredWhatsappContact={setEditPreferredWhatsappContact}
      />
    </div>
  );
}
