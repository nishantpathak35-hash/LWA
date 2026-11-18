import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../app/lib/db.js';
import {
  calculateDistanceMeters,
  calculateWorkingHours,
  getLocalDateString,
  getISTParts,
  getMyAttendanceToday,
  punchAttendance,
  createOrUpdateSiteEmployee,
  allocateEmployeeToProject,
  transferEmployeeProject,
  submitAttendanceRegularisation,
  reviewAttendanceRegularisation
} from '../../app/lib/api/attendance.js';
import { DEFAULT_FEATURE_PERMISSIONS, VALID_ROLE_KEYS } from '../../app/lib/api/core.js';

describe('Site Attendance Module Unit & Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.queryRun).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
  });

  describe('Geofence & Math Calculations', () => {
    it('accurately calculates Haversine distance in meters', () => {
      const dist = calculateDistanceMeters(28.4900, 77.0900, 28.4950, 77.0880);
      expect(dist).toBeGreaterThan(500);
      expect(dist).toBeLessThan(650);
      expect(calculateDistanceMeters(28.4900, 77.0900, 28.4900, 77.0900)).toBe(0);
      expect(calculateDistanceMeters(null, 77.0900, 28.4900, 77.0900)).toBeNull();
    });

    it('accurately calculates total working hours with decimal precision', () => {
      const h1 = calculateWorkingHours('2026-11-17T09:00:00.000Z', '2026-11-17T18:30:00.000Z');
      expect(h1).toBe(9.5);
      const h2 = calculateWorkingHours('2026-11-17T09:10:00.000Z', '2026-11-17T18:15:00.000Z');
      expect(h2).toBe(9.08);
      expect(calculateWorkingHours('2026-11-17T18:00:00.000Z', '2026-11-17T09:00:00.000Z')).toBe(0);
      expect(calculateWorkingHours(null, '2026-11-17T18:00:00.000Z')).toBe(0);
    });

    it('formats local project date as YYYY-MM-DD', () => {
      const d = getLocalDateString(new Date('2026-11-17T10:00:00Z'));
      expect(d).toBe('2026-11-17');
    });
  });

  describe('Punch Attendance Security & Validation', () => {
    const validSession = { email: 'worker@luxeworx.com', roles: ['employee'] };

    it('requires authentication to punch attendance', async () => {
      await expect(punchAttendance({ type: 'in' }, null)).rejects.toThrow('AUTH:Not signed in');
    });

    it('rejects punch when selfie is missing', async () => {
      await expect(
        punchAttendance({ type: 'in', latitude: 28.49, longitude: 77.09 }, validSession)
      ).rejects.toThrow('Live selfie photograph is required');
    });

    it('rejects punch when GPS coordinates are missing', async () => {
      await expect(
        punchAttendance({ type: 'in', selfie: 'data:image/jpeg;base64,...' }, validSession)
      ).rejects.toThrow('GPS coordinates are required');
    });

    it('rejects invalid punch type', async () => {
      await expect(
        punchAttendance({ type: 'invalid', selfie: 'data:image...', latitude: 28, longitude: 77 }, validSession)
      ).rejects.toThrow('Invalid punch type');
    });

    it('prevents duplicate punch in on the same day', async () => {
      // Mock db returns existing employee and existing punch_in record
      vi.mocked(db.queryRun).mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-001', name: 'Ravi Kumar' }) // employee
        .mockResolvedValueOnce({ project: 'Tower A' }) // allocation
        .mockResolvedValueOnce(null) // geofence
        .mockResolvedValueOnce({ id: 10, punch_in_time: '2026-11-17T09:00:00Z', punch_out_time: null }); // existingRecord

      await expect(
        punchAttendance(
          { type: 'in', selfie: 'data:image...', latitude: 28.49, longitude: 77.09 },
          validSession
        )
      ).rejects.toThrow('ALREADY_PUNCHED_IN');
    });

    it('rejects punch out if no punch in exists for today or yesterday', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-001', name: 'Ravi Kumar' }) // employee
        .mockResolvedValueOnce({ project: 'Tower A' }) // allocation
        .mockResolvedValueOnce(null) // geofence
        .mockResolvedValueOnce(null) // existingRecord today (none)
        .mockResolvedValueOnce(null); // openShift overnight (none)

      await expect(
        punchAttendance(
          { type: 'out', selfie: 'data:image...', latitude: 28.49, longitude: 77.09 },
          validSession
        )
      ).rejects.toThrow('INVALID_PUNCH_OUT');
    });

    it('successfully punches out an overnight shift across midnight', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ changes: 1 });
      const yesterdayPunchIn = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(); // 8 hours ago
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-001', name: 'Ravi Kumar' }) // employee
        .mockResolvedValueOnce({ project: 'Tower A' }) // allocation
        .mockResolvedValueOnce(null) // geofence
        .mockResolvedValueOnce(null) // existingRecord today is null
        .mockResolvedValueOnce({
          id: 55,
          employee_id: 'EMP-001',
          punch_in_time: yesterdayPunchIn,
          punch_out_time: null,
          date: '2026-11-16'
        }); // open overnight shift

      const res = await punchAttendance(
        { type: 'out', selfie: 'data:image...', latitude: 28.49, longitude: 77.09, address: 'Cyber City' },
        validSession
      );

      expect(res.success).toBe(true);
      expect(res.type).toBe('out');
      expect(res.totalHours).toBeCloseTo(8, 0);
      expect(res.status).toBe('present');
    });

    it('blocks punch if outside mandatory geofence boundary', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-001', name: 'Ravi Kumar' }) // employee
        .mockResolvedValueOnce({ project: 'Tower A' }) // allocation
        // Geofence at (28.4900, 77.0900) radius 200m
        .mockResolvedValueOnce({ latitude: 28.4900, longitude: 77.0900, radius_meters: 200, is_mandatory: 1 });

      // Punch location at 28.5300 (~4.5km away)
      await expect(
        punchAttendance(
          { type: 'in', selfie: 'data:image...', latitude: 28.5300, longitude: 77.0900 },
          validSession
        )
      ).rejects.toThrow('PUNCH_BLOCKED');
    });

    it('handles array-wrapped punch payloads and normalized punch types', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ lastInsertRowid: 99, changes: 1 });
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-001', name: 'Ravi Kumar' })
        .mockResolvedValueOnce({ project: 'Tower A' })
        .mockResolvedValueOnce(null) // no geofence
        .mockResolvedValueOnce(null); // no existing record

      // Pass array-wrapped payload with 'punch_in' type
      const res = await punchAttendance(
        [{
          type: 'punch_in',
          selfie: 'data:image/jpeg;base64,abc123',
          latitude: 28.4985,
          longitude: 77.0928,
          accuracy: 12,
          address: 'DLF Cyber City, Tower B'
        }],
        validSession
      );

      expect(res.success).toBe(true);
      expect(res.type).toBe('in');
      expect(res.latitude).toBe(28.4985);
      expect(res.longitude).toBe(77.0928);
      expect(res.accuracy).toBe(12);
      expect(res.address).toContain('DLF Cyber City');
    });

    it('records exact coordinates and location for punch out', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ changes: 1 });
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-001', name: 'Ravi Kumar' })
        .mockResolvedValueOnce({ project: 'Tower A' })
        .mockResolvedValueOnce(null) // no geofence
        .mockResolvedValueOnce({
          id: 99,
          employee_id: 'EMP-001',
          date: '2026-11-17',
          punch_in_time: '2026-11-17T09:00:00.000Z',
          punch_out_time: null
        });

      const res = await punchAttendance(
        {
          type: 'out',
          selfie: 'data:image/jpeg;base64,out123',
          latitude: 28.4986,
          longitude: 77.0929,
          accuracy: 8,
          address: 'DLF Cyber City, Exit Gate'
        },
        validSession
      );

      expect(res.success).toBe(true);
      expect(res.type).toBe('out');
      expect(res.latitude).toBe(28.4986);
      expect(res.longitude).toBe(77.0929);
      expect(res.accuracy).toBe(8);
      expect(res.address).toBe('DLF Cyber City, Exit Gate');
    });
  });

  describe('Employee Management & Project Allocation', () => {
    const adminSession = { email: 'admin@luxeworx.com', roles: ['admin'] };

    it('validates mandatory employee fields', async () => {
      await expect(
        createOrUpdateSiteEmployee({ employee_id: '', name: 'Vikram' }, adminSession)
      ).rejects.toThrow('Employee ID, name, designation, and contact number are required');
    });

    it('allocates employee to project and transfers without deleting history', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
      const alloc = await allocateEmployeeToProject(
        { employee_id: 'EMP-001', project: 'Cyber Hub Site', role_at_site: 'Site Lead' },
        adminSession
      );
      expect(alloc.success).toBe(true);

      const transfer = await transferEmployeeProject(
        { employee_id: 'EMP-001', new_project: 'DLF Phase 2', reason: 'Urgent civil mobilization' },
        adminSession
      );
      expect(transfer.success).toBe(true);
      expect(db.queryRun).toHaveBeenCalled();
    });
  });

  describe('Attendance Regularisation & Review', () => {
    const empSession = { email: 'emp@luxeworx.com', roles: ['employee'] };
    const adminSession = { email: 'admin@luxeworx.com', roles: ['admin'] };

    it('submits regularisation request and creates audit trail', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ lastInsertRowid: 42, changes: 1 });
      const res = await submitAttendanceRegularisation(
        {
          attendance_id: 10,
          employee_id: 'EMP-001',
          project: 'Horizon HQ',
          date: '2026-11-16',
          proposed_punch_in: '2026-11-16T09:00:00Z',
          proposed_punch_out: '2026-11-16T18:00:00Z',
          reason: 'Phone battery died during evening site walkthrough'
        },
        empSession
      );
      expect(res.success).toBe(true);
      expect(res.id).toBe(42);
    });

    it('approves regularisation and updates attendance record', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ changes: 1 });
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({
          id: 42,
          attendance_id: 10,
          employee_id: 'EMP-001',
          project: 'Horizon HQ',
          date: '2026-11-16',
          proposed_punch_in: '2026-11-16T09:00:00Z',
          proposed_punch_out: '2026-11-16T18:00:00Z',
          reason: 'Battery died'
        }) // reg
        .mockResolvedValueOnce({ id: 10, punch_in_time: '2026-11-16T09:00:00Z', punch_out_time: null }); // orig

      const review = await reviewAttendanceRegularisation(
        { id: 42, decision: 'approved', review_notes: 'Approved after verification with site engineer' },
        adminSession
      );
      expect(review.success).toBe(true);
      expect(review.decision).toBe('approved');
    });
  });

  describe('Operations Role & Feature Permissions Integration', () => {
    it('recognizes operations in VALID_ROLE_KEYS and DEFAULT_FEATURE_PERMISSIONS', () => {
      expect(VALID_ROLE_KEYS.has('operations')).toBe(true);
      expect(DEFAULT_FEATURE_PERMISSIONS.operations).toContain('site_employees');
      expect(DEFAULT_FEATURE_PERMISSIONS.operations).toContain('site_attendance');
      expect(DEFAULT_FEATURE_PERMISSIONS.operations).toContain('site_geofence');
      expect(DEFAULT_FEATURE_PERMISSIONS.operations).toContain('approve_attendance');
    });

    it('allows operations manager to review regularisation requests', async () => {
      const opsSession = { email: 'ops.lead@luxeworx.com', roles: ['operations'] };
      vi.mocked(db.queryRun).mockResolvedValue({ changes: 1 });
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({
          id: 77,
          attendance_id: 12,
          employee_id: 'EMP-002',
          project: 'Cyber City',
          date: '2026-11-17',
          proposed_punch_in: '2026-11-17T09:00:00Z',
          proposed_punch_out: '2026-11-17T18:00:00Z',
          reason: 'Biometric server sync delay'
        })
        .mockResolvedValueOnce({ id: 12, punch_in_time: '2026-11-17T09:00:00Z', punch_out_time: null });

      const review = await reviewAttendanceRegularisation(
        { id: 77, decision: 'approved', review_notes: 'Verified by Operations' },
        opsSession
      );
      expect(review.success).toBe(true);
      expect(review.decision).toBe('approved');
    });
  });

  describe('Stale & Missed Punch Handling (Nishant Punch-in Bug Resolution)', () => {
    const empSession = { email: 'nishant@luxeworx.com', roles: ['employee'] };

    it('calculates IST parts accurately across UTC boundaries', () => {
      // 01:30 UTC + 5:30 IST = 07:00 IST morning
      const istMorning = getISTParts('2026-11-18T01:30:00.000Z');
      expect(istMorning.hours).toBe(7);
      expect(istMorning.minutes).toBe(0);
      expect(istMorning.dateString).toBe('2026-11-18');

      // 18:45 UTC = 00:15 IST next day
      const istMidnight = getISTParts('2026-11-17T18:45:00.000Z');
      expect(istMidnight.hours).toBe(0);
      expect(istMidnight.minutes).toBe(15);
      expect(istMidnight.dateString).toBe('2026-11-18');
    });

    it('does NOT hijack today record if employee punched in yesterday morning 7 AM without punching out', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ changes: 1 });
      
      // Yesterday 7:00 AM IST punch-in (01:30 UTC)
      const yesterdayMorningPunch = '2026-11-17T01:30:00.000Z';
      
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-NISHANT', name: 'Nishant', user_email: 'nishant@luxeworx.com' }) // employee
        .mockResolvedValueOnce(null) // todayRecord: null (hasn't punched in today)
        .mockResolvedValueOnce({
          id: 101,
          employee_id: 'EMP-NISHANT',
          date: '2026-11-17',
          punch_in_time: yesterdayMorningPunch,
          punch_out_time: null,
          status: 'present'
        }) // openPastShift from yesterday morning
        .mockResolvedValueOnce({ project: 'The Grand Atelier' }); // allocation

      const res = await getMyAttendanceToday(empSession);

      // Crucial: record must be null so UI allows punching in today!
      expect(res.record).toBeNull();
      expect(res.isOvernightShift).toBe(false);
      // Yesterday's record was recognized as missed punch out
      expect(res.recentMissedPunch).not.toBeNull();
      expect(res.recentMissedPunch?.date).toBe('2026-11-17');
      expect(res.recentMissedPunch?.status).toBe('half_day');
      // Auto-closed in DB
      expect(db.queryRun).toHaveBeenCalled();
    });

    it('auto-closes yesterday unclosed shift when employee punches in today', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ changes: 1, lastInsertRowid: 202 });
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-NISHANT', name: 'Nishant', user_email: 'nishant@luxeworx.com' }) // employee
        .mockResolvedValueOnce({ project: 'Tower B' }) // allocation
        .mockResolvedValueOnce(null) // geofence
        .mockResolvedValueOnce(null); // existingRecord today: none

      const res = await punchAttendance(
        {
          type: 'in',
          selfie: 'data:image/jpeg;base64,newpunch123',
          latitude: 28.4900,
          longitude: 77.0900
        },
        empSession
      );

      expect(res.success).toBe(true);
      expect(res.type).toBe('in');
      // queryRun was called to auto-close yesterday's dangling shift AND insert today's new record
      expect(db.queryRun).toHaveBeenCalled();
    });

    it('permits updating punch out if new departure time is later on the same day', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ changes: 1 });
      const earlierPunchOut = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      const punchInTime = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(); // 10 hours ago

      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-001', name: 'Ravi' }) // employee
        .mockResolvedValueOnce({ project: 'HQ' }) // allocation
        .mockResolvedValueOnce(null) // geofence
        .mockResolvedValueOnce({
          id: 50,
          employee_id: 'EMP-001',
          date: getLocalDateString(),
          punch_in_time: punchInTime,
          punch_out_time: earlierPunchOut
        }); // already punched out earlier

      const res = await punchAttendance(
        {
          type: 'out',
          selfie: 'data:image/jpeg;base64,updated_out',
          latitude: 28.49,
          longitude: 77.09
        },
        empSession
      );

      expect(res.success).toBe(true);
      expect(res.type).toBe('out');
      expect(res.totalHours).toBeGreaterThanOrEqual(9.9);
    });
  });
});
