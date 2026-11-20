import { queryAll, queryGet, queryRun, queryBatch } from '../db.js';
import { initEnterpriseUpgradeSchemas } from './schema-upgrade.js';
import { logAudit } from './core.js';
import crypto from 'node:crypto';

function requireAuth(session) {
  const email = session?.email || session?.user?.email;
  if (!session || !email) {
    throw new Error('AUTH: Not signed in');
  }
}

function unwrap(val) {
  if (val && typeof val === 'object' && val.arg !== undefined) return val.arg;
  return val;
}

/**
 * Get or initialize the Project Schedule for a given project.
 */
export async function getProjectSchedule(project, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const projName = unwrap(project);
  if (!projName) throw new Error('Project name is required');

  let schedule = await queryGet(`SELECT * FROM project_schedules WHERE project = ?`, [projName]);
  if (!schedule) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await queryRun(
      `INSERT INTO project_schedules (id, project, title, baseline_start_date, baseline_end_date, status, version, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Active', 1, ?, ?, ?)`,
      [id, projName, `${projName} Master Schedule`, now.split('T')[0], now.split('T')[0], session?.email || 'admin', now, now]
    );
    schedule = await queryGet(`SELECT * FROM project_schedules WHERE id = ?`, [id]);
  }

  return schedule;
}

/**
 * List all scheduled tasks for a project with dynamic overdue calculations.
 */
export async function listProjectScheduleTasks(params, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const p = unwrap(params) || {};
  const project = typeof p === 'string' ? p : p.project;
  if (!project) throw new Error('Project name is required');

  let sql = `SELECT * FROM schedule_tasks WHERE project = ?`;
  const args = [project];

  if (p.work_package && p.work_package !== 'all') {
    sql += ` AND work_package = ?`;
    args.push(p.work_package);
  }
  if (p.assigned_to_id) {
    sql += ` AND assigned_to_id = ?`;
    args.push(p.assigned_to_id);
  }
  if (p.status && p.status !== 'all') {
    sql += ` AND status = ?`;
    args.push(p.status);
  }

  sql += ` ORDER BY planned_start_date ASC, sort_order ASC`;
  const tasks = await queryAll(sql, args);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs = new Date(todayStr).getTime();

  return tasks.map(t => {
    const plannedEndMs = new Date(t.planned_end_date).getTime();
    const isCompleted = t.status === 'Completed';
    const isOverdue = !isCompleted && t.planned_end_date && plannedEndMs < todayMs;
    const overdueDays = isOverdue ? Math.max(1, Math.round((todayMs - plannedEndMs) / (1000 * 60 * 60 * 24))) : 0;

    let computedHealth = 'on_track';
    if (isCompleted) {
      computedHealth = 'completed';
    } else if (isOverdue) {
      computedHealth = overdueDays > 5 ? 'critical' : 'delayed';
    } else if (t.status === 'Blocked') {
      computedHealth = 'blocked';
    }

    return {
      ...t,
      is_overdue: isOverdue,
      overdue_days: overdueDays,
      health: computedHealth
    };
  });
}

/**
 * Save or update a scheduled task.
 */
export async function saveScheduleTask(taskData, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const data = unwrap(taskData);
  if (!data?.project) throw new Error('Project is required');
  if (!data?.title || !data.title.trim()) throw new Error('Task title is required');
  if (!data?.planned_start_date || !data?.planned_end_date) {
    throw new Error('Planned Start and End dates are required');
  }

  const schedule = await getProjectSchedule(data.project, session);
  const now = new Date().toISOString();
  const taskId = data.id || crypto.randomUUID();
  const taskNo = data.task_no || `TSK-${Date.now().toString().slice(-4)}`;
  const title = data.title.trim();
  const description = data.description || '';
  const workPackage = data.work_package || 'General';
  const boqItemId = data.boq_item_id || null;
  const boqSectionId = data.boq_section_id || null;
  const assignedToId = data.assigned_to_id || null;
  const assignedToName = data.assigned_to_name || null;
  const accountableOwnerId = data.accountable_owner_id || assignedToId;
  const accountableOwnerName = data.accountable_owner_name || assignedToName;
  const plannedStart = data.planned_start_date;
  const plannedEnd = data.planned_end_date;
  const priority = data.priority || 'Medium';
  const dependencies = Array.isArray(data.dependencies) ? JSON.stringify(data.dependencies) : (data.dependencies || '[]');
  const plannedQty = Number(data.planned_qty) || 0;
  const actualQty = Number(data.actual_qty) || 0;
  const uom = data.uom || 'Nos';
  const progressPct = Math.min(100, Math.max(0, Number(data.progress_pct) || 0));
  const status = data.status || (progressPct === 100 ? 'Completed' : progressPct > 0 ? 'In Progress' : 'Not Started');
  const delayReason = data.delay_reason || '';
  const blockers = data.blockers || '';

  if (data.id) {
    // Update
    await queryRun(
      `UPDATE schedule_tasks 
       SET title = ?, description = ?, work_package = ?, boq_item_id = ?, boq_section_id = ?,
           assigned_to_id = ?, assigned_to_name = ?, accountable_owner_id = ?, accountable_owner_name = ?,
           planned_start_date = ?, planned_end_date = ?, priority = ?, dependencies = ?,
           planned_qty = ?, actual_qty = ?, uom = ?, progress_pct = ?, status = ?,
           delay_reason = ?, blockers = ?, updated_at = ?
       WHERE id = ?`,
      [
        title, description, workPackage, boqItemId, boqSectionId,
        assignedToId, assignedToName, accountableOwnerId, accountableOwnerName,
        plannedStart, plannedEnd, priority, dependencies,
        plannedQty, actualQty, uom, progressPct, status,
        delayReason, blockers, now, taskId
      ]
    );

    await logAudit(session?.email || 'admin', 'Update Schedule Task', `Updated task "${title}" (#${taskId})`, 'Schedule');
  } else {
    // Insert
    await queryRun(
      `INSERT INTO schedule_tasks 
       (id, schedule_id, project, task_no, title, description, work_package, boq_item_id, boq_section_id,
        assigned_to_id, assigned_to_name, accountable_owner_id, accountable_owner_name,
        planned_start_date, planned_end_date, priority, dependencies, planned_qty, actual_qty, uom,
        progress_pct, status, delay_reason, blockers, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId, schedule.id, data.project, taskNo, title, description, workPackage, boqItemId, boqSectionId,
        assignedToId, assignedToName, accountableOwnerId, accountableOwnerName,
        plannedStart, plannedEnd, priority, dependencies, plannedQty, actualQty, uom,
        progressPct, status, delayReason, blockers, now, now
      ]
    );

    await logAudit(session?.email || 'admin', 'Create Schedule Task', `Created task "${title}" for project "${data.project}"`, 'Schedule');
  }

  return { success: true, id: taskId, task_no: taskNo };
}

/**
 * Delete a scheduled task.
 */
export async function deleteScheduleTask(id, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const taskId = unwrap(id);
  const task = await queryGet(`SELECT * FROM schedule_tasks WHERE id = ?`, [taskId]);
  if (!task) throw new Error('Task not found');

  await queryRun(`DELETE FROM schedule_tasks WHERE id = ?`, [taskId]);
  await logAudit(session?.email || 'admin', 'Delete Schedule Task', `Deleted task "${task.title}"`, 'Schedule');
  return { success: true };
}

/**
 * Direct task progress update triggered by DPR submission or supervisor verification.
 */
export async function updateTaskProgressFromDpr(progressPayload, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const p = unwrap(progressPayload);
  const { taskId, progressPct, executedQty, isCompleted, delayReason, blockers, dprId } = p;
  if (!taskId) throw new Error('Task ID is required');

  const task = await queryGet(`SELECT * FROM schedule_tasks WHERE id = ?`, [taskId]);
  if (!task) throw new Error(`Scheduled task ${taskId} not found.`);

  const now = new Date().toISOString();
  const numProgress = isCompleted ? 100 : Math.min(100, Math.max(0, Number(progressPct ?? task.progress_pct)));
  const newActualQty = Number(executedQty ?? task.actual_qty ?? 0);
  if (!Number.isFinite(newActualQty) || newActualQty < 0) throw new Error("Invalid executed quantity");

  let newStatus = task.status;
  let completionDate = task.completion_date;
  let completedBy = task.completed_by;

  if (isCompleted || numProgress >= 100) {
    newStatus = 'Completed';
    completionDate = now.split('T')[0];
    completedBy = session?.email || session?.name || 'Site Staff';
  } else {
    newStatus = numProgress > 0 || newActualQty > 0 ? 'In Progress' : 'Not Started';
    completionDate = null;
    completedBy = null;
  }

  await queryRun(
    `UPDATE schedule_tasks 
     SET progress_pct = ?, actual_qty = ?, status = ?, completion_date = ?,
         completed_by = ?, linked_dpr_id = ?, delay_reason = COALESCE(?, delay_reason),
         blockers = COALESCE(?, blockers), updated_at = ?
     WHERE id = ?`,
    [numProgress, newActualQty, newStatus, completionDate, completedBy, dprId || null, delayReason || null, blockers || null, now, taskId]
  );

  // Record Task History
  await queryRun(
    `INSERT INTO schedule_task_history 
     (id, task_id, action, changed_by, prev_progress, new_progress, prev_status, new_status, dpr_id, remarks, created_at)
     VALUES (?, ?, 'DPR_PROGRESS_UPDATE', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(), taskId, session?.email || 'System',
      task.progress_pct, numProgress, task.status, newStatus,
      dprId || null, delayReason || 'Progress recorded via DPR', now
    ]
  );

  return { success: true, taskId, newStatus, numProgress };
}

/**
 * Import line items or sections from Project BOQ directly into Schedule tasks.
 */
export async function importBoqItemsToSchedule(payload, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const data = unwrap(payload) || {};
  const { project, items = [] } = data;
  if (!project) throw new Error('Project name is required');
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one item is required to import');
  }

  const schedule = await getProjectSchedule(project, session);
  const now = new Date().toISOString();
  let importedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.title || !it.title.trim()) continue;

    const taskId = crypto.randomUUID();
    const taskNo = `TSK-${Date.now().toString().slice(-4)}-${i + 1}`;
    const startStr = it.start_date || now.split('T')[0];
    const durationDays = Math.max(1, parseInt(it.duration_days, 10) || 7);
    const startObj = new Date(startStr);
    const endObj = new Date(startObj.getTime() + (durationDays - 1) * 86400000);
    const endStr = it.end_date || endObj.toISOString().split('T')[0];

    await queryRun(
      `INSERT INTO schedule_tasks 
       (id, schedule_id, project, task_no, title, description, work_package, boq_item_id, boq_section_id,
        assigned_to_id, assigned_to_name, accountable_owner_id, accountable_owner_name,
        planned_start_date, planned_end_date, priority, dependencies, planned_qty, actual_qty, uom,
        progress_pct, status, delay_reason, blockers, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId, schedule.id, project, taskNo, it.title.trim(), it.description || '', it.work_package || 'General',
        it.boq_item_id || null, it.boq_section_id || null,
        it.assigned_to_id || null, it.assigned_to_name || null,
        it.accountable_owner_id || it.assigned_to_id || null, it.accountable_owner_name || it.assigned_to_name || null,
        startStr, endStr, it.priority || 'Medium', '[]',
        Number(it.planned_qty) || 0, 0, it.uom || 'Nos',
        0, 'Not Started', '', '', now, now
      ]
    );
    importedCount++;
  }

  await logAudit(session?.email || 'admin', 'Import BOQ Tasks', `Imported ${importedCount} tasks from BOQ into schedule for project "${project}"`, 'Schedule');

  return { success: true, imported: importedCount };
}
