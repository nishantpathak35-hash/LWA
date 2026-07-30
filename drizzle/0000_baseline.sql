-- Baseline Schema Migration for LWA ERP Database (libsql / Turso)

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  user TEXT,
  action_type TEXT,
  details TEXT,
  department TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_data TEXT NOT NULL,
  uploaded_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_locks (
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  locked_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (entity, entity_id)
);

CREATE TABLE IF NOT EXISTS document_presence (
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  last_active TEXT NOT NULL,
  PRIMARY KEY (entity, entity_id, user_email)
);

CREATE TABLE IF NOT EXISTS broadcast_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dpr_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project TEXT NOT NULL,
  site TEXT,
  client TEXT,
  date TEXT NOT NULL,
  prepared_by TEXT,
  weather TEXT,
  shift TEXT,
  status TEXT,
  approval_status TEXT DEFAULT 'Draft',
  checked_by TEXT,
  approved_by TEXT,
  data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dpr_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wpr_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project TEXT NOT NULL,
  milestone_name TEXT NOT NULL,
  floor_zone TEXT,
  planned_start TEXT,
  planned_end TEXT,
  planned_progress_curve TEXT,
  render_image_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wpr_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project TEXT NOT NULL,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  generated_by TEXT,
  planned_progress REAL,
  actual_progress REAL,
  variance REAL,
  render_image_url TEXT,
  actual_image_url TEXT,
  summary_text TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
