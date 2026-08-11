'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Badge, Textarea } from '../ui/core';
import BrandIdentity from '../BrandIdentity';
import { Building2, User, Landmark, FileText, CheckCircle2, AlertCircle, Clock, Upload, ArrowRight, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

async function call(method, ...args) {
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'API call failed');
  }
  return data.result;
}

export default function VendorOnboardingFormApp({ token }) {
  const [loading, setLoading] = useState(true);
  const [tokenStatus, setTokenStatus] = useState(null); // { isValid, isExpired, isCompleted, invitation, submission }
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    legalName: '',
    tradeName: '',
    vendorType: 'Supplier',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    primaryContactName: '',
    primaryContactNo: '',
    accountsContactName: '',
    accountsContactNo: '',
    bankName: '',
    bankAccount: '',
    ifsc: '',
    branch: ''
  });

  const [files, setFiles] = useState({
    gstCert: null,
    panCert: null,
    chequeCert: null
  });

  useEffect(() => {
    if (!token) return;
    async function validateToken() {
      setLoading(true);
      try {
        const res = await call('getVendorOnboardingByToken', token);
        setTokenStatus(res);
        if (res.submission) {
          setFormData({
            legalName: res.submission.legal_name || '',
            tradeName: res.submission.trade_name || '',
            vendorType: res.submission.vendor_type || 'Supplier',
            gstin: res.submission.gstin || '',
            pan: res.submission.pan || '',
            address: res.submission.address || '',
            city: res.submission.city || '',
            state: res.submission.state || '',
            pincode: res.submission.pincode || '',
            primaryContactName: res.submission.primary_contact_name || '',
            primaryContactNo: res.submission.primary_contact_no || '',
            accountsContactName: res.submission.accounts_contact_name || '',
            accountsContactNo: res.submission.accounts_contact_no || '',
            bankName: res.submission.bank_name || '',
            bankAccount: res.submission.bank_account || '',
            ifsc: res.submission.ifsc || '',
            branch: res.submission.branch || ''
          });
        }
      } catch (err) {
        setErrorMessage(err.message || 'Failed to validate onboarding link.');
      } finally {
        setLoading(false);
      }
    }
    validateToken();
  }, [token]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMessage('');
  };

  const handleFileChange = (docKey, event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFiles(prev => ({
        ...prev,
        [docKey]: {
          fileName: file.name,
          fileType: file.type,
          fileData: reader.result
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    setErrorMessage('');
    if (currentStep === 1) {
      if (!formData.legalName.trim()) {
        setErrorMessage("Legal Company Name is required");
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.primaryContactName.trim() || !formData.primaryContactNo.trim()) {
        setErrorMessage("Primary Contact Name and Phone Number are required");
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.bankAccount.trim() || !formData.ifsc.trim()) {
        setErrorMessage("Bank Account Number and IFSC Code are required");
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setErrorMessage('');
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const attachmentsPayload = [];
      if (files.gstCert) attachmentsPayload.push({ ...files.gstCert, documentType: 'GST Certificate' });
      if (files.panCert) attachmentsPayload.push({ ...files.panCert, documentType: 'PAN Card' });
      if (files.chequeCert) attachmentsPayload.push({ ...files.chequeCert, documentType: 'Cancelled Cheque' });

      const res = await call('submitVendorOnboarding', {
        token,
        ...formData,
        attachments: attachmentsPayload
      });

      if (res.ok) {
        setFormSuccess(true);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit vendor onboarding registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
          <p className="text-sm font-medium text-slate-400">Verifying secure onboarding link...</p>
        </div>
      </div>
    );
  }

  if (formSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100">Onboarding Submitted!</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Thank you for completing your vendor onboarding registration with <strong className="text-amber-400">LUXEWORX ATELIER</strong>.
            </p>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-left text-xs text-slate-300 space-y-1">
            <p><span className="text-slate-400">Company:</span> <strong>{formData.legalName}</strong></p>
            <p><span className="text-slate-400">Status:</span> <span className="text-amber-400 font-semibold">Under Review</span></p>
          </div>
          <p className="text-[11px] text-slate-400">Our procurement team will review your registration and documentation. You will receive an update via email.</p>
        </div>
      </div>
    );
  }

  if (!tokenStatus?.isValid) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100">
              {tokenStatus?.isExpired ? 'Invitation Link Expired' : (tokenStatus?.isCompleted ? 'Registration Completed' : 'Invalid Link')}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {tokenStatus?.isExpired
                ? 'This onboarding link has expired. Please contact procurement to request a new invitation link.'
                : (tokenStatus?.isCompleted
                    ? 'Your onboarding registration has already been submitted and approved.'
                    : 'The onboarding link provided is invalid or has been revoked.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'Company Info', icon: Building2 },
    { num: 2, label: 'Contact Details', icon: User },
    { num: 3, label: 'Banking Info', icon: Landmark },
    { num: 4, label: 'Documents', icon: FileText },
    { num: 5, label: 'Review & Submit', icon: ShieldCheck }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-slate-900/80 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between backdrop-blur">
        <BrandIdentity title="LWA VENDOR ONBOARDING" subtitle="LUXEWORX ATELIER INTERIORS" size="sm" />
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-200">{tokenStatus.invitation?.email}</p>
          <p className="text-[10px] text-amber-400 font-medium">Invited Partner Registration</p>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Step Indicator */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex justify-between items-center overflow-x-auto custom-scrollbar">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <div key={s.num} className="flex items-center gap-2 px-2 shrink-0">
                <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs transition-colors ${
                  isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  isActive ? 'bg-amber-500 text-slate-950 border border-amber-400 shadow-md shadow-amber-500/20' :
                  'bg-slate-800/50 text-slate-400 border border-slate-800'
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${isActive ? 'text-slate-100 font-bold' : isDone ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {s.label}
                </span>
                {idx < steps.length - 1 && <div className="w-4 sm:w-8 h-px bg-slate-800 ml-2" />}
              </div>
            );
          })}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur shadow-2xl">
          <CardHeader className="border-b border-slate-800/60 py-4 px-6">
            <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
              {currentStep === 1 && <><Building2 className="w-5 h-5 text-amber-400" /> 1. Company & Tax Details</>}
              {currentStep === 2 && <><User className="w-5 h-5 text-amber-400" /> 2. Contact Information</>}
              {currentStep === 3 && <><Landmark className="w-5 h-5 text-amber-400" /> 3. Banking & Settlement Information</>}
              {currentStep === 4 && <><FileText className="w-5 h-5 text-amber-400" /> 4. Required Onboarding Documents</>}
              {currentStep === 5 && <><ShieldCheck className="w-5 h-5 text-amber-400" /> 5. Review & Final Submission</>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* STEP 1: Company Details */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Legal Company Name *</label>
                    <Input
                      value={formData.legalName}
                      onChange={e => handleInputChange('legalName', e.target.value)}
                      placeholder="e.g. Acme Building Materials Pvt Ltd"
                      className="bg-slate-950 border-slate-800 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Trade / Display Name</label>
                    <Input
                      value={formData.tradeName}
                      onChange={e => handleInputChange('tradeName', e.target.value)}
                      placeholder="e.g. Acme Supplies"
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Business / Vendor Type</label>
                    <Select
                      value={formData.vendorType}
                      onChange={e => handleInputChange('vendorType', e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs"
                    >
                      <option value="Supplier">Material Supplier</option>
                      <option value="Contractor">Sub-Contractor / Works</option>
                      <option value="Service">Service Provider</option>
                      <option value="Consultant">Consultant / Architectural</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">GSTIN (15 Digits)</label>
                    <Input
                      value={formData.gstin}
                      onChange={e => handleInputChange('gstin', e.target.value.toUpperCase())}
                      placeholder="07AAAAA0000A1Z5"
                      maxLength={15}
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">PAN (10 Digits)</label>
                    <Input
                      value={formData.pan}
                      onChange={e => handleInputChange('pan', e.target.value.toUpperCase())}
                      placeholder="AAAAA0000A"
                      maxLength={10}
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Registered Office Address</label>
                    <Textarea
                      value={formData.address}
                      onChange={e => handleInputChange('address', e.target.value)}
                      placeholder="Street name, industrial area, plot number"
                      rows={2}
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">City</label>
                    <Input
                      value={formData.city}
                      onChange={e => handleInputChange('city', e.target.value)}
                      placeholder="e.g. New Delhi"
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">State</label>
                    <Input
                      value={formData.state}
                      onChange={e => handleInputChange('state', e.target.value)}
                      placeholder="e.g. Delhi"
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Pincode</label>
                    <Input
                      value={formData.pincode}
                      onChange={e => handleInputChange('pincode', e.target.value)}
                      placeholder="110001"
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Contact Info */}
              {currentStep === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Primary Contact Name *</label>
                    <Input
                      value={formData.primaryContactName}
                      onChange={e => handleInputChange('primaryContactName', e.target.value)}
                      placeholder="Full Name"
                      className="bg-slate-950 border-slate-800 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Primary Mobile / Phone *</label>
                    <Input
                      value={formData.primaryContactNo}
                      onChange={e => handleInputChange('primaryContactNo', e.target.value)}
                      placeholder="+91 9876543210"
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Accounts Contact Name</label>
                    <Input
                      value={formData.accountsContactName}
                      onChange={e => handleInputChange('accountsContactName', e.target.value)}
                      placeholder="Accounts Officer Name"
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Accounts Phone / Extension</label>
                    <Input
                      value={formData.accountsContactNo}
                      onChange={e => handleInputChange('accountsContactNo', e.target.value)}
                      placeholder="+91 9876543211"
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Banking Info */}
              {currentStep === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Bank Name *</label>
                    <Input
                      value={formData.bankName}
                      onChange={e => handleInputChange('bankName', e.target.value)}
                      placeholder="e.g. HDFC Bank Ltd"
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Account Number *</label>
                    <Input
                      value={formData.bankAccount}
                      onChange={e => handleInputChange('bankAccount', e.target.value)}
                      placeholder="Account Number"
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">IFSC Code *</label>
                    <Input
                      value={formData.ifsc}
                      onChange={e => handleInputChange('ifsc', e.target.value.toUpperCase())}
                      placeholder="HDFC0001234"
                      maxLength={11}
                      className="bg-slate-950 border-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Branch Name</label>
                    <Input
                      value={formData.branch}
                      onChange={e => handleInputChange('branch', e.target.value)}
                      placeholder="Branch City / Area"
                      className="bg-slate-950 border-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Documents Upload */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">Upload supporting documentation for verified onboarding approval. Documents are securely stored in Cloudinary.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* GST Cert */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">GST Certificate</span>
                        <Badge variant="outline" className="text-[10px]">Recommended</Badge>
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={e => handleFileChange('gstCert', e)}
                        className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-amber-500/10 file:text-amber-400"
                      />
                      {files.gstCert && <p className="text-[10px] text-emerald-400 font-mono truncate">✓ {files.gstCert.fileName}</p>}
                    </div>

                    {/* PAN Cert */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">PAN Card Copy</span>
                        <Badge variant="outline" className="text-[10px]">Recommended</Badge>
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={e => handleFileChange('panCert', e)}
                        className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-amber-500/10 file:text-amber-400"
                      />
                      {files.panCert && <p className="text-[10px] text-emerald-400 font-mono truncate">✓ {files.panCert.fileName}</p>}
                    </div>

                    {/* Cancelled Cheque */}
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Cancelled Cheque / Bank Proof</span>
                        <Badge variant="outline" className="text-[10px]">Recommended</Badge>
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={e => handleFileChange('chequeCert', e)}
                        className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-amber-500/10 file:text-amber-400"
                      />
                      {files.chequeCert && <p className="text-[10px] text-emerald-400 font-mono truncate">✓ {files.chequeCert.fileName}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Review & Submit */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 text-xs">
                    <h3 className="font-bold text-amber-400 text-sm border-b border-slate-800 pb-2">Summary Review</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-400">Legal Name:</span> <strong className="text-slate-200">{formData.legalName}</strong></div>
                      <div><span className="text-slate-400">Trade Name:</span> <strong className="text-slate-200">{formData.tradeName || '—'}</strong></div>
                      <div><span className="text-slate-400">GSTIN:</span> <strong className="text-slate-200 font-mono">{formData.gstin || '—'}</strong></div>
                      <div><span className="text-slate-400">PAN:</span> <strong className="text-slate-200 font-mono">{formData.pan || '—'}</strong></div>
                      <div><span className="text-slate-400">Primary Contact:</span> <strong className="text-slate-200">{formData.primaryContactName} ({formData.primaryContactNo})</strong></div>
                      <div><span className="text-slate-400">Bank Account:</span> <strong className="text-slate-200 font-mono">{formData.bankAccount || '—'} ({formData.ifsc || '—'})</strong></div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">By submitting this onboarding form, you verify that all provided company details, tax identifiers, and banking proofs are accurate and authorized by your management.</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-800">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" onClick={handlePrev} className="text-xs border-slate-800 text-slate-300">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </Button>
                ) : <div />}

                {currentStep < 5 ? (
                  <Button type="button" variant="primary" onClick={handleNext} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                    Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
                    {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Submitting...</> : 'Submit Onboarding Registration'}
                  </Button>
                )}
              </div>

            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
