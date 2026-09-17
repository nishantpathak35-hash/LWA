import { queryAll, queryGet, queryRun } from '../db.js';
import { createNotification } from './notifications.js';
import { DEFAULT_CONTROL_POLICIES, normalizeControlPolicies } from '../paymentStatus.js';
import { isSuperAdmin } from '../config.js';

let _collaborationTablePromise = null;

export async function ensureCollaborationTables() {
  if (_collaborationTablePromise) return _collaborationTablePromise;
  _collaborationTablePromise = _runCollaborationMigrations();
  return _collaborationTablePromise;
}

async function _runCollaborationMigrations() {
  await Promise.allSettled([
    // Comments & Discussions
    queryRun(`
      CREATE TABLE IF NOT EXISTS record_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        author_email TEXT NOT NULL,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        mentions TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    // Live Activity Logs
    queryRun(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    // User Tasks & Action Assignments
    queryRun(`
      CREATE TABLE IF NOT EXISTS user_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assigned_to TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        title TEXT NOT NULL,
        record_type TEXT DEFAULT '',
        record_id TEXT DEFAULT '',
        due_date TEXT DEFAULT '',
        priority TEXT DEFAULT 'normal',
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
  ]);

  // Idempotent column additions for payment_requests query hold flow
  const prQueryColumns = ['query_status', 'query_text', 'query_asked_by', 'query_asked_at', 'query_response', 'query_answered_at'];
  await Promise.allSettled(
    prQueryColumns.map(col => queryRun(`ALTER TABLE payment_requests ADD COLUMN ${col} TEXT`))
  );

  // Idempotent column additions for user_tasks
  const taskColumns = ['priority TEXT DEFAULT \'normal\'', 'description TEXT DEFAULT \'\''];
  await Promise.allSettled(
    taskColumns.map(col => queryRun(`ALTER TABLE user_tasks ADD COLUMN ${col}`))
  );
}

// Log live activity
export async function logActivity(user, action, targetType, targetId, details = '') {
  try {
    await ensureCollaborationTables();
    const uEmail = user?.email || 'system@luxeworx.com';
    const uName = user?.name || user?.email?.split('@')[0] || 'Team Member';
    await queryRun(
      `INSERT INTO activity_logs (user_email, user_name, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [uEmail, uName, action, targetType, String(targetId), details]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

// Comments API
export async function addComment(user, recordType, recordId, content, mentions = []) {
  await ensureCollaborationTables();
  const uEmail = user?.email || 'user@luxeworx.com';
  const uName = user?.name || user?.email?.split('@')[0] || 'Team Member';
  
  const res = await queryRun(
    `INSERT INTO record_comments (record_type, record_id, author_email, author_name, content, mentions) VALUES (?, ?, ?, ?, ?, ?)`,
    [recordType, String(recordId), uEmail, uName, content, JSON.stringify(mentions)]
  );

  await logActivity(user, 'commented on', recordType, recordId, content.substring(0, 80));
  
  // If mentions exist, auto-create task alerts + notifications
  if (Array.isArray(mentions) && mentions.length > 0) {
    for (const mention of mentions) {
      await createTask(user, mention, `Mentioned you in ${recordType} #${recordId}: "${content.substring(0, 50)}..."`, recordType, recordId);
      await createNotification({
        recipientRole: mention,
        type: 'mentioned',
        title: `${uName} mentioned @${mention}`,
        body: `In ${recordType} #${recordId}: "${content.substring(0, 80)}"`,
        recordType,
        recordId: String(recordId),
        actorName: uName,
        actorEmail: uEmail
      });
    }
  }

  return { ok: true, id: Number(res.lastInsertRowid) };
}

export async function getComments(recordType, recordId) {
  await ensureCollaborationTables();
  const rows = await queryAll(
    `SELECT * FROM record_comments WHERE record_type = ? AND record_id = ? ORDER BY id ASC`,
    [recordType, String(recordId)]
  );
  return rows.map(r => ({
    ...r,
    mentions: r.mentions ? JSON.parse(r.mentions) : []
  }));
}

// Query Hold API
export async function requestPaymentClarification(user, paymentId, queryText) {
  await ensureCollaborationTables();
  try {
    const policyRow = await queryGet('SELECT value FROM app_settings WHERE key = ?', ['erp_control_policies']);
    const policies = policyRow?.value ? normalizeControlPolicies(JSON.parse(policyRow.value)) : DEFAULT_CONTROL_POLICIES;
    if (!policies.allow_payment_holds) throw new Error('Payment holds are disabled in ERP control policies');
  } catch (error) {
    if (error?.message === 'Payment holds are disabled in ERP control policies') throw error;
  }
  const uEmail = user?.email || 'approver@luxeworx.com';
  const uName = user?.name || user?.email?.split('@')[0] || 'Approver';
  const now = new Date().toISOString();

  await queryRun(
    `UPDATE payment_requests SET query_status = 'hold', query_text = ?, query_asked_by = ?, query_asked_at = ? WHERE id = ? OR pr_id = ?`,
    [queryText, `${uName} (${uEmail})`, now, paymentId, paymentId]
  );

  await logActivity(user, 'requested clarification for', 'Payment Request', paymentId, queryText);
  await addComment(user, 'Payment Request', paymentId, `❓ Query Hold Requested: "${queryText}"`);

  // Notify procurement / creator that a query hold was placed
  await createNotification({
    recipientRole: 'procurement',
    type: 'query_hold',
    title: `Query Hold on PR #${paymentId}`,
    body: `${uName} requested clarification: "${queryText.substring(0, 80)}"`,
    recordType: 'Payment Request',
    recordId: String(paymentId),
    actorName: uName,
    actorEmail: uEmail
  });

  return { ok: true, message: 'Clarification requested and payment placed on hold.' };
}

export async function answerPaymentClarification(user, paymentId, responseText) {
  await ensureCollaborationTables();
  const uEmail = user?.email || 'requester@luxeworx.com';
  const uName = user?.name || user?.email?.split('@')[0] || 'Requester';
  const now = new Date().toISOString();

  await queryRun(
    `UPDATE payment_requests SET query_status = 'answered', query_response = ?, query_answered_at = ? WHERE id = ? OR pr_id = ?`,
    [responseText, now, paymentId, paymentId]
  );

  await logActivity(user, 'answered clarification for', 'Payment Request', paymentId, responseText);
  await addComment(user, 'Payment Request', paymentId, `✅ Clarification Answered: "${responseText}"`);

  // Notify finance/director that clarification was answered
  await createNotification({
    recipientRole: 'finance',
    type: 'query_answered',
    title: `Clarification Answered for PR #${paymentId}`,
    body: `${uName} responded: "${responseText.substring(0, 80)}"`,
    recordType: 'Payment Request',
    recordId: String(paymentId),
    actorName: uName,
    actorEmail: uEmail
  });

  return { ok: true, message: 'Clarification response submitted.' };
}

// Activity Stream API
export async function getActivityStream(limit = 30) {
  await ensureCollaborationTables();
  return queryAll(
    `SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?`,
    [limit]
  );
}

// User Tasks & Action Allocation API
export async function allocateTask(user, taskData) {
  await ensureCollaborationTables();
  if (!taskData || typeof taskData !== 'object') {
    throw new Error('Task details are required');
  }
  const title = (taskData.title || '').trim();
  const assignedTo = (taskData.assignedTo || taskData.assigned_to || '').trim().toLowerCase();
  if (!title) throw new Error('Task title is required');
  if (!assignedTo) throw new Error('Please select who to allocate this task to');

  const uEmail = user?.email || 'system@luxeworx.com';
  const uName = user?.name || user?.email?.split('@')[0] || 'Team Member';
  const recordType = (taskData.recordType || taskData.record_type || '').trim();
  const recordId = String(taskData.recordId || taskData.record_id || '').trim();
  const dueDate = (taskData.dueDate || taskData.due_date || '').trim();
  const priority = (taskData.priority || 'normal').toLowerCase().trim();
  const description = (taskData.description || '').trim();

  const res = await queryRun(
    `INSERT INTO user_tasks (assigned_to, assigned_by, title, record_type, record_id, due_date, priority, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [assignedTo, uEmail, title, recordType, recordId, dueDate, priority, description]
  );

  const taskId = Number(res.lastInsertRowid);

  // Notify assignee via in-app notifications
  try {
    await createNotification({
      recipientRole: assignedTo,
      type: 'task_assigned',
      title: `Task Allocated: ${title.substring(0, 50)}`,
      body: `${uName} allocated a task: "${title.substring(0, 70)}"${dueDate ? ` (Due: ${dueDate})` : ''}`,
      recordType: recordType || 'Task',
      recordId: recordId || String(taskId),
      actorName: uName,
      actorEmail: uEmail
    });
  } catch (notifErr) {
    console.error("Failed to create task notification:", notifErr);
  }

  await logActivity(user, 'allocated task to', assignedTo, title);

  return { ok: true, id: taskId, message: 'Task allocated successfully' };
}

export async function createTask(user, assignedTo, title, recordType = '', recordId = '', dueDate = '', priority = 'normal', description = '') {
  if (assignedTo && typeof assignedTo === 'object') {
    return allocateTask(user, assignedTo);
  }
  return allocateTask(user, {
    assignedTo,
    title,
    recordType,
    recordId,
    dueDate,
    priority,
    description
  });
}

export async function getUserTasks(user) {
  await ensureCollaborationTables();
  const uEmail = (user?.email || '').toLowerCase().trim();
  const roles = (user?.roles || []).map(r => String(r).toLowerCase().trim());
  const isSuper = isSuperAdmin(uEmail);
  const isDirector = isSuper || roles.includes('director') || roles.includes('admin');
  const isFinance = isSuper || roles.includes('finance') || roles.includes('accountant') || roles.includes('admin') || roles.includes('director');
  const isProcurement = isSuper || roles.some(r => ['proc', 'procurement', 'maker', 'admin', 'director'].includes(r));
  const isAdmin = isSuper || roles.includes('admin');

  // 1. Fetch Explicit Tasks assigned to this user from user_tasks
  const rolePlaceholders = roles.map(() => '?').join(', ');
  let taskQuery = `SELECT * FROM user_tasks WHERE (LOWER(assigned_to) = ? OR LOWER(assigned_to) = 'all'`;
  const taskParams = [uEmail];
  if (roles.length > 0) {
    taskQuery += ` OR LOWER(assigned_to) IN (${rolePlaceholders})`;
    taskParams.push(...roles);
  }
  taskQuery += `) ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, id DESC LIMIT 50`;

  let assignedTasks = [];
  try {
    assignedTasks = await queryAll(taskQuery, taskParams);
  } catch (err) {
    console.error("Error loading user_tasks:", err);
  }

  // 2. Fetch Tasks allocated by this user to others
  let allocatedByMe = [];
  try {
    allocatedByMe = await queryAll(
      `SELECT * FROM user_tasks WHERE LOWER(assigned_by) = ? ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, id DESC LIMIT 50`,
      [uEmail]
    );
  } catch (err) {
    console.error("Error loading allocatedByMe:", err);
  }

  // 3. Fetch Live Workflow Pending Actions (Approvals, Query Holds, Remittances, POs)
  const workflowActions = [];

  // A. Payment Requests workflow actions
  try {
    const pendingPRs = await queryAll(`
      SELECT pr_id, po_no, vendor_name, project, amount_requested, approved_amount, stage,
             proc_approval, finance_approval, director_approval, query_status, query_text,
             query_asked_by, query_asked_at, created_by, created_at, is_overbudget_approval
      FROM payment_requests
      WHERE LOWER(stage) NOT LIKE '%reject%' AND LOWER(stage) NOT LIKE '%cancel%'
      ORDER BY pr_id DESC LIMIT 100
    `);

    for (const pr of pendingPRs) {
      const stage = String(pr.stage || '').toLowerCase();
      const isHold = String(pr.query_status || '').toLowerCase() === 'hold';
      const isCreator = uEmail && String(pr.created_by || '').toLowerCase().trim() === uEmail;
      const grossAmt = Number(pr.amount_requested || pr.approved_amount || 0);

      // Query Hold action: Needs creator response
      if (isHold) {
        if (isCreator || isProcurement || isAdmin) {
          workflowActions.push({
            id: `query-pr-${pr.pr_id}`,
            task_type: 'query_hold',
            title: `Query Hold on PR #${pr.pr_id}: "${pr.query_text ? pr.query_text.substring(0, 60) : 'Clarification needed'}"`,
            record_type: 'Payment Request',
            record_id: String(pr.pr_id),
            assigned_by: pr.query_asked_by || 'Approver',
            assigned_to: uEmail,
            priority: 'urgent',
            status: 'pending',
            due_date: '',
            is_workflow: true,
            created_at: pr.query_asked_at || pr.created_at,
            details: `Vendor: ${pr.vendor_name || 'N/A'} • Amount: ₹${grossAmt.toLocaleString('en-IN')}`,
            action_url: `/payments?id=${pr.pr_id}&action=query`
          });
        }
        continue;
      }

      // Procurement approval (Level 1)
      if (stage.includes('proc') || stage === 'pending' || String(pr.proc_approval || '').toLowerCase() === 'pending') {
        if (isProcurement || isAdmin || isDirector) {
          workflowActions.push({
            id: `approval-proc-pr-${pr.pr_id}`,
            task_type: 'payment_approval',
            title: `Procurement Approval: PR #${pr.pr_id} (${pr.vendor_name || 'Vendor'})`,
            record_type: 'Payment Request',
            record_id: String(pr.pr_id),
            assigned_by: pr.created_by || 'Maker',
            assigned_to: 'procurement',
            priority: 'high',
            status: 'pending',
            due_date: '',
            is_workflow: true,
            created_at: pr.created_at,
            details: `Project: ${pr.project || 'General'} • Amount: ₹${grossAmt.toLocaleString('en-IN')}`,
            action_url: `/payments?id=${pr.pr_id}&action=approve`
          });
        }
      }
      // Finance approval (Level 2)
      else if (stage.includes('finance') || String(pr.finance_approval || '').toLowerCase() === 'pending') {
        if (isFinance || isAdmin || isDirector) {
          workflowActions.push({
            id: `approval-fin-pr-${pr.pr_id}`,
            task_type: 'payment_approval',
            title: `Finance Approval: PR #${pr.pr_id} (${pr.vendor_name || 'Vendor'})`,
            record_type: 'Payment Request',
            record_id: String(pr.pr_id),
            assigned_by: 'Procurement',
            assigned_to: 'finance',
            priority: 'high',
            status: 'pending',
            due_date: '',
            is_workflow: true,
            created_at: pr.created_at,
            details: `Project: ${pr.project || 'General'} • Amount: ₹${grossAmt.toLocaleString('en-IN')}`,
            action_url: `/payments?id=${pr.pr_id}&action=approve`
          });
        }
      }
      // Director approval (Level 3 or Overbudget)
      else if (stage.includes('director') || String(pr.director_approval || '').toLowerCase() === 'pending' || pr.is_overbudget_approval) {
        if (isDirector || isAdmin) {
          workflowActions.push({
            id: `approval-dir-pr-${pr.pr_id}`,
            task_type: 'payment_approval',
            title: `Director Approval: PR #${pr.pr_id} (${pr.vendor_name || 'Vendor'})${pr.is_overbudget_approval ? ' [OVERBUDGET]' : ''}`,
            record_type: 'Payment Request',
            record_id: String(pr.pr_id),
            assigned_by: 'Finance',
            assigned_to: 'director',
            priority: 'urgent',
            status: 'pending',
            due_date: '',
            is_workflow: true,
            created_at: pr.created_at,
            details: `Project: ${pr.project || 'General'} • Amount: ₹${grossAmt.toLocaleString('en-IN')}`,
            action_url: `/payments?id=${pr.pr_id}&action=approve`
          });
        }
      }
      // Remittance Disbursal
      else if (stage.includes('remit') || stage === 'approved') {
        if (isFinance || isAdmin || isDirector) {
          workflowActions.push({
            id: `remit-pr-${pr.pr_id}`,
            task_type: 'payment_remittance',
            title: `Ready to Remit: PR #${pr.pr_id} (${pr.vendor_name || 'Vendor'})`,
            record_type: 'Payment Request',
            record_id: String(pr.pr_id),
            assigned_by: 'Director',
            assigned_to: 'finance',
            priority: 'normal',
            status: 'pending',
            due_date: '',
            is_workflow: true,
            created_at: pr.created_at,
            details: `Net Payable: ₹${grossAmt.toLocaleString('en-IN')} • Project: ${pr.project || 'General'}`,
            action_url: `/reports?id=${pr.pr_id}&action=remit`
          });
        }
      }
    }
  } catch (err) {
    console.error("Error loading payment workflow tasks:", err);
  }

  // B. Purchase Orders Pending Approval (For Director & Admin)
  if (isDirector || isAdmin) {
    try {
      const pendingPOs = await queryAll(`
        SELECT po_no, vendor_name, project, po_value, status, approval_status, created_at
        FROM purchase_orders
        WHERE LOWER(approval_status) LIKE '%pending%' OR (LOWER(status) = 'pending' AND LOWER(approval_status) != 'approved')
        ORDER BY created_at DESC LIMIT 25
      `);

      for (const po of pendingPOs) {
        workflowActions.push({
          id: `approval-po-${po.po_no}`,
          task_type: 'po_approval',
          title: `Approve Purchase Order: ${po.po_no} (${po.vendor_name || 'Vendor'})`,
          record_type: 'Purchase Order',
          record_id: String(po.po_no),
          assigned_by: 'Procurement',
          assigned_to: 'director',
          priority: 'high',
          status: 'pending',
          due_date: '',
          is_workflow: true,
          created_at: po.created_at,
          details: `PO Value: ₹${Number(po.po_value || 0).toLocaleString('en-IN')} • Project: ${po.project || 'General'}`,
          action_url: `/pos?po=${po.po_no}`
        });
      }
    } catch (err) {
      console.error("Error loading PO approval tasks:", err);
    }
  }

  const normalizedAssigned = assignedTasks.map(t => ({
    ...t,
    task_type: t.record_type ? 'allocated_task' : 'general_task',
    is_workflow: false
  }));

  const combined = [...normalizedAssigned, ...workflowActions];
  combined.allocatedByMe = allocatedByMe;
  combined.workflowCount = workflowActions.length;
  combined.taskCount = normalizedAssigned.length;

  return combined;
}

export async function updateTaskStatus(taskId, status) {
  await ensureCollaborationTables();
  if (typeof taskId === 'number' || /^\d+$/.test(String(taskId))) {
    await queryRun(
      `UPDATE user_tasks SET status = ? WHERE id = ?`,
      [status, Number(taskId)]
    );
    return { ok: true };
  }
  return { ok: true, is_workflow: true };
}
