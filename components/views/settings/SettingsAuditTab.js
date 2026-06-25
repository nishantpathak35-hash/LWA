import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/core';
import { ClipboardList, ChevronLeft, ChevronRight, Search, ArrowUpDown, Loader2, Download } from 'lucide-react';
import { cn } from '../../../app/lib/utils';

export default function SettingsAuditTab({
  auditTotal, auditSearch, setAuditSearch, setAuditPage, loadAuditLog,
  auditFilterType, setAuditFilterType, auditFilterDept, setAuditFilterDept,
  auditSortDir, setAuditSortDir, auditLogs, auditLoading,
  auditPage, auditTotalPages
}) {
  return (
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
  );
}
