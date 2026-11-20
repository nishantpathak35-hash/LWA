import { queryAll, queryGet, queryRun, queryBatch, withWriteTransaction } from '../db.js';
import { initEnterpriseUpgradeSchemas } from './schema-upgrade.js';
import { logAudit } from './core.js';
import crypto from 'node:crypto';

function requireAuth(session) {
  if (!session || !session.email) {
    throw new Error('AUTH: Not signed in');
  }
}

function unwrap(val) {
  if (val && typeof val === 'object' && val.arg !== undefined) return val.arg;
  return val;
}

export async function listRateContracts(filters = {}, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const f = unwrap(filters) || {};
  let sql = `SELECT c.*, 
             (SELECT COUNT(*) FROM rate_contract_items WHERE contract_id = c.id) as item_count
             FROM rate_contracts c WHERE 1=1`;
  const args = [];

  if (f.vendor) {
    sql += ` AND (c.vendor_name LIKE ? OR c.vendor_key LIKE ?)`;
    const term = `%${f.vendor}%`;
    args.push(term, term);
  }
  if (f.project) {
    sql += ` AND (c.project = ? OR c.project IS NULL OR c.contract_type = 'global')`;
    args.push(f.project);
  }
  if (f.approval_status && f.approval_status !== 'all') {
    sql += ` AND c.approval_status = ?`;
    args.push(f.approval_status);
  }
  if (f.search) {
    sql += ` AND (c.contract_no LIKE ? OR c.title LIKE ? OR c.vendor_name LIKE ?)`;
    const term = `%${f.search}%`;
    args.push(term, term, term);
  }

  sql += ` ORDER BY c.created_at DESC`;
  const contracts = await queryAll(sql, args);

  // Check expiry condition dynamically
  const today = new Date().toISOString().split('T')[0];
  return contracts.map(c => {
    let computedStatus = c.status;
    const isExpired = c.valid_until && c.valid_until < today;
    if (isExpired && c.status === 'Active') {
      computedStatus = 'Expired';
    }
    return {
      ...c,
      is_expired: isExpired,
      effective_status: computedStatus
    };
  }).filter(c => !f.status || f.status === 'all' || c.effective_status === f.status);
}

export async function getRateContract(id, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const contractId = unwrap(id);
  const contract = await queryGet(`SELECT * FROM rate_contracts WHERE id = ?`, [contractId]);
  if (!contract) throw new Error('Rate Contract not found');

  const items = await queryAll(
    `SELECT * FROM rate_contract_items WHERE contract_id = ? ORDER BY item_name ASC`,
    [contractId]
  );

  return {
    ...contract,
    items
  };
}

export async function saveRateContract(payload, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  if (!session.roles?.some(role => ['admin', 'director', 'procurement', 'proc'].includes(role))) {
    throw new Error('AUTH: Procurement access required');
  }
  const data = unwrap(payload);
  if (!data?.vendor_name || !data.vendor_name.trim()) {
    throw new Error('Vendor name is required for Rate Contract');
  }
  if (!data?.valid_from || !data?.valid_until) {
    throw new Error('Valid From and Valid Until dates are required');
  }

  const now = new Date().toISOString();
  const contractId = data.id || crypto.randomUUID();
  const contractNo = data.contract_no || `RC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const title = data.title || `Rate Contract: ${data.vendor_name}`;
  const vendorName = data.vendor_name.trim();
  const vendorKey = data.vendor_key || vendorName.toLowerCase().replace(/\s+/g, '-');
  const contractType = data.contract_type || (data.project ? 'project_specific' : 'global');
  const project = contractType === 'global' ? null : (data.project || null);
  const validFrom = data.valid_from;
  const validUntil = data.valid_until;
  const status = data.status || 'Active';
  const approvalStatus = 'Draft';
  const terms = data.terms_conditions || '';
  const attachmentUrl = data.attachment_url || null;

  const items = Array.isArray(data.items) ? data.items : [];
  let totalContractValue = 0;
  items.forEach(it => {
    const rate = Number(it.agreed_rate) || 0;
    const maxQty = Number(it.max_qty) || 0;
    if (maxQty > 0) totalContractValue += (rate * maxQty);
  });

  return withWriteTransaction(async () => {
    if (data.id) {
      const updated = await queryRun(
        `UPDATE rate_contracts
         SET contract_no = ?, title = ?, vendor_name = ?, vendor_key = ?, contract_type = ?,
             project = ?, valid_from = ?, valid_until = ?, status = ?, approval_status = ?,
             approved_by = NULL, approved_at = NULL, last_edited_by = ?, terms_conditions = ?, attachment_url = ?, total_contract_value = ?, updated_at = ?
         WHERE id = ?`,
        [contractNo, title, vendorName, vendorKey, contractType, project, validFrom, validUntil, status, approvalStatus, session.email, terms, attachmentUrl, totalContractValue, now, contractId]
      );

      if (!updated.rowsAffected) throw new Error("Rate contract not found");

      // Replace items transactionally
      await queryRun(`DELETE FROM rate_contract_items WHERE contract_id = ?`, [contractId]);
    } else {
      // Insert new
      await queryRun(
        `INSERT INTO rate_contracts
         (id, contract_no, title, vendor_name, vendor_key, contract_type, project, valid_from, valid_until, status, approval_status, terms_conditions, attachment_url, total_contract_value, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [contractId, contractNo, title, vendorName, vendorKey, contractType, project, validFrom, validUntil, status, approvalStatus, terms, attachmentUrl, totalContractValue, session?.email || 'admin', now, now]
      );
    }

    // Insert items
    if (items.length > 0) {
      const itemStatements = items.map(it => ({
        sql: `INSERT INTO rate_contract_items
              (id, contract_id, item_code, item_name, category, subcategory, description, unit, agreed_rate, tax_pct, freight_included, installation_included, min_qty, max_qty, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        args: [
          it.id || crypto.randomUUID(),
          contractId,
          it.item_code || null,
          it.item_name || it.description || 'Contract Item',
          it.category || 'Material',
          it.subcategory || null,
          it.description || it.item_name || '',
          it.unit || 'Nos',
          Number(it.agreed_rate) || 0,
          Number(it.tax_pct ?? 18),
          it.freight_included ? 1 : 0,
          it.installation_included ? 1 : 0,
          Number(it.min_qty) || 0,
          it.max_qty != null && it.max_qty !== '' ? Number(it.max_qty) : null,
          now
        ]
      }));
      await queryBatch(itemStatements);
    }

    await logAudit('rate_contracts', contractId, data.id ? 'UPDATE_RATE_CONTRACT' : 'CREATE_RATE_CONTRACT', session?.email || 'admin', { contractNo, vendorName });
    return { success: true, id: contractId, contract_no: contractNo };
  });
}

export async function approveRateContract(id, session) {
  requireAuth(session);
  if (!session.roles?.some(role => ['admin', 'director'].includes(role))) throw new Error('AUTH: Approver access required');
  await initEnterpriseUpgradeSchemas();
  return withWriteTransaction(async () => {
    const contractId = unwrap(id);
    const result = await queryRun(
      `UPDATE rate_contracts SET approval_status = 'Approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
       WHERE id = ? AND approval_status = 'Draft' AND LOWER(created_by) <> LOWER(?) AND LOWER(COALESCE(last_edited_by, created_by)) <> LOWER(?)`,
      [session.email, contractId, session.email, session.email]
    );
    if (!result.rowsAffected) throw new Error('A draft from a different editor is required');
    await logAudit('rate_contracts', contractId, 'APPROVE_RATE_CONTRACT', session.email, {});
    return { success: true };
  });
}

/**
 * Check eligible approved active rate contracts for PO creation.
 * Returns best eligible contract rate for an item, vendor, project and unit.
 */
export async function getEligibleRateContractsForPO(params, session) {
  requireAuth(session);
  await initEnterpriseUpgradeSchemas();

  const p = unwrap(params) || {};
  const { vendor, project, item_description, item_code } = p;
  const today = new Date().toISOString().split('T')[0];

  let sql = `
    SELECT i.*, c.contract_no, c.title as contract_title, c.vendor_name, c.valid_from, c.valid_until, c.contract_type
    FROM rate_contract_items i
    JOIN rate_contracts c ON i.contract_id = c.id
    WHERE c.status = 'Active' 
      AND c.approval_status = 'Approved'
      AND c.valid_from <= ? AND c.valid_until >= ?
  `;
  const args = [today, today];
  if (p.unit) {
    sql += ' AND LOWER(TRIM(i.unit)) = LOWER(TRIM(?))';
    args.push(p.unit);
  }
  if (p.qty != null) {
    sql += ' AND COALESCE(i.min_qty,0) <= ? AND (i.max_qty IS NULL OR i.max_qty >= ?)';
    args.push(Number(p.qty), Number(p.qty));
  }
  sql += " AND i.status = 'active'";

  if (vendor) {
    sql += ` AND (LOWER(c.vendor_name) = LOWER(?) OR LOWER(c.vendor_key) = LOWER(?))`;
    args.push(vendor, vendor);
  }
  if (project) {
    sql += ` AND (c.project = ? OR c.contract_type = 'global' OR c.project IS NULL)`;
    args.push(project);
  }
  if (item_code) {
    sql += ` AND (i.item_code = ? OR LOWER(i.item_name) LIKE LOWER(?))`;
    args.push(item_code, `%${item_code}%`);
  } else if (item_description) {
    sql += ` AND (LOWER(i.item_name) LIKE LOWER(?) OR LOWER(i.description) LIKE LOWER(?))`;
    const cleanDesc = `%${item_description.trim()}%`;
    args.push(cleanDesc, cleanDesc);
  }

  sql += ` ORDER BY i.agreed_rate ASC LIMIT 10`;
  const matches = await queryAll(sql, args);

  // Also query verified historical PO purchase rates as secondary reference
  let poHistory = [];
  if (item_description) {
    const histSql = `
      SELECT pi.po_no, pi.description, pi.qty, pi.unit, pi.rate, pi.tax_pct, p.vendor_name, p.po_date, p.project
      FROM po_items pi
      JOIN purchase_orders p ON pi.po_no = p.po_no
      WHERE p.status IN ('Approved', 'Open', 'Billed', 'Partially Billed', 'Short Closed')
        AND LOWER(pi.description) LIKE LOWER(?)
        ${p.unit ? 'AND LOWER(TRIM(pi.unit)) = LOWER(TRIM(?))' : ''}
      ORDER BY p.po_date DESC LIMIT 5
    `;
    const historyArgs = [`%${item_description.trim()}%`];
    if (p.unit) historyArgs.push(p.unit);
    poHistory = await queryAll(histSql, historyArgs);
  }

  return {
    contractMatches: matches,
    poHistoryMatches: poHistory,
    hasContract: matches.length > 0
  };
}
