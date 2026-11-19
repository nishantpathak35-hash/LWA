'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../../ui/core';
import { formatCurrency, formatDate } from '../../../app/lib/utils';
import { GitBranch, Plus, CheckCircle2, XCircle, Clock, Eye, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function BOQRevisions({ project, boqId, activeVersionId, onSelectVersion }) {
  const { call } = useAppState();
  const [versionList, setVersionList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [creating, setCreating] = useState(false);

  const loadRevisions = useCallback(async () => {
    if (!boqId && !project) return;
    setLoading(true);
    try {
      let res;
      if (boqId) {
        res = await call('getBoqVersionsList', boqId);
      } else {
        res = await call('getBoqList', project);
      }
      setVersionList(res || []);
    } catch (err) {
      toast.error('Failed to load revisions: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, boqId, project]);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  const handleCreateRevision = async (e) => {
    e.preventDefault();
    if (!activeVersionId) return;

    setCreating(true);
    try {
      const res = await call('createBoqRevision', activeVersionId, revisionReason || 'Scope Revision');
      toast.success(`Successfully created ${res.revision_label}!`);
      setRevisionModalOpen(false);
      setRevisionReason('');
      loadRevisions();
      onSelectVersion?.(res.new_version_id);
    } catch (err) {
      toast.error('Failed to create revision: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-amber-500" />
            BOQ Scope Revisions & Variation Orders (VO)
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Audit-safe version snapshots. Approved baselines remain immutable; new revisions capture variations.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setRevisionModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Create Scope Revision
        </Button>
      </div>

      {/* Revisions Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="text-xs w-28">BOQ Number</TableHead>
                <TableHead className="text-xs">Title / Package</TableHead>
                <TableHead className="text-xs w-28 text-center">Revision</TableHead>
                <TableHead className="text-xs w-28 text-center">Status</TableHead>
                <TableHead className="text-xs text-right">Contract Value</TableHead>
                <TableHead className="text-xs text-right">Estimated Cost</TableHead>
                <TableHead className="text-xs text-center w-24">Margin %</TableHead>
                <TableHead className="text-xs">Created At</TableHead>
                <TableHead className="text-xs text-right w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading revisions history...
                  </TableCell>
                </TableRow>
              ) : versionList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                    No revision records found for this BOQ.
                  </TableCell>
                </TableRow>
              ) : (
                versionList.map(b => {
                  const targetVerId = b.id || b.current_version_id;
                  const isActive = targetVerId === activeVersionId;

                  return (
                    <TableRow key={targetVerId} className={`hover:bg-muted/20 ${isActive ? 'bg-amber-500/5 font-semibold' : ''}`}>
                      <TableCell className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {b.boq_no}
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        {b.title || b.boq_title}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] font-mono bg-muted/50">
                          {b.revision_label || `Rev ${b.version_number || 0}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            (b.status === 'Approved' || b.version_status === 'Approved')
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : (b.status === 'Submitted' || b.version_status === 'Submitted')
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {b.status || b.version_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(b.total_selling_value || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(b.total_cost_value || 0)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
                        {b.margin_pct || 0}%
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(b.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isActive ? 'default' : 'outline'}
                          onClick={() => onSelectVersion?.(targetVerId)}
                          className={`text-xs h-7 ${isActive ? 'bg-amber-600 text-white' : ''}`}
                        >
                          {isActive ? 'Active' : 'Load'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Revision Dialog */}
      <Dialog
        open={revisionModalOpen}
        onOpenChange={setRevisionModalOpen}
        title="Create New Scope Revision"
      >
        <form onSubmit={handleCreateRevision} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            A new draft version will clone all items and sections. Existing purchase order links remain associated with their respective baseline items.
          </p>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Scope Change / Variation Reason *
            </label>
            <textarea
              required
              rows={3}
              value={revisionReason}
              onChange={e => setRevisionReason(e.target.value)}
              placeholder="e.g. Scope addition for 4th Floor Conference Room Audio-Visual & acoustic paneling..."
              className="w-full text-xs p-2.5 bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRevisionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={creating} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
              {creating ? 'Cloning Version...' : 'Create Revision'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
