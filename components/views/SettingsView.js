'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../ui/core';
import { Users, Shield, Settings, Key, UserCheck, UserMinus, Plus, Download, Loader2, ClipboardList, ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { cn } from '../../app/lib/utils';

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
  
  // Dialog Form inputs
  const [targetEmail, setTargetEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRoles, setNewUserRoles] = useState({ proc: false, finance: true, director: false });
  const [newUserPassword, setNewUserPassword] = useState('ChangeMe123!');
  
  const [editAccessRoles, setEditAccessRoles] = useState({ proc: false, finance: false, director: false });
  const [resetPasswordVal, setResetPasswordVal] = useState('ChangeMe123!');
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
  const isDirector = user?.email === 'admin@luxeworx.com' || user?.roles?.includes('director');

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
    }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, isDirector, loadPermissions, loadSystem, loadUsers, loadCompany, loadAuditLog]);

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
        <div className="space-y-6">
          <Card className="bg-slate-950/40 border-slate-900">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
              <div className="flex flex-1 max-w-md gap-3">
                <Input
                  placeholder="Search users..."
                  value={usersSearch}
                  onChange={e => setUsersSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleExportUsers}>
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setTargetEmail('');
                    setNewUserName('');
                    setNewUserPassword('ChangeMe123!');
                    setNewUserRoles({ proc: false, finance: true, director: false });
                    setInviteResult(null);
                    setInviteModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Invite User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
              ) : (
                <Table id="tblUsers">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Access Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u, idx) => {
                        const status = u.locked ? (
                          <Badge variant="error">locked</Badge>
                        ) : u.active ? (
                          <Badge variant="success">active</Badge>
                        ) : (
                          <Badge variant="inactive">inactive</Badge>
                        );
                        const rs = u.roles || (u.role ? [u.role] : []);
                        
                        return (
                          <TableRow key={u.email || idx}>
                            <TableCell className="font-semibold text-slate-200">{u.email}</TableCell>
                            <TableCell>{u.name || '—'}</TableCell>
                            <TableCell className="flex gap-1.5 flex-wrap">
                              {rs.map(r => (
                                <Badge key={r} variant={r === 'director' ? 'warning' : 'default'}>
                                  {r}
                                </Badge>
                              ))}
                            </TableCell>
                            <TableCell>{status}</TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'never'}
                            </TableCell>
                            <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-slate-350 hover:text-slate-100"
                                onClick={() => {
                                  setTargetEmail(u.email);
                                  const updatedRoles = { proc: false, finance: false, director: false };
                                  rs.forEach(role => { updatedRoles[role] = true; });
                                  setEditAccessRoles(updatedRoles);
                                  setAccessModalOpen(true);
                                }}
                              >
                                Edit Access
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-gold hover:text-gold/80"
                                onClick={() => {
                                  setTargetEmail(u.email);
                                  setResetPasswordVal('ChangeMe123!');
                                  setResetPwdModalOpen(true);
                                }}
                              >
                                <Key className="w-3.5 h-3.5" /> Reset
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={cn("h-7 text-xs", u.active ? "text-slate-400 hover:text-slate-200" : "text-emerald-400 hover:text-emerald-350")}
                                onClick={() => handleToggleUserActive(u.email, u.active)}
                              >
                                <UserCheck className="w-3.5 h-3.5" /> {u.active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                onClick={() => handleDeleteUser(u.email)}
                              >
                                <UserMinus className="w-3.5 h-3.5" /> Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                          No users found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Add custom role card */}
          <Card className="bg-slate-950/40 border-slate-900">
            <CardHeader>
              <CardTitle className="text-gold font-medium">Add Custom Access Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end max-w-lg">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs text-slate-400 font-light">New Role Name</label>
                  <Input
                    placeholder="e.g. auditor, manager"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddCustomRole} variant="primary">
                  Add Role
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <Card className="bg-slate-950/40 border-slate-900">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-gold font-medium">Feature Permissions Matrix</CardTitle>
            <Button size="sm" variant="primary" onClick={handleSavePermissions}>
              Save Changes
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table id="tblPermissions">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Feature</TableHead>
                  {roleKeys.map(r => (
                    <TableHead key={r} className="text-center">{roleLabels[r]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(featureLabels).map(key => (
                  <TableRow key={key}>
                    <TableCell className="font-semibold text-slate-200">{featureLabels[key]}</TableCell>
                    {roleKeys.map(role => {
                      // Controlled checkbox — reads from and writes to React state, not the DOM
                      const isChecked = !!(localPerms[role] && localPerms[role].includes(key));
                      return (
                        <TableCell key={role} className="text-center">
                          <input
                            type="checkbox"
                            id={`perm-${role}-${key}`}
                            className="w-4 h-4 rounded cursor-pointer accent-amber-400"
                            checked={isChecked}
                            onChange={() => handleTogglePerm(role, key)}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <Card className="bg-slate-950/40 border-slate-900">
          <CardHeader>
            <CardTitle className="text-gold font-medium">System Utilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PO Prefix */}
            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-900 space-y-3">
              <div className="font-bold text-slate-200">PO Number Series Prefix</div>
              <div className="text-xs text-slate-400">
                Specify a custom prefix series to generate PO numbers (e.g., <code>LA/2627/</code>). Leave blank to use default Financial Year prefix.
              </div>
              <div className="flex gap-4 items-center">
                <Input
                  className="max-w-xs"
                  placeholder="LA/2627/"
                  value={poPrefix}
                  onChange={e => setPoPrefix(e.target.value)}
                />
                <Button size="sm" variant="primary" onClick={handleSavePOPrefix}>
                  Save Prefix
                </Button>
              </div>
            </div>

            {/* Clear cache */}
            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-slate-200">Clear Server Cache</div>
                <div className="text-xs text-slate-400">
                  Clears all cached data (vendors, KPIs, master data, POs). Use this if vendors or projects are not showing up in forms.
                </div>
              </div>
              <Button size="sm" variant="primary" onClick={handleClearServerCache}>
                Clear Cache
              </Button>
            </div>

            {/* Reload all data */}
            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-slate-200">Reload All Data</div>
                <div className="text-xs text-slate-400">
                  Clears cache and reloads vendors, projects, KPIs and master data from the spreadsheet.
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={handleReloadAll}>
                Reload All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Settings Tab */}
      {activeTab === 'company' && (
        <Card className="bg-slate-950/40 border-slate-900">
          <CardHeader>
            <CardTitle className="text-gold font-medium">Company Profile & Invoice Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveCompany} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-light">Registered Company Name</label>
                  <Input
                    placeholder="e.g. LUXEWORX ATELIER INTERIOR PRIVATE LIMITED"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-light">GSTIN</label>
                  <Input
                    placeholder="e.g. 06AAGCL1112M1ZP"
                    value={companyGstin}
                    onChange={e => setCompanyGstin(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs text-slate-400 font-light">Registered Office Address</label>
                  <textarea
                    className="w-full px-3.5 py-2 bg-white dark:bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all duration-200"
                    rows={4}
                    placeholder="8th Floor, Magnum Towers-1&#10;Golf Course Ext Rd&#10;Gurugram Haryana 122001"
                    value={companyAddress}
                    onChange={e => setCompanyAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs text-slate-400 font-light">Company Logo (Base64 data URI)</label>
                  <textarea
                    className="w-full px-3.5 py-2 bg-white dark:bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all duration-200 font-mono text-xs"
                    rows={6}
                    placeholder="data:image/png;base64,..."
                    value={companyLogo}
                    onChange={e => setCompanyLogo(e.target.value)}
                  />
                  {companyLogo && (
                    <div className="mt-3 p-3 border border-border rounded-lg bg-slate-900/10 max-w-xs">
                      <span className="text-[10px] text-slate-400 block mb-1">Logo Preview:</span>
                      <img src={companyLogo} alt="Preview" className="h-12 w-auto object-contain bg-white p-1 rounded" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-900">
                <Button type="submit" variant="primary" disabled={savingCompany}>
                  {savingCompany ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <Card className="bg-slate-950/40 border-slate-900">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
              <div>
                <CardTitle className="text-gold font-medium flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" /> Audit Log
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  {auditTotal > 0 ? `${auditTotal} total records` : 'System activity log'}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <Input
                    placeholder="Search..."
                    className="pl-8 w-48"
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setAuditPage(1); loadAuditLog(1); } }}
                  />
                </div>
                <select
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-gold/50"
                  value={auditFilterType}
                  onChange={e => { setAuditFilterType(e.target.value); setAuditPage(1); }}
                >
                  <option value="">All Actions</option>
                  <option value="Login">Login</option>
                  <option value="Logout">Logout</option>
                  <option value="Vendor Added">Vendor Added</option>
                  <option value="Vendor Updated">Vendor Updated</option>
                  <option value="PO Created">PO Created</option>
                  <option value="PO Updated">PO Updated</option>
                  <option value="PO Submitted">PO Submitted</option>
                  <option value="PO Approved">PO Approved</option>
                  <option value="PO Rejected">PO Rejected</option>
                  <option value="Payment Created">Payment Created</option>
                  <option value="Payment Approved">Payment Approved</option>
                  <option value="Payment Rejected">Payment Rejected</option>
                  <option value="Payment Remitted">Payment Remitted</option>
                  <option value="User Activated">User Activated</option>
                  <option value="User Deactivated">User Deactivated</option>
                  <option value="User Roles Updated">User Roles Updated</option>
                  <option value="User Password Reset">User Password Reset</option>
                  <option value="Cache Cleared">Cache Cleared</option>
                </select>
                <select
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-gold/50"
                  value={auditFilterDept}
                  onChange={e => { setAuditFilterDept(e.target.value); setAuditPage(1); }}
                >
                  <option value="">All Departments</option>
                  <option value="Auth">Auth</option>
                  <option value="Vendors">Vendors</option>
                  <option value="Purchase Orders">Purchase Orders</option>
                  <option value="Payments">Payments</option>
                  <option value="Settings">Settings</option>
                  <option value="System">System</option>
                </select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setAuditSortDir(d => d === 'DESC' ? 'ASC' : 'DESC'); setAuditPage(1); }}
                  title={`Sort: ${auditSortDir === 'DESC' ? 'Newest first' : 'Oldest first'}`}
                >
                  <ArrowUpDown className="w-4 h-4" /> {auditSortDir === 'DESC' ? 'Newest' : 'Oldest'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    let csv = "Timestamp,User,Action,Details,Department\n";
                    auditLogs.forEach(l => {
                      csv += `"${l.timestamp || ''}","${l.user || ''}","${l.actionType || ''}","${(l.details || '').replace(/"/g, '""')}","${l.department || ''}"\n`;
                    });
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Audit_Log.csv';
                    a.click();
                  }}
                >
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {auditLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
              ) : auditLogs.length > 0 ? (
                <>
                  <Table id="tblAuditLog">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Department</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log, idx) => {
                        const actionColor = {
                          'Login': 'text-emerald-400',
                          'Logout': 'text-slate-400',
                          'Vendor Added': 'text-blue-400',
                          'Vendor Updated': 'text-blue-300',
                          'PO Created': 'text-amber-400',
                          'PO Approved': 'text-emerald-400',
                          'PO Rejected': 'text-red-400',
                          'Payment Created': 'text-amber-400',
                          'Payment Approved': 'text-emerald-400',
                          'Payment Rejected': 'text-red-400',
                          'Payment Remitted': 'text-teal-400',
                          'User Activated': 'text-emerald-400',
                          'User Deactivated': 'text-orange-400',
                          'User Roles Updated': 'text-violet-400',
                          'User Password Reset': 'text-yellow-400',
                          'Cache Cleared': 'text-slate-400',
                        }[log.actionType] || 'text-slate-300';
                        return (
                          <TableRow key={log.id || idx}>
                            <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-slate-200 font-medium">
                              {log.user || '—'}
                            </TableCell>
                            <TableCell>
                              <span className={cn('text-sm font-semibold', actionColor)}>
                                {log.actionType || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-400 max-w-xs truncate" title={log.details || ''}>
                              {log.details || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="text-[10px]">
                                {log.department || 'System'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {auditTotalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-900">
                      <div className="text-xs text-slate-500">
                        Page {auditPage} of {auditTotalPages} ({auditTotal} records)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={auditPage <= 1}
                          onClick={() => { const p = auditPage - 1; setAuditPage(p); loadAuditLog(p); }}
                        >
                          <ChevronLeft className="w-4 h-4" /> Prev
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={auditPage >= auditTotalPages}
                          onClick={() => { const p = auditPage + 1; setAuditPage(p); loadAuditLog(p); }}
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                  <ClipboardList className="w-12 h-12 text-slate-700" />
                  <div className="text-sm font-medium">No audit records found</div>
                  <div className="text-xs text-slate-600">Audit records will appear here as users perform actions.</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legacy Correction Tab */}
      {activeTab === 'legacy_correction' && (
        <div className="space-y-6">
          <Card className="bg-slate-950/40 border-amber-900/50">
            <CardHeader className="p-6 border-b border-slate-900/50">
              <CardTitle className="text-amber-500 font-medium flex items-center gap-2">
                ⚠ Legacy PO Payment Correction
              </CardTitle>
              <p className="text-xs text-slate-400 font-light mt-1">
                Admin utility to correct miscalculated legacy paid amounts on purchase orders. All actions are strictly audited.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <form onSubmit={handleSearchLegacyPO} className="flex gap-3 max-w-md">
                <Input
                  required
                  placeholder="Enter PO Number..."
                  value={legacyPONo}
                  onChange={e => setLegacyPONo(e.target.value)}
                />
                <Button type="submit" variant="primary" disabled={legacySubmitting}>
                  {legacySubmitting ? 'Searching...' : 'Lookup PO'}
                </Button>
              </form>

              {legacyPO && (
                <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-xl space-y-5 animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">PO Number</div>
                      <div className="font-mono text-sm text-gold">{legacyPO.po_no}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Project</div>
                      <div className="text-sm text-slate-200">{legacyPO.project || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Vendor</div>
                      <div className="text-sm text-slate-200">{legacyPO.vendor_name || legacyPO.vendor || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total PO Value</div>
                      <div className="text-sm text-slate-200 font-semibold">
                        ₹{Number(legacyPO.revised_po_value || legacyPO.po_value || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] text-amber-500/80 uppercase tracking-wider mb-1">Current Logged Paid Amount</div>
                        <div className="text-2xl font-light text-amber-500 font-serif">
                          ₹{Number(legacyPO.legacy_paid || 0).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-light">New Paid Amount Override (₹)</label>
                        <Input
                          type="number"
                          value={legacyNewPaid}
                          onChange={e => setLegacyNewPaid(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-light">Reason for Correction (Required for Audit)</label>
                        <Input
                          type="text"
                          required
                          placeholder="e.g. Fixing legacy double counting issue"
                          value={legacyReason}
                          onChange={e => setLegacyReason(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-end space-y-3 bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
                      <div className="text-xs text-amber-500/80 mb-2">
                        <strong>Auto-Recalculate:</strong> Safely derives the paid amount based on manual system payments and remitted PRs.
                        <br/><br/>
                        <strong>Manual Update:</strong> Forces the exact amount specified in the input box.
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => handleCorrectLegacyPO(true)}
                        disabled={legacySubmitting || !legacyReason.trim()}
                        className="w-full"
                      >
                        Auto-Recalculate from Ledger
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleCorrectLegacyPO(false)}
                        disabled={legacySubmitting || !legacyReason.trim() || legacyNewPaid === ''}
                        className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      >
                        Force Manual Update
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Merger Tab */}
      {activeTab === 'project_merger' && (
        <div className="space-y-6">
          <Card className="bg-slate-950/40 border-red-900/50">
            <CardHeader className="p-6 border-b border-slate-900/50">
              <CardTitle className="text-red-400 font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" /> Project Merger Utility
              </CardTitle>
              <p className="text-xs text-slate-400 font-light mt-1">
                Admin utility to securely merge duplicate projects into a single target project without orphaning Purchase Orders or Payment Requests. All financials are summed and the source projects are deleted.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-light">Target Project (The project to KEEP)</label>
                  <Input
                    placeholder="e.g. COOFFIZ NOIDA"
                    value={mergeTargetProject}
                    onChange={e => setMergeTargetProject(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-light">Source Projects (The duplicates to MERGE and DELETE)</label>
                  <Input
                    placeholder="e.g. Cooffiz Noida, Co-offiz Noida, COOFFIZ"
                    value={mergeSourceProjects}
                    onChange={e => setMergeSourceProjects(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500">Separate multiple source projects with commas.</p>
                </div>
                
                <div className="pt-4 border-t border-slate-800">
                  <Button 
                    variant="primary" 
                    className="w-full bg-red-600 hover:bg-red-500 text-white border-none"
                    onClick={handleMergeProjects}
                    disabled={mergeSubmitting || !mergeTargetProject.trim() || !mergeSourceProjects.trim()}
                  >
                    {mergeSubmitting ? 'Merging Projects...' : 'Merge Projects Now'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
