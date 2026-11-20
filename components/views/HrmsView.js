'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Select, Badge, Dialog, Textarea,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '../ui/core';
import {
  Users, HardHat, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle,
  FileSpreadsheet, ShieldCheck, Download, Plus, Search, Filter, Lock, Unlock,
  RefreshCw, Briefcase, ChevronRight, Eye, Edit3, Trash2, Check, Send,
  FileText, Bell, Award, UserPlus, UserMinus, Settings, TrendingUp, MapPin,
  Camera, AlertCircle, Sparkles, Building2, ExternalLink
} from 'lucide-react';
import { cn } from '../../app/lib/utils';
import { exportToCSV, exportToMultiSheetExcel, sortData } from '../../app/lib/exportUtils';
import SortableHeader from '../ui/SortableHeader';
import { isSuperAdmin } from '../../app/lib/config';

// 15 Submodules
const SUBMODULES = [
  { id: 'dashboard', label: 'HR Dashboard', icon: TrendingUp },
  { id: 'directory', label: 'Employee Directory', icon: Users },
  { id: 'allocation', label: 'Site & Project Allocation', icon: HardHat },
  { id: 'attendance', label: 'Attendance Management', icon: Clock },
  { id: 'live_tracking', label: 'Live Attendance & Tracking', icon: MapPin },
  { id: 'leave', label: 'Leave Management', icon: Calendar },
  { id: 'shifts', label: 'Shifts & Hours', icon: Briefcase },
  { id: 'holidays', label: 'Holidays & Offs', icon: Award },
  { id: 'approvals', label: 'Approvals Center', icon: CheckCircle2, badgeKey: 'approvals' },
  { id: 'documents', label: 'Employee Documents', icon: FileText },
  { id: 'policies', label: 'Policies & Announcements', icon: Bell },
  { id: 'onboarding_exit', label: 'Onboarding & Exit', icon: UserPlus },
  { id: 'analytics', label: 'Reports & Analytics', icon: Sparkles },
  { id: 'payroll_export', label: 'Payroll Attendance Export', icon: FileSpreadsheet },
  { id: 'settings', label: 'HRMS Settings', icon: Settings }
];

export default function HrmsView({ initialTab = 'dashboard' }) {
  const { user, projects: rawProjects, callRpc } = useAppState();

  const isHR = useMemo(() => {
    if (!user) return false;
    if (isSuperAdmin(user.email)) return true;
    const roles = user.roles || [];
    return roles.some(r => ['admin', 'director', 'hr', 'hr_admin', 'operations'].includes(r));
  }, [user]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Projects list
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

  // Standard Departments
  const departmentsList = [
    'Operations',
    'Site Operations',
    'Project Management',
    'Procurement',
    'Finance & Accounts',
    'Architecture & Design',
    'Quality & Safety',
    'MEP Engineering',
    'Billing & Estimation',
    'Human Resources & Admin'
  ];

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // Data States
  // -------------------------------------------------------------
  const [dashboardData, setDashboardData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [approvalsSummary, setApprovalsSummary] = useState({ leaves: [], regularisations: [], totalPending: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [hrmsSettings, setHrmsSettings] = useState({});
  const [payrollData, setPayrollData] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [payrollCutoffType, setPayrollCutoffType] = useState('calendar');

  // Modals
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    employee_id: '',
    name: '',
    designation: '',
    department: 'Site Operations',
    phone: '',
    email: '',
    reporting_manager: '',
    status: 'active',
    primary_project: '',
    joining_date: new Date().toISOString().split('T')[0],
    probation_months: 3,
    employment_type: 'full_time',
    blood_group: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    pan_no: '',
    aadhaar_no: '',
    shift_id: 1,
    weekly_off: 'Sunday',
    notice_period_days: 30
  });

  const [leaveReviewModalOpen, setLeaveReviewModalOpen] = useState(false);
  const [selectedLeaveReq, setSelectedLeaveReq] = useState(null);
  const [leaveReviewRemarks, setLeaveReviewRemarks] = useState('');

  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({
    employee_id: '',
    leave_type_code: 'CL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_half_day: false,
    half_day_type: 'first_half',
    reason: ''
  });

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftFormData, setShiftFormData] = useState({
    name: '',
    code: '',
    start_time: '09:30',
    end_time: '18:30',
    grace_minutes: 15,
    half_day_hours: 4.5,
    full_day_hours: 8.5,
    break_minutes: 60,
    is_overnight: false,
    is_default: false
  });

  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayFormData, setHolidayFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'national',
    location: 'All',
    description: ''
  });

  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '',
    category: 'announcement',
    content: '',
    target_dept: 'All',
    target_project: 'All',
    is_pinned: false
  });

  const [docUploadModalOpen, setDocUploadModalOpen] = useState(false);
  const [docFormData, setDocFormData] = useState({
    employee_id: '',
    doc_type: 'aadhaar',
    title: '',
    file_url: '',
    notes: ''
  });

  const [lifecycleModalOpen, setLifecycleModalOpen] = useState(false);
  const [lifecycleTarget, setLifecycleTarget] = useState(null);
  const [lifecycleAction, setLifecycleAction] = useState('confirm_probation');
  const [lifecycleNotes, setLifecycleNotes] = useState('');
  const [lifecycleDate, setLifecycleDate] = useState(new Date().toISOString().split('T')[0]);

  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [lockAction, setLockAction] = useState('lock');
  const [lockReason, setLockReason] = useState('');

  // -------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------
  const loadDashboard = useCallback(async () => {
    try {
      const res = await callRpc('getHrmsDashboardKPIs');
      if (res) setDashboardData(res);
    } catch (err) {
      console.error('Failed to load HR dashboard:', err);
    }
  }, [callRpc]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await callRpc('listHrmsEmployees', {
        search: searchQuery,
        department: deptFilter,
        status: statusFilter,
        project: projectFilter
      });
      if (Array.isArray(res)) setEmployees(res);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  }, [callRpc, searchQuery, deptFilter, statusFilter, projectFilter]);

  const loadAttendance = useCallback(async () => {
    try {
      const res = await callRpc('getDailyAttendanceRegister', {
        date: attendanceDate,
        project: projectFilter !== 'all' ? projectFilter : ''
      });
      if (Array.isArray(res)) setAttendanceRecords(res);
    } catch (err) {
      console.error('Failed to load daily attendance:', err);
    }
  }, [callRpc, attendanceDate, projectFilter]);

  const loadLeaveData = useCallback(async () => {
    try {
      const [types, reqs] = await Promise.all([
        callRpc('getLeaveTypes'),
        callRpc('listLeaveRequests', {})
      ]);
      if (Array.isArray(types)) setLeaveTypes(types);
      if (Array.isArray(reqs)) setLeaveRequests(reqs);
    } catch (err) {
      console.error('Failed to load leave data:', err);
    }
  }, [callRpc]);

  const loadShiftsAndHolidays = useCallback(async () => {
    try {
      const [sList, hList] = await Promise.all([
        callRpc('getHrmsShifts'),
        callRpc('getHrmsHolidays', { year: payrollYear })
      ]);
      if (Array.isArray(sList)) setShifts(sList);
      if (Array.isArray(hList)) setHolidays(hList);
    } catch (err) {
      console.error('Failed to load shifts/holidays:', err);
    }
  }, [callRpc, payrollYear]);

  const loadApprovals = useCallback(async () => {
    try {
      const res = await callRpc('getPendingApprovalsSummary');
      if (res) setApprovalsSummary(res);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    }
  }, [callRpc]);

  const loadAnnouncementsAndSettings = useCallback(async () => {
    try {
      const [ann, setts] = await Promise.all([
        callRpc('getHrmsAnnouncements'),
        callRpc('getHrmsSettings')
      ]);
      if (Array.isArray(ann)) setAnnouncements(ann);
      if (setts) setHrmsSettings(setts);
    } catch (err) {
      console.error('Failed to load announcements/settings:', err);
    }
  }, [callRpc]);

  const loadPayrollExport = useCallback(async () => {
    try {
      const res = await callRpc('getMonthlyPayrollAttendance', {
        month: payrollMonth,
        year: payrollYear,
        cutoff_type: payrollCutoffType,
        project: projectFilter,
        department: deptFilter
      });
      if (res) setPayrollData(res);
    } catch (err) {
      console.error('Failed to load payroll attendance:', err);
    }
  }, [callRpc, payrollMonth, payrollYear, payrollCutoffType, projectFilter, deptFilter]);

  // Master initial loader
  const refreshCurrentTab = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadDashboard(),
      loadEmployees(),
      loadApprovals()
    ]);

    if (activeTab === 'attendance' || activeTab === 'live_tracking') await loadAttendance();
    if (activeTab === 'leave') await loadLeaveData();
    if (activeTab === 'shifts' || activeTab === 'holidays') await loadShiftsAndHolidays();
    if (activeTab === 'policies' || activeTab === 'settings') await loadAnnouncementsAndSettings();
    if (activeTab === 'payroll_export') await loadPayrollExport();

    setLoading(false);
  }, [activeTab, loadDashboard, loadEmployees, loadApprovals, loadAttendance, loadLeaveData, loadShiftsAndHolidays, loadAnnouncementsAndSettings, loadPayrollExport]);

  useEffect(() => {
    refreshCurrentTab();
  }, [refreshCurrentTab]);

  // -------------------------------------------------------------
  // Employee Actions
  // -------------------------------------------------------------
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeFormData({
      employee_id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      designation: 'Site Engineer',
      department: 'Site Operations',
      phone: '',
      email: '',
      reporting_manager: user?.email || '',
      status: 'active',
      primary_project: projectList[0] || '',
      joining_date: new Date().toISOString().split('T')[0],
      probation_months: 3,
      employment_type: 'full_time',
      blood_group: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      bank_name: '',
      bank_account_no: '',
      bank_ifsc: '',
      pan_no: '',
      aadhaar_no: '',
      shift_id: shifts[0]?.id || 1,
      weekly_off: 'Sunday',
      notice_period_days: 30
    });
    setEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmployeeFormData({
      employee_id: emp.employee_id,
      name: emp.name,
      designation: emp.designation || '',
      department: emp.department || 'Operations',
      phone: emp.phone || '',
      email: emp.email || '',
      reporting_manager: emp.reporting_manager || '',
      status: emp.status || 'active',
      primary_project: emp.primary_project || '',
      joining_date: emp.joining_date || '',
      probation_months: emp.probation_months || 3,
      employment_type: emp.employment_type || 'full_time',
      blood_group: emp.blood_group || '',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      bank_name: emp.bank_name || '',
      bank_account_no: emp.bank_account_no || '',
      bank_ifsc: emp.bank_ifsc || '',
      pan_no: emp.pan_no || '',
      aadhaar_no: emp.aadhaar_no || '',
      shift_id: emp.shift_id || 1,
      weekly_off: emp.weekly_off || 'Sunday',
      notice_period_days: emp.notice_period_days || 30
    });
    setEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      await callRpc('saveHrmsEmployee', employeeFormData);
      showToast(`Employee ${employeeFormData.name} saved successfully.`);
      setEmployeeModalOpen(false);
      loadEmployees();
      loadDashboard();
    } catch (err) {
      alert(`Failed to save employee: ${err.message}`);
    }
  };

  const handleOpenLifecycle = (emp, action) => {
    setLifecycleTarget(emp);
    setLifecycleAction(action);
    setLifecycleNotes('');
    setLifecycleDate(new Date().toISOString().split('T')[0]);
    setLifecycleModalOpen(true);
  };

  const handleSubmitLifecycle = async () => {
    if (!lifecycleTarget) return;
    try {
      await callRpc('updateEmployeeLifecycle', {
        employee_id: lifecycleTarget.employee_id,
        action: lifecycleAction,
        date: lifecycleDate,
        reason: lifecycleNotes,
        notes: lifecycleNotes,
        confirmation_date: lifecycleDate
      });
      showToast(`Lifecycle status updated for ${lifecycleTarget.name}.`);
      setLifecycleModalOpen(false);
      loadEmployees();
    } catch (err) {
      alert(`Lifecycle update failed: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // Leave Actions
  // -------------------------------------------------------------
  const handleOpenReviewLeave = (req) => {
    setSelectedLeaveReq(req);
    setLeaveReviewRemarks('');
    setLeaveReviewModalOpen(true);
  };

  const handleSubmitLeaveReview = async (action) => {
    if (!selectedLeaveReq) return;
    try {
      await callRpc('reviewLeaveRequest', {
        request_id: selectedLeaveReq.id,
        action,
        remarks: leaveReviewRemarks
      });
      showToast(`Leave request ${action}ed successfully.`);
      setLeaveReviewModalOpen(false);
      loadLeaveData();
      loadApprovals();
      loadDashboard();
    } catch (err) {
      alert(`Review failed: ${err.message}`);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await callRpc('applyLeave', leaveFormData);
      showToast('Leave request submitted successfully.');
      setApplyLeaveModalOpen(false);
      loadLeaveData();
      loadApprovals();
    } catch (err) {
      alert(`Application failed: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // Attendance Locking & Export Actions
  // -------------------------------------------------------------
  const handleTogglePayrollLock = async () => {
    try {
      await callRpc('lockMonthlyAttendance', {
        month: payrollMonth,
        year: payrollYear,
        action: lockAction,
        cutoff_type: payrollCutoffType,
        reason: lockReason,
        notes: lockReason
      });
      showToast(`Attendance for ${payrollMonth}/${payrollYear} ${lockAction}ed successfully.`);
      setLockConfirmOpen(false);
      loadPayrollExport();
    } catch (err) {
      alert(`Lock/Unlock action failed: ${err.message}`);
    }
  };

  const handleExportPayrollExcel = () => {
    if (!payrollData || !payrollData.summary || !payrollData.summary.length) {
      alert('No payroll attendance data available to export.');
      return;
    }

    const monthName = new Date(payrollYear, payrollMonth - 1).toLocaleString('default', { month: 'long' });
    const filename = `PTS_Payroll_Attendance_${monthName}_${payrollYear}`;

    // Sheet 1: Monthly Summary Master
    const summaryColumns = [
      { label: 'Employee ID', key: 'employee_id' },
      { label: 'Employee Name', key: 'name' },
      { label: 'Department', key: 'department' },
      { label: 'Designation', key: 'designation' },
      { label: 'Project / Site', key: 'project' },
      { label: 'Calendar Days', key: 'calendar_days' },
      { label: 'Eligible Days', key: 'eligible_days' },
      { label: 'Present Days', key: 'present_days' },
      { label: 'Half Days', key: 'half_days' },
      { label: 'Paid Leave', key: 'paid_leave_days' },
      { label: 'Unpaid Leave (LOP)', key: 'unpaid_leave_days' },
      { label: 'Weekly Offs', key: 'weekly_off_days' },
      { label: 'Paid Holidays', key: 'paid_holiday_days' },
      { label: 'Absent Days', key: 'absent_days' },
      { label: 'Late Arrivals', key: 'late_arrivals' },
      { label: 'Early Departures', key: 'early_departures' },
      { label: 'Overtime Hours', key: 'overtime_hours' },
      { label: 'PAYABLE DAYS', key: 'payable_days' },
      { label: 'Exceptions', key: 'exceptions_count' },
      { label: 'Bank Name', key: 'bank_name' },
      { label: 'Bank Account No', key: 'bank_account_no' },
      { label: 'Bank IFSC', key: 'bank_ifsc' },
      { label: 'PAN No', key: 'pan_no' }
    ];

    // Sheet 2: Daily Attendance Matrix
    const matrixColumns = [
      { label: 'Employee ID', key: 'employee_id' },
      { label: 'Employee Name', key: 'name' },
      { label: 'Department', key: 'department' },
      { label: 'Project', key: 'project' }
    ];
    (payrollData.dateList || []).forEach(dt => {
      const dayNum = dt.split('-')[2];
      matrixColumns.push({
        label: dayNum,
        key: `day_${dt}`,
        formatter: (val, row) => payrollData.dailyMatrix?.[row.employee_id]?.[dt]?.code || 'A'
      });
    });

    // Sheet 3: Overtime & Exceptions Log
    const exceptionColumns = [
      { label: 'Employee ID', key: 'employee_id' },
      { label: 'Name', key: 'name' },
      { label: 'Project', key: 'project' },
      { label: 'Late Arrivals', key: 'late_arrivals' },
      { label: 'Early Departures', key: 'early_departures' },
      { label: 'Overtime Hours', key: 'overtime_hours' },
      { label: 'Pending Exceptions', key: 'exceptions_count' }
    ];
    const exceptionRows = payrollData.summary.filter(r => r.overtime_hours > 0 || r.exceptions_count > 0 || r.late_arrivals > 0);

    const sheets = [
      {
        sheetName: 'Payroll Master Summary',
        columns: summaryColumns,
        rows: payrollData.summary
      },
      {
        sheetName: 'Daily Attendance Matrix',
        columns: matrixColumns,
        rows: payrollData.summary
      },
      {
        sheetName: 'Overtime & Exceptions',
        columns: exceptionColumns,
        rows: exceptionRows
      }
    ];

    exportToMultiSheetExcel(filename, sheets);
    showToast('Multi-sheet Payroll Attendance Excel generated.');
  };

  const handleExportPayrollCSV = () => {
    if (!payrollData || !payrollData.summary) return;
    const monthName = new Date(payrollYear, payrollMonth - 1).toLocaleString('default', { month: 'long' });
    const filename = `Payroll_Attendance_Summary_${monthName}_${payrollYear}.csv`;
    const summaryColumns = [
      { label: 'Employee ID', key: 'employee_id' },
      { label: 'Employee Name', key: 'name' },
      { label: 'Department', key: 'department' },
      { label: 'Designation', key: 'designation' },
      { label: 'Project', key: 'project' },
      { label: 'Calendar Days', key: 'calendar_days' },
      { label: 'Eligible Days', key: 'eligible_days' },
      { label: 'Present Days', key: 'present_days' },
      { label: 'Half Days', key: 'half_days' },
      { label: 'Paid Leave', key: 'paid_leave_days' },
      { label: 'Unpaid Leave (LOP)', key: 'unpaid_leave_days' },
      { label: 'Weekly Offs', key: 'weekly_off_days' },
      { label: 'Paid Holidays', key: 'paid_holiday_days' },
      { label: 'Absent Days', key: 'absent_days' },
      { label: 'Late Arrivals', key: 'late_arrivals' },
      { label: 'Early Departures', key: 'early_departures' },
      { label: 'Overtime Hours', key: 'overtime_hours' },
      { label: 'Payable Days', key: 'payable_days' },
      { label: 'Exceptions', key: 'exceptions_count' }
    ];
    exportToCSV(filename, summaryColumns, payrollData.summary);
  };

  // -------------------------------------------------------------
  // Filtered Lists
  // -------------------------------------------------------------
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = !searchQuery || 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.email && e.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.designation && e.designation.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchDept = deptFilter === 'all' || e.department === deptFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchProj = projectFilter === 'all' || e.primary_project === projectFilter;
      return matchSearch && matchDept && matchStatus && matchProj;
    });
  }, [employees, searchQuery, deptFilter, statusFilter, projectFilter]);

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
          toastMessage.type === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
        }`}>
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">HRMS & Workforce Management</h1>
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-xs font-semibold">
              Enterprise v2.0
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lifecycle, live site allocation, attendance verification, leave management & payroll-ready exports
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={refreshCurrentTab} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>

          {isHR && (
            <Button size="sm" onClick={handleOpenAddEmployee} className="gap-1.5 text-xs shadow-xs">
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Submodule Navigation Tabs */}
      <div className="border-b border-border bg-muted/30 px-6 py-2 overflow-x-auto scrollbar-none flex items-center gap-1.5">
        {SUBMODULES.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badgeCount = tab.badgeKey === 'approvals' ? approvalsSummary.totalPending : 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                isActive
                  ? 'bg-background text-foreground shadow-xs font-semibold border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span>{tab.label}</span>
              {badgeCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 1: HR DASHBOARD */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Workforce</span>
                  <div className="text-2xl font-bold mt-1 text-foreground">{dashboardData?.workforce?.total ?? 0}</div>
                  <span className="text-[11px] text-emerald-500 font-medium">
                    {dashboardData?.workforce?.active ?? 0} Active
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Present Today</span>
                  <div className="text-2xl font-bold mt-1 text-emerald-500">{dashboardData?.workforce?.presentToday ?? 0}</div>
                  <span className="text-[11px] text-muted-foreground">
                    +{dashboardData?.workforce?.halfDayToday ?? 0} Half-day
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Absent Today</span>
                  <div className="text-2xl font-bold mt-1 text-rose-500">{dashboardData?.workforce?.absentToday ?? 0}</div>
                  <span className="text-[11px] text-muted-foreground">Unscheduled</span>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">On Leave</span>
                  <div className="text-2xl font-bold mt-1 text-amber-500">{dashboardData?.workforce?.onLeaveToday ?? 0}</div>
                  <span className="text-[11px] text-muted-foreground">Approved Leaves</span>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Attendance Rate</span>
                  <div className="text-2xl font-bold mt-1 text-primary">{dashboardData?.workforce?.attendancePercentage ?? 0}%</div>
                  <span className="text-[11px] text-muted-foreground">Daily Compliance</span>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Missing Punch-out</span>
                  <div className="text-2xl font-bold mt-1 text-amber-400">{dashboardData?.workforce?.missingPunchOutToday ?? 0}</div>
                  <span className="text-[11px] text-muted-foreground">Active on site</span>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pending Approvals</span>
                  <div className="text-2xl font-bold mt-1 text-purple-400">{dashboardData?.pendingApprovals?.total ?? 0}</div>
                  <span className="text-[11px] text-muted-foreground">
                    {dashboardData?.pendingApprovals?.leave ?? 0} Leaves
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Pinned Announcements */}
            {dashboardData?.recentAnnouncements && dashboardData.recentAnnouncements.length > 0 && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Company Notice</span>
                    <span className="text-xs font-semibold text-foreground">{dashboardData.recentAnnouncements[0].title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {dashboardData.recentAnnouncements[0].content}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('policies')} className="text-xs text-primary">
                  View All Notices
                </Button>
              </div>
            )}

            {/* Site & Department Deployment Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Site Breakdown */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="p-5 border-b border-border flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-primary" />
                    Site-Wise Manpower Deployment
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('allocation')} className="text-xs">
                    Manage Allocation
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Project / Site</TableHead>
                        <TableHead className="text-xs text-right">Allocated</TableHead>
                        <TableHead className="text-xs text-right">Present Today</TableHead>
                        <TableHead className="text-xs text-right">Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!dashboardData?.siteBreakdown || dashboardData.siteBreakdown.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                            No site allocations found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        dashboardData.siteBreakdown.map((s, idx) => {
                          const pct = s.allocated > 0 ? Math.round((s.present / s.allocated) * 100) : 0;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-medium text-foreground">{s.project}</TableCell>
                              <TableCell className="text-xs text-right">{s.allocated}</TableCell>
                              <TableCell className="text-xs text-right text-emerald-500 font-semibold">{s.present}</TableCell>
                              <TableCell className="text-xs text-right">
                                <Badge variant="outline" className={cn(
                                  'text-[10px] font-bold',
                                  pct >= 80 ? 'text-emerald-500 border-emerald-500/30' : 'text-amber-500 border-amber-500/30'
                                )}>
                                  {pct}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Department Breakdown */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="p-5 border-b border-border flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Department Workforce Distribution
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('directory')} className="text-xs">
                    View Directory
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Department</TableHead>
                        <TableHead className="text-xs text-right">Headcount</TableHead>
                        <TableHead className="text-xs text-right">Share %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!dashboardData?.deptBreakdown || dashboardData.deptBreakdown.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                            No department data found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        dashboardData.deptBreakdown.map((d, idx) => {
                          const total = dashboardData.workforce?.active || 1;
                          const pct = Math.round((d.total_count / total) * 100);
                          return (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-medium text-foreground">{d.department}</TableCell>
                              <TableCell className="text-xs text-right font-semibold">{d.total_count}</TableCell>
                              <TableCell className="text-xs text-right text-muted-foreground">{pct}%</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 2: EMPLOYEE DIRECTORY */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-2 flex-1 max-w-3xl">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search by ID, name, email, designation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-9 text-xs w-40">
                  <option value="all">All Departments</option>
                  {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>

                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 text-xs w-32">
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="on_notice">On Notice</option>
                  <option value="inactive">Inactive</option>
                </Select>

                <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="h-9 text-xs w-36">
                  <option value="all">All Projects</option>
                  {projectList.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const cols = [
                      { label: 'Employee ID', key: 'employee_id' },
                      { label: 'Name', key: 'name' },
                      { label: 'Department', key: 'department' },
                      { label: 'Designation', key: 'designation' },
                      { label: 'Primary Project', key: 'primary_project' },
                      { label: 'Phone', key: 'phone' },
                      { label: 'Email', key: 'email' },
                      { label: 'Status', key: 'status' },
                      { label: 'Joining Date', key: 'joining_date' }
                    ];
                    exportToCSV('PTS_Employees_Directory.csv', cols, filteredEmployees);
                  }}
                  className="gap-1.5 text-xs h-9"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Employees Table */}
            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Department & Designation</TableHead>
                      <TableHead className="text-xs">Primary Site</TableHead>
                      <TableHead className="text-xs">Contact</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                          No employees match the selected criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map(emp => (
                        <TableRow key={emp.employee_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {emp.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-foreground">{emp.name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">{emp.employee_id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-medium text-foreground">{emp.designation || 'Staff'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.department || 'Operations'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-semibold border-border">
                              {emp.primary_project || 'General'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-foreground">{emp.phone || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.email || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              'text-[10px] font-bold capitalize',
                              emp.status === 'active' ? 'text-emerald-500 border-emerald-500/30' :
                              emp.status === 'on_leave' ? 'text-amber-500 border-amber-500/30' :
                              emp.status === 'on_notice' ? 'text-purple-500 border-purple-500/30' : 'text-slate-500 border-slate-500/30'
                            )}>
                              {emp.status || 'active'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isHR && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenEditEmployee(emp)} title="Edit Employee">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenLifecycle(emp, 'confirm_probation')} title="Probation / Exit Lifecycle">
                                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 3: SITE & PROJECT ALLOCATION */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'allocation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projectList.map(proj => {
                const count = employees.filter(e => e.primary_project === proj).length;
                return (
                  <Card key={proj} className="bg-card border-border shadow-xs">
                    <CardHeader className="p-4 border-b border-border flex items-center justify-between">
                      <CardTitle className="text-xs font-bold flex items-center gap-2">
                        <HardHat className="w-4 h-4 text-primary" />
                        {proj}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {count} Staff
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>Active Deployment</span>
                        <span className="font-semibold text-foreground">{count} Assigned</span>
                      </div>
                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setProjectFilter(proj);
                            setActiveTab('directory');
                          }}
                          className="text-xs text-primary"
                        >
                          View Personnel &rarr;
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 4: ATTENDANCE MANAGEMENT */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date:
                </span>
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="h-9 text-xs w-40"
                />

                <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="h-9 text-xs w-44">
                  <option value="all">All Projects</option>
                  {projectList.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const cols = [
                    { label: 'Date', key: 'date' },
                    { label: 'Employee ID', key: 'employee_id' },
                    { label: 'Employee Name', key: 'employee_name' },
                    { label: 'Project', key: 'project' },
                    { label: 'Punch In', key: 'punch_in_time' },
                    { label: 'Punch Out', key: 'punch_out_time' },
                    { label: 'Hours', key: 'total_hours' },
                    { label: 'Status', key: 'status' },
                    { label: 'Location', key: 'punch_in_address' }
                  ];
                  exportToCSV(`PTS_Attendance_${attendanceDate}.csv`, cols, attendanceRecords);
                }}
                className="gap-1.5 text-xs h-9"
              >
                <Download className="w-3.5 h-3.5" />
                Export Attendance Log
              </Button>
            </div>

            {/* Attendance Register Table */}
            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Project</TableHead>
                      <TableHead className="text-xs">Punch In</TableHead>
                      <TableHead className="text-xs">Punch Out</TableHead>
                      <TableHead className="text-xs">Duration</TableHead>
                      <TableHead className="text-xs">Location & Geofence</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                          No attendance records found for {attendanceDate}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceRecords.map(rec => (
                        <TableRow key={rec.id}>
                          <TableCell>
                            <div className="text-xs font-bold text-foreground">{rec.employee_name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{rec.employee_id}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-semibold border-border">
                              {rec.project}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-mono font-medium text-foreground">
                              {rec.punch_in_time ? new Date(rec.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-mono font-medium text-foreground">
                              {rec.punch_out_time ? new Date(rec.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-semibold text-foreground">
                              {rec.total_hours ? `${rec.total_hours} hrs` : '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-[11px] text-foreground max-w-xs truncate" title={rec.punch_in_address}>
                              {rec.punch_in_address || '—'}
                            </div>
                            <span className="text-[10px] text-emerald-500 font-medium">
                              {rec.punch_in_geo_status || 'Verified'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              'text-[10px] font-bold capitalize',
                              rec.status === 'present' ? 'text-emerald-500 border-emerald-500/30' :
                              rec.status === 'half_day' ? 'text-amber-500 border-amber-500/30' : 'text-slate-500 border-slate-500/30'
                            )}>
                              {rec.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 5: LIVE ATTENDANCE & LOCATION TRACKING */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'live_tracking' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-foreground">Live Site Deployment & Punch Activity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time event capture upon employee check-in / check-out. Location collection is restricted to authorised attendance punches.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-emerald-500 border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Monitoring
              </Badge>
            </div>

            {/* Live Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attendanceRecords.filter(r => r.punch_in_time && !r.punch_out_time).map(live => (
                <Card key={live.id} className="bg-card border-border shadow-xs">
                  <CardHeader className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">{live.employee_name}</div>
                      <div className="text-[11px] text-muted-foreground">{live.project}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-emerald-500 border-emerald-500/30">
                      ON SITE
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Punched In:</span>
                      <span className="font-mono font-bold text-foreground">
                        {new Date(live.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-start justify-between text-xs gap-2">
                      <span className="text-muted-foreground shrink-0">Location:</span>
                      <span className="text-right text-[11px] text-foreground font-medium truncate" title={live.punch_in_address}>
                        {live.punch_in_address || 'GPS Coordinates Recorded'}
                      </span>
                    </div>
                    {live.punch_in_latitude && (
                      <div className="pt-2 border-t border-border flex justify-end">
                        <a
                          href={`https://www.google.com/maps?q=${live.punch_in_latitude},${live.punch_in_longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Map
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 6: LEAVE MANAGEMENT */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'leave' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Leave Requests & Allocations</h3>
                <p className="text-xs text-muted-foreground">Manage employee leave applications, quota balances and approval reviews</p>
              </div>
              <Button size="sm" onClick={() => setApplyLeaveModalOpen(true)} className="gap-1.5 text-xs shadow-xs">
                <Plus className="w-4 h-4" />
                Apply Leave
              </Button>
            </div>

            {/* Leave Requests Table */}
            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Leave Type</TableHead>
                      <TableHead className="text-xs">Date Range</TableHead>
                      <TableHead className="text-xs">Days</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                          No leave requests recorded.
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaveRequests.map(req => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="text-xs font-bold text-foreground">{req.employee_name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{req.employee_id}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              {req.leave_type_name || req.leave_type_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-foreground">
                            {req.start_date} to {req.end_date}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground">
                            {req.total_days} {req.total_days === 1 ? 'day' : 'days'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={req.reason}>
                            {req.reason}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              'text-[10px] font-bold capitalize',
                              req.status === 'approved' ? 'text-emerald-500 border-emerald-500/30' :
                              req.status === 'pending' ? 'text-amber-500 border-amber-500/30' : 'text-rose-500 border-rose-500/30'
                            )}>
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isHR && req.status === 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => handleOpenReviewLeave(req)} className="text-xs h-7">
                                Review
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 7: SHIFTS & WORKING HOURS */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'shifts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Shift Rosters & Standard Hours</h3>
                <p className="text-xs text-muted-foreground">Configure shifts, grace periods, overnight shift calculations and break timings</p>
              </div>
              {isHR && (
                <Button size="sm" onClick={() => setShiftModalOpen(true)} className="gap-1.5 text-xs shadow-xs">
                  <Plus className="w-4 h-4" />
                  Add Shift
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shifts.map(s => (
                <Card key={s.id} className="bg-card border-border shadow-xs">
                  <CardHeader className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{s.code}</div>
                    </div>
                    {s.is_default ? (
                      <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                        DEFAULT
                      </Badge>
                    ) : null}
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Timing:</span>
                      <span className="font-semibold text-foreground">{s.start_time} - {s.end_time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Grace Period:</span>
                      <span className="font-medium text-foreground">{s.grace_minutes} mins</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Full Day Threshold:</span>
                      <span className="font-medium text-foreground">{s.full_day_hours} hrs</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Overnight Shift:</span>
                      <span className="font-medium text-foreground">{s.is_overnight ? 'Yes' : 'No'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 8: WEEKLY OFF & HOLIDAYS */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'holidays' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Company Holidays & Weekly Off Master</h3>
                <p className="text-xs text-muted-foreground">Official paid holidays and weekly off schedule for payroll reconciliation</p>
              </div>
              {isHR && (
                <Button size="sm" onClick={() => setHolidayModalOpen(true)} className="gap-1.5 text-xs shadow-xs">
                  <Plus className="w-4 h-4" />
                  Add Holiday
                </Button>
              )}
            </div>

            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Holiday Title</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Day</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Location</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.map(h => (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs font-bold text-foreground">{h.title}</TableCell>
                        <TableCell className="text-xs font-mono text-foreground">{h.date}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-semibold capitalize">
                            {h.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{h.location}</TableCell>
                        <TableCell className="text-right">
                          {isHR && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (confirm(`Delete holiday ${h.title}?`)) {
                                  await callRpc('deleteHrmsHoliday', { id: h.id });
                                  loadShiftsAndHolidays();
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 9: APPROVALS CENTER */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-foreground">Unified Approvals Center</h3>
                <p className="text-xs text-muted-foreground">
                  Consolidated queue for pending leave applications, attendance regularisations and shift requests
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-purple-500 border-purple-500/30">
                {approvalsSummary.totalPending} Pending
              </Badge>
            </div>

            {/* Pending Leaves */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Pending Leave Requests ({approvalsSummary.leaves.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Leave Type</TableHead>
                      <TableHead className="text-xs">Duration</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                      <TableHead className="text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvalsSummary.leaves.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                          No pending leave requests.
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvalsSummary.leaves.map(req => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="text-xs font-bold text-foreground">{req.employee_name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{req.employee_id}</div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{req.leave_type_name}</TableCell>
                          <TableCell className="text-xs text-foreground">
                            {req.start_date} to {req.end_date} ({req.total_days}d)
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{req.reason}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleOpenReviewLeave(req)} className="text-xs h-7">
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pending Attendance Regularisations */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="p-4 border-b border-border">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Pending Attendance Regularisations ({approvalsSummary.regularisations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Proposed In / Out</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                      <TableHead className="text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvalsSummary.regularisations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                          No pending regularisations.
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvalsSummary.regularisations.map(reg => (
                        <TableRow key={reg.id}>
                          <TableCell>
                            <div className="text-xs font-bold text-foreground">{reg.employee_name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{reg.employee_id}</div>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{reg.date}</TableCell>
                          <TableCell className="text-xs text-foreground">
                            {reg.proposed_punch_in} — {reg.proposed_punch_out}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{reg.reason}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  await callRpc('reviewAttendanceRegularisation', {
                                    regularisation_id: reg.id,
                                    action: 'approve'
                                  });
                                  showToast('Regularisation approved');
                                  loadApprovals();
                                }}
                                className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  await callRpc('reviewAttendanceRegularisation', {
                                    regularisation_id: reg.id,
                                    action: 'reject'
                                  });
                                  showToast('Regularisation rejected');
                                  loadApprovals();
                                }}
                                className="text-xs h-7 text-rose-500 border-rose-500/30"
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 10: EMPLOYEE DOCUMENTS */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Employee Statutory & Official Documents</h3>
                <p className="text-xs text-muted-foreground">
                  Aadhaar, PAN, Resume, Appointment Letter, Police Verification & Driving Licenses
                </p>
              </div>
              {isHR && (
                <Button size="sm" onClick={() => setDocUploadModalOpen(true)} className="gap-1.5 text-xs shadow-xs">
                  <Plus className="w-4 h-4" />
                  Upload Document
                </Button>
              )}
            </div>

            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-6 text-center text-xs text-muted-foreground">
                Select an employee from the Directory or use the Upload Document button to manage statutory and personal documentation.
              </CardContent>
            </Card>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 11: HR POLICIES & ANNOUNCEMENTS */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">HR Policies & Company Announcements</h3>
                <p className="text-xs text-muted-foreground">Broadcast official policy updates, notices and directives to the workforce</p>
              </div>
              {isHR && (
                <Button size="sm" onClick={() => setAnnouncementModalOpen(true)} className="gap-1.5 text-xs shadow-xs">
                  <Plus className="w-4 h-4" />
                  New Notice
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map(ann => (
                <Card key={ann.id} className="bg-card border-border shadow-xs">
                  <CardHeader className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ann.is_pinned ? <Bell className="w-4 h-4 text-primary" /> : null}
                      <span className="text-xs font-bold text-foreground">{ann.title}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                      {ann.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <p className="text-foreground whitespace-pre-wrap">{ann.content}</p>
                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Audience: {ann.target_dept} / {ann.target_project}</span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 12: ONBOARDING & EXIT MANAGEMENT */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'onboarding_exit' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Probation Tracker */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="p-4 border-b border-border">
                  <CardTitle className="text-xs font-bold flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Probation Review & Confirmation Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-xs">Joined</TableHead>
                        <TableHead className="text-xs">Probation</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.filter(e => !e.confirmation_date && e.status === 'active').map(emp => (
                        <TableRow key={emp.employee_id}>
                          <TableCell>
                            <div className="text-xs font-bold text-foreground">{emp.name}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.designation}</div>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{emp.joining_date || '—'}</TableCell>
                          <TableCell className="text-xs">{emp.probation_months || 3} months</TableCell>
                          <TableCell className="text-right">
                            {isHR && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenLifecycle(emp, 'confirm_probation')}
                                className="text-xs h-7"
                              >
                                Confirm
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Exit & Notice Period Tracker */}
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="p-4 border-b border-border">
                  <CardTitle className="text-xs font-bold flex items-center gap-2">
                    <UserMinus className="w-4 h-4 text-destructive" />
                    Resignation & Exit Handover Queue
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-xs">Expected Exit</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.filter(e => e.status === 'on_notice').length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                            No employees currently on notice period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        employees.filter(e => e.status === 'on_notice').map(emp => (
                          <TableRow key={emp.employee_id}>
                            <TableCell>
                              <div className="text-xs font-bold text-foreground">{emp.name}</div>
                              <div className="text-[11px] text-muted-foreground">{emp.designation}</div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-purple-400">
                              {emp.expected_exit_date || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-bold text-purple-400 border-purple-400/30">
                                ON NOTICE
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {isHR && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenLifecycle(emp, 'relieve')}
                                  className="text-xs h-7 text-destructive border-destructive/30"
                                >
                                  Relieve
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 13: REPORTS & ANALYTICS */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="p-4 border-b border-border">
                  <CardTitle className="text-xs font-bold">Attendance Compliance</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-primary">{dashboardData?.workforce?.attendancePercentage ?? 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Average daily verified punches across all active projects</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="p-4 border-b border-border">
                  <CardTitle className="text-xs font-bold">Absenteeism Rate</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-rose-500">
                    {dashboardData?.workforce?.active > 0
                      ? Math.round((dashboardData.workforce.absentToday / dashboardData.workforce.active) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Unexcused missing check-ins for the day</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="p-4 border-b border-border">
                  <CardTitle className="text-xs font-bold">Leave Utilization</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-amber-500">{dashboardData?.workforce?.onLeaveToday ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Employees currently on sanctioned leave</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 14: PAYROLL ATTENDANCE EXPORT */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'payroll_export' && (
          <div className="space-y-4">
            {/* Header & Filter Controls */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Month:</span>
                  <Select value={payrollMonth} onChange={(e) => setPayrollMonth(Number(e.target.value))} className="h-9 text-xs w-36">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2026, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Year:</span>
                  <Select value={payrollYear} onChange={(e) => setPayrollYear(Number(e.target.value))} className="h-9 text-xs w-28">
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Cut-Off:</span>
                  <Select value={payrollCutoffType} onChange={(e) => setPayrollCutoffType(e.target.value)} className="h-9 text-xs w-44">
                    <option value="calendar">Calendar Month (1st - 31st)</option>
                    <option value="26th_to_25th">26th to 25th Cycle</option>
                  </Select>
                </div>
              </div>

              {/* Lock & Export Actions */}
              <div className="flex items-center gap-2.5">
                {isHR && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLockAction(payrollData?.isLocked ? 'unlock' : 'lock');
                      setLockReason('');
                      setLockConfirmOpen(true);
                    }}
                    className={cn(
                      'text-xs gap-1.5 h-9 font-semibold',
                      payrollData?.isLocked ? 'text-amber-500 border-amber-500/30' : 'text-emerald-500 border-emerald-500/30'
                    )}
                  >
                    {payrollData?.isLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Locked (Click to Unlock)
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        Lock Attendance
                      </>
                    )}
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={handleExportPayrollCSV} className="gap-1.5 text-xs h-9">
                  <Download className="w-3.5 h-3.5" />
                  CSV Summary
                </Button>

                <Button size="sm" onClick={handleExportPayrollExcel} className="gap-1.5 text-xs h-9 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Multi-Sheet Excel (.xls)
                </Button>
              </div>
            </div>

            {/* Attendance Calculation Grid */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold">
                    Payroll Attendance Register: {new Date(payrollYear, payrollMonth - 1).toLocaleString('default', { month: 'long' })} {payrollYear}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Period: {payrollData?.startDate} to {payrollData?.endDate} ({payrollData?.calendarDays} calendar days)
                  </p>
                </div>
                {payrollData?.isLocked && (
                  <Badge variant="outline" className="text-[10px] font-bold text-amber-500 border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Locked by {payrollData?.lockInfo?.locked_by}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Employee ID</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Department</TableHead>
                      <TableHead className="text-xs text-right">Eligible</TableHead>
                      <TableHead className="text-xs text-right">Present</TableHead>
                      <TableHead className="text-xs text-right">Half Day</TableHead>
                      <TableHead className="text-xs text-right">Paid Lv</TableHead>
                      <TableHead className="text-xs text-right">LOP</TableHead>
                      <TableHead className="text-xs text-right">W/O</TableHead>
                      <TableHead className="text-xs text-right">Holidays</TableHead>
                      <TableHead className="text-xs text-right">Absent</TableHead>
                      <TableHead className="text-xs text-right font-bold text-primary">PAYABLE DAYS</TableHead>
                      <TableHead className="text-xs text-right">OT (Hrs)</TableHead>
                      <TableHead className="text-xs text-center">Alerts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!payrollData?.summary || payrollData.summary.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-10 text-xs text-muted-foreground">
                          No payroll calculation records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payrollData.summary.map(row => (
                        <TableRow key={row.employee_id}>
                          <TableCell className="font-mono text-xs">{row.employee_id}</TableCell>
                          <TableCell className="text-xs font-bold text-foreground">{row.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.department}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{row.eligible_days}</TableCell>
                          <TableCell className="text-xs text-right text-emerald-500 font-semibold">{row.present_days}</TableCell>
                          <TableCell className="text-xs text-right text-amber-500">{row.half_days}</TableCell>
                          <TableCell className="text-xs text-right text-blue-400">{row.paid_leave_days}</TableCell>
                          <TableCell className="text-xs text-right text-rose-500">{row.unpaid_leave_days}</TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">{row.weekly_off_days}</TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">{row.paid_holiday_days}</TableCell>
                          <TableCell className="text-xs text-right text-rose-400 font-medium">{row.absent_days}</TableCell>
                          <TableCell className="text-xs text-right font-extrabold text-primary text-sm bg-primary/5">
                            {row.payable_days}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">{row.overtime_hours}</TableCell>
                          <TableCell className="text-center">
                            {row.exceptions_count > 0 ? (
                              <Badge variant="outline" className="text-[10px] font-bold text-amber-500 border-amber-500/30">
                                {row.exceptions_count} Missing
                              </Badge>
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* TAB 15: HRMS SETTINGS */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl">
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="p-5 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  General HRMS & Attendance Calculation Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-foreground">Standard Daily Work Hours</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={hrmsSettings.standard_hours_per_day || '8.5'}
                      onChange={(e) => setHrmsSettings({ ...hrmsSettings, standard_hours_per_day: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">Hours required to qualify for full-day attendance.</p>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground">Half-Day Threshold Hours</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={hrmsSettings.half_day_min_hours || '4.5'}
                      onChange={(e) => setHrmsSettings({ ...hrmsSettings, half_day_min_hours: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">Minimum hours to qualify for half-day credit.</p>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground">Late Arrival Grace Minutes</label>
                    <Input
                      type="number"
                      value={hrmsSettings.late_grace_minutes || '15'}
                      onChange={(e) => setHrmsSettings({ ...hrmsSettings, late_grace_minutes: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">Minutes allowed after shift start before marking late.</p>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground">Late Penalty Rule (Count)</label>
                    <Input
                      type="number"
                      value={hrmsSettings.late_penalty_count || '3'}
                      onChange={(e) => setHrmsSettings({ ...hrmsSettings, late_penalty_count: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">Every N late arrivals deducts 0.5 days LOP from payable days.</p>
                  </div>
                </div>

                {isHR && (
                  <div className="pt-4 border-t border-border flex justify-end">
                    <Button
                      onClick={async () => {
                        await callRpc('saveHrmsSettings', hrmsSettings);
                        showToast('HRMS Settings saved successfully.');
                      }}
                      className="text-xs shadow-xs"
                    >
                      Save Policy Settings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {/* ───────────────────────────────────────────────────────── */}
      {employeeModalOpen && (
        <Dialog open={employeeModalOpen} onClose={() => setEmployeeModalOpen(false)}>
          <div className="p-6 max-w-2xl w-full bg-card border border-border rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-foreground mb-4">
              {editingEmployee ? `Edit Employee: ${editingEmployee.employee_id}` : 'Add New Employee'}
            </h2>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground">Employee ID *</label>
                  <Input
                    required
                    value={employeeFormData.employee_id}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, employee_id: e.target.value })}
                    disabled={!!editingEmployee}
                    className="mt-1 h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground">Full Name *</label>
                  <Input
                    required
                    value={employeeFormData.name}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground">Department *</label>
                  <Select
                    value={employeeFormData.department}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, department: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  >
                    {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </div>

                <div>
                  <label className="font-medium text-foreground">Designation *</label>
                  <Input
                    required
                    value={employeeFormData.designation}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, designation: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground">Email</label>
                  <Input
                    type="email"
                    value={employeeFormData.email}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground">Phone</label>
                  <Input
                    value={employeeFormData.phone}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground">Primary Project / Site</label>
                  <Select
                    value={employeeFormData.primary_project}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, primary_project: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {projectList.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>

                <div>
                  <label className="font-medium text-foreground">Employment Status</label>
                  <Select
                    value={employeeFormData.status}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, status: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="on_notice">On Notice</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>

                <div>
                  <label className="font-medium text-foreground">Joining Date</label>
                  <Input
                    type="date"
                    value={employeeFormData.joining_date}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, joining_date: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground">Probation Period (Months)</label>
                  <Input
                    type="number"
                    value={employeeFormData.probation_months}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, probation_months: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground">Weekly Off Day</label>
                  <Select
                    value={employeeFormData.weekly_off}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, weekly_off: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  >
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </Select>
                </div>

                <div>
                  <label className="font-medium text-foreground">Reporting Manager Email</label>
                  <Input
                    value={employeeFormData.reporting_manager}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, reporting_manager: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Statutory & Bank Information */}
              <div className="pt-3 border-t border-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Bank & Statutory Identity</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="font-medium text-foreground">Bank Name</label>
                    <Input
                      value={employeeFormData.bank_name}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, bank_name: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-foreground">Account Number</label>
                    <Input
                      value={employeeFormData.bank_account_no}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, bank_account_no: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-foreground">Bank IFSC</label>
                    <Input
                      value={employeeFormData.bank_ifsc}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, bank_ifsc: e.target.value })}
                      className="mt-1 h-8 text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-foreground">PAN Number</label>
                    <Input
                      value={employeeFormData.pan_no}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, pan_no: e.target.value })}
                      className="mt-1 h-8 text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-foreground">Aadhaar Number</label>
                    <Input
                      value={employeeFormData.aadhaar_no}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, aadhaar_no: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEmployeeModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Employee
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: REVIEW LEAVE */}
      {/* ───────────────────────────────────────────────────────── */}
      {leaveReviewModalOpen && selectedLeaveReq && (
        <Dialog open={leaveReviewModalOpen} onClose={() => setLeaveReviewModalOpen(false)}>
          <div className="p-6 max-w-md w-full bg-card border border-border rounded-xl shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground">Review Leave Application</h2>

            <div className="text-xs space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border">
              <div><span className="text-muted-foreground">Employee:</span> <span className="font-bold text-foreground">{selectedLeaveReq.employee_name} ({selectedLeaveReq.employee_id})</span></div>
              <div><span className="text-muted-foreground">Leave Type:</span> <span className="font-semibold text-foreground">{selectedLeaveReq.leave_type_name}</span></div>
              <div><span className="text-muted-foreground">Dates:</span> <span className="font-mono text-foreground">{selectedLeaveReq.start_date} to {selectedLeaveReq.end_date} ({selectedLeaveReq.total_days} days)</span></div>
              <div><span className="text-muted-foreground">Reason:</span> <span className="text-foreground">{selectedLeaveReq.reason}</span></div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Approver Remarks</label>
              <Textarea
                placeholder="Optional remarks..."
                value={leaveReviewRemarks}
                onChange={(e) => setLeaveReviewRemarks(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setLeaveReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSubmitLeaveReview('reject')}
                className="text-xs text-rose-500 border-rose-500/30"
              >
                Reject Leave
              </Button>
              <Button
                size="sm"
                onClick={() => handleSubmitLeaveReview('approve')}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Approve Leave
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: APPLY LEAVE */}
      {/* ───────────────────────────────────────────────────────── */}
      {applyLeaveModalOpen && (
        <Dialog open={applyLeaveModalOpen} onClose={() => setApplyLeaveModalOpen(false)}>
          <div className="p-6 max-w-md w-full bg-card border border-border rounded-xl shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground">Apply for Leave</h2>

            <form onSubmit={handleApplyLeave} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-foreground">Employee</label>
                <Select
                  value={leaveFormData.employee_id}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, employee_id: e.target.value })}
                  className="mt-1 h-8 text-xs"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(e => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.name} ({e.employee_id})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="font-medium text-foreground">Leave Type</label>
                <Select
                  value={leaveFormData.leave_type_code}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, leave_type_code: e.target.value })}
                  className="mt-1 h-8 text-xs"
                >
                  {leaveTypes.map(t => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-foreground">Start Date</label>
                  <Input
                    type="date"
                    required
                    value={leaveFormData.start_date}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground">End Date</label>
                  <Input
                    type="date"
                    required
                    value={leaveFormData.end_date}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-foreground">Reason for Leave *</label>
                <Textarea
                  required
                  placeholder="Reason..."
                  value={leaveFormData.reason}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setApplyLeaveModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: LOCK / UNLOCK ATTENDANCE CONFIRMATION */}
      {/* ───────────────────────────────────────────────────────── */}
      {lockConfirmOpen && (
        <Dialog open={lockConfirmOpen} onClose={() => setLockConfirmOpen(false)}>
          <div className="p-6 max-w-md w-full bg-card border border-border rounded-xl shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground">
              {lockAction === 'lock' ? 'Lock Monthly Attendance' : 'Unlock Monthly Attendance'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {lockAction === 'lock'
                ? `Locking attendance for ${payrollMonth}/${payrollYear} prevents further modifications to punch and leave records for this period.`
                : `Unlocking attendance allows HR administrators to make retroactive adjustments. An audit record will be logged.`}
            </p>

            <div>
              <label className="text-xs font-medium text-foreground">Reason / Audit Notes *</label>
              <Textarea
                required
                placeholder="Enter justification..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setLockConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleTogglePayrollLock}
                disabled={!lockReason.trim()}
                className={lockAction === 'lock' ? 'bg-primary' : 'bg-amber-600 hover:bg-amber-700 text-white'}
              >
                Confirm {lockAction === 'lock' ? 'Lock' : 'Unlock'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: LIFECYCLE (PROBATION / EXIT) */}
      {/* ───────────────────────────────────────────────────────── */}
      {lifecycleModalOpen && lifecycleTarget && (
        <Dialog open={lifecycleModalOpen} onClose={() => setLifecycleModalOpen(false)}>
          <div className="p-6 max-w-md w-full bg-card border border-border rounded-xl shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground">
              Employee Lifecycle: {lifecycleTarget.name}
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-foreground">Lifecycle Action</label>
                <Select
                  value={lifecycleAction}
                  onChange={(e) => setLifecycleAction(e.target.value)}
                  className="mt-1 h-8 text-xs"
                >
                  <option value="confirm_probation">Confirm Probation (Full-Time)</option>
                  <option value="extend_probation">Extend Probation</option>
                  <option value="resignation">Log Resignation & Start Notice Period</option>
                  <option value="relieve">Relieve Employee & Complete Clearance</option>
                </Select>
              </div>

              <div>
                <label className="font-medium text-foreground">Effective Date</label>
                <Input
                  type="date"
                  value={lifecycleDate}
                  onChange={(e) => setLifecycleDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-foreground">Notes / Handover Remarks</label>
                <Textarea
                  placeholder="Notes..."
                  value={lifecycleNotes}
                  onChange={(e) => setLifecycleNotes(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setLifecycleModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmitLifecycle}>
                  Update Status
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: ADD SHIFT */}
      {/* ───────────────────────────────────────────────────────── */}
      {shiftModalOpen && (
        <Dialog open={shiftModalOpen} onClose={() => setShiftModalOpen(false)}>
          <div className="p-6 max-w-md w-full bg-card border border-border rounded-xl shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground">Add Work Shift</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await callRpc('saveHrmsShift', shiftFormData);
                showToast('Shift created');
                setShiftModalOpen(false);
                loadShiftsAndHolidays();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-medium text-foreground">Shift Name *</label>
                <Input
                  required
                  placeholder="e.g. Morning Shift"
                  value={shiftFormData.name}
                  onChange={(e) => setShiftFormData({ ...shiftFormData, name: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-foreground">Start Time</label>
                  <Input
                    type="time"
                    required
                    value={shiftFormData.start_time}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, start_time: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground">End Time</label>
                  <Input
                    type="time"
                    required
                    value={shiftFormData.end_time}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, end_time: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-foreground">Grace (Mins)</label>
                  <Input
                    type="number"
                    value={shiftFormData.grace_minutes}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, grace_minutes: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground">Full Day (Hrs)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={shiftFormData.full_day_hours}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, full_day_hours: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShiftModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Shift
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: ADD HOLIDAY */}
      {/* ───────────────────────────────────────────────────────── */}
      {holidayModalOpen && (
        <Dialog open={holidayModalOpen} onClose={() => setHolidayModalOpen(false)}>
          <div className="p-6 max-w-md w-full bg-card border border-border rounded-xl shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground">Add Company Holiday</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await callRpc('saveHrmsHoliday', holidayFormData);
                showToast('Holiday added');
                setHolidayModalOpen(false);
                loadShiftsAndHolidays();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-medium text-foreground">Title *</label>
                <Input
                  required
                  placeholder="e.g. Diwali"
                  value={holidayFormData.title}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, title: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-foreground">Date *</label>
                <Input
                  type="date"
                  required
                  value={holidayFormData.date}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, date: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-foreground">Type</label>
                <Select
                  value={holidayFormData.type}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, type: e.target.value })}
                  className="mt-1 h-8 text-xs"
                >
                  <option value="national">National Holiday</option>
                  <option value="gazetted">Gazetted / Festival</option>
                  <option value="restricted">Restricted / Optional</option>
                </Select>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setHolidayModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Add Holiday
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: NEW ANNOUNCEMENT */}
      {/* ───────────────────────────────────────────────────────── */}
      {announcementModalOpen && (
        <Dialog open={announcementModalOpen} onClose={() => setAnnouncementModalOpen(false)}>
          <div className="p-6 max-w-md w-full bg-card border border-border rounded-xl shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground">New Notice / Policy Announcement</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await callRpc('saveHrmsAnnouncement', announcementFormData);
                showToast('Notice published');
                setAnnouncementModalOpen(false);
                loadAnnouncementsAndSettings();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-medium text-foreground">Title *</label>
                <Input
                  required
                  placeholder="Notice Headline"
                  value={announcementFormData.title}
                  onChange={(e) => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-foreground">Content *</label>
                <Textarea
                  required
                  placeholder="Notice details..."
                  value={announcementFormData.content}
                  onChange={(e) => setAnnouncementFormData({ ...announcementFormData, content: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinNotice"
                  checked={announcementFormData.is_pinned}
                  onChange={(e) => setAnnouncementFormData({ ...announcementFormData, is_pinned: e.target.checked })}
                />
                <label htmlFor="pinNotice" className="font-medium text-foreground">Pin Notice to Dashboard</label>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAnnouncementModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Publish Notice
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

    </div>
  );
}
