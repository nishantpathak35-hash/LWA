'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../ui/core';
import { Building2, Search, Plus, Edit2, Trash2, ExternalLink, FolderKanban, FileSpreadsheet, Phone, Mail, MapPin, RefreshCw, FileText, ChevronRight, X, Briefcase, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../app/lib/utils';
import { useAppState } from '../StateProvider';
import { toast } from '../ui/Toast';

export default function ClientsView() {
  const { call, setActiveView } = useAppState();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Drawer / Detail state
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);

  const initialForm = {
    name: '',
    company_name: '',
    email: '',
    contact: '',
    gst: '',
    pan: '',
    address: '',
    state: '',
    status: 'Active'
  };
  const [formData, setFormData] = useState(initialForm);

  // Load clients
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await call('listClients', { search, status: statusFilter });
      setClients(res || []);
    } catch (err) {
      toast.error('Failed to load clients: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, search, statusFilter]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Load client details with linked projects and BOQs
  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    setLoadingDetails(true);
    try {
      const details = await call('getClientProjectsAndBoqs', client.id);
      setClientDetails(details);
    } catch (err) {
      toast.error('Failed to load client details: ' + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData(initialForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (client, e) => {
    if (e) e.stopPropagation();
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      company_name: client.company_name || client.name || '',
      email: client.email || '',
      contact: client.contact || '',
      gst: client.gst || '',
      pan: client.pan || '',
      address: client.address || '',
      state: client.state || '',
      status: client.status || 'Active'
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    setSaving(true);
    try {
      await call('saveClient', {
        ...formData,
        id: editingClient ? editingClient.id : undefined
      });
      toast.success(editingClient ? 'Client updated successfully' : 'Client created successfully');
      setModalOpen(false);
      loadClients();
      if (selectedClient && editingClient && selectedClient.id === editingClient.id) {
        handleSelectClient({ ...selectedClient, ...formData });
      }
    } catch (err) {
      toast.error('Failed to save client: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to deactivate client "${client.name}"?`)) return;

    try {
      await call('deleteClient', client.id);
      toast.success('Client deactivated');
      if (selectedClient?.id === client.id) {
        setSelectedClient(null);
        setClientDetails(null);
      }
      loadClients();
    } catch (err) {
      toast.error('Failed to delete client: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-500" />
            Client Directory & Contract Linkage
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Enterprise Client Master linked to Projects, BOQs, Approved Margins, and Execution Workflows.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadClients} className="h-9">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={handleOpenAdd} className="h-9 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> Add New Client
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-border">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clients by name, GST, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs rounded-md bg-background border border-border px-3 text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active Clients</option>
              <option value="Inactive">Inactive</option>
            </select>
            <div className="text-xs text-muted-foreground font-medium pl-2">
              Total Clients: <strong className="text-foreground">{clients.length}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Main Grid / Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`space-y-4 ${selectedClient ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Client Name</TableHead>
                    <TableHead className="text-xs font-semibold">Company / Entity</TableHead>
                    <TableHead className="text-xs font-semibold">Contact & GST</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Linked Projects</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Total Value</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                        Loading clients...
                      </TableCell>
                    </TableRow>
                  ) : clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                        No clients found matching the criteria. Click "Add New Client" to register one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((c) => {
                      const isSelected = selectedClient?.id === c.id;
                      return (
                        <TableRow
                          key={c.id}
                          onClick={() => handleSelectClient(c)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : 'hover:bg-muted/40'
                          }`}
                        >
                          <TableCell className="font-semibold text-xs text-foreground">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="font-bold">{c.name}</span>
                              {(c.is_project_mapped || c.created_by === 'system:project_sync') && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 font-normal">
                                  From Project
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.company_name || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>{c.contact || c.email || '-'}</div>
                            {c.gst && <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">GST: {c.gst}</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs font-semibold bg-muted/60">
                              {c.linked_projects_count || 0} Projects
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                            {formatCurrency(c.total_contract_value || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[10px] ${
                                c.status === 'Active'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {c.status || 'Active'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => handleOpenEdit(c, e)}
                                className="w-7 h-7 text-muted-foreground hover:text-foreground"
                                title="Edit Client"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => handleDelete(c, e)}
                                className="w-7 h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                title="Deactivate Client"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Client Detail Drawer (Right Column) */}
        {selectedClient && (
          <div className="space-y-4">
            <Card className="border-border sticky top-6 shadow-md bg-card/90 backdrop-blur-sm">
              <CardHeader className="border-b border-border py-3.5 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-500" />
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider truncate max-w-[180px]">
                    Client: {selectedClient.name}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDelete(selectedClient, e)}
                    className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 flex items-center gap-1"
                    title="Delete Client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientDetails(null);
                    }}
                    className="w-6 h-6 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto text-xs">
                {/* Client Basic Specs */}
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Entity Name:</span>
                    <span className="font-semibold text-foreground">{selectedClient.company_name || selectedClient.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">GSTIN:</span>
                    <span className="font-mono text-foreground font-semibold">{selectedClient.gst || 'Not Provided'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">PAN:</span>
                    <span className="font-mono text-foreground">{selectedClient.pan || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-foreground">{selectedClient.contact || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground">{selectedClient.email || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">State / Region:</span>
                    <span className="text-foreground">{selectedClient.state || selectedClient.address || '-'}</span>
                  </div>
                </div>

                {/* Linked Projects */}
                <div>
                  <h3 className="font-bold text-foreground text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-amber-500" />
                    Linked Projects ({clientDetails?.projects?.length || 0})
                  </h3>
                  {loadingDetails ? (
                    <div className="py-6 text-center text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-500" />
                      Loading projects & BOQs...
                    </div>
                  ) : clientDetails?.projects?.length === 0 ? (
                    <p className="text-muted-foreground italic py-2">No projects directly linked to this client yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {clientDetails?.projects?.map((p) => (
                        <div
                          key={p.project}
                          className="p-2.5 rounded-lg border border-border bg-background hover:border-amber-500/50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-foreground text-xs">{p.project}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              Budget: {formatCurrency(p.project_value || 0)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveView('projects')}
                            className="h-7 text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-500"
                          >
                            Open Project <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked BOQs & Margins */}
                <div>
                  <h3 className="font-bold text-foreground text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    Linked BOQ Contracts ({clientDetails?.boqs?.length || 0})
                  </h3>
                  {clientDetails?.boqs?.length === 0 ? (
                    <p className="text-muted-foreground italic py-2">No approved BOQs on record for this client.</p>
                  ) : (
                    <div className="space-y-2">
                      {clientDetails?.boqs?.map((b) => (
                        <div
                          key={b.id}
                          className="p-2.5 rounded-lg border border-border bg-background space-y-1.5"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                              {b.boq_no || b.boq_number || 'BOQ-001'} (v{b.version_number || 1})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                className={`text-[9px] ${
                                  b.version_status === 'Approved'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : 'bg-amber-500/15 text-amber-500'
                                }`}
                              >
                                {b.version_status || 'Draft'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActiveView('boqs')}
                                className="h-5 px-1.5 text-[9px] text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center"
                                title="Open in BOQ & Estimation Workspace"
                              >
                                Open <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-[11px] text-foreground font-medium">{b.title}</div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-border/50">
                            <div>
                              <span className="text-muted-foreground">Selling:</span>{' '}
                              <strong className="text-foreground">{formatCurrency(b.total_selling_value || 0)}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Est. Cost:</span>{' '}
                              <strong className="text-foreground">{formatCurrency(b.total_cost_value || 0)}</strong>
                            </div>
                            <div className="col-span-2 text-emerald-600 dark:text-emerald-400 font-bold">
                              Gross Margin: {formatCurrency(b.gross_margin || 0)} ({Number(b.margin_pct || 0).toFixed(1)}%)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add / Edit Client Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                {editingClient ? 'Edit Client Record' : 'Register New Client'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Client Name *</label>
                <Input
                  required
                  placeholder="e.g. Acme Corporation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Company / Registered Entity</label>
                <Input
                  placeholder="e.g. Acme Commercial Interiors Pvt Ltd"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">GSTIN</label>
                  <Input
                    placeholder="27AAACA1234A1Z5"
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">PAN Number</label>
                  <Input
                    placeholder="AAACA1234A"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Contact Phone</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email</label>
                  <Input
                    type="email"
                    placeholder="procurement@acme.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Address / Site</label>
                  <Input
                    placeholder="Building 4, Sector 62"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">State</label>
                  <Input
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-9 text-xs rounded-md bg-background border border-border px-3 text-foreground"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-9 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  {saving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
