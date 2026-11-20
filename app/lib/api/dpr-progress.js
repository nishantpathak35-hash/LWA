import { queryGet, queryRun } from '../db.js';

function reportedTasks(report) {
  const result = new Map();
  if (!report) return result;
  const data = typeof report.data === 'string' ? JSON.parse(report.data || '{}') : report.data;
  for (const floor of data?.floors || []) {
    for (const work of floor.workDone || []) {
      if (!work.schedule_task_id) continue;
      const qty = Number(work.executed_qty || 0);
      if (!Number.isFinite(qty) || qty < 0) throw new Error('Executed quantity must be zero or greater');
      const entry = result.get(work.schedule_task_id) || { qty: 0, progress: 0 };
      entry.qty += qty;
      entry.progress = Math.max(entry.progress, work.is_completed ? 100 : Number(work.progress_pct || 0));
      entry.reason = work.delay_reason || entry.reason;
      entry.blockers = work.blockers || entry.blockers;
      result.set(work.schedule_task_id, entry);
    }
  }
  return result;
}

function counts(report) {
  return ['submitted', 'checked', 'approved'].includes(String(report?.approval_status).toLowerCase());
}

// Called inside the same write transaction as the report. A row records exactly
// what the report contributed so retries, edits and removals apply only the difference.
export async function syncReportTasks(previous, current, user) {
  const old = reportedTasks(previous);
  const next = counts(current) ? reportedTasks(current) : new Map();
  const ids = new Set([...old.keys(), ...next.keys()]);
  if (!ids.size) return;
  const report = current || previous;
  const id = String(report.id);
  await queryRun(`CREATE TABLE IF NOT EXISTS dpr_task_contributions (
    report_id TEXT NOT NULL, task_id TEXT NOT NULL, qty REAL NOT NULL, progress REAL NOT NULL,
    PRIMARY KEY(report_id, task_id))`);
  for (const taskId of ids) {
    const task = await queryGet('SELECT * FROM schedule_tasks WHERE id = ?', [taskId]);
    if (!task && !next.has(taskId)) continue;
    if (!task || task.project !== (next.has(taskId) ? current.project : previous.project)) throw new Error('Scheduled task does not belong to this report project');
    const stored = await queryGet('SELECT qty, progress FROM dpr_task_contributions WHERE task_id = ? AND report_id = ?', [taskId, id]);
    let prior = stored;
    if (!prior && previous && old.has(taskId)) {
      const data = typeof previous.data === 'string' ? JSON.parse(previous.data) : previous.data;
      const legacy = await queryGet(`SELECT 1 FROM schedule_task_history WHERE task_id = ? AND dpr_id IN (?, ?)
        AND action = 'DPR_PROGRESS_UPDATE' LIMIT 1`, [taskId, id, data?.seqId || previous.date]);
      if (legacy) prior = old.get(taskId);
    }
    const entry = next.get(taskId);
    if (!prior && !entry) continue;
    if (entry) {
      await queryRun(`INSERT INTO dpr_task_contributions VALUES (?, ?, ?, ?)
        ON CONFLICT(report_id, task_id) DO UPDATE SET qty=excluded.qty, progress=excluded.progress`, [id, taskId, entry.qty, entry.progress]);
    } else {
      await queryRun('DELETE FROM dpr_task_contributions WHERE report_id = ? AND task_id = ?', [id, taskId]);
    }
    const actual = Math.max(0, Number(task.actual_qty || 0) + (entry?.qty || 0) - (prior?.qty || 0));
    // Preserve the manually recorded baseline and contributions from other reports.
    const baseline = await queryGet(`SELECT prev_progress, prev_status FROM schedule_task_history
      WHERE task_id = ? ORDER BY created_at, rowid LIMIT 1`, [taskId]);
    const manual = await queryGet(`SELECT new_progress, new_status FROM schedule_task_history
      WHERE task_id = ? AND dpr_id IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1`, [taskId]);
    const remaining = await queryGet('SELECT report_id, progress FROM dpr_task_contributions WHERE task_id = ? ORDER BY progress DESC, rowid DESC LIMIT 1', [taskId]);
    const baseProgress = Number(manual?.new_progress ?? baseline?.prev_progress ?? task.progress_pct ?? 0);
    const progress = Math.min(100, Math.max(baseProgress, remaining?.progress || 0));
    const status = progress >= 100 ? 'Completed' : progress > 0 || actual > 0 ? 'In Progress' : (manual?.new_status || baseline?.prev_status || 'Not Started');
    const now = new Date().toISOString();
    await queryRun(`UPDATE schedule_tasks SET actual_qty=?, progress_pct=?, status=?, linked_dpr_id=?, completion_date=?,
      completed_by=?, delay_reason=COALESCE(?,delay_reason), blockers=COALESCE(?,blockers), updated_at=? WHERE id=?`,
      [actual, progress, status, remaining?.report_id ?? null, status === 'Completed' ? task.completion_date || report.date : null,
        status === 'Completed' ? task.completed_by || user.email : null, entry?.reason || null, entry?.blockers || null, now, taskId]);
    await queryRun(`INSERT INTO schedule_task_history
      (id,task_id,action,changed_by,prev_progress,new_progress,prev_status,new_status,dpr_id,created_at)
      VALUES (?,?, 'DPR_SYNC',?,?,?,?,?,?,?)`, [crypto.randomUUID(), taskId, user.email, task.progress_pct, progress, task.status, status, id, now]);
  }
}
