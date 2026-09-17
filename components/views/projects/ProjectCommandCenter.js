'use client';
import React, { useState, useMemo } from 'react';
import { Search, Plus, LayoutGrid, List, ArrowUpRight, TrendingUp, IndianRupee, Wallet, Layers, AlertTriangle, CheckCircle2, Clock, ChevronRight, X, Download } from 'lucide-react';
import { Card, CardContent, Button, Input, Badge } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';
import { fmtLakhs, num, Sparkline } from '../dashboard/dashboard-utils';
import { exportToCSV } from '../../../app/lib/exportUtils';
import ProjectDetails from './ProjectDetails';

// ─── Health Helpers ────────────────────────────────────────────────────────────
function getProjectHealth(p) {
  const poIssued = num(p.poIssued);
  const bcs = num(p.bcs);
  const outflow = num(p.outflow);
  const pendingOutflow = num(p.pendingOutflow);
  const projectValue = num(p.projectValueTax || p.projectValue);

  // Budget utilization: PO Issued / BCS
  const budgetUtil = bcs > 0 ? Math.min((poIssued / bcs) * 100, 150) : 0;
  // Spend rate: Outflow / PO Issued
  const spendRate = poIssued > 0 ? Math.min((outflow / poIssued) * 100, 100) : 0;
  // Overrun: PO Issued > BCS
  const isOverrun = bcs > 0 && poIssued > bcs;
  // Low activity: very little paid vs committed
  const isLowActivity = poIssued > 0 && spendRate < 10;

  let status = 'healthy';
  let statusLabel = 'On Track';
  if (isOverrun) { status = 'overrun'; statusLabel = 'Budget Overrun'; }
  else if (budgetUtil > 85) { status = 'warning'; statusLabel = 'High Utilization'; }
  else if (isLowActivity) { status = 'idle'; statusLabel = 'Low Activity'; }

  return { budgetUtil, spendRate, isOverrun, status, statusLabel, projectValue, poIssued, bcs, outflow, pendingOutflow };
}

const STATUS_CONFIG = {
  healthy:  { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  warning:  { color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   bar: 'bg-amber-500',   dot: 'bg-amber-500'   },
  overrun:  { color: 'text-rose-500',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    bar: 'bg-rose-500',    dot: 'bg-rose-500'    },
  idle:     { color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   bar: 'bg-slate-400',   dot: 'bg-slate-400'   },
};

// ─── Summary KPI Strip ─────────────────────────────────────────────────────────
function ProjectsKpiStrip({ projectsList }) {
  const totals = useMemo(() => {
    let totPO = 0, totOutflow = 0, totPending = 0, totBCS = 0, totPV = 0;
    projectsList.forEach(p => {
      totPO       += num(p.poIssued);
      totOutflow  += num(p.outflow);
      totPending  += num(p.pendingOutflow);
      totBCS      += num(p.bcs);
      totPV       += num(p.projectValueTax || p.projectValue);
    });
    const overrun = projectsList.filter(p => {
      const bcs = num(p.bcs); const po = num(p.poIssued);
      return bcs > 0 && po > bcs;
    }).length;
    return { totPO, totOutflow, totPending, totBCS, totPV, overrun };
  }, [projectsList]);

  const { totPO, totOutflow, totPending, totBCS, totPV, overrun } = totals;
  const budgetUsedPct = totBCS > 0 ? Math.round((totPO / totBCS) * 100) : 0;

  const kpis = [
    {
      label: 'Total PO Committed',
      value: fmtLakhs(totPO),
      sub: `${budgetUsedPct}% of BCS Budget`,
      subColor: budgetUsedPct > 90 ? 'text-rose-500' : budgetUsedPct > 70 ? 'text-amber-500' : 'text-emerald-500',
      icon: <Layers className="w-4 h-4" />,
      accent: 'amber',
      spark: projectsList.map(p => num(p.poIssued)),
      sparkColor: 'rgba(200,164,90,.95)',
    },
    {
      label: 'Total Paid Outflow',
      value: fmtLakhs(totOutflow),
      sub: `${totPO > 0 ? Math.round((totOutflow / totPO) * 100) : 0}% of Committed Spent`,
      subColor: 'text-emerald-500',
      icon: <IndianRupee className="w-4 h-4" />,
      accent: 'emerald',
      spark: projectsList.map(p => num(p.outflow)),
      sparkColor: 'rgba(61,214,140,.95)',
    },
    {
      label: 'Pending Outflow',
      value: fmtLakhs(totPending),
      sub: 'Approved, Not Yet Remitted',
      subColor: 'text-amber-500',
      icon: <Clock className="w-4 h-4" />,
      accent: 'sky',
      spark: projectsList.map(p => num(p.pendingOutflow)),
      sparkColor: 'rgba(56,189,248,.95)',
    },
    {
      label: 'Budget (BCS)',
      value: fmtLakhs(totBCS),
      sub: `Contract Value: ${fmtLakhs(totPV)}`,
      subColor: 'text-muted-foreground',
      icon: <TrendingUp className="w-4 h-4" />,
      accent: 'violet',
      spark: projectsList.map(p => num(p.bcs)),
      sparkColor: 'rgba(167,139,250,.95)',
    },
    {
      label: 'Projects at Risk',
      value: overrun,
      sub: overrun > 0 ? `${overrun} Budget Overrun${overrun > 1 ? 's' : ''}` : 'All Projects Healthy',
      subColor: overrun > 0 ? 'text-rose-500' : 'text-emerald-500',
      icon: overrun > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />,
      accent: overrun > 0 ? 'rose' : 'emerald',
      spark: null,
    },
  ];

  const accentMap = {
    amber:   { iconBg: 'bg-amber-500/10 text-amber-600 dark:text-gold border-amber-500/20', hover: 'hover:border-amber-500/40' },
    emerald: { iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', hover: 'hover:border-emerald-500/40' },
    sky:     { iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', hover: 'hover:border-sky-500/40' },
    violet:  { iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20', hover: 'hover:border-violet-500/40' },
    rose:    { iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', hover: 'hover:border-rose-500/40' },
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((k, i) => {
        const ac = accentMap[k.accent];
        return (
          <Card key={i} className={`p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-200 ${ac.hover}`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{k.label}</span>
                <div className="text-xl font-bold text-foreground font-mono mt-1 tabular-nums">{k.value}</div>
              </div>
              <div className={`p-2 rounded-xl border shrink-0 ml-2 ${ac.iconBg}`}>{k.icon}</div>
            </div>
            <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/60">
              <span className={`text-[11px] font-semibold ${k.subColor}`}>{k.sub}</span>
              {k.spark && <div className="w-16 h-7"><Sparkline data={k.spark} color={k.sparkColor} /></div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Single Project Card ───────────────────────────────────────────────────────
function ProjectCard({ project, isSelected, onClick, projectPOs }) {
  const h = getProjectHealth(project);
  const sc = STATUS_CONFIG[h.status];
  const poCount = projectPOs?.length || 0;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-2xl border transition-all duration-200 relative group
        ${isSelected
          ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
          : 'bg-card border-border/70 hover:border-amber-500/30 hover:bg-amber-500/5 hover:shadow-sm'}
      `}
    >
      {/* Top row: name + status badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide truncate leading-tight">
            {project.project}
          </p>
          {project.client && (
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
              {project.client}
            </p>
          )}
          {project.project_ref && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted/60 text-muted-foreground border border-border/50 font-mono">
              {project.project_ref}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border shrink-0 ${sc.bg} ${sc.color} ${sc.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {h.statusLabel}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">PO Committed</p>
          <p className="text-xs font-bold text-foreground tabular-nums">{fmtLakhs(h.poIssued)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Paid Out</p>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtLakhs(h.outflow)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Pending</p>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">{fmtLakhs(h.pendingOutflow)}</p>
        </div>
      </div>

      {/* Budget utilization bar */}
      {h.bcs > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Budget Utilized</span>
            <span className={`text-[10px] font-bold tabular-nums ${h.isOverrun ? 'text-rose-500' : h.budgetUtil > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {h.budgetUtil.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${sc.bar}`}
              style={{ width: `${Math.min(h.budgetUtil, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: PO count + arrow */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground font-medium">
          {poCount} PO{poCount !== 1 ? 's' : ''} Linked
        </span>
        <ChevronRight className={`w-3.5 h-3.5 transition-all duration-200 ${isSelected ? 'text-amber-500 translate-x-0.5' : 'text-muted-foreground/40 group-hover:text-amber-500/60 group-hover:translate-x-0.5'}`} />
      </div>
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProjectCommandCenter({
  projectsList,
  selectedProject,
  setSelectedProject,
  projectPOs,
  setShowNewProjectModal,
  onUpdateProject,
  loading,
  pos,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');

  const filteredProjects = useMemo(() => {
    return (projectsList || []).filter(p => {
      const term = searchTerm.toLowerCase();
      const matchSearch = !term ||
        (p.project || '').toLowerCase().includes(term) ||
        (p.client || '').toLowerCase().includes(term) ||
        (p.project_ref || '').toLowerCase().includes(term);

      if (!matchSearch) return false;
      if (statusFilter === 'all') return true;
      const h = getProjectHealth(p);
      return h.status === statusFilter;
    });
  }, [projectsList, searchTerm, statusFilter]);

  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    return list.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.project || '').localeCompare(b.project || '');
      if (sortBy === 'name-desc') return (b.project || '').localeCompare(a.project || '');
      if (sortBy === 'budget-desc') return num(b.bcs) - num(a.bcs);
      if (sortBy === 'budget-asc') return num(a.bcs) - num(b.bcs);
      if (sortBy === 'po-desc') return num(b.poIssued) - num(a.poIssued);
      if (sortBy === 'outflow-desc') return num(b.outflow) - num(a.outflow);
      if (sortBy === 'pending-desc') return num(b.pendingOutflow) - num(a.pendingOutflow);
      if (sortBy === 'util-desc') {
        const utilA = num(a.bcs) > 0 ? (num(a.poIssued) / num(a.bcs)) : 0;
        const utilB = num(b.bcs) > 0 ? (num(b.poIssued) / num(b.bcs)) : 0;
        return utilB - utilA;
      }
      return 0;
    });
  }, [filteredProjects, sortBy]);

  // compute per-project POs for all cards
  const getProjectPOs = (project) => {
    return (pos || []).filter(po => {
      if (!po) return false;
      const pName = String(po.project || po.project_name || po.project_id || '').trim().toLowerCase();
      const targetName = String(project.project || project.name || '').trim().toLowerCase();
      if (!pName || !targetName) return false;
      return pName === targetName || pName.includes(targetName) || targetName.includes(pName);
    });
  };

  const handleExportCSV = () => {
    const columns = [
      { label: 'Project Name', key: 'project' },
      { label: 'Reference', key: 'project_ref' },
      { label: 'Client', key: 'client' },
      { label: 'BCS Budget', key: 'bcs' },
      { label: 'PO Issued', key: 'poIssued' },
      { label: 'Paid Outflow', key: 'outflow' },
      { label: 'Pending Outflow', key: 'pendingOutflow' },
    ];
    exportToCSV('Projects_Command_Center.csv', columns, sortedProjects);
  };

  const statusCounts = useMemo(() => {
    const counts = { all: projectsList.length, healthy: 0, warning: 0, overrun: 0, idle: 0 };
    projectsList.forEach(p => { const h = getProjectHealth(p); counts[h.status]++; });
    return counts;
  }, [projectsList]);

  const filterTabs = [
    { id: 'all',     label: 'All',          count: statusCounts.all },
    { id: 'healthy', label: '✓ On Track',   count: statusCounts.healthy },
    { id: 'warning', label: '⚠ High Util',  count: statusCounts.warning },
    { id: 'overrun', label: '✗ Overrun',     count: statusCounts.overrun },
    { id: 'idle',    label: '~ Idle',        count: statusCounts.idle },
  ];

  if (loading && projectsList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading Project Command Center...</p>
      </div>
    );
  }

  // When a project card is clicked, open dedicated 360-degree project intelligence view
  if (selectedProject) {
    return (
      <ProjectDetails
        selectedProject={selectedProject}
        projectPOs={projectPOs}
        onBack={() => setSelectedProject(null)}
        onUpdateProject={onUpdateProject}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Project Command Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {projectsList.length} project{projectsList.length !== 1 ? 's' : ''} · Real-time budget & outflow intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs font-semibold border-border">
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewProjectModal(true)}
            className="h-8 text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Project
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      {projectsList.length > 0 && <ProjectsKpiStrip projectsList={projectsList} />}

      {/* ── Filter Tabs + Search + View Toggle ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Status filter pills */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 border border-border rounded-xl flex-shrink-0">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap
                ${statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search project, client..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-card"
            />
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="h-8 px-2.5 py-1 text-xs font-medium rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="name-asc">Sort: Name (A–Z)</option>
            <option value="name-desc">Sort: Name (Z–A)</option>
            <option value="budget-desc">Sort: Budget (High to Low)</option>
            <option value="po-desc">Sort: PO Committed (High to Low)</option>
            <option value="outflow-desc">Sort: Paid Outflow (High to Low)</option>
            <option value="util-desc">Sort: Budget Utilized %</option>
            <option value="pending-desc">Sort: Pending Outflow</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center p-0.5 bg-muted/50 border border-border rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'list' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content: Project Cards Grid / List ── */}
      {sortedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-border rounded-2xl bg-muted/20">
          <Wallet className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">No projects match your filters</p>
          <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} className="text-xs text-amber-500 hover:underline font-medium cursor-pointer">
            Clear filters
          </button>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-2'
        }>
          {sortedProjects.map((p, idx) => (
            <ProjectCard
              key={idx}
              project={p}
              isSelected={false}
              onClick={() => setSelectedProject(p)}
              projectPOs={getProjectPOs(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
