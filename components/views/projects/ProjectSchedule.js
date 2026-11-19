'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../../ui/core';
import { Calendar, Clock, CheckCircle2, AlertTriangle, AlertCircle, Plus, Edit2, Trash2, Filter, Layers, Users, BarChart2, RefreshCw, X, ChevronRight, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

const WORK_PACKAGES = [
  'General',
  'Civil & Demolition',
  'Carpentry & Joinery',
  'False Ceiling & Partition',
  'Flooring & Tiling',
  'Electrical & Lighting',
  'HVAC & Ventilation',
  'Plumbing & Sanitary',
  'Painting & Finishing',
  'Testing & Handover'
];

export default function ProjectSchedule({ project }) {
  const { call } = useAppState();
  const [schedule, setSchedule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'gantt' | 'calendar' | 'employees'
  const [selectedWorkPackage, setSelectedWorkPackage] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal State
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

  const initialTaskForm = {
    title: '',
    description: '',
    work_package: 'General',
    boq_item_id: '',
    boq_section_id: '',
    assigned_to_id: '',
    assigned_to_name: '',
    accountable_owner_id: '',
    accountable_owner_name: '',
    planned_start_date: new Date().toISOString().split('T')[0],
    planned_end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
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

  // Load Schedule and Tasks
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
          combinedEmps.push({ id: e.employee_id || e.id, name: e.name, designation: e.designation || 'Site Team' });
        }
      });
      (userRes || []).forEach(u => {
        if (u.name && !seen.has(u.name.toLowerCase())) {
          seen.add(u.name.toLowerCase());
          combinedEmps.push({ id: u.email, name: u.name, designation: (u.roles || []).join(', ') || 'Team Member' });
        }
      });
      setEmployees(combinedEmps);

      // Also try fetching BOQ items for linkage
      try {
        const boqRes = await call('getBoqItemsForPoImport', project);
        setBoqItems(boqRes?.items || []);
      } catch (err) {
        // BOQ items optional
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

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedWorkPackage !== 'all' && t.work_package !== selectedWorkPackage) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      return true;
    });
  }, [tasks, selectedWorkPackage, selectedStatus]);

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

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingTask(null);
    setTaskForm({
      ...initialTaskForm,
      planned_start_date: new Date().toISOString().split('T')[0],
      planned_end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (t, e) => {
    if (e) e.stopPropagation();
    setEditingTask(t);
    setTaskForm({
      id: t.id,
      title: t.title || '',
      description: t.description || '',
      work_package: t.work_package || 'General',
      boq_item_id: t.boq_item_id || '',
      boq_section_id: t.boq_section_id || '',
      assigned_to_id: t.assigned_to_id || '',
      assigned_to_name: t.assigned_to_name || '',
      accountable_owner_id: t.accountable_owner_id || '',
      accountable_owner_name: t.accountable_owner_name || '',
      planned_start_date: t.planned_start_date || '',
      planned_end_date: t.planned_end_date || '',
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
    if (!taskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    if (!taskForm.planned_start_date || !taskForm.planned_end_date) {
      toast.error('Planned Start and End dates are required');
      return;
    }

    setSaving(true);
    try {
      await call('saveScheduleTask', {
        ...taskForm,
        project,
        id: editingTask ? editingTask.id : undefined
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
      toast.success('Task removed from schedule');
      loadData();
    } catch (err) {
      toast.error('Failed to delete task: ' + err.message);
    }
  };

  const handleSeedStandardSchedule = async () => {
    if (!project) return;
    if (tasks.length > 0) {
      if (!confirm('This will append the standard 7-phase interior fit-out schedule milestones to this project. Continue?')) return;
    }
    setSaving(true);
    try {
      const today = new Date();
      const standardTasks = [
        { title: 'Site Mobilization & Demolition Works', work_package: 'Civil & Demolition', days: 7, priority: 'High', uom: 'Lot', planned_qty: 1 },
        { title: 'Electrical Conduit & Wiring Rough-in', work_package: 'Electrical & Lighting', days: 10, priority: 'High', uom: 'Rft', planned_qty: 500 },
        { title: 'False Ceiling Grid & Gypsum Framing', work_package: 'False Ceiling & Partition', days: 14, priority: 'High', uom: 'Sqft', planned_qty: 1200 },
        { title: 'Flooring, Screed & Tiling Work', work_package: 'Flooring & Tiling', days: 14, priority: 'Medium', uom: 'Sqft', planned_qty: 1200 },
        { title: 'Wall Panelling, Doors & Fixed Carpentry', work_package: 'Carpentry & Joinery', days: 14, priority: 'High', uom: 'Sqft', planned_qty: 800 },
        { title: 'Primer Coat, Putty & Final Paint Work', work_package: 'Painting & Finishing', days: 10, priority: 'Medium', uom: 'Sqft', planned_qty: 2500 },
        { title: 'Light Fixtures, Switches & Handover Snagging', work_package: 'Testing & Handover', days: 5, priority: 'Critical', uom: 'Lot', planned_qty: 1 }
      ];

      let currentDate = new Date(today);
      for (const t of standardTasks) {
        const startStr = currentDate.toISOString().split('T')[0];
        const endDate = new Date(currentDate.getTime() + t.days * 86400000);
        const endStr = endDate.toISOString().split('T')[0];
        await call('saveScheduleTask', {
          project,
          title: t.title,
          work_package: t.work_package,
          planned_start_date: startStr,
          planned_end_date: endStr,
          priority: t.priority,
          uom: t.uom,
          planned_qty: t.planned_qty,
          status: 'Not Started'
        });
        currentDate = new Date(endDate.getTime() + 86400000);
      }

      toast.success('Standard interior fit-out schedule generated with 7 sequenced phases!');
      loadData();
    } catch (err) {
      toast.error('Failed to generate template schedule: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Quick Progress Modal Handlers
  const handleOpenProgress = (t, e) => {
    if (e) e.stopPropagation();
    setProgressTask(t);
    setQuickProgress({
      progressPct: t.progress_pct || 0,
      executedQty: 0,
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
        blockers: quickProgress.blockers,
        dprId: 'MANUAL_SUPERVISOR_CHECK'
      });
      toast.success('Progress updated successfully');
      setProgressModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to update progress: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Header Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card border-border p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Total Tasks
          </span>
          <div className="text-2xl font-black text-foreground">{metrics.total}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {metrics.notStarted} Not Started
          </span>
        </Card>

        <Card className="bg-card border-border p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            In Progress
          </span>
          <div className="text-2xl font-black text-amber-500">{metrics.inProgress}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Active work packages</span>
        </Card>

        <Card className="bg-card border-border p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Completed Tasks
          </span>
          <div className="text-2xl font-black text-emerald-500">{metrics.completed}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}% Task Closure
          </span>
        </Card>

        <Card className="bg-card border-border p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Delayed / Overdue
          </span>
          <div className="text-2xl font-black text-rose-500">{metrics.overdue}</div>
          <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block">
            {metrics.overdue > 0 ? 'Requires PM Action' : 'All on track'}
          </span>
        </Card>

        <Card className="bg-card border-border p-3.5 shadow-xs col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Overall Schedule Progress
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

      {/* Control Bar: View Switcher, Filters, and Add Task */}
      <Card className="border-border">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* View Mode Buttons */}
          <div className="flex items-center gap-1.5 w-full md:w-auto bg-muted/40 p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Task List
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'gantt'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Timeline / Gantt
            </button>
            <button
              onClick={() => setViewMode('employees')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'employees'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> By Assignee
            </button>
          </div>

          {/* Filters & Action */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end">
            <select
              value={selectedWorkPackage}
              onChange={(e) => setSelectedWorkPackage(e.target.value)}
              className="h-8 text-xs rounded-md bg-background border border-border px-2.5 text-foreground"
            >
              <option value="all">All Work Packages</option>
              {WORK_PACKAGES.map((wp) => (
                <option key={wp} value={wp}>
                  {wp}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 text-xs rounded-md bg-background border border-border px-2.5 text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
            </select>

            <Button variant="outline" size="sm" onClick={loadData} className="h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedStandardSchedule}
              disabled={saving}
              className="h-8 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 font-semibold"
              title="Auto-generate 7-phase standard fit-out schedule milestones"
            >
              ⚡ Template Schedule
            </Button>

            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="h-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Renderers */}
      {viewMode === 'list' && (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-24 text-xs font-semibold">Task No</TableHead>
                  <TableHead className="text-xs font-semibold">Task Title & Work Package</TableHead>
                  <TableHead className="text-xs font-semibold">Assigned Employee</TableHead>
                  <TableHead className="text-xs font-semibold">Planned Dates</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Qty (UOM)</TableHead>
                  <TableHead className="w-32 text-center text-xs font-semibold">Progress</TableHead>
                  <TableHead className="text-center text-xs font-semibold">Status & Health</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Loading schedule tasks...
                    </TableCell>
                  </TableRow>
                ) : filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="max-w-md mx-auto space-y-3">
                        <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                        <div className="text-sm font-bold text-foreground">No Schedule Tasks Found</div>
                        <p className="text-xs text-muted-foreground">
                          Create custom milestones or click below to generate the standard 7-phase interior fit-out schedule (Demolition, Electrical, False Ceiling, Flooring, Carpentry, Painting, Testing).
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <Button onClick={handleSeedStandardSchedule} disabled={saving} className="h-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5">
                            ⚡ Auto-Generate Fit-out Schedule
                          </Button>
                          <Button variant="outline" onClick={handleOpenAdd} className="h-8 text-xs">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Task
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {t.task_no}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{t.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] bg-muted/60">
                            {t.work_package || 'General'}
                          </Badge>
                          {t.priority === 'Critical' && (
                            <Badge className="text-[9px] bg-rose-500/15 text-rose-500 border-rose-500/20">
                              Critical
                            </Badge>
                          )}
                          {t.delay_reason && (
                            <span className="text-[10px] text-rose-500 font-medium truncate max-w-xs">
                              ⚠️ {t.delay_reason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {t.assigned_to_name || <span className="text-muted-foreground italic">Unassigned</span>}
                        </div>
                        {t.accountable_owner_name && t.accountable_owner_name !== t.assigned_to_name && (
                          <div className="text-[10px] text-muted-foreground">
                            Owner: {t.accountable_owner_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        <div>{t.planned_start_date}</div>
                        <div className={t.is_overdue ? 'text-rose-500 font-bold' : ''}>
                          to {t.planned_end_date}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        <div className="font-semibold text-foreground">
                          {t.actual_qty || 0} / {t.planned_qty || 0}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{t.uom || 'Nos'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="font-bold text-foreground">{t.progress_pct || 0}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                t.status === 'Completed'
                                  ? 'bg-emerald-500'
                                  : t.is_overdue
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${t.progress_pct || 0}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <Badge
                            className={`text-[10px] ${
                              t.status === 'Completed'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : t.status === 'In Progress'
                                ? 'bg-amber-500/15 text-amber-500'
                                : t.status === 'Blocked'
                                ? 'bg-rose-500/15 text-rose-500'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {t.status}
                          </Badge>
                          {t.is_overdue && (
                            <span className="text-[9px] text-rose-500 font-bold">
                              {t.overdue_days}d Overdue
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleOpenProgress(t, e)}
                            className="h-7 px-2 text-[10px] text-amber-600 dark:text-amber-400 font-semibold"
                            title="Update Task Progress & DPR Status"
                          >
                            Progress
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => handleOpenEdit(t, e)}
                            className="w-7 h-7 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => handleDeleteTask(t, e)}
                            className="w-7 h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Gantt / Timeline View */}
      {viewMode === 'gantt' && (
        <Card className="border-border p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
              <span className="font-semibold text-foreground">Timeline Gantt Execution</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> In Progress</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Completed</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500" /> Overdue</span>
              </div>
            </div>

            <div className="space-y-3">
              {filteredTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-lg border border-border bg-card/60 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{t.task_no}</span>
                      <span className="font-semibold text-foreground">{t.title}</span>
                      <Badge variant="outline" className="text-[9px]">{t.work_package}</Badge>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                      <span>{t.planned_start_date} → {t.planned_end_date}</span>
                      <strong className="text-foreground">{t.progress_pct || 0}%</strong>
                    </div>
                  </div>
                  {/* Gantt Bar */}
                  <div className="w-full bg-muted/60 rounded-full h-3 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        t.status === 'Completed'
                          ? 'bg-emerald-500'
                          : t.is_overdue
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(5, t.progress_pct || 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Grouped by Assignee View */}
      {viewMode === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from(new Set(tasks.map((t) => t.assigned_to_name || 'Unassigned'))).map((empName) => {
            const empTasks = tasks.filter((t) => (t.assigned_to_name || 'Unassigned') === empName);
            const overdueCount = empTasks.filter((t) => t.is_overdue).length;
            const completedCount = empTasks.filter((t) => t.status === 'Completed').length;

            return (
              <Card key={empName} className="border-border">
                <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    <CardTitle className="text-xs font-bold text-foreground">
                      {empName}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {empTasks.length} Tasks
                    </Badge>
                    {overdueCount > 0 && (
                      <Badge className="text-[10px] bg-rose-500/15 text-rose-500">
                        {overdueCount} Overdue
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {empTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded border border-border bg-background text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-foreground">{t.title}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Due: {t.planned_end_date}
                        </div>
                      </div>
                      <Badge
                        className={`text-[9px] ${
                          t.status === 'Completed'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : t.is_overdue
                            ? 'bg-rose-500/15 text-rose-500'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}
                      >
                        {t.progress_pct}%
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                {editingTask ? `Edit Task ${editingTask.task_no}` : 'Schedule New Task'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Task Title *</label>
                <Input
                  required
                  placeholder="e.g. 2nd Floor Gypsum False Ceiling Framework"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Work Package *</label>
                  <select
                    value={taskForm.work_package}
                    onChange={(e) => setTaskForm({ ...taskForm, work_package: e.target.value })}
                    className="w-full h-9 text-xs rounded-md bg-background border border-border px-3 text-foreground"
                  >
                    {WORK_PACKAGES.map((wp) => (
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
                    className="w-full h-9 text-xs rounded-md bg-background border border-border px-3 text-foreground"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* BOQ Item Linkage */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Link to BOQ Item (Optional)</label>
                <select
                  value={taskForm.boq_item_id}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const selItem = boqItems.find((b) => b.id === selId);
                    setTaskForm({
                      ...taskForm,
                      boq_item_id: selId,
                      uom: selItem?.unit || taskForm.uom,
                      planned_qty: selItem?.quantity || taskForm.planned_qty
                    });
                  }}
                  className="w-full h-9 text-xs rounded-md bg-background border border-border px-3 text-foreground"
                >
                  <option value="">No Direct BOQ Item Link</option>
                  {boqItems.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.item_code || 'BOQ'} - {b.description} ({b.quantity} {b.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Staff */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Assigned Employee</label>
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
                    className="w-full h-9 text-xs rounded-md bg-background border border-border px-3 text-foreground"
                  >
                    <option value="">Select Site Assignee</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                        {emp.name} ({emp.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Accountable Owner</label>
                  <Input
                    placeholder="Owner / Supervisor Name"
                    value={taskForm.accountable_owner_name}
                    onChange={(e) => setTaskForm({ ...taskForm, accountable_owner_name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Planned Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Planned Start Date *</label>
                  <Input
                    type="date"
                    required
                    value={taskForm.planned_start_date}
                    onChange={(e) => setTaskForm({ ...taskForm, planned_start_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Planned End Date *</label>
                  <Input
                    type="date"
                    required
                    value={taskForm.planned_end_date}
                    onChange={(e) => setTaskForm({ ...taskForm, planned_end_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Quantities */}
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
                  <label className="text-xs font-semibold text-foreground">Actual Qty</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taskForm.actual_qty}
                    onChange={(e) => setTaskForm({ ...taskForm, actual_qty: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">UOM</label>
                  <Input
                    placeholder="Nos / Sqft"
                    value={taskForm.uom}
                    onChange={(e) => setTaskForm({ ...taskForm, uom: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
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
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  {editingTask ? 'Save Task' : 'Create Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>

      {/* Quick Progress Modal */}
      <Dialog open={progressModalOpen} onOpenChange={setProgressModalOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Update Task Progress
              </h2>
              <button
                type="button"
                onClick={() => setProgressModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="p-6 space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-1 text-xs">
                <div className="font-semibold text-foreground">{progressTask?.title}</div>
                <div className="text-muted-foreground">
                  Task No: <span className="font-mono text-amber-500">{progressTask?.task_no}</span> | Planned: {progressTask?.planned_qty} {progressTask?.uom}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex justify-between">
                  <span>Overall Progress %</span>
                  <span className="font-mono text-amber-500 font-bold">{quickProgress.progressPct}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={quickProgress.progressPct}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setQuickProgress({
                      ...quickProgress,
                      progressPct: val,
                      isCompleted: val === 100
                    });
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Executed Qty (Today's Addition)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={quickProgress.executedQty}
                  onChange={(e) => setQuickProgress({ ...quickProgress, executedQty: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="taskCompleteCheckbox"
                  checked={quickProgress.isCompleted}
                  onChange={(e) =>
                    setQuickProgress({
                      ...quickProgress,
                      isCompleted: e.target.checked,
                      progressPct: e.target.checked ? 100 : quickProgress.progressPct
                    })
                  }
                  className="rounded border-border text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="taskCompleteCheckbox" className="text-xs font-semibold text-foreground cursor-pointer">
                  Mark this task as 100% Completed
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Delay Reason (If Delayed)</label>
                <Input
                  placeholder="e.g. Material delivery pending from vendor"
                  value={quickProgress.delayReason}
                  onChange={(e) => setQuickProgress({ ...quickProgress, delayReason: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Site Blockers</label>
                <Input
                  placeholder="e.g. Client inspection approval required"
                  value={quickProgress.blockers}
                  onChange={(e) => setQuickProgress({ ...quickProgress, blockers: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
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
                  className="h-9 text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Confirm Progress
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
