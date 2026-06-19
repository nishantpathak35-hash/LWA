'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../ui/core';
import { Users, Shield, Settings, Key, UserCheck, UserMinus, Plus, Download, Loader2 } from 'lucide-react';
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
  const [permissions, setPermissions] = useState({});

  // Verify Director access
  const isDirector = user?.roles?.includes('director');

  // Load Users Tab Data
  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await call('listUsersAdmin');
      setUsersList(list || []);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load System Tab Data
  const loadSystem = async () => {
    try {
      const prefix = await call('getPOPrefix', {});
      setPoPrefix(prefix || '');
    } catch (e) {
      console.error('Failed to load PO prefix:', e);
    }
  };

  // Load Permissions Tab Data
  const loadPermissions = async () => {
    try {
      const perms = await call('getFeaturePermissions');
      setPermissions(perms || {});
    } catch (e) {
      console.error('Failed to load permissions:', e);
    }
  };

  useEffect(() => {
    if (!isDirector) return;
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'permissions') {
      loadPermissions();
    } else if (activeTab === 'system') {
      loadSystem();
    }
  }, [activeTab, isDirector]);

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
      alert(`User ${!currentActive ? 'activated' : 'deactivated'}.`);
      loadUsers();
    } catch (e) {
      alert('Error: ' + (e.message || String(e)));
    }
  };

  const handleDeleteUser = async (email) => {
    if (!window.confirm(`Are you absolutely sure you want to delete user ${email}? This action cannot be undone.`)) {
      return;
    }
    try {
      await call('deleteUserAdmin', email);
      alert('User deleted successfully.');
      loadUsers();
    } catch (e) {
      alert('Error: ' + (e.message || String(e)));
    }
  };

  const handleAddCustomRole = async () => {
    const roleName = newRoleName.trim();
    if (!roleName) {
      alert('Please enter a role name.');
      return;
    }
    try {
      const res = await call('addCustomRole', roleName);
      if (res && res.ok) {
        alert(`Role "${roleName}" registered successfully!`);
        setNewRoleName('');
        loadUsers();
      }
    } catch (e) {
      alert('Error: ' + (e.message || String(e)));
    }
  };

  const handleSavePOPrefix = async () => {
    try {
      await call('setPOPrefix', poPrefix);
      alert('PO number series prefix saved successfully.');
    } catch (e) {
      alert('Error: ' + (e.message || String(e)));
    }
  };

  const handleClearServerCache = async () => {
    try {
      await call('clearAllCaches');
      alert('Cache cleared. Reload the page to see fresh data.');
    } catch (e) {
      alert('Error: ' + (e.message || String(e)));
    }
  };

  const handleReloadAll = async () => {
    try {
      await call('clearAllCaches');
      alert('Data reloaded. Refreshing page...');
      window.location.reload();
    } catch (e) {
      alert('Error: ' + (e.message || String(e)));
    }
  };

  const handleSavePermissions = async () => {
    const newConfig = { proc: [], finance: [], director: [] };
    
    // Scrape checklist state to reconstruct perms
    const checkboxes = document.querySelectorAll('.perm-check');
    checkboxes.forEach(cb => {
      if (cb.checked) {
        newConfig[cb.dataset.role].push(cb.dataset.feature);
      }
    });

    try {
      await call('setFeaturePermissions', newConfig);
      alert('Feature permissions saved successfully.');
    } catch (e) {
      alert('Error: ' + (e.message || String(e)));
    }
  };

  const handleInviteUserSubmit = async (e) => {
    e.preventDefault();
    const roles = Object.keys(newUserRoles).filter(r => newUserRoles[r]);
    if (!newUserName.trim() || !targetEmail.trim()) {
      alert('Please fill email and name.');
      return;
    }
    if (!roles.length) {
      alert('Select at least one access role.');
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
        alert(`User created & invite email sent to ${targetEmail}`);
        setInviteModalOpen(false);
        loadUsers();
      } else {
        const inviteUrl = res?.inviteUrl || 'https://lwa-iota.vercel.app/';
        setInviteResult(inviteUrl);
      }
    } catch (err) {
      alert('Error: ' + (err.message || String(err)));
    }
  };

  const handleSaveAccess = async () => {
    const roles = Object.keys(editAccessRoles).filter(r => editAccessRoles[r]);
    if (!roles.length) {
      alert('Select at least one access role.');
      return;
    }
    try {
      await call('setUserRolesAdmin', targetEmail, roles);
      alert('Access updated successfully.');
      setAccessModalOpen(false);
      loadUsers();
    } catch (e) {
      alert('Error: ' + (e.message || String(e)));
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordVal || resetPasswordVal.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    try {
      await call('resetUserPasswordAdmin', targetEmail, resetPasswordVal);
      alert(`Password reset for ${targetEmail}. Share new password with user.`);
      setResetPwdModalOpen(false);
    } catch (e) {
      alert('Error: ' + (e.message || String(e)));
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

  const roleKeys = ['proc', 'finance', 'director'];
  const roleLabels = { 'proc': 'Procurement', 'finance': 'Finance', 'director': 'Director' };

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
                      const isChecked = permissions[role]?.includes(key) || false;
                      return (
                        <TableCell key={role} className="text-center">
                          <input
                            type="checkbox"
                            className="perm-check w-4.5 h-4.5 border-slate-800 bg-slate-900 rounded checked:bg-gold cursor-pointer"
                            data-role={role}
                            data-feature={key}
                            defaultChecked={isChecked}
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
                    alert('Invite link copied!');
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
