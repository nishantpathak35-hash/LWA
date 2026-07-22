// Domain: core
// Auto-extracted from api.js
import { queryAll, queryGet, queryRun } from '../db.js';

import { AuthService } from '../../../src/modules/core/services/AuthService';
import { SettingsService } from '../../../src/modules/core/services/SettingsService';
import { AuditService } from '../../../src/modules/core/services/AuditService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { encryptToken, decryptToken } from './token.js';

// P3-4: getJwtSecret, encryptToken, decryptToken moved to ./token.js

function invalidateProjectCache(project) {
  return project;
}

const settingsCache = new Map();

// Promise singleton: all concurrent callers await the same migration run.
// A boolean flag is not concurrent-safe — two simultaneous requests would both
// run the expensive v3 backfill before either sets the flag to true.
let _settingsTablePromise = null;

function requireAuth(session) {
  AuthService.requireAuth(session);
}

export async function logAudit(user, actionType, details, department) {
  return AuditService.log(user, actionType, details, department);
}

export function requireAdminConsole(session) {
  AuthService.requireAdminConsole(session);
}

export function normalizeRoleName(role) {
  return AuthService.normalizeRoleName(role);
}

export async function ensureSettingsTable() {
  // Return the existing promise so all concurrent callers share one migration run.
  if (_settingsTablePromise) return _settingsTablePromise;
  _settingsTablePromise = _runMigrations();
  return _settingsTablePromise;
}

async function _runMigrations() {
  await queryRun(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Idempotent system_payments column additions (Bug 3a) ──────────────────
  // These must run BEFORE the migrations_applied_v1 gate so they always execute
  // on any DB that was initialised before these columns existed.
  // ALTER TABLE ADD COLUMN on an already-existing column fails harmlessly.
  await Promise.allSettled([
    queryRun(`ALTER TABLE system_payments ADD COLUMN utr_ref TEXT DEFAULT ''`),
    queryRun(`ALTER TABLE system_payments ADD COLUMN bank_name TEXT DEFAULT ''`),
    queryRun(`ALTER TABLE system_payments ADD COLUMN payment_mode TEXT DEFAULT 'Bank Transfer'`),
    queryRun(`ALTER TABLE system_payments ADD COLUMN remarks TEXT DEFAULT ''`),
    queryRun(`ALTER TABLE system_payments ADD COLUMN reference_no TEXT DEFAULT ''`),
  ]);

  const migrationsAppliedKey = 'migrations_applied_v1';
  try {
    const check = await queryGet(`SELECT value FROM app_settings WHERE key = ?`, [migrationsAppliedKey]);
    if (check && check.value === 'true') {
      return;
    }
  } catch (e) {
    // Table might not exist yet or other query error, safe to proceed
  }
  // Ensure all required columns exist (idempotent)
  const poColumns = [
    'terms', 'approval_status', 'submitted_by', 'submitted_at',
    'approved_by', 'approved_at', 'approval_remarks',
    'tds_section', 'tds_pct', 'tds_amount', 'gst_total', 'gst_mode',
    'expected_delivery_date', 'notes', 'payment_status', 'category', 'milestones'
  ];
  const poItemColumns = ['unit'];
  const prColumns = ['remittance_ref', 'remittance_date', 'tds_amount', 'tds_percentage', 'tds_section', 'approved_amount', 'milestone_name', 'form16a_status', 'form16a_ref', 'form16a_date'];

  await Promise.allSettled([
    ...poColumns.map(col => queryRun(`ALTER TABLE purchase_orders ADD COLUMN ${col} TEXT`)),
    ...poItemColumns.map(col => queryRun(`ALTER TABLE po_items ADD COLUMN ${col} TEXT`)),
    ...prColumns.map(col => queryRun(`ALTER TABLE payment_requests ADD COLUMN ${col} TEXT`))
  ]);
  // PO approval history table
  await queryRun(`
    CREATE TABLE IF NOT EXISTS po_approval_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_no TEXT NOT NULL,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      remarks TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Manual / system payments table — unified source of truth for all PO payments
  await queryRun(`
    CREATE TABLE IF NOT EXISTS manual_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_no TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Bank Transfer',
      utr_ref TEXT,
      bank_name TEXT,
      reference_no TEXT,
      remarks TEXT,
      payment_type TEXT DEFAULT 'manual',
      recorded_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Attachments table
  await queryRun(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      file_data TEXT NOT NULL,
      uploaded_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // TDS Challan 281 table
  await queryRun(`
    CREATE TABLE IF NOT EXISTS tds_challan_281 (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      tan TEXT NOT NULL,
      minor_head TEXT DEFAULT '200',
      section_code TEXT NOT NULL,
      itd_code TEXT NOT NULL,
      base_tds REAL NOT NULL,
      interest REAL DEFAULT 0,
      fee_234e REAL DEFAULT 0,
      total_challan_amount REAL NOT NULL,
      bsr_code TEXT,
      challan_no TEXT,
      challan_date TEXT,
      bank_name TEXT,
      cin TEXT,
      status TEXT DEFAULT 'Deposited',
      remarks TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ══════════════════════════════════════════════════════════════════════════
  // ── ENTERPRISE CONFIGURATION ENGINE TABLES ──────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // ── Approval Workflows ──
  await queryRun(`
    CREATE TABLE IF NOT EXISTS approval_workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      module_type TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      is_archived INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      created_by TEXT DEFAULT 'system',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Approval Workflow Stages ──
  await queryRun(`
    CREATE TABLE IF NOT EXISTS approval_workflow_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id INTEGER NOT NULL,
      stage_name TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      approver_role TEXT DEFAULT '',
      specific_user TEXT DEFAULT '',
      department TEXT DEFAULT '',
      min_approval_count INTEGER DEFAULT 1,
      approval_type TEXT DEFAULT 'any_one',
      comments_mandatory INTEGER DEFAULT 0,
      auto_approval INTEGER DEFAULT 0,
      escalation_ready INTEGER DEFAULT 0,
      skip_conditions TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE
    )
  `);

  // ── Approval Execution (runtime state per entity) ──
  await queryRun(`
    CREATE TABLE IF NOT EXISTS approval_execution (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id INTEGER NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      current_stage_id INTEGER,
      status TEXT DEFAULT 'in_progress',
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id)
    )
  `);

  // ── Approval History (unified audit trail) ──
  await queryRun(`
    CREATE TABLE IF NOT EXISTS approval_history_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id INTEGER,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      remarks TEXT DEFAULT '',
      stage_sequence INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '',
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id)
    )
  `);

  // ── Number Series ──
  await queryRun(`
    CREATE TABLE IF NOT EXISTS number_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_type TEXT NOT NULL UNIQUE,
      prefix TEXT DEFAULT '',
      separator TEXT DEFAULT '/',
      padding_length INTEGER DEFAULT 6,
      starting_number INTEGER DEFAULT 1,
      current_number INTEGER DEFAULT 0,
      fy_format TEXT DEFAULT 'YYYY-YY',
      include_fy INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Number Series Transactions (allocation audit) ──
  await queryRun(`
    CREATE TABLE IF NOT EXISTS number_series_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL,
      allocated_number INTEGER NOT NULL,
      formatted_number TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      allocated_by TEXT DEFAULT 'system',
      allocated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (series_id) REFERENCES number_series(id)
    )
  `);

  // ── TDS Sections Master ──
  await queryRun(`
    CREATE TABLE IF NOT EXISTS tds_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_code TEXT NOT NULL,
      description TEXT DEFAULT '',
      rate REAL DEFAULT 0,
      threshold REAL DEFAULT 0,
      surcharge REAL DEFAULT 0,
      cess REAL DEFAULT 0,
      effective_from TEXT DEFAULT '',
      effective_to TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      is_archived INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Global Configurations ──
  await queryRun(`
    CREATE TABLE IF NOT EXISTS global_configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT NOT NULL UNIQUE,
      config_value TEXT DEFAULT '',
      config_type TEXT DEFAULT 'string',
      module TEXT DEFAULT 'global',
      description TEXT DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ══════════════════════════════════════════════════════════════════════════
  // ── SEED DATA MIGRATIONS ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  try {
    const seedKey = 'enterprise_config_seed_v1';
    const seedDone = await queryGet(`SELECT value FROM app_settings WHERE key = ?`, [seedKey]);
    if (!seedDone) {
      // ── Seed TDS Sections ──
      const tdsSections = [
        ['194C', 'Contractors (1%/2%)', 2, 30000, 0, 0, 1],
        ['194J', 'Professional/Technical Services (10%)', 10, 30000, 0, 0, 0],
        ['194H', 'Commission/Brokerage (5%)', 5, 15000, 0, 0, 0],
        ['194I', 'Rent (10%)', 10, 240000, 0, 0, 0],
        ['194A', 'Interest other than securities (10%)', 10, 40000, 0, 0, 0],
        ['194Q', 'Purchase of Goods (0.1%)', 0.1, 5000000, 0, 0, 0],
        ['194IB', 'Rent by Individual/HUF (5%)', 5, 50000, 0, 0, 0],
        ['194M', 'Certain payments by Individual/HUF (5%)', 5, 5000000, 0, 0, 0],
        ['194N', 'Cash withdrawal (2%)', 2, 10000000, 0, 0, 0],
        ['194O', 'E-commerce operator (1%)', 1, 500000, 0, 0, 0],
        ['206C', 'TCS on sale of goods (0.1%)', 0.1, 5000000, 0, 0, 0],
      ];
      for (let i = 0; i < tdsSections.length; i++) {
        const [code, desc, rate, threshold, surcharge, cess, isDefault] = tdsSections[i];
        await queryRun(
          `INSERT OR IGNORE INTO tds_sections (section_code, description, rate, threshold, surcharge, cess, is_default, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [code, desc, rate, threshold, surcharge, cess, isDefault, i + 1]
        );
      }

      // ── Seed Default Approval Workflows ──
      // Payment Requests: 3-stage pipeline matching current behavior
      await queryRun(
        `INSERT OR IGNORE INTO approval_workflows (name, module_type, description, is_active, created_by)
         VALUES ('Default Payment Approval', 'payment_request', 'Standard 3-stage payment approval pipeline', 1, 'system')`
      );
      const prWorkflow = await queryGet(`SELECT id FROM approval_workflows WHERE module_type = 'payment_request' AND name = 'Default Payment Approval'`);
      if (prWorkflow) {
        const prStages = [
          [prWorkflow.id, 'Pending Procurement', 1, 'procurement', 'any_one'],
          [prWorkflow.id, 'Pending Finance', 2, 'finance', 'any_one'],
          [prWorkflow.id, 'Pending Director', 3, 'director', 'any_one'],
        ];
        for (const [wfId, name, seq, role, type] of prStages) {
          await queryRun(
            `INSERT OR IGNORE INTO approval_workflow_stages (workflow_id, stage_name, sequence, approver_role, approval_type)
             VALUES (?, ?, ?, ?, ?)`,
            [wfId, name, seq, role, type]
          );
        }
      }

      // Purchase Orders: Simple 2-step matching current behavior
      await queryRun(
        `INSERT OR IGNORE INTO approval_workflows (name, module_type, description, is_active, created_by)
         VALUES ('Default PO Approval', 'purchase_order', 'Standard PO approval - submit and approve/reject', 1, 'system')`
      );
      const poWorkflow = await queryGet(`SELECT id FROM approval_workflows WHERE module_type = 'purchase_order' AND name = 'Default PO Approval'`);
      if (poWorkflow) {
        await queryRun(
          `INSERT OR IGNORE INTO approval_workflow_stages (workflow_id, stage_name, sequence, approver_role, approval_type)
           VALUES (?, 'Pending Approval', 1, 'director', 'any_one')`,
          [poWorkflow.id]
        );
      }

      // ── Seed Number Series from existing po_prefix ──
      const existingPrefix = await queryGet(`SELECT value FROM app_settings WHERE key = 'po_prefix'`);
      await queryRun(
        `INSERT OR IGNORE INTO number_series (module_type, prefix, separator, padding_length, starting_number, current_number, fy_format, include_fy)
         VALUES ('purchase_order', ?, '/', 6, 1, 0, 'YYYY-YY', 0)`,
        [existingPrefix?.value || '']
      );

      // ── Seed Global Configurations ──
      await queryRun(
        `INSERT OR IGNORE INTO global_configurations (config_key, config_value, config_type, module, description)
         VALUES ('default_tds_section', '194C', 'string', 'global', 'Default TDS section for new records')`
      );

      // Mark seed as complete
      await queryRun(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
        [seedKey, new Date().toISOString(), new Date().toISOString()]
      );
      console.log('[Migration] Enterprise configuration seed data created successfully');
    }
  } catch (e) {
    console.error('Enterprise config seed migration failed (non-fatal):', e.message);
  }

  // ── Performance: indexes on hot query columns (idempotent IF NOT EXISTS) ──
  await Promise.allSettled([
    queryRun(`CREATE INDEX IF NOT EXISTS idx_pr_po_no ON payment_requests(po_no)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_pr_stage ON payment_requests(stage)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_sp_po_no ON system_payments(po_no)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_sp_pr_key ON system_payments(pr_key)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_pah_po_no ON po_approval_history(po_no)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_mp_po_no ON manual_payments(po_no)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action_type)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendor_code)`),
    // Bug P3: Index vendors.legal_name to speed up the OR JOIN in listPaymentRequests
    queryRun(`CREATE INDEX IF NOT EXISTS idx_vendors_legal_name ON vendors(legal_name)`),
    // ── New enterprise config indexes ──
    queryRun(`CREATE INDEX IF NOT EXISTS idx_aw_module ON approval_workflows(module_type)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_aw_active ON approval_workflows(is_active)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_aws_workflow ON approval_workflow_stages(workflow_id)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_aws_sequence ON approval_workflow_stages(workflow_id, sequence)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_ae_entity ON approval_execution(entity_type, entity_id)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_ahv2_entity ON approval_history_v2(entity_type, entity_id)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_ns_module ON number_series(module_type)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_tds_code ON tds_sections(section_code)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_tds_active ON tds_sections(is_active)`),
    queryRun(`CREATE INDEX IF NOT EXISTS idx_gc_key ON global_configurations(config_key)`),
    queryRun(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tds_code_unique ON tds_sections(section_code)`),
  ]);

  // ── Data recovery: restore po_date for any PO where it was accidentally wiped ──
  try {
    await queryRun(`
      UPDATE purchase_orders
      SET po_date = CASE
        WHEN created_at IS NOT NULL AND created_at != ''
          THEN substr(created_at, 1, 10)
        ELSE date('now')
      END
      WHERE (po_date IS NULL OR po_date = '')
    `);
  } catch (e) {
    console.error('po_date recovery migration failed (non-fatal):', e.message);
  }

  // ── CRITICAL MIGRATION v3: Backfill orphan PRs + recalculate all paid amounts ──
  // Step 1: Insert system_payments rows for any remitted PRs that don't have one
  //         (historical remittances before the mirroring logic was added).
  // Step 2: Recalculate legacy_paid for every PO using SUM(system_payments.amount)
  //         as the single source of truth — no more two-leg double-counting.
  try {
    const migKey = 'legacy_paid_recalc_v3';
    const alreadyRan = await queryGet(`SELECT value FROM app_settings WHERE key = ?`, [migKey]);
    if (!alreadyRan) {
      // Step 1: Backfill orphan remitted PRs into system_payments
      const orphanPRs = await queryAll(
        `SELECT pr.pr_id, pr.po_no, pr.amount_requested, pr.approved_amount, pr.tds_amount, pr.remittance_date
         FROM payment_requests pr
         WHERE (pr.stage = 'Remitted' OR pr.remittance = 'Remitted')
           AND CAST(pr.pr_id AS TEXT) NOT IN (
             SELECT pr_key FROM system_payments
             WHERE pr_key IS NOT NULL AND pr_key NOT LIKE 'MANUAL-%'
           )`
      );
      for (const pr of orphanPRs) {
        const paidAmt = Math.max(0, (Number(pr.approved_amount ?? pr.amount_requested) || 0) - (Number(pr.tds_amount) || 0));
        await queryRun(
          `INSERT OR IGNORE INTO system_payments (po_no, pr_key, amount, remitted_by, created_at) VALUES (?, ?, ?, ?, ?)`,
          [pr.po_no, String(pr.pr_id), paidAmt, 'migration-v3', pr.remittance_date || new Date().toISOString()]
        );
      }
      console.log(`[Migration v3] Backfilled ${orphanPRs.length} orphan remitted PRs into system_payments`);

      // Step 2: Recalculate all legacy_paid from system_payments.amount (single source)
      const allPOs = await queryAll(`SELECT po_no, po_value, revised_po_value FROM purchase_orders`);
      for (const po of allPOs) {
        const sysRow = await queryGet(
          `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total FROM system_payments WHERE po_no = ?`,
          [po.po_no]
        );
        const totalPaid = Number(sysRow?.total) || 0;
        const poVal = Number(po.revised_po_value || po.po_value || 0);
        const outstanding = Math.max(0, poVal - totalPaid);
        let paymentStatus = 'Unpaid';
        if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
        else if (totalPaid > 0) paymentStatus = 'Partially Paid';
        await queryRun(
          `UPDATE purchase_orders SET legacy_paid=?, final_payable=?, payment_status=? WHERE po_no=?`,
          [totalPaid, outstanding, paymentStatus, po.po_no]
        );
      }
      await queryRun(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
        [migKey, new Date().toISOString(), new Date().toISOString()]
      );
      console.log(`[Migration v3] Recalculated legacy_paid for ${allPOs.length} POs — single source of truth`);
    }
  } catch (e) {
    console.error('legacy_paid_recalc_v3 migration failed (non-fatal):', e.message);
  }

  // Mark all migrations as applied successfully
  try {
    await queryRun(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
      [migrationsAppliedKey, 'true', new Date().toISOString()]
    );
  } catch (e) {
    console.error('Failed to set migrations_applied_v1 flag:', e);
  }

  // Migration complete — promise remains cached so future calls are instant no-ops.
}

export async function getSetting(key, fallback = '') {
  if (settingsCache.has(key)) {
    return settingsCache.get(key);
  }
  let value = fallback;
  try {
    const row = await queryGet(`SELECT value FROM app_settings WHERE key = ?`, [key]);
    value = row?.value ?? fallback;
  } catch {
    value = fallback;
  }
  settingsCache.set(key, value);
  return value;
}

export async function setSetting(key, value) {
  await ensureSettingsTable();
  await queryRun(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, new Date().toISOString()]
  );
  settingsCache.set(key, value);
}


// --- AUTH ---

export const DEFAULT_FEATURE_PERMISSIONS = {
  proc:       ['dashboard', 'payments', 'purchase_orders', 'vendors', 'create_payment', 'create_po'],
  finance:    ['dashboard', 'payments', 'vendors', 'reports', 'approve_payment', 'reject_payment', 'export_data'],
  accountant: ['dashboard', 'payments', 'purchase_orders', 'vendors', 'reports', 'create_payment', 'approve_payment', 'export_data', 'upload_document'],
  director:   ['dashboard', 'payments', 'purchase_orders', 'projects', 'vendors', 'settings', 'reports', 'manage_users', 'manage_settings', 'view_analytics', 'export_data', 'approve_po', 'approve_payment', 'reject_payment']
};

export const VALID_ROLE_KEYS = new Set(['proc', 'finance', 'accountant', 'director']);

export function getPRStatus(stage, remittance) {
  if (String(remittance || '').toLowerCase().includes('remitted') || String(stage || '').toLowerCase().includes('remitted')) {
    return 'approved';
  }
  if (String(stage || '').toLowerCase().includes('rejected')) {
    return 'rejected';
  }
  if (String(stage || '').toLowerCase().includes('ready to remit')) {
    return 'approved';
  }
  return 'pending';
}
