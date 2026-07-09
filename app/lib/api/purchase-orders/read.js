// Domain: purchase-orders
import { queryAll, queryGet, queryRun } from '../../db.js';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { POService } from '../../../../src/modules/purchase-orders/services/POService';
import { requireAdminConsole, ensureSettingsTable, getSetting, setSetting } from '../core.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

export async function listPOsJson(filters = {}, session) {
  requireAuth(session);
  const rows = await queryAll(`SELECT * FROM purchase_orders ORDER BY date(COALESCE(po_date, '1900-01-01')) DESC, po_no DESC`);
  const results = rows.map(r => {
    const val = Number(r.po_value) || 0;
    const pd = Number(r.legacy_paid) || 0;
    return {
      poNo: r.po_no,
      vendor: r.vendor_name,
      project: r.project,
      poValue: val,
      revisedPOValue: val,
      status: r.status,
      poDate: r.po_date,
      amountPaid: pd,
      finalPayables: val - pd
    };
  });
  return JSON.stringify(results);
}

export async function getPOsByVendor(vendor, session) {
  requireAuth(session);
  let sql = `SELECT * FROM purchase_orders`;
  let params = [];
  if (vendor) {
    sql += ` WHERE vendor_key = ? OR vendor_name = ?`;
    params = [vendor, vendor];
  }
  sql += ` ORDER BY date(COALESCE(po_date, '1900-01-01')) DESC, po_no DESC`;
  const rows = await queryAll(sql, params);
  return rows.map(r => ({
    poNo: r.po_no,
    project: r.project,
    vendorCode: r.vendor_key,
    vendor: r.vendor_name,
    category: '',
    status: r.approval_status || r.status,
    approvalStatus: r.approval_status || r.status,
    paymentEligible: isPOEligibleForPayment(r),
    poValue: r.po_value,
    paid: r.legacy_paid,
    balance: Number(r.po_value) - Number(r.legacy_paid)
  }));
}

export async function getPOApprovalHistory(poNo, session) {
  requireAuth(session);
  if (!poNo) return [];
  await ensureSettingsTable();
  const rows = await queryAll(`SELECT * FROM po_approval_history WHERE po_no = ? ORDER BY timestamp ASC`, [poNo]);
  return rows.map(r => ({
    action: r.action,
    performed_by: r.performed_by,
    remarks: r.remarks || '',
    timestamp: r.timestamp
  }));
}

async function updatePOPaymentStatus(poNo) {
  const sysSum = await queryGet(
    `SELECT COALESCE(SUM(COALESCE(amount, 0)), 0) AS total
     FROM system_payments
     WHERE po_no = ?`,
    [poNo]
  );
  const totalPaid = Number(sysSum?.total) || 0;

  const po = await queryGet(`SELECT po_value, revised_po_value FROM purchase_orders WHERE po_no = ?`, [poNo]);
  const poVal = Number(po?.revised_po_value || po?.po_value || 0);
  const outstanding = Math.max(0, poVal - totalPaid);

  let paymentStatus = 'Unpaid';
  if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
  else if (totalPaid > 0) paymentStatus = 'Partially Paid';

  await queryRun(
    `UPDATE purchase_orders SET legacy_paid = ?, final_payable = ?, payment_status = ? WHERE po_no = ?`,
    [totalPaid, outstanding, paymentStatus, poNo]
  );
  return { totalPaid, outstanding, paymentStatus };
}

export async function getPOPayments(poNo, session) {
  requireAuth(session);
  if (!poNo) return { payments: [], summary: {} };
  await ensureSettingsTable();

  const po = await queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]);
  if (!po) return { payments: [], summary: {} };

  const manual = await queryAll(`SELECT * FROM manual_payments WHERE po_no = ? ORDER BY payment_date DESC`, [poNo]);
  const remitted = await queryAll(
    `SELECT * FROM payment_requests WHERE po_no = ? AND (stage = 'Remitted' OR remittance = 'Remitted')`,
    [poNo]
  );

  const payments = [
    ...manual.map(p => ({
      id: `MP-${p.id}`,
      payment_date: p.payment_date,
      amount: Number(p.amount),
      payment_mode: p.payment_mode || 'Bank Transfer',
      utr_ref: p.utr_ref || '',
      bank_name: p.bank_name || '',
      reference_no: p.reference_no || '',
      remarks: p.remarks || '',
      payment_type: 'manual',
      recorded_by: p.recorded_by || '',
      created_at: p.created_at
    })),
    ...remitted.map(p => ({
      id: `PR-${p.pr_id}`,
      payment_date: p.remittance_date || p.created_at?.split('T')[0] || '',
      amount: Math.max(0, Number((p.approved_amount ?? p.amount_requested) || 0) - Number(p.tds_amount || 0)),
      payment_mode: 'Bank Transfer (Remittance)',
      utr_ref: p.remittance_ref || '',
      bank_name: '',
      reference_no: '',
      remarks: p.remarks || '',
      payment_type: 'remittance',
      recorded_by: '',
      created_at: p.created_at
    }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  let totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const legacyPaid = Number(po.legacy_paid || 0);

  if (legacyPaid > 0 && Math.abs(legacyPaid - totalPaid) > 0.01) {
     const diff = legacyPaid - totalPaid;
     payments.push({
       id: 'SYS-ADJ',
       payment_date: po.po_date || 'System Adjustment',
       amount: diff,
       payment_mode: 'System / Legacy Override',
       utr_ref: 'LEGACY-CORRECTION',
       bank_name: 'Adjustment',
       reference_no: '',
       remarks: 'Manual/Legacy amount correction discrepancy adjustment',
       payment_type: 'manual',
       recorded_by: 'System Administrator'
     });
     totalPaid = legacyPaid;
  }

  const poVal = Number(po.revised_po_value || po.po_value || 0);
  const outstanding = Math.max(0, poVal - totalPaid);
  let paymentStatus = 'Unpaid';
  if (totalPaid >= poVal && poVal > 0) paymentStatus = 'Fully Paid';
  else if (totalPaid > 0) paymentStatus = 'Partially Paid';

  return {
    payments,
    summary: {
      po_value: poVal,
      total_paid: totalPaid,
      outstanding,
      payment_status: po.payment_status || paymentStatus,
      count: payments.length
    }
  };
}

import { NumberSeriesService } from '../../../../src/modules/core/services/NumberSeriesService';

export async function getPOPrefix(session) {
  requireAuth(session);
  const config = await NumberSeriesService.getConfig('purchase_order');
  return config?.prefix || '';
}

export async function getNextPONumber(session) {
  requireAuth(session);
  return NumberSeriesService.peekNextNumber('purchase_order');
}

export async function getPOFullDetails(poNo, session) {
  requireAuth(session);
  await ensureSettingsTable();
  const po = await POService.getPO(poNo);
  if (!po) return null;
  const items = await POService.getPOItems(poNo);
  return {
    ...po,
    vendor_key: po.vendor_key || '',
    approval_status: po.approval_status || po.status || 'Draft',
    status: po.approval_status || po.status || 'Draft',
    tds_section: po.tds_section || '',
    tds_pct: Number(po.tds_pct) || 0,
    tds_amount: Number(po.tds_amount) || 0,
    gst_total: Number(po.gst_total) || 0,
    gst_mode: po.gst_mode || 'inter',
    notes: po.notes || '',
    expected_delivery_date: po.expected_delivery_date || '',
    category: po.category || 'Goods',
    payment_status: po.payment_status || 'Unpaid',
    items: items.map(it => ({
      description: it.description,
      hsnSac: it.hsn_sac,
      hsn_sac: it.hsn_sac,
      quantity: it.qty,
      qty: it.qty,
      unit: it.unit || 'Nos',
      uom: it.unit || 'Nos',
      rate: it.rate,
      gstPct: Number(it.tax_pct) || 0,
      tax_pct: Number(it.tax_pct) || 0,
      amount: it.amount
    }))
  };
}

export async function getPOItems(poNo, session) {
  requireAuth(session);
  return POService.getPOItems(poNo);
}
