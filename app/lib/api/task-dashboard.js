import { queryAll, queryGet } from '../db.js';
import { initEnterpriseUpgradeSchemas } from './schema-upgrade.js';

function requireAuth(session) {
  if (!session || !session.email) {
    throw new Error('AUTH: Not signed in');
  }
}

function unwrap(val) {
  if (val && typeof val === 'object' && val.arg !== undefined) return val.arg;
  return val;
}

/**
 * 1. Employee Dashboard: Personalized tasks and DPR obligations.
 */
export async function getEmployeeTaskDashboard(session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  // Resolve employee ID from session
  const emp = await queryGet(
    `SELECT employee_id, name FROM site_employees WHERE LOWER(user_email) = LOWER(?) OR LOWER(email) = LOWER(?)`,
    [session.email, session.email]
  );
  const employeeId = emp?.employee_id;
  const employeeName = emp?.name || session.email.split('@')[0];

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs = new Date(todayStr).getTime();

  let myTasks = [];
  if (employeeId) {
    myTasks = await queryAll(
      `SELECT * FROM schedule_tasks 
       WHERE (assigned_to_id = ? OR accountable_owner_id = ? OR LOWER(assigned_to_name) = LOWER(?))
       ORDER BY planned_end_date ASC`,
      [employeeId, employeeId, employeeName]
    );
  } else {
    myTasks = await queryAll(
      `SELECT * FROM schedule_tasks 
       WHERE LOWER(assigned_to_name) = LOWER(?) OR LOWER(accountable_owner_name) = LOWER(?)
       ORDER BY planned_end_date ASC`,
      [employeeName, employeeName]
    );
  }

  let assignedCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let overdueCount = 0;
  const overdueTasks = [];
  const upcomingTasks = [];
  const activeTasks = [];

  myTasks.forEach(t => {
    assignedCount++;
    const plannedEndMs = new Date(t.planned_end_date).getTime();
    const isCompleted = t.status === 'Completed';
    const isOverdue = !isCompleted && t.planned_end_date && plannedEndMs < todayMs;
    const overdueDays = isOverdue ? Math.max(1, Math.round((todayMs - plannedEndMs) / (1000 * 60 * 60 * 24))) : 0;

    const taskObj = {
      ...t,
      is_overdue: isOverdue,
      overdue_days: overdueDays
    };

    if (isCompleted) {
      completedCount++;
    } else {
      if (t.status === 'In Progress') inProgressCount++;
      activeTasks.push(taskObj);

      if (isOverdue) {
        overdueCount++;
        overdueTasks.push(taskObj);
      } else {
        // Upcoming in next 3 days
        const daysUntilDue = Math.round((plannedEndMs - todayMs) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 3 && daysUntilDue >= 0) {
          upcomingTasks.push({ ...taskObj, days_until_due: daysUntilDue });
        }
      }
    }
  });

  // Check if DPR submitted today
  const todayDpr = await queryGet(
    `SELECT id, project, created_at FROM dpr_reports 
     WHERE prepared_by = ? AND date = ? LIMIT 1`,
    [session.email, todayStr]
  );

  return {
    employeeName,
    employeeId: employeeId || 'N/A',
    metrics: {
      totalAssigned: assignedCount,
      inProgress: inProgressCount,
      completed: completedCount,
      overdue: overdueCount,
      hasPendingDpr: activeTasks.length > 0 && !todayDpr
    },
    todayDprSubmitted: Boolean(todayDpr),
    overdueTasks,
    upcomingTasks,
    activeTasks
  };
}

/**
 * 2. Project Manager Dashboard: Project-level task tracking & employee completion metrics.
 */
export async function getProjectManagerTaskDashboard(project, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const projName = unwrap(project);
  if (!projName) throw new Error('Project name is required');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs = new Date(todayStr).getTime();

  const tasks = await queryAll(
    `SELECT * FROM schedule_tasks WHERE project = ? ORDER BY planned_end_date ASC`,
    [projName]
  );

  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let overdueTasksCount = 0;
  const overdueList = [];
  const employeeMap = new Map();

  tasks.forEach(t => {
    totalTasks++;
    const plannedEndMs = new Date(t.planned_end_date).getTime();
    const isCompleted = t.status === 'Completed';
    const isOverdue = !isCompleted && t.planned_end_date && plannedEndMs < todayMs;
    const overdueDays = isOverdue ? Math.max(1, Math.round((todayMs - plannedEndMs) / (1000 * 60 * 60 * 24))) : 0;

    if (isCompleted) completedTasks++;
    else if (t.status === 'In Progress') inProgressTasks++;

    const taskAugmented = {
      ...t,
      is_overdue: isOverdue,
      overdue_days: overdueDays
    };

    if (isOverdue) {
      overdueTasksCount++;
      overdueList.push(taskAugmented);
    }

    // Track per assigned employee
    const empName = t.assigned_to_name || 'Unassigned';
    if (!employeeMap.has(empName)) {
      employeeMap.set(empName, {
        name: empName,
        assigned: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0
      });
    }
    const stat = employeeMap.get(empName);
    stat.assigned++;
    if (isCompleted) stat.completed++;
    else if (t.status === 'In Progress') stat.inProgress++;
    if (isOverdue) stat.overdue++;
  });

  return {
    project: projName,
    summary: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasksCount,
      completionPct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    },
    employeePerformance: Array.from(employeeMap.values()),
    overdueTasks: overdueList
  };
}

/**
 * 3. Management Dashboard: Live aggregate matrix across all employees with drill-downs.
 * Table: Employee | Assigned | Completed | In Progress | Overdue | Pending DPR
 */
export async function getManagementTaskDashboard(session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs = new Date(todayStr).getTime();

  // 1. Fetch all site employees
  const employees = await queryAll(
    `SELECT employee_id, name, user_email, email, designation FROM site_employees WHERE status = 'active' ORDER BY name ASC`
  );

  // 2. Fetch all schedule tasks
  const allTasks = await queryAll(`SELECT * FROM schedule_tasks ORDER BY planned_end_date ASC`);

  // 3. Fetch today's DPRs
  const todayDprs = await queryAll(`SELECT prepared_by, project FROM dpr_reports WHERE date = ?`, [todayStr]);
  const dprPreparedEmails = new Set(todayDprs.map(d => String(d.prepared_by || '').toLowerCase()));

  const matrix = employees.map(emp => {
    const empId = emp.employee_id;
    const empName = emp.name;
    const empEmail = String(emp.user_email || emp.email || '').toLowerCase();

    // Match tasks
    const empTasks = allTasks.filter(t => 
      t.assigned_to_id === empId ||
      t.accountable_owner_id === empId ||
      (t.assigned_to_name && t.assigned_to_name.toLowerCase() === empName.toLowerCase())
    );

    let assigned = 0;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    const overdueDetails = [];

    empTasks.forEach(t => {
      assigned++;
      const plannedEndMs = new Date(t.planned_end_date).getTime();
      const isCompleted = t.status === 'Completed';
      const isOverdue = !isCompleted && t.planned_end_date && plannedEndMs < todayMs;
      const overdueDays = isOverdue ? Math.max(1, Math.round((todayMs - plannedEndMs) / (1000 * 60 * 60 * 24))) : 0;

      if (isCompleted) {
        completed++;
      } else {
        if (t.status === 'In Progress') inProgress++;
        if (isOverdue) {
          overdue++;
          overdueDetails.push({
            id: t.id,
            task_no: t.task_no,
            title: t.title,
            project: t.project,
            work_package: t.work_package,
            planned_start_date: t.planned_start_date,
            planned_end_date: t.planned_end_date,
            overdue_days: overdueDays,
            progress_pct: t.progress_pct || 0,
            delay_reason: t.delay_reason || 'No delay reason filed',
            status: t.status
          });
        }
      }
    });

    const hasDprToday = dprPreparedEmails.has(empEmail) || dprPreparedEmails.has(empName.toLowerCase());
    const activeTasksCount = assigned - completed;
    const pendingDpr = activeTasksCount > 0 && !hasDprToday;

    return {
      employee_id: empId,
      name: empName,
      email: empEmail,
      designation: emp.designation,
      assigned,
      completed,
      inProgress,
      overdue,
      pendingDpr,
      has_dpr_today: hasDprToday,
      tasks: empTasks,
      overdueDetails
    };
  });

  const totalOverdue = matrix.reduce((sum, e) => sum + e.overdue, 0);
  const pendingDprCount = matrix.filter(e => e.pendingDpr).length;

  return {
    matrix,
    summary: {
      totalEmployees: matrix.length,
      totalTasksAssigned: allTasks.length,
      totalOverdueTasks: totalOverdue,
      pendingDprEmployeesCount: pendingDprCount
    },
    totalOverdueAcrossCompany: totalOverdue,
    totalTasksAcrossCompany: allTasks.length
  };
}
