import React, { useState, useEffect } from 'react';
import { Building2, ShoppingBag, Receipt, LogOut, Download, FilePlus, Loader2, CheckCircle2, Clock, XCircle, Eye, ShieldCheck, UserCheck, Search, Sparkles } from 'lucide-react';
import { Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '../ui/core';

export default function VendorPortalApp() {
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('lx_vendor_token') || '';
  });
  const [vendorSession, setVendorSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Portal View Tab
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'pos', 'invoices', 'profile'

  // Data states
  const [pos, setPos] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Selected PO Modal
  const [selectedPO, setSelectedPO] = useState(null);

  // Upload Invoice Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [targetPO, setTargetPO] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    subtotal: '',
    taxAmount: '',
    invoiceTotal: '',
    remarks: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiAutoFill = async () => {
    if (!selectedFile) return;
    setAiLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = event.target.result.split(',')[1];
          const res = await fetch('/api/ai/parse-invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-lwa-token': token || ''
            },
            body: JSON.stringify({
              fileData: base64Data,
              fileType: selectedFile.type
            })
          });
          const result = await res.json();
          if (!res.ok || result.error) {
            throw new Error(result.error || 'AI parsing failed');
          }
          const data = result.data;
          
          setUploadForm(prev => ({
            ...prev,
            invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
            invoiceDate: data.invoiceDate || prev.invoiceDate,
            subtotal: data.subtotal ? String(data.subtotal) : prev.subtotal,
            taxAmount: data.taxAmount ? String(data.taxAmount) : prev.taxAmount,
            invoiceTotal: data.invoiceTotal ? String(data.invoiceTotal) : prev.invoiceTotal
          }));
          alert("AI auto-filled invoice details successfully!");
        } catch (err) {
          alert("AI parsing failed: " + err.message);
        } finally {
          setAiLoading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      alert("Error reading file: " + err.message);
      setAiLoading(false);
    }
  };

  // RPC helper for vendor API calls
  const callVendorApi = async (method, ...args) => {
    const res = await fetch('/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lwa-token': token
      },
      body: JSON.stringify({ method, args })
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  };

  // Validate session on mount
  useEffect(() => {
    let active = true;
    async function checkVendorSession() {
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        setAuthLoading(true);
        const session = await callVendorApi('getVendorPortalSession', token);
        if (active) setVendorSession(session);
      } catch (err) {
        console.error('Vendor session invalid:', err);
        if (active) {
          localStorage.removeItem('lx_vendor_token');
          setToken('');
          setVendorSession(null);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    }
    checkVendorSession();
    return () => { active = false; };
  }, [token]);

  // Fetch Vendor POs and Invoices when logged in
  const loadPortalData = async () => {
    if (!vendorSession) return;
    try {
      setLoadingData(true);
      const [posData, invoicesData] = await Promise.all([
        callVendorApi('getVendorPortalPOs'),
        callVendorApi('getVendorPortalInvoices')
      ]);
      setPos(posData || []);
      setInvoices(invoicesData || []);
    } catch (err) {
      console.error('Failed to load vendor portal data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (vendorSession) {
      loadPortalData();
    }
  }, [vendorSession]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'vendorLogin', args: [loginEmail, loginPassword] })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid credentials');
      }
      localStorage.setItem('lx_vendor_token', data.token);
      setToken(data.token);
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lx_vendor_token');
    setToken('');
    setVendorSession(null);
  };

  const handleOpenUploadModal = (po) => {
    setTargetPO(po);
    setUploadForm({
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      subtotal: '',
      taxAmount: '',
      invoiceTotal: '',
      remarks: ''
    });
    setSelectedFile(null);
    setUploadModalOpen(true);
  };

  const handleInvoiceUploadSubmit = async (e) => {
    e.preventDefault();
    if (!targetPO || !uploadForm.invoiceNumber || !uploadForm.invoiceTotal || !selectedFile) {
      alert("Invoice Number, Total Amount, and PDF Document are required.");
      return;
    }

    setUploadSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = event.target.result.split(',')[1];
          await callVendorApi('submitVendorInvoice', {
            poNo: targetPO.po_no,
            invoiceNumber: uploadForm.invoiceNumber,
            invoiceDate: uploadForm.invoiceDate,
            subtotal: Number(uploadForm.subtotal || 0),
            taxAmount: Number(uploadForm.taxAmount || 0),
            invoiceTotal: Number(uploadForm.invoiceTotal),
            remarks: uploadForm.remarks,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            fileData: base64Data
          });
          setUploadModalOpen(false);
          await loadPortalData();
          alert("Invoice submitted successfully!");
        } catch (err) {
          alert("Submission failed: " + (err.message || err));
        } finally {
          setUploadSubmitting(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      alert("Error reading file: " + err.message);
      setUploadSubmitting(false);
    }
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const getAttachmentDownloadUrl = (invoiceId) => {
    return `/api/attachments/${invoiceId}?token=${encodeURIComponent(token)}`;
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Approved</Badge>;
    if (s === 'paid') return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Paid</Badge>;
    if (s === 'rejected') return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>;
    if (s === 'under review') return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Under Review</Badge>;
    return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">Submitted</Badge>;
  };

  // 1. Loading state
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Authenticating Vendor Portal...</span>
      </div>
    );
  }

  // 2. Unauthenticated Login Screen
  if (!vendorSession) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Luxeworx Vendor Portal</h1>
            <p className="text-xs text-slate-400">Secure B2B Supplier Login</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-center text-xs text-red-400">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">Vendor Account Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="vendor@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <Button
              type="submit"
              disabled={loginSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs py-3 rounded-xl shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
            >
              {loginSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loginSubmitting ? 'Signing In...' : 'Sign In to Vendor Portal'}
            </Button>
          </form>

          <div className="border-t border-slate-800/80 pt-4 text-center text-[11px] text-slate-500">
            Forgot credentials or need access? Contact the Luxeworx Procurement Team.
          </div>
        </div>
      </div>
    );
  }

  // KPI Calculations
  const kpis = {
    approvedPOs: pos.length,
    invoicesUnderReview: invoices.filter(i => String(i.status).toLowerCase() === 'submitted' || String(i.status).toLowerCase() === 'under review').length,
    invoicesApproved: invoices.filter(i => String(i.status).toLowerCase() === 'approved' || String(i.status).toLowerCase() === 'paid').length,
    totalInvoiced: invoices.reduce((acc, i) => acc + (Number(i.invoice_total) || 0), 0)
  };

  // 3. Authenticated Vendor Portal Dashboard
  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="h-16 px-6 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">{vendorSession.vendor_name}</h1>
            <p className="text-[11px] text-slate-400">Vendor Code: <span className="font-mono text-amber-400">{vendorSession.vendor_code}</span></p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'pos' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Approved POs ({pos.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'invoices' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            My Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'profile' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Company Profile
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">{vendorSession.email}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs text-slate-400 font-medium">Approved Purchase Orders</span>
                <p className="text-2xl font-black text-slate-100 mt-1">{kpis.approvedPOs}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs text-slate-400 font-medium">Invoices Under Review</span>
                <p className="text-2xl font-black text-amber-400 mt-1">{kpis.invoicesUnderReview}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs text-slate-400 font-medium">Approved / Paid Invoices</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{kpis.invoicesApproved}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs text-slate-400 font-medium">Total Invoiced Amount</span>
                <p className="text-2xl font-black text-amber-400 mt-1">{formatCurrency(kpis.totalInvoiced)}</p>
              </div>
            </div>

            {/* Quick Action & PO Overview */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" /> Recent Approved Purchase Orders
              </h3>
              {loadingData ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">Loading purchase orders...</div>
              ) : pos.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">No approved POs issued to your account.</div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-800 hover:bg-transparent">
                        <TableHead className="text-xs text-slate-400">PO Number</TableHead>
                        <TableHead className="text-xs text-slate-400">Date</TableHead>
                        <TableHead className="text-xs text-slate-400">Project</TableHead>
                        <TableHead className="text-xs text-slate-400 text-right">PO Value</TableHead>
                        <TableHead className="text-xs text-slate-400 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pos.slice(0, 5).map(p => (
                        <TableRow key={p.po_no} className="border-b border-slate-800/60 hover:bg-slate-900/60">
                          <TableCell className="font-semibold text-xs text-slate-100 font-mono">{p.po_no}</TableCell>
                          <TableCell className="text-xs text-slate-400">{p.po_date}</TableCell>
                          <TableCell className="text-xs text-slate-300">{p.project || 'General'}</TableCell>
                          <TableCell className="text-xs text-slate-100 font-bold text-right">{formatCurrency(p.revised_po_value || p.po_value)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenUploadModal(p)}
                              className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-semibold text-xs h-7"
                            >
                              <FilePlus className="w-3.5 h-3.5 mr-1" /> Submit Invoice
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" /> Approved Purchase Orders
            </h2>
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400">PO Number</TableHead>
                    <TableHead className="text-xs text-slate-400">Date</TableHead>
                    <TableHead className="text-xs text-slate-400">Project</TableHead>
                    <TableHead className="text-xs text-slate-400 text-right">PO Total</TableHead>
                    <TableHead className="text-xs text-slate-400 text-right">Invoiced</TableHead>
                    <TableHead className="text-xs text-slate-400 text-right">Remaining Balance</TableHead>
                    <TableHead className="text-xs text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.map(p => (
                    <TableRow key={p.po_no} className="border-b border-slate-800/60 hover:bg-slate-900/80">
                      <TableCell className="font-semibold text-xs text-slate-100 font-mono">{p.po_no}</TableCell>
                      <TableCell className="text-xs text-slate-400">{p.po_date}</TableCell>
                      <TableCell className="text-xs text-slate-300">{p.project || 'General'}</TableCell>
                      <TableCell className="text-xs text-slate-100 font-bold text-right">{formatCurrency(p.revised_po_value || p.po_value)}</TableCell>
                      <TableCell className="text-xs text-amber-400 font-medium text-right">{formatCurrency(p.total_invoiced)}</TableCell>
                      <TableCell className="text-xs text-emerald-400 font-medium text-right">{formatCurrency(p.remaining_balance)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPO(p)}
                          className="text-xs text-blue-400 hover:text-blue-300 h-7"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View PO
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleOpenUploadModal(p)}
                          className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-semibold text-xs h-7"
                        >
                          <FilePlus className="w-3.5 h-3.5 mr-1" /> Submit Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-400" /> Submitted Invoices
            </h2>
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400">Invoice Number</TableHead>
                    <TableHead className="text-xs text-slate-400">PO Number</TableHead>
                    <TableHead className="text-xs text-slate-400">Invoice Date</TableHead>
                    <TableHead className="text-xs text-slate-400 text-right">Amount</TableHead>
                    <TableHead className="text-xs text-slate-400">Status</TableHead>
                    <TableHead className="text-xs text-slate-400 text-right">Document</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                        No invoices submitted yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map(inv => (
                      <TableRow key={inv.invoice_id} className="border-b border-slate-800/60 hover:bg-slate-900/80">
                        <TableCell className="font-semibold text-xs text-slate-100">{inv.invoice_number}</TableCell>
                        <TableCell className="text-xs text-slate-300 font-mono">{inv.po_no}</TableCell>
                        <TableCell className="text-xs text-slate-400">{inv.invoice_date}</TableCell>
                        <TableCell className="text-xs text-slate-100 font-bold text-right">{formatCurrency(inv.invoice_total)}</TableCell>
                        <TableCell>
                          <div>
                            {getStatusBadge(inv.status)}
                            {inv.rejection_reason ? (
                              <span className="block text-[10px] text-red-400 mt-0.5">Reason: {inv.rejection_reason}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={getAttachmentDownloadUrl(inv.invoice_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 animate-fade-in">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> Vendor Account Profile
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Legal Entity Name</span>
                <span className="text-slate-100 font-bold text-sm">{vendorSession.vendor_name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Vendor Code</span>
                <span className="text-amber-400 font-mono font-bold text-sm">{vendorSession.vendor_code}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">GSTIN</span>
                <span className="text-slate-200 font-mono">{vendorSession.gstin || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">PAN</span>
                <span className="text-slate-200 font-mono">{vendorSession.pan || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Account Email</span>
                <span className="text-slate-200">{vendorSession.email}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PO View Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 font-mono">PO Details: {selectedPO.po_no}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPO(null)} className="text-xs">Close</Button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div><span className="text-slate-400">Date:</span> <p className="font-semibold text-slate-200">{selectedPO.po_date}</p></div>
              <div><span className="text-slate-400">Project:</span> <p className="font-semibold text-slate-200">{selectedPO.project || 'General'}</p></div>
              <div><span className="text-slate-400">PO Total:</span> <p className="font-bold text-amber-400">{formatCurrency(selectedPO.revised_po_value || selectedPO.po_value)}</p></div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => { const po = selectedPO; setSelectedPO(null); handleOpenUploadModal(po); }}
                className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold text-xs"
              >
                <FilePlus className="w-3.5 h-3.5 mr-1" /> Submit Invoice for this PO
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Upload Modal */}
      {uploadModalOpen && targetPO && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <FilePlus className="w-4 h-4 text-amber-400" /> Submit Invoice against PO: <span className="font-mono text-amber-400">{targetPO.po_no}</span>
            </h3>

            <form onSubmit={handleInvoiceUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.invoiceNumber}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-2026-001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={uploadForm.invoiceDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Subtotal (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadForm.subtotal}
                    onChange={(e) => setUploadForm({ ...uploadForm, subtotal: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Tax Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadForm.taxAmount}
                    onChange={(e) => setUploadForm({ ...uploadForm, taxAmount: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice Total (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={uploadForm.invoiceTotal}
                    onChange={(e) => setUploadForm({ ...uploadForm, invoiceTotal: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-bold text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Invoice PDF Document *</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
                />
                {selectedFile && (
                  <div className="mt-2.5 flex flex-col items-start gap-2">
                    <div className="text-xs text-emerald-400 font-mono font-bold">
                      ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                    <Button
                      type="button"
                      onClick={handleAiAutoFill}
                      disabled={aiLoading}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {aiLoading ? 'AI Reading Document...' : '✨ AI Auto-Fill Invoice Details'}
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Remarks</label>
                <textarea
                  rows={2}
                  value={uploadForm.remarks}
                  onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
                  placeholder="Additional notes for procurement team..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setUploadModalOpen(false)} disabled={uploadSubmitting} className="text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploadSubmitting}
                  className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold text-xs flex items-center gap-1.5"
                >
                  {uploadSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {uploadSubmitting ? 'Submitting Invoice...' : 'Submit Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
