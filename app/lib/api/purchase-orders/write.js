// Domain: purchase-orders
import { queryAll, queryGet, queryRun } from '../../db.js';
import { sendPOEmail } from '../../email.js';
import { POService } from '../../../../src/modules/purchase-orders/services/POService';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { logAudit, requireAdminConsole, ensureSettingsTable } from '../core.js';
import { SYSTEM_FALLBACK_EMAIL } from '../../config.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}


export async function savePO(payload, session) {
  requireAuth(session);
  return POService.createPO(payload, session?.email || SYSTEM_FALLBACK_EMAIL);
}


export async function updatePOFull(poNo, payload, session) {
  requireAuth(session);

  // Fix Bug #1: fetch the existing PO record so downstream logic has access to it.
  const originalPoNo = String(poNo || '').trim();
  if (!originalPoNo) throw new Error('PO Number is required for update.');

  await ensureSettingsTable();

  const existing = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [originalPoNo]);
  if (!existing) throw new Error(`Purchase Order not found: ${originalPoNo}`);

  // Derive the new PO number (may be renamed via payload)
  const nextPoNo = String(payload.poNo || originalPoNo).trim();

  // Resolve vendor name from payload
  const vendorName = String(payload.vendorName || payload.vendor || existing.vendor_name || '');

  // Compute TDS fields
  const tdsSection = payload.tdsSection || payload.tds_section || existing.tds_section || '';
  const tdsPct = Number(payload.tdsPct ?? payload.tds_pct ?? existing.tds_pct ?? 0);
  const gstMode = payload.gstMode || payload.gst_mode || existing.gst_mode || 'inter';

  // Compute totals from line items (same logic as the frontend calcItem)
  let subtotal = 0;
  let gstTotal = 0;
  const items = payload.items || [];
  for (const item of items) {
    const qty = Number(item.qty || item.quantity || 0);
    const rate = Number(item.rate || 0);
    const gstPct = Number(item.tax_pct || item.gstPct || 0);
    const gross = qty * rate;
    const gstAmt = item.gst_amount !== undefined ? Number(item.gst_amount) : Math.round(gross * gstPct / 100);
    subtotal += gross;
    gstTotal += gstAmt;
  }
  const totalVal = subtotal + gstTotal;
  const tdsAmount = Math.round(subtotal * (tdsPct / 100));

  // Determine if financial fields changed (requires re-approval)
  const existingStatus = String(existing.approval_status || existing.status || 'Draft').toLowerCase();
  const financiallyChanged = (
    Math.abs(Number(existing.po_value) - totalVal) > 0.5 ||
    existing.vendor_name !== vendorName
  );
  // If approved PO has financial changes, demote back to Draft
  const newStatus = (existingStatus === 'approved' && financiallyChanged)
    ? 'Draft'
    : (existing.approval_status || existing.status || 'Draft');

  // Build audit diff
  const auditChanges = [];
  const trackFields = [
    ['po_no', 'PO Number', nextPoNo],
    ['vendor_name', 'Vendor', vendorName],
    ['project', 'Project', payload.project || ''],
    ['po_value', 'PO Value', totalVal],
    ['po_date', 'PO Date', payload.poDate || ''],
    ['terms', 'Terms', payload.terms || ''],
    ['expected_delivery_date', 'Expected Delivery', payload.expectedDeliveryDate || ''],
    ['notes', 'Notes', payload.notes || ''],
    ['tds_section', 'TDS Section', tdsSection],
    ['tds_pct', 'TDS %', tdsPct],
  ];
  for (const [field, label, newVal] of trackFields) {
    const oldVal = String(existing[field] ?? '');
    if (oldVal !== String(newVal)) {
      auditChanges.push(`${label}: "${oldVal}" → "${newVal}"`);
    }
  }

  await queryRun(
    `UPDATE purchase_orders SET
      po_no = ?, vendor_key = ?, vendor_name = ?, project = ?, po_value = ?, revised_po_value = ?, po_date = ?, terms = ?,
      approval_status = ?, status = ?,
      tds_section = ?, tds_pct = ?, tds_amount = ?, gst_total = ?, gst_mode = ?,
      expected_delivery_date = ?, notes = ?, category = ?
     WHERE po_no = ?`,
    [nextPoNo,
     payload.vendorCode || payload.vendor_key || existing.vendor_key || '',
     vendorName, payload.project || '', totalVal, totalVal,
     payload.poDate || existing.po_date || '', payload.terms || '',
     newStatus, newStatus,
     tdsSection, tdsPct, tdsAmount, gstTotal, gstMode,
     payload.expectedDeliveryDate || existing.expected_delivery_date || '', payload.notes || '',
     payload.category || existing.category || 'Goods',
     originalPoNo]
  );

  // If PO number was renamed, cascade to all linked tables
  if (nextPoNo !== originalPoNo) {
    const linkedTables = ['po_items', 'payment_requests', 'system_payments', 'manual_payments', 'po_approval_history'];
    for (const table of linkedTables) {
      await queryRun(`UPDATE ${table} SET po_no = ? WHERE po_no = ?`, [nextPoNo, originalPoNo]);
    }
  }

  // Replace line items
  await queryRun(`DELETE FROM po_items WHERE po_no = ?`, [nextPoNo]);
  if (items.length) {
    for (const item of items) {
      const itemGstPct = Number(item.tax_pct || item.gstPct || item.tax || 0);
      const itemQty = Number(item.qty || item.quantity || 0);
      const itemRate = Number(item.rate || 0);
      const itemGross = itemQty * itemRate;
      const itemGstAmt = item.gst_amount !== undefined ? Number(item.gst_amount) : Math.round(itemGross * itemGstPct / 100);
      const itemTotal = item.amount !== undefined ? Number(item.amount) : (itemGross + itemGstAmt);
      await queryRun(
        `INSERT INTO po_items (po_no, description, hsn_sac, qty, unit, rate, disc_pct, tax_pct, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nextPoNo, item.description || item.desc || '', item.hsn_sac || item.hsn || '', itemQty, item.unit || item.uom || 'Nos', itemRate, 0, itemGstPct, itemTotal]
      );
    }
  }

  // Log PO edit to approval history
  const changesSummary = auditChanges.length ? auditChanges.join('; ') : 'No tracked field changes';
  await queryRun(
    `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [nextPoNo, 'PO Edited', session?.email || 'unknown', changesSummary, new Date().toISOString()]
  );
  if (financiallyChanged && existingStatus === 'approved') {
    await queryRun(
      `INSERT INTO po_approval_history (po_no, action, performed_by, remarks, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [nextPoNo, 'Re-submitted to Draft (Financial Change)', session?.email || 'unknown', 'PO value or vendor changed - approval reset to Draft', new Date().toISOString()]
    );
  }
  await logAudit(session?.email || SYSTEM_FALLBACK_EMAIL, 'PO Updated', `PO#${nextPoNo} edited. Changes: ${changesSummary}`, 'Procurement');
  return { ok: true, poNo: nextPoNo, oldPoNo: originalPoNo, newStatus, changesLogged: auditChanges };
}


export async function deletePOFull(poNo, session) {
  requireAuth(session);
  requireAdminConsole(session);
  await ensureSettingsTable();

  const targetPoNo = String(poNo || '').trim();
  if (!targetPoNo) throw new Error('PO Number missing');

  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [targetPoNo]);
  if (!po) {
    throw new Error(`Purchase Order not found: ${targetPoNo}`);
  }

  const paymentRequests = await queryAll(`SELECT pr_id FROM payment_requests WHERE po_no = ?`, [targetPoNo]);
  const requestIds = paymentRequests.map(pr => String(pr.pr_id)).filter(id => id !== undefined && id !== null && id !== 'undefined');

  await logAudit(
    session.email,
    'PO Deleted',
    `PO#${targetPoNo} deleted. Vendor: ${po.vendor_name || po.vendor_key || 'N/A'}, Project: ${po.project || 'N/A'}, Value: ${po.po_value || 0}`,
    'Procurement'
  );

  const safeDelete = async (sql, params = []) => {
    try {
      await queryRun(sql, params);
    } catch (err) {
      console.warn(`PO delete cleanup skipped: ${err.message}`);
    }
  };

  if (requestIds.length) {
    const placeholders = requestIds.map(() => '?').join(',');
    await safeDelete(`DELETE FROM system_payments WHERE pr_key IN (${placeholders})`, requestIds);
  }
  await safeDelete(`DELETE FROM system_payments WHERE po_no = ?`, [targetPoNo]);
  await safeDelete(`DELETE FROM manual_payments WHERE po_no = ?`, [targetPoNo]);
  await safeDelete(`DELETE FROM payment_requests WHERE po_no = ?`, [targetPoNo]);
  await safeDelete(`DELETE FROM po_approval_history WHERE po_no = ?`, [targetPoNo]);
  await safeDelete(`DELETE FROM po_items WHERE po_no = ?`, [targetPoNo]);
  await queryRun(`DELETE FROM purchase_orders WHERE po_no = ?`, [targetPoNo]);

  return { ok: true, poNo: targetPoNo };
}


// --- PO APPROVAL WORKFLOW ---
