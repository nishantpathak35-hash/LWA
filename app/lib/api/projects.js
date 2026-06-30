// Domain: projects
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
import { logAudit, getSetting, DEFAULT_FEATURE_PERMISSIONS, VALID_ROLE_KEYS } from './core.js';
import { isSuperAdmin } from '../config.js';


function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!");
  }
  return secret;
}

function invalidateProjectCache(project) {
  return project;
}

const settingsCache = new Map();

// Promise singleton: all concurrent callers await the same migration run.
// A boolean flag is not concurrent-safe — two simultaneous requests would both
// run the expensive v3 backfill before either sets the flag to true.
let _settingsTablePromise = null;

function encryptToken(data) {
  const JWT_SECRET = getJwtSecret();
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
}

function decryptToken(token) {
  const JWT_SECRET = getJwtSecret();
  try {
    const key = Buffer.from(JWT_SECRET.slice(0, 32).padEnd(32, '0'));
    if (token && token.length >= 32) {
      try {
        const ivHex = token.slice(0, 32);
        const ciphertext = token.slice(32);
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
      } catch (err) {
        // Fall back to legacy format
      }
    }
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    throw new Error('Invalid token');
  }
}

function requireAuth(session) {
  AuthService.requireAuth(session);
}

export async function getProjectDetails(session) {
  requireAuth(session);
  const [pos, outflowSnapshots] = await Promise.all([
    queryAll(`SELECT * FROM purchase_orders`),
    calculateProjectOutflowSnapshots()
  ]);

  const projectsMap = {};

  pos.forEach(po => {
    const name = po.project;
    if (!name) return;
    if (!projectsMap[name]) {
      projectsMap[name] = {
        project: name,
        name: name,
        projectValue: 0,
        inflow: 0,
        pendingInflow: 0,
        invoiceValue: 0,
        pendingInvoice: 0,
        bcs: 0,
        plannedGM: 0,
        plannedGMPct: 0,
        poIssued: 0,
        actualGM: 0,
        actualGMPct: 0,
        pendingOutflow: 0,
        balanceAvailable: 0,
        outflowLimit: 0,
        outflow: 0,
        vendorInvoiceBooked: 0,
        tds: 0
      };
    }
    const val = Number(po.po_value) || 0;
    projectsMap[name].poIssued += val;
    projectsMap[name].projectValue += val;
  });

  // Apply outflow AFTER all POs are summed so pendingOutflow is correct
  Object.keys(projectsMap).forEach(name => {
    const projectOutflow = Number(outflowSnapshots[name]?.outflow) || 0;
    projectsMap[name].outflow = projectOutflow;
    projectsMap[name].pendingOutflow = Math.max(0, projectsMap[name].poIssued - projectOutflow);
  });

  try {
    await queryRun(`
      CREATE TABLE IF NOT EXISTS project_financials (
        project TEXT PRIMARY KEY,
        project_value REAL DEFAULT 0,
        bcs REAL DEFAULT 0,
        inflow REAL DEFAULT 0,
        invoice_value REAL DEFAULT 0,
        tds REAL DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const overrides = await queryAll(`SELECT * FROM project_financials`);
    overrides.forEach(row => {
      const name = row.project;
      if (!name) return;
      if (!projectsMap[name]) {
        projectsMap[name] = {
          project: name,
          name,
          projectValue: 0,
          inflow: 0,
          pendingInflow: 0,
          invoiceValue: 0,
          pendingInvoice: 0,
          bcs: 0,
          plannedGM: 0,
          plannedGMPct: 0,
          poIssued: 0,
          actualGM: 0,
          actualGMPct: 0,
          pendingOutflow: 0,
          balanceAvailable: 0,
          outflowLimit: 0,
          outflow: 0,
          vendorInvoiceBooked: 0,
          tds: 0
        };
      }
      const projectValue = Number(row.project_value) || projectsMap[name].projectValue;
      const bcs = Number(row.bcs) || 0;
      const inflow = Number(row.inflow) || 0;
      const invoiceValue = Number(row.invoice_value) || 0;
      const tds = Number(row.tds) || 0;
      const outflow = Number(projectsMap[name].outflow) || 0;
      projectsMap[name] = {
        ...projectsMap[name],
        projectValue,
        bcs,
        inflow,
        invoiceValue,
        tds,
        pendingInflow: Math.max(0, projectValue - inflow),
        plannedGM: projectValue - bcs,
        plannedGMPct: projectValue ? (projectValue - bcs) / projectValue : 0,
        actualGM: inflow - outflow - tds,
        actualGMPct: inflow ? (inflow - outflow - tds) / inflow : 0,
        balanceAvailable: inflow - outflow - tds
      };
    });
  } catch (e) {
    console.error('Failed to apply project financial overrides:', e.message);
  }

  return Object.values(projectsMap).map(p => ({
    ...p,
    // Ensure outflow is always explicitly present for dashboard display
    outflow: Number(p.outflow) || 0
  }));
}

export async function updateProjectFinancials(payload, session) {
  requireAuth(session);
  if (!payload?.project) throw new Error('Project is required');
  await queryRun(`
    CREATE TABLE IF NOT EXISTS project_financials (
      project TEXT PRIMARY KEY,
      project_value REAL DEFAULT 0,
      bcs REAL DEFAULT 0,
      inflow REAL DEFAULT 0,
      invoice_value REAL DEFAULT 0,
      tds REAL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await queryRun(
    `INSERT INTO project_financials (project, project_value, bcs, inflow, invoice_value, tds, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(project) DO UPDATE SET
       project_value = excluded.project_value,
       bcs = excluded.bcs,
       inflow = excluded.inflow,
       invoice_value = excluded.invoice_value,
       tds = excluded.tds,
       updated_at = excluded.updated_at`,
    [
      String(payload.project),
      Number(payload.projectValue) || 0,
      Number(payload.bcs) || 0,
      Number(payload.inflow) || 0,
      Number(payload.clientDebit) || 0,
      Number(payload.tds) || 0,
      new Date().toISOString()
    ]
  );
  await logAudit(session.email, 'Project Financials Updated', String(payload.project), 'Projects');
  invalidateProjectCache(payload.project);
  return { ok: true, project: payload.project };
}

export async function getProjectFinancialSummary(requestId, session) {
  requireAuth(session);

  // 1. Fetch the payment request to identify the project and creator
  const pr = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [requestId]);
  if (!pr) {
    throw new Error('Payment request not found');
  }

  // Check if the user is a super admin or director, or has 'approve_payment' or 'reject_payment' permissions
  const roles = session.roles || [];
  const isDirOrAdmin = roles.includes('director') || roles.includes('admin') || isSuperAdmin(session.email);

  // 2. Authorization check: Creator of the payment request must NOT be allowed to view the summary (unless Director/Admin)
  if (!isDirOrAdmin && session.email === pr.created_by) {
    throw new Error('AUTH:Unauthorized - Requester cannot view project financial summary');
  }
  
  let hasApprovalPermission = isDirOrAdmin;
  if (!hasApprovalPermission) {
    const raw = await getSetting('feature_permissions', null);
    let perms = { ...DEFAULT_FEATURE_PERMISSIONS };
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        Object.keys(saved).forEach(role => {
          if (VALID_ROLE_KEYS.has(role)) {
            perms[role] = saved[role];
          }
        });
      } catch (e) {}
    }
    for (const role of roles) {
      if (perms[role] && (perms[role].includes('approve_payment') || perms[role].includes('reject_payment'))) {
        hasApprovalPermission = true;
        break;
      }
    }
  }

  if (!hasApprovalPermission) {
    throw new Error('AUTH:Unauthorized - Approval permission required');
  }

  return calculateProjectPaymentSummaryForRequest(requestId);
}

export async function mergeProjects(targetProject, sourceProjects, session) {
  requireAuth(session);
  const roles = session.roles || [];
  const isAdmin = roles.includes('admin') || isSuperAdmin(session.email);
  const isDirector = roles.includes('director');
  
  if (!isAdmin && !isDirector) {
    throw new Error('AUTH:Unauthorized - Only Admin/Director can merge projects.');
  }

  if (!targetProject || typeof targetProject !== 'string') {
    throw new Error('Target project must be a valid string.');
  }

  if (!sourceProjects || !Array.isArray(sourceProjects) || sourceProjects.length === 0) {
    throw new Error('You must provide at least one source project to merge.');
  }

  // Prevent merging a project into itself
  const sourcesToMerge = sourceProjects.filter(sp => sp !== targetProject);
  if (sourcesToMerge.length === 0) {
    throw new Error('No valid source projects to merge into target project.');
  }

  // Generate placeholder string for the IN clause
  const placeholders = sourcesToMerge.map(() => '?').join(',');

  // Fetch financials of source projects to roll them up
  const sourceFinancials = await queryAll(
    `SELECT * FROM project_financials WHERE project IN (${placeholders})`,
    sourcesToMerge
  );

  let addedProjectValue = 0;
  let addedBcs = 0;
  let addedInflow = 0;
  let addedInvoiceValue = 0;
  let addedTds = 0;

  sourceFinancials.forEach(row => {
    addedProjectValue += Number(row.project_value || 0);
    addedBcs += Number(row.bcs || 0);
    addedInflow += Number(row.inflow || 0);
    addedInvoiceValue += Number(row.invoice_value || 0);
    addedTds += Number(row.tds || 0);
  });

  // Ensure target project exists in project_financials
  const targetRow = await queryGet(`SELECT * FROM project_financials WHERE project = ?`, [targetProject]);
  if (!targetRow) {
    await queryRun(
      `INSERT INTO project_financials (project, project_value, bcs, inflow, invoice_value, tds)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [targetProject, addedProjectValue, addedBcs, addedInflow, addedInvoiceValue, addedTds]
    );
  } else {
    await queryRun(
      `UPDATE project_financials 
       SET project_value = project_value + ?, 
           bcs = bcs + ?, 
           inflow = inflow + ?, 
           invoice_value = invoice_value + ?, 
           tds = tds + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE project = ?`,
      [addedProjectValue, addedBcs, addedInflow, addedInvoiceValue, addedTds, targetProject]
    );
  }

  // Update relational tables
  await queryRun(
    `UPDATE purchase_orders SET project = ? WHERE project IN (${placeholders})`,
    [targetProject, ...sourcesToMerge]
  );
  
  await queryRun(
    `UPDATE payment_requests SET project = ? WHERE project IN (${placeholders})`,
    [targetProject, ...sourcesToMerge]
  );

  // Delete source projects from project_financials
  await queryRun(
    `DELETE FROM project_financials WHERE project IN (${placeholders})`,
    sourcesToMerge
  );

  // Log the audit event
  await logAudit(
    session.email,
    'MERGE_PROJECTS',
    `Merged projects [${sourcesToMerge.join(', ')}] into ${targetProject}`
  );

  return { 
    ok: true, 
    message: `Successfully merged ${sourcesToMerge.length} project(s) into ${targetProject}.` 
  };
}
