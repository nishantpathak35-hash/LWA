'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from '../../ui/core';
import { UserCheck, AlertTriangle, CheckCircle2, Clock, Calendar, RefreshCw, ChevronRight, X, Briefcase, ShieldAlert, ArrowUpRight, BarChart3, Users } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function TaskPerformanceDashboard() {
  const { call, user } = useAppState();
  const [activeTab, setActiveTab] = useState('management'); // 'management' | 'my_tasks' | 'pm'
  const [loading, setLoading] = useState(false);

  // Management State
  const [mgmtData, setMgmtData] = useState(null);
  const [selectedEmployeeDrilldown, setSelectedEmployeeDrilldown] = useState(null);

  // My Tasks State
  const [myTaskData, setMyTaskData] = useState(null);

  // PM State
  const [selectedProject, setSelectedProject] = useState('');
  const [projectsList, setProjectsList] = useState([]);
  const [pmData, setPmData] = useState(null);

  // Load Dashboards
  const loadManagementDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call('getManagementTaskDashboard');
      setMgmtData(data);
    } catch (err) {
      toast.error('Failed to load management task matrix: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  const loadMyTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call('getEmployeeTaskDashboard');
      setMyTaskData(data);
    } catch (err) {
      toast.error('Failed to load your personal task dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  const loadPmDashboard = useCallback(async (proj) => {
    if (!proj) return;
    setLoading(true);
    try {
      const data = await call('getProjectManagerTaskDashboard', proj);
      setPmData(data);
    } catch (err) {
      toast.error('Failed to load PM task dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    loadManagementDashboard();
    loadMyTasks();

    // Fetch projects for PM filter
    call('getMasterData', 'projects')
      .then((res) => {
        const projs = Array.isArray(res) ? res : res?.projects || [];
        setProjectsList(projs);
        if (projs.length > 0 && !selectedProject) {
          const first = projs[0]?.project || projs[0]?.name || projs[0];
          setSelectedProject(first);
          loadPmDashboard(first);
        }
      })
      .catch(() => {});
  }, [loadManagementDashboard, loadMyTasks, loadPmDashboard, call]);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('management')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'management'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Executive Matrix (All Employees)
          </button>
          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my_tasks'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> My Task Center
          </button>
          <button
            onClick={() => setActiveTab('pm')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pm'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Project PM Tracking
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeTab === 'management') loadManagementDashboard();
            else if (activeTab === 'my_tasks') loadMyTasks();
            else loadPmDashboard(selectedProject);
          }}
          className="h-8 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* ── View 1: Management Executive Matrix ── */}
      {activeTab === 'management' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card border-border p-4 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Active Staff Tracking
              </span>
              <div className="text-2xl font-black text-foreground">
                {mgmtData?.summary?.totalEmployees || 0}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Site workforce members</span>
            </Card>

            <Card className="bg-card border-border p-4 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Total Tasks Assigned
              </span>
              <div className="text-2xl font-black text-amber-500">
                {mgmtData?.summary?.totalTasksAssigned || 0}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Across all active projects</span>
            </Card>

            <Card className="bg-card border-border p-4 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                System-Wide Overdue Tasks
              </span>
              <div className="text-2xl font-black text-rose-500">
                {mgmtData?.summary?.totalOverdueTasks || 0}
              </div>
              <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block">
                {mgmtData?.summary?.totalOverdueTasks > 0 ? 'Requires Immediate Action' : 'All Tasks On Schedule'}
              </span>
            </Card>

            <Card className="bg-card border-border p-4 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                DPR Pending Count Today
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {mgmtData?.summary?.pendingDprEmployeesCount || 0}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Allocated staff without DPR</span>
            </Card>
          </div>

          {/* Matrix Table */}
          <Card className="border-border overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                Employee-wise Task Performance & Overdue Matrix
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Employee Name</TableHead>
                    <TableHead className="text-xs font-semibold">Role / Designation</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Assigned Tasks</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Completed</TableHead>
                    <TableHead className="text-center text-xs font-semibold">In Progress</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Overdue</TableHead>
                    <TableHead className="text-center text-xs font-semibold">DPR Status Today</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !mgmtData ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                        Loading employee performance matrix...
                      </TableCell>
                    </TableRow>
                  ) : mgmtData?.matrix?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground">
                        No employees found with active project allocations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mgmtData?.matrix?.map((row) => (
                      <TableRow key={row.employee_id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-semibold text-xs text-foreground">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.designation || 'Site Staff'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-bold">
                          {row.assigned}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-emerald-500 font-bold">
                          {row.completed}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-amber-500 font-bold">
                          {row.inProgress}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.overdue > 0 ? (
                            <Badge className="bg-rose-500/15 text-rose-500 font-bold text-[10px]">
                              {row.overdue} Overdue
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.has_dpr_today ? (
                            <Badge className="bg-emerald-500/15 text-emerald-500 text-[10px] flex items-center gap-1 mx-auto w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Submitted
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-500 text-[10px] flex items-center gap-1 mx-auto w-fit">
                              <Clock className="w-3 h-3" /> Pending DPR
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedEmployeeDrilldown(row)}
                            className="h-7 text-[10px] text-amber-600 dark:text-amber-400 font-semibold"
                          >
                            Drill Down <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ── View 2: My Task Center (Employee) ── */}
      {activeTab === 'my_tasks' && (
        <div className="space-y-6">
          {/* Status banner */}
          <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Welcome, {myTaskData?.employeeName || user?.email}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have {myTaskData?.summary?.assignedCount || 0} active assigned tasks and {myTaskData?.summary?.overdueCount || 0} overdue items.
              </p>
            </div>
            {myTaskData?.hasDprToday ? (
              <Badge className="bg-emerald-500/15 text-emerald-500 text-xs py-1 px-3">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Today's DPR Logged
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-500 text-xs py-1 px-3">
                <Clock className="w-3.5 h-3.5 mr-1" /> DPR Pending for Today
              </Badge>
            )}
          </div>

          {/* Overdue alert card */}
          {myTaskData?.overdueTasks?.length > 0 && (
            <Card className="border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-500 text-xs font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>OVERDUE TASKS REQUIRING ATTENTION ({myTaskData.overdueTasks.length})</span>
              </div>
              <div className="space-y-2">
                {myTaskData.overdueTasks.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-rose-500/20 bg-background text-xs flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-foreground">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Project: {t.project} | Due date: <span className="text-rose-500 font-mono font-bold">{t.planned_end_date}</span> ({t.overdue_days} days overdue)
                      </div>
                    </div>
                    <Badge className="bg-rose-500/15 text-rose-500 text-[10px]">
                      {t.progress_pct}% Done
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Active Tasks List */}
          <Card className="border-border">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                My Active Tasks Queue ({myTaskData?.activeTasks?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {myTaskData?.activeTasks?.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No active tasks assigned to your profile right now.
                </p>
              ) : (
                myTaskData?.activeTasks?.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-border bg-background flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-foreground">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {t.project} • {t.work_package} • Planned End: {t.planned_end_date}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${t.progress_pct}%` }} />
                      </div>
                      <span className="font-mono font-bold text-foreground">{t.progress_pct}%</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── View 3: PM Project Tracking ── */}
      {activeTab === 'pm' && (
        <div className="space-y-6">
          {/* Project selector */}
          <div className="flex items-center gap-3 bg-card border border-border p-3 rounded-xl">
            <label className="text-xs font-semibold text-foreground">Select Project:</label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                loadPmDashboard(e.target.value);
              }}
              className="h-8 text-xs rounded-md bg-background border border-border px-3 text-foreground font-semibold"
            >
              {projectsList.map((p) => {
                const name = p?.project || p?.name || p;
                return (
                  <option key={name} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* PM Project KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card border-border p-4 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Project Total Tasks
              </span>
              <div className="text-2xl font-black text-foreground">
                {pmData?.summary?.totalTasks || 0}
              </div>
            </Card>

            <Card className="bg-card border-border p-4 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Completed
              </span>
              <div className="text-2xl font-black text-emerald-500">
                {pmData?.summary?.completedTasks || 0}
              </div>
            </Card>

            <Card className="bg-card border-border p-4 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Overdue Tasks
              </span>
              <div className="text-2xl font-black text-rose-500">
                {pmData?.summary?.overdueTasksCount || 0}
              </div>
            </Card>

            <Card className="bg-card border-border p-4 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Overall Progress
              </span>
              <div className="text-2xl font-black text-amber-500">
                {pmData?.summary?.completionPct || 0}%
              </div>
            </Card>
          </div>

          {/* Employee Breakdown */}
          <Card className="border-border overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                Assigned Team Task Breakdown for {selectedProject}
              </CardTitle>
            </CardHeader>
            <div className="p-4 space-y-2">
              {pmData?.employeePerformance?.map((ep) => (
                <div key={ep.name} className="p-3 rounded-lg border border-border bg-background flex items-center justify-between text-xs">
                  <div className="font-semibold text-foreground">{ep.name}</div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span>Assigned: <strong>{ep.assigned}</strong></span>
                    <span className="text-emerald-500">Done: <strong>{ep.completed}</strong></span>
                    <span className="text-amber-500">In Progress: <strong>{ep.inProgress}</strong></span>
                    {ep.overdue > 0 && <span className="text-rose-500 font-bold">Overdue: {ep.overdue}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Drill-Down Modal */}
      <Dialog open={!!selectedEmployeeDrilldown} onOpenChange={() => setSelectedEmployeeDrilldown(null)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Employee Task Audit: {selectedEmployeeDrilldown?.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedEmployeeDrilldown(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-4 gap-2 bg-muted/40 p-3 rounded-lg text-center text-xs">
                <div>Assigned: <strong>{selectedEmployeeDrilldown?.assigned}</strong></div>
                <div className="text-emerald-500">Completed: <strong>{selectedEmployeeDrilldown?.completed}</strong></div>
                <div className="text-amber-500">In Progress: <strong>{selectedEmployeeDrilldown?.inProgress}</strong></div>
                <div className="text-rose-500">Overdue: <strong>{selectedEmployeeDrilldown?.overdue}</strong></div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Detailed Task Assignments ({selectedEmployeeDrilldown?.tasks?.length || 0})
                </h3>
                {selectedEmployeeDrilldown?.tasks?.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-border bg-background space-y-1.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-foreground">{t.title}</div>
                      <Badge
                        className={`text-[9px] ${
                          t.status === 'Completed'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : t.is_overdue
                            ? 'bg-rose-500/15 text-rose-500'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono flex justify-between">
                      <span>Project: {t.project} | Package: {t.work_package}</span>
                      <span>Planned: {t.planned_start_date} → {t.planned_end_date}</span>
                    </div>
                    {t.delay_reason && (
                      <div className="text-[10px] text-rose-500 font-medium">
                        Delay Reason: {t.delay_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
