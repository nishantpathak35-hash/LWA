import { queryAll, queryGet, queryRun } from '../db.js';
import { initEnterpriseUpgradeSchemas } from './schema-upgrade.js';
import { logAudit } from './core.js';

function requireAuth(session) {
  if (!session || !session.email) {
    throw new Error('AUTH: Not signed in');
  }
}

function unwrap(val) {
  if (val && typeof val === 'object' && val.arg !== undefined) return val.arg;
  return val;
}

export async function listClients(filters = {}, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  // Auto-sync clients from project_financials so project clients automatically register in Clients Master
  try {
    const projClients = await queryAll(
      `SELECT DISTINCT TRIM(client) as client_name FROM project_financials WHERE client IS NOT NULL AND TRIM(client) != ''`
    );
    if (Array.isArray(projClients)) {
      for (const pc of projClients) {
        const cName = pc.client_name;
        if (!cName) continue;
        const existing = await queryGet(
          `SELECT id FROM clients WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(company_name)) = LOWER(TRIM(?))`,
          [cName, cName]
        );
        if (!existing) {
          const now = new Date().toISOString();
          await queryRun(
            `INSERT INTO clients (name, company_name, status, created_by, created_at, updated_at)
             VALUES (?, ?, 'Active', 'system:project_sync', ?, ?)`,
            [cName, cName, now, now]
          );
        }
      }
    }
  } catch (err) {
    console.warn('[Clients Auto-Sync from Projects]', err.message);
  }

  const f = unwrap(filters) || {};
  let sql = `SELECT * FROM clients WHERE deleted_at IS NULL`;
  const args = [];

  if (f.search) {
    sql += ` AND (name LIKE ? OR email LIKE ? OR contact LIKE ? OR gst LIKE ?)`;
    const term = `%${f.search}%`;
    args.push(term, term, term, term);
  }
  if (f.status && f.status !== 'all') {
    sql += ` AND status = ?`;
    args.push(f.status);
  }

  sql += ` ORDER BY name ASC`;
  const clients = await queryAll(sql, args);

  // Augment each client with linked projects count and total project value
  const projectSummaries = await queryAll(
    `SELECT client, COUNT(*) as proj_count, SUM(project_value) as total_val 
     FROM project_financials 
     WHERE client IS NOT NULL AND client != '' 
     GROUP BY client`
  );
  const sumMap = new Map();
  if (Array.isArray(projectSummaries)) {
    projectSummaries.forEach(s => {
      sumMap.set(String(s.client).trim().toLowerCase(), s);
    });
  }

  return (clients || []).map(c => {
    const s = sumMap.get(String(c.name || '').trim().toLowerCase()) || 
              sumMap.get(String(c.company_name || '').trim().toLowerCase());
    return {
      ...c,
      is_project_mapped: c.created_by === 'system:project_sync',
      linked_projects_count: s?.proj_count || 0,
      total_contract_value: s?.total_val || 0
    };
  });
}

export async function getClient(id, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const clientId = unwrap(id);
  const client = await queryGet(`SELECT * FROM clients WHERE id = ? AND deleted_at IS NULL`, [clientId]);
  if (!client) throw new Error('Client not found');

  return client;
}

export async function saveClient(clientData, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const data = unwrap(clientData);
  if (!data?.name || !data.name.trim()) {
    throw new Error('Client Name is required');
  }

  const name = data.name.trim();
  const company_name = (data.company_name || name).trim();
  const email = (data.email || '').trim().toLowerCase();
  const contact = (data.contact || '').trim();
  const gst = (data.gst || '').trim().toUpperCase();
  const pan = (data.pan || '').trim().toUpperCase();
  const address = (data.address || '').trim();
  const state = (data.state || '').trim();
  const status = data.status || 'Active';
  const now = new Date().toISOString();

  if (data.id) {
    await queryRun(
      `UPDATE clients 
       SET name = ?, company_name = ?, email = ?, contact = ?, gst = ?, pan = ?,
           address = ?, state = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [name, company_name, email, contact, gst, pan, address, state, status, now, data.id]
    );

    await logAudit('clients', data.id, 'UPDATE_CLIENT', session?.email || 'admin', { name, company_name, gst, status });
    return { success: true, id: data.id };
  } else {
    // Check duplicate by name or email
    const existing = await queryGet(
      `SELECT id FROM clients WHERE (LOWER(name) = LOWER(?) OR (email != '' AND LOWER(email) = LOWER(?))) AND deleted_at IS NULL`,
      [name, email]
    );
    if (existing) {
      throw new Error(`A client with the name "${name}" or email "${email}" already exists.`);
    }

    const res = await queryRun(
      `INSERT INTO clients (name, company_name, email, contact, gst, pan, address, state, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, company_name, email, contact, gst, pan, address, state, status, session?.email || 'admin', now, now]
    );

    const newId = res.lastInsertRowid;
    await logAudit('clients', newId, 'CREATE_CLIENT', session?.email || 'admin', { name, company_name, gst, status });
    return { success: true, id: newId };
  }
}

export async function deleteClient(id, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const clientId = unwrap(id);
  const client = await queryGet(`SELECT name FROM clients WHERE id = ?`, [clientId]);
  if (!client) throw new Error('Client not found');

  const now = new Date().toISOString();
  await queryRun(
    `UPDATE clients SET deleted_at = ?, deleted_by = ?, status = 'Inactive' WHERE id = ?`,
    [now, session?.email || 'admin', clientId]
  );

  await logAudit('clients', clientId, 'DELETE_CLIENT', session?.email || 'admin', { name: client.name });
  return { success: true };
}

/**
 * Get Client details with all linked projects and their BOQs.
 * Workflow: Clients → Select Client → Linked Projects / BOQs
 */
export async function getClientProjectsAndBoqs(clientId, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const targetId = unwrap(clientId);
  const client = await queryGet(`SELECT * FROM clients WHERE id = ? AND deleted_at IS NULL`, [targetId]);
  if (!client) throw new Error('Client not found');

  const clientName = client.name || '';
  const companyName = client.company_name || clientName;

  // Find linked projects from project_financials
  const projects = await queryAll(
    `SELECT * FROM project_financials 
     WHERE client_id = ? OR LOWER(TRIM(client)) = LOWER(TRIM(?)) OR LOWER(TRIM(client)) = LOWER(TRIM(?))`,
    [client.id, clientName, companyName]
  );

  // For each project, fetch its BOQs and versions
  const projectList = Array.isArray(projects) ? projects : [];
  const projectNames = projectList.map(p => p.project).filter(Boolean);
  let boqs = [];
  if (projectNames.length > 0) {
    const placeholders = projectNames.map(() => '?').join(',');
    boqs = await queryAll(
      `SELECT h.*, v.version_number, v.revision_label, v.total_selling_value, v.total_cost_value, v.gross_margin, v.margin_pct, v.status as version_status
       FROM boq_headers h
       LEFT JOIN boq_versions v ON h.current_version_id = v.id
       WHERE h.project IN (${placeholders}) OR h.client_id = ? OR LOWER(TRIM(h.client_name)) = LOWER(TRIM(?))`,
      [...projectNames, client.id, clientName]
    );
  } else {
    boqs = await queryAll(
      `SELECT h.*, v.version_number, v.revision_label, v.total_selling_value, v.total_cost_value, v.gross_margin, v.margin_pct, v.status as version_status
       FROM boq_headers h
       LEFT JOIN boq_versions v ON h.current_version_id = v.id
       WHERE h.client_id = ? OR LOWER(TRIM(h.client_name)) = LOWER(TRIM(?))`,
      [client.id, clientName]
    );
  }

  return {
    client,
    projects: projectList,
    boqs: Array.isArray(boqs) ? boqs : []
  };
}
