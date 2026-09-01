import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Dialog } from '../../ui/core';
import { PlusCircle, Search, Eye, Edit2, CreditCard, Trash2, AlertTriangle, Download, Users, Mail, UserCheck, ShieldCheck, Key } from 'lucide-react';
import SortableHeader from '../../ui/SortableHeader';
import { exportToCSV, sortData } from '../../../app/lib/exportUtils';
import VendorInviteModal from './VendorInviteModal';
import VendorOnboardingAdminView from './VendorOnboardingAdminView';

export default function VendorsHeader({ canOnboard, handleOpenModal, filteredVendors, searchQuery, setSearchQuery, handleOpenViewModal, handleOpenEditModal, setActiveView, hasMoreVendors, loadMoreVendors, handleDeleteVendor, handleTogglePortalAccess }) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'pending'

  // Sorting & Filtering State
  const [sortField, setSortField] = useState('code');
  const [sortDir, setSortDir] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gstFilter, setGstFilter] = useState('all');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const processedVendors = useMemo(() => {
    let result = filteredVendors.filter(v => {
      if (statusFilter !== 'all') {
        const st = String(v.status || 'Active').toLowerCase();
        if (statusFilter === 'active' && st !== 'active') return false;
        if (statusFilter === 'inactive' && st === 'active') return false;
      }
      if (gstFilter !== 'all') {
        const hasGst = Boolean(v.gstin && v.gstin.trim());
        if (gstFilter === 'registered' && !hasGst) return false;
        if (gstFilter === 'unregistered' && hasGst) return false;
      }
      return true;
    });

    return sortData(result, sortField, sortDir);
  }, [filteredVendors, statusFilter, gstFilter, sortField, sortDir]);

  const handleExportCSV = () => {
    const columns = [
      { label: 'Vendor Code', key: 'code' },
      { label: 'Display Name', key: 'name' },
      { label: 'Legal Name', key: 'legalName' },
      { label: 'GSTIN', key: 'gstin' },
      { label: 'PAN', key: 'pan' },
      { label: 'Status', key: 'status' },
      { label: 'Email', key: 'email' },
      { label: 'Address', key: 'address' }
    ];
    exportToCSV('Vendors_Directory.csv', columns, processedVendors);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadMoreVendors();
    setLoadingMore(false);
  };

  const confirmDeleteRow = async () => {
    if (!vendorToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const code = vendorToDelete.code || vendorToDelete.vendorId || vendorToDelete.vendor_code;
      await handleDeleteVendor(code);
      setVendorToDelete(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete vendor.');
    } finally {
      setDeleting(false);
    }
  };

  const totalVendors = filteredVendors.length;
  const activeCount = useMemo(() => filteredVendors.filter(v => (v.status || 'Active').toLowerCase() === 'active').length, [filteredVendors]);
  const portalEnabledCount = useMemo(() => filteredVendors.filter(v => String(v.portal_access || v.portalAccess || '').toLowerCase() === 'enabled').length, [filteredVendors]);

  return (
    <>
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-2">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Vendors Master</h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Manage canonical vendor directory, self-registrations, and B2B portal access.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          {/* Sub view toggle pill */}
          <div className="flex items-center p-1 bg-muted/60 border border-border rounded-xl">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'directory' 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                  : 'text-muted-foreground hover:text-foreground font-semibold'
              }`}
            >
              Vendor Directory ({totalVendors})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pending' 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                  : 'text-muted-foreground hover:text-foreground font-semibold'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Pending Onboardings
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="font-semibold text-xs h-8 bg-card border-border hover:bg-muted text-foreground">
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setInviteModalOpen(true)} className="font-semibold text-xs h-8 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 bg-amber-500/5">
            <Mail className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            + Invite Vendor
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenModal} className="font-bold text-xs h-8 bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm">
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Onboard Vendor
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Vendors</div>
            <div className="text-lg font-bold text-foreground tracking-tight mt-0.5">{totalVendors}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Master</div>
            <div className="text-lg font-bold text-foreground tracking-tight mt-0.5">{activeCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</div>
            <div className="text-lg font-bold text-amber-500 tracking-tight mt-0.5 flex items-center gap-1.5">
              <span>Review Queue</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Portal Access</div>
            <div className="text-lg font-bold text-foreground tracking-tight mt-0.5">{portalEnabledCount} Enabled</div>
          </div>
        </div>
      </div>

      {activeTab === 'pending' ? (
        <VendorOnboardingAdminView onVendorApproved={() => loadMoreVendors && loadMoreVendors()} />
      ) : (
        <Card>
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 py-3.5 px-6">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Registered Vendors ({processedVendors.length})
          </CardTitle>
          
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-input rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-gold/50 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={gstFilter}
              onChange={e => setGstFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-input rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-gold/50 cursor-pointer"
            >
              <option value="all">All GST Types</option>
              <option value="registered">GST Registered</option>
              <option value="unregistered">Unregistered</option>
            </select>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search name, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs py-1.5 h-8 bg-card"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {processedVendors.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm font-medium">
              No vendors found matching your filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40">
                    <SortableHeader field="code" label="Code" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-28" />
                    <SortableHeader field="name" label="Display Name" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                    <SortableHeader field="legalName" label="Legal Name" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                    <SortableHeader field="gstin" label="GSTIN" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-36" />
                    <SortableHeader field="status" label="Status" currentSortField={sortField} currentSortDir={sortDir} onSort={handleSort} className="w-24" />
                    <TableHead className="w-32 py-3 px-4 font-bold text-[11px] text-muted-foreground tracking-wide select-none">Portal Access</TableHead>
                    <TableHead className="text-center w-56 py-3 px-4 font-bold text-[11px] text-muted-foreground tracking-wide select-none">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedVendors.map((v, idx) => {
                    const isPortalEnabled = String(v.portal_access || v.portalAccess || '').toLowerCase() === 'enabled';
                    const code = v.code || v.vendorId || v.vendor_code;
                    return (
                      <TableRow key={idx} className="border-b border-border/40 hover:bg-muted/30 transition-colors duration-150">
                        <TableCell className="px-4 py-3.5 font-mono text-xs font-bold text-foreground">{v.code}</TableCell>
                        <TableCell className="px-3 py-3.5 font-semibold text-foreground text-xs truncate max-w-[220px]" title={v.name}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-700 dark:text-gold flex items-center justify-center text-[10px] font-bold border border-amber-500/20 shrink-0">
                              {(v.name || 'V').substring(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate">{v.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-muted-foreground font-normal text-xs truncate max-w-[220px]" title={v.legalName || ''}>{v.legalName || '—'}</TableCell>
                        <TableCell className="px-3 py-3.5 font-mono text-xs text-muted-foreground font-medium">{v.gstin || '—'}</TableCell>
                        <TableCell className="px-3 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            String(v.status || '').toLowerCase() === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${String(v.status || '').toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {v.status || 'Active'}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 whitespace-nowrap">
                          <Badge variant={isPortalEnabled ? 'success' : 'outline'} className="text-[10px] font-bold">
                            {isPortalEnabled ? '● Enabled' : '○ Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenViewModal(v)} title="View Vendor Details" className="h-7 text-xs font-medium">
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              View
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(v)} title="Edit Vendor" className="h-7 text-xs font-medium">
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                              Edit
                            </Button>
                            {handleTogglePortalAccess && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePortalAccess(code, !isPortalEnabled)}
                                title={isPortalEnabled ? 'Revoke Portal Access' : 'Grant Portal Access'}
                                className={`h-7 text-[11px] font-semibold ${isPortalEnabled ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                              >
                                <Key className="w-3 h-3 mr-1" />
                                {isPortalEnabled ? 'Revoke Portal' : 'Grant Portal'}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setDeleteError(null); setVendorToDelete(v); }}
                              title="Delete Vendor"
                              className="h-7 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {hasMoreVendors && (
                <div className="flex justify-center p-4 border-t border-border bg-muted/20">
                  <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore} className="text-muted-foreground hover:text-foreground font-medium">
                    {loadingMore ? 'Loading...' : 'Load More Vendors'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* Invite Vendor Modal */}
      <VendorInviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInviteSuccess={() => { if (loadMoreVendors) loadMoreVendors(); }}
      />

      {/* Row-Level Delete Confirmation Modal */}
      {vendorToDelete && (
        <Dialog open={!!vendorToDelete} onClose={() => setVendorToDelete(null)} title="Delete Vendor Confirmation">
          <div className="space-y-4">
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-200 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>Delete vendor "{vendorToDelete.name || vendorToDelete.legalName}"?</span>
              </div>
              <p className="text-xs text-red-300/90 leading-relaxed">
                Vendor Code: <strong className="font-mono text-red-200">{vendorToDelete.code}</strong>.
                This operation cannot be undone. Vendors linked to existing Purchase Orders or Payment Requests cannot be deleted.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setVendorToDelete(null)} className="text-xs">Cancel</Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleting}
                onClick={confirmDeleteRow}
                className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
