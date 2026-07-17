// Domain: reports
// Auto-extracted from api.js
import { queryAll, queryGet, queryRun } from '../db.js';
import { sendInviteEmail, sendPaymentAdviceEmail, sendPOEmail } from '../email.js';
import { getPOPaymentIneligibilityReason, isPOEligibleForPayment } from '../poEligibility.js';
import { calculateProjectOutflowSnapshots, calculateProjectPaymentSummaryForRequest } from '../paymentCalculations.js';
import { VendorService } from '../../../src/modules/vendors/services/VendorService';
import { POService } from '../../../src/modules/purchase-orders/services/POService';
import { PaymentService } from '../../../src/modules/payments/services/PaymentService';
import { PaymentRepository } from '../../../src/modules/payments/repositories/PaymentRepository';
import { AuthService } from '../../../src/modules/core/services/AuthService';
import { SettingsService } from '../../../src/modules/core/services/SettingsService';
import { AuditService } from '../../../src/modules/core/services/AuditService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { getPRStatus } from './core.js';
import { listPaymentRequests } from './payments.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

export async function getAuditLogs(filters = {}, session) {
  requireAuth(session);
  const page = Number(filters.page) || 1;
  const pageSize = Math.min(Math.max(1, Number(filters.pageSize) || Number(filters.limit) || 50), 500);
  const offset = (page - 1) * pageSize;

  let whereClause = '';
  const conditions = [];
  const params = [];

  if (filters.user) {
    conditions.push(`user = ?`);
    params.push(filters.user);
  }
  if (filters.actionType) {
    conditions.push(`action_type = ?`);
    params.push(filters.actionType);
  }
  if (filters.department) {
    conditions.push(`department = ?`);
    params.push(filters.department);
  }
  if (filters.startDate) {
    conditions.push(`timestamp >= ?`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`timestamp <= ?`);
    params.push(filters.endDate);
  }
  if (filters.search) {
    conditions.push(`(user LIKE ? OR action_type LIKE ? OR details LIKE ?)`);
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    whereClause = ` WHERE ${conditions.join(' AND ')}`;
  }

  const sortDir = String(filters.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Get total count for pagination
  const countResult = await queryGet(`SELECT COUNT(*) as total FROM audit_logs${whereClause}`, params);
  const total = Number(countResult?.total) || 0;

  const rows = await queryAll(
    `SELECT id, timestamp, user, action_type AS actionType, details, department FROM audit_logs${whereClause} ORDER BY timestamp ${sortDir} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}


export async function getPaymentReportRows(filters = {}, session) {
  requireAuth(session);
  const all = await listPaymentRequests({}, session);
  return all.filter(r => {
    const type = String(filters.type || 'All').toLowerCase();
    if (type === 'all' && r.status === 'pending') return false;
    if (filters.type && filters.type !== 'All') {
      if (type === 'approved' && r.status !== 'approved') return false;
      if (type === 'rejected' && r.status !== 'rejected') return false;
      if (type === 'remit') {
        const isReadyToRemit = String(r.stage).toLowerCase() === 'ready to remit';
        if (!isReadyToRemit) return false;
  const pageSize = Math.min(Math.max(1, Number(filters.pageSize) || Number(filters.limit) || 50), 500);
  const offset = (page - 1) * pageSize;

  let whereClause = '';
  const conditions = [];
  const params = [];

  if (filters.user) {
    conditions.push(`user = ?`);
    params.push(filters.user);
  }
  if (filters.actionType) {
    conditions.push(`action_type = ?`);
    params.push(filters.actionType);
  }
  if (filters.department) {
    conditions.push(`department = ?`);
    params.push(filters.department);
  }
  if (filters.startDate) {
    conditions.push(`timestamp >= ?`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`timestamp <= ?`);
    params.push(filters.endDate);
  }
  if (filters.search) {
    conditions.push(`(user LIKE ? OR action_type LIKE ? OR details LIKE ?)`);
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    whereClause = ` WHERE ${conditions.join(' AND ')}`;
  }

  const sortDir = String(filters.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Get total count for pagination
  const countResult = await queryGet(`SELECT COUNT(*) as total FROM audit_logs${whereClause}`, params);
  const total = Number(countResult?.total) || 0;

  const rows = await queryAll(
    `SELECT id, timestamp, user, action_type AS actionType, details, department FROM audit_logs${whereClause} ORDER BY timestamp ${sortDir} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}


export async function getPaymentReportRows(filters = {}, session) {
  requireAuth(session);
  const all = await listPaymentRequests({}, session);
  return all.filter(r => {
    const type = String(filters.type || 'All').toLowerCase();
    if (type === 'all' && r.status === 'pending') return false;
    if (filters.type && filters.type !== 'All') {
      if (type === 'approved' && r.status !== 'approved') return false;
      if (type === 'rejected' && r.status !== 'rejected') return false;
      if (type === 'remit') {
        const isReadyToRemit = String(r.stage).toLowerCase() === 'ready to remit';
        if (!isReadyToRemit) return false;
      }
      if (type === 'remitted') {
        const isRemitted = String(r.stage || '').toLowerCase().trim() === 'remitted' || String(r.remittance || '').toLowerCase().trim() === 'remitted';
        if (!isRemitted) return false;
      }
    }
    if (filters.vendor && !String(r.vendor || '').toLowerCase().includes(filters.vendor.toLowerCase().trim())) return false;
    if (filters.project && !String(r.project || '').toLowerCase().includes(filters.project.toLowerCase().trim())) return false;
    return true;
  });
}

export async function getTDSRegisterReport(startDate, endDate, session) {
  requireAuth(session);
  let query = `SELECT * FROM payment_requests WHERE tds_amount > 0`;
  const params = [];
  if (startDate) {
    query += ` AND created_at >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    // Append end-of-day timestamp so the <= comparison includes
    // all records created ON the endDate (ISO timestamps like
    // '2026-01-15T10:30:00Z' are lexicographically > '2026-01-15').
    const endDateInclusive = endDate.includes('T') ? endDate : endDate + 'T23:59:59.999Z';
    query += ` AND created_at <= ?`;
    params.push(endDateInclusive);
  }
  const rows = await queryAll(query, params);

  const entries = rows.map(r => {
    const gross = Number((r.approved_amount ?? r.amount_requested) || 0);
    const tds = Number(r.tds_amount || 0);
    return {
      id: `TDS-${r.pr_id}`,
      transaction_date: r.created_at || null,
      project_id: r.project || '—',
      po_id: r.po_no || '—',
      vendor_id: r.vendor_name || '—',
      payment_request_id: r.pr_id,
      gross_amount: gross,
      amount_requested: r.amount_requested,
      approved_amount: r.approved_amount,
      tds_amount: tds,
      tds_percentage: Number(r.tds_percentage || 0),
      tds_section: r.tds_section || '194C',
      deducted_by: 'Finance User',
      deducted_at: r.created_at,
      government_payment_status: r.stage === 'Remitted' ? 'paid' : 'pending',
      government_payment_date: r.stage === 'Remitted' ? r.created_at : null,
      remarks: r.remarks || ''
    };
  });

  const summary = {};
  entries.forEach(e => {
    const sec = e.tds_section || 'Other';
    if (!summary[sec]) {
      summary[sec] = {
        section: sec,
        total_gross: 0,
        total_tds: 0,
        count: 0,
        paid: 0,
        pending: 0
      };
    }
    summary[sec].total_gross += e.gross_amount;
    summary[sec].total_tds += e.tds_amount;
    summary[sec].count++;
    if (e.government_payment_status === 'paid') {
      summary[sec].paid += e.tds_amount;
    } else {
      summary[sec].pending += e.tds_amount;
    }
  });

  return {
    entries,
    summary,
    total_entries: entries.length,
    total_tds_deducted: entries.reduce((sum, e) => sum + e.tds_amount, 0),
    total_tds_paid: entries.filter(e => e.government_payment_status === 'paid').reduce((sum, e) => sum + e.tds_amount, 0),
    total_tds_pending: entries.filter(e => e.government_payment_status !== 'paid').reduce((sum, e) => sum + e.tds_amount, 0)
  };
}

export async function getVendorTDSReport(startDate, endDate, session) {
  requireAuth(session);
  const report = await getTDSRegisterReport(startDate, endDate, session);
  const vendorMap = {};
  report.entries.forEach(e => {
    const v = e.vendor_id;
    if (!vendorMap[v]) {
      vendorMap[v] = {
        vendor_id: v,
        total_gross: 0,
        total_tds: 0,
        total_paid: 0,
        total_pending: 0,
        entries: []
      };
    }
    vendorMap[v].total_gross += e.gross_amount;
    vendorMap[v].total_tds += e.tds_amount;
    if (e.government_payment_status === 'paid') {
      vendorMap[v].total_paid += e.tds_amount;
    } else {
      vendorMap[v].total_pending += e.tds_amount;
    }
    vendorMap[v].entries.push(e);
  });
  return { vendors: Object.values(vendorMap) };
}

export async function getProjectTDSReport(startDate, endDate, session) {
  requireAuth(session);
  const report = await getTDSRegisterReport(startDate, endDate, session);
  const projMap = {};
  report.entries.forEach(e => {
    const p = e.project_id;
    if (!projMap[p]) {
      projMap[p] = {
        project_id: p,
        total_gross: 0,
        total_tds: 0,
        total_paid: 0,
        total_pending: 0,
        entries: []
      };
    }
    projMap[p].total_gross += e.gross_amount;
    projMap[p].total_tds += e.tds_amount;
    if (e.government_payment_status === 'paid') {
      projMap[p].total_paid += e.tds_amount;
    } else {
      projMap[p].total_pending += e.tds_amount;
    }
    projMap[p].entries.push(e);
  });
  return { projects: Object.values(projMap) };
}

export async function getApprovalAuditReport(startDate, endDate, session) {
  requireAuth(session);
  let query = `SELECT * FROM payment_requests`;
  const params = [];
  if (startDate) {
    query += ` WHERE created_at >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    const endDateInclusive = endDate.includes('T') ? endDate : endDate + 'T23:59:59.999Z';
    query += startDate ? ` AND created_at <= ?` : ` WHERE created_at <= ?`;
    params.push(endDateInclusive);
  }
  const list = await queryAll(query, params);
  
  const summary = { total_count: 0, total_gross: 0, total_tds: 0, total_net: 0 };
  const entries = list.map(r => {
    const gross = Number((r.approved_amount ?? r.amount_requested) || 0);
    const tds = Number(r.tds_amount || 0);
    const net = gross - tds;
    
    // Only count approved or rejected items
    const status = getPRStatus(r.stage, r.remittance);
    if (status === 'pending') return null;

    summary.total_count++;
    summary.total_gross += gross;
    summary.total_tds += tds;
    summary.total_net += net;

    const performedBy = r.created_by || 'System';
    const action = r.stage === 'Rejected' ? 'reject' : 'approve';

    return {
      timestamp: r.created_at,
      action: action,
      performed_by: performedBy,
      project_id: r.project || '—',
      vendor_id: r.vendor_name || '—',
      gross_amount: gross,
      amount_requested: r.amount_requested,
      approved_amount: r.approved_amount,
      tds_amount: tds,
      net_amount: net,
      override_flag: false
    };
  }).filter(Boolean);

  return { entries, summary };
}

export async function getDayWiseApprovalReport(startDate, endDate, session) {
  requireAuth(session);
  const auditReport = await getApprovalAuditReport(startDate, endDate, session);
  const dayMap = {};
  
  auditReport.entries.forEach(e => {
    if (e.action !== 'approve') return;
    const dateStr = String(e.timestamp || '').split('T')[0];
    if (!dateStr) return;
    
    if (!dayMap[dateStr]) {
      dayMap[dateStr] = {
        displayDate: new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        count: 0,
        gross: 0,
        tds: 0,
        net: 0,
        entries: []
      };
    }
    
    dayMap[dateStr].count++;
    dayMap[dateStr].gross += e.gross_amount;
    dayMap[dateStr].tds += e.tds_amount;
    dayMap[dateStr].net += e.net_amount;
    dayMap[dateStr].entries.push({
      sNo: e.vendor_id + '-' + e.gross_amount,
      vendor: e.vendor_id,
      project: e.project_id,
      poNo: e.po_id,
      grossAmount: e.gross_amount,
      tdsAmount: e.tds_amount,
      netAmount: e.net_amount,
      approvedBy: e.performed_by,
      bankRef: '—'
    });
  });

  const dates = Object.keys(dayMap).sort().reverse().map(dateKey => dayMap[dateKey]);
  
  const summary = {
    total_count: dates.reduce((sum, d) => sum + d.count, 0),
    total_gross: dates.reduce((sum, d) => sum + d.gross, 0),
    total_tds: dates.reduce((sum, d) => sum + d.tds, 0),
    total_net: dates.reduce((sum, d) => sum + d.net, 0)
  };

  return { dates, summary };
}
