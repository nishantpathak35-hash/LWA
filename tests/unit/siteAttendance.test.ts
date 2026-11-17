import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../app/lib/db.js';
import {
  calculateDistanceMeters,
  calculateWorkingHours,
  getLocalDateString,
  punchAttendance,
  createOrUpdateSiteEmployee,
  allocateEmployeeToProject,
  transferEmployeeProject,
  submitAttendanceRegularisation,
  reviewAttendanceRegularisation
} from '../../app/lib/api/attendance.js';

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

    it('rejects punch out if no punch in exists for today', async () => {
      vi.mocked(db.queryRun).mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
      vi.mocked(db.queryGet)
        .mockResolvedValueOnce({ employee_id: 'EMP-001', name: 'Ravi Kumar' }) // employee
        .mockResolvedValueOnce({ project: 'Tower A' }) // allocation
        .mockResolvedValueOnce(null) // geofence
        .mockResolvedValueOnce(null); // existingRecord (none)

      await expect(
        punchAttendance(
          { type: 'out', selfie: 'data:image...', latitude: 28.49, longitude: 77.09 },
          validSession
        )
      ).rejects.toThrow('INVALID_PUNCH_OUT');
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
});
