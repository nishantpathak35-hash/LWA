import { describe, expect, it, vi, beforeEach } from 'vitest';
import { allocateTask, getUserTasks, updateTaskStatus } from '../../app/lib/api/collaboration.js';
import * as db from '../../app/lib/db.js';

describe('Pending Actions & Task Allocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allocates a task with validation and persists to database', async () => {
    const mockUser = { email: 'director@luxeworx.com', name: 'Director Dave' };
    vi.mocked(db.queryRun).mockResolvedValue({ lastInsertRowid: 42 });

    const taskPayload = {
      title: 'Verify site physical delivery for PO-102',
      assignedTo: 'procurement@luxeworx.com',
      priority: 'high',
      dueDate: '2026-09-25',
      recordType: 'Purchase Order',
      recordId: 'PO-102',
      description: 'Check cement bag count with gate security'
    };

    const result = await allocateTask(mockUser, taskPayload);
    expect(result.ok).toBe(true);
    expect(result.id).toBe(42);

    // Verify insert into user_tasks was called with correct parameters
    expect(db.queryRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_tasks'),
      [
        'procurement@luxeworx.com',
        'director@luxeworx.com',
        'Verify site physical delivery for PO-102',
        'Purchase Order',
        'PO-102',
        '2026-09-25',
        'high',
        'Check cement bag count with gate security'
      ]
    );
  });

  it('rejects task allocation when title or assignee is missing', async () => {
    const mockUser = { email: 'admin@luxeworx.com' };
    await expect(allocateTask(mockUser, { title: '', assignedTo: 'user@test.com' })).rejects.toThrow(
      'Task title is required'
    );
    await expect(allocateTask(mockUser, { title: 'Do something', assignedTo: '' })).rejects.toThrow(
      'Please select who to allocate this task to'
    );
  });

  it('aggregates explicit tasks and live workflow approvals in getUserTasks', async () => {
    const mockUser = {
      email: 'finance@luxeworx.com',
      roles: ['finance']
    };

    // 1st queryAll: assignedTasks
    // 2nd queryAll: allocatedByMe
    // 3rd queryAll: pendingPRs
    vi.mocked(db.queryRun).mockResolvedValue({ lastInsertRowid: 1 });
    vi.mocked(db.queryAll)
      .mockResolvedValueOnce([
        {
          id: 10,
          assigned_to: 'finance@luxeworx.com',
          assigned_by: 'director@luxeworx.com',
          title: 'Verify vendor GST compliance',
          status: 'pending'
        }
      ])
      .mockResolvedValueOnce([
        {
          id: 11,
          assigned_to: 'procurement@luxeworx.com',
          assigned_by: 'finance@luxeworx.com',
          title: 'Provide PO copy',
          status: 'pending'
        }
      ])
      .mockResolvedValueOnce([
        {
          pr_id: 101,
          vendor_name: 'Marble Kraft',
          project: 'Villa Aura',
          amount_requested: 250000,
          stage: 'Pending Finance',
          finance_approval: 'Pending',
          query_status: null,
          created_by: 'maker@luxeworx.com'
        }
      ]);

    const result = await getUserTasks(mockUser);

    expect(Array.isArray(result)).toBe(true);
    // Should contain both the explicit task and the finance approval action
    expect(result.length).toBe(2);

    const explicitTask = result.find(t => t.id === 10);
    expect(explicitTask).toBeDefined();
    expect(explicitTask.title).toBe('Verify vendor GST compliance');
    expect(explicitTask.is_workflow).toBe(false);

    const approvalAction = result.find(t => t.id === 'approval-fin-pr-101');
    expect(approvalAction).toBeDefined();
    expect(approvalAction.task_type).toBe('payment_approval');
    expect(approvalAction.is_workflow).toBe(true);
    expect(approvalAction.record_id).toBe('101');

    // Allocated by me list is attached
    expect(result.allocatedByMe).toBeDefined();
    expect(result.allocatedByMe.length).toBe(1);
    expect(result.allocatedByMe[0].title).toBe('Provide PO copy');
  });

  it('updates task status correctly', async () => {
    vi.mocked(db.queryRun).mockResolvedValue({ changes: 1 });
    const res = await updateTaskStatus(10, 'completed');
    expect(res.ok).toBe(true);
    expect(db.queryRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user_tasks SET status = ? WHERE id = ?'),
      ['completed', 10]
    );
  });
});
