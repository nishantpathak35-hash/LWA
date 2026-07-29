import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';
import { Download, Plus, Loader2, Key, UserCheck, UserMinus, Shield, Search, Ban, Trash2 } from 'lucide-react';
import { cn } from '../../../app/lib/utils';

export default function SettingsUsersTab({
  usersSearch, setUsersSearch,
  handleExportUsers,
  setTargetEmail, setNewUserName, setNewUserPassword, setNewUserRoles,
  newWhatsApp, setNewWhatsApp,
  newEmployeeId, setNewEmployeeId, newDepartment, setNewDepartment, newMobileNumber, setNewMobileNumber,
  editWhatsApp, setEditWhatsApp,
  editEmployeeId, setEditEmployeeId, editDepartment, setEditDepartment, editMobileNumber, setEditMobileNumber,
  setInviteResult, setInviteModalOpen,
  loading, filteredUsers,
  setEditAccessRoles, setAccessModalOpen,
  setResetPasswordVal, setResetPwdModalOpen,
  handleToggleUserActive, handleDeleteUser,
  newRoleName, setNewRoleName, handleAddCustomRole
}) {
  const getRoleBadge = (role) => {
    const r = String(role).toLowerCase();
    let variantClass = "bg-slate-800 text-slate-300 border-slate-700";
    if (r === 'director') variantClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
    else if (r === 'admin') variantClass = "bg-rose-500/15 text-rose-400 border-rose-500/30";
    else if (r === 'finance') variantClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    else if (r === 'procurement' || r === 'proc') variantClass = "bg-blue-500/15 text-blue-400 border-blue-500/30";
    else if (r === 'accountant') variantClass = "bg-purple-500/15 text-purple-400 border-purple-500/30";

    return (
      <span key={role} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${variantClass}`}>
        {role}
      </span>
    );
  };

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-950/40 border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-slate-800/80">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search users by name or email..."
              value={usersSearch}
              onChange={e => setUsersSearch(e.target.value)}
              className="pl-9 bg-slate-900/50 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleExportUsers} className="text-xs text-slate-300 hover:text-slate-100">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setTargetEmail('');
                setNewUserName('');
                setNewUserPassword('ChangeMe123!');
                setNewWhatsApp('');
                setNewEmployeeId('');
                setNewDepartment('');
                setNewMobileNumber('');
                setNewUserRoles({ proc: false, finance: true, director: false });
                setInviteResult(null);
                setInviteModalOpen(true);
              }}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Invite User
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
                <TableRow className="border-b border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-500 text-[10px] uppercase">User Details</TableHead>
                  <TableHead className="text-slate-500 text-[10px] uppercase">WhatsApp</TableHead>
                  <TableHead className="text-slate-500 text-[10px] uppercase">Access Roles</TableHead>
                  <TableHead className="text-slate-500 text-[10px] uppercase">Status</TableHead>
                  <TableHead className="text-slate-500 text-[10px] uppercase">Last Active</TableHead>
                  <TableHead className="text-slate-500 text-[10px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u, idx) => {
                    const isUserActive = u.active !== false;
                    const statusBadge = u.locked ? (
                      <Badge variant="error">locked</Badge>
                    ) : isUserActive ? (
                      <Badge variant="success">active</Badge>
                    ) : (
                      <Badge variant="inactive">inactive</Badge>
                    );
                    const rs = u.roles || (u.role ? [u.role] : []);
                    const initials = getInitials(u.name, u.email);

                    return (
                      <TableRow key={u.email || idx} className="border-b border-slate-800/80 hover:bg-slate-900/40">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-gold flex-shrink-0">
                              {initials}
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-semibold text-xs text-slate-200">{u.name || '—'}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-slate-300 font-mono">{u.whatsapp_number || '—'}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-1 flex-wrap">
                            {rs.map(r => getRoleBadge(r))}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">{statusBadge}</TableCell>
                        <TableCell className="py-3 text-xs text-slate-500">
                          {u.lastLogin ? (
                            <div className="space-y-0.5">
                              <div className="text-slate-300 font-medium text-[11px]">{new Date(u.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                              {(u.lastLoginIp || u.lastLoginDevice) && (
                                <div className="text-[10px] text-slate-500 font-mono tracking-tight leading-tight">
                                  {u.lastLoginIp && <div>IP: {u.lastLoginIp}</div>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="italic text-[11px]">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right whitespace-nowrap space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2"
                            title="Edit Access Roles"
                            onClick={() => {
                              setTargetEmail(u.email);
                              const updatedRoles = { proc: false, finance: false, director: false };
                              const rs = Array.isArray(u.roles) 
                                ? u.roles 
                                : (typeof u.roles === 'string' ? u.roles.split(',') : []).map(r => r.trim()).filter(Boolean);
                              rs.forEach(role => { updatedRoles[role] = true; });
                              setEditAccessRoles(updatedRoles);
                              setEditWhatsApp(u.whatsapp_number || '');
                              setEditEmployeeId(u.employee_id || '');
                              setEditDepartment(u.department || '');
                              setEditMobileNumber(u.mobile_number || '');
                              setAccessModalOpen(true);
                            }}
                          >
                            <Shield className="w-3.5 h-3.5 mr-1" /> Edit Access
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-gold hover:text-amber-300 hover:bg-gold/10 px-2"
                            title="Reset Password"
                            onClick={() => {
                              setTargetEmail(u.email);
                              setResetPasswordVal('ChangeMe123!');
                              setResetPwdModalOpen(true);
                            }}
                          >
                            <Key className="w-3.5 h-3.5 mr-1" /> Reset
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn("h-7 text-xs px-2", isUserActive ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10")}
                            title={isUserActive ? "Deactivate User" : "Activate User"}
                            onClick={() => handleToggleUserActive(u.email, isUserActive)}
                          >
                            {isUserActive ? <Ban className="w-3.5 h-3.5 mr-1" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />}
                            {isUserActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2"
                            title="Delete User"
                            onClick={() => handleDeleteUser(u.email)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500 text-xs">
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
      <Card className="bg-slate-950/40 border-slate-800">
        <CardHeader className="p-5 border-b border-slate-800/80">
          <CardTitle className="text-sm font-semibold text-gold tracking-wide uppercase">Add Custom Access Role</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex gap-3 items-end max-w-md">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">New Role Name</label>
              <Input
                placeholder="e.g. auditor, manager"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                className="bg-slate-900/50 text-xs"
              />
            </div>
            <Button onClick={handleAddCustomRole} variant="primary" className="text-xs">
              Add Role
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
