'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Dialog } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';
import {
  FileSpreadsheet, Plus, RefreshCw, Layers, TrendingUp,
  Tag, GitBranch, ShoppingCart, Download, ShieldCheck, AlertCircle
} from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

import BOQOverview from '../boq/BOQOverview';
import BOQEditor from '../boq/BOQEditor';
import BOQRateAnalysis from '../boq/BOQRateAnalysis';
import BOQBomView from '../boq/BOQBomView';
import BOQRevisions from '../boq/BOQRevisions';
import BOQProcurementTracker from '../boq/BOQProcurementTracker';
import BOQReports from '../boq/BOQReports';

const SUB_TABS = [
  { id: 'overview', label: 'BOQ Overview', icon: TrendingUp },
  { id: 'editor', label: 'BOQ Editor', icon: FileSpreadsheet },
  { id: 'rate_analysis', label: 'Rate Analysis & Costing', icon: Tag },
  { id: 'bom', label: 'Material Breakdown / BOM', icon: Layers },
  { id: 'revisions', label: 'Revisions & Variations', icon: GitBranch },
  { id: 'procurement', label: 'Procurement Tracking', icon: ShoppingCart },
  { id: 'reports', label: 'Reports & Exports', icon: Download }
];

export default function ProjectBOQModule({ selectedProject, initialBoqId }) {
  const { call } = useAppState();
  const projectName = selectedProject?.project || selectedProject?.name || '';

  const [boqList, setBoqList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBoqId, setSelectedBoqId] = useState(initialBoqId || '');
  const [activeVersionId, setActiveVersionId] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('editor');

  // New BOQ Modal
  const [showNewBoqModal, setShowNewBoqModal] = useState(false);
  const [newBoqTitle, setNewBoqTitle] = useState('Main Fitout BOQ');
  const [creatingBoq, setCreatingBoq] = useState(false);

  // Load BOQs for this project
  const loadBoqs = useCallback(async (targetBoqId = null) => {
    if (!projectName) return;
    setLoading(true);
    try {
      const list = await call('getBoqList', projectName);
      setBoqList(list || []);

      if (list && list.length > 0) {
        setSelectedBoqId(prev => {
          const toSelect = targetBoqId || prev;
          const matched = list.find(b => b.id === toSelect) || list[0];
          setActiveVersionId(matched.current_version_id);
          return matched.id;
        });
      } else {
        setSelectedBoqId('');
        setActiveVersionId('');
      }
    } catch (err) {
      toast.error('Failed to load project BOQs: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, projectName]);

  useEffect(() => {
    loadBoqs();
  }, [loadBoqs]);

  // Current active BOQ header
  const currentBoq = useMemo(() => {
    return boqList.find(b => b.id === selectedBoqId) || boqList[0] || null;
  }, [boqList, selectedBoqId]);

  // Handle BOQ Selection change
  const handleSelectBoq = (id) => {
    setSelectedBoqId(id);
    const found = boqList.find(b => b.id === id);
    if (found?.current_version_id) {
      setActiveVersionId(found.current_version_id);
    }
  };

  // Create new BOQ
  const handleCreateBoq = async (e) => {
    e.preventDefault();
    if (!newBoqTitle.trim()) return;

    setCreatingBoq(true);
    try {
      const res = await call('createBoq', {
        project: projectName,
        title: newBoqTitle.trim()
      });
      toast.success(`Created ${res.boq_no}!`);
      setShowNewBoqModal(false);
      setNewBoqTitle('Main Fitout BOQ');
      await loadBoqs();
      if (res.boq_id) {
        setSelectedBoqId(res.boq_id);
        setActiveVersionId(res.version_id);
      }
    } catch (err) {
      toast.error('Failed to create BOQ: ' + err.message);
    } finally {
      setCreatingBoq(false);
    }
  };

  if (loading && boqList.length === 0) {
    return (
      <div className="p-16 text-center text-muted-foreground text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
        Loading project Bill of Quantities...
      </div>
    );
  }

  // If no BOQs exist yet, show clean Empty State with 1-click generator
  if (boqList.length === 0) {
    return (
      <Card className="border-border p-12 text-center max-w-xl mx-auto my-8 bg-card">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-foreground">No Bill of Quantities (BOQ) Found</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-6">
          Initialize a structured estimation model for <strong>{projectName}</strong> with pre-configured work package sections (Civil, Ceiling, Flooring, Electrical, HVAC, Furniture).
        </p>
        <Button
          onClick={() => setShowNewBoqModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create Project BOQ
        </Button>

        {/* Create Dialog */}
        <Dialog open={showNewBoqModal} onOpenChange={setShowNewBoqModal} title="Create New Project BOQ">
          <form onSubmit={handleCreateBoq} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">BOQ Title / Scope</label>
              <Input
                required
                autoFocus
                value={newBoqTitle}
                onChange={e => setNewBoqTitle(e.target.value)}
                placeholder="e.g. Master Turnkey Fitout BOQ"
                className="text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNewBoqModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creatingBoq} className="bg-amber-600 hover:bg-amber-700 text-white">
                {creatingBoq ? 'Initializing...' : 'Create BOQ'}
              </Button>
            </div>
          </form>
        </Dialog>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header Bar: BOQ Selector & KPI Strip */}
      <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Active BOQ:</span>
            <select
              value={selectedBoqId}
              onChange={e => handleSelectBoq(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
            >
              {boqList.map(b => (
                <option key={b.id} value={b.id}>
                  {b.boq_no} - {b.title} ({b.revision_label || `Rev ${b.version_number}`})
                </option>
              ))}
            </select>
          </div>

          {currentBoq && (
            <Badge
              variant="outline"
              className={`text-[11px] ${
                currentBoq.version_status === 'Approved'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : currentBoq.version_status === 'Submitted'
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentBoq.version_status || currentBoq.status}
            </Badge>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewBoqModal(true)}
            className="text-xs gap-1 h-7"
          >
            <Plus className="w-3.5 h-3.5" /> New Package BOQ
          </Button>
        </div>

        {/* Live Metrics Pill Strip */}
        {currentBoq && (
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block font-sans">Contract Value:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                {formatCurrency(currentBoq.total_selling_value || 0)}
              </strong>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block font-sans">Est. Cost:</span>
              <strong className="text-blue-600 dark:text-blue-400 font-bold">
                {formatCurrency(currentBoq.total_cost_value || 0)}
              </strong>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block font-sans">Gross Margin:</span>
              <strong className="text-amber-600 dark:text-amber-400 font-bold">
                {currentBoq.margin_pct || 0}%
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex gap-1.5 border-b border-border pb-2 overflow-x-auto">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Contents */}
      {activeVersionId && (
        <div className="pt-2">
          {activeSubTab === 'overview' && (
            <BOQOverview
              boqVersionId={activeVersionId}
              onNavigateTab={tab => setActiveSubTab(tab)}
            />
          )}

          {activeSubTab === 'editor' && (
            <BOQEditor
              boqVersionId={activeVersionId}
              onVersionUpdated={newVerId => {
                loadBoqs();
                if (newVerId) setActiveVersionId(newVerId);
              }}
            />
          )}

          {activeSubTab === 'rate_analysis' && (
            <BOQRateAnalysis boqVersionId={activeVersionId} />
          )}

          {activeSubTab === 'bom' && (
            <BOQBomView boqVersionId={activeVersionId} />
          )}

          {activeSubTab === 'revisions' && (
            <BOQRevisions
              project={projectName}
              boqId={currentBoq?.id}
              activeVersionId={activeVersionId}
              onSelectVersion={verId => {
                setActiveVersionId(verId);
                setActiveSubTab('editor');
              }}
            />
          )}

          {activeSubTab === 'procurement' && (
            <BOQProcurementTracker boqVersionId={activeVersionId} />
          )}

          {activeSubTab === 'reports' && (
            <BOQReports boqVersionId={activeVersionId} project={projectName} />
          )}
        </div>
      )}

      {/* New BOQ Modal */}
      <Dialog open={showNewBoqModal} onOpenChange={setShowNewBoqModal} title="Create New Project BOQ">
        <form onSubmit={handleCreateBoq} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">BOQ Title / Package Scope *</label>
            <Input
              required
              autoFocus
              value={newBoqTitle}
              onChange={e => setNewBoqTitle(e.target.value)}
              placeholder="e.g. Phase 2 Interior Furnishing BOQ"
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowNewBoqModal(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={creatingBoq} className="bg-amber-600 hover:bg-amber-700 text-white">
              {creatingBoq ? 'Creating...' : 'Create BOQ'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
