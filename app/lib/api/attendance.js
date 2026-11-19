// Domain: attendance & site employee management
// Production-ready Site Employee Management & Geo-Tagged Attendance Module for PTS

import { queryAll, queryGet, queryRun, queryBatch } from '../db.js';
import { isSuperAdmin } from '../config.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (Free cloud tier for attachments & selfies)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload an image (selfie or profile photo) to Cloudinary free storage.
 * Automatically compresses to save bandwidth and storage.
 * Falls back seamlessly to data URI if Cloudinary is not configured or in tests.
 */
async function uploadImageToCloud(dataUri, folder, publicId) {
  if (!dataUri || typeof dataUri !== 'string') return dataUri;
  if (dataUri.startsWith('http://') || dataUri.startsWith('https://')) {
    return dataUri;
  }

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const res = await cloudinary.uploader.upload(dataUri, {
        folder: `pts_attendance/${folder}`,
        public_id: publicId,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
        ]
      });
      if (res && res.secure_url) {
        return res.secure_url;
      }
    } catch (err) {
      console.warn('Cloudinary upload warning (using fallback data URI):', err.message);
    }
  }
  return dataUri;
}

let _tablesInitialized = false;

async function recordAuditLog(user, actionType, details, department = 'Site Management') {
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
 * Safely unwrap parameters that might be wrapped in an array by RPC callers.
 */
function unwrap(val) {
  if (Array.isArray(val)) return val[0] || {};
  return val || {};
}

/**
 * Formats a clean, readable Indian or global address from a reverse-geocoded address object.
 * Eliminates confusing administrative tehsil/county names (e.g. "Dadri" for Noida, "Manesar" for Gurgaon)
 * while preserving sector, locality, city, state and postcode.
 */
export function formatCleanAddress(addr, displayName = '') {
  if (!addr || typeof addr !== 'object') {
    return displayName || '';
  }
  const street = addr.road || addr.pedestrian || addr.path || addr.amenity || addr.building || addr.commercial || addr.industrial || addr.residential || addr.neighbourhood || '';
  const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.subdivision || addr.quarter || addr.village || '';
  const city = addr.city || addr.town || addr.city_district || addr.municipality || '';
  const state = addr.state || '';
  const pin = addr.postcode || '';

  // Only use county/subdistrict if NEITHER locality nor city is available
  const subdistrict = (!locality && !city) ? (addr.subdistrict || addr.county || '') : '';

  const parts = [street, locality, subdistrict, city, state, pin].filter(Boolean);
  if (parts.length >= 2) {
    return parts.join(', ');
  }
  return displayName || parts.join(', ') || '';
}

/**
 * Reverse geocode latitude and longitude into an exact readable street/site address.
 * Falls back gracefully to formatted coordinate string if network or geocoding is unavailable.
 */
export async function resolveReadableAddress(lat, lng, clientAddress = '') {
  if (clientAddress && typeof clientAddress === 'string') {
    const trimmed = clientAddress.trim();
    // Use client address if it is not just blank, generic placeholder, or raw coordinates
    if (
      trimmed.length > 5 &&
      trimmed !== 'GPS Captured' &&
      trimmed !== 'GPS Coordinates Stored' &&
      !/^[-+]?[0-9]*\.?[0-9]+,\s*[-+]?[0-9]*\.?[0-9]+$/.test(trimmed)
    ) {
      return trimmed;
    }
  }

  if (lat == null || lng == null) return '';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'PTS-Attendance/1.0 (contact@luxeworxatelier.com)'
        },
        signal: controller.signal
      }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const clean = formatCleanAddress(data.address, data.display_name);
        if (clean) return clean;
      }
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch {
    // Non-fatal network fallback
  }

  return `${Number(lat).toFixed(6)}°, ${Number(lng).toFixed(6)}°`;
}

/**
 * Public RPC endpoint to reverse-geocode coordinates from the client
 */
export async function reverseGeocodeLocation(params, session) {
  requireAuth(session);
  const data = unwrap(params);
  const { latitude, longitude } = data;
  if (latitude == null || longitude == null) {
    return { address: '' };
  }
  const address = await resolveReadableAddress(latitude, longitude);
  return { address };
}

/**
 * Initializes database tables for Site Employee Management & Attendance.
 * Uses atomic IF NOT EXISTS definitions and required performance indexes.
 */
export async function initSiteAttendanceTables() {
  if (_tablesInitialized) return;

  const statements = [
    // 1. Site Employees
    `CREATE TABLE IF NOT EXISTS site_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      user_email TEXT,
      name TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT DEFAULT 'Site Operations',
      phone TEXT NOT NULL,
      email TEXT,
      photo_url TEXT,
      reporting_manager TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 2. Employee to Project Allocations
    `CREATE TABLE IF NOT EXISTS site_project_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      project TEXT NOT NULL,
      role_at_site TEXT DEFAULT 'Site Engineer',
      is_primary INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      start_date TEXT NOT NULL,
      end_date TEXT,
      allocated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 3. Site Geofences (Project GPS location & allowed radius)
    `CREATE TABLE IF NOT EXISTS site_geofences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT UNIQUE NOT NULL,
      site_address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters INTEGER DEFAULT 200,
      is_mandatory INTEGER DEFAULT 1,
      updated_by TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 4. Daily Attendance Records & Sessions
    `CREATE TABLE IF NOT EXISTS site_attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      project TEXT NOT NULL,
      date TEXT NOT NULL,
      punch_in_time TEXT,
      punch_in_latitude REAL,
      punch_in_longitude REAL,
      punch_in_accuracy REAL,
      punch_in_address TEXT,
      punch_in_selfie TEXT,
      punch_in_verified INTEGER DEFAULT 1,
      punch_in_geo_status TEXT DEFAULT 'within_radius',
      punch_out_time TEXT,
      punch_out_latitude REAL,
      punch_out_longitude REAL,
      punch_out_accuracy REAL,
      punch_out_address TEXT,
      punch_out_selfie TEXT,
      punch_out_verified INTEGER DEFAULT 1,
      punch_out_geo_status TEXT,
      total_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'present',
      is_flagged INTEGER DEFAULT 0,
      flag_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 5. Attendance Correction / Regularisation Requests
    `CREATE TABLE IF NOT EXISTS site_attendance_regularisations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_id INTEGER,
      employee_id TEXT NOT NULL,
      project TEXT NOT NULL,
      date TEXT NOT NULL,
      proposed_punch_in TEXT,
      proposed_punch_out TEXT,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 6. Immutable Attendance Audit Logs
    `CREATE TABLE IF NOT EXISTS site_attendance_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      original_values TEXT,
      new_values TEXT,
      actor_email TEXT NOT NULL,
      actor_name TEXT,
      reason TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Performance Indexes
    `CREATE INDEX IF NOT EXISTS idx_site_alloc_emp ON site_project_allocations(employee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_site_alloc_proj ON site_project_allocations(project, status)`,
    `CREATE INDEX IF NOT EXISTS idx_site_att_date ON site_attendance_records(date)`,
    `CREATE INDEX IF NOT EXISTS idx_site_att_emp ON site_attendance_records(employee_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_site_att_proj ON site_attendance_records(project, date)`,
    `CREATE INDEX IF NOT EXISTS idx_site_reg_status ON site_attendance_regularisations(status)`
  ];

  try {
    for (const sql of statements) {
      await queryRun(sql);
    }
    // Safe sync from users table so all existing PTS users appear in site_employees
    try {
      await queryRun(`ALTER TABLE users ADD COLUMN designation TEXT`);
    } catch (e) { }
    try {
      await queryRun(`
        INSERT OR IGNORE INTO site_employees (employee_id, user_email, name, designation, department, phone, email, status, created_at, updated_at)
        SELECT 
          COALESCE(u.employee_id, 'EMP-' || substr(hex(randomblob(4)), 1, 6)),
          u.email,
          u.name,
          COALESCE(u.designation, 'Site Staff'),
          COALESCE(u.department, 'Site Operations'),
          COALESCE(u.mobile_number, ''),
          u.email,
          CASE WHEN u.active = 0 THEN 'inactive' ELSE 'active' END,
          datetime('now'),
          datetime('now')
        FROM users u
        WHERE u.email NOT IN (SELECT COALESCE(user_email, '') FROM site_employees)
      `);
    } catch (e) { }

    // Clean up past unclosed shifts from previous days so punch_out_time is never dangling NULL
    try {
      const today = getLocalDateString();
      await queryRun(`
        UPDATE site_attendance_records 
        SET punch_out_time = COALESCE(punch_out_time, datetime(punch_in_time, '+9 hours')),
            punch_out_geo_status = 'auto_closed',
            punch_out_address = 'Auto-closed due to missed punch out',
            total_hours = 4.0,
            status = 'half_day',
            is_flagged = 1,
            flag_reason = 'Missed Punch Out (Auto-closed)'
        WHERE date < ? AND punch_in_time IS NOT NULL AND punch_out_time IS NULL
      `, [today]);
    } catch (e) { }

    _tablesInitialized = true;
  } catch (err) {
    console.error('Error initializing site attendance tables:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// Geo Calculation: Haversine distance in meters
// -------------------------------------------------------------
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(nLat2 - nLat1);
  const dLon = toRad(nLon2 - nLon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(nLat1)) * Math.cos(toRad(nLat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Calculate hours between two ISO timestamps
export function calculateWorkingHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  const diffHours = (end - start) / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100; // 2 decimal places
}

// Convert any Date or ISO timestamp into Indian Standard Time (IST = UTC+5:30) components.
// Guarantees 100% deterministic time calculations across Vercel (UTC) and client browsers.
export function getISTParts(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return { hours: 0, minutes: 0, dateString: '', timeString: '00:00', year: 2026, month: 1, day: 1 };
  }
  const istMs = d.getTime() + (5.5 * 60 * 60 * 1000);
  const ist = new Date(istMs);
  const hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const dateString = ist.toISOString().split('T')[0];
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth() + 1,
    day: ist.getUTCDate(),
    hours,
    minutes,
    dateString,
    timeString
  };
}

// Get project/local date YYYY-MM-DD in IST
export function getLocalDateString(dateObj = new Date()) {
  return getISTParts(dateObj).dateString;
}

// Format ISO timestamp into clean IST human-readable time (e.g. "09:30 AM")
export function formatISTTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '—';
  }
}

// Format ISO timestamp into clean IST date (e.g. "19 Nov 2026")
export function formatISTDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
}

// -------------------------------------------------------------
// Helper: Authenticate session
// -------------------------------------------------------------
function requireAuth(session) {
  if (!session || !session.email) {
    throw new Error('AUTH:Not signed in');
  }
}

function isManager(session) {
  if (!session) return false;
  if (isSuperAdmin(session.email)) return true;
  const roles = session.roles || [];
  return roles.some(r => ['admin', 'director', 'pm', 'project_manager', 'site_supervisor', 'operations'].includes(r));
}

// -------------------------------------------------------------
// 1. Employee Management APIs
// -------------------------------------------------------------

/**
 * List all site employees with their active project allocations and today's status.
 */
export async function listSiteEmployees(filters = {}, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const { project, status, search } = unwrap(filters);
  let sql = `
    SELECT e.*, 
      a.project AS current_project,
      a.role_at_site,
      a.start_date AS allocation_start_date,
      a.status AS allocation_status
    FROM site_employees e
    LEFT JOIN site_project_allocations a 
      ON e.employee_id = a.employee_id AND a.status = 'active' AND a.is_primary = 1
    WHERE 1=1
  `;
  const args = [];

  if (project) {
    sql += ` AND a.project = ?`;
    args.push(project);
  }
  if (status) {
    sql += ` AND e.status = ?`;
    args.push(status);
  }
  if (search) {
    sql += ` AND (e.name LIKE ? OR e.employee_id LIKE ? OR e.phone LIKE ? OR e.designation LIKE ?)`;
    const term = `%${search}%`;
    args.push(term, term, term, term);
  }

  // Non-management staff only see their own profile
  if (!isManager(session)) {
    sql += ` AND (LOWER(e.user_email) = LOWER(?) OR LOWER(e.email) = LOWER(?))`;
    args.push(session.email, session.email);
  }

  sql += ` ORDER BY e.name ASC`;

  const employees = await queryAll(sql, args);
  const today = getLocalDateString();

  // Attach today's attendance state
  const attendanceToday = await queryAll(
    `SELECT employee_id, punch_in_time, punch_out_time, status, is_flagged 
     FROM site_attendance_records WHERE date = ?`,
    [today]
  );
  const attMap = new Map();
  for (const a of attendanceToday) {
    attMap.set(a.employee_id, a);
  }

  return employees.map(emp => {
    const att = attMap.get(emp.employee_id);
    let todayStatus = 'absent';
    if (att) {
      if (att.punch_out_time) todayStatus = 'completed';
      else if (att.punch_in_time) todayStatus = 'checked_in';
      else todayStatus = att.status || 'present';
    }
    return {
      ...emp,
      today_status: todayStatus,
      today_record: att || null
    };
  });
}

/**
 * Get detailed profile for a specific employee including allocation & history.
 */
export async function getSiteEmployee(params, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const employeeId = typeof params === 'string'
    ? params
    : (Array.isArray(params)
      ? (typeof params[0] === 'string' ? params[0] : params[0]?.employee_id)
      : params?.employee_id);

  if (!employeeId) throw new Error('Employee ID is required');

  const employee = await queryGet(`SELECT * FROM site_employees WHERE employee_id = ?`, [employeeId]);
  if (!employee) throw new Error('Employee not found');

  const allocations = await queryAll(
    `SELECT * FROM site_project_allocations WHERE employee_id = ? ORDER BY id DESC`,
    [employeeId]
  );

  const recentAttendance = await queryAll(
    `SELECT * FROM site_attendance_records WHERE employee_id = ? ORDER BY date DESC LIMIT 30`,
    [employeeId]
  );

  return {
    ...employee,
    allocations,
    recentAttendance
  };
}

/**
 * Create or update a site employee profile.
 */
export async function createOrUpdateSiteEmployee(data, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const {
    employee_id,
    user_email,
    name,
    designation,
    department = 'Site Operations',
    phone,
    email,
    photo_url,
    reporting_manager,
    status = 'active',
    primary_project
  } = unwrap(data);

  if (!employee_id || !name || !designation || !phone) {
    throw new Error('Employee ID, name, designation, and contact number are required');
  }

  // Upload profile photo to Cloudinary if it is a base64 data URI
  let finalPhotoUrl = photo_url || null;
  if (photo_url && photo_url.startsWith('data:image/')) {
    finalPhotoUrl = await uploadImageToCloud(photo_url, 'employee_photos', `emp_${employee_id}_${Date.now()}`);
  }

  const existing = await queryGet(`SELECT id FROM site_employees WHERE employee_id = ?`, [employee_id]);
  const now = new Date().toISOString();

  if (existing) {
    await queryRun(
      `UPDATE site_employees 
       SET user_email = ?, name = ?, designation = ?, department = ?, phone = ?, 
           email = ?, photo_url = ?, reporting_manager = ?, status = ?, updated_at = ?
       WHERE employee_id = ?`,
      [user_email || null, name, designation, department, phone, email || null, finalPhotoUrl, reporting_manager || null, status, now, employee_id]
    );
  } else {
    await queryRun(
      `INSERT INTO site_employees 
       (employee_id, user_email, name, designation, department, phone, email, photo_url, reporting_manager, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, user_email || null, name, designation, department, phone, email || null, finalPhotoUrl, reporting_manager || null, status, now, now]
    );
  }

  // Synchronize into users table
  try {
    const userEmailToLink = user_email || email;
    if (userEmailToLink) {
      await queryRun(
        `UPDATE users
         SET name = COALESCE(?, name),
             department = ?,
             designation = ?,
             mobile_number = ?,
             employee_id = ?
         WHERE LOWER(email) = ?`,
        [name, department, designation, phone, employee_id, userEmailToLink.toLowerCase()]
      );
    }
  } catch (err) { }

  // If primary project specified, allocate
  if (primary_project) {
    await allocateEmployeeToProject({
      employee_id,
      project: primary_project,
      is_primary: 1,
      role_at_site: designation,
      start_date: getLocalDateString()
    }, session);
  }

  await recordAuditLog(
    session.email,
    existing ? 'Update Site Employee' : 'Create Site Employee',
    `${existing ? 'Updated' : 'Created'} site employee ${name} (${employee_id})`,
    'Site Management'
  );

  return { success: true, employee_id };
}

/**
 * Allocate an employee to a project.
 */
export async function allocateEmployeeToProject(data, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const {
    employee_id,
    project,
    role_at_site = 'Site Engineer',
    is_primary = 1,
    start_date = getLocalDateString(),
    end_date = null
  } = unwrap(data);

  if (!employee_id || !project) {
    throw new Error('Employee ID and project are required');
  }

  // If set to primary, clear existing primary flags for this employee
  if (is_primary) {
    await queryRun(
      `UPDATE site_project_allocations SET is_primary = 0 WHERE employee_id = ? AND status = 'active'`,
      [employee_id]
    );
  }

  const now = new Date().toISOString();
  await queryRun(
    `INSERT INTO site_project_allocations 
     (employee_id, project, role_at_site, is_primary, status, start_date, end_date, allocated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    [employee_id, project, role_at_site, is_primary ? 1 : 0, start_date, end_date, session.email, now, now]
  );

  await recordAuditLog(
    session.email,
    'Allocate Employee to Project',
    `Allocated employee ${employee_id} to project "${project}"`,
    'Site Management'
  );

  return { success: true };
}

/**
 * Transfer an employee from their current project to a new project.
 * Preserves historical records cleanly.
 */
export async function transferEmployeeProject(data, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const {
    employee_id,
    new_project,
    role_at_site = 'Site Engineer',
    transfer_date = getLocalDateString(),
    reason = ''
  } = unwrap(data);

  if (!employee_id || !new_project) {
    throw new Error('Employee ID and new project are required');
  }

  const now = new Date().toISOString();

  // Deactivate previous active allocations
  await queryRun(
    `UPDATE site_project_allocations 
     SET status = 'transferred', end_date = ?, updated_at = ?
     WHERE employee_id = ? AND status = 'active'`,
    [transfer_date, now, employee_id]
  );

  // Create new active allocation
  await queryRun(
    `INSERT INTO site_project_allocations 
     (employee_id, project, role_at_site, is_primary, status, start_date, allocated_by, created_at, updated_at)
     VALUES (?, ?, ?, 1, 'active', ?, ?, ?, ?)`,
    [employee_id, new_project, role_at_site, transfer_date, session.email, now, now]
  );

  await recordAuditLog(
    session.email,
    'Transfer Employee Project',
    `Transferred employee ${employee_id} to "${new_project}". Reason: ${reason || 'Operational deployment'}`,
    'Site Management'
  );

  return { success: true };
}

// -------------------------------------------------------------
// 2. Geofence Configuration APIs
// -------------------------------------------------------------

export async function getSiteGeofence(project, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const proj = typeof project === 'string'
    ? project
    : (Array.isArray(project)
      ? (typeof project[0] === 'string' ? project[0] : project[0]?.project)
      : project?.project);

  if (!proj) return null;

  const geofence = await queryGet(`SELECT * FROM site_geofences WHERE project = ?`, [proj]);
  return geofence || null;
}

export async function saveSiteGeofence(data, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const {
    project,
    site_address,
    latitude,
    longitude,
    radius_meters = 200,
    is_mandatory = 1
  } = unwrap(data);

  if (!project || latitude == null || longitude == null) {
    throw new Error('Project, latitude, and longitude are required');
  }

  const existing = await queryGet(`SELECT id FROM site_geofences WHERE project = ?`, [project]);
  const now = new Date().toISOString();

  if (existing) {
    await queryRun(
      `UPDATE site_geofences 
       SET site_address = ?, latitude = ?, longitude = ?, radius_meters = ?, is_mandatory = ?, updated_by = ?, updated_at = ?
       WHERE project = ?`,
      [site_address || '', Number(latitude), Number(longitude), Number(radius_meters), is_mandatory ? 1 : 0, session.email, now, project]
    );
  } else {
    await queryRun(
      `INSERT INTO site_geofences 
       (project, site_address, latitude, longitude, radius_meters, is_mandatory, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [project, site_address || '', Number(latitude), Number(longitude), Number(radius_meters), is_mandatory ? 1 : 0, session.email, now]
    );
  }

  await recordAuditLog(
    session.email,
    'Configure Site Geofence',
    `Configured geofence for project "${project}" at (${latitude}, ${longitude}) with radius ${radius_meters}m`,
    'Site Management'
  );

  return { success: true };
}

// -------------------------------------------------------------
// 3. Attendance Punching (Selfie + GPS)
// -------------------------------------------------------------

/**
 * Submit an attendance punch (Punch In or Punch Out).
 */
export async function punchAttendance(punchData, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const data = unwrap(punchData);

  // Normalize punch type: support 'in', 'out', 'punch_in', 'punch_out', 'checkin', 'checkout'
  let type = String(data.type || '').trim().toLowerCase().replace(/^punch_?/, '');
  if (type === 'checkin' || type === 'check_in') type = 'in';
  if (type === 'checkout' || type === 'check_out') type = 'out';

  if (!type || !['in', 'out'].includes(type)) {
    throw new Error('Invalid punch type. Must be "in" or "out".');
  }

  const {
    project,
    selfie, // base64 string or url
    latitude,
    longitude,
    accuracy,
    address = '',
    allow_flagged = false
  } = data;

  if (!selfie) {
    throw new Error('Live selfie photograph is required for attendance verification.');
  }

  const numLat = Number(latitude);
  const numLng = Number(longitude);
  if (latitude == null || longitude == null || isNaN(numLat) || isNaN(numLng)) {
    throw new Error('GPS coordinates are required. Exact latitude and longitude must be provided.');
  }

  const numAcc = accuracy != null && !isNaN(Number(accuracy)) ? Math.round(Number(accuracy)) : null;

  // Reverse geocode to exact human-readable address on server
  const resolvedAddress = await resolveReadableAddress(numLat, numLng, address);

  // Resolve employee identity from session
  let employee = null;
  if (data.employee_id && isManager(session)) {
    // Manager punching on behalf or testing
    employee = await queryGet(`SELECT * FROM site_employees WHERE employee_id = ?`, [data.employee_id]);
  } else {
    // Find employee linked to session email, or match by email
    employee = await queryGet(`SELECT * FROM site_employees WHERE user_email = ? OR email = ?`, [session.email, session.email]);
  }

  if (!employee) {
    // Auto-create or resolve employee record from users table
    const userRow = await queryGet(`SELECT * FROM users WHERE email = ?`, [session.email]);
    const empId = userRow?.employee_id || `EMP-${Date.now().toString().slice(-4)}`;
    const empName = userRow?.name || session.email.split('@')[0];
    const now = new Date().toISOString();

    await queryRun(
      `INSERT OR IGNORE INTO site_employees (employee_id, user_email, name, designation, phone, email, created_at, updated_at)
       VALUES (?, ?, ?, 'Site Engineer', ?, ?, ?, ?)`,
      [empId, session.email, empName, userRow?.mobile_number || '0000000000', session.email, now, now]
    );

    employee = await queryGet(`SELECT * FROM site_employees WHERE employee_id = ?`, [empId]);
  }

  // Resolve assigned project
  let targetProject = project;
  if (!targetProject) {
    const allocation = await queryGet(
      `SELECT project FROM site_project_allocations WHERE employee_id = ? AND status = 'active' ORDER BY is_primary DESC LIMIT 1`,
      [employee.employee_id]
    );
    targetProject = allocation?.project || 'General Project';
  }

  const today = getLocalDateString();
  const serverTimestamp = new Date().toISOString();

  // Geofence verification
  const geofence = await queryGet(`SELECT * FROM site_geofences WHERE project = ?`, [targetProject]);
  let geoStatus = 'within_radius';
  let isFlagged = 0;
  let flagReason = '';

  if (geofence && geofence.latitude != null && geofence.longitude != null) {
    const distMeters = calculateDistanceMeters(numLat, numLng, geofence.latitude, geofence.longitude);
    const maxRadius = geofence.radius_meters || 200;

    if (distMeters != null && distMeters > maxRadius) {
      geoStatus = 'outside_radius';
      isFlagged = 1;
      flagReason = `Punched ${distMeters}m away from site (Allowed: ${maxRadius}m)`;

      if (geofence.is_mandatory && !isManager(session) && !allow_flagged) {
        throw new Error(`PUNCH_BLOCKED: You are ${distMeters}m outside the designated site boundary. Attendance must be punched within ${maxRadius}m of the site.`);
      }
    }
  }

  if (numAcc && numAcc > 100) {
    if (geoStatus === 'within_radius') {
      geoStatus = 'low_accuracy';
    }
  }

  // Check today's existing attendance record
  const existingRecord = await queryGet(
    `SELECT * FROM site_attendance_records WHERE employee_id = ? AND date = ?`,
    [employee.employee_id, today]
  );

  // Upload selfie snapshot to Cloudinary free storage
  const cleanProjSlug = String(targetProject || 'site').replace(/[^a-zA-Z0-9_-]/g, '_');
  const storedSelfie = await uploadImageToCloud(
    selfie,
    `selfies/${cleanProjSlug}/${today}`,
    `${employee.employee_id}_${type}_${Date.now()}`
  );

  let recordId;

  if (type === 'in') {
    if (existingRecord && existingRecord.punch_in_time) {
      throw new Error(`ALREADY_PUNCHED_IN: You have already punched in today at ${new Date(existingRecord.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
    }

    // Auto-close any unclosed past shifts from previous days (date < today)
    // Ensures yesterday's missed punch-out never locks or corrupts future days
    await queryRun(
      `UPDATE site_attendance_records 
       SET punch_out_time = COALESCE(punch_out_time, datetime(punch_in_time, '+9 hours')),
           punch_out_geo_status = 'auto_closed',
           punch_out_address = 'Auto-closed on next shift punch-in',
           total_hours = 4.0,
           status = 'half_day',
           is_flagged = 1,
           flag_reason = 'Missed Punch Out (Auto-closed on next shift punch-in)',
           updated_at = ?
       WHERE employee_id = ? AND date < ? AND punch_in_time IS NOT NULL AND punch_out_time IS NULL`,
      [serverTimestamp, employee.employee_id, today]
    );

    if (existingRecord) {
      // Update existing record
      await queryRun(
        `UPDATE site_attendance_records 
         SET punch_in_time = ?, punch_in_latitude = ?, punch_in_longitude = ?, punch_in_accuracy = ?,
             punch_in_address = ?, punch_in_selfie = ?, punch_in_geo_status = ?,
             is_flagged = ?, flag_reason = ?, updated_at = ?
         WHERE id = ?`,
        [serverTimestamp, numLat, numLng, numAcc, resolvedAddress, storedSelfie, geoStatus, isFlagged, flagReason, serverTimestamp, existingRecord.id]
      );
      recordId = existingRecord.id;
    } else {
      // Create new record
      const result = await queryRun(
        `INSERT INTO site_attendance_records 
         (employee_id, employee_name, project, date, punch_in_time, punch_in_latitude, punch_in_longitude,
          punch_in_accuracy, punch_in_address, punch_in_selfie, punch_in_geo_status, status, is_flagged, flag_reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'present', ?, ?, ?, ?)`,
        [employee.employee_id, employee.name, targetProject, today, serverTimestamp, numLat, numLng, numAcc, resolvedAddress, storedSelfie, geoStatus, isFlagged, flagReason, serverTimestamp, serverTimestamp]
      );
      recordId = result.lastInsertRowid;
    }

    // Audit log
    await queryRun(
      `INSERT INTO site_attendance_audit_logs (attendance_id, action, new_values, actor_email, actor_name, timestamp)
       VALUES (?, 'punch_in', ?, ?, ?, ?)`,
      [recordId || 0, JSON.stringify({ type: 'in', timestamp: serverTimestamp, latitude: numLat, longitude: numLng, accuracy: numAcc, address: resolvedAddress, geoStatus }), session.email, employee.name, serverTimestamp]
    );

    return {
      success: true,
      type: 'in',
      timestamp: serverTimestamp,
      project: targetProject,
      geoStatus,
      latitude: numLat,
      longitude: numLng,
      accuracy: numAcc,
      address: resolvedAddress,
      isFlagged: Boolean(isFlagged),
      flagReason
    };
  } else {
    // Punch Out: supports standard same-day punch out AND cross-midnight overnight shifts
    let targetRecord = existingRecord;
    if (!targetRecord || !targetRecord.punch_in_time) {
      // Look for an unclosed overnight shift from yesterday (within 16 hours)
      const openShift = await queryGet(
        `SELECT * FROM site_attendance_records 
         WHERE employee_id = ? AND date < ? AND punch_in_time IS NOT NULL AND punch_out_time IS NULL
         ORDER BY id DESC LIMIT 1`,
        [employee.employee_id, today]
      );
      if (openShift) {
        const punchInMs = new Date(openShift.punch_in_time).getTime();
        const elapsedHours = (Date.now() - punchInMs) / (1000 * 60 * 60);
        if (elapsedHours <= 16) {
          targetRecord = openShift;
        }
      }
    }

    if (!targetRecord || !targetRecord.punch_in_time) {
      throw new Error('INVALID_PUNCH_OUT: Cannot punch out without an active punch-in for today.');
    }

    // If already punched out, permit departure time extension if current time is later
    if (targetRecord.punch_out_time) {
      const prevOutMs = new Date(targetRecord.punch_out_time).getTime();
      const currentMs = new Date(serverTimestamp).getTime();
      if (currentMs <= prevOutMs) {
        throw new Error(`ALREADY_PUNCHED_OUT: You have already punched out today at ${new Date(targetRecord.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
      }
    }

    const totalHours = calculateWorkingHours(targetRecord.punch_in_time, serverTimestamp);
    let finalStatus = 'present';
    if (totalHours < 4) finalStatus = 'half_day';

    await queryRun(
      `UPDATE site_attendance_records 
       SET punch_out_time = ?, punch_out_latitude = ?, punch_out_longitude = ?, punch_out_accuracy = ?,
           punch_out_address = ?, punch_out_selfie = ?, punch_out_geo_status = ?,
           total_hours = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [serverTimestamp, numLat, numLng, numAcc, resolvedAddress, storedSelfie, geoStatus, totalHours, finalStatus, serverTimestamp, targetRecord.id]
    );

    await queryRun(
      `INSERT INTO site_attendance_audit_logs (attendance_id, action, new_values, actor_email, actor_name, timestamp)
       VALUES (?, 'punch_out', ?, ?, ?, ?)`,
      [targetRecord.id, JSON.stringify({ type: 'out', timestamp: serverTimestamp, latitude: numLat, longitude: numLng, accuracy: numAcc, address: resolvedAddress, totalHours, geoStatus }), session.email, employee.name, serverTimestamp]
    );

    return {
      success: true,
      type: 'out',
      timestamp: serverTimestamp,
      totalHours,
      status: finalStatus,
      geoStatus,
      latitude: numLat,
      longitude: numLng,
      accuracy: numAcc,
      address: resolvedAddress
    };
  }
}

/**
 * Get current employee's attendance status today & active project.
 * Automatically handles missed punch-outs, overnight shifts, and cleans up stale records.
 */
export async function getMyAttendanceToday(session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const employee = await queryGet(
    `SELECT * FROM site_employees WHERE LOWER(user_email) = LOWER(?) OR LOWER(email) = LOWER(?)`,
    [session.email, session.email]
  );
  if (!employee) {
    return { employee: null, record: null, activeProject: null };
  }

  const today = getLocalDateString();
  const serverTimestamp = new Date().toISOString();
  const nowMs = Date.now();

  // 1. Check today's actual attendance record
  let todayRecord = await queryGet(
    `SELECT * FROM site_attendance_records WHERE employee_id = ? AND date = ?`,
    [employee.employee_id, today]
  );

  // 2. Check for any unclosed shift from previous days (date < today)
  let activeOvernightShift = null;
  let recentMissedPunch = null;

  const openPastShift = await queryGet(
    `SELECT * FROM site_attendance_records 
     WHERE employee_id = ? AND date < ? AND punch_in_time IS NOT NULL AND punch_out_time IS NULL
     ORDER BY id DESC LIMIT 1`,
    [employee.employee_id, today]
  );

  if (openPastShift) {
    const punchInMs = new Date(openPastShift.punch_in_time).getTime();
    const elapsedHours = (nowMs - punchInMs) / (1000 * 60 * 60);
    const inParts = getISTParts(openPastShift.punch_in_time);
    const currentIst = getISTParts(new Date());

    // Only treat as ongoing overnight shift if:
    // - Started in evening/night (>= 17:00 / 5 PM IST)
    // - Elapsed time <= 14 hours
    // - Current time is still morning (before 10:00 AM IST)
    // - Today has not already been punched in
    const isOngoingOvernight = (
      inParts.hours >= 17 &&
      elapsedHours <= 14 &&
      currentIst.hours < 10 &&
      !todayRecord
    );

    if (isOngoingOvernight) {
      activeOvernightShift = openPastShift;
    } else {
      // Normal day shift or elapsed shift.
      // Auto-close it cleanly and set punch_out_time so it NEVER hijacks today's attendance!
      const autoOutMs = punchInMs + (9 * 60 * 60 * 1000);
      const autoOutTime = new Date(Math.min(autoOutMs, nowMs)).toISOString();
      const autoHours = 4.0;

      await queryRun(
        `UPDATE site_attendance_records 
         SET punch_out_time = ?,
             punch_out_geo_status = 'auto_closed',
             punch_out_address = 'Auto-closed due to missed punch out',
             total_hours = ?,
             status = 'half_day',
             is_flagged = 1,
             flag_reason = 'Missed Punch Out (Auto-closed)',
             updated_at = ?
         WHERE id = ?`,
        [autoOutTime, autoHours, serverTimestamp, openPastShift.id]
      );
      recentMissedPunch = {
        ...openPastShift,
        punch_out_time: autoOutTime,
        total_hours: autoHours,
        status: 'half_day',
        is_flagged: 1,
        flag_reason: 'Missed Punch Out (Auto-closed)'
      };
    }
  }

  // If no recentMissedPunch found in openPastShift but yesterday had missed punch out,
  // load it so user gets the proactive notification banner
  if (!recentMissedPunch && !todayRecord) {
    const pastMissed = await queryGet(
      `SELECT * FROM site_attendance_records 
       WHERE employee_id = ? AND date < ? AND flag_reason LIKE '%Missed Punch Out%'
       ORDER BY date DESC LIMIT 1`,
      [employee.employee_id, today]
    );
    if (pastMissed) {
      const daysDiff = (new Date(today).getTime() - new Date(pastMissed.date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 3) {
        recentMissedPunch = pastMissed;
      }
    }
  }

  const activeAllocation = await queryGet(
    `SELECT project FROM site_project_allocations WHERE employee_id = ? AND status = 'active' ORDER BY is_primary DESC LIMIT 1`,
    [employee.employee_id]
  );

  return {
    employee,
    record: todayRecord || activeOvernightShift || null,
    isOvernightShift: Boolean(activeOvernightShift && !todayRecord),
    overnightShift: activeOvernightShift,
    recentMissedPunch,
    todayDate: today,
    activeProject: activeAllocation?.project || 'General Project'
  };
}

/**
 * Get personal attendance history for the logged-in employee.
 */
export async function getMyAttendanceHistory(filters = {}, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const employee = await queryGet(`SELECT employee_id FROM site_employees WHERE user_email = ? OR email = ?`, [session.email, session.email]);
  if (!employee) return [];

  const { limit = 60, month, year } = unwrap(filters);
  let sql = `SELECT * FROM site_attendance_records WHERE employee_id = ?`;
  const args = [employee.employee_id];

  if (month && year) {
    const formattedMonth = String(month).padStart(2, '0');
    sql += ` AND date LIKE ?`;
    args.push(`${year}-${formattedMonth}%`);
  }

  sql += ` ORDER BY date DESC LIMIT ?`;
  args.push(Number(limit));

  return queryAll(sql, args);
}

// -------------------------------------------------------------
// 4. Management Attendance Dashboard APIs
// -------------------------------------------------------------

/**
 * Get KPIs for the attendance dashboard.
 */
export async function getManagementAttendanceKPIs(filters = {}, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  if (!isManager(session)) {
    return {
      totalAssigned: 0,
      presentToday: 0,
      currentlyCheckedIn: 0,
      pendingPunchOuts: 0,
      absentToday: 0,
      lateArrivals: 0,
      flaggedPunches: 0,
      isRestricted: true
    };
  }

  const f = unwrap(filters);
  const targetDate = f.date || getLocalDateString();
  const { project } = f;

  let totalAllocatedSql = `SELECT COUNT(DISTINCT employee_id) as total FROM site_project_allocations WHERE status = 'active'`;
  let attSql = `SELECT * FROM site_attendance_records WHERE date = ?`;
  const allocArgs = [];
  const attArgs = [targetDate];

  if (project) {
    totalAllocatedSql += ` AND project = ?`;
    allocArgs.push(project);
    attSql += ` AND project = ?`;
    attArgs.push(project);
  }

  const totalAllocRow = await queryGet(totalAllocatedSql, allocArgs);
  const totalAssigned = totalAllocRow?.total || 0;

  const records = await queryAll(attSql, attArgs);

  let presentToday = 0;
  let currentlyCheckedIn = 0;
  let pendingPunchOuts = 0;
  let lateArrivals = 0;
  let flaggedPunches = 0;

  records.forEach(r => {
    if (r.punch_in_time) {
      presentToday++;
      if (!r.punch_out_time) {
        currentlyCheckedIn++;
        pendingPunchOuts++;
      }
      // Check late (e.g. after 09:30 AM IST) - deterministic across Vercel (UTC) servers
      const { hours: punchHour, minutes: punchMin } = getISTParts(r.punch_in_time);
      if (punchHour > 9 || (punchHour === 9 && punchMin > 30)) {
        lateArrivals++;
      }
    }
    if (r.is_flagged) flaggedPunches++;
  });

  const absentToday = Math.max(0, totalAssigned - presentToday);

  return {
    date: targetDate,
    project: project || 'All Projects',
    totalAssigned,
    presentToday,
    absentToday,
    currentlyCheckedIn,
    pendingPunchOuts,
    lateArrivals,
    flaggedPunches
  };
}

/**
 * Get daily attendance register records day-wise with rich filtering.
 */
export async function getDailyAttendanceRegister(filters = {}, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const {
    date = getLocalDateString(),
    startDate,
    endDate,
    project,
    employeeId,
    status,
    search,
    limit = 200
  } = unwrap(filters);

  let targetEmployeeId = employeeId;
  if (!isManager(session)) {
    const emp = await queryGet(
      `SELECT employee_id FROM site_employees WHERE user_email = ? OR email = ?`,
      [session.email, session.email]
    );
    if (!emp) return [];
    targetEmployeeId = emp.employee_id;
  }

  let sql = `SELECT * FROM site_attendance_records WHERE 1=1`;
  const args = [];

  if (targetEmployeeId) {
    sql += ` AND employee_id = ?`;
    args.push(targetEmployeeId);
  }

  if (startDate && endDate) {
    sql += ` AND date BETWEEN ? AND ?`;
    args.push(startDate, endDate);
  } else if (date) {
    sql += ` AND date = ?`;
    args.push(date);
  }

  if (project) {
    sql += ` AND project = ?`;
    args.push(project);
  }

  if (employeeId && targetEmployeeId !== employeeId) {
    sql += ` AND employee_id = ?`;
    args.push(employeeId);
  }

  if (status) {
    if (status === 'flagged') {
      sql += ` AND is_flagged = 1`;
    } else {
      sql += ` AND status = ?`;
      args.push(status);
    }
  }

  if (search) {
    sql += ` AND (employee_name LIKE ? OR employee_id LIKE ? OR project LIKE ?)`;
    const term = `%${search}%`;
    args.push(term, term, term);
  }

  sql += ` ORDER BY date DESC, punch_in_time DESC LIMIT ?`;
  args.push(Number(limit));

  return queryAll(sql, args);
}

/**
 * Get project-level site workforce summary for the Project Details tab.
 */
export async function getProjectWorkforceSummary(project, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const proj = typeof project === 'string'
    ? project
    : (Array.isArray(project)
      ? (typeof project[0] === 'string' ? project[0] : project[0]?.project)
      : project?.project);

  if (!proj) throw new Error('Project name is required');

  const today = getLocalDateString();

  // 1. Allocated workforce
  const allocatedEmployees = await queryAll(
    `SELECT e.*, a.role_at_site, a.is_primary, a.start_date, a.status AS alloc_status
     FROM site_employees e
     JOIN site_project_allocations a ON e.employee_id = a.employee_id
     WHERE a.project = ? AND a.status = 'active'
     ORDER BY e.name ASC`,
    [proj]
  );

  // 2. Today's attendance for this project (including active overnight shifts within 24 hours)
  const todayAttendance = await queryAll(
    `SELECT * FROM site_attendance_records 
     WHERE project = ? AND (date = ? OR (punch_in_time IS NOT NULL AND punch_out_time IS NULL))`,
    [proj, today]
  );

  const attMap = new Map();
  const nowMs = Date.now();
  todayAttendance.forEach(a => {
    if (a.date === today) {
      attMap.set(a.employee_id, a);
    } else if (a.punch_in_time && !a.punch_out_time) {
      const pInMs = new Date(a.punch_in_time).getTime();
      if (nowMs - pInMs <= 24 * 60 * 60 * 1000) {
        if (!attMap.has(a.employee_id)) {
          attMap.set(a.employee_id, a);
        }
      }
    }
  });

  let presentCount = 0;
  let currentlyOnSite = 0;

  const workforceWithToday = allocatedEmployees.map(emp => {
    const att = attMap.get(emp.employee_id);
    let st = 'absent';
    if (att) {
      if (att.punch_in_time && !att.punch_out_time) {
        st = 'on_site';
        presentCount++;
        currentlyOnSite++;
      } else if (att.punch_out_time) {
        st = 'checked_out';
        presentCount++;
      } else {
        st = att.status || 'present';
        presentCount++;
      }
    }
    return {
      ...emp,
      today_status: st,
      today_record: att || null
    };
  });

  // 3. Historical project attendance
  const history = await queryAll(
    `SELECT * FROM site_attendance_records WHERE project = ? ORDER BY date DESC LIMIT 50`,
    [proj]
  );

  // 4. Geofence
  const geofence = await queryGet(`SELECT * FROM site_geofences WHERE project = ?`, [proj]);

  return {
    project: proj,
    totalAllocated: allocatedEmployees.length,
    presentToday: presentCount,
    absentToday: Math.max(0, allocatedEmployees.length - presentCount),
    currentlyOnSite,
    geofence: geofence || null,
    workforce: workforceWithToday,
    recentAttendance: history,
    recentHistory: history
  };
}

// -------------------------------------------------------------
// 5. Attendance Regularisation & Audit Trail
// -------------------------------------------------------------

/**
 * Submit an attendance regularisation/correction request.
 */
export async function submitAttendanceRegularisation(data, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  let {
    attendance_id,
    employee_id,
    project,
    date,
    proposed_punch_in,
    proposed_punch_out,
    reason
  } = unwrap(data);

  // Fallback to employee profile linked to user session if employee_id is omitted
  if (!employee_id) {
    const emp = await queryGet(`SELECT employee_id FROM site_employees WHERE user_email = ? OR email = ?`, [session.email, session.email]);
    employee_id = emp?.employee_id;
  }

  if (!employee_id || !project || !date || !reason) {
    throw new Error('Employee ID, project, date, and reason are required');
  }

  const now = new Date().toISOString();
  const result = await queryRun(
    `INSERT INTO site_attendance_regularisations
     (attendance_id, employee_id, project, date, proposed_punch_in, proposed_punch_out, reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [attendance_id || null, employee_id, project, date, proposed_punch_in || null, proposed_punch_out || null, reason, now]
  );

  const regId = result.lastInsertRowid;

  if (attendance_id) {
    await queryRun(
      `INSERT INTO site_attendance_audit_logs (attendance_id, action, new_values, actor_email, reason, timestamp)
       VALUES (?, 'regularisation_requested', ?, ?, ?, ?)`,
      [attendance_id, JSON.stringify({ proposed_punch_in, proposed_punch_out, regId }), session.email, reason, now]
    );
  }

  return { success: true, id: regId };
}

/**
 * List regularisation requests for review.
 */
export async function listAttendanceRegularisations(filters = {}, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const { status = 'pending', project, employee_id } = unwrap(filters);
  let sql = `
    SELECT r.*, e.name as employee_name, e.designation, e.phone
    FROM site_attendance_regularisations r
    LEFT JOIN site_employees e ON r.employee_id = e.employee_id
    WHERE 1=1
  `;
  const args = [];

  if (status && status !== 'all') {
    sql += ` AND r.status = ?`;
    args.push(status);
  }
  if (project) {
    sql += ` AND r.project = ?`;
    args.push(project);
  }
  if (employee_id) {
    sql += ` AND r.employee_id = ?`;
    args.push(employee_id);
  }

  sql += ` ORDER BY r.created_at DESC LIMIT 100`;

  return queryAll(sql, args);
}

/**
 * Approve or Reject attendance regularisation request.
 */
export async function reviewAttendanceRegularisation(data, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const { id, decision, review_notes = '' } = unwrap(data); // decision: 'approved' | 'rejected'
  if (!id || !['approved', 'rejected'].includes(decision)) {
    throw new Error('Valid regularisation ID and decision (approved/rejected) are required');
  }

  const reg = await queryGet(`SELECT * FROM site_attendance_regularisations WHERE id = ?`, [id]);
  if (!reg) throw new Error('Regularisation request not found');

  const now = new Date().toISOString();

  // Update regularisation status
  await queryRun(
    `UPDATE site_attendance_regularisations 
     SET status = ?, reviewed_by = ?, reviewed_at = ?, review_notes = ?
     WHERE id = ?`,
    [decision, session.email, now, review_notes, id]
  );

  // If approved, update attendance record
  if (decision === 'approved') {
    const totalHours = calculateWorkingHours(reg.proposed_punch_in, reg.proposed_punch_out);
    let finalStatus = 'present';
    if (totalHours < 4 && totalHours > 0) finalStatus = 'half_day';

    if (reg.attendance_id) {
      const orig = await queryGet(`SELECT * FROM site_attendance_records WHERE id = ?`, [reg.attendance_id]);

      await queryRun(
        `UPDATE site_attendance_records 
         SET punch_in_time = COALESCE(?, punch_in_time),
             punch_out_time = COALESCE(?, punch_out_time),
             total_hours = ?,
             status = ?,
             is_flagged = 0,
             updated_at = ?
         WHERE id = ?`,
        [reg.proposed_punch_in, reg.proposed_punch_out, totalHours, finalStatus, now, reg.attendance_id]
      );

      // Audit log
      await queryRun(
        `INSERT INTO site_attendance_audit_logs (attendance_id, action, original_values, new_values, actor_email, reason, timestamp)
         VALUES (?, 'regularisation_approved', ?, ?, ?, ?, ?)`,
        [
          reg.attendance_id,
          JSON.stringify({ in: orig?.punch_in_time, out: orig?.punch_out_time, hours: orig?.total_hours }),
          JSON.stringify({ in: reg.proposed_punch_in, out: reg.proposed_punch_out, hours: totalHours }),
          session.email,
          `Regularisation approved by ${session.email}: ${review_notes || reg.reason}`,
          now
        ]
      );
    } else {
      // Create fresh regularized record
      const emp = await queryGet(`SELECT name FROM site_employees WHERE employee_id = ?`, [reg.employee_id]);
      const res = await queryRun(
        `INSERT INTO site_attendance_records 
         (employee_id, employee_name, project, date, punch_in_time, punch_out_time, total_hours, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [reg.employee_id, emp?.name || 'Employee', reg.project, reg.date, reg.proposed_punch_in, reg.proposed_punch_out, totalHours, finalStatus, now, now]
      );

      await queryRun(
        `INSERT INTO site_attendance_audit_logs (attendance_id, action, new_values, actor_email, reason, timestamp)
         VALUES (?, 'regularisation_created', ?, ?, ?, ?)`,
        [res.lastInsertRowid || 0, JSON.stringify({ in: reg.proposed_punch_in, out: reg.proposed_punch_out, hours: totalHours }), session.email, review_notes || reg.reason, now]
      );
    }
  } else {
    // Rejected audit log
    if (reg.attendance_id) {
      await queryRun(
        `INSERT INTO site_attendance_audit_logs (attendance_id, action, actor_email, reason, timestamp)
         VALUES (?, 'regularisation_rejected', ?, ?, ?)`,
        [reg.attendance_id, session.email, `Rejected: ${review_notes}`, now]
      );
    }
  }

  await recordAuditLog(
    session.email,
    'Review Attendance Regularisation',
    `${decision.toUpperCase()} attendance regularisation #${id} for ${reg.employee_id} on ${reg.date}`,
    'Site Management'
  );

  return { success: true, decision };
}

/**
 * Get audit logs for a specific attendance record.
 */
export async function getAttendanceAuditLogs(attendanceId, session) {
  requireAuth(session);
  await initSiteAttendanceTables();

  const id = typeof attendanceId === 'number' || typeof attendanceId === 'string'
    ? attendanceId
    : (Array.isArray(attendanceId) ? attendanceId[0] : attendanceId?.attendance_id);

  if (!id) return [];

  return queryAll(
    `SELECT * FROM site_attendance_audit_logs WHERE attendance_id = ? ORDER BY timestamp DESC`,
    [id]
  );
}
