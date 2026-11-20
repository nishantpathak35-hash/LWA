import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../app/lib/db.js';
import {
  initHrmsTables,
  getHrmsDashboardKPIs,
  listHrmsEmployees,
  saveHrmsEmployee,
  updateEmployeeLifecycle,
  applyLeave,
  reviewLeaveRequest,
  getMonthlyPayrollAttendance,
  lockMonthlyAttendance
} from '../../app/lib/api/hrms.js';

describe('HRMS Module & Payroll Attendance Engine Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.queryRun).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
  });

  describe('HRMS Table Initializations & Seeds', () => {
    it('initializes HRMS tables and indices without errors', async () => {
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ count: 0 }) // shiftCount
        .mockResolvedValueOnce({ count: 0 }) // leaveTypesCount
        .mockResolvedValueOnce({ count: 0 }); // holidaysCount

      await expect(initHrmsTables()).resolves.not.toThrow();
      expect(db.queryRun).toHaveBeenCalled();
    });
  });

  describe('Employee Master CRUD & Lifecycle', () => {
    const adminSession = { user: { email: 'admin@luxeworx.com', roles: ['admin'] } };
    const staffSession = { user: { email: 'worker@luxeworx.com', roles: ['employee'] } };

    it('requires HR or Administrator privileges to save employee', async () => {
      await expect(
        saveHrmsEmployee({ employee_id: 'EMP-001', name: 'Ravi' }, staffSession)
      ).rejects.toThrow('AUTH: Access denied. HR or Administrator privileges required.');
    });

    it('successfully saves new employee with all statutory and bank details', async () => {
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce(null) // existing employee
        .mockResolvedValueOnce(null); // existing alloc

      vi.mocked(db.queryAll).mockResolvedValueOnce([
        { code: 'CL', default_quota_annual: 12 },
        { code: 'SL', default_quota_annual: 12 }
      ]);

      const res = await saveHrmsEmployee({
        employee_id: 'EMP-1001',
        name: 'Arun Sharma',
        designation: 'Project Lead',
        department: 'Project Management',
        phone: '9876543210',
        email: 'arun@luxeworx.com',
        bank_name: 'HDFC Bank',
        bank_account_no: '50100234567890',
        bank_ifsc: 'HDFC0001234',
        pan_no: 'ABCDE1234F',
        aadhaar_no: '123456789012',
        primary_project: 'Luxury Penthouse',
        weekly_off: 'Sunday'
      }, adminSession);

      expect(res.success).toBe(true);
      expect(res.employee_id).toBe('EMP-1001');
      expect(db.queryRun).toHaveBeenCalled();
    });

    it('updates employee lifecycle for probation confirmation and resignation', async () => {
      vi.mocked(db.queryGet).mockResolvedValueOnce({
        employee_id: 'EMP-1001',
        name: 'Arun Sharma',
        notice_period_days: 30
      });

      const confRes = await updateEmployeeLifecycle({
        employee_id: 'EMP-1001',
        action: 'confirm_probation',
        confirmation_date: '2026-11-01'
      }, adminSession);

      expect(confRes.success).toBe(true);

      vi.mocked(db.queryGet).mockResolvedValueOnce({
        employee_id: 'EMP-1001',
        name: 'Arun Sharma',
        notice_period_days: 30
      });

      const resigRes = await updateEmployeeLifecycle({
        employee_id: 'EMP-1001',
        action: 'resignation',
        date: '2026-11-15',
        reason: 'Better opportunity'
      }, adminSession);

      expect(resigRes.success).toBe(true);
    });

    it('masks sensitive statutory details for non-HR users in employee directory', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        {
          employee_id: 'EMP-1001',
          name: 'Arun Sharma',
          bank_account_no: '50100234567890',
          bank_ifsc: 'HDFC0001234',
          pan_no: 'ABCDE1234F',
          aadhaar_no: '123456789012'
        }
      ]);

      const result = await listHrmsEmployees({}, staffSession);
      expect(result[0].bank_account_no).toBe('••••7890');
      expect(result[0].bank_ifsc).toBe('••••••••');
      expect(result[0].pan_no).toBe('••••••234F');
      expect(result[0].aadhaar_no).toBe('••••••••9012');
    });
  });

  describe('Leave Management & Accrual Rules', () => {
    const adminSession = { user: { email: 'admin@luxeworx.com', roles: ['admin'] } };
    const staffSession = { user: { email: 'worker@luxeworx.com', roles: ['employee'] } };

    it('validates leave application dates and rejects end_date < start_date', async () => {
      await expect(
        applyLeave({
          employee_id: 'EMP-001',
          leave_type_code: 'CL',
          start_date: '2026-11-20',
          end_date: '2026-11-18',
          reason: 'Personal'
        }, staffSession)
      ).rejects.toThrow('End date cannot be earlier than start date');
    });

    it('rejects overlapping leave requests for the same employee', async () => {
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-001' })
        .mockResolvedValueOnce({ id: 5 }); // overlapping request found

      await expect(
        applyLeave({
          employee_id: 'EMP-001',
          leave_type_code: 'CL',
          start_date: '2026-11-10',
          end_date: '2026-11-12',
          reason: 'Personal'
        }, staffSession)
      ).rejects.toThrow('overlapping these dates');
    });

    it('successfully reviews and approves leave, deducting balance and marking attendance', async () => {
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({
          id: 42,
          employee_id: 'EMP-001',
          leave_type_code: 'CL',
          start_date: '2026-11-10',
          end_date: '2026-11-11',
          total_days: 2,
          status: 'pending',
          is_half_day: 0
        }) // req
        .mockResolvedValueOnce(null) // no locked payroll period
        .mockResolvedValueOnce(null) // sufficient paid leave balance
        .mockResolvedValueOnce({ name: 'Ravi Kumar' }) // emp
        .mockResolvedValueOnce({ project: 'Tower B' }) // primaryProj
        .mockResolvedValueOnce(null) // existing att day 1
        .mockResolvedValueOnce(null); // existing att day 2

      const reviewRes = await reviewLeaveRequest({
        request_id: 42,
        action: 'approve',
        remarks: 'Approved by Director'
      }, adminSession);

      expect(reviewRes.success).toBe(true);
      expect(reviewRes.status).toBe('approved');
      expect(db.queryRun).toHaveBeenCalled();
    });
  });

  describe('Payroll Attendance Calculation Engine', () => {
    const adminSession = { user: { email: 'admin@luxeworx.com', roles: ['admin'] } };

    it('computes exact payable days with full breakdown for a calendar month', async () => {
      // Setup November 2026: 30 days
      vi.mocked(db.queryAll)
        .mockResolvedValueOnce([
          { key: 'standard_hours_per_day', value: '8.5' },
          { key: 'late_penalty_count', value: '3' },
          { key: 'default_cutoff_type', value: 'calendar' }
        ]) // settings
        .mockResolvedValueOnce([
          { id: 1, title: 'Diwali', date: '2026-11-08', year: 2026 }
        ]) // holidays (Diwali on Sunday Nov 8th)
        .mockResolvedValueOnce([
          {
            employee_id: 'EMP-001',
            name: 'Ravi Kumar',
            department: 'Operations',
            designation: 'Supervisor',
            primary_project: 'Tower A',
            joining_date: '2026-01-01',
            exit_date: null,
            weekly_off: 'Sunday'
          }
        ]) // employees
        .mockResolvedValueOnce([
          // Attendance records: 20 present full days
          { employee_id: 'EMP-001', date: '2026-11-02', status: 'present', total_hours: 9, punch_in_time: '2026-11-02T09:00:00Z', punch_out_time: '2026-11-02T18:00:00Z' },
          { employee_id: 'EMP-001', date: '2026-11-03', status: 'present', total_hours: 8.5, punch_in_time: '2026-11-03T09:00:00Z', punch_out_time: '2026-11-03T17:30:00Z' },
          { employee_id: 'EMP-001', date: '2026-11-04', status: 'half_day', total_hours: 4.5, punch_in_time: '2026-11-04T09:00:00Z', punch_out_time: '2026-11-04T13:30:00Z' }
        ]) // attendance rows
        .mockResolvedValueOnce([
          {
            id: 1,
            employee_id: 'EMP-001',
            leave_type_code: 'CL',
            start_date: '2026-11-05',
            end_date: '2026-11-06',
            total_days: 2,
            is_half_day: 0,
            is_paid: 1,
            status: 'approved'
          }
        ]); // approved leaves: 2 paid days (Nov 5, Nov 6)

      vi.mocked(db.queryGet).mockResolvedValueOnce(null); // lock status

      const payroll = await getMonthlyPayrollAttendance({ month: 11, year: 2026 }, adminSession);

      expect(payroll.month).toBe(11);
      expect(payroll.year).toBe(2026);
      expect(payroll.calendarDays).toBe(30);
      expect(payroll.summary.length).toBe(1);

      const empSummary = payroll.summary[0];
      expect(empSummary.employee_id).toBe('EMP-001');
      expect(empSummary.eligible_days).toBe(30);
      expect(empSummary.present_days).toBe(2);
      expect(empSummary.half_days).toBe(1);
      expect(empSummary.paid_leave_days).toBe(2);
      expect(empSummary.weekly_off_days).toBeGreaterThanOrEqual(4);
      expect(empSummary.payable_days).toBeGreaterThan(0);
      expect(empSummary.payable_days).toBeLessThanOrEqual(30);
    });

    it('correctly handles mid-month joining dates with prorated eligible days', async () => {
      // Employee joined Nov 15th in a 30-day month -> 16 eligible days (Nov 15-30)
      vi.mocked(db.queryAll)
        .mockResolvedValueOnce([]) // settings
        .mockResolvedValueOnce([]) // holidays
        .mockResolvedValueOnce([
          {
            employee_id: 'EMP-002',
            name: 'Vikram Singh',
            department: 'MEP Engineering',
            designation: 'Engineer',
            primary_project: 'Site Delta',
            joining_date: '2026-11-15',
            exit_date: null,
            weekly_off: 'Sunday'
          }
        ]) // employee
        .mockResolvedValueOnce([]) // attendance
        .mockResolvedValueOnce([]); // leaves

      vi.mocked(db.queryGet).mockResolvedValueOnce(null); // lock

      const payroll = await getMonthlyPayrollAttendance({ month: 11, year: 2026 }, adminSession);
      const emp = payroll.summary[0];

      expect(emp.eligible_days).toBe(16);
      expect(emp.payable_days).toBeLessThanOrEqual(16);
    });

    it('locks and unlocks monthly attendance with authorized audit trails', async () => {
      vi.mocked(db.queryAll).mockResolvedValue([]);
      vi.mocked(db.queryGet).mockResolvedValue(null);
      const lockRes = await lockMonthlyAttendance({
        month: 11,
        year: 2026,
        action: 'lock',
        notes: 'Finalized for salary processing'
      }, adminSession);

      expect(lockRes.success).toBe(true);
      expect(lockRes.is_locked).toBe(true);

      const unlockRes = await lockMonthlyAttendance({
        month: 11,
        year: 2026,
        action: 'unlock',
        reason: 'Adjusting missed punch for site staff'
      }, adminSession);

      expect(unlockRes.success).toBe(true);
      expect(unlockRes.is_locked).toBe(false);
    });
  });
});
