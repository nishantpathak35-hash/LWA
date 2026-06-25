import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';
import { Download, Plus, Loader2, Key, UserCheck, UserMinus } from 'lucide-react';
import { cn } from '../../../app/lib/utils';

export default function SettingsUsersTab({
  usersSearch, setUsersSearch,
  handleExportUsers,
  setTargetEmail, setNewUserName, setNewUserPassword, setNewUserRoles, setInviteResult, setInviteModalOpen,
  loading, filteredUsers,
  setEditAccessRoles, setAccessModalOpen,
  setResetPasswordVal, setResetPwdModalOpen,
  handleToggleUserActive, handleDeleteUser,
  newRoleName, setNewRoleName, handleAddCustomRole
}) {
  return (
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
                          {u.lastLogin ? (
                            <div className="space-y-0.5">
                              <div className="text-slate-300 font-medium">{new Date(u.lastLogin).toLocaleString()}</div>
                              {(u.lastLoginIp || u.lastLoginDevice) && (
                                <div className="text-[10px] text-slate-500 font-mono tracking-tight leading-tight">
                                  {u.lastLoginIp && <div>IP: {u.lastLoginIp}</div>}
                                  {u.lastLoginDevice && <div className="truncate max-w-[150px]" title={u.lastLoginDevice}>{u.lastLoginDevice}</div>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="italic">never</span>
                          )}
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
  );
}
