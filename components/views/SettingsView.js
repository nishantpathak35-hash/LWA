'use client';

import { toast } from '../ui/Toast';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../ui/core';
import { Users, Shield, Settings, Key, UserCheck, UserMinus, Plus, Download, Loader2, ClipboardList, ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { cn } from '../../app/lib/utils';
import { isSuperAdmin } from '../../app/lib/config';
import SettingsCompanyTab from './settings/SettingsCompanyTab';
import SettingsSystemTab from './settings/SettingsSystemTab';
import SettingsAuditTab from './settings/SettingsAuditTab';
import SettingsPermissionsTab from './settings/SettingsPermissionsTab';
import SettingsUsersTab from './settings/SettingsUsersTab';

export default function SettingsView() {
  const { call, user, refreshData } = useAppState();
  const [activeTab, setActiveTab] = useState('users');
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  
  // Custom Role Name input
  const [newRoleName, setNewRoleName] = useState('');
  
  // Dialog States
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false);
  
  const generateRandomPassword = () => Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-4).toUpperCase() + '!';
  
  // Dialog Form inputs
  const [targetEmail, setTargetEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRoles, setNewUserRoles] = useState({ proc: false, finance: true, director: false });
  const [newUserPassword, setNewUserPassword] = useState(generateRandomPassword());
  const [newWhatsApp, setNewWhatsApp] = useState('');
  
  const [editAccessRoles, setEditAccessRoles] = useState({ proc: false, finance: false, director: false });
  const [editWhatsApp, setEditWhatsApp] = useState('');
  const [resetPasswordVal, setResetPasswordVal] = useState(generateRandomPassword());
  const [inviteResult, setInviteResult] = useState(null);

  // System settings states
  const [poPrefix, setPoPrefix] = useState('');
  // Raw permissions from DB (source of truth after load)
  const [permissions, setPermissions] = useState({});
  // Controlled local state for the matrix UI (what checkboxes actually reflect)
  const [localPerms, setLocalPerms] = useState({});

  // Company settings states
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyGstin, setCompanyGstin] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  // Audit Log states
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterType, setAuditFilterType] = useState('');
  const [auditFilterDept, setAuditFilterDept] = useState('');
  const [auditSortDir, setAuditSortDir] = useState('DESC');

  // Legacy Correction State
  const [legacyPONo, setLegacyPONo] = useState('');
  const [legacyPO, setLegacyPO] = useState(null);
  const [legacyNewPaid, setLegacyNewPaid] = useState('');
  const [legacyReason, setLegacyReason] = useState('');
  const [legacySubmitting, setLegacySubmitting] = useState(false);

  // Project Merger State
  const [mergeTargetProject, setMergeTargetProject] = useState('');
  const [mergeSourceProjects, setMergeSourceProjects] = useState('');
  const [mergeSubmitting, setMergeSubmitting] = useState(false);

  // Load Company Settings
  const loadCompany = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call('getCompanySettings');
      if (data) {
        setCompanyName(data.name || '');
        setCompanyAddress(data.address || '');
        setCompanyGstin(data.gstin || '');
        setCompanyLogo(data.logo || '');
      }
    } catch (e) {
      console.error('Failed to load company settings:', e);
    } finally {
      setLoading(false);
    }
  }, [call]);

  // Load Audit Log
  const loadAuditLog = useCallback(async (pg) => {
    setAuditLoading(true);
    try {
      const filters = {
        page: pg || auditPage,
        pageSize: 25,
        sortDir: auditSortDir
      };
      if (auditSearch.trim()) filters.search = auditSearch.trim();
      if (auditFilterType) filters.actionType = auditFilterType;
      if (auditFilterDept) filters.department = auditFilterDept;
      const result = await call('listAuditLog', filters);
      if (result && result.rows) {
        setAuditLogs(result.rows);
        setAuditTotalPages(result.totalPages || 1);
        setAuditTotal(result.total || 0);
        setAuditPage(result.page || 1);
      } else if (Array.isArray(result)) {
        // Backward compat: old API returns array directly
        setAuditLogs(result);
        setAuditTotalPages(1);
        setAuditTotal(result.length);
      }
    } catch (e) {
      console.error('Failed to load audit log:', e);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, [call, auditPage, auditSearch, auditFilterType, auditFilterDept, auditSortDir]);

  // Verify Director access
  const isDirector = isSuperAdmin(user?.email) || user?.roles?.includes('director');

  // Load Users Tab Data
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await call('listUsersAdmin');
      setUsersList(list || []);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  }, [call]);

  // Load System Tab Data
  const loadSystem = useCallback(async () => {
    try {
      const prefix = await call('getPOPrefix');
      setPoPrefix(prefix || '');
    } catch (e) {
      console.error('Failed to load PO prefix:', e);
    }
  }, [call]);

  const [ccEmails, setCcEmails] = useState('');
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);

  const loadEmailConfig = useCallback(async () => {
    try {
      const ccs = await call('getDefaultCCRecipients');
      setCcEmails((ccs || []).join(', '));
    } catch (e) {
      console.error('Failed to load CC recipients:', e);
    }
  }, [call]);

  // Load Permissions Tab Data
  const loadPermissions = useCallback(async () => {
    try {
      const perms = await call('getFeaturePermissions');
      const merged = perms || {};
      setPermissions(merged);
      // Seed controlled local state — deep clone so changes don't mutate the source
      setLocalPerms(JSON.parse(JSON.stringify(merged)));
    } catch (e) {
      console.error('Failed to load permissions:', e);
    }
  }, [call]);

  useEffect(() => {
    if (!isDirector) return;
    const timer = window.setTimeout(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'permissions') {
      loadPermissions();
    } else if (activeTab === 'system') {
      loadSystem();
    } else if (activeTab === 'company') {
      loadCompany();
    } else if (activeTab === 'audit') {
      loadAuditLog();
    } else if (activeTab === 'email_config') {
      loadEmailConfig();
    }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, isDirector, loadPermissions, loadSystem, loadUsers, loadCompany, loadAuditLog, loadEmailConfig]);

  // Re-fetch audit log when filters change while audit tab is active
  useEffect(() => {
    if (!isDirector || activeTab !== 'audit') return;
    loadAuditLog(1);
  }, [auditFilterType, auditFilterDept, auditSortDir]);

  // Toggle a single feature permission in controlled local state
  const handleTogglePerm = useCallback((role, feature) => {
    setLocalPerms(prev => {
      const current = prev[role] ? [...prev[role]] : [];
      const idx = current.indexOf(feature);
      if (idx === -1) {
        current.push(feature);
      } else {
        current.splice(idx, 1);
      }
      return { ...prev, [role]: current };
    });
  }, []);

  if (!isDirector) {
    return (
      <div className="p-10 text-center text-slate-400">
        <div className="text-lg text-slate-200 mb-2 font-serif font-light">Director access required</div>
        Only the director can manage users and system settings.
      </div>
    );
  }

  // Handle Action Functions
  const handleToggleUserActive = async (email, currentActive) => {
    try {
      await call('setUserActiveAdmin', email, !currentActive);
      toast(`User ${!currentActive ? 'activated' : 'deactivated'}.`);
      loadUsers();
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    }
  };

  const handleDeleteUser = async (email) => {
    if (!window.confirm(`Are you absolutely sure you want to delete user ${email}? This action cannot be undone.`)) {
      return;
    }
    try {
      await call('deleteUserAdmin', email);
      toast.success('User deleted successfully.');
      loadUsers();
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    }
  };

  const handleAddCustomRole = async () => {
    const roleName = newRoleName.trim();
    if (!roleName) {
      toast.error('Please enter a role name.');
      return;
    }
    try {
      const res = await call('addCustomRole', roleName);
      if (res && res.ok) {
        toast.success(`Role "${roleName}" registered successfully!`);
        setNewRoleName('');
        loadUsers();
      }
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    }
  };

  const handleSavePOPrefix = async () => {
    try {
      await call('setPOPrefix', poPrefix);
      toast.success('PO number series prefix saved successfully.');
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      await call('setCompanySettings', {
        name: companyName,
        address: companyAddress,
        gstin: companyGstin,
        logo: companyLogo
      });
      toast.success('Company settings saved successfully.');
    } catch (e) {
      toast.error('Error saving company settings: ' + (e.message || String(e)));
    } finally {
      setSavingCompany(false);
    }
  };

  const handleClearServerCache = async () => {
    try {
      await call('clearAllCaches');
      toast('Cache cleared. Reload the page to see fresh data.');
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    }
  };

  const handleSearchLegacyPO = async (e) => {
    e.preventDefault();
    setLegacySubmitting(true);
    setLegacyPO(null);
    try {
      const po = await call('getPOFullDetails', legacyPONo.trim());
      if (po) {
        setLegacyPO(po);
        setLegacyNewPaid(po.legacy_paid || 0);
      } else {
        toast('PO not found.');
      }
    } catch (err) {
      toast.error('Error searching PO: ' + err.message);
    } finally {
      setLegacySubmitting(false);
    }
  };

  const handleCorrectLegacyPO = async (autoRecalculate) => {
    if (!legacyReason.trim()) {
      toast.error('A detailed reason is required for audit logging.');
      return;
    }
    if (!autoRecalculate && legacyNewPaid === '') {
      toast.error('Please enter a new paid amount.');
      return;
    }
    
    // Yield to the main thread to avoid Next.js INP Issue warnings before pausing execution with confirm
    setTimeout(async () => {
      const conf = window.confirm(`Are you sure you want to ${autoRecalculate ? 'auto-recalculate' : 'manually update'} the paid amount for ${legacyPO.po_no}?`);
      if (!conf) return;

      setLegacySubmitting(true);
      try {
        await call('correctLegacyPOPaidAmount', legacyPO.po_no, legacyNewPaid, autoRecalculate, legacyReason.trim());
        await call('clearAllCaches');
        toast.success('PO paid amount corrected successfully.');
        setLegacyPO(null);
        setLegacyPONo('');
        setLegacyReason('');
        setLegacyNewPaid('');
        await refreshData();
      } catch (err) {
        toast.error('Error correcting PO: ' + err.message);
      } finally {
        setLegacySubmitting(false);
      }
    }, 10);
  };

  const handleMergeProjects = async () => {
    if (!mergeTargetProject.trim()) {
      toast.error('Please enter a target project name.');
      return;
    }
    if (!mergeSourceProjects.trim()) {
      toast.error('Please enter at least one source project to merge.');
      return;
    }

    const sourcesArray = mergeSourceProjects.split(',').map(s => s.trim()).filter(Boolean);
    if (sourcesArray.length === 0) {
      toast.error('Invalid source projects format.');
      return;
    }

    if (sourcesArray.includes(mergeTargetProject.trim())) {
      toast('Target project cannot be in the source projects list.');
      return;
    }

    setTimeout(async () => {
      const conf = window.confirm(`Are you sure you want to merge ${sourcesArray.length} project(s) into "${mergeTargetProject}"?\n\nSources: ${sourcesArray.join(', ')}\n\nThis will transfer all POs and financial values, and delete the source projects. This action cannot be undone.`);
      if (!conf) return;

      setMergeSubmitting(true);
      try {
        await call('mergeProjects', mergeTargetProject.trim(), sourcesArray);
        await call('clearAllCaches');
        toast.success('Projects merged successfully.');
        setMergeTargetProject('');
        setMergeSourceProjects('');
        await refreshData();
      } catch (err) {
        toast.error('Error merging projects: ' + err.message);
      } finally {
        setMergeSubmitting(false);
      }
    }, 10);
  };

  const handleReloadAll = async () => {
    try {
      await call('clearAllCaches');
      toast.success('Data reloaded successfully.');
      window.location.reload();
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    }
  };

  const handleSavePermissions = async () => {
    try {
      // Derive config directly from React state — no DOM scraping
      const newConfig = {};
      roleKeys.forEach(role => {
        newConfig[role] = localPerms[role] ? [...localPerms[role]] : [];
      });
      await call('setFeaturePermissions', newConfig);
      // Sync persisted state so future toggles are relative to saved values
      setPermissions(JSON.parse(JSON.stringify(newConfig)));
      toast.success('Feature permissions saved successfully.');
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    }
  };

  const handleSaveEmailConfig = async () => {
    setSavingEmailConfig(true);
    try {
      const emails = ccEmails.split(',').map(e => e.trim()).filter(e => e);
      await call('setDefaultCCRecipients', emails);
      toast.success('Email CC configuration saved.');
      await loadEmailConfig();
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    } finally {
      setSavingEmailConfig(false);
    }
  };

  const handleInviteUserSubmit = async (e) => {
    e.preventDefault();
    const roles = Object.keys(newUserRoles).filter(r => newUserRoles[r]);
    if (!newUserName.trim() || !targetEmail.trim()) {
      toast.error('Please fill email and name.');
      return;
    }
    if (!roles.length) {
      toast('Select at least one access role.');
      return;
    }
    try {
      const res = await call('inviteUserAdmin', {
        email: targetEmail,
        name: newUserName,
        roles: roles,
        password: newUserPassword
      });
      
      if (newWhatsApp) {
        await call('setUserWhatsAppAdmin', targetEmail, newWhatsApp);
      }
      
      if (res && res.emailSent) {
        toast(`User created & invite email sent to ${targetEmail}`);
        setInviteModalOpen(false);
        loadUsers();
      } else {
        const inviteUrl = res?.inviteUrl || 'https://lwa-iota.vercel.app/';
        setInviteResult(inviteUrl);
      }
    } catch (err) {
      toast.error('Error: ' + (err.message || String(err)));
    }
  };

  const handleSaveAccess = async () => {
    const roles = Object.keys(editAccessRoles).filter(r => editAccessRoles[r]);
    if (!roles.length) {
      toast('Select at least one access role.');
      return;
    }
    try {
      await call('setUserRolesAdmin', targetEmail, roles);
      if (editWhatsApp !== undefined) {
        await call('setUserWhatsAppAdmin', targetEmail, editWhatsApp);
      }
      toast.success('Access updated successfully.');
      setAccessModalOpen(false);
      loadUsers();
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordVal || resetPasswordVal.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    try {
      await call('resetUserPasswordAdmin', targetEmail, resetPasswordVal);
      toast(`Password reset for ${targetEmail}. Share new password with user.`);
      setResetPwdModalOpen(false);
    } catch (e) {
      toast.error('Error: ' + (e.message || String(e)));
    }
  };

  // Export users to CSV
  const handleExportUsers = () => {
    let csv = "Email,Name,Roles,Status,Last Login\n";
    usersList.forEach(u => {
      const status = u.locked ? 'Locked' : (u.active ? 'Active' : 'Inactive');
      const rs = (u.roles && u.roles.length) ? u.roles.join(', ') : (u.role || '');
      csv += `"${u.email}","${u.name || ''}","${rs}","${status}","${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "System_Users.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Users Filter
  const filteredUsers = usersList.filter(u => {
    const q = usersSearch.trim().toLowerCase();
    if (!q) return true;
    return (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q);
  });

  const featureLabels = {
    'dashboard': 'Dashboard View',
    'payments': 'Payment Requests',
    'purchase_orders': 'Purchase Orders',
    'goods_receipt': 'Goods Receipt Notes',
    'projects': 'Projects',
    'vendors': 'Vendors',
    'budgets': 'Budget Tracking',
    'documents': 'Document Storage',
    'notifications': 'Notifications',
    'settings': 'Settings',
    'reports': 'Reports',
    'create_payment': 'Create Payment Request',
    'approve_payment': 'Approve Payments',
    'reject_payment': 'Reject Payments',
    'create_po': 'Create Purchase Order',
    'approve_po': 'Approve Purchase Order',
    'upload_document': 'Upload Documents',
    'manage_users': 'Manage Users',
    'manage_settings': 'Manage Settings',
    'export_data': 'Export Data',
    'view_analytics': 'View Analytics'
  };

  const roleKeys = ['proc', 'finance', 'accountant', 'director'];
  const roleLabels = { 'proc': 'Procurement', 'finance': 'Finance', 'accountant': 'Accountant', 'director': 'Director' };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-light text-slate-100 flex items-center gap-2.5 font-serif">
          <Settings className="w-5 h-5 text-gold" />
          Settings
        </h2>
        <p className="text-xs font-light text-slate-400 mt-1">
          Manage system configurations, user invitations, roles, and feature permissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-900 pb-3">
        <Button
          onClick={() => setActiveTab('users')}
          size="sm"
          variant={activeTab === 'users' ? 'primary' : 'ghost'}
        >
          <Users className="w-4 h-4" /> Users & Access
        </Button>
        <Button
          onClick={() => setActiveTab('permissions')}
          size="sm"
          variant={activeTab === 'permissions' ? 'primary' : 'ghost'}
        >
          <Shield className="w-4 h-4" /> Feature Permissions
        </Button>
        <Button
          onClick={() => setActiveTab('system')}
          size="sm"
          variant={activeTab === 'system' ? 'primary' : 'ghost'}
        >
          ⚙ System Utilities
        </Button>
        <Button
          onClick={() => setActiveTab('company')}
          size="sm"
          variant={activeTab === 'company' ? 'primary' : 'ghost'}
        >
          🏢 Company Settings
        </Button>
        <Button
          onClick={() => setActiveTab('audit')}
          size="sm"
          variant={activeTab === 'audit' ? 'primary' : 'ghost'}
        >
          <ClipboardList className="w-4 h-4" /> Audit Log
        </Button>
        <Button
          onClick={() => setActiveTab('email_config')}
          size="sm"
          variant={activeTab === 'email_config' ? 'primary' : 'ghost'}
        >
          📧 Email Configuration
        </Button>
        <Button
          onClick={() => setActiveTab('legacy_correction')}
          size="sm"
          variant={activeTab === 'legacy_correction' ? 'primary' : 'ghost'}
          className="text-amber-500 hover:text-amber-400"
        >
          ⚠ Legacy Correction
        </Button>
        <Button
          onClick={() => setActiveTab('project_merger')}
          size="sm"
          variant={activeTab === 'project_merger' ? 'primary' : 'ghost'}
          className="text-red-400 hover:text-red-300"
        >
          <Plus className="w-4 h-4 mr-1" /> Project Merger
        </Button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <SettingsUsersTab
          usersSearch={usersSearch} setUsersSearch={setUsersSearch}
          handleExportUsers={handleExportUsers}
          setTargetEmail={setTargetEmail} setNewUserName={setNewUserName}
          setNewUserPassword={setNewUserPassword} setNewUserRoles={setNewUserRoles}
          newWhatsApp={newWhatsApp} setNewWhatsApp={setNewWhatsApp}
          editWhatsApp={editWhatsApp} setEditWhatsApp={setEditWhatsApp}
          setInviteResult={setInviteResult} setInviteModalOpen={setInviteModalOpen}
          loading={loading} filteredUsers={filteredUsers}
          setEditAccessRoles={setEditAccessRoles} setAccessModalOpen={setAccessModalOpen}
          setResetPasswordVal={setResetPasswordVal} setResetPwdModalOpen={setResetPwdModalOpen}
          handleToggleUserActive={handleToggleUserActive} handleDeleteUser={handleDeleteUser}
          newRoleName={newRoleName} setNewRoleName={setNewRoleName}
          handleAddCustomRole={handleAddCustomRole}
        />
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <SettingsPermissionsTab
          handleSavePermissions={handleSavePermissions}
          roleKeys={roleKeys}
          roleLabels={roleLabels}
          featureLabels={featureLabels}
          localPerms={localPerms}
          handleTogglePerm={handleTogglePerm}
        />
      )}

      {/* System, Legacy, and Merger Tabs */}
      {(activeTab === 'system' || activeTab === 'legacy_correction' || activeTab === 'project_merger') && (
        <SettingsSystemTab
          activeTab={activeTab}
          poPrefix={poPrefix} setPoPrefix={setPoPrefix} handleSavePOPrefix={handleSavePOPrefix}
          handleClearServerCache={handleClearServerCache} handleReloadAll={handleReloadAll}
          legacyPONo={legacyPONo} setLegacyPONo={setLegacyPONo} legacyPO={legacyPO}
          legacyNewPaid={legacyNewPaid} setLegacyNewPaid={setLegacyNewPaid}
          legacyReason={legacyReason} setLegacyReason={setLegacyReason}
          legacySubmitting={legacySubmitting}
          handleSearchLegacyPO={handleSearchLegacyPO} handleCorrectLegacyPO={handleCorrectLegacyPO}
          mergeSourceProjects={mergeSourceProjects} setMergeSourceProjects={setMergeSourceProjects}
          mergeTargetProject={mergeTargetProject} setMergeTargetProject={setMergeTargetProject}
          mergeSubmitting={mergeSubmitting} handleMergeProjects={handleMergeProjects}
        />
      )}

      {/* Email Config Tab */}
      {activeTab === 'email_config' && (
        <Card className="max-w-2xl border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200">Email CC Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Default CC Recipients</label>
              <Input 
                value={ccEmails} 
                onChange={e => setCcEmails(e.target.value)} 
                placeholder="email1@example.com, email2@example.com"
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2 font-light">
                Comma-separated list of email addresses that will be CC'd on all automated emails (e.g., PO and Payment Advices).
              </p>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button variant="primary" onClick={handleSaveEmailConfig} disabled={savingEmailConfig}>
                {savingEmailConfig ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Settings Tab */}
      {activeTab === 'company' && (
        <SettingsCompanyTab
          companyName={companyName} setCompanyName={setCompanyName}
          companyAddress={companyAddress} setCompanyAddress={setCompanyAddress}
          companyGstin={companyGstin} setCompanyGstin={setCompanyGstin}
          companyLogo={companyLogo} setCompanyLogo={setCompanyLogo}
          savingCompany={savingCompany} handleSaveCompany={handleSaveCompany}
        />
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <SettingsAuditTab
          auditTotal={auditTotal} auditSearch={auditSearch} setAuditSearch={setAuditSearch}
          setAuditPage={setAuditPage} loadAuditLog={loadAuditLog}
          auditFilterType={auditFilterType} setAuditFilterType={setAuditFilterType}
          auditFilterDept={auditFilterDept} setAuditFilterDept={setAuditFilterDept}
          auditSortDir={auditSortDir} setAuditSortDir={setAuditSortDir}
          auditLogs={auditLogs} auditLoading={auditLoading}
          auditPage={auditPage} auditTotalPages={auditTotalPages}
        />
      )}



      {/* Invite Modal */}
      <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite User">
        {inviteResult ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <span className="text-xl">✅</span>
              <div>
                <div className="font-semibold">User Created Successfully</div>
                <div className="text-xs text-slate-400">{targetEmail}</div>
              </div>
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 space-y-3">
              <div className="font-semibold">⚠ Email not sent — share invite link manually</div>
              <div className="text-xs text-slate-400">Copy this link and send it to the user:</div>
              <div className="flex gap-2">
                <Input readOnly value={inviteResult} id="inviteLinkBox" />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const box = document.getElementById('inviteLinkBox');
                    box?.select();
                    document.execCommand('copy');
                    toast('Invite link copied!');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => { setInviteModalOpen(false); loadUsers(); }} variant="primary">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInviteUserSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light">Email</label>
              <Input
                type="email"
                placeholder="user@company.com"
                required
                value={targetEmail}
                onChange={e => setTargetEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light">Name</label>
              <Input
                type="text"
                placeholder="Full name"
                required
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-light">Access Roles</label>
              <div className="grid grid-cols-3 gap-3">
                {roleKeys.map(r => (
                  <label key={r} className="flex items-center gap-2 p-3 rounded-lg border border-slate-900 bg-slate-950/40 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={newUserRoles[r]}
                      onChange={e => setNewUserRoles({ ...newUserRoles, [r]: e.target.checked })}
                    />
                    <span className="text-sm font-semibold text-slate-200 capitalize">{r}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light">Temporary Password</label>
              <Input
                type="text"
                required
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light">WhatsApp Number (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. +919876543210"
                value={newWhatsApp}
                onChange={e => setNewWhatsApp(e.target.value)}
              />
            </div>
            <div className="text-xs text-slate-500 pt-1">
              Share the email + temp password with the user. They should change it on first login.
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
              <Button type="button" variant="ghost" onClick={() => setInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create User
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Edit Access Modal */}
      <Dialog open={accessModalOpen} onClose={() => setAccessModalOpen(false)} title="Edit Access Roles">
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            User: <span className="text-slate-200 font-semibold">{targetEmail}</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {roleKeys.map(r => (
              <label key={r} className="flex items-center gap-3 p-3 rounded-lg border border-slate-900 bg-slate-950/40 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4.5 h-4.5"
                  checked={editAccessRoles[r]}
                  onChange={e => setEditAccessRoles({ ...editAccessRoles, [r]: e.target.checked })}
                />
                <span className="text-sm font-semibold text-slate-200 capitalize">{r}</span>
              </label>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-light">WhatsApp Number</label>
            <Input
              type="text"
              placeholder="e.g. +919876543210"
              value={editWhatsApp}
              onChange={e => setEditWhatsApp(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
            <Button variant="ghost" onClick={() => setAccessModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveAccess}>
              Save Changes
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetPwdModalOpen} onClose={() => setResetPwdModalOpen(false)} title="Reset User Password">
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Reset password for: <span className="text-slate-200 font-semibold">{targetEmail}</span>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-light">New Password (8+ chars)</label>
            <Input
              type="text"
              value={resetPasswordVal}
              onChange={e => setResetPasswordVal(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
            <Button variant="ghost" onClick={() => setResetPwdModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleResetPassword}>
              Reset Password
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
