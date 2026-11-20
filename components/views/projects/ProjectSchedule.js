'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../../ui/core';
import {
  Calendar, Clock, CheckCircle2, AlertTriangle, AlertCircle, Plus, Edit2, Trash2,
  Filter, Layers, Users, BarChart2, RefreshCw, X, ChevronRight, ChevronDown, CheckCircle,
  ArrowRight, UserCheck, Download, Upload, CheckSquare, Square, FileSpreadsheet, Flag,
  CalendarDays, UserPlus, Play, Check, Flame, Search, FileText
} from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

const DEFAULT_WORK_PACKAGES = [
  'Civil & Demolition',
  'MEP & Electrical Services',
  'False Ceiling & Partition',
  'Flooring & Tiling',
  'Carpentry & Joinery',
  'Glass & Glazing',
  'Painting & Finishing',
  'HVAC & Ventilation',
  'Plumbing & Sanitary',
  'Modular Furniture & Fixtures',
  'Testing, Commissioning & Handover',
  'General & Prelims'
];

export default function ProjectSchedule({ project }) {
  const { call } = useAppState();
  const [schedule, setSchedule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Views: 'wbs' (Phase-grouped list) | 'gantt' (Visual timeline) | 'employees' (Resource mapping)
  const [viewMode, setViewMode] = useState('wbs');
  const [selectedWorkPackage, setSelectedWorkPackage] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [collapsedPhases, setCollapsedPhases] = useState({});

  // Modal State for Add / Edit Task
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);

  // Quick Progress Modal State
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressTask, setProgressTask] = useState(null);
  const [quickProgress, setQuickProgress] = useState({
    progressPct: 0,
    executedQty: 0,
    isCompleted: false,
    delayReason: '',
    blockers: ''
  });

  // Import from BOQ Modal State
  const [boqModalOpen, setBoqModalOpen] = useState(false);
  const [loadingBoqItems, setLoadingBoqItems] = useState(false);
  const [boqSearchTerm, setBoqSearchTerm] = useState('');
  const [boqSectionFilter, setBoqSectionFilter] = useState('all');
  const [selectedBoqItemIds, setSelectedBoqItemIds] = useState(new Set());
  const [boqImportDefaults, setBoqImportDefaults] = useState({
    start_date: new Date().toISOString().split('T')[0],
    duration_days: 7,
    assigned_to_id: '',
    assigned_to_name: ''
  });
  const [importingBoq, setImportingBoq] = useState(false);

  // New Phase Modal
  const [showAddPhaseModal, setShowAddPhaseModal] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [customWorkPackages, setCustomWorkPackages] = useState([]);

  const initialTaskForm = {
    title: '',
    description: '',
    work_package: 'Civil & Demolition',
    boq_item_id: '',
    boq_section_id: '',
    assigned_to_id: '',
    assigned_to_name: '',
    accountable_owner_id: '',
    accountable_owner_name: '',
    planned_start_date: new Date().toISOString().split('T')[0],
    duration_days: 7,
    planned_end_date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    priority: 'Medium',
    planned_qty: 0,
    actual_qty: 0,
    uom: 'Nos',
    progress_pct: 0,
    status: 'Not Started',
    delay_reason: '',
    blockers: ''
  };
  const [taskForm, setTaskForm] = useState(initialTaskForm);

  // Load Schedule, Tasks, Employees & BOQ items
  const loadData = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const [schedRes, taskRes, empRes, userRes] = await Promise.all([
        call('getProjectSchedule', project),
        call('listProjectScheduleTasks', { project }),
        call('listSiteEmployees', {}).catch(() => []),
        call('listActiveUsers').catch(() => [])
      ]);
      setSchedule(schedRes);
      setTasks(taskRes || []);

      // Merge site employees and system active users
      const combinedEmps = [];
      const seen = new Set();
      (empRes || []).forEach(e => {
        if (e.name && !seen.has(e.name.toLowerCase())) {
          seen.add(e.name.toLowerCase());
          combinedEmps.push({ id: e.employee_id || e.id, name: e.name, designation: e.designation || 'Site Supervisor' });
        }
      });
      (userRes || []).forEach(u => {
        if (u.name && !seen.has(u.name.toLowerCase())) {
          seen.add(u.name.toLowerCase());
          combinedEmps.push({ id: u.email, name: u.name, designation: (u.roles || []).join(', ') || 'Team Member' });
        }
      });
      setEmployees(combinedEmps);

      // Fetch BOQ items for linkage / import
      try {
        const boqRes = await call('getBoqItemsForPoImport', { project });
        const list = Array.isArray(boqRes) ? boqRes : (boqRes?.items || []);
        setBoqItems(list);
      } catch (err) {
        console.warn('[ProjectSchedule] Failed to load BOQ items:', err);
      }
    } catch (err) {
      toast.error('Failed to load project schedule: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, project]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combined work packages (default + any custom ones found in tasks)
  const allWorkPackages = useMemo(() => {
    const set = new Set([...DEFAULT_WORK_PACKAGES, ...customWorkPackages]);
    tasks.forEach(t => {
      if (t.work_package) set.add(t.work_package);
    });
    return Array.from(set);
  }, [tasks, customWorkPackages]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedWorkPackage !== 'all' && t.work_package !== selectedWorkPackage) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      if (selectedAssignee !== 'all' && (t.assigned_to_name || 'Unassigned') !== selectedAssignee) return false;
      return true;
    });
  }, [tasks, selectedWorkPackage, selectedStatus, selectedAssignee]);

  // Group tasks by Phase / Work Package
  const tasksByPhase = useMemo(() => {
    const groups = {};
    allWorkPackages.forEach(wp => { groups[wp] = []; });
    tasks.forEach(t => {
      const wp = t.work_package || 'General & Prelims';
      if (!groups[wp]) groups[wp] = [];
      groups[wp].push(t);
    });
    return groups;
  }, [tasks, allWorkPackages]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    let notStarted = 0;

    tasks.forEach((t) => {
      if (t.status === 'Completed') completed++;
      else if (t.status === 'In Progress') inProgress++;
      else notStarted++;

      if (t.is_overdue) overdue++;
    });

    const total = tasks.length;
    const progressAvg = total > 0 ? Math.round(tasks.reduce((acc, cur) => acc + (cur.progress_pct || 0), 0) / total) : 0;

    return {
      total,
      completed,
      inProgress,
      overdue,
      notStarted,
      progressAvg
    };
  }, [tasks]);

  // Date and Duration sync helpers
  const handleStartDateChange = (startDateStr) => {
    const days = parseInt(taskForm.duration_days, 10) || 1;
    const startObj = new Date(startDateStr);
    const endObj = new Date(startObj.getTime() + (days - 1) * 86400000);
    setTaskForm(prev => ({
      ...prev,
      planned_start_date: startDateStr,
      planned_end_date: endObj.toISOString().split('T')[0]
    }));
  };

  const handleDurationChange = (daysVal) => {
    const days = Math.max(1, parseInt(daysVal, 10) || 1);
    const startObj = new Date(taskForm.planned_start_date);
    const endObj = new Date(startObj.getTime() + (days - 1) * 86400000);
    setTaskForm(prev => ({
      ...prev,
      duration_days: days,
      planned_end_date: endObj.toISOString().split('T')[0]
    }));
  };

  const handleEndDateChange = (endDateStr) => {
    const startObj = new Date(taskForm.planned_start_date);
    const endObj = new Date(endDateStr);
    const diffDays = Math.max(1, Math.round((endObj - startObj) / 86400000) + 1);
    setTaskForm(prev => ({
      ...prev,
      planned_end_date: endDateStr,
      duration_days: diffDays
    }));
  };

  // Open Modal to Add Task (optionally pre-selecting a phase)
  const handleOpenAdd = (workPackage = 'Civil & Demolition') => {
    setEditingTask(null);
    const today = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];
    setTaskForm({
      ...initialTaskForm,
      work_package: workPackage,
      planned_start_date: today,
      duration_days: 7,
      planned_end_date: end
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (t, e) => {
    if (e) e.stopPropagation();
    setEditingTask(t);
    const startObj = new Date(t.planned_start_date);
    const endObj = new Date(t.planned_end_date);
    const diffDays = Math.max(1, Math.round((endObj - startObj) / 86400000) + 1);

    setTaskForm({
      id: t.id,
      title: t.title || '',
      description: t.description || '',
      work_package: t.work_package || 'Civil & Demolition',
      boq_item_id: t.boq_item_id || '',
      boq_section_id: t.boq_section_id || '',
      assigned_to_id: t.assigned_to_id || '',
      assigned_to_name: t.assigned_to_name || '',
      accountable_owner_id: t.accountable_owner_id || '',
      accountable_owner_name: t.accountable_owner_name || '',
      planned_start_date: t.planned_start_date || new Date().toISOString().split('T')[0],
      duration_days: diffDays,
      planned_end_date: t.planned_end_date || new Date().toISOString().split('T')[0],
      priority: t.priority || 'Medium',
      planned_qty: t.planned_qty || 0,
      actual_qty: t.actual_qty || 0,
      uom: t.uom || 'Nos',
      progress_pct: t.progress_pct || 0,
      status: t.status || 'Not Started',
      delay_reason: t.delay_reason || '',
      blockers: t.blockers || ''
    });
    setModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await call('saveScheduleTask', {
        ...taskForm,
        project
      });
      toast.success(editingTask ? 'Task updated' : 'Scheduled task created');
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save task: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (t, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete task "${t.title}"?`)) return;

    try {
      await call('deleteScheduleTask', t.id);
      toast.success('Task removed');
      loadData();
    } catch (err) {
      toast.error('Failed to delete task: ' + err.message);
    }
  };

  // Quick Progress Modal Handlers
  const handleOpenProgress = (t, e) => {
    if (e) e.stopPropagation();
    setProgressTask(t);
    setQuickProgress({
      progressPct: t.progress_pct || 0,
      executedQty: t.actual_qty || 0,
      isCompleted: t.status === 'Completed',
      delayReason: t.delay_reason || '',
      blockers: t.blockers || ''
    });
    setProgressModalOpen(true);
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!progressTask) return;
    setSaving(true);
    try {
      await call('updateTaskProgressFromDpr', {
        taskId: progressTask.id,
        progressPct: quickProgress.progressPct,
        executedQty: quickProgress.executedQty,
        isCompleted: quickProgress.isCompleted,
        delayReason: quickProgress.delayReason,
        blockers: quickProgress.blockers
      });
      toast.success('Progress recorded successfully');
      setProgressModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to update progress: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Collapse of a Phase in WBS view
  const togglePhaseCollapse = (wp) => {
    setCollapsedPhases(prev => ({ ...prev, [wp]: !prev[wp] }));
  };

  // Open BOQ Import Drawer / Modal with live reload
  const handleOpenBoqImport = async () => {
    setBoqModalOpen(true);
    setLoadingBoqItems(true);
    try {
      const boqRes = await call('getBoqItemsForPoImport', { project });
      const list = Array.isArray(boqRes) ? boqRes : (boqRes?.items || []);
      setBoqItems(list);
      if (list.length > 0 && selectedBoqItemIds.size === 0) {
        setSelectedBoqItemIds(new Set(list.map(b => b.id)));
      }
    } catch (err) {
      toast.error('Failed to load BOQ items: ' + err.message);
    } finally {
      setLoadingBoqItems(false);
    }
  };

  const boqSections = useMemo(() => {
    const set = new Set();
    boqItems.forEach(b => {
      if (b.section_name) set.add(b.section_name);
    });
    return Array.from(set);
  }, [boqItems]);

  const filteredBoqItems = useMemo(() => {
    return boqItems.filter(b => {
      if (boqSectionFilter !== 'all' && (b.section_name || 'General') !== boqSectionFilter) {
        return false;
      }
      if (boqSearchTerm.trim()) {
        const s = boqSearchTerm.toLowerCase();
        const desc = String(b.description || '').toLowerCase();
        const code = String(b.item_code || '').toLowerCase();
        const sec = String(b.section_name || '').toLowerCase();
        if (!desc.includes(s) && !code.includes(s) && !sec.includes(s)) return false;
      }
      return true;
    });
  }, [boqItems, boqSectionFilter, boqSearchTerm]);

  // Import Selected BOQ Items to Schedule
  const handleImportBoqItems = async () => {
    if (selectedBoqItemIds.size === 0) {
      toast.error('Select at least one BOQ item to import');
      return;
    }
    setImportingBoq(true);
    try {
      const selectedItems = boqItems
        .filter(b => selectedBoqItemIds.has(b.id))
        .map(b => ({
          boq_item_id: b.id,
          title: b.description || b.name,
          work_package: b.section_name || 'General & Prelims',
          planned_qty: b.quantity || 1,
          uom: b.unit || 'Nos',
          duration_days: boqImportDefaults.duration_days,
          start_date: boqImportDefaults.start_date,
          assigned_to_id: boqImportDefaults.assigned_to_id,
          assigned_to_name: boqImportDefaults.assigned_to_name
        }));

      const res = await call('importBoqItemsToSchedule', {
        project,
        items: selectedItems
      });

      toast.success(`Imported ${res?.imported || selectedItems.length} tasks from BOQ into schedule!`);
      setBoqModalOpen(false);
      setSelectedBoqItemIds(new Set());
      await loadData();
    } catch (err) {
      toast.error('Failed to import BOQ items: ' + err.message);
    } finally {
      setImportingBoq(false);
    }
  };

  // Add Custom Phase
  const handleAddCustomPhase = (e) => {
    e.preventDefault();
    if (!newPhaseName.trim()) return;
    const clean = newPhaseName.trim();
    if (!allWorkPackages.includes(clean)) {
      setCustomWorkPackages(prev => [...prev, clean]);
      toast.success(`Added Phase: "${clean}"`);
    }
    setNewPhaseName('');
    setShowAddPhaseModal(false);
  };

  // Gantt Chart Calculations (Accurate Proportional Dates)
  const ganttMeta = useMemo(() => {
    if (tasks.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 1, weeks: [] };

    let minTime = Infinity;
    let maxTime = -Infinity;

    tasks.forEach(t => {
      const s = new Date(t.planned_start_date).getTime();
      const e = new Date(t.planned_end_date).getTime();
      if (!isNaN(s) && s < minTime) minTime = s;
      if (!isNaN(e) && e > maxTime) maxTime = e;
    });

    if (minTime === Infinity) {
      minTime = Date.now();
      maxTime = Date.now() + 30 * 86400000;
    }

    // Add 2 days padding
    minTime -= 2 * 86400000;
    maxTime += 5 * 86400000;

    const totalDays = Math.max(7, Math.ceil((maxTime - minTime) / 86400000));
    
    // Generate week header segments
    const weeks = [];
    let curTime = minTime;
    let weekIndex = 1;
    while (curTime < maxTime) {
      const wDate = new Date(curTime);
      weeks.push({
        label: `W${weekIndex}: ${wDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
        time: curTime
      });
      curTime += 7 * 86400000;
      weekIndex++;
    }

    const todayTime = Date.now();
    const todayLeftPct = Math.min(100, Math.max(0, ((todayTime - minTime) / (totalDays * 86400000)) * 100));

    return {
      minTime,
      maxTime,
      totalDays,
      weeks,
      todayLeftPct
    };
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* KPI Cards / Schedule Intelligence */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card border-border p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Total Activities
          </span>
          <div className="text-2xl font-black text-foreground">{metrics.total}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Across {allWorkPackages.length} Fit-out Phases
          </span>
        </Card>

        <Card className="bg-card border-border p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            In Execution
          </span>
          <div className="text-2xl font-black text-blue-500">{metrics.inProgress}</div>
          <span className="text-[10px] text-blue-500 font-semibold mt-0.5 block">Active on site</span>
        </Card>

        <Card className="bg-card border-border p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Completed Works
          </span>
          <div className="text-2xl font-black text-emerald-500">{metrics.completed}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}% Phase Closure
          </span>
        </Card>

        <Card className="bg-card border-border p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Overdue / Critical
          </span>
          <div className="text-2xl font-black text-rose-500">{metrics.overdue}</div>
          <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block">
            {metrics.overdue > 0 ? 'Delayed Site Milestone' : 'All on track'}
          </span>
        </Card>

        <Card className="bg-card border-border p-3.5 shadow-xs col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Physical Progress
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.progressAvg}%
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics.progressAvg}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Control Bar: View Switcher, Filter & Action Buttons */}
      <Card className="border-border">
        <CardContent className="p-3 flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 w-full lg:w-auto bg-muted/40 p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('wbs')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'wbs'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> WBS Phase Breakdown
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'gantt'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Interactive Gantt Timeline
            </button>
            <button
              onClick={() => setViewMode('employees')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'employees'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Team & Resource Mapping
            </button>
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-end">
            {/* Assignee Filter */}
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="h-8 text-xs rounded-md bg-background border border-border px-2 text-foreground"
            >
              <option value="all">All Assignees</option>
              {employees.map(e => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
              <option value="Unassigned">Unassigned</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 text-xs rounded-md bg-background border border-border px-2 text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
            </select>

            <Button variant="outline" size="sm" onClick={loadData} className="h-8 text-xs" title="Reload schedule">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Import from BOQ Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBoqImport}
              className="h-8 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-semibold gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Import from BOQ
            </Button>

            {/* Add Custom Phase */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddPhaseModal(true)}
              className="h-8 text-xs hover:bg-muted font-medium"
            >
              + New Phase
            </Button>

            {/* Add Task Button */}
            <Button
              onClick={() => handleOpenAdd()}
              size="sm"
              className="h-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW 1: WBS PHASE BREAKDOWN (RDASH / IDESIGN PRO STYLE) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'wbs' && (
        <div className="space-y-3">
          {allWorkPackages.map(wp => {
            const phaseTasks = tasksByPhase[wp] || [];
            if (selectedWorkPackage !== 'all' && wp !== selectedWorkPackage) return null;
            if (phaseTasks.length === 0 && selectedStatus !== 'all') return null;

            const isCollapsed = collapsedPhases[wp];
            const phaseCompleted = phaseTasks.filter(t => t.status === 'Completed').length;
            const phaseTotal = phaseTasks.length;
            const phasePct = phaseTotal > 0 ? Math.round((phaseTasks.reduce((acc, cur) => acc + (cur.progress_pct || 0), 0) / phaseTotal)) : 0;
            const phaseOverdue = phaseTasks.filter(t => t.is_overdue).length;

            return (
              <Card key={wp} className="border-border overflow-hidden shadow-xs">
                {/* Phase Header Strip */}
                <div
                  onClick={() => togglePhaseCollapse(wp)}
                  className="p-3 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between gap-3 cursor-pointer select-none border-b border-border/60"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button className="text-muted-foreground p-0.5">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div>
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                        {wp}
                        <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 bg-background">
                          {phaseTotal} {phaseTotal === 1 ? 'task' : 'tasks'}
                        </Badge>
                        {phaseOverdue > 0 && (
                          <Badge className="text-[9px] bg-rose-500/20 text-rose-600 border-rose-500/30 font-semibold">
                            {phaseOverdue} Delayed
                          </Badge>
                        )}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Phase Progress Bar */}
                    <div className="hidden sm:flex items-center gap-2 w-36">
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            phasePct === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${phasePct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-foreground">{phasePct}%</span>
                    </div>

                    {/* Inline Add Task to Phase */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAdd(wp);
                      }}
                      className="h-7 px-2 text-[11px] hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Task
                    </Button>
                  </div>
                </div>

                {/* Phase Task Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    {phaseTasks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No tasks in this phase yet. Click <strong className="text-amber-600 cursor-pointer" onClick={() => handleOpenAdd(wp)}>+ Add Task</strong> to schedule activities.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader className="bg-muted/20">
                          <TableRow>
                            <TableHead className="w-20 text-[11px]">Task No</TableHead>
                            <TableHead className="text-[11px]">Activity & Scope</TableHead>
                            <TableHead className="text-[11px]">Site Assignee (Banda)</TableHead>
                            <TableHead className="text-[11px]">Planned Dates</TableHead>
                            <TableHead className="text-right text-[11px]">Qty / Scope</TableHead>
                            <TableHead className="w-28 text-center text-[11px]">Progress</TableHead>
                            <TableHead className="text-center text-[11px]">Status</TableHead>
                            <TableHead className="text-right text-[11px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {phaseTasks.map(t => {
                            const isAssigned = !!t.assigned_to_name;
                            return (
                              <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                                  {t.task_no}
                                </TableCell>
                                <TableCell>
                                  <div className="font-semibold text-xs text-foreground">{t.title}</div>
                                  {t.description && (
                                    <div className="text-[11px] text-muted-foreground line-clamp-1">{t.description}</div>
                                  )}
                                  {t.delay_reason && (
                                    <span className="text-[10px] text-rose-500 font-medium inline-block mt-0.5">
                                      ⚠️ {t.delay_reason}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                      isAssigned ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {t.assigned_to_name ? t.assigned_to_name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <span className={isAssigned ? 'font-medium text-foreground' : 'text-muted-foreground italic'}>
                                      {t.assigned_to_name || 'Unassigned'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <span>{t.planned_start_date}</span>
                                    <span>→</span>
                                    <span className={t.is_overdue ? 'text-rose-500 font-bold' : ''}>
                                      {t.planned_end_date}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-xs font-mono">
                                  {t.planned_qty ? (
                                    <span>
                                      {t.actual_qty || 0} / {t.planned_qty} {t.uom}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <div className="w-16 bg-muted/60 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          t.status === 'Completed' ? 'bg-emerald-500' : t.is_overdue ? 'bg-rose-500' : 'bg-amber-500'
                                        }`}
                                        style={{ width: `${t.progress_pct || 0}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-mono font-semibold">{t.progress_pct || 0}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    className={`text-[9px] ${
                                      t.status === 'Completed'
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : t.status === 'In Progress'
                                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                        : t.status === 'Blocked'
                                        ? 'bg-rose-500/15 text-rose-600'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {t.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => handleOpenProgress(t, e)}
                                      className="h-6 px-1.5 text-[10px] text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                      title="Update progress"
                                    >
                                      Progress
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => handleOpenEdit(t, e)}
                                      className="w-6 h-6 text-muted-foreground hover:text-foreground"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => handleDeleteTask(t, e)}
                                      className="w-6 h-6 text-rose-500 hover:text-rose-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW 2: INTERACTIVE GANTT TIMELINE (RDASH / IDESIGN PRO STYLE) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'gantt' && (
        <Card className="border-border overflow-hidden p-4">
          <div className="space-y-3">
            {/* Legend & Summary */}
            <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-foreground">Master Project Execution Timeline</span>
                <span className="text-muted-foreground">({tasks.length} Activities)</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> In Execution</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Completed</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Overdue</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-muted-foreground" /> Not Started</span>
              </div>
            </div>

            {/* Gantt Matrix Container */}
            <div className="overflow-x-auto border border-border rounded-lg bg-card">
              <div className="min-w-[850px]">
                {/* Header: Task Metadata on Left + Timeline Weeks on Right */}
                <div className="flex border-b border-border bg-muted/60 text-xs font-semibold text-muted-foreground">
                  <div className="w-[320px] p-2.5 border-r border-border shrink-0">
                    Activity & Assigned Resource
                  </div>
                  <div className="flex-1 relative flex">
                    {ganttMeta.weeks.map(w => (
                      <div key={w.time} className="flex-1 p-2.5 text-center border-r border-border/60 text-[10px] font-mono whitespace-nowrap">
                        {w.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-border/60 relative">
                  {/* Today Marker Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"
                    style={{ left: `calc(320px + (100% - 320px) * ${ganttMeta.todayLeftPct / 100})` }}
                  >
                    <span className="absolute -top-3 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-bold px-1 rounded-sm">
                      TODAY
                    </span>
                  </div>

                  {filteredTasks.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted-foreground">
                      No schedule activities found. Add tasks or import from BOQ to view Gantt timeline.
                    </div>
                  ) : (
                    filteredTasks.map(t => {
                      const startMs = new Date(t.planned_start_date).getTime();
                      const endMs = new Date(t.planned_end_date).getTime();
                      const totalSpanMs = ganttMeta.maxTime - ganttMeta.minTime;
                      
                      let leftPct = ((startMs - ganttMeta.minTime) / totalSpanMs) * 100;
                      let widthPct = Math.max(2, ((endMs - startMs + 86400000) / totalSpanMs) * 100);
                      leftPct = Math.min(95, Math.max(0, leftPct));
                      widthPct = Math.min(100 - leftPct, Math.max(2, widthPct));

                      const barColor = t.status === 'Completed'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : t.is_overdue
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : t.status === 'In Progress'
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-slate-600 hover:bg-slate-500';

                      return (
                        <div key={t.id} className="flex hover:bg-muted/20 transition-colors items-center group">
                          {/* Left Description Pane */}
                          <div className="w-[320px] p-2.5 border-r border-border shrink-0 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-foreground truncate">{t.title}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                                <span className="font-mono text-amber-600">{t.task_no}</span>
                                <span>•</span>
                                <span className="truncate">{t.assigned_to_name || 'Unassigned'}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[9px] shrink-0 font-mono">
                              {t.planned_start_date.slice(5)} → {t.planned_end_date.slice(5)}
                            </Badge>
                          </div>

                          {/* Right Gantt Bar Pane */}
                          <div className="flex-1 relative h-10 flex items-center px-2">
                            <div
                              onClick={(e) => handleOpenProgress(t, e)}
                              className={`absolute h-6 rounded-md shadow-xs cursor-pointer transition-all flex items-center px-2 text-[10px] text-white font-medium select-none overflow-hidden group/bar ${barColor}`}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`
                              }}
                              title={`${t.title} (${t.planned_start_date} to ${t.planned_end_date}) — ${t.progress_pct || 0}% Complete`}
                            >
                              {/* Progress Fill inside the Bar */}
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-black/20 pointer-events-none"
                                style={{ width: `${t.progress_pct || 0}%` }}
                              />
                              <span className="relative z-10 truncate font-mono text-[9px] drop-shadow-xs">
                                {t.progress_pct || 0}% {t.assigned_to_name ? `• ${t.assigned_to_name}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW 3: TEAM & RESOURCE MAPPING (BANDE MAP VIEW) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'employees' && (
        <div className="space-y-3">
          <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground flex items-center justify-between">
            <span>Workload & Execution allocation mapped per Site Engineer / Person.</span>
            <span className="font-semibold text-foreground">{employees.length} Mapped Team Members</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(new Set(tasks.map((t) => t.assigned_to_name || 'Unassigned'))).map((empName) => {
              const empTasks = tasks.filter((t) => (t.assigned_to_name || 'Unassigned') === empName);
              const overdueCount = empTasks.filter((t) => t.is_overdue).length;
              const completedCount = empTasks.filter((t) => t.status === 'Completed').length;
              const inProgressCount = empTasks.filter((t) => t.status === 'In Progress').length;
              const empCompletionPct = empTasks.length > 0 ? Math.round((completedCount / empTasks.length) * 100) : 0;

              return (
                <Card key={empName} className="border-border shadow-xs flex flex-col justify-between">
                  <CardHeader className="py-2.5 px-3.5 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {empName !== 'Unassigned' ? empName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-xs font-bold text-foreground truncate">
                          {empName}
                        </CardTitle>
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          {empTasks.length} {empTasks.length === 1 ? 'task' : 'tasks'} allocated
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {overdueCount > 0 ? (
                        <Badge className="text-[9px] bg-rose-500/20 text-rose-600 border-rose-500/30">
                          {overdueCount} Overdue
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-500/10">
                          On Track
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-3 space-y-2 flex-1">
                    {/* Workload Progress Bar */}
                    <div className="space-y-1 pb-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>Completion Rate</span>
                        <strong className="text-foreground">{empCompletionPct}%</strong>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${empCompletionPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Task Mini-List */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {empTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={(e) => handleOpenProgress(t, e)}
                          className="p-2 rounded border border-border bg-card/60 hover:border-amber-500/40 hover:bg-muted/20 transition-all text-xs flex justify-between items-center cursor-pointer"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-semibold text-[11px] text-foreground truncate">{t.title}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Due: <span className={t.is_overdue ? 'text-rose-500 font-bold' : ''}>{t.planned_end_date}</span>
                            </div>
                          </div>
                          <Badge
                            className={`text-[9px] shrink-0 font-mono ${
                              t.status === 'Completed'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : t.is_overdue
                                ? 'bg-rose-500/15 text-rose-600'
                                : 'bg-amber-500/15 text-amber-600'
                            }`}
                          >
                            {t.progress_pct || 0}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: IMPORT FROM PROJECT BOQ */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {boqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-500" />
                  Import Schedule Activities from Project BOQ
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Turn verified BOQ line items directly into planned execution tasks with quantities pre-filled.
                </p>
              </div>
              <button onClick={() => setBoqModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Default Settings for Import */}
            <div className="p-3 bg-muted/20 border-b border-border grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={boqImportDefaults.start_date}
                  onChange={(e) => setBoqImportDefaults(prev => ({ ...prev, start_date: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                  Default Duration (Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={boqImportDefaults.duration_days}
                  onChange={(e) => setBoqImportDefaults(prev => ({ ...prev, duration_days: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                  Assignee (Banda Map)
                </label>
                <select
                  value={boqImportDefaults.assigned_to_id}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const emp = employees.find(x => x.id === empId || x.employee_id === empId);
                    setBoqImportDefaults(prev => ({
                      ...prev,
                      assigned_to_id: empId,
                      assigned_to_name: emp?.name || ''
                    }));
                  }}
                  className="w-full h-8 text-xs rounded-md bg-background border border-border px-2 text-foreground"
                >
                  <option value="">Select Site Engineer</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Strip: Search & Section Dropdown */}
            <div className="p-2.5 bg-muted/10 border-b border-border flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={boqSearchTerm}
                  onChange={(e) => setBoqSearchTerm(e.target.value)}
                  placeholder="Search item specification or code..."
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={boqSectionFilter}
                  onChange={(e) => setBoqSectionFilter(e.target.value)}
                  className="h-8 text-xs rounded-md bg-background border border-border px-2 text-foreground flex-1 sm:w-52 truncate"
                >
                  <option value="all">All Sections ({boqItems.length} items)</option>
                  {boqSections.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selection List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[220px]">
              {loadingBoqItems ? (
                <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500" />
                  <p>Fetching BOQ items for {project}...</p>
                </div>
              ) : filteredBoqItems.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  {boqItems.length === 0 ? (
                    <div>
                      <p className="font-semibold text-foreground">No BOQ items found for {project}</p>
                      <p className="text-[11px] mt-1">Please ensure a BOQ is created with line items under the <strong>Project BOQ & Estimation</strong> tab.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-foreground">No matching items</p>
                      <p className="text-[11px] mt-1">No items match your filter "{boqSearchTerm || boqSectionFilter}".</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 text-xs border-b border-border text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Available BOQ Items ({filteredBoqItems.length} {filteredBoqItems.length !== boqItems.length ? `of ${boqItems.length}` : ''})
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const next = new Set(selectedBoqItemIds);
                          filteredBoqItems.forEach(b => next.add(b.id));
                          setSelectedBoqItemIds(next);
                        }}
                        className="text-amber-600 hover:underline text-xs font-medium"
                      >
                        Select All Filtered
                      </button>
                      <span className="text-border">•</span>
                      <button
                        onClick={() => {
                          const next = new Set(selectedBoqItemIds);
                          filteredBoqItems.forEach(b => next.delete(b.id));
                          setSelectedBoqItemIds(next);
                        }}
                        className="text-muted-foreground hover:underline text-xs font-medium"
                      >
                        Deselect Filtered
                      </button>
                    </div>
                  </div>

                  {filteredBoqItems.map(b => {
                    const isSelected = selectedBoqItemIds.has(b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          const next = new Set(selectedBoqItemIds);
                          if (next.has(b.id)) next.delete(b.id);
                          else next.add(b.id);
                          setSelectedBoqItemIds(next);
                        }}
                        className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 cursor-pointer text-xs ${
                          isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-card hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-border text-amber-600 focus:ring-amber-500"
                          />
                          <div className="min-w-0">
                            <span className="font-medium text-foreground block truncate">
                              {b.description || b.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                {b.section_name || 'General Fit-out'}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                • Qty: {b.quantity} {b.unit}
                              </span>
                              {b.selling_rate ? (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  • ₹{Number(b.selling_rate).toLocaleString('en-IN')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {b.quantity} {b.unit}
                        </Badge>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                {selectedBoqItemIds.size} of {boqItems.length} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setBoqModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={importingBoq || selectedBoqItemIds.size === 0}
                  onClick={handleImportBoqItems}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
                >
                  {importingBoq ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Create {selectedBoqItemIds.size} Schedule Tasks
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: ADD / EDIT SCHEDULE TASK (LIVE DURATION & BANDE MAPPING) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                {editingTask ? `Edit Schedule Activity: ${editingTask.task_no}` : 'Schedule New Activity'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-5 space-y-3.5">
              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Activity Title / Scope *</label>
                <Input
                  required
                  placeholder="e.g. 2nd Floor Gypsum Ceiling Framing & Grid Fixing"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {/* Work Package / Phase & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phase / Work Package *</label>
                  <select
                    value={taskForm.work_package}
                    onChange={(e) => setTaskForm({ ...taskForm, work_package: e.target.value })}
                    className="w-full h-9 text-xs rounded-md bg-background border border-border px-2.5 text-foreground"
                  >
                    {allWorkPackages.map((wp) => (
                      <option key={wp} value={wp}>
                        {wp}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full h-9 text-xs rounded-md bg-background border border-border px-2.5 text-foreground"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical (Immediate Milestone)</option>
                  </select>
                </div>
              </div>

              {/* Bande Mapping (Site Assignee & Supervisor) */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border border-border rounded-lg">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                    Assignee (Banda Map)
                  </label>
                  <select
                    value={taskForm.assigned_to_id}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = employees.find((x) => x.employee_id === empId || String(x.id) === empId);
                      setTaskForm({
                        ...taskForm,
                        assigned_to_id: empId,
                        assigned_to_name: emp?.name || '',
                        accountable_owner_id: taskForm.accountable_owner_id || empId,
                        accountable_owner_name: taskForm.accountable_owner_name || emp?.name || ''
                      });
                    }}
                    className="w-full h-9 text-xs rounded-md bg-background border border-border px-2 text-foreground font-medium"
                  >
                    <option value="">Select Site Engineer / Supervisor</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                        {emp.name} ({emp.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Accountable PM / Lead</label>
                  <Input
                    placeholder="Approver / PM Name"
                    value={taskForm.accountable_owner_name}
                    onChange={(e) => setTaskForm({ ...taskForm, accountable_owner_name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Dates & Duration Auto-Calculator */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/20 border border-border rounded-lg">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Planned Start Date *</label>
                  <Input
                    type="date"
                    required
                    value={taskForm.planned_start_date}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Duration (Days)</label>
                  <Input
                    type="number"
                    min="1"
                    value={taskForm.duration_days}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="h-9 text-xs font-mono font-bold text-amber-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Planned End Date *</label>
                  <Input
                    type="date"
                    required
                    value={taskForm.planned_end_date}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Quantities & Scope */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Planned Qty</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taskForm.planned_qty}
                    onChange={(e) => setTaskForm({ ...taskForm, planned_qty: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">UOM</label>
                  <Input
                    placeholder="Sqft / Nos / Rft"
                    value={taskForm.uom}
                    onChange={(e) => setTaskForm({ ...taskForm, uom: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Initial Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full h-9 text-xs rounded-md bg-background border border-border px-2 text-foreground"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
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
                  className="h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  {editingTask ? 'Save Changes' : 'Create Activity'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: QUICK PROGRESS UPDATE (DPR & SITE EXECUTION) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {progressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Update Execution Progress
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {progressTask?.task_no} • {progressTask?.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProgressModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="p-5 space-y-4">
              {/* Progress Slider */}
              <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-lg">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground">Completion Progress</span>
                  <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                    {quickProgress.progressPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={quickProgress.progressPct}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuickProgress(prev => ({
                      ...prev,
                      progressPct: val,
                      isCompleted: val === 100
                    }));
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Executed Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Executed Quantity ({progressTask?.uom})</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickProgress.executedQty}
                  onChange={(e) => setQuickProgress(prev => ({ ...prev, executedQty: e.target.value }))}
                  placeholder={`Planned: ${progressTask?.planned_qty || 0}`}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Site Delay or Blockers */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Site Delay Reason / Blocker (Optional)</label>
                <textarea
                  rows={2}
                  value={quickProgress.delayReason}
                  onChange={(e) => setQuickProgress(prev => ({ ...prev, delayReason: e.target.value }))}
                  placeholder="e.g. Material delivery delayed from vendor, floor not cleared by civil..."
                  className="w-full text-xs p-2 bg-background border border-border rounded-md text-foreground focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProgressModalOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Confirm Progress Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: CREATE CUSTOM PHASE */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showAddPhaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Create Custom Execution Phase</h3>
              <button onClick={() => setShowAddPhaseModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCustomPhase} className="space-y-3">
              <Input
                autoFocus
                required
                placeholder="e.g. Acoustic & Cinema Room Works"
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                className="text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddPhaseModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  Add Phase
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
