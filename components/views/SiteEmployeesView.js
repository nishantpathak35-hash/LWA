'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import { 
  Card, CardHeader, CardTitle, CardContent, 
  Button, Input, Select, Badge, Dialog, 
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell 
} from '../ui/core';
import { 
  Users, HardHat, MapPin, Calendar, Clock, CheckCircle2, 
  AlertTriangle, XCircle, Search, Download, Filter, Eye, 
  Camera, ArrowRightLeft, ShieldCheck, RefreshCw, Plus, 
  Building2, ExternalLink, ShieldAlert, FileText, Check, X, Settings
} from 'lucide-react';

export default function SiteEmployeesView() {
  const { user, projects: rawProjects, callRpc, setActiveView } = useAppState();

  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'employees' | 'geofence' | 'corrections'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const [kpis, setKpis] = useState({
    totalAssigned: 0,
    presentToday: 0,
    absentToday: 0,
    currentlyCheckedIn: 0,
    pendingPunchOuts: 0,
    lateArrivals: 0,
    flaggedPunches: 0
  });
  const [registerRecords, setRegisterRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [regularisations, setRegularisations] = useState([]);

  // Modals
  const [selfieModalData, setSelfieModalData] = useState(null);
  const [mapModalData, setMapModalData] = useState(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState(null);
  const [geofenceModalOpen, setGeofenceModalOpen] = useState(false);
  const [geofenceFormData, setGeofenceFormData] = useState({
    project: '',
    site_address: '',
    latitude: '',
    longitude: '',
    radius_meters: 200,
    is_mandatory: 1
  });
  const [reviewModalData, setReviewModalData] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Project list
  const projectList = useMemo(() => {
    const set = new Set();
    if (Array.isArray(rawProjects)) {
      rawProjects.forEach(p => {
        const name = typeof p === 'string' ? p : p?.project || p?.name;
        if (name) set.add(name);
      });
    }
    return Array.from(set).sort();
  }, [rawProjects]);

  // Load KPIs & Register
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, regRes] = await Promise.all([
        callRpc('getManagementAttendanceKPIs', { date: selectedDate, project: selectedProject || undefined }),
        callRpc('getDailyAttendanceRegister', {
          date: selectedDate,
          project: selectedProject || undefined,
          status: selectedStatus || undefined,
          search: searchTerm || undefined
        })
      ]);
      if (kpiRes) setKpis(kpiRes);
      if (Array.isArray(regRes)) setRegisterRecords(regRes);
    } catch (err) {
      console.error('Failed to load attendance dashboard:', err);
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [callRpc, selectedDate, selectedProject, selectedStatus, searchTerm]);

  // Load Employees Tab Data
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callRpc('listSiteEmployees', {
        project: selectedProject || undefined,
        search: searchTerm || undefined
      });
      if (Array.isArray(res)) setEmployees(res);
    } catch (err) {
      console.error('Failed to load site employees:', err);
    } finally {
      setLoading(false);
    }
  }, [callRpc, selectedProject, searchTerm]);

  // Load Regularisations Tab Data
  const loadRegularisations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callRpc('listAttendanceRegularisations', {
        project: selectedProject || undefined
      });
      if (Array.isArray(res)) setRegularisations(res);
    } catch (err) {
      console.error('Failed to load regularisations:', err);
    } finally {
      setLoading(false);
    }
  }, [callRpc, selectedProject]);

  useEffect(() => {
    if (activeTab === 'register') {
      loadDashboardData();
    } else if (activeTab === 'employees') {
      loadEmployees();
    } else if (activeTab === 'corrections') {
      loadRegularisations();
    }
  }, [activeTab, loadDashboardData, loadEmployees, loadRegularisations]);

  // Handle Export CSV
  const handleExportCSV = () => {
    if (registerRecords.length === 0) return;
    const headers = ['Employee ID', 'Name', 'Project', 'Date', 'Punch In', 'Punch Out', 'Working Hours', 'Geo Status', 'Status', 'Flag Reason'];
    const rows = registerRecords.map(r => [
      `"${r.employee_id || ''}"`,
      `"${r.employee_name || ''}"`,
      `"${r.project || ''}"`,
      `"${r.date || ''}"`,
      `"${r.punch_in_time ? new Date(r.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}"`,
      `"${r.punch_out_time ? new Date(r.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}"`,
      r.total_hours || 0,
      `"${r.punch_in_geo_status || ''}"`,
      `"${r.status || ''}"`,
      `"${r.flag_reason || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Site_Attendance_${selectedDate}_${selectedProject || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save / Update Employee
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: formData.get('employee_id'),
      name: formData.get('name'),
      designation: formData.get('designation'),
      department: formData.get('department') || 'Site Operations',
      phone: formData.get('phone'),
      email: formData.get('email') || '',
      reporting_manager: formData.get('reporting_manager') || '',
      status: formData.get('status') || 'active',
      primary_project: formData.get('primary_project') || ''
    };

    try {
      await callRpc('createOrUpdateSiteEmployee', data);
      setEmployeeModalOpen(false);
      setEditingEmployee(null);
      loadEmployees();
      loadDashboardData();
    } catch (err) {
      alert('Error saving employee: ' + err.message);
    }
  };

  // Handle Transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: transferData.employee_id,
      new_project: formData.get('new_project'),
      role_at_site: formData.get('role_at_site') || transferData.designation,
      transfer_date: formData.get('transfer_date') || new Date().toISOString().split('T')[0],
      reason: formData.get('reason') || ''
    };

    try {
      await callRpc('transferEmployeeProject', data);
      setTransferModalOpen(false);
      setTransferData(null);
      loadEmployees();
      loadDashboardData();
    } catch (err) {
      alert('Error transferring employee: ' + err.message);
    }
  };

  // Save Geofence
  const handleSaveGeofence = async (e) => {
    e.preventDefault();
    try {
      await callRpc('saveSiteGeofence', geofenceFormData);
      setGeofenceModalOpen(false);
      alert('Geofence configured successfully!');
    } catch (err) {
      alert('Error saving geofence: ' + err.message);
    }
  };

  // Review Regularisation
  const handleReviewRegularisation = async (decision) => {
    if (!reviewModalData) return;
    try {
      await callRpc('reviewAttendanceRegularisation', {
        id: reviewModalData.id,
        decision,
        review_notes: reviewNotes
      });
      setReviewModalData(null);
      setReviewNotes('');
      loadRegularisations();
      loadDashboardData();
    } catch (err) {
      alert('Error updating regularisation: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <HardHat className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-display">
              Site Workforce &amp; Attendance
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time site employee deployment, geo-tagged mobile punching &amp; selfie verification
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === 'register') loadDashboardData();
              else if (activeTab === 'employees') loadEmployees();
              else loadRegularisations();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView('settings')}
            className="text-xs font-semibold"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Users & Access in Settings
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setGeofenceModalOpen(true)}
          >
            <MapPin className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Configure Geofence
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setEditingEmployee(null);
              setEmployeeModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Assigned Total</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">{kpis.totalAssigned}</span>
              <Users className="w-4 h-4 text-muted-foreground/60" />
            </div>
            <span className="text-[10px] text-muted-foreground">Active workforce</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Present Today</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{kpis.presentToday}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
            </div>
            <span className="text-[10px] text-muted-foreground">Punched in</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Absent Today</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{kpis.absentToday}</span>
              <XCircle className="w-4 h-4 text-rose-500/70" />
            </div>
            <span className="text-[10px] text-muted-foreground">Unreported shift</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Late Arrivals</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{kpis.lateArrivals}</span>
              <Clock className="w-4 h-4 text-amber-500/70" />
            </div>
            <span className="text-[10px] text-muted-foreground">After 09:30 AM</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">On-Site Now</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-primary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                {kpis.currentlyCheckedIn}
              </span>
              <Building2 className="w-4 h-4 text-primary/70" />
            </div>
            <span className="text-[10px] text-muted-foreground">Active on site</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Pending Out</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{kpis.pendingPunchOuts}</span>
              <AlertTriangle className="w-4 h-4 text-indigo-500/70" />
            </div>
            <span className="text-[10px] text-muted-foreground">Yet to punch out</span>
          </CardContent>
        </Card>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('register')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'register'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Daily Attendance Register
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'employees'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Workforce &amp; Allocations
        </button>

        <button
          onClick={() => setActiveTab('corrections')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'corrections'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Regularisation Requests
          {regularisations.filter(r => r.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {regularisations.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab 1: Daily Register ── */}
      {activeTab === 'register' && (
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="py-3 px-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Date Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-semibold">Date:</span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>

              {/* Project Filter */}
              <Select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="h-8 text-xs min-w-[160px]"
              >
                <option value="">All Projects</option>
                {projectList.map((p, i) => (
                  <option key={i} value={p}>{p}</option>
                ))}
              </Select>

              {/* Status Filter */}
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 text-xs min-w-[130px]"
              >
                <option value="">All Statuses</option>
                <option value="present">Present</option>
                <option value="half_day">Half Day</option>
                <option value="flagged">Flagged / Out of Site</option>
              </Select>

              {/* Search */}
              <div className="relative flex-1 min-w-[150px] max-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search employee / ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 text-xs"
                disabled={registerRecords.length === 0}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {registerRecords.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">No attendance records found for this date &amp; filters.</p>
                <p className="text-xs">Employees will appear here as soon as they punch in from mobile.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/40">
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Assigned Project</TableHead>
                      <TableHead className="text-xs">Punch In</TableHead>
                      <TableHead className="text-xs">Punch Out</TableHead>
                      <TableHead className="text-xs text-center">Working Hours</TableHead>
                      <TableHead className="text-xs">Location &amp; Geofence</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registerRecords.map((rec) => {
                      const isFlagged = rec.is_flagged || rec.punch_in_geo_status === 'outside_radius';
                      return (
                        <TableRow key={rec.id} className="border-b border-border/50 hover:bg-muted/30">
                          {/* Employee */}
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-border">
                                {rec.punch_in_selfie ? (
                                  <img src={rec.punch_in_selfie} alt="selfie" className="w-full h-full object-cover" />
                                ) : (
                                  rec.employee_name?.charAt(0) || 'E'
                                )}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-foreground block">{rec.employee_name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground block">{rec.employee_id}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Project */}
                          <TableCell className="text-xs font-medium text-foreground max-w-[180px] truncate">
                            <span className="flex items-center gap-1.5" title={rec.project}>
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {rec.project}
                            </span>
                          </TableCell>

                          {/* Punch In */}
                          <TableCell>
                            {rec.punch_in_time ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    {new Date(rec.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {rec.punch_in_selfie && (
                                    <button
                                      onClick={() => setSelfieModalData({
                                        title: `${rec.employee_name} - Punch In`,
                                        selfie: rec.punch_in_selfie,
                                        time: rec.punch_in_time,
                                        address: rec.punch_in_address,
                                        coords: `${rec.punch_in_latitude?.toFixed(5)}, ${rec.punch_in_longitude?.toFixed(5)} (±${rec.punch_in_accuracy || 10}m)`
                                      })}
                                      className="p-1 rounded bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                                      title="View In Selfie"
                                    >
                                      <Camera className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground block truncate max-w-[160px]" title={rec.punch_in_address}>
                                  {rec.punch_in_address || 'GPS Captured'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Punch Out */}
                          <TableCell>
                            {rec.punch_out_time ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    {new Date(rec.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {rec.punch_out_selfie && (
                                    <button
                                      onClick={() => setSelfieModalData({
                                        title: `${rec.employee_name} - Punch Out`,
                                        selfie: rec.punch_out_selfie,
                                        time: rec.punch_out_time,
                                        address: rec.punch_out_address,
                                        coords: `${rec.punch_out_latitude?.toFixed(5)}, ${rec.punch_out_longitude?.toFixed(5)}`
                                      })}
                                      className="p-1 rounded bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                                      title="View Out Selfie"
                                    >
                                      <Camera className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground block truncate max-w-[160px]" title={rec.punch_out_address}>
                                  {rec.punch_out_address || 'GPS Captured'}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                                In Progress
                              </Badge>
                            )}
                          </TableCell>

                          {/* Hours */}
                          <TableCell className="text-center font-mono text-xs font-bold text-foreground">
                            {rec.total_hours > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-muted">
                                {Math.floor(rec.total_hours)}h {Math.round((rec.total_hours % 1) * 60)}m
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Location & Geofence Status */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {isFlagged ? (
                                <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-500/30 flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Out of Site
                                </Badge>
                              ) : rec.punch_in_geo_status === 'low_accuracy' ? (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                                  Low Accuracy
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Within Radius
                                </Badge>
                              )}

                              {rec.punch_in_latitude != null && (
                                <button
                                  onClick={() => setMapModalData({
                                    lat: rec.punch_in_latitude,
                                    lng: rec.punch_in_longitude,
                                    address: rec.punch_in_address || rec.project,
                                    name: `${rec.employee_name} (Punch In)`,
                                    project: rec.project
                                  })}
                                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 ml-1 font-semibold"
                                  title="View Punch In GPS Map"
                                >
                                  <MapPin className="w-3 h-3 text-emerald-500" /> In Map
                                </button>
                              )}

                              {rec.punch_out_latitude != null && (
                                <button
                                  onClick={() => setMapModalData({
                                    lat: rec.punch_out_latitude,
                                    lng: rec.punch_out_longitude,
                                    address: rec.punch_out_address || rec.project,
                                    name: `${rec.employee_name} (Punch Out)`,
                                    project: rec.project
                                  })}
                                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 ml-1 font-semibold"
                                  title="View Punch Out GPS Map"
                                >
                                  <MapPin className="w-3 h-3 text-indigo-500" /> Out Map
                                </button>
                              )}
                            </div>
                            {rec.flag_reason && (
                              <span className="text-[10px] text-rose-500 block truncate max-w-[180px]" title={rec.flag_reason}>
                                {rec.flag_reason}
                              </span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge
                              variant={
                                rec.status === 'present' ? 'default' :
                                rec.status === 'half_day' ? 'outline' : 'secondary'
                              }
                              className="text-[10px] capitalize"
                            >
                              {rec.status || 'Present'}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px]"
                              onClick={() => setSelfieModalData({
                                title: `${rec.employee_name} (${rec.date})`,
                                employee_name: rec.employee_name,
                                project: rec.project,
                                date: rec.date,
                                selfie: rec.punch_in_selfie,
                                time: rec.punch_in_time,
                                inAddress: rec.punch_in_address,
                                inCoords: rec.punch_in_latitude != null ? `${rec.punch_in_latitude.toFixed(5)}, ${rec.punch_in_longitude.toFixed(5)}` : null,
                                inAccuracy: rec.punch_in_accuracy,
                                inLat: rec.punch_in_latitude,
                                inLng: rec.punch_in_longitude,
                                outSelfie: rec.punch_out_selfie,
                                outTime: rec.punch_out_time,
                                outAddress: rec.punch_out_address,
                                outCoords: rec.punch_out_latitude != null ? `${rec.punch_out_latitude.toFixed(5)}, ${rec.punch_out_longitude.toFixed(5)}` : null,
                                outAccuracy: rec.punch_out_accuracy,
                                outLat: rec.punch_out_latitude,
                                outLng: rec.punch_out_longitude,
                                hours: rec.total_hours,
                                status: rec.status,
                                flagReason: rec.flag_reason
                              })}
                            >
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 2: Workforce & Allocations ── */}
      {activeTab === 'employees' && (
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="py-3 px-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                Site Employees Directory ({employees.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {employees.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">No site employees added yet.</p>
                <Button size="sm" onClick={() => setEmployeeModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add First Employee
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/40">
                      <TableHead className="text-xs">Employee ID</TableHead>
                      <TableHead className="text-xs">Name &amp; Designation</TableHead>
                      <TableHead className="text-xs">Contact</TableHead>
                      <TableHead className="text-xs">Current Project Allocation</TableHead>
                      <TableHead className="text-xs">Deployment Status</TableHead>
                      <TableHead className="text-xs">Today&apos;s Attendance</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.employee_id} className="border-b border-border/50 hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          {emp.employee_id}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-foreground block">{emp.name}</span>
                            <span className="text-[11px] text-muted-foreground block">{emp.designation}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-foreground">
                          {emp.phone}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          {emp.current_project ? (
                            <div className="space-y-0.5">
                              <span className="flex items-center gap-1.5 font-bold text-foreground">
                                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                {emp.current_project}
                              </span>
                              <span className="text-[10px] text-muted-foreground">Since {emp.allocation_start_date || 'Day 1'}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={emp.status === 'active' ? 'default' : 'outline'}
                            className="text-[10px] capitalize"
                          >
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              emp.today_status === 'checked_in' || emp.today_status === 'completed'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-[10px] capitalize"
                          >
                            {emp.today_status === 'checked_in' ? 'On Site' : emp.today_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px]"
                              onClick={() => {
                                setTransferData(emp);
                                setTransferModalOpen(true);
                              }}
                              title="Transfer to another project"
                            >
                              <ArrowRightLeft className="w-3 h-3 mr-1" /> Transfer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px]"
                              onClick={() => {
                                setEditingEmployee(emp);
                                setEmployeeModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 3: Attendance Regularisation Requests ── */}
      {activeTab === 'corrections' && (
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="py-3 px-5 border-b border-border">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Attendance Regularisation &amp; Disputed Punches ({regularisations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {regularisations.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/40" />
                <p className="text-sm font-medium">All clear! No pending regularisation requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/40">
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Project</TableHead>
                      <TableHead className="text-xs">Target Date</TableHead>
                      <TableHead className="text-xs">Proposed Times</TableHead>
                      <TableHead className="text-xs">Reason Provided</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regularisations.map((reg) => (
                      <TableRow key={reg.id} className="border-b border-border/50 hover:bg-muted/30">
                        <TableCell>
                          <span className="text-xs font-bold text-foreground block">{reg.employee_name || reg.employee_id}</span>
                          <span className="text-[10px] text-muted-foreground block">{reg.designation || reg.phone}</span>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{reg.project}</TableCell>
                        <TableCell className="text-xs font-mono">{reg.date}</TableCell>
                        <TableCell className="text-xs font-mono">
                          In: {reg.proposed_punch_in ? new Date(reg.proposed_punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} |
                          Out: {reg.proposed_punch_out ? new Date(reg.proposed_punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate" title={reg.reason}>
                          {reg.reason}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              reg.status === 'approved' ? 'default' :
                              reg.status === 'rejected' ? 'destructive' : 'outline'
                            }
                            className="text-[10px] capitalize"
                          >
                            {reg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {reg.status === 'pending' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setReviewModalData(reg);
                                setReviewNotes('');
                              }}
                            >
                              Review &amp; Approve
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {reg.reviewed_by ? `By ${reg.reviewed_by.split('@')[0]}` : 'Resolved'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Modal: Selfie Preview ── */}
      {selfieModalData && (
        <Dialog
          open={Boolean(selfieModalData)}
          onClose={() => setSelfieModalData(null)}
          title={selfieModalData.title || 'Attendance Verification Details'}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selfieModalData.selfie && (
                <div className="space-y-1.5 text-center">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Check-In Selfie</span>
                  <div className="w-full h-52 rounded-xl bg-muted overflow-hidden border border-border shadow-xs">
                    <img src={selfieModalData.selfie} alt="Punch In Selfie" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground block">
                    {selfieModalData.time ? new Date(selfieModalData.time).toLocaleString() : ''}
                  </span>
                </div>
              )}

              {selfieModalData.outSelfie && (
                <div className="space-y-1.5 text-center">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Check-Out Selfie</span>
                  <div className="w-full h-52 rounded-xl bg-muted overflow-hidden border border-border shadow-xs">
                    <img src={selfieModalData.outSelfie} alt="Punch Out Selfie" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground block">
                    {selfieModalData.outTime ? new Date(selfieModalData.outTime).toLocaleString() : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {/* Check-In Geo Data */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Check-In Location
                  </span>
                  {selfieModalData.inLat != null && (
                    <button
                      type="button"
                      onClick={() => setMapModalData({
                        lat: selfieModalData.inLat,
                        lng: selfieModalData.inLng,
                        address: selfieModalData.inAddress || selfieModalData.project,
                        name: `${selfieModalData.employee_name} (Punch In)`,
                        project: selfieModalData.project
                      })}
                      className="text-primary hover:underline font-semibold flex items-center gap-0.5 cursor-pointer text-[11px]"
                    >
                      Open Map
                    </button>
                  )}
                </div>
                <p className="text-foreground font-medium leading-relaxed">
                  {selfieModalData.inAddress || selfieModalData.address || 'GPS Coordinates Recorded'}
                </p>
                {(selfieModalData.inCoords || selfieModalData.coords) && (
                  <div className="text-[11px] font-mono text-muted-foreground">
                    Coords: {selfieModalData.inCoords || selfieModalData.coords}
                    {selfieModalData.inAccuracy != null && ` • Precision: ±${selfieModalData.inAccuracy}m`}
                  </div>
                )}
              </div>

              {/* Check-Out Geo Data */}
              {selfieModalData.outTime && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Check-Out Location
                    </span>
                    {selfieModalData.outLat != null && (
                      <button
                        type="button"
                        onClick={() => setMapModalData({
                          lat: selfieModalData.outLat,
                          lng: selfieModalData.outLng,
                          address: selfieModalData.outAddress || selfieModalData.project,
                          name: `${selfieModalData.employee_name} (Punch Out)`,
                          project: selfieModalData.project
                        })}
                        className="text-primary hover:underline font-semibold flex items-center gap-0.5 cursor-pointer text-[11px]"
                      >
                        Open Map
                      </button>
                    )}
                  </div>
                  <p className="text-foreground font-medium leading-relaxed">
                    {selfieModalData.outAddress || 'GPS Coordinates Recorded'}
                  </p>
                  {selfieModalData.outCoords && (
                    <div className="text-[11px] font-mono text-muted-foreground">
                      Coords: {selfieModalData.outCoords}
                      {selfieModalData.outAccuracy != null && ` • Precision: ±${selfieModalData.outAccuracy}m`}
                    </div>
                  )}
                </div>
              )}

              {/* Duration & Status */}
              <div className="p-3 bg-muted/20 rounded-xl border border-border space-y-1">
                {selfieModalData.hours > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Total Duration:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selfieModalData.hours} Hours</span>
                  </div>
                )}
                {selfieModalData.flagReason && (
                  <div className="flex justify-between text-rose-500 font-semibold">
                    <span>Exception Note:</span>
                    <span>{selfieModalData.flagReason}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelfieModalData(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── Modal: Map Location Preview ── */}
      {mapModalData && (
        <Dialog
          open={Boolean(mapModalData)}
          onClose={() => setMapModalData(null)}
          title={`Punch Location: ${mapModalData.name}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
              <p><strong>Project:</strong> {mapModalData.project}</p>
              <p><strong>Coordinates:</strong> {mapModalData.lat}, {mapModalData.lng}</p>
              {mapModalData.address && <p><strong>Address:</strong> {mapModalData.address}</p>}
            </div>

            {/* OpenStreetMap iframe embed for accurate zero-API-key map rendering */}
            <div className="w-full h-72 rounded-xl overflow-hidden border border-border">
              <iframe
                title="Punch Location Map"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapModalData.lng - 0.005}%2C${mapModalData.lat - 0.005}%2C${mapModalData.lng + 0.005}%2C${mapModalData.lat + 0.005}&layer=mapnik&marker=${mapModalData.lat}%2C${mapModalData.lng}`}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={`https://www.google.com/maps?q=${mapModalData.lat},${mapModalData.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
              </a>
              <Button variant="outline" size="sm" onClick={() => setMapModalData(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── Modal: Add / Edit Employee ── */}
      {employeeModalOpen && (
        <Dialog
          open={employeeModalOpen}
          onClose={() => {
            setEmployeeModalOpen(false);
            setEditingEmployee(null);
          }}
          title={editingEmployee ? `Edit Employee: ${editingEmployee.name}` : 'Add New Site Employee'}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Employee ID *</label>
                <Input
                  name="employee_id"
                  defaultValue={editingEmployee?.employee_id || `EMP-${Math.floor(100 + Math.random() * 900)}`}
                  required
                  readOnly={Boolean(editingEmployee)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Full Name *</label>
                <Input
                  name="name"
                  defaultValue={editingEmployee?.name || ''}
                  placeholder="e.g. Rahul Verma"
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Designation *</label>
                <Input
                  name="designation"
                  defaultValue={editingEmployee?.designation || ''}
                  placeholder="e.g. Site Supervisor"
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Contact Phone *</label>
                <Input
                  name="phone"
                  defaultValue={editingEmployee?.phone || ''}
                  placeholder="+91 98765 43210"
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Work Email</label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={editingEmployee?.email || ''}
                  placeholder="rahul@company.com"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Assigned Project</label>
                <Select
                  name="primary_project"
                  defaultValue={editingEmployee?.current_project || ''}
                  className="text-xs"
                >
                  <option value="">Select Project</option>
                  {projectList.map((p, i) => (
                    <option key={i} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Reporting Manager</label>
                <Input
                  name="reporting_manager"
                  defaultValue={editingEmployee?.reporting_manager || ''}
                  placeholder="Project Director / PM"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Status</label>
                <Select
                  name="status"
                  defaultValue={editingEmployee?.status || 'active'}
                  className="text-xs"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmployeeModalOpen(false);
                  setEditingEmployee(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Employee
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ── Modal: Transfer Employee ── */}
      {transferModalOpen && transferData && (
        <Dialog
          open={transferModalOpen}
          onClose={() => {
            setTransferModalOpen(false);
            setTransferData(null);
          }}
          title={`Transfer Project: ${transferData.name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
              <p><strong>Employee:</strong> {transferData.name} ({transferData.employee_id})</p>
              <p><strong>Current Site:</strong> {transferData.current_project || 'None'}</p>
              <p className="text-[11px] text-muted-foreground">Historical attendance records will remain linked to previous sites.</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">New Project Site *</label>
              <Select name="new_project" required className="text-xs">
                <option value="">Select Target Project</option>
                {projectList.filter(p => p !== transferData.current_project).map((p, i) => (
                  <option key={i} value={p}>{p}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Role at New Site</label>
              <Input
                name="role_at_site"
                defaultValue={transferData.designation || 'Site Supervisor'}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Effective Transfer Date</label>
              <Input
                type="date"
                name="transfer_date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Reason for Reassignment</label>
              <Input
                name="reason"
                placeholder="e.g. Phase mobilization, expertise transfer"
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Confirm Transfer
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ── Modal: Geofence Configuration ── */}
      {geofenceModalOpen && (
        <Dialog
          open={geofenceModalOpen}
          onClose={() => setGeofenceModalOpen(false)}
          title="Configure Site Geofence &amp; GPS Radius"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveGeofence} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Project Master *</label>
              <Select
                value={geofenceFormData.project}
                onChange={async (e) => {
                  const proj = e.target.value;
                  setGeofenceFormData(prev => ({ ...prev, project: proj }));
                  if (proj) {
                    try {
                      const geo = await callRpc('getSiteGeofence', proj);
                      if (geo) {
                        setGeofenceFormData({
                          project: proj,
                          site_address: geo.site_address || '',
                          latitude: String(geo.latitude || ''),
                          longitude: String(geo.longitude || ''),
                          radius_meters: geo.radius_meters || 200,
                          is_mandatory: geo.is_mandatory ?? 1
                        });
                      }
                    } catch (err) {}
                  }
                }}
                required
                className="text-xs"
              >
                <option value="">Select Project</option>
                {projectList.map((p, i) => (
                  <option key={i} value={p}>{p}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Site Physical Address</label>
              <Input
                value={geofenceFormData.site_address}
                onChange={(e) => setGeofenceFormData({ ...geofenceFormData, site_address: e.target.value })}
                placeholder="e.g. DLF Cyber City, Tower B, Gurugram"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Latitude *</label>
                <Input
                  type="number"
                  step="any"
                  value={geofenceFormData.latitude}
                  onChange={(e) => setGeofenceFormData({ ...geofenceFormData, latitude: e.target.value })}
                  placeholder="28.4900"
                  required
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Longitude *</label>
                <Input
                  type="number"
                  step="any"
                  value={geofenceFormData.longitude}
                  onChange={(e) => setGeofenceFormData({ ...geofenceFormData, longitude: e.target.value })}
                  placeholder="77.0900"
                  required
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase mb-1">
                <span>Allowed Punch Radius</span>
                <span className="text-primary font-mono">{geofenceFormData.radius_meters} Metres</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={geofenceFormData.radius_meters}
                onChange={(e) => setGeofenceFormData({ ...geofenceFormData, radius_meters: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={Boolean(geofenceFormData.is_mandatory)}
                onChange={(e) => setGeofenceFormData({ ...geofenceFormData, is_mandatory: e.target.checked ? 1 : 0 })}
                className="accent-primary"
              />
              <span>Strict Geofence (Block punches outside radius)</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setGeofenceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Geofence
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ── Modal: Regularisation Review ── */}
      {reviewModalData && (
        <Dialog
          open={Boolean(reviewModalData)}
          onClose={() => setReviewModalData(null)}
          title="Review Regularisation Request"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1.5">
              <p><strong>Employee:</strong> {reviewModalData.employee_name || reviewModalData.employee_id}</p>
              <p><strong>Project:</strong> {reviewModalData.project}</p>
              <p><strong>Date:</strong> {reviewModalData.date}</p>
              <p><strong>Reason:</strong> {reviewModalData.reason}</p>
              <p className="font-mono text-emerald-600 dark:text-emerald-400">
                Proposed: {reviewModalData.proposed_punch_in ? new Date(reviewModalData.proposed_punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} → {reviewModalData.proposed_punch_out ? new Date(reviewModalData.proposed_punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">Review Notes / Reason</label>
              <Input
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Verified with Project Manager on site"
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleReviewRegularisation('rejected')}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Reject Request
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setReviewModalData(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => handleReviewRegularisation('approved')}
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Approve &amp; Update
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
