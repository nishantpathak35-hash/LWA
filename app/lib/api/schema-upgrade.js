import { queryRun } from '../db.js';

let _schemaUpgradePromise = null;

export async function initEnterpriseUpgradeSchemas() {
  if (_schemaUpgradePromise) return _schemaUpgradePromise;

  _schemaUpgradePromise = (async () => {
    const tableQueries = [
      // 1. Clients Table (ensure columns)
      `CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company_name TEXT,
        email TEXT UNIQUE,
        contact TEXT,
        gst TEXT,
        pan TEXT,
        address TEXT,
        state TEXT,
        status TEXT DEFAULT 'Active',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        deleted_by TEXT
      )`,

      // 2. Rate Contracts
      `CREATE TABLE IF NOT EXISTS rate_contracts (
        id TEXT PRIMARY KEY,
        contract_no TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        vendor_id TEXT,
        vendor_name TEXT NOT NULL,
        vendor_key TEXT,
        contract_type TEXT DEFAULT 'annual',
        project TEXT,
        valid_from TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        status TEXT DEFAULT 'Active',
        approval_status TEXT DEFAULT 'Approved',
        terms_conditions TEXT,
        attachment_url TEXT,
        version INTEGER DEFAULT 1,
        total_contract_value REAL DEFAULT 0,
        utilised_value REAL DEFAULT 0,
        created_by TEXT,
        approved_by TEXT,
        approved_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // 3. Rate Contract Items
      `CREATE TABLE IF NOT EXISTS rate_contract_items (
        id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        item_code TEXT,
        item_name TEXT NOT NULL,
        category TEXT,
        subcategory TEXT,
        description TEXT,
        unit TEXT NOT NULL DEFAULT 'Nos',
        agreed_rate REAL NOT NULL DEFAULT 0,
        tax_pct REAL DEFAULT 18,
        freight_included INTEGER DEFAULT 1,
        installation_included INTEGER DEFAULT 0,
        min_qty REAL DEFAULT 0,
        max_qty REAL,
        utilised_qty REAL DEFAULT 0,
        utilised_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES rate_contracts(id) ON DELETE CASCADE
      )`,

      // 4. Project Schedules
      `CREATE TABLE IF NOT EXISTS project_schedules (
        id TEXT PRIMARY KEY,
        project TEXT UNIQUE NOT NULL,
        title TEXT,
        baseline_start_date TEXT,
        baseline_end_date TEXT,
        status TEXT DEFAULT 'Active',
        version INTEGER DEFAULT 1,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // 5. Schedule Tasks
      `CREATE TABLE IF NOT EXISTS schedule_tasks (
        id TEXT PRIMARY KEY,
        schedule_id TEXT NOT NULL,
        project TEXT NOT NULL,
        task_no TEXT,
        title TEXT NOT NULL,
        description TEXT,
        work_package TEXT DEFAULT 'General',
        milestone_id TEXT,
        boq_item_id TEXT,
        boq_section_id TEXT,
        assigned_to_id TEXT,
        assigned_to_name TEXT,
        accountable_owner_id TEXT,
        accountable_owner_name TEXT,
        planned_start_date TEXT NOT NULL,
        planned_end_date TEXT NOT NULL,
        actual_start_date TEXT,
        actual_end_date TEXT,
        priority TEXT DEFAULT 'Medium',
        dependencies TEXT,
        planned_qty REAL DEFAULT 0,
        actual_qty REAL DEFAULT 0,
        uom TEXT DEFAULT 'Nos',
        progress_pct REAL DEFAULT 0,
        status TEXT DEFAULT 'Not Started',
        completion_date TEXT,
        completed_by TEXT,
        verified_by TEXT,
        verification_status TEXT DEFAULT 'Unverified',
        linked_dpr_id INTEGER,
        delay_reason TEXT,
        blockers TEXT,
        attachments TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // 6. Schedule Task History / Audit
      `CREATE TABLE IF NOT EXISTS schedule_task_history (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changed_by TEXT,
        prev_progress REAL,
        new_progress REAL,
        prev_status TEXT,
        new_status TEXT,
        dpr_id INTEGER,
        remarks TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Indices for high-speed queries
      `CREATE INDEX IF NOT EXISTS idx_rate_contract_vendor ON rate_contracts(vendor_name)`,
      `CREATE INDEX IF NOT EXISTS idx_rate_contract_proj ON rate_contracts(project)`,
      `CREATE INDEX IF NOT EXISTS idx_rc_items_contract ON rate_contract_items(contract_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rc_items_code ON rate_contract_items(item_code)`,
      `CREATE INDEX IF NOT EXISTS idx_sched_tasks_proj ON schedule_tasks(project)`,
      `CREATE INDEX IF NOT EXISTS idx_sched_tasks_emp ON schedule_tasks(assigned_to_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sched_tasks_dates ON schedule_tasks(planned_end_date, status)`
    ];

    for (const q of tableQueries) {
      try {
        await queryRun(q);
      } catch (err) {
        console.warn('[Schema Upgrade Notice]', err.message);
      }
    }

    // Safe column migrations on existing tables
    const columnMigrations = [
      { table: 'clients', col: 'company_name TEXT' },
      { table: 'clients', col: 'pan TEXT' },
      { table: 'clients', col: 'state TEXT' },
      { table: 'boq_headers', col: 'client_id INTEGER' },
      { table: 'boq_headers', col: 'client_name TEXT' },
      { table: 'boq_headers', col: 'contract_ref TEXT' },
      { table: 'project_financials', col: 'client_id INTEGER' },
      { table: 'po_items', col: 'rate_contract_id TEXT' },
      { table: 'po_items', col: 'rate_contract_item_id TEXT' }
    ];

    for (const m of columnMigrations) {
      try {
        await queryRun(`ALTER TABLE ${m.table} ADD COLUMN ${m.col}`);
      } catch {
        // Column already exists
      }
    }
  })();

  return _schemaUpgradePromise;
}
