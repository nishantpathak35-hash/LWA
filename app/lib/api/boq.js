// Domain: BOQ (Bill of Quantities) Engine 2.0
// Comprehensive Estimation, Rate Analysis, Item Master, BOM, Revisions & Procurement Integration

import { queryAll, queryGet, queryRun, queryBatch } from '../db.js';
import { isSuperAdmin } from '../config.js';
import { savePO } from './purchase-orders/write.js';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

let _boqTablesInitialized = false;

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

function isAuthorized(user, allowedRoles = ['admin', 'director', 'estimator', 'qs', 'project_manager']) {
  if (!user) return false;
  const email = user.email || (typeof user === 'string' ? user : null);
  if (!email) return false;
  if (isSuperAdmin(email)) return true;
  const roles = user.roles || [];
  return roles.some(r => allowedRoles.includes(r));
}

function requireAuthorized(session, allowedRoles) {
  const user = requireAuth(session);
  if (!isAuthorized(user, allowedRoles)) {
    throw new Error('AUTH: Access denied. Insufficient privileges for BOQ operations.');
  }
  return user;
}

async function recordAuditEvent(boqId, versionId, itemId, user, action, prevVal = null, newVal = null) {
  try {
    const email = (typeof user === 'object' ? user?.email : user) || 'System';
    await queryRun(
      `INSERT INTO boq_audit_events (id, boq_id, boq_version_id, boq_item_id, user, action, prev_value, new_value, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        boqId || null,
        versionId || null,
        itemId || null,
        email,
        action,
        typeof prevVal === 'object' ? JSON.stringify(prevVal) : (prevVal ? String(prevVal) : null),
        typeof newVal === 'object' ? JSON.stringify(newVal) : (newVal ? String(newVal) : null),
        new Date().toISOString()
      ]
    );
  } catch (err) {
    console.warn('[BOQ Audit Warning]', err.message);
  }
}

/**
 * Initialize all BOQ database tables, constraints, and alter po_items table.
 */
export async function initBoqTables() {
  if (_boqTablesInitialized) return;

  const tableQueries = [
    // 1. Central Item Master & Rate Library
    `CREATE TABLE IF NOT EXISTS boq_item_master (
      id TEXT PRIMARY KEY,
      item_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      subcategory TEXT,
      work_type TEXT,
      item_type TEXT DEFAULT 'material',
      unit TEXT DEFAULT 'Nos',
      material_spec TEXT,
      preferred_make TEXT,
      alternate_makes TEXT,
      hsn_sac TEXT,
      std_purchase_rate REAL DEFAULT 0,
      std_labour_rate REAL DEFAULT 0,
      std_equipment_cost REAL DEFAULT 0,
      std_other_cost REAL DEFAULT 0,
      overhead_pct REAL DEFAULT 0,
      std_cost REAL DEFAULT 0,
      std_selling_rate REAL DEFAULT 0,
      target_margin_pct REAL DEFAULT 0,
      preferred_vendors TEXT,
      lead_time_days INTEGER DEFAULT 0,
      min_order_qty REAL DEFAULT 1,
      wastage_pct REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    )`,

    // 2. BOQ Headers (One per Project / Major Package)
    `CREATE TABLE IF NOT EXISTS boq_headers (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      boq_no TEXT UNIQUE NOT NULL,
      title TEXT,
      current_version_id TEXT,
      status TEXT DEFAULT 'Draft',
      created_by TEXT,
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT,
      updated_at TEXT
    )`,

    // 3. BOQ Versions (Full Snapshots for Revisions & Variations)
    `CREATE TABLE IF NOT EXISTS boq_versions (
      id TEXT PRIMARY KEY,
      boq_id TEXT NOT NULL,
      version_number INTEGER DEFAULT 1,
      revision_label TEXT,
      status TEXT DEFAULT 'Draft',
      total_selling_value REAL DEFAULT 0,
      total_cost_value REAL DEFAULT 0,
      gross_margin REAL DEFAULT 0,
      margin_pct REAL DEFAULT 0,
      submitted_by TEXT,
      approved_by TEXT,
      approved_at TEXT,
      revision_reason TEXT,
      is_current INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    )`,

    // 4. BOQ Sections / Work Packages
    `CREATE TABLE IF NOT EXISTS boq_sections (
      id TEXT PRIMARY KEY,
      boq_version_id TEXT NOT NULL,
      parent_section_id TEXT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_collapsed INTEGER DEFAULT 0,
      created_at TEXT
    )`,

    // 5. BOQ Items (Line items within sections)
    `CREATE TABLE IF NOT EXISTS boq_items (
      id TEXT PRIMARY KEY,
      boq_version_id TEXT NOT NULL,
      section_id TEXT,
      item_master_id TEXT,
      s_no TEXT,
      item_code TEXT,
      description TEXT NOT NULL,
      make TEXT,
      unit TEXT DEFAULT 'Nos',
      quantity REAL DEFAULT 0,
      cost_rate REAL DEFAULT 0,
      selling_rate REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      cost_amount REAL DEFAULT 0,
      margin REAL DEFAULT 0,
      margin_pct REAL DEFAULT 0,
      hsn_sac TEXT,
      location TEXT,
      drawing_ref TEXT,
      remarks TEXT,
      status TEXT DEFAULT 'Draft',
      sort_order INTEGER DEFAULT 0,
      rate_source TEXT DEFAULT 'manual',
      approved_qty REAL DEFAULT 0,
      procured_qty REAL DEFAULT 0,
      committed_qty REAL DEFAULT 0,
      delivered_qty REAL DEFAULT 0,
      installed_qty REAL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )`,

    // 6. Bill of Materials (BOM) per BOQ Item
    `CREATE TABLE IF NOT EXISTS boq_item_bom (
      id TEXT PRIMARY KEY,
      boq_item_id TEXT NOT NULL,
      material_name TEXT NOT NULL,
      material_item_master_id TEXT,
      unit TEXT,
      consumption_per_boq_unit REAL DEFAULT 0,
      wastage_pct REAL DEFAULT 0,
      gross_qty REAL DEFAULT 0,
      net_qty REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )`,

    // 7. BOQ-to-PO Traceability Links
    `CREATE TABLE IF NOT EXISTS boq_po_links (
      id TEXT PRIMARY KEY,
      boq_id TEXT NOT NULL,
      boq_version_id TEXT NOT NULL,
      boq_item_id TEXT NOT NULL,
      po_no TEXT NOT NULL,
      po_item_id TEXT,
      linked_qty REAL DEFAULT 0,
      po_rate REAL DEFAULT 0,
      po_amount REAL DEFAULT 0,
      link_type TEXT DEFAULT 'work_package',
      status TEXT DEFAULT 'active',
      created_by TEXT,
      created_at TEXT
    )`,

    // 8. Audit Trail
    `CREATE TABLE IF NOT EXISTS boq_audit_events (
      id TEXT PRIMARY KEY,
      boq_id TEXT,
      boq_version_id TEXT,
      boq_item_id TEXT,
      user TEXT,
      action TEXT,
      prev_value TEXT,
      new_value TEXT,
      timestamp TEXT
    )`
  ];

  try {
    for (const sql of tableQueries) {
      await queryRun(sql);
    }

    // Check po_items table schema and add columns if missing
    try {
      const pragma = await queryAll(`PRAGMA table_info(po_items)`);
      const existingCols = new Set((pragma || []).map(c => c.name));

      if (!existingCols.has('boq_item_id')) {
        await queryRun(`ALTER TABLE po_items ADD COLUMN boq_item_id TEXT`);
      }
      if (!existingCols.has('boq_id')) {
        await queryRun(`ALTER TABLE po_items ADD COLUMN boq_id TEXT`);
      }
      if (!existingCols.has('boq_version_id')) {
        await queryRun(`ALTER TABLE po_items ADD COLUMN boq_version_id TEXT`);
      }
    } catch (e) {
      console.warn('[BOQ Init] po_items alteration warning:', e.message);
    }

    // Check boq_headers schema for client_id and client_name columns
    try {
      const bqPragma = await queryAll(`PRAGMA table_info(boq_headers)`);
      const existingBqCols = new Set((bqPragma || []).map(c => c.name));

      if (!existingBqCols.has('client_id')) {
        await queryRun(`ALTER TABLE boq_headers ADD COLUMN client_id TEXT`);
      }
      if (!existingBqCols.has('client_name')) {
        await queryRun(`ALTER TABLE boq_headers ADD COLUMN client_name TEXT`);
      }
    } catch (e) {
      console.warn('[BOQ Init] boq_headers alteration warning:', e.message);
    }

    // Check boq_items schema for specification column
    try {
      const itPragma = await queryAll(`PRAGMA table_info(boq_items)`);
      const existingItCols = new Set((itPragma || []).map(c => c.name));
      if (!existingItCols.has('specification')) {
        await queryRun(`ALTER TABLE boq_items ADD COLUMN specification TEXT`);
      }
    } catch (e) {
      console.warn('[BOQ Init] boq_items alteration warning:', e.message);
    }

    // Auto-seed boq_item_master from central item_master if empty
    try {
      await queryRun(`
        INSERT OR IGNORE INTO boq_item_master (
          id, item_code, name, description, category, subcategory, unit, preferred_make,
          std_purchase_rate, std_labour_rate, std_cost, std_selling_rate, target_margin_pct,
          is_active, created_at, updated_at
        )
        SELECT
          'MSTR-' || item_code,
          item_code,
          description,
          COALESCE(specification, description),
          COALESCE(category, 'General'),
          COALESCE(sub_category, ''),
          COALESCE(unit, 'Nos'),
          COALESCE(preferred_make, ''),
          COALESCE(material_rate_metro, rate, 0),
          COALESCE(labour_rate_metro, 0),
          COALESCE(material_labour_rate_metro, rate, 0),
          ROUND(COALESCE(material_labour_rate_metro, rate, 0) * 1.25),
          20,
          is_active,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM item_master WHERE is_active = 1
      `);
    } catch (e) {
      console.warn('[BOQ Init] boq_item_master sync from item_master note:', e.message);
    }

    _boqTablesInitialized = true;
  } catch (err) {
    console.error('[BOQ Init] Error initializing tables:', err);
    throw err;
  }
}

// --------------------------------------------------------------------------
// ITEM MASTER & RATE LIBRARY
// --------------------------------------------------------------------------

export async function getItemMasterList(filters = {}) {
  await initBoqTables();
  const { search = '', category = '', page = 1, limit = 50, active_only = false } = filters;
  const offset = (Math.max(1, page) - 1) * limit;

  let whereClauses = [];
  let params = [];

  if (active_only) {
    whereClauses.push('is_active = 1');
  }
  if (category) {
    whereClauses.push('category = ?');
    params.push(category);
  }
  if (search) {
    whereClauses.push('(item_code LIKE ? OR name LIKE ? OR description LIKE ? OR preferred_make LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await queryGet(`SELECT COUNT(*) as total FROM boq_item_master ${whereSql}`, params);
  const total = countRow?.total || 0;

  const items = await queryAll(
    `SELECT * FROM boq_item_master ${whereSql} ORDER BY category ASC, item_code ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: items || [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export async function getItemMasterItem(id) {
  await initBoqTables();
  return await queryGet(`SELECT * FROM boq_item_master WHERE id = ?`, [id]);
}

export async function saveItemMaster(data, session) {
  await initBoqTables();
  requireAuth(session);

  const now = new Date().toISOString();
  const id = data.id || crypto.randomUUID();
  const isUpdate = !!data.id;

  let itemCode = data.item_code?.trim();
  if (!itemCode) {
    // Auto-generate code
    const prefix = (data.category?.slice(0, 3) || 'ITM').toUpperCase();
    const countRow = await queryGet(`SELECT COUNT(*) as cnt FROM boq_item_master WHERE category = ?`, [data.category || '']);
    const seq = ((countRow?.cnt || 0) + 1).toString().padStart(4, '0');
    itemCode = `${prefix}-${seq}`;
  }

  // Cost calculation
  const stdPurchaseRate = parseFloat(data.std_purchase_rate) || 0;
  const stdLabourRate = parseFloat(data.std_labour_rate) || 0;
  const stdEquipCost = parseFloat(data.std_equipment_cost) || 0;
  const stdOtherCost = parseFloat(data.std_other_cost) || 0;
  const overheadPct = parseFloat(data.overhead_pct) || 0;

  const baseCost = stdPurchaseRate + stdLabourRate + stdEquipCost + stdOtherCost;
  const stdCost = parseFloat(data.std_cost) || (baseCost + (baseCost * overheadPct / 100));

  let stdSellingRate = parseFloat(data.std_selling_rate) || 0;
  let targetMarginPct = parseFloat(data.target_margin_pct) || 0;

  if (stdSellingRate > 0 && stdCost > 0 && !targetMarginPct) {
    targetMarginPct = Math.round(((stdSellingRate - stdCost) / stdSellingRate) * 10000) / 100;
  } else if (targetMarginPct > 0 && stdCost > 0 && !stdSellingRate) {
    stdSellingRate = targetMarginPct < 100 ? stdCost / (1 - (targetMarginPct / 100)) : stdCost * 1.3;
  }

  if (isUpdate) {
    await queryRun(
      `UPDATE boq_item_master SET
        name = ?, description = ?, category = ?, subcategory = ?, work_type = ?,
        item_type = ?, unit = ?, material_spec = ?, preferred_make = ?, alternate_makes = ?,
        hsn_sac = ?, std_purchase_rate = ?, std_labour_rate = ?, std_equipment_cost = ?,
        std_other_cost = ?, overhead_pct = ?, std_cost = ?, std_selling_rate = ?,
        target_margin_pct = ?, preferred_vendors = ?, lead_time_days = ?, min_order_qty = ?,
        wastage_pct = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      [
        data.name, data.description || '', data.category || 'General', data.subcategory || '',
        data.work_type || '', data.item_type || 'material', data.unit || 'Nos',
        data.material_spec || '', data.preferred_make || '',
        typeof data.alternate_makes === 'object' ? JSON.stringify(data.alternate_makes) : (data.alternate_makes || ''),
        data.hsn_sac || '', stdPurchaseRate, stdLabourRate, stdEquipCost, stdOtherCost,
        overheadPct, stdCost, stdSellingRate, targetMarginPct,
        typeof data.preferred_vendors === 'object' ? JSON.stringify(data.preferred_vendors) : (data.preferred_vendors || ''),
        parseInt(data.lead_time_days) || 0, parseFloat(data.min_order_qty) || 1,
        parseFloat(data.wastage_pct) || 0, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        now, id
      ]
    );
  } else {
    await queryRun(
      `INSERT INTO boq_item_master (
        id, item_code, name, description, category, subcategory, work_type,
        item_type, unit, material_spec, preferred_make, alternate_makes, hsn_sac,
        std_purchase_rate, std_labour_rate, std_equipment_cost, std_other_cost,
        overhead_pct, std_cost, std_selling_rate, target_margin_pct, preferred_vendors,
        lead_time_days, min_order_qty, wastage_pct, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, itemCode, data.name, data.description || '', data.category || 'General', data.subcategory || '',
        data.work_type || '', data.item_type || 'material', data.unit || 'Nos',
        data.material_spec || '', data.preferred_make || '',
        typeof data.alternate_makes === 'object' ? JSON.stringify(data.alternate_makes) : (data.alternate_makes || ''),
        data.hsn_sac || '', stdPurchaseRate, stdLabourRate, stdEquipCost, stdOtherCost,
        overheadPct, stdCost, stdSellingRate, targetMarginPct,
        typeof data.preferred_vendors === 'object' ? JSON.stringify(data.preferred_vendors) : (data.preferred_vendors || ''),
        parseInt(data.lead_time_days) || 0, parseFloat(data.min_order_qty) || 1,
        parseFloat(data.wastage_pct) || 0, 1, now, now
      ]
    );
  }

  return await getItemMasterItem(id);
}

export async function deleteItemMaster(id, session) {
  await initBoqTables();
  requireAuth(session);
  await queryRun(`UPDATE boq_item_master SET is_active = 0, updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
  return { success: true };
}

export async function importItemMasterBulk(items, session) {
  await initBoqTables();
  requireAuth(session);
  if (!Array.isArray(items) || items.length === 0) return { imported: 0 };

  let count = 0;
  for (const item of items) {
    if (!item.name) continue;
    await saveItemMaster(item, session);
    count++;
  }
  return { imported: count };
}

// --------------------------------------------------------------------------
// BOQ HEADERS & VERSIONS
// --------------------------------------------------------------------------

export async function createBoq(payload, session) {
  await initBoqTables();
  requireAuth(session);

  const { project, title = 'Main Project BOQ' } = payload;
  if (!project) throw new Error('Project name is required to create a BOQ');

  const now = new Date().toISOString();
  const boqId = crypto.randomUUID();
  const versionId = crypto.randomUUID();

  // Generate unique BOQ Number e.g. BOQ-PROJ-001
  const cleanProject = project.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
  const countRow = await queryGet(`SELECT COUNT(*) as cnt FROM boq_headers WHERE project = ?`, [project]);
  const seq = ((countRow?.cnt || 0) + 1).toString().padStart(3, '0');
  const boqNo = `BOQ-${cleanProject}-${seq}`;

  // Derive client mapping directly from project_financials
  let clientName = null;
  let clientId = null;
  try {
    const projFin = await queryGet(`SELECT client, client_id FROM project_financials WHERE project = ?`, [project]);
    if (projFin?.client) {
      clientName = String(projFin.client).trim();
      clientId = projFin.client_id || null;
      if (!clientId && clientName) {
        const clRow = await queryGet(
          `SELECT id FROM clients WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(company_name)) = LOWER(TRIM(?))`,
          [clientName, clientName]
        );
        clientId = clRow?.id || null;
      }
    }
  } catch (err) {
    console.warn('[BOQ Client Auto-Derivation Warning]', err.message);
  }

  // 1. Insert header
  await queryRun(
    `INSERT INTO boq_headers (id, project, boq_no, title, current_version_id, status, client_id, client_name, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?)`,
    [boqId, project, boqNo, title, versionId, clientId ? String(clientId) : null, clientName, session.user.email, now, now]
  );

  // 2. Insert initial version (Rev 1)
  await queryRun(
    `INSERT INTO boq_versions (id, boq_id, version_number, revision_label, status, total_selling_value, total_cost_value, gross_margin, margin_pct, is_current, created_at, updated_at)
     VALUES (?, ?, 1, 'Rev 0', 'Draft', 0, 0, 0, 0, 1, ?, ?)`,
    [versionId, boqId, now, now]
  );

  // 3. Seed default enterprise sections
  const defaultSections = [
    'Civil & Demolition Works',
    'False Ceiling & Partition',
    'Flooring & Tiling',
    'Carpentry & Joinery',
    'Glass & Glazing Works',
    'Painting & Wall Finishing',
    'Electrical & Lighting',
    'HVAC Works',
    'Plumbing & Sanitary',
    'Fire Fighting & Safety',
    'Networking & Security',
    'Loose Furniture & Fixtures',
    'Miscellaneous & Prelims'
  ];

  for (let i = 0; i < defaultSections.length; i++) {
    await queryRun(
      `INSERT INTO boq_sections (id, boq_version_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), versionId, defaultSections[i], i * 10, now]
    );
  }

  await recordAuditEvent(boqId, versionId, null, session.user.email, 'CREATE_BOQ', null, { boqNo, title });

  return { boq_id: boqId, boq_no: boqNo, version_id: versionId };
}

export async function getBoqList(project) {
  await initBoqTables();
  if (!project) return [];

  const headers = await queryAll(
    `SELECT h.*, v.version_number, v.revision_label, v.status as version_status,
            v.total_selling_value, v.total_cost_value, v.gross_margin, v.margin_pct
     FROM boq_headers h
     LEFT JOIN boq_versions v ON h.current_version_id = v.id
     WHERE h.project = ?
     ORDER BY h.created_at DESC`,
    [project]
  );

  return headers || [];
}

export async function getBoqVersionsList(boqId) {
  await initBoqTables();
  if (!boqId) return [];

  const versions = await queryAll(
    `SELECT v.*, h.project, h.boq_no, h.title as boq_title
     FROM boq_versions v
     JOIN boq_headers h ON v.boq_id = h.id
     WHERE v.boq_id = ?
     ORDER BY v.version_number DESC`,
    [boqId]
  );

  return versions || [];
}

export async function getBoqVersion(versionId) {
  await initBoqTables();
  if (!versionId) return null;

  const version = await queryGet(
    `SELECT v.*, h.project, h.boq_no, h.title as boq_title
     FROM boq_versions v
     JOIN boq_headers h ON v.boq_id = h.id
     WHERE v.id = ?`,
    [versionId]
  );

  if (!version) return null;

  const sections = await queryAll(
    `SELECT * FROM boq_sections WHERE boq_version_id = ? ORDER BY sort_order ASC, name ASC`,
    [versionId]
  );

  const items = await queryAll(
    `SELECT i.*, m.category, m.preferred_make as master_make
     FROM boq_items i
     LEFT JOIN boq_item_master m ON i.item_master_id = m.id
     WHERE i.boq_version_id = ?
     ORDER BY i.sort_order ASC, i.s_no ASC`,
    [versionId]
  );

  // Group items by section
  const sectionMap = {};
  for (const s of sections) {
    sectionMap[s.id] = { ...s, items: [] };
  }

  const unassignedItems = [];
  for (const item of items) {
    if (item.section_id && sectionMap[item.section_id]) {
      sectionMap[item.section_id].items.push(item);
    } else {
      unassignedItems.push(item);
    }
  }

  return {
    ...version,
    sections: Object.values(sectionMap),
    unassigned_items: unassignedItems
  };
}

// --------------------------------------------------------------------------
// SECTIONS & ITEMS CRUD
// --------------------------------------------------------------------------

export async function saveBoqSection(data, session) {
  await initBoqTables();
  requireAuth(session);

  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();

  if (data.id) {
    await queryRun(
      `UPDATE boq_sections SET name = ?, sort_order = ?, is_collapsed = ? WHERE id = ?`,
      [data.name, parseInt(data.sort_order) || 0, data.is_collapsed ? 1 : 0, id]
    );
  } else {
    await queryRun(
      `INSERT INTO boq_sections (id, boq_version_id, parent_section_id, name, sort_order, is_collapsed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.boq_version_id, data.parent_section_id || null, data.name, parseInt(data.sort_order) || 0, 0, now]
    );
  }

  return await queryGet(`SELECT * FROM boq_sections WHERE id = ?`, [id]);
}

export async function deleteBoqSection(id, session) {
  await initBoqTables();
  requireAuth(session);

  // Delete items under section first
  await queryRun(`DELETE FROM boq_items WHERE section_id = ?`, [id]);
  await queryRun(`DELETE FROM boq_sections WHERE id = ?`, [id]);
  return { success: true };
}

async function recalculateBoqTotals(versionId) {
  const totals = await queryGet(
    `SELECT 
      COALESCE(SUM(amount), 0) as total_selling,
      COALESCE(SUM(cost_amount), 0) as total_cost
     FROM boq_items WHERE boq_version_id = ?`,
    [versionId]
  );

  const totalSelling = totals?.total_selling || 0;
  const totalCost = totals?.total_cost || 0;
  const grossMargin = totalSelling - totalCost;
  const marginPct = totalSelling > 0 ? Math.round((grossMargin / totalSelling) * 10000) / 100 : 0;

  await queryRun(
    `UPDATE boq_versions SET 
      total_selling_value = ?, total_cost_value = ?, gross_margin = ?, margin_pct = ?, updated_at = ?
     WHERE id = ?`,
    [totalSelling, totalCost, grossMargin, marginPct, new Date().toISOString(), versionId]
  );

  return { totalSelling, totalCost, grossMargin, marginPct };
}

export async function saveBoqItem(data, session) {
  await initBoqTables();
  requireAuth(session);

  // Check version lock
  const version = await queryGet(`SELECT status, is_current FROM boq_versions WHERE id = ?`, [data.boq_version_id]);
  if (!version) throw new Error('BOQ Version not found');
  if (version.status === 'Approved') {
    throw new Error('IMMUTABILITY_LOCK: Approved BOQ versions cannot be edited. Please create a new Revision.');
  }

  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const isUpdate = !!data.id;

  const qty = parseFloat(data.quantity) || 0;
  const costRate = parseFloat(data.cost_rate) || 0;
  const sellingRate = parseFloat(data.selling_rate) || 0;

  const amount = Math.round(qty * sellingRate * 100) / 100;
  const costAmount = Math.round(qty * costRate * 100) / 100;
  const margin = Math.round((amount - costAmount) * 100) / 100;
  const marginPct = (amount > 0 && sellingRate > 0) ? Math.round(((sellingRate - costRate) / sellingRate) * 10000) / 100 : 0;

  if (isUpdate) {
    await queryRun(
      `UPDATE boq_items SET
        section_id = ?, item_master_id = ?, s_no = ?, item_code = ?, description = ?,
        specification = ?, make = ?, unit = ?, quantity = ?, cost_rate = ?, selling_rate = ?,
        amount = ?, cost_amount = ?, margin = ?, margin_pct = ?, hsn_sac = ?,
        location = ?, drawing_ref = ?, remarks = ?, status = ?, sort_order = ?,
        rate_source = ?, updated_at = ?
       WHERE id = ?`,
      [
        data.section_id || null, data.item_master_id || null, data.s_no || '', data.item_code || '',
        data.description, data.specification || '', data.make || '', data.unit || 'Nos', qty, costRate, sellingRate,
        amount, costAmount, margin, marginPct, data.hsn_sac || '',
        data.location || '', data.drawing_ref || '', data.remarks || '', data.status || 'Draft',
        parseInt(data.sort_order) || 0, data.rate_source || 'manual', now, id
      ]
    );
  } else {
    await queryRun(
      `INSERT INTO boq_items (
        id, boq_version_id, section_id, item_master_id, s_no, item_code, description,
        specification, make, unit, quantity, cost_rate, selling_rate, amount, cost_amount, margin,
        margin_pct, hsn_sac, location, drawing_ref, remarks, status, sort_order,
        rate_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.boq_version_id, data.section_id || null, data.item_master_id || null, data.s_no || '',
        data.item_code || '', data.description, data.specification || '', data.make || '', data.unit || 'Nos', qty, costRate,
        sellingRate, amount, costAmount, margin, marginPct, data.hsn_sac || '',
        data.location || '', data.drawing_ref || '', data.remarks || '', data.status || 'Draft',
        parseInt(data.sort_order) || 0, data.rate_source || 'manual', now, now
      ]
    );
  }

  // Auto-recalculate version grand totals
  await recalculateBoqTotals(data.boq_version_id);

  return await queryGet(`SELECT * FROM boq_items WHERE id = ?`, [id]);
}

export async function autoMatchBoqWithMaster(versionId, session) {
  await initBoqTables();
  requireAuth(session);

  const version = await queryGet(
    `SELECT v.*, h.project FROM boq_versions v JOIN boq_headers h ON v.boq_id = h.id WHERE v.id = ?`,
    [versionId]
  );
  if (!version) throw new Error('BOQ Version not found');
  if (version.status === 'Approved') {
    throw new Error('IMMUTABILITY_LOCK: Target BOQ version is Approved. Create a new revision first.');
  }

  const masterItems = await queryAll(
    `SELECT id, item_code, name, description, category, subcategory, unit, std_cost, std_purchase_rate
     FROM boq_item_master WHERE is_active = 1`
  );
  if (!masterItems || masterItems.length === 0) {
    return { success: true, matchedCount: 0, unmappedCount: 0, total: 0 };
  }

  const STOP_WORDS = new Set(['and', 'for', 'the', 'with', 'nos', 'sqft', 'rft', 'item', 'supply', 'installation', 'providing', 'fixing', 'making', 'size', 'area', 'room', 'work', 'works', 'mm', 'thk', 'thick', 'approx', 'custom', 'etc']);
  function getTokens(str) {
    return (str || '').toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  function normalizeUnit(u) {
    const s = (u || '').toLowerCase().trim().replace(/[^a-z]/g, '');
    if (s.startsWith('sq') || s === 'sft') return 'sqft';
    if (s.startsWith('no')) return 'nos';
    if (s.startsWith('rf') || s === 'rmt') return 'rft';
    if (s.startsWith('set')) return 'set';
    return s;
  }

  const masterByCode = new Map();
  const masterIndexed = masterItems.map(m => {
    masterByCode.set(m.item_code.toLowerCase(), m);
    const tokens = new Set(getTokens(m.name + ' ' + (m.description || '')));
    return { master: m, tokens, category: (m.category || '').toLowerCase(), unit: normalizeUnit(m.unit) };
  });

  const items = await queryAll(`SELECT * FROM boq_items WHERE boq_version_id = ?`, [versionId]);
  let matchedCount = 0;
  let unmappedCount = 0;
  const now = new Date().toISOString();

  for (const it of items) {
    let best = null;
    let bestScore = 0;
    const itUnit = normalizeUnit(it.unit);

    // 1. Code match
    if (it.item_code && masterByCode.has(it.item_code.toLowerCase())) {
      best = masterByCode.get(it.item_code.toLowerCase());
      bestScore = 1;
    } else if (it.s_no && masterByCode.has(it.s_no.toLowerCase())) {
      best = masterByCode.get(it.s_no.toLowerCase());
      bestScore = 1;
    }

    // 2. High-precision keyword matching (must match unit)
    if (!best) {
      const itTokens = getTokens(it.description);
      if (itTokens.length >= 2) {
        for (const mi of masterIndexed) {
          if (itUnit && mi.unit && mi.unit !== itUnit) continue;

          let common = 0;
          for (const t of itTokens) {
            if (mi.tokens.has(t)) common++;
          }
          if (common >= 2) {
            const score = common / itTokens.length;
            if (score > bestScore && score >= 0.6) {
              bestScore = score;
              best = mi.master;
            }
          }
        }
      }
    }

    const sellingRate = it.selling_rate || 0;
    const qty = it.quantity || 0;
    const amount = Math.round(qty * sellingRate * 100) / 100;

    if (best) {
      const costRate = best.std_cost || best.std_purchase_rate || 0;
      const costAmount = Math.round(qty * costRate * 100) / 100;
      const margin = Math.round((amount - costAmount) * 100) / 100;
      const marginPct = (amount > 0 && sellingRate > 0) ? Math.round(((sellingRate - costRate) / sellingRate) * 10000) / 100 : 0;

      await queryRun(
        `UPDATE boq_items SET
          item_master_id = ?,
          cost_rate = ?,
          cost_amount = ?,
          margin = ?,
          margin_pct = ?,
          rate_source = 'master',
          updated_at = ?
         WHERE id = ?`,
        [best.id, costRate, costAmount, margin, marginPct, now, it.id]
      );
      matchedCount++;
    } else {
      await queryRun(
        `UPDATE boq_items SET
          item_master_id = NULL,
          cost_rate = 0,
          cost_amount = 0,
          margin = ?,
          margin_pct = 100,
          rate_source = 'unmapped',
          updated_at = ?
         WHERE id = ?`,
        [amount, now, it.id]
      );
      unmappedCount++;
    }
  }

  // Recalculate totals
  const totals = await recalculateBoqTotals(versionId);

  // Sync project financials if applicable
  if (version.project) {
    try {
      await queryRun(
        `UPDATE project_financials SET
          project_value = ?,
          bcs = ?,
          updated_at = ?
         WHERE project = ?`,
        [totals.totalSelling, totals.totalCost, now, version.project]
      );
    } catch (e) {
      console.warn('[BOQ Match] project_financials update warning:', e.message);
    }
  }

  return {
    success: true,
    matchedCount,
    unmappedCount,
    total: items.length,
    totals
  };
}

export async function deleteBoqItem(id, session) {
  await initBoqTables();
  requireAuth(session);

  const item = await queryGet(`SELECT boq_version_id FROM boq_items WHERE id = ?`, [id]);
  if (!item) return { success: true };

  const version = await queryGet(`SELECT status FROM boq_versions WHERE id = ?`, [item.boq_version_id]);
  if (version?.status === 'Approved') {
    throw new Error('IMMUTABILITY_LOCK: Approved BOQ cannot have items deleted. Create a new Revision.');
  }

  await queryRun(`DELETE FROM boq_item_bom WHERE boq_item_id = ?`, [id]);
  await queryRun(`DELETE FROM boq_items WHERE id = ?`, [id]);

  await recalculateBoqTotals(item.boq_version_id);
  return { success: true };
}

export async function reorderBoqItems(items, session) {
  await initBoqTables();
  requireAuth(session);

  if (Array.isArray(items)) {
    for (const it of items) {
      if (it.id && it.sort_order !== undefined) {
        await queryRun(`UPDATE boq_items SET sort_order = ? WHERE id = ?`, [it.sort_order, it.id]);
      }
    }
  }
  return { success: true };
}

// --------------------------------------------------------------------------
// BILL OF MATERIALS (BOM)
// --------------------------------------------------------------------------

export async function saveBomComponents(boqItemId, components, session) {
  await initBoqTables();
  requireAuth(session);

  if (!boqItemId) throw new Error('BOQ Item ID is required');

  await queryRun(`DELETE FROM boq_item_bom WHERE boq_item_id = ?`, [boqItemId]);

  let totalBomCost = 0;
  if (Array.isArray(components)) {
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const id = crypto.randomUUID();
      const consumption = parseFloat(c.consumption_per_boq_unit) || 0;
      const wastage = parseFloat(c.wastage_pct) || 0;
      const netQty = consumption;
      const grossQty = Math.round(netQty * (1 + wastage / 100) * 1000) / 1000;
      const unitCost = parseFloat(c.unit_cost) || 0;
      const totalCost = Math.round(grossQty * unitCost * 100) / 100;
      totalBomCost += totalCost;

      await queryRun(
        `INSERT INTO boq_item_bom (
          id, boq_item_id, material_name, material_item_master_id, unit,
          consumption_per_boq_unit, wastage_pct, gross_qty, net_qty, unit_cost, total_cost, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, boqItemId, c.material_name, c.material_item_master_id || null, c.unit || 'Nos',
          consumption, wastage, grossQty, netQty, unitCost, totalCost, i * 10
        ]
      );
    }
  }

  return { success: true, total_bom_cost: totalBomCost };
}

export async function getBomComponents(boqItemId) {
  await initBoqTables();
  if (!boqItemId) return [];
  return await queryAll(`SELECT * FROM boq_item_bom WHERE boq_item_id = ? ORDER BY sort_order ASC`, [boqItemId]);
}

// --------------------------------------------------------------------------
// APPROVAL WORKFLOW & REVISION MANAGEMENT
// --------------------------------------------------------------------------

export async function submitBoqForApproval(versionId, session) {
  await initBoqTables();
  requireAuth(session);

  const version = await queryGet(`SELECT * FROM boq_versions WHERE id = ?`, [versionId]);
  if (!version) throw new Error('Version not found');

  await queryRun(
    `UPDATE boq_versions SET status = 'Submitted', submitted_by = ?, updated_at = ? WHERE id = ?`,
    [session.user.email, new Date().toISOString(), versionId]
  );

  await recordAuditEvent(version.boq_id, versionId, null, session.user.email, 'SUBMIT_FOR_APPROVAL', version.status, 'Submitted');
  return { success: true, status: 'Submitted' };
}

export async function approveBoqVersion(versionId, reason = '', session) {
  await initBoqTables();
  requireAuthorized(session, ['admin', 'director']);

  const version = await queryGet(`SELECT * FROM boq_versions WHERE id = ?`, [versionId]);
  if (!version) throw new Error('Version not found');

  const now = new Date().toISOString();

  // Approve version
  await queryRun(
    `UPDATE boq_versions SET status = 'Approved', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?`,
    [session.user.email, now, now, versionId]
  );

  // Update header status and approved quantities on items
  await queryRun(
    `UPDATE boq_headers SET status = 'Approved', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?`,
    [session.user.email, now, now, version.boq_id]
  );

  // Lock baseline approved_qty to quantity
  await queryRun(
    `UPDATE boq_items SET approved_qty = quantity, status = 'Approved' WHERE boq_version_id = ?`,
    [versionId]
  );

  await recordAuditEvent(version.boq_id, versionId, null, session.user.email, 'APPROVE_BOQ', version.status, 'Approved');
  return { success: true, status: 'Approved' };
}

export async function rejectBoqVersion(versionId, reason = '', session) {
  await initBoqTables();
  requireAuthorized(session, ['admin', 'director']);

  const version = await queryGet(`SELECT * FROM boq_versions WHERE id = ?`, [versionId]);
  if (!version) throw new Error('Version not found');

  await queryRun(
    `UPDATE boq_versions SET status = 'Rejected', revision_reason = ?, updated_at = ? WHERE id = ?`,
    [reason, new Date().toISOString(), versionId]
  );

  await recordAuditEvent(version.boq_id, versionId, null, session.user.email, 'REJECT_BOQ', version.status, 'Rejected');
  return { success: true, status: 'Rejected' };
}

export async function createBoqRevision(sourceVersionId, reason = '', session) {
  await initBoqTables();
  requireAuth(session);

  const sourceVersion = await queryGet(`SELECT * FROM boq_versions WHERE id = ?`, [sourceVersionId]);
  if (!sourceVersion) throw new Error('Source version not found');

  const now = new Date().toISOString();
  const newVersionId = crypto.randomUUID();
  const nextVerNumber = (sourceVersion.version_number || 1) + 1;
  const revLabel = `Rev ${nextVerNumber - 1}`;

  // 1. Mark existing versions as not current
  await queryRun(`UPDATE boq_versions SET is_current = 0 WHERE boq_id = ?`, [sourceVersion.boq_id]);

  // 2. Create cloned version header
  await queryRun(
    `INSERT INTO boq_versions (
      id, boq_id, version_number, revision_label, status, total_selling_value, total_cost_value,
      gross_margin, margin_pct, revision_reason, is_current, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      newVersionId, sourceVersion.boq_id, nextVerNumber, revLabel,
      sourceVersion.total_selling_value, sourceVersion.total_cost_value,
      sourceVersion.gross_margin, sourceVersion.margin_pct, reason, now, now
    ]
  );

  // 3. Update BOQ header current_version_id
  await queryRun(
    `UPDATE boq_headers SET current_version_id = ?, status = 'Draft', updated_at = ? WHERE id = ?`,
    [newVersionId, now, sourceVersion.boq_id]
  );

  // 4. Clone sections
  const oldSections = await queryAll(`SELECT * FROM boq_sections WHERE boq_version_id = ?`, [sourceVersionId]);
  const sectionIdMap = {};

  for (const s of oldSections) {
    const newSectionId = crypto.randomUUID();
    sectionIdMap[s.id] = newSectionId;
    await queryRun(
      `INSERT INTO boq_sections (id, boq_version_id, parent_section_id, name, sort_order, is_collapsed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newSectionId, newVersionId, null, s.name, s.sort_order, s.is_collapsed, now]
    );
  }

  // 5. Clone items
  const oldItems = await queryAll(`SELECT * FROM boq_items WHERE boq_version_id = ?`, [sourceVersionId]);
  for (const it of oldItems) {
    const newItemId = crypto.randomUUID();
    const mappedSectionId = it.section_id ? sectionIdMap[it.section_id] : null;

    await queryRun(
      `INSERT INTO boq_items (
        id, boq_version_id, section_id, item_master_id, s_no, item_code, description,
        make, unit, quantity, cost_rate, selling_rate, amount, cost_amount, margin,
        margin_pct, hsn_sac, location, drawing_ref, remarks, status, sort_order,
        rate_source, approved_qty, committed_qty, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?)`,
      [
        newItemId, newVersionId, mappedSectionId, it.item_master_id, it.s_no, it.item_code, it.description,
        it.make, it.unit, it.quantity, it.cost_rate, it.selling_rate, it.amount, it.cost_amount, it.margin,
        it.margin_pct, it.hsn_sac, it.location, it.drawing_ref, it.remarks, it.sort_order,
        it.rate_source, it.approved_qty, it.committed_qty, now, now
      ]
    );

    // Clone BOM if any
    const oldBoms = await queryAll(`SELECT * FROM boq_item_bom WHERE boq_item_id = ?`, [it.id]);
    for (const b of oldBoms) {
      await queryRun(
        `INSERT INTO boq_item_bom (
          id, boq_item_id, material_name, material_item_master_id, unit,
          consumption_per_boq_unit, wastage_pct, gross_qty, net_qty, unit_cost, total_cost, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(), newItemId, b.material_name, b.material_item_master_id, b.unit,
          b.consumption_per_boq_unit, b.wastage_pct, b.gross_qty, b.net_qty, b.unit_cost, b.total_cost, b.sort_order
        ]
      );
    }
  }

  await recordAuditEvent(sourceVersion.boq_id, newVersionId, null, session.user.email, 'CREATE_REVISION', sourceVersion.version_number, nextVerNumber);

  return { success: true, new_version_id: newVersionId, version_number: nextVerNumber, revision_label: revLabel };
}

// --------------------------------------------------------------------------
// PROCUREMENT INTEGRATION (CREATE PO FROM BOQ & IMPORT)
// --------------------------------------------------------------------------

export async function createPoFromBoq(payload, session) {
  await initBoqTables();
  requireAuth(session);

  const {
    boq_version_id,
    selected_items = [], // array of { boq_item_id, order_qty, po_rate }
    vendor_id,
    vendor_name,
    vendor_code,
    project,
    category = 'Material',
    terms = '',
    notes = '',
    expected_delivery_date = null
  } = payload;

  if (!selected_items || selected_items.length === 0) {
    throw new Error('No items selected for PO creation');
  }

  const version = await queryGet(
    `SELECT v.*, h.project as header_project, h.boq_no FROM boq_versions v
     JOIN boq_headers h ON v.boq_id = h.id WHERE v.id = ?`,
    [boq_version_id]
  );
  if (!version) throw new Error('BOQ version not found');

  const poProject = project || version.header_project;

  // 1. Build PO Items for existing PTS savePO
  const poItemsData = [];
  const linkRecords = [];

  for (const sel of selected_items) {
    const boqItem = await queryGet(`SELECT * FROM boq_items WHERE id = ?`, [sel.boq_item_id]);
    if (!boqItem) continue;

    const orderQty = parseFloat(sel.order_qty) || 0;
    if (orderQty <= 0) continue;

    const poRate = parseFloat(sel.po_rate !== undefined ? sel.po_rate : boqItem.cost_rate) || 0;
    const itemAmount = Math.round(orderQty * poRate * 100) / 100;

    poItemsData.push({
      description: boqItem.description,
      hsn_sac: boqItem.hsn_sac || '',
      qty: orderQty,
      unit: boqItem.unit || 'Nos',
      rate: poRate,
      disc_pct: 0,
      tax_pct: 18,
      amount: itemAmount,
      boq_item_id: boqItem.id,
      boq_id: version.boq_id,
      boq_version_id: version.id
    });

    linkRecords.push({
      boq_id: version.boq_id,
      boq_version_id: version.id,
      boq_item_id: boqItem.id,
      orderQty,
      poRate,
      itemAmount
    });
  }

  if (poItemsData.length === 0) {
    throw new Error('Valid quantities are required for PO creation');
  }

  // 2. Call existing PTS savePO function directly
  const poPayload = {
    project: poProject,
    vendor_id: vendor_id || null,
    vendorId: vendor_id || null,
    vendor_name: vendor_name || 'Selected Vendor',
    vendorName: vendor_name || 'Selected Vendor',
    vendor_code: vendor_code || '',
    vendorCode: vendor_code || '',
    vendor: vendor_name || 'Selected Vendor',
    category: category,
    items: poItemsData,
    terms: terms || 'Standard Procurement Terms',
    notes: notes ? `${notes} (Created from ${version.boq_no})` : `Created from BOQ: ${version.boq_no}`,
    expected_delivery_date: expected_delivery_date,
    status: 'draft',
    approval_status: 'draft'
  };

  const poResult = await savePO(poPayload, session);
  const poNo = poResult?.poNo || poResult?.po_no || poResult?.id;

  if (!poNo) {
    throw new Error('Failed to create Purchase Order via PTS Procurement engine');
  }

  // 3. Insert links in boq_po_links and update committed_qty on boq_items
  const now = new Date().toISOString();
  for (const link of linkRecords) {
    await queryRun(
      `INSERT INTO boq_po_links (
        id, boq_id, boq_version_id, boq_item_id, po_no, linked_qty, po_rate, po_amount, link_type, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'work_package', 'active', ?, ?)`,
      [
        crypto.randomUUID(), link.boq_id, link.boq_version_id, link.boq_item_id, poNo,
        link.orderQty, link.poRate, link.itemAmount, session.user.email, now
      ]
    );

    // Increase committed_qty
    await queryRun(
      `UPDATE boq_items SET committed_qty = committed_qty + ? WHERE id = ?`,
      [link.orderQty, link.boq_item_id]
    );
  }

  await recordAuditEvent(version.boq_id, version.id, null, session.user.email, 'CREATE_PO_FROM_BOQ', null, { po_no: poNo, items_count: linkRecords.length });

  return {
    success: true,
    po_no: poNo,
    po_details: poResult,
    linked_items_count: linkRecords.length
  };
}

export async function getBoqItemsForPoImport(filters = {}) {
  await initBoqTables();
  const { boq_version_id, project, search = '' } = filters;

  let targetVersionId = boq_version_id;

  if (!targetVersionId && project) {
    const latest = await queryGet(
      `SELECT current_version_id FROM boq_headers WHERE project = ? ORDER BY created_at DESC LIMIT 1`,
      [project]
    );
    targetVersionId = latest?.current_version_id;
  }

  if (!targetVersionId) return [];

  let sql = `
    SELECT i.*, s.name as section_name,
           (i.quantity - i.committed_qty) as available_balance
    FROM boq_items i
    LEFT JOIN boq_sections s ON i.section_id = s.id
    WHERE i.boq_version_id = ?
  `;
  const params = [targetVersionId];

  if (search) {
    sql += ` AND (i.description LIKE ? OR i.item_code LIKE ? OR s.name LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY s.sort_order ASC, i.sort_order ASC`;

  const items = await queryAll(sql, params);
  return items || [];
}

export async function linkPoItemToBoq(payload, session) {
  await initBoqTables();
  requireAuth(session);

  const { po_no, boq_item_id, qty, rate } = payload;
  if (!po_no || !boq_item_id) throw new Error('PO Number and BOQ Item ID are required');

  const boqItem = await queryGet(`SELECT * FROM boq_items WHERE id = ?`, [boq_item_id]);
  if (!boqItem) throw new Error('BOQ Item not found');

  const version = await queryGet(`SELECT boq_id FROM boq_versions WHERE id = ?`, [boqItem.boq_version_id]);

  const linkedQty = parseFloat(qty) || 0;
  const poRate = parseFloat(rate) || boqItem.cost_rate;
  const amount = Math.round(linkedQty * poRate * 100) / 100;
  const now = new Date().toISOString();

  await queryRun(
    `INSERT INTO boq_po_links (
      id, boq_id, boq_version_id, boq_item_id, po_no, linked_qty, po_rate, po_amount, link_type, status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual_link', 'active', ?, ?)`,
    [
      crypto.randomUUID(), version.boq_id, boqItem.boq_version_id, boq_item_id, po_no,
      linkedQty, poRate, amount, session.user.email, now
    ]
  );

  await queryRun(`UPDATE boq_items SET committed_qty = committed_qty + ? WHERE id = ?`, [linkedQty, boq_item_id]);
  return { success: true };
}

export async function cancelBoqPoLink(linkId, session) {
  await initBoqTables();
  requireAuth(session);

  const link = await queryGet(`SELECT * FROM boq_po_links WHERE id = ?`, [linkId]);
  if (!link || link.status === 'cancelled') return { success: true };

  await queryRun(`UPDATE boq_po_links SET status = 'cancelled' WHERE id = ?`, [linkId]);

  // Reverse committed_qty
  await queryRun(
    `UPDATE boq_items SET committed_qty = MAX(0, committed_qty - ?) WHERE id = ?`,
    [link.linked_qty || 0, link.boq_item_id]
  );

  return { success: true };
}

export async function getBoqProcurementStatus(versionId) {
  await initBoqTables();
  if (!versionId) return [];

  const items = await queryAll(
    `SELECT i.id, i.s_no, i.item_code, i.description, i.unit, i.quantity, i.cost_rate,
            i.committed_qty, i.procured_qty, s.name as section_name,
            (i.quantity - i.committed_qty) as remaining_qty,
            (SELECT COUNT(*) FROM boq_po_links l WHERE l.boq_item_id = i.id AND l.status = 'active') as linked_po_count,
            (SELECT GROUP_CONCAT(DISTINCT po_no) FROM boq_po_links l WHERE l.boq_item_id = i.id AND l.status = 'active') as linked_pos
     FROM boq_items i
     LEFT JOIN boq_sections s ON i.section_id = s.id
     WHERE i.boq_version_id = ?
     ORDER BY s.sort_order ASC, i.sort_order ASC`,
    [versionId]
  );

  return items || [];
}

// --------------------------------------------------------------------------
// DASHBOARD & ANALYTICS
// --------------------------------------------------------------------------

export async function getBoqDashboard(versionId) {
  await initBoqTables();
  if (!versionId) return null;

  const version = await queryGet(
    `SELECT v.*, h.project, h.boq_no, h.title as boq_title
     FROM boq_versions v
     JOIN boq_headers h ON v.boq_id = h.id
     WHERE v.id = ?`,
    [versionId]
  );
  if (!version) return null;

  // Section summary
  const sectionSummary = await queryAll(
    `SELECT s.id, s.name,
            COUNT(i.id) as item_count,
            COALESCE(SUM(i.amount), 0) as section_selling,
            COALESCE(SUM(i.cost_amount), 0) as section_cost,
            COALESCE(SUM(i.margin), 0) as section_margin
     FROM boq_sections s
     LEFT JOIN boq_items i ON s.id = i.section_id
     WHERE s.boq_version_id = ?
     GROUP BY s.id
     ORDER BY s.sort_order ASC`,
    [versionId]
  );

  // Procurement coverage
  const procCoverage = await queryGet(
    `SELECT 
      COUNT(*) as total_items,
      SUM(CASE WHEN committed_qty >= quantity AND quantity > 0 THEN 1 ELSE 0 END) as fully_committed_items,
      SUM(CASE WHEN committed_qty > 0 AND committed_qty < quantity THEN 1 ELSE 0 END) as partial_items,
      SUM(CASE WHEN committed_qty = 0 THEN 1 ELSE 0 END) as uncommitted_items,
      COALESCE(SUM(committed_qty * cost_rate), 0) as total_committed_cost
     FROM boq_items WHERE boq_version_id = ?`,
    [versionId]
  );

  const totalSelling = version.total_selling_value || 0;
  const totalCost = version.total_cost_value || 0;
  const committedCost = procCoverage?.total_committed_cost || 0;
  const procurementCoveragePct = totalCost > 0 ? Math.round((committedCost / totalCost) * 10000) / 100 : 0;

  return {
    version,
    total_selling: totalSelling,
    total_cost: totalCost,
    gross_margin: version.gross_margin || 0,
    margin_pct: version.margin_pct || 0,
    sections: sectionSummary || [],
    procurement: {
      total_items: procCoverage?.total_items || 0,
      fully_committed: procCoverage?.fully_committed_items || 0,
      partially_committed: procCoverage?.partial_items || 0,
      uncommitted: procCoverage?.uncommitted_items || 0,
      total_committed_cost: committedCost,
      coverage_pct: procurementCoveragePct
    }
  };
}

// --------------------------------------------------------------------------
// EXPORT & IMPORT (EXCEL / CSV)
// --------------------------------------------------------------------------

export async function exportBoqToExcel(versionId, options = {}) {
  await initBoqTables();
  const { view = 'client' } = options; // 'client' | 'internal' | 'procurement'

  const boqData = await getBoqVersion(versionId);
  if (!boqData) throw new Error('BOQ version not found');

  const header = await queryGet(`SELECT id, current_version_id, project, client_name, client_id, boq_no, title FROM boq_headers WHERE id = ?`, [boqData.boq_id]);
  const projFin = await queryGet(`SELECT site_address, client FROM project_financials WHERE project = ?`, [boqData.project]);
  const clientName = header?.client_name || projFin?.client || boqData.project;
  const siteLocation = projFin?.site_address || 'Gurugram, Haryana';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'LuxeWorx Atelier ERP';
  wb.lastModifiedBy = 'LuxeWorx Atelier QS Team';
  wb.created = new Date();
  wb.modified = new Date();

  // Load Logo if available
  let logoImageId = null;
  try {
    const possibleLogos = [
      path.resolve(process.cwd(), 'public/branding/LWA_PRIMARY_LOGO_CLEAN.png'),
      path.resolve(process.cwd(), 'public/branding/LWA_PRIMARY_LOGO_2_GOLD.png'),
      path.resolve(process.cwd(), 'Logo.jpeg')
    ];
    for (const p of possibleLogos) {
      if (fs.existsSync(p)) {
        const ext = p.endsWith('.jpeg') || p.endsWith('.jpg') ? 'jpeg' : 'png';
        logoImageId = wb.addImage({ filename: p, extension: ext });
        break;
      }
    }
  } catch (e) {
    console.warn('[BOQ Excel Export] Logo loading warning:', e.message);
  }

  // -------------------------------------------------------------
  // SHEET 1: SUMMARY
  // -------------------------------------------------------------
  const wsSum = wb.addWorksheet('SUMMARY', { views: [{ showGridLines: true }] });
  wsSum.columns = [
    { width: 10 }, // Sr.No
    { width: 48 }, // Scope of Works
    { width: 22 }, // Amount (INR)
    { width: 16 }  // % of Total
  ];

  // Company Brand Header
  wsSum.mergeCells('A1:C2');
  const sumTitle = wsSum.getCell('A1');
  sumTitle.value = 'LuxeWorx Atelier Interiors Pvt. Ltd.';
  sumTitle.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E293B' } };
  sumTitle.alignment = { vertical: 'middle', horizontal: 'left' };

  if (logoImageId !== null) {
    wsSum.addImage(logoImageId, {
      tl: { col: 3, row: 0.1 },
      ext: { width: 110, height: 38 }
    });
  }

  // Metadata Card
  const metaRows = [
    ['Client Name', clientName],
    ['Project', boqData.project],
    ['Location', siteLocation.split('\n')[0]],
    ['BOQ Ref & Rev', `${boqData.boq_no} - ${boqData.revision_label || 'Rev 0'}`],
    ['Date', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })]
  ];

  let metaStartRow = 4;
  for (const [lbl, val] of metaRows) {
    const lblCell = wsSum.getCell(`A${metaStartRow}`);
    lblCell.value = lbl;
    lblCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF64748B' } };

    wsSum.mergeCells(`B${metaStartRow}:D${metaStartRow}`);
    const valCell = wsSum.getCell(`B${metaStartRow}`);
    valCell.value = val;
    valCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    metaStartRow++;
  }

  metaStartRow++; // spacing

  // Summary Banner
  wsSum.mergeCells(`A${metaStartRow}:D${metaStartRow}`);
  const sumBanner = wsSum.getCell(`A${metaStartRow}`);
  sumBanner.value = 'COMMERCIAL FIT-OUT BOQ - SUMMARY OF WORKS';
  sumBanner.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  sumBanner.alignment = { horizontal: 'center', vertical: 'middle' };
  sumBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  wsSum.getRow(metaStartRow).height = 24;
  metaStartRow++;

  // Summary Table Headers
  const sumHeaders = ['Sr No.', 'Scope of Works', 'Amount (₹)', '% of Total'];
  const sumHeaderRow = wsSum.getRow(metaStartRow);
  sumHeaderRow.height = 22;
  sumHeaders.forEach((h, idx) => {
    const cell = sumHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: idx >= 2 ? 'right' : (idx === 0 ? 'center' : 'left'), vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });
  metaStartRow++;

  let sumIdx = 1;
  const totalSelling = boqData.total_selling_value || 0;

  for (const sec of boqData.sections || []) {
    const secSum = (sec.items || []).reduce((acc, it) => acc + (it.amount || 0), 0);
    const pct = totalSelling > 0 ? (secSum / totalSelling) * 100 : 0;

    const row = wsSum.getRow(metaStartRow);
    row.height = 20;

    const c1 = row.getCell(1);
    c1.value = sumIdx++;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };

    const c2 = row.getCell(2);
    c2.value = sec.name;
    c2.font = { bold: true };
    c2.alignment = { horizontal: 'left', vertical: 'middle' };

    const c3 = row.getCell(3);
    c3.value = secSum;
    c3.numFmt = '₹ #,##0.00';
    c3.font = { bold: true };
    c3.alignment = { horizontal: 'right', vertical: 'middle' };

    const c4 = row.getCell(4);
    c4.value = `${pct.toFixed(2)}%`;
    c4.alignment = { horizontal: 'right', vertical: 'middle' };

    const isEven = (sumIdx % 2 === 0);
    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
    metaStartRow++;
  }

  // Summary Total Row
  const totalRow = wsSum.getRow(metaStartRow);
  totalRow.height = 24;
  totalRow.getCell(1).value = '';
  totalRow.getCell(2).value = 'TOTAL BASIC VALUE (EXCL. TAXES)';
  totalRow.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };

  const totalCell = totalRow.getCell(3);
  totalCell.value = totalSelling;
  totalCell.numFmt = '₹ #,##0.00';
  totalCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };

  totalRow.getCell(4).value = '100.00%';
  totalRow.getCell(4).font = { bold: true };
  totalRow.getCell(4).alignment = { horizontal: 'right' };

  for (let c = 1; c <= 4; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } }
    };
  }

  // -------------------------------------------------------------
  // SHEET 2: DETAILED BOQ
  // -------------------------------------------------------------
  const wsDet = wb.addWorksheet('DETAILED BOQ', { views: [{ showGridLines: true }] });

  // Define columns based on view mode
  const isInternal = view === 'internal' || view === 'procurement';
  const isProcurement = view === 'procurement';

  const baseColumns = [
    { width: 8 },  // 1: S.NO
    { width: 34 }, // 2: DESCRIPTION
    { width: 18 }, // 3: LOCATION
    { width: 52 }, // 4: SPECIFICATION
    { width: 15 }, // 5: MAKES
    { width: 8 },  // 6: UNIT
    { width: 10 }, // 7: QTY
    { width: 14 }, // 8: RATE
    { width: 16 }  // 9: AMOUNT
  ];

  if (isInternal) {
    baseColumns.push({ width: 14 }); // COST RATE
    baseColumns.push({ width: 16 }); // COST AMOUNT
    baseColumns.push({ width: 14 }); // MARGIN
    baseColumns.push({ width: 10 }); // MARGIN %
  }

  if (isProcurement) {
    baseColumns.push({ width: 14 }); // COMMITTED QTY
    baseColumns.push({ width: 14 }); // BALANCE QTY
  }

  baseColumns.push({ width: 24 }); // REMARKS
  wsDet.columns = baseColumns;

  const totalCols = baseColumns.length;

  // Header Banner
  wsDet.mergeCells(1, 1, 2, 5);
  const detTitle = wsDet.getCell('A1');
  detTitle.value = view === 'client' ? 'LuxeWorx Atelier - Client BOQ' : `LuxeWorx Atelier - BOQ (${view.toUpperCase()} VIEW)`;
  detTitle.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E293B' } };
  detTitle.alignment = { vertical: 'middle', horizontal: 'left' };

  if (logoImageId !== null) {
    wsDet.addImage(logoImageId, {
      tl: { col: totalCols - 2, row: 0.1 },
      ext: { width: 110, height: 38 }
    });
  }

  // Subheader Info
  wsDet.mergeCells(3, 1, 3, totalCols);
  const detSub = wsDet.getCell('A3');
  detSub.value = `Client: ${clientName}   |   Project: ${boqData.project}   |   Ref: ${boqData.boq_no} (${boqData.revision_label || 'Rev 0'})   |   Date: ${new Date().toLocaleDateString('en-IN')}`;
  detSub.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  detSub.alignment = { vertical: 'middle', horizontal: 'left' };

  let detRowIdx = 5;

  // Table Column Headers
  const colHeaders = [
    'S.NO.',
    'DESCRIPTION - SCOPE OF WORK',
    'LOCATION',
    'SPECIFICATION',
    'MAKES',
    'UNIT',
    'QTY',
    'RATE (₹)',
    'AMOUNT (₹)'
  ];

  if (isInternal) {
    colHeaders.push('COST RATE (₹)', 'COST AMOUNT (₹)', 'MARGIN (₹)', 'MARGIN %');
  }
  if (isProcurement) {
    colHeaders.push('COMMITTED QTY', 'BALANCE QTY');
  }
  colHeaders.push('REMARKS');

  const colHeaderRow = wsDet.getRow(detRowIdx);
  colHeaderRow.height = 24;
  colHeaders.forEach((h, idx) => {
    const cell = colHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = {
      horizontal: idx === 0 || idx === 2 || idx === 4 || idx === 5 ? 'center' : (idx >= 6 && idx <= (isInternal ? 12 : 8) ? 'right' : 'left'),
      vertical: 'middle'
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
    };
  });
  detRowIdx++;

  // Sections & Items
  for (const sec of boqData.sections || []) {
    // Section Banner
    wsDet.mergeCells(detRowIdx, 1, detRowIdx, totalCols);
    const secCell = wsDet.getCell(detRowIdx, 1);
    secCell.value = sec.name.toUpperCase();
    secCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    secCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    wsDet.getRow(detRowIdx).height = 22;
    detRowIdx++;

    let secSellingTotal = 0;
    let secCostTotal = 0;

    for (const it of sec.items || []) {
      const row = wsDet.getRow(detRowIdx);
      secSellingTotal += (it.amount || 0);
      secCostTotal += (it.cost_amount || 0);

      row.getCell(1).value = it.s_no || '';
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };

      const descCell = row.getCell(2);
      descCell.value = it.description || '';
      descCell.font = { bold: true };
      descCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

      const locCell = row.getCell(3);
      locCell.value = it.location || '';
      locCell.alignment = { horizontal: 'center', vertical: 'top', wrapText: true };

      const specCell = row.getCell(4);
      specCell.value = it.specification || '';
      specCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

      const makeCell = row.getCell(5);
      makeCell.value = it.make || '';
      makeCell.alignment = { horizontal: 'center', vertical: 'top' };

      const unitCell = row.getCell(6);
      unitCell.value = it.unit || 'Nos';
      unitCell.alignment = { horizontal: 'center', vertical: 'top' };

      const qtyCell = row.getCell(7);
      qtyCell.value = it.quantity || 0;
      qtyCell.numFmt = '#,##0.00';
      qtyCell.alignment = { horizontal: 'right', vertical: 'top' };

      const rateCell = row.getCell(8);
      rateCell.value = it.selling_rate || 0;
      rateCell.numFmt = '₹ #,##0.00';
      rateCell.alignment = { horizontal: 'right', vertical: 'top' };

      const amtCell = row.getCell(9);
      amtCell.value = it.amount || 0;
      amtCell.numFmt = '₹ #,##0.00';
      amtCell.font = { bold: true };
      amtCell.alignment = { horizontal: 'right', vertical: 'top' };

      let colPtr = 10;
      if (isInternal) {
        const costRateCell = row.getCell(colPtr++);
        costRateCell.value = it.cost_rate || 0;
        costRateCell.numFmt = '₹ #,##0.00';
        costRateCell.alignment = { horizontal: 'right', vertical: 'top' };

        const costAmtCell = row.getCell(colPtr++);
        costAmtCell.value = it.cost_amount || 0;
        costAmtCell.numFmt = '₹ #,##0.00';
        costAmtCell.alignment = { horizontal: 'right', vertical: 'top' };

        const marginCell = row.getCell(colPtr++);
        marginCell.value = it.margin || 0;
        marginCell.numFmt = '₹ #,##0.00';
        marginCell.alignment = { horizontal: 'right', vertical: 'top' };

        const marginPctCell = row.getCell(colPtr++);
        marginPctCell.value = `${it.margin_pct || 0}%`;
        marginPctCell.alignment = { horizontal: 'right', vertical: 'top' };
      }

      if (isProcurement) {
        const commCell = row.getCell(colPtr++);
        commCell.value = it.committed_qty || 0;
        commCell.numFmt = '#,##0.00';
        commCell.alignment = { horizontal: 'right', vertical: 'top' };

        const balCell = row.getCell(colPtr++);
        balCell.value = Math.max(0, (it.quantity || 0) - (it.committed_qty || 0));
        balCell.numFmt = '#,##0.00';
        balCell.alignment = { horizontal: 'right', vertical: 'top' };
      }

      const remCell = row.getCell(colPtr);
      remCell.value = it.remarks || '';
      remCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

      for (let c = 1; c <= totalCols; c++) {
        row.getCell(c).border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
        };
      }
      detRowIdx++;
    }

    // Section Subtotal Row
    wsDet.mergeCells(detRowIdx, 1, detRowIdx, 8);
    const subLabel = wsDet.getCell(detRowIdx, 1);
    subLabel.value = `SUB TOTAL - ${sec.name.toUpperCase()}`;
    subLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    subLabel.alignment = { horizontal: 'right', vertical: 'middle' };

    const subAmt = wsDet.getCell(detRowIdx, 9);
    subAmt.value = secSellingTotal;
    subAmt.numFmt = '₹ #,##0.00';
    subAmt.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    subAmt.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let c = 1; c <= totalCols; c++) {
      const cell = wsDet.getCell(detRowIdx, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
    wsDet.getRow(detRowIdx).height = 20;
    detRowIdx++;
  }

  // Grand Total Row
  wsDet.mergeCells(detRowIdx, 1, detRowIdx, 8);
  const grandLabel = wsDet.getCell(detRowIdx, 1);
  grandLabel.value = 'GRAND TOTAL BASIC VALUE (EXCL. TAXES)';
  grandLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  grandLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  const grandAmt = wsDet.getCell(detRowIdx, 9);
  grandAmt.value = totalSelling;
  grandAmt.numFmt = '₹ #,##0.00';
  grandAmt.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  grandAmt.alignment = { horizontal: 'right', vertical: 'middle' };

  for (let c = 1; c <= totalCols; c++) {
    const cell = wsDet.getCell(detRowIdx, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } }
    };
  }
  wsDet.getRow(detRowIdx).height = 24;

  const buffer = await wb.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const cleanClient = String(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');

  return {
    filename: `${boqData.boq_no}_${cleanClient}_${view}_${Date.now()}.xlsx`,
    base64
  };
}

export async function importBoqFromCsv(payload, session) {
  await initBoqTables();
  requireAuth(session);

  const { boq_version_id, csv_data, section_id } = payload;
  if (!boq_version_id || !csv_data) {
    throw new Error('boq_version_id and csv_data are required');
  }

  const lines = csv_data.split('\n').filter(l => l.trim().length > 0);
  if (lines.length <= 1) return { imported: 0 };

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] || '';
    });

    const description = rowObj.description || rowObj.desc || rowObj.itemname || cols[1] || 'Item';
    const unit = rowObj.unit || rowObj.uom || 'Nos';
    const quantity = parseFloat(rowObj.quantity || rowObj.qty || cols[2]) || 0;
    const sellingRate = parseFloat(rowObj.sellingrate || rowObj.rate || cols[3]) || 0;
    const costRate = parseFloat(rowObj.costrate || rowObj.cost || cols[4]) || (sellingRate * 0.8);

    await saveBoqItem({
      boq_version_id,
      section_id: section_id || null,
      description,
      unit,
      quantity,
      selling_rate: sellingRate,
      cost_rate: costRate,
      make: rowObj.make || rowObj.brand || '',
      item_code: rowObj.itemcode || rowObj.code || '',
      hsn_sac: rowObj.hsnsac || rowObj.hsn || ''
    }, session);

    count++;
  }

  return { imported: count };
}

export async function importBoqFromExcel(payload, session) {
  await initBoqTables();
  requireAuth(session);

  let {
    boq_id,
    boq_version_id,
    project,
    title,
    fileBase64,
    sheetName,
    clearExisting = true
  } = payload;

  if (!fileBase64) {
    throw new Error('fileBase64 is required');
  }

  // 1. Read workbook
  const buffer = Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ''), 'base64');
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // 2. Determine target sheet
  let chosenSheetName = sheetName;
  if (!chosenSheetName || !workbook.Sheets[chosenSheetName]) {
    chosenSheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('DETAILED BOQ-R2')) ||
      workbook.SheetNames.find(n => n.toUpperCase().includes('DETAILED BOQ')) ||
      workbook.SheetNames[0];
  }

  const ws = workbook.Sheets[chosenSheetName];
  if (!ws) throw new Error(`Sheet ${chosenSheetName} not found in workbook`);

  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (rawRows.length < 2) throw new Error('Selected sheet is empty or has no data rows');

  // 3. Preload Master Rate Library for automatic purchase price resolution
  const masterItems = await queryAll(
    `SELECT id, item_code, name, description, category, unit, std_cost, std_purchase_rate
     FROM boq_item_master WHERE is_active = 1`
  );
  const STOP_WORDS = new Set(['and', 'for', 'the', 'with', 'nos', 'sqft', 'rft', 'item', 'supply', 'installation', 'providing', 'fixing', 'making', 'size', 'area', 'room', 'work', 'works', 'mm', 'thk', 'thick', 'approx', 'custom', 'etc']);
  function getTokens(str) {
    return (str || '').toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }
  function normalizeUnit(u) {
    const s = (u || '').toLowerCase().trim().replace(/[^a-z]/g, '');
    if (s.startsWith('sq') || s === 'sft') return 'sqft';
    if (s.startsWith('no')) return 'nos';
    if (s.startsWith('rf') || s === 'rmt') return 'rft';
    if (s.startsWith('set')) return 'set';
    return s;
  }

  const masterByCode = new Map();
  const masterIndexed = (masterItems || []).map(m => {
    masterByCode.set(m.item_code.toLowerCase(), m);
    const tokens = new Set(getTokens(m.name + ' ' + (m.description || '')));
    return { master: m, tokens, category: (m.category || '').toLowerCase(), unit: normalizeUnit(m.unit) };
  });

  // 4. Resolve or Create BOQ & Version
  if (!boq_id && !boq_version_id) {
    if (!project) throw new Error('Project name or boq_version_id is required');
    const existing = await queryGet(`SELECT id, current_version_id FROM boq_headers WHERE project = ? ORDER BY created_at DESC LIMIT 1`, [project]);
    if (existing) {
      boq_id = existing.id;
      boq_version_id = existing.current_version_id;
    } else {
      const created = await createBoq({
        project,
        title: title || `${project} Commercial Fit-out BOQ`
      }, session);
      boq_id = created.boq_id;
      boq_version_id = created.version_id;
    }
  } else if (boq_id && !boq_version_id) {
    const header = await queryGet(`SELECT current_version_id FROM boq_headers WHERE id = ?`, [boq_id]);
    boq_version_id = header?.current_version_id;
  }

  if (!boq_version_id) {
    throw new Error('Could not identify or create a target BOQ Version');
  }

  // Verify version is not locked
  const version = await queryGet(`SELECT status FROM boq_versions WHERE id = ?`, [boq_version_id]);
  if (version?.status === 'Approved') {
    throw new Error('IMMUTABILITY_LOCK: Target BOQ version is Approved. Create a new revision first.');
  }

  // If clearExisting is true, clear old sections and items in this draft version
  if (clearExisting) {
    await queryRun(`DELETE FROM boq_items WHERE boq_version_id = ?`, [boq_version_id]);
    await queryRun(`DELETE FROM boq_sections WHERE boq_version_id = ?`, [boq_version_id]);
  }

  // 5. Detect column headers
  let headerRowIdx = -1;
  let colMap = {
    sno: -1,
    desc: -1,
    location: -1,
    specification: -1,
    makes: -1,
    unit: -1,
    qty: -1,
    rate: -1,
    amount: -1,
    costRate: -1,
    remarks: -1
  };

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    const lowerRow = row.map(c => String(c || '').toLowerCase().trim());
    if (lowerRow.some(c => c.includes('description') || c.includes('scope of work') || c.includes('s.no') || c.includes('item'))) {
      headerRowIdx = i;
      lowerRow.forEach((c, cIdx) => {
        if (c.includes('s.no') || c === 'sno' || c === 'sr' || c === 'sl') colMap.sno = cIdx;
        else if (c.includes('description') || c.includes('scope')) colMap.desc = cIdx;
        else if (c.includes('location')) colMap.location = cIdx;
        else if (c.includes('specification') || c.includes('spec')) colMap.specification = cIdx;
        else if (c.includes('make') || c.includes('brand')) colMap.makes = cIdx;
        else if (c.includes('unit') || c === 'uom') colMap.unit = cIdx;
        else if (c.includes('qty') || c.includes('quantity')) colMap.qty = cIdx;
        else if (c.includes('rate') && !c.includes('old') && !c.includes('bcs') && !c.includes('cost')) colMap.rate = cIdx;
        else if (c.includes('amount') && !c.includes('bcs') && !c.includes('cost')) colMap.amount = cIdx;
        else if (c.includes('bcs rate') || c.includes('cost rate')) colMap.costRate = cIdx;
        else if (c.includes('remark')) colMap.remarks = cIdx;
      });
      break;
    }
  }

  if (colMap.desc === -1) colMap.desc = 1;
  if (colMap.sno === -1) colMap.sno = 0;
  if (colMap.qty === -1) colMap.qty = 6;
  if (colMap.rate === -1) colMap.rate = 7;

  // 6. Iterate and create Sections and Items
  let currentSectionId = null;
  let sectionSortOrder = 0;
  let itemSortOrder = 0;
  let importedItemsCount = 0;
  let importedSectionsCount = 0;
  const now = new Date().toISOString();

  for (let rIdx = headerRowIdx + 1; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx];
    if (!Array.isArray(row) || row.length === 0) continue;

    const snoVal = String(row[colMap.sno] || '').trim();
    const descVal = String(row[colMap.desc] || '').trim();
    const locVal = colMap.location !== -1 ? String(row[colMap.location] || '').trim() : '';
    const specVal = colMap.specification !== -1 ? String(row[colMap.specification] || '').trim() : '';
    const makeVal = colMap.makes !== -1 ? String(row[colMap.makes] || '').trim() : '';
    const unitVal = colMap.unit !== -1 ? String(row[colMap.unit] || 'Nos').trim() : 'Nos';
    const rawQty = colMap.qty !== -1 ? row[colMap.qty] : null;
    const rawRate = colMap.rate !== -1 ? row[colMap.rate] : null;
    const rawCostRate = colMap.costRate !== -1 ? row[colMap.costRate] : null;
    const remarksVal = colMap.remarks !== -1 ? String(row[colMap.remarks] || '').trim() : '';

    if (!snoVal && !descVal) continue;

    const lowerDesc = descVal.toLowerCase();

    // Check if sub-total / grand total row
    if (lowerDesc.includes('sub total') || lowerDesc.includes('subtotal') || (lowerDesc.startsWith('total') && !snoVal)) {
      continue; // Skip to avoid double counting
    }

    // Check if Section Header:
    // Single letter S.NO (A, B, C...) or 'PART A', etc., and no valid quantity
    const isSingleLetterSno = /^[A-Z]$/i.test(snoVal) || /^PART\s+[A-Z]/i.test(snoVal) || (/^[0-9]+$/.test(snoVal) && (rawQty == null || isNaN(parseFloat(rawQty))));
    const isSectionHeader = isSingleLetterSno && (rawQty == null || isNaN(parseFloat(rawQty)) || parseFloat(rawQty) === 0);

    if (isSectionHeader) {
      currentSectionId = crypto.randomUUID();
      sectionSortOrder += 10;
      const sectionName = descVal ? (snoVal ? `Part ${snoVal} - ${descVal}` : descVal) : snoVal;
      await queryRun(
        `INSERT INTO boq_sections (id, boq_version_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`,
        [currentSectionId, boq_version_id, sectionName, sectionSortOrder, now]
      );
      importedSectionsCount++;
      continue;
    }

    // It's a line item
    const qty = parseFloat(rawQty) || 0;
    const sellingRate = parseFloat(rawRate) || 0;
    if (qty <= 0 && sellingRate <= 0 && !descVal) continue;

    // Determine Cost Rate / Purchase Price from Master Library
    let costRate = parseFloat(rawCostRate);
    let matchedMasterId = null;
    let rateSource = 'excel_import';

    if (!isNaN(costRate) && costRate > 0) {
      rateSource = 'excel_cost_column';
    } else {
      let matchedMaster = null;

      // 1. Code match
      if (snoVal && masterByCode.has(snoVal.toLowerCase())) {
        matchedMaster = masterByCode.get(snoVal.toLowerCase());
      }

      // 2. High-precision keyword matching (must match unit)
      if (!matchedMaster && descVal) {
        const itTokens = getTokens(descVal);
        const itUnit = normalizeUnit(unitVal);
        if (itTokens.length >= 2) {
          let bestScore = 0;
          for (const mi of masterIndexed) {
            if (itUnit && mi.unit && mi.unit !== itUnit) continue;

            let common = 0;
            for (const t of itTokens) {
              if (mi.tokens.has(t)) common++;
            }
            if (common >= 2) {
              const score = common / itTokens.length;
              if (score > bestScore && score >= 0.6) {
                bestScore = score;
                matchedMaster = mi.master;
              }
            }
          }
        }
      }

      if (matchedMaster) {
        costRate = matchedMaster.std_cost || matchedMaster.std_purchase_rate || 0;
        matchedMasterId = matchedMaster.id;
        rateSource = 'master';
      } else {
        costRate = 0;
        matchedMasterId = null;
        rateSource = 'unmapped';
      }
    }

    const amount = Math.round(qty * sellingRate * 100) / 100;
    const costAmount = Math.round(qty * costRate * 100) / 100;
    const margin = Math.round((amount - costAmount) * 100) / 100;
    const marginPct = (amount > 0 && sellingRate > 0) ? Math.round(((sellingRate - costRate) / sellingRate) * 10000) / 100 : 0;

    const itemId = crypto.randomUUID();
    itemSortOrder++;

    await queryRun(
      `INSERT INTO boq_items (
        id, boq_version_id, section_id, item_master_id, s_no, description, specification, make, unit,
        quantity, cost_rate, selling_rate, amount, cost_amount, margin, margin_pct,
        location, remarks, status, sort_order, rate_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?)`,
      [
        itemId, boq_version_id, currentSectionId, matchedMasterId, snoVal, descVal || 'Item', specVal, makeVal, unitVal,
        qty, costRate, sellingRate, amount, costAmount, margin, marginPct,
        locVal, remarksVal, itemSortOrder, rateSource, now, now
      ]
    );

    importedItemsCount++;
  }

  // 7. Recalculate totals
  const totals = await recalculateBoqTotals(boq_version_id);

  // 8. Auto-synchronize project_financials if project is given
  if (project) {
    try {
      await queryRun(
        `UPDATE project_financials SET project_value = ?, bcs = ?, updated_at = ? WHERE project = ?`,
        [totals.totalSelling, totals.totalCost, now, project]
      );
    } catch (e) {
      console.warn('[BOQ Import] project_financials update warning:', e.message);
    }
  }

  await recordAuditEvent(boq_id, boq_version_id, null, session.user.email, 'IMPORT_EXCEL_BOQ', null, {
    sheet: chosenSheetName,
    sections: importedSectionsCount,
    items: importedItemsCount,
    totalSelling: totals.totalSelling
  });

  return {
    success: true,
    boq_id,
    boq_version_id,
    sheet: chosenSheetName,
    sections_count: importedSectionsCount,
    items_count: importedItemsCount,
    totals
  };
}
