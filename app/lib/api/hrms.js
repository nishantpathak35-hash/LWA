// Domain: HRMS (Human Resource Management System) & Workforce Management
// Enterprise-grade employee lifecycle, leave, shifts, holidays, approvals, documents, and payroll attendance export.

import { queryAll, queryGet, queryRun, withWriteTransaction } from '../db.js';
import { isSuperAdmin } from '../config.js';
import { initSiteAttendanceTables, resolveReadableAddress } from './attendance.js';

let _hrmsTablesInitialized = false;

function unwrap(val) {
  if (Array.isArray(val)) return val[0] || {};
  return val || {};
}

function requireAuth(session) {
  if (!session) {
    throw new Error('AUTH: Authentication required');
  }
  const email = session.email || session.user?.email;
  if (!email) {
    throw new Error('AUTH: Authentication required');
  }
  if (!session.user) {
    session.user = {
      email,
      name: session.name || email,
      roles: session.roles || []
    };
  }
  return session.user;
}

function isHRAuthorized(user) {
  if (!user) return false;
  const email = user.email || (typeof user === 'string' ? user : null);
  if (!email) return false;
  if (isSuperAdmin(email)) return true;
  const roles = user.roles || [];
  return roles.some(r => ['admin', 'director', 'hr', 'hr_admin', 'operations'].includes(r));
}

function requireHRAuthorized(session) {
  const user = requireAuth(session);
  if (!isHRAuthorized(user)) {
    throw new Error('AUTH: Access denied. HR or Administrator privileges required.');
  }
  return user;
}

async function requireOwnLeaveRecord(employeeId, user) {
  if (isHRAuthorized(user)) return;
  const owner = await queryGet(`SELECT employee_id FROM site_employees WHERE employee_id = ?
    AND (LOWER(email) = LOWER(?) OR LOWER(user_email) = LOWER(?))`, [employeeId, user.email, user.email]);
  if (!owner) throw new Error('AUTH: Leave record belongs to another employee');
}

async function recordAuditLog(user, actionType, details, department = 'HRMS') {
  try {
    const email = (typeof user === 'object' ? user?.email : user) || 'System';
    await queryRun(
      `INSERT INTO audit_logs (timestamp, user, action_type, details, department) VALUES (?, ?, ?, ?, ?)`,
      [new Date().toISOString(), email, actionType, details, department]
    );
  } catch (err) {
    // Non-fatal audit log fallback
  }
}

/**
 * Initialize all HRMS database tables, constraints, indices and default seeds.
 */
export async function initHrmsTables() {
  if (_hrmsTablesInitialized) return;
  await initSiteAttendanceTables();

  const tables = [
    // 1. Shifts Master
    `CREATE TABLE IF NOT EXISTS hrms_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      grace_minutes INTEGER DEFAULT 15,
      half_day_hours REAL DEFAULT 4.5,
      full_day_hours REAL DEFAULT 8.5,
      break_minutes INTEGER DEFAULT 60,
      is_overnight INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 2. Holidays Master
    `CREATE TABLE IF NOT EXISTS hrms_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      year INTEGER NOT NULL,
      type TEXT DEFAULT 'national',
      location TEXT DEFAULT 'All',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 3. Leave Types Master
    `CREATE TABLE IF NOT EXISTS hrms_leave_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      default_quota_annual REAL DEFAULT 12,
      is_paid INTEGER DEFAULT 1,
      carry_forward_max REAL DEFAULT 0,
      requires_doc INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 4. Leave Balances per Employee
    `CREATE TABLE IF NOT EXISTS hrms_leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      leave_type_code TEXT NOT NULL,
      year INTEGER NOT NULL,
      total_allocated REAL DEFAULT 0,
      used REAL DEFAULT 0,
      pending REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, leave_type_code, year)
    )`,

    // 5. Leave Requests
    `CREATE TABLE IF NOT EXISTS hrms_leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      leave_type_code TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days REAL NOT NULL,
      is_half_day INTEGER DEFAULT 0,
      half_day_type TEXT,
      reason TEXT NOT NULL,
      doc_url TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 6. Shift Requests / Swaps
    `CREATE TABLE IF NOT EXISTS hrms_shift_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      current_shift_id INTEGER,
      requested_shift_id INTEGER NOT NULL,
      effective_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 7. Employee Documents Master
    `CREATE TABLE IF NOT EXISTS hrms_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      verification_status TEXT DEFAULT 'pending',
      expiry_date TEXT,
      notes TEXT,
      uploaded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 8. HR Policies & Announcements
    `CREATE TABLE IF NOT EXISTS hrms_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'announcement',
      content TEXT NOT NULL,
      doc_url TEXT,
      target_dept TEXT DEFAULT 'All',
      target_project TEXT DEFAULT 'All',
      is_pinned INTEGER DEFAULT 0,
      published_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 9. Monthly Payroll Attendance Locks & Audit
    `CREATE TABLE IF NOT EXISTS hrms_payroll_locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      cut_off_start TEXT NOT NULL,
      cut_off_end TEXT NOT NULL,
      is_locked INTEGER DEFAULT 1,
      locked_by TEXT,
      locked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      unlocked_by TEXT,
      unlocked_at DATETIME,
      unlock_reason TEXT,
      notes TEXT,
      version INTEGER DEFAULT 1,
      UNIQUE(month, year)
    )`,

    // 10. HRMS Configurable Policies Settings
    `CREATE TABLE IF NOT EXISTS hrms_policies_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Performance Indices
    `CREATE INDEX IF NOT EXISTS idx_hrms_leave_bal ON hrms_leave_balances(employee_id, year)`,
    `CREATE INDEX IF NOT EXISTS idx_hrms_leave_req ON hrms_leave_requests(employee_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_hrms_docs_emp ON hrms_documents(employee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hrms_holidays_yr ON hrms_holidays(year, date)`
  ];

  for (const sql of tables) {
    try {
      await queryRun(sql);
    } catch (e) {
      // safe fallback if already exists
    }
  }

  // Safe ALTER TABLE additions for site_employees lifecycle and statutory fields
  const alterColumns = [
    `ALTER TABLE hrms_payroll_locks ADD COLUMN snapshot TEXT`,
    `ALTER TABLE site_employees ADD COLUMN joining_date TEXT`,
    `ALTER TABLE site_employees ADD COLUMN probation_months INTEGER DEFAULT 3`,
    `ALTER TABLE site_employees ADD COLUMN confirmation_date TEXT`,
    `ALTER TABLE site_employees ADD COLUMN employment_type TEXT DEFAULT 'full_time'`,
    `ALTER TABLE site_employees ADD COLUMN blood_group TEXT`,
    `ALTER TABLE site_employees ADD COLUMN emergency_contact_name TEXT`,
    `ALTER TABLE site_employees ADD COLUMN emergency_contact_phone TEXT`,
    `ALTER TABLE site_employees ADD COLUMN bank_name TEXT`,
    `ALTER TABLE site_employees ADD COLUMN bank_account_no TEXT`,
    `ALTER TABLE site_employees ADD COLUMN bank_ifsc TEXT`,
    `ALTER TABLE site_employees ADD COLUMN pan_no TEXT`,
    `ALTER TABLE site_employees ADD COLUMN aadhaar_no TEXT`,
    `ALTER TABLE site_employees ADD COLUMN uan_no TEXT`,
    `ALTER TABLE site_employees ADD COLUMN shift_id INTEGER DEFAULT 1`,
    `ALTER TABLE site_employees ADD COLUMN weekly_off TEXT DEFAULT 'Sunday'`,
    `ALTER TABLE site_employees ADD COLUMN notice_period_days INTEGER DEFAULT 30`,
    `ALTER TABLE site_employees ADD COLUMN resignation_date TEXT`,
    `ALTER TABLE site_employees ADD COLUMN expected_exit_date TEXT`,
    `ALTER TABLE site_employees ADD COLUMN exit_date TEXT`,
    `ALTER TABLE site_employees ADD COLUMN exit_status TEXT DEFAULT 'active'`,
    `ALTER TABLE site_employees ADD COLUMN exit_reason TEXT`,
    `ALTER TABLE site_employees ADD COLUMN exit_handover_notes TEXT`
  ];

  for (const alterSql of alterColumns) {
    try {
      await queryRun(alterSql);
    } catch (e) {
      // Column already exists, safe to ignore
    }
  }

  // Seed default shifts if empty
  try {
    const shiftCount = await queryGet(`SELECT COUNT(*) as count FROM hrms_shifts`);
    if (!shiftCount || shiftCount.count === 0) {
      await queryRun(`
        INSERT INTO hrms_shifts (name, code, start_time, end_time, grace_minutes, half_day_hours, full_day_hours, break_minutes, is_overnight, is_default, is_active)
        VALUES 
        ('General Shift', 'GEN', '09:30', '18:30', 15, 4.5, 8.5, 60, 0, 1, 1),
        ('Morning Shift', 'MORN', '08:00', '17:00', 15, 4.5, 8.5, 60, 0, 0, 1),
        ('Night Shift', 'NIGHT', '20:00', '05:00', 15, 4.5, 8.5, 60, 1, 0, 1)
      `);
    }
  } catch (e) {}

  // Seed default leave types if empty
  try {
    const ltCount = await queryGet(`SELECT COUNT(*) as count FROM hrms_leave_types`);
    if (!ltCount || ltCount.count === 0) {
      await queryRun(`
        INSERT INTO hrms_leave_types (code, name, default_quota_annual, is_paid, carry_forward_max, requires_doc, is_active)
        VALUES
        ('CL', 'Casual Leave', 12, 1, 0, 0, 1),
        ('SL', 'Sick Leave', 12, 1, 5, 1, 1),
        ('EL', 'Earned Leave', 15, 1, 15, 0, 1),
        ('COMP_OFF', 'Compensatory Off', 0, 1, 0, 0, 1),
        ('LOP', 'Loss of Pay / Unpaid Leave', 0, 0, 0, 0, 1)
      `);
    }
  } catch (e) {}

  // Seed standard holidays for 2026 if empty
  try {
    const hCount = await queryGet(`SELECT COUNT(*) as count FROM hrms_holidays WHERE year = 2026`);
    if (!hCount || hCount.count === 0) {
      await queryRun(`
        INSERT INTO hrms_holidays (title, date, year, type, location, description)
        VALUES
        ('Republic Day', '2026-01-26', 2026, 'national', 'All', 'National Holiday'),
        ('Maha Shivratri', '2026-02-17', 2026, 'gazetted', 'All', 'Festival Holiday'),
        ('Holi', '2026-03-04', 2026, 'gazetted', 'All', 'Festival of Colors'),
        ('Good Friday', '2026-04-03', 2026, 'gazetted', 'All', 'Religious Holiday'),
        ('Eid-ul-Fitr', '2026-03-21', 2026, 'gazetted', 'All', 'Festival Holiday'),
        ('Independence Day', '2026-08-15', 2026, 'national', 'All', 'National Holiday'),
        ('Mahatma Gandhi Jayanti', '2026-10-02', 2026, 'national', 'All', 'National Holiday'),
        ('Dussehra', '2026-10-20', 2026, 'gazetted', 'All', 'Vijayadashami'),
        ('Diwali', '2026-11-08', 2026, 'gazetted', 'All', 'Deepavali Festival'),
        ('Christmas', '2026-12-25', 2026, 'gazetted', 'All', 'Christmas Day')
      `);
    }
  } catch (e) {}

  // Seed default policy settings if not present
  try {
    const defaultSettings = [
      ['standard_hours_per_day', '8.5'],
      ['half_day_min_hours', '4.5'],
      ['late_grace_minutes', '15'],
      ['late_penalty_count', '3'],
      ['default_cutoff_type', 'calendar'],
      ['geofence_enforce_strict', '0'],
      ['require_selfie', '1']
    ];
    for (const [k, v] of defaultSettings) {
      await queryRun(`INSERT OR IGNORE INTO hrms_policies_settings (key, value) VALUES (?, ?)`, [k, v]);
    }
  } catch (e) {}

  _hrmsTablesInitialized = true;
}

// ---------------------------------------------------------------------------
// 1. HR Dashboard & Analytics KPIs
// ---------------------------------------------------------------------------
export async function getHrmsDashboardKPIs(params, session) {
  requireAuth(session);
  await initHrmsTables();

  const today = new Date().toISOString().split('T')[0];

  // Total and active employees
  const totalRow = await queryGet(`SELECT COUNT(*) as count FROM site_employees`);
  const activeRow = await queryGet(`SELECT COUNT(*) as count FROM site_employees WHERE status = 'active'`);
  const totalEmployees = totalRow?.count || 0;
  const activeEmployees = activeRow?.count || 0;

  // Today's attendance counts
  const todayAtt = await queryAll(
    `SELECT status, punch_in_time, punch_out_time, is_flagged FROM site_attendance_records WHERE date = ?`,
    [today]
  );

  let presentToday = 0;
  let halfDayToday = 0;
  let missingPunchOutToday = 0;
  let flaggedCount = 0;

  todayAtt.forEach(att => {
    if (att.status === 'present') presentToday++;
    else if (att.status === 'half_day') halfDayToday++;

    if (att.punch_in_time && !att.punch_out_time) {
      missingPunchOutToday++;
    }
    if (att.is_flagged) flaggedCount++;
  });

  // Approved leave for today
  const onLeaveRow = await queryGet(
    `SELECT COUNT(DISTINCT employee_id) as count FROM hrms_leave_requests 
     WHERE status = 'approved' AND start_date <= ? AND end_date >= ?`,
    [today, today]
  );
  const onLeaveToday = onLeaveRow?.count || 0;

  const absentToday = Math.max(0, activeEmployees - (presentToday + halfDayToday + onLeaveToday));
  const attendancePercentage = activeEmployees > 0 
    ? Math.round(((presentToday + halfDayToday * 0.5) / activeEmployees) * 100) 
    : 0;

  // Site-wise deployment breakdown
  const siteAllocation = await queryAll(`
    SELECT p.project, COUNT(DISTINCT a.employee_id) as allocated_count
    FROM site_project_allocations a
    JOIN site_employees e ON e.employee_id = a.employee_id
    WHERE a.status = 'active' AND e.status = 'active'
    GROUP BY p.project
  `);

  const siteAttendance = await queryAll(`
    SELECT project, COUNT(DISTINCT employee_id) as present_count
    FROM site_attendance_records
    WHERE date = ? AND status IN ('present', 'half_day')
    GROUP BY project
  `, [today]);

  const siteMap = {};
  siteAllocation.forEach(s => {
    siteMap[s.project] = { project: s.project, allocated: s.allocated_count, present: 0 };
  });
  siteAttendance.forEach(s => {
    if (!siteMap[s.project]) siteMap[s.project] = { project: s.project, allocated: s.present_count, present: s.present_count };
    else siteMap[s.project].present = s.present_count;
  });

  const siteBreakdown = Object.values(siteMap);

  // Department-wise breakdown
  const deptBreakdown = await queryAll(`
    SELECT COALESCE(department, 'Site Operations') as department, COUNT(*) as total_count
    FROM site_employees
    WHERE status = 'active'
    GROUP BY department
  `);

  // Pending Approvals Counter
  const pendingLeaves = await queryGet(`SELECT COUNT(*) as count FROM hrms_leave_requests WHERE status = 'pending'`);
  const pendingRegs = await queryGet(`SELECT COUNT(*) as count FROM site_attendance_regularisations WHERE status = 'pending'`);
  const pendingShifts = await queryGet(`SELECT COUNT(*) as count FROM hrms_shift_requests WHERE status = 'pending'`);

  // Recent Announcements
  const recentAnnouncements = await queryAll(`
    SELECT * FROM hrms_announcements ORDER BY is_pinned DESC, created_at DESC LIMIT 3
  `);

  return {
    workforce: {
      total: totalEmployees,
      active: activeEmployees,
      presentToday,
      halfDayToday,
      absentToday,
      onLeaveToday,
      missingPunchOutToday,
      attendancePercentage,
      flaggedCount
    },
    siteBreakdown,
    deptBreakdown,
    pendingApprovals: {
      leave: pendingLeaves?.count || 0,
      regularisation: pendingRegs?.count || 0,
      shift: pendingShifts?.count || 0,
      total: (pendingLeaves?.count || 0) + (pendingRegs?.count || 0) + (pendingShifts?.count || 0)
    },
    recentAnnouncements
  };
}

// ---------------------------------------------------------------------------
// 2. Employee Directory & Lifecycle Master
// ---------------------------------------------------------------------------
export async function listHrmsEmployees(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const filter = unwrap(params);
  const isHR = isHRAuthorized(session.user);

  let query = `
    SELECT e.*, 
      (SELECT a.project FROM site_project_allocations a WHERE a.employee_id = e.employee_id AND a.is_primary = 1 AND a.status = 'active' LIMIT 1) as primary_project,
      (SELECT s.name FROM hrms_shifts s WHERE s.id = e.shift_id) as shift_name
    FROM site_employees e
    WHERE 1=1
  `;
  const args = [];

  if (filter.search && filter.search.trim()) {
    const s = `%${filter.search.trim()}%`;
    query += ` AND (e.employee_id LIKE ? OR e.name LIKE ? OR e.email LIKE ? OR e.phone LIKE ? OR e.designation LIKE ?)`;
    args.push(s, s, s, s, s);
  }

  if (filter.department && filter.department !== 'all') {
    query += ` AND e.department = ?`;
    args.push(filter.department);
  }

  if (filter.status && filter.status !== 'all') {
    query += ` AND e.status = ?`;
    args.push(filter.status);
  }

  if (filter.project && filter.project !== 'all') {
    query += ` AND e.employee_id IN (SELECT employee_id FROM site_project_allocations WHERE project = ? AND status = 'active')`;
    args.push(filter.project);
  }

  query += ` ORDER BY e.name ASC`;
  const rows = await queryAll(query, args);

  // Mask sensitive statutory and bank details for non-HR / general users
  return rows.map(r => {
    if (!isHR) {
      return {
        ...r,
        bank_account_no: r.bank_account_no ? `••••${r.bank_account_no.slice(-4)}` : '',
        bank_ifsc: '••••••••',
        pan_no: r.pan_no ? `••••••${r.pan_no.slice(-4)}` : '',
        aadhaar_no: r.aadhaar_no ? `••••••••${r.aadhaar_no.slice(-4)}` : ''
      };
    }
    return r;
  });
}

export async function getHrmsEmployee(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const { employee_id } = unwrap(params);
  if (!employee_id) throw new Error('employee_id is required');

  const emp = await queryGet(`
    SELECT e.*, 
      (SELECT a.project FROM site_project_allocations a WHERE a.employee_id = e.employee_id AND a.is_primary = 1 AND a.status = 'active' LIMIT 1) as primary_project,
      (SELECT s.name FROM hrms_shifts s WHERE s.id = e.shift_id) as shift_name
    FROM site_employees e
    WHERE e.employee_id = ?
  `, [employee_id]);

  if (!emp) throw new Error('Employee not found');

  const isHR = isHRAuthorized(session.user);
  if (!isHR && session.user.email !== emp.email && session.user.email !== emp.user_email) {
    throw new Error('AUTH: Access denied to employee profile');
  }

  // Get project allocations
  const allocations = await queryAll(
    `SELECT * FROM site_project_allocations WHERE employee_id = ? ORDER BY is_primary DESC, created_at DESC`,
    [employee_id]
  );

  // Get current year leave balances
  const year = new Date().getFullYear();
  const leaveBalances = await queryAll(`
    SELECT b.*, t.name as leave_type_name, t.is_paid 
    FROM hrms_leave_balances b
    JOIN hrms_leave_types t ON t.code = b.leave_type_code
    WHERE b.employee_id = ? AND b.year = ?
  `, [employee_id, year]);

  // Get documents
  const documents = await queryAll(
    `SELECT * FROM hrms_documents WHERE employee_id = ? ORDER BY created_at DESC`,
    [employee_id]
  );

  return {
    employee: emp,
    allocations,
    leaveBalances,
    documents
  };
}

export async function saveHrmsEmployee(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const data = unwrap(params);

  if (!data.name || !data.employee_id) {
    throw new Error('Employee ID and Name are required');
  }

  const existing = await queryGet(`SELECT id FROM site_employees WHERE employee_id = ?`, [data.employee_id]);

  if (existing) {
    // Update existing employee
    await queryRun(`
      UPDATE site_employees SET
        name = ?,
        designation = ?,
        department = ?,
        phone = ?,
        email = ?,
        photo_url = ?,
        reporting_manager = ?,
        status = ?,
        joining_date = ?,
        probation_months = ?,
        confirmation_date = ?,
        employment_type = ?,
        blood_group = ?,
        emergency_contact_name = ?,
        emergency_contact_phone = ?,
        bank_name = ?,
        bank_account_no = ?,
        bank_ifsc = ?,
        pan_no = ?,
        aadhaar_no = ?,
        uan_no = ?,
        shift_id = ?,
        weekly_off = ?,
        notice_period_days = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = ?
    `, [
      data.name,
      data.designation || 'Staff',
      data.department || 'Operations',
      data.phone || '',
      data.email || '',
      data.photo_url || '',
      data.reporting_manager || '',
      data.status || 'active',
      data.joining_date || null,
      data.probation_months ? Number(data.probation_months) : 3,
      data.confirmation_date || null,
      data.employment_type || 'full_time',
      data.blood_group || '',
      data.emergency_contact_name || '',
      data.emergency_contact_phone || '',
      data.bank_name || '',
      data.bank_account_no || '',
      data.bank_ifsc || '',
      data.pan_no || '',
      data.aadhaar_no || '',
      data.uan_no || '',
      data.shift_id ? Number(data.shift_id) : 1,
      data.weekly_off || 'Sunday',
      data.notice_period_days ? Number(data.notice_period_days) : 30,
      data.employee_id
    ]);

    await recordAuditLog(session.user, 'UPDATE_HRMS_EMPLOYEE', `Updated employee profile ${data.employee_id} (${data.name})`);
  } else {
    // Insert new employee
    await queryRun(`
      INSERT INTO site_employees (
        employee_id, user_email, name, designation, department, phone, email, photo_url,
        reporting_manager, status, joining_date, probation_months, confirmation_date,
        employment_type, blood_group, emergency_contact_name, emergency_contact_phone,
        bank_name, bank_account_no, bank_ifsc, pan_no, aadhaar_no, uan_no, shift_id,
        weekly_off, notice_period_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.employee_id,
      data.email || '',
      data.name,
      data.designation || 'Staff',
      data.department || 'Operations',
      data.phone || '',
      data.email || '',
      data.photo_url || '',
      data.reporting_manager || '',
      data.status || 'active',
      data.joining_date || new Date().toISOString().split('T')[0],
      data.probation_months ? Number(data.probation_months) : 3,
      data.confirmation_date || null,
      data.employment_type || 'full_time',
      data.blood_group || '',
      data.emergency_contact_name || '',
      data.emergency_contact_phone || '',
      data.bank_name || '',
      data.bank_account_no || '',
      data.bank_ifsc || '',
      data.pan_no || '',
      data.aadhaar_no || '',
      data.uan_no || '',
      data.shift_id ? Number(data.shift_id) : 1,
      data.weekly_off || 'Sunday',
      data.notice_period_days ? Number(data.notice_period_days) : 30
    ]);

    // Automatically allocate annual leave balance for current year
    const currentYear = new Date().getFullYear();
    const leaveTypes = await queryAll(`SELECT code, default_quota_annual FROM hrms_leave_types WHERE is_active = 1`);
    for (const lt of leaveTypes) {
      await queryRun(`
        INSERT OR IGNORE INTO hrms_leave_balances (employee_id, leave_type_code, year, total_allocated, balance)
        VALUES (?, ?, ?, ?, ?)
      `, [data.employee_id, lt.code, currentYear, lt.default_quota_annual, lt.default_quota_annual]);
    }

    await recordAuditLog(session.user, 'CREATE_HRMS_EMPLOYEE', `Created new employee ${data.employee_id} (${data.name})`);
  }

  // Handle primary project allocation if provided
  if (data.primary_project) {
    await queryRun(
      `UPDATE site_project_allocations SET is_primary = 0 WHERE employee_id = ?`,
      [data.employee_id]
    );
    const existingAlloc = await queryGet(
      `SELECT id FROM site_project_allocations WHERE employee_id = ? AND project = ?`,
      [data.employee_id, data.primary_project]
    );
    if (existingAlloc) {
      await queryRun(
        `UPDATE site_project_allocations SET is_primary = 1, status = 'active' WHERE id = ?`,
        [existingAlloc.id]
      );
    } else {
      await queryRun(`
        INSERT INTO site_project_allocations (employee_id, project, role_at_site, is_primary, status, start_date, allocated_by)
        VALUES (?, ?, ?, 1, 'active', ?, ?)
      `, [data.employee_id, data.primary_project, data.designation || 'Staff', new Date().toISOString().split('T')[0], session.user.email]);
    }
  }

  return { success: true, employee_id: data.employee_id };
}

export async function updateEmployeeLifecycle(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const { employee_id, action, date, reason, notes, confirmation_date, probation_months } = unwrap(params);

  if (!employee_id || !action) {
    throw new Error('employee_id and action are required');
  }

  const emp = await queryGet(`SELECT * FROM site_employees WHERE employee_id = ?`, [employee_id]);
  if (!emp) throw new Error('Employee not found');

  if (action === 'confirm_probation') {
    const confDate = confirmation_date || new Date().toISOString().split('T')[0];
    await queryRun(`
      UPDATE site_employees SET confirmation_date = ?, employment_type = 'full_time', updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = ?
    `, [confDate, employee_id]);
    await recordAuditLog(session.user, 'CONFIRM_PROBATION', `Confirmed probation for ${employee_id} on ${confDate}`);
  } else if (action === 'extend_probation') {
    const extMonths = probation_months ? Number(probation_months) : 3;
    await queryRun(`
      UPDATE site_employees SET probation_months = probation_months + ?, updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = ?
    `, [extMonths, employee_id]);
    await recordAuditLog(session.user, 'EXTEND_PROBATION', `Extended probation for ${employee_id} by ${extMonths} months`);
  } else if (action === 'resignation') {
    const resDate = date || new Date().toISOString().split('T')[0];
    const noticeDays = emp.notice_period_days || 30;
    const expExit = new Date(new Date(resDate).getTime() + noticeDays * 86400000).toISOString().split('T')[0];
    await queryRun(`
      UPDATE site_employees SET 
        status = 'on_notice',
        exit_status = 'on_notice',
        resignation_date = ?,
        expected_exit_date = ?,
        exit_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = ?
    `, [resDate, expExit, reason || '', employee_id]);
    await recordAuditLog(session.user, 'RESIGNATION_LOGGED', `Logged resignation for ${employee_id}, last working day: ${expExit}`);
  } else if (action === 'relieve') {
    const exitDate = date || new Date().toISOString().split('T')[0];
    await queryRun(`
      UPDATE site_employees SET 
        status = 'inactive',
        exit_status = 'relieved',
        exit_date = ?,
        exit_handover_notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = ?
    `, [exitDate, notes || '', employee_id]);
    await recordAuditLog(session.user, 'EMPLOYEE_RELIEVED', `Relieved employee ${employee_id} on ${exitDate}`);
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// 3. Leave Management & Policy Master
// ---------------------------------------------------------------------------
export async function getLeaveTypes(params, session) {
  requireAuth(session);
  await initHrmsTables();
  return await queryAll(`SELECT * FROM hrms_leave_types WHERE is_active = 1 ORDER BY id ASC`);
}

export async function saveLeaveType(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const data = unwrap(params);
  if (!data.code || !data.name) throw new Error('Code and Name are required');

  const existing = await queryGet(`SELECT id FROM hrms_leave_types WHERE code = ?`, [data.code]);
  if (existing) {
    await queryRun(`
      UPDATE hrms_leave_types SET 
        name = ?, default_quota_annual = ?, is_paid = ?, carry_forward_max = ?, requires_doc = ?, is_active = ?
      WHERE code = ?
    `, [data.name, Number(data.default_quota_annual || 0), data.is_paid ? 1 : 0, Number(data.carry_forward_max || 0), data.requires_doc ? 1 : 0, data.is_active != null ? (data.is_active ? 1 : 0) : 1, data.code]);
  } else {
    await queryRun(`
      INSERT INTO hrms_leave_types (code, name, default_quota_annual, is_paid, carry_forward_max, requires_doc, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [data.code.toUpperCase(), data.name, Number(data.default_quota_annual || 0), data.is_paid ? 1 : 0, Number(data.carry_forward_max || 0), data.requires_doc ? 1 : 0, 1]);
  }
  return { success: true };
}

export async function getEmployeeLeaveBalances(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const { employee_id, year } = unwrap(params);
  if (!employee_id) throw new Error('employee_id is required');
  await requireOwnLeaveRecord(employee_id, session.user);
  const targetYear = year ? Number(year) : new Date().getFullYear();

  let balances = await queryAll(`
    SELECT b.*, t.name as leave_type_name, t.is_paid, t.requires_doc
    FROM hrms_leave_balances b
    JOIN hrms_leave_types t ON t.code = b.leave_type_code
    WHERE b.employee_id = ? AND b.year = ?
    ORDER BY t.id ASC
  `, [employee_id, targetYear]);

  // If no records yet for this year, generate them from leave types
  if (!balances || balances.length === 0) {
    const leaveTypes = await queryAll(`SELECT code, default_quota_annual FROM hrms_leave_types WHERE is_active = 1`);
    for (const lt of leaveTypes) {
      await queryRun(`
        INSERT OR IGNORE INTO hrms_leave_balances (employee_id, leave_type_code, year, total_allocated, balance)
        VALUES (?, ?, ?, ?, ?)
      `, [employee_id, lt.code, targetYear, lt.default_quota_annual, lt.default_quota_annual]);
    }
    balances = await queryAll(`
      SELECT b.*, t.name as leave_type_name, t.is_paid, t.requires_doc
      FROM hrms_leave_balances b
      JOIN hrms_leave_types t ON t.code = b.leave_type_code
      WHERE b.employee_id = ? AND b.year = ?
      ORDER BY t.id ASC
    `, [employee_id, targetYear]);
  }

  return balances;
}

export async function applyLeave(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const data = unwrap(params);

  return withWriteTransaction(async () => {
    let employee_id = data.employee_id;
    if (!employee_id) {
      const emp = await queryGet(`SELECT employee_id FROM site_employees WHERE email = ? OR user_email = ?`, [session.user.email, session.user.email]);
      if (!emp) throw new Error('Employee profile not found for current user');
      employee_id = emp.employee_id;
    }

    if (!data.leave_type_code || !data.start_date || !data.end_date) {
      throw new Error('Leave type, start date and end date are required');
    }

    // Calculate day count
    const sDate = new Date(data.start_date);
    const eDate = new Date(data.end_date);
    if (!Number.isFinite(+sDate) || !Number.isFinite(+eDate)) throw new Error('Invalid leave dates');
    if (data.is_half_day && +sDate !== +eDate) throw new Error('Half-day leave requires one date');
    if (eDate < sDate) throw new Error('End date cannot be earlier than start date');

    let total_days = 0;
    if (data.is_half_day) {
      total_days = 0.5;
    } else {
      const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
      total_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    await requireOwnLeaveRecord(employee_id, session.user);
    // Check overlapping leave requests
    const overlap = await queryGet(`
      SELECT id FROM hrms_leave_requests
      WHERE employee_id = ? AND status IN ('pending', 'approved')
        AND start_date <= ? AND end_date >= ?
    `, [employee_id, data.end_date, data.start_date]);

    if (overlap) {
      throw new Error('You already have a pending or approved leave request overlapping these dates.');
    }

    // Check balance if leave type is paid
    const year = sDate.getFullYear();
    const lt = await queryGet(`SELECT is_paid FROM hrms_leave_types WHERE code = ?`, [data.leave_type_code]);
    if (lt && lt.is_paid) {
      const bal = await queryGet(
        `SELECT balance - COALESCE(pending, 0) AS balance FROM hrms_leave_balances WHERE employee_id = ? AND leave_type_code = ? AND year = ?`,
        [employee_id, data.leave_type_code, year]
      );
      if (!bal || bal.balance < total_days) {
        throw new Error(`Insufficient leave balance. Available: ${bal?.balance || 0} days, requested: ${total_days} days.`);
      }
    }

    // Insert request
    await queryRun(`
      INSERT INTO hrms_leave_requests (
        employee_id, leave_type_code, start_date, end_date, total_days,
        is_half_day, half_day_type, reason, doc_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      employee_id,
      data.leave_type_code,
      data.start_date,
      data.end_date,
      total_days,
      data.is_half_day ? 1 : 0,
      data.half_day_type || null,
      data.reason || '',
      data.doc_url || null
    ]);

    // Update pending balance
    await queryRun(`
      UPDATE hrms_leave_balances
      SET pending = pending + ?
      WHERE employee_id = ? AND leave_type_code = ? AND year = ?
    `, [total_days, employee_id, data.leave_type_code, year]);

    return { success: true, total_days };
  });
}

export async function listLeaveRequests(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const filter = unwrap(params);
  const isHR = isHRAuthorized(session.user);

  let query = `
    SELECT r.*, e.name as employee_name, e.department, e.designation, t.name as leave_type_name, t.is_paid
    FROM hrms_leave_requests r
    JOIN site_employees e ON e.employee_id = r.employee_id
    JOIN hrms_leave_types t ON t.code = r.leave_type_code
    WHERE 1=1
  `;
  const args = [];

  if (!isHR) {
    // If not HR, only see own leaves unless reporting manager
    const emp = await queryGet(`SELECT employee_id FROM site_employees WHERE email = ? OR user_email = ?`, [session.user.email, session.user.email]);
    query += ` AND (r.employee_id = ? OR e.reporting_manager = ?)`;
    args.push(emp?.employee_id ?? '', session.user.email);
  }

  if (filter.employee_id) {
    query += ` AND r.employee_id = ?`;
    args.push(filter.employee_id);
  }

  if (filter.status && filter.status !== 'all') {
    query += ` AND r.status = ?`;
    args.push(filter.status);
  }

  if (filter.department && filter.department !== 'all') {
    query += ` AND e.department = ?`;
    args.push(filter.department);
  }

  query += ` ORDER BY r.created_at DESC`;
  return await queryAll(query, args);
}

export async function reviewLeaveRequest(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const { request_id, action, remarks } = unwrap(params);

  if (!request_id || !['approve', 'reject'].includes(action)) {
    throw new Error('request_id and valid action (approve/reject) are required');
  }

  return withWriteTransaction(async () => {
    const req = await queryGet(`SELECT * FROM hrms_leave_requests WHERE id = ?`, [request_id]);
    if (!req) throw new Error('Leave request not found');
    if (req.status !== 'pending') throw new Error(`Request has already been ${req.status}`);

    if (action === 'approve') {
      const locked = await queryGet(`SELECT id FROM hrms_payroll_locks WHERE is_locked = 1
        AND cut_off_start <= ? AND cut_off_end >= ? LIMIT 1`, [req.end_date, req.start_date]);
      if (locked) throw new Error('Unlock the payroll period before approving this leave.');
      const insufficient = await queryGet(`SELECT 1 FROM hrms_leave_types t
        LEFT JOIN hrms_leave_balances b ON b.leave_type_code=t.code AND b.employee_id=? AND b.year=?
        WHERE t.code=? AND t.is_paid=1 AND COALESCE(b.balance,0) < ?`,
        [req.employee_id, Number(req.start_date.slice(0, 4)), req.leave_type_code, req.total_days]);
      if (insufficient) throw new Error('Insufficient leave balance at approval.');
    }
    const year = new Date(req.start_date).getFullYear();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await queryRun(`
      UPDATE hrms_leave_requests SET
        status = ?,
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        review_remarks = ?
      WHERE id = ?
    `, [newStatus, session.user.email, remarks || '', request_id]);

    if (action === 'approve') {
      // Deduct from balance and reduce pending
      await queryRun(`
        UPDATE hrms_leave_balances SET
          used = used + ?,
          pending = MAX(0, pending - ?),
          balance = balance - ?
        WHERE employee_id = ? AND leave_type_code = ? AND year = ?
      `, [req.total_days, req.total_days, req.total_days, req.employee_id, req.leave_type_code, year]);

      // Reconcile into attendance records automatically
      const emp = await queryGet(`SELECT name FROM site_employees WHERE employee_id = ?`, [req.employee_id]);
      const empName = emp?.name || 'Staff';
      const primaryProj = await queryGet(`
        SELECT project FROM site_project_allocations WHERE employee_id = ? AND is_primary = 1 LIMIT 1
      `, [req.employee_id]);
      const project = primaryProj?.project || 'General';

      // Loop through leave dates and mark attendance
      const cur = new Date(req.start_date);
      const end = new Date(req.end_date);
      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        const existingAtt = await queryGet(
          `SELECT id FROM site_attendance_records WHERE employee_id = ? AND date = ?`,
          [req.employee_id, dateStr]
        );
        const attStatus = req.is_half_day ? 'half_day' : 'on_leave';
        if (existingAtt) {
          await queryRun(`
            UPDATE site_attendance_records SET status = ?, flag_reason = ? WHERE id = ?
          `, [attStatus, `Leave Approved (${req.leave_type_code})`, existingAtt.id]);
        } else {
          await queryRun(`
            INSERT INTO site_attendance_records (employee_id, employee_name, project, date, status, flag_reason)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [req.employee_id, empName, project, dateStr, attStatus, `Leave Approved (${req.leave_type_code})`]);
        }
        cur.setDate(cur.getDate() + 1);
      }

      await recordAuditLog(session.user, 'APPROVE_LEAVE', `Approved ${req.total_days} days leave for ${req.employee_id} (${req.leave_type_code})`);
    } else {
      // Release pending balance
      await queryRun(`
        UPDATE hrms_leave_balances SET
          pending = MAX(0, pending - ?)
        WHERE employee_id = ? AND leave_type_code = ? AND year = ?
      `, [req.total_days, req.employee_id, req.leave_type_code, year]);

      await recordAuditLog(session.user, 'REJECT_LEAVE', `Rejected leave for ${req.employee_id} (${req.leave_type_code})`);
    }

    return { success: true, status: newStatus };
  });
}

export async function cancelLeaveRequest(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const { request_id } = unwrap(params);
  if (!request_id) throw new Error('request_id is required');

  return withWriteTransaction(async () => {
    const req = await queryGet(`SELECT * FROM hrms_leave_requests WHERE id = ?`, [request_id]);
    if (!req) throw new Error('Request not found');
    await requireOwnLeaveRecord(req.employee_id, session.user);
    if (req.status !== 'pending') throw new Error('Only pending leave requests can be cancelled');

    const year = new Date(req.start_date).getFullYear();

    await queryRun(`UPDATE hrms_leave_requests SET status = 'cancelled' WHERE id = ?`, [request_id]);
    await queryRun(`
      UPDATE hrms_leave_balances SET pending = MAX(0, pending - ?)
      WHERE employee_id = ? AND leave_type_code = ? AND year = ?
    `, [req.total_days, req.employee_id, req.leave_type_code, year]);

    return { success: true };
  });
}

// ---------------------------------------------------------------------------
// 4. Shifts & Working Hours Management
// ---------------------------------------------------------------------------
export async function getHrmsShifts(params, session) {
  requireAuth(session);
  await initHrmsTables();
  return await queryAll(`SELECT * FROM hrms_shifts WHERE is_active = 1 ORDER BY id ASC`);
}

export async function saveHrmsShift(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const data = unwrap(params);

  if (!data.name || !data.start_time || !data.end_time) {
    throw new Error('Shift name, start time and end time are required');
  }

  const code = (data.code || data.name.slice(0, 4)).toUpperCase().replace(/\s+/g, '_');

  if (data.id) {
    await queryRun(`
      UPDATE hrms_shifts SET
        name = ?, code = ?, start_time = ?, end_time = ?, grace_minutes = ?,
        half_day_hours = ?, full_day_hours = ?, break_minutes = ?, is_overnight = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.name, code, data.start_time, data.end_time,
      Number(data.grace_minutes || 15),
      Number(data.half_day_hours || 4.5),
      Number(data.full_day_hours || 8.5),
      Number(data.break_minutes || 60),
      data.is_overnight ? 1 : 0,
      data.is_default ? 1 : 0,
      data.id
    ]);
  } else {
    await queryRun(`
      INSERT INTO hrms_shifts (name, code, start_time, end_time, grace_minutes, half_day_hours, full_day_hours, break_minutes, is_overnight, is_default, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      data.name, code, data.start_time, data.end_time,
      Number(data.grace_minutes || 15),
      Number(data.half_day_hours || 4.5),
      Number(data.full_day_hours || 8.5),
      Number(data.break_minutes || 60),
      data.is_overnight ? 1 : 0,
      data.is_default ? 1 : 0
    ]);
  }

  return { success: true };
}

export async function deleteHrmsShift(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const { id } = unwrap(params);
  if (!id) throw new Error('id is required');
  await queryRun(`UPDATE hrms_shifts SET is_active = 0 WHERE id = ?`, [id]);
  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. Weekly Off & Holiday Calendar
// ---------------------------------------------------------------------------
export async function getHrmsHolidays(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const { year, location } = unwrap(params);
  await requireOwnLeaveRecord(employee_id, session.user);
  const targetYear = year ? Number(year) : new Date().getFullYear();

  let query = `SELECT * FROM hrms_holidays WHERE year = ?`;
  const args = [targetYear];

  if (location && location !== 'all') {
    query += ` AND (location = 'All' OR location = ?)`;
    args.push(location);
  }

  query += ` ORDER BY date ASC`;
  return await queryAll(query, args);
}

export async function saveHrmsHoliday(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const data = unwrap(params);

  if (!data.title || !data.date) {
    throw new Error('Holiday title and date are required');
  }

  const year = new Date(data.date).getFullYear();

  if (data.id) {
    await queryRun(`
      UPDATE hrms_holidays SET title = ?, date = ?, year = ?, type = ?, location = ?, description = ?
      WHERE id = ?
    `, [data.title, data.date, year, data.type || 'national', data.location || 'All', data.description || '', data.id]);
  } else {
    await queryRun(`
      INSERT INTO hrms_holidays (title, date, year, type, location, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.title, data.date, year, data.type || 'national', data.location || 'All', data.description || '']);
  }

  return { success: true };
}

export async function deleteHrmsHoliday(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const { id } = unwrap(params);
  if (!id) throw new Error('id is required');
  await queryRun(`DELETE FROM hrms_holidays WHERE id = ?`, [id]);
  return { success: true };
}

// ---------------------------------------------------------------------------
// 6. Regularisations & Unified Approvals Center
// ---------------------------------------------------------------------------
export async function getPendingApprovalsSummary(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const isHR = isHRAuthorized(session.user);

  // Leave Requests
  let leaveQuery = `
    SELECT r.*, e.name as employee_name, e.department, e.designation, t.name as leave_type_name
    FROM hrms_leave_requests r
    JOIN site_employees e ON e.employee_id = r.employee_id
    JOIN hrms_leave_types t ON t.code = r.leave_type_code
    WHERE r.status = 'pending'
  `;
  const leaveArgs = [];
  if (!isHR) {
    leaveQuery += ` AND e.reporting_manager = ?`;
    leaveArgs.push(session.user.email);
  }
  leaveQuery += ` ORDER BY r.created_at ASC`;
  const leaves = await queryAll(leaveQuery, leaveArgs);

  // Attendance Regularisation Requests
  let regQuery = `
    SELECT r.*, e.name as employee_name, e.department, e.designation
    FROM site_attendance_regularisations r
    JOIN site_employees e ON e.employee_id = r.employee_id
    WHERE r.status = 'pending'
  `;
  const regArgs = [];
  if (!isHR) {
    regQuery += ` AND e.reporting_manager = ?`;
    regArgs.push(session.user.email);
  }
  regQuery += ` ORDER BY r.created_at ASC`;
  const regularisations = await queryAll(regQuery, regArgs);

  return {
    leaves,
    regularisations,
    totalPending: leaves.length + regularisations.length
  };
}

// ---------------------------------------------------------------------------
// 7. Employee Documents Management
// ---------------------------------------------------------------------------
export async function listEmployeeDocuments(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const { employee_id } = unwrap(params);
  if (!employee_id) throw new Error('employee_id is required');

  const isHR = isHRAuthorized(session.user);
  if (!isHR) {
    const emp = await queryGet(`SELECT employee_id FROM site_employees WHERE email = ? OR user_email = ?`, [session.user.email, session.user.email]);
    if (!emp || emp.employee_id !== employee_id) {
      throw new Error('AUTH: Access denied to employee documents');
    }
  }

  return await queryAll(`SELECT * FROM hrms_documents WHERE employee_id = ? ORDER BY created_at DESC`, [employee_id]);
}

export async function uploadEmployeeDocument(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const data = unwrap(params);

  if (!data.employee_id || !data.doc_type || !data.file_url) {
    throw new Error('employee_id, doc_type and file_url are required');
  }

  await queryRun(`
    INSERT INTO hrms_documents (employee_id, doc_type, title, file_url, verification_status, expiry_date, notes, uploaded_by)
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
  `, [
    data.employee_id,
    data.doc_type,
    data.title || data.doc_type,
    data.file_url,
    data.expiry_date || null,
    data.notes || '',
    session.user.email
  ]);

  return { success: true };
}

export async function verifyEmployeeDocument(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const { document_id, status, notes } = unwrap(params);

  if (!document_id || !['verified', 'rejected', 'pending'].includes(status)) {
    throw new Error('document_id and valid status required');
  }

  await queryRun(`
    UPDATE hrms_documents SET verification_status = ?, notes = ? WHERE id = ?
  `, [status, notes || '', document_id]);

  return { success: true };
}

// ---------------------------------------------------------------------------
// 8. HR Policies & Announcements Master
// ---------------------------------------------------------------------------
export async function getHrmsAnnouncements(params, session) {
  requireAuth(session);
  await initHrmsTables();
  return await queryAll(`SELECT * FROM hrms_announcements ORDER BY is_pinned DESC, created_at DESC`);
}

export async function saveHrmsAnnouncement(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const data = unwrap(params);

  if (!data.title || !data.content) {
    throw new Error('Title and content are required');
  }

  if (data.id) {
    await queryRun(`
      UPDATE hrms_announcements SET 
        title = ?, category = ?, content = ?, doc_url = ?, target_dept = ?, target_project = ?, is_pinned = ?
      WHERE id = ?
    `, [data.title, data.category || 'announcement', data.content, data.doc_url || null, data.target_dept || 'All', data.target_project || 'All', data.is_pinned ? 1 : 0, data.id]);
  } else {
    await queryRun(`
      INSERT INTO hrms_announcements (title, category, content, doc_url, target_dept, target_project, is_pinned, published_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [data.title, data.category || 'announcement', data.content, data.doc_url || null, data.target_dept || 'All', data.target_project || 'All', data.is_pinned ? 1 : 0, session.user.email]);
  }

  return { success: true };
}

export async function deleteHrmsAnnouncement(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const { id } = unwrap(params);
  if (!id) throw new Error('id is required');
  await queryRun(`DELETE FROM hrms_announcements WHERE id = ?`, [id]);
  return { success: true };
}

// ---------------------------------------------------------------------------
// 9. HRMS Policy Settings
// ---------------------------------------------------------------------------
export async function getHrmsSettings(params, session) {
  requireAuth(session);
  await initHrmsTables();
  const rows = await queryAll(`SELECT key, value FROM hrms_policies_settings`);
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

export async function saveHrmsSettings(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const settings = unwrap(params);

  for (const [key, value] of Object.entries(settings)) {
    await queryRun(`
      INSERT INTO hrms_policies_settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `, [key, String(value)]);
  }

  await recordAuditLog(session.user, 'UPDATE_HRMS_SETTINGS', 'Updated HRMS policy settings');
  return { success: true };
}

// ---------------------------------------------------------------------------
// 10. PAYROLL ATTENDANCE CALCULATION ENGINE & EXPORT
// ---------------------------------------------------------------------------

/**
 * Computes the month's start and end dates based on year, month and cutoff configuration.
 */
function getCutoffDateRange(year, month, cutoffType = 'calendar') {
  if (cutoffType === '26th_to_25th') {
    // 26th of previous month to 25th of target month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const startStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-26`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-25`;
    return { startDate: startStr, endDate: endStr };
  } else {
    // Standard calendar month (1st to last day)
    const lastDay = new Date(year, month, 0).getDate();
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate: startStr, endDate: endStr };
  }
}

/**
 * Enterprise Payroll Attendance Engine.
 * Calculates exact calendar days, eligible days, present days, half days, paid leaves,
 * LOPs, weekly offs, paid holidays, absent days, late marks, overtime and payable days.
 */
export async function getMonthlyPayrollAttendance(params, session) {
  return calculatePayroll(params, session);
}

async function calculatePayroll(params, session, captureLegacy = false) {
  const user = requireAuth(session);
  if (!isHRAuthorized(user) && !user.roles?.some(role => ['finance', 'accountant'].includes(role))) throw new Error('AUTH: Payroll access required');
  await initHrmsTables();

  const filter = unwrap(params);
  const now = new Date();
  const year = filter.year ? Number(filter.year) : now.getFullYear();
  const month = filter.month ? Number(filter.month) : (now.getMonth() + 1);

  // Load configured policies
  const settingsRows = await queryAll(`SELECT key, value FROM hrms_policies_settings`);
  const settings = {};
  settingsRows.forEach(r => { settings[r.key] = r.value; });

  const cutoffType = filter.cutoff_type || settings.default_cutoff_type || 'calendar';
  let { startDate, endDate } = getCutoffDateRange(year, month, cutoffType);

  // Check lock status
  const lock = await queryGet(`
    SELECT * FROM hrms_payroll_locks WHERE month = ? AND year = ?
  `, [month, year]);

  if (lock?.is_locked) {
    startDate = lock.cut_off_start;
    endDate = lock.cut_off_end;
    if (!lock.snapshot && !captureLegacy) {
      return withWriteTransaction(async () => {
        const full = await calculatePayroll({ month, year }, session, true);
        if (full.isLocked) {
          await queryRun(`UPDATE hrms_payroll_locks SET snapshot=? WHERE month=? AND year=? AND is_locked=1 AND snapshot IS NULL`,
            [JSON.stringify({ ...full, lockInfo: null }), month, year]);
        }
        return calculatePayroll(params, session);
      });
    }
    if (lock.snapshot) {
      const { snapshot, ...lockInfo } = lock;
      const saved = JSON.parse(snapshot);
      const summary = saved.summary.filter(row =>
        (!filter.department || filter.department === 'all' || row.department === filter.department) &&
        (!filter.project || filter.project === 'all' || row.projects.includes(filter.project)));
      const dailyMatrix = Object.fromEntries(summary.map(row => [row.employee_id, saved.dailyMatrix[row.employee_id]]));
      return { ...saved, summary, dailyMatrix, isLocked: true, lockInfo };
    }
  }

  // Load holidays in this period
  const holidays = await queryAll(`
    SELECT * FROM hrms_holidays WHERE date >= ? AND date <= ?
  `, [startDate, endDate]);
  const holidayMap = new Map();
  for (const holiday of holidays) {
    const onDate = holidayMap.get(holiday.date) || [];
    onDate.push(holiday);
    holidayMap.set(holiday.date, onDate);
  }

  // Load eligible employees
  let empQuery = `
    SELECT e.*, 
      (SELECT a.project FROM site_project_allocations a WHERE a.employee_id = e.employee_id AND a.is_primary = 1 AND a.status = 'active' LIMIT 1) as primary_project,
      (SELECT json_group_array(a.project) FROM site_project_allocations a WHERE a.employee_id=e.employee_id AND a.status='active') AS projects_json,
      s.start_time AS shift_start, s.end_time AS shift_end, s.grace_minutes AS shift_grace
    FROM site_employees e LEFT JOIN hrms_shifts s ON s.id=e.shift_id
    WHERE (e.status IN ('active', 'on_leave', 'on_notice')
       OR (e.exit_date IS NOT NULL AND e.exit_date >= ?))
  `;
  const empArgs = [startDate];

  if (filter.project && filter.project !== 'all') {
    empQuery += ` AND e.employee_id IN (SELECT employee_id FROM site_project_allocations WHERE project = ? AND status = 'active')`;
    empArgs.push(filter.project);
  }

  if (filter.department && filter.department !== 'all') {
    empQuery += ` AND e.department = ?`;
    empArgs.push(filter.department);
  }

  empQuery += ` ORDER BY e.name ASC`;
  const employees = await queryAll(empQuery, empArgs);

  // Generate date list between startDate and endDate
  const dateList = [];
  let dCur = new Date(startDate);
  const dEnd = new Date(endDate);
  while (dCur <= dEnd) {
    dateList.push(dCur.toISOString().split('T')[0]);
    dCur.setDate(dCur.getDate() + 1);
  }
  const calendarDays = dateList.length;

  // Load all attendance records in this period
  const attendanceRows = await queryAll(`
    SELECT * FROM site_attendance_records 
    WHERE date >= ? AND date <= ?
  `, [startDate, endDate]);

  const attByEmpAndDate = {};
  attendanceRows.forEach(a => {
    if (!attByEmpAndDate[a.employee_id]) attByEmpAndDate[a.employee_id] = {};
    attByEmpAndDate[a.employee_id][a.date] = a;
  });

  // Load all approved leaves in this period
  const approvedLeaves = await queryAll(`
    SELECT r.*, t.is_paid 
    FROM hrms_leave_requests r
    JOIN hrms_leave_types t ON t.code = r.leave_type_code
    WHERE r.status = 'approved' AND r.start_date <= ? AND r.end_date >= ?
  `, [endDate, startDate]);

  const leavesByEmpAndDate = {};
  approvedLeaves.forEach(lv => {
    let lCur = new Date(lv.start_date);
    const lEnd = new Date(lv.end_date);
    while (lCur <= lEnd) {
      const ds = lCur.toISOString().split('T')[0];
      if (ds >= startDate && ds <= endDate) {
        if (!leavesByEmpAndDate[lv.employee_id]) leavesByEmpAndDate[lv.employee_id] = {};
        leavesByEmpAndDate[lv.employee_id][ds] = lv;
      }
      lCur.setDate(lCur.getDate() + 1);
    }
  });

  const payrollSummary = [];
  const dailyMatrix = {};

  for (const emp of employees) {
    let eligibleDays = 0;
    let presentDays = 0;
    let halfDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let weeklyOffDays = 0;
    let paidHolidayDays = 0;
    let absentDays = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    let totalOvertimeHours = 0;
    let exceptionsCount = 0;

    const empJoining = emp.joining_date ? emp.joining_date.split('T')[0] : null;
    const empExit = emp.exit_date ? emp.exit_date.split('T')[0] : null;
    const projects = JSON.parse(emp.projects_json || '[]');
    const weeklyOffDayName = emp.weekly_off || 'Sunday';

    dailyMatrix[emp.employee_id] = {};

    for (const dt of dateList) {
      // Check employment eligibility on this date
      if (empJoining && dt < empJoining) {
        dailyMatrix[emp.employee_id][dt] = { code: 'NE', status: 'Not Employed' };
        continue;
      }
      if (empExit && dt > empExit) {
        dailyMatrix[emp.employee_id][dt] = { code: 'EX', status: 'Relieved' };
        continue;
      }

      eligibleDays++;

      const dayOfWeek = new Date(dt).toLocaleDateString('en-US', { weekday: 'long' });
      const isWeeklyOff = dayOfWeek.toLowerCase() === weeklyOffDayName.toLowerCase();
      const site = attByEmpAndDate[emp.employee_id]?.[dt]?.project || emp.primary_project || '';
      const holiday = holidayMap.get(dt)?.find(h => !h.location || h.location.toLowerCase() === 'all' ||
        h.location.trim().toLowerCase() === site.trim().toLowerCase());

      const att = attByEmpAndDate[emp.employee_id]?.[dt];
      const lv = leavesByEmpAndDate[emp.employee_id]?.[dt];

      if (att) {
        // Employee has a physical punch record
        if (att.status === 'present') {
          presentDays += 1;
          dailyMatrix[emp.employee_id][dt] = { code: 'P', status: 'Present', hours: att.total_hours };
        } else if (att.status === 'half_day') {
          halfDays += 1;
          dailyMatrix[emp.employee_id][dt] = { code: 'HD', status: 'Half Day', hours: att.total_hours };
          if (lv?.is_half_day) {
            if (lv.is_paid) paidLeaveDays += 0.5;
            else unpaidLeaveDays += 0.5;
            dailyMatrix[emp.employee_id][dt] = { code: 'HL', status: `Half Leave (${lv.leave_type_code})` };
          }
        } else if (att.status === 'on_leave') {
          if (lv && lv.is_paid) {
            paidLeaveDays += 1;
            dailyMatrix[emp.employee_id][dt] = { code: 'PL', status: `Leave (${lv.leave_type_code})` };
          } else {
            unpaidLeaveDays += 1;
            dailyMatrix[emp.employee_id][dt] = { code: 'LOP', status: 'Loss of Pay' };
          }
        } else {
          presentDays += 1;
          dailyMatrix[emp.employee_id][dt] = { code: 'P', status: 'Present', hours: att.total_hours };
        }

        if (emp.shift_start && emp.shift_end && !lv?.is_half_day) {
          const shiftStart = Date.parse(`${dt}T${emp.shift_start}+05:30`);
          let shiftEnd = Date.parse(`${dt}T${emp.shift_end}+05:30`);
          if (shiftEnd <= shiftStart) shiftEnd += 86400000;
          const grace = Number(emp.shift_grace ?? settings.late_grace_minutes ?? 0) * 60000;
          if (Date.parse(att.punch_in_time) > shiftStart + grace) lateArrivals++;
          if (Date.parse(att.punch_out_time) < shiftEnd) earlyDepartures++;
        }

        // Flag missing punches
        if (att.punch_in_time && !att.punch_out_time) {
          exceptionsCount++;
        }

        // Overtime check
        if (att.total_hours && att.total_hours > 8.5) {
          totalOvertimeHours += Math.round((att.total_hours - 8.5) * 10) / 10;
        }
      } else if (lv) {
        // Approved leave
        if (lv.is_half_day) {
          halfDays += 1;
          if (lv.is_paid) paidLeaveDays += 0.5;
          else unpaidLeaveDays += 0.5;
          dailyMatrix[emp.employee_id][dt] = { code: 'HL', status: `Half Leave (${lv.leave_type_code})` };
        } else {
          if (lv.is_paid) {
            paidLeaveDays += 1;
            dailyMatrix[emp.employee_id][dt] = { code: 'PL', status: `Paid Leave (${lv.leave_type_code})` };
          } else {
            unpaidLeaveDays += 1;
            dailyMatrix[emp.employee_id][dt] = { code: 'LOP', status: 'Unpaid Leave' };
          }
        }
      } else if (holiday) {
        paidHolidayDays += 1;
        dailyMatrix[emp.employee_id][dt] = { code: 'H', status: `Holiday: ${holiday.title}` };
      } else if (isWeeklyOff) {
        weeklyOffDays += 1;
        dailyMatrix[emp.employee_id][dt] = { code: 'WO', status: 'Weekly Off' };
      } else {
        // Unauthorized Absence
        absentDays += 1;
        dailyMatrix[emp.employee_id][dt] = { code: 'A', status: 'Absent' };
      }
    }

    // Late penalty rule: configurable deduction (e.g. 3 late marks = 0.5 day LOP)
    const latePenaltyThreshold = Number(settings.late_penalty_count || 3);
    const lateDeductionDays = latePenaltyThreshold > 0 
      ? Math.floor(lateArrivals / latePenaltyThreshold) * 0.5 
      : 0;

    // Payable days formula:
    // Present + 0.5 * HalfDay + PaidLeave + WeeklyOffs + PaidHolidays - LatePenalty
    // Strictly capped at Eligible Days
    const calculatedPayable = (presentDays + (halfDays * 0.5) + paidLeaveDays + weeklyOffDays + paidHolidayDays) - lateDeductionDays;
    const payableDays = Math.min(eligibleDays, Math.max(0, calculatedPayable));

    payrollSummary.push({
      employee_id: emp.employee_id,
      name: emp.name,
      department: emp.department || 'Operations',
      designation: emp.designation || 'Staff',
      project: emp.primary_project || 'General',
      projects,
      calendar_days: calendarDays,
      eligible_days: eligibleDays,
      present_days: presentDays,
      half_days: halfDays,
      paid_leave_days: paidLeaveDays,
      unpaid_leave_days: unpaidLeaveDays + lateDeductionDays,
      weekly_off_days: weeklyOffDays,
      paid_holiday_days: paidHolidayDays,
      absent_days: absentDays,
      late_arrivals: lateArrivals,
      early_departures: earlyDepartures,
      overtime_hours: totalOvertimeHours,
      payable_days: payableDays,
      exceptions_count: exceptionsCount,
      bank_name: emp.bank_name || '',
      bank_account_no: emp.bank_account_no || '',
      bank_ifsc: emp.bank_ifsc || '',
      pan_no: emp.pan_no || ''
    });
  }

  return {
    month,
    year,
    startDate,
    endDate,
    calendarDays,
    isLocked: !!lock?.is_locked,
    lockInfo: lock ? { ...lock, snapshot: undefined } : null,
    summary: payrollSummary,
    dailyMatrix,
    dateList
  };
}

export async function lockMonthlyAttendance(params, session) {
  requireHRAuthorized(session);
  await initHrmsTables();
  const { month, year, action, notes, reason } = unwrap(params);

  if (!month || !year) throw new Error('month and year are required');



  if (action === 'unlock') {
    await queryRun(`
      UPDATE hrms_payroll_locks SET 
        is_locked = 0,
        unlocked_by = ?,
        unlocked_at = CURRENT_TIMESTAMP,
        unlock_reason = ?,
        version = version + 1
      WHERE month = ? AND year = ?
    `, [session.user.email, reason || 'Administrative Unlock', Number(month), Number(year)]);

    await recordAuditLog(session.user, 'UNLOCK_PAYROLL_ATTENDANCE', `Unlocked attendance for ${month}/${year}. Reason: ${reason || 'N/A'}`);
    return { success: true, is_locked: false };
  }
  return withWriteTransaction(async () => {
    const report = await getMonthlyPayrollAttendance({ month, year, cutoff_type: unwrap(params).cutoff_type }, session);
    if (report.isLocked) return { success: true, is_locked: true };
    const { startDate, endDate } = report;
    await queryRun(`
      INSERT INTO hrms_payroll_locks (month, year, cut_off_start, cut_off_end, is_locked, locked_by, notes, snapshot)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(month, year) DO UPDATE SET
        is_locked = 1,
        cut_off_start = excluded.cut_off_start, cut_off_end = excluded.cut_off_end,
        snapshot = excluded.snapshot,
        locked_by = excluded.locked_by,
        locked_at = CURRENT_TIMESTAMP,
        notes = excluded.notes,
        version = version + 1
    `, [Number(month), Number(year), startDate, endDate, session.user.email, notes || 'Locked by HR', JSON.stringify({ ...report, lockInfo: null })]);

    await recordAuditLog(session.user, 'LOCK_PAYROLL_ATTENDANCE', `Locked attendance for ${month}/${year}`);
    return { success: true, is_locked: true };
  });
}
