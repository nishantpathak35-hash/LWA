import { queryAll, queryGet } from './db.js';

function money(value) {
  return Number(value) || 0;
}

function normalizeStage(payment = {}) {
  return String(payment.stage || payment.approval_stage || '').trim().toLowerCase();
}

function normalizeRemittance(payment = {}) {
  return String(payment.remittance || '').trim().toLowerCase();
}

function isRejectedPayment(payment = {}) {
  return normalizeStage(payment).includes('reject');
}

function isCancelledPayment(payment = {}) {
  const stage = normalizeStage(payment);
  return stage.includes('cancel') || String(payment.status || '').toLowerCase().includes('cancel');
}

function isDraftPayment(payment = {}) {
  return normalizeStage(payment).includes('draft') || String(payment.status || '').toLowerCase() === 'draft';
}

function isRemittedPayment(payment = {}) {
  return normalizeStage(payment).includes('remitted') || normalizeRemittance(payment).includes('remitted');
}

function isApprovedPayment(payment = {}) {
  const stage = normalizeStage(payment);
  return stage.includes('ready to remit') || isRemittedPayment(payment);
}

function isPendingPayment(payment = {}) {
  const stage = normalizeStage(payment);
  return stage.includes('pending') || stage.includes('approval');
}

function shouldCountPayment(payment = {}) {
  return !isRejectedPayment(payment) && !isCancelledPayment(payment) && !isDraftPayment(payment);
}

async function getSystemPaymentTotal(poNo) {
  const row = await queryGet(
    `SELECT COALESCE(SUM(
       CASE
         WHEN pr.pr_id IS NOT NULL THEN COALESCE(pr.approved_amount, pr.amount_requested, 0)
         ELSE COALESCE(sp.amount, 0)
       END
     ), 0) AS total
     FROM system_payments sp
     LEFT JOIN payment_requests pr ON CAST(pr.pr_id AS TEXT) = CAST(sp.pr_key AS TEXT)
     WHERE sp.po_no = ?`,
    [poNo]
  );
  return money(row?.total);
}

function summarizeRequests(requests, currentRequestId = null, postedRequestKeys = new Set()) {
  const summary = {
    approvedPayments: 0,
    pendingPayments: 0,
    rejectedPayments: 0,
    cancelledPayments: 0,
    draftPayments: 0,
    countableRequestOutflow: 0,
    remittedNotPosted: 0
  };

  for (const request of requests) {
    const amount = money(request.approved_amount ?? request.amount_requested);
    const requestId = String(request.pr_id);
    const isCurrent = currentRequestId != null && requestId === String(currentRequestId);

    if (isRejectedPayment(request)) {
      if (!isCurrent) summary.rejectedPayments += amount;
      continue;
    }
    if (isCancelledPayment(request)) {
      if (!isCurrent) summary.cancelledPayments += amount;
      continue;
    }
    if (isDraftPayment(request)) {
      if (!isCurrent) summary.draftPayments += amount;
      continue;
    }
    if (isCurrent) continue;

    if (isApprovedPayment(request)) {
      summary.approvedPayments += amount;
    } else if (isPendingPayment(request)) {
      summary.pendingPayments += amount;
    }

    if (isRemittedPayment(request)) {
      if (!postedRequestKeys.has(requestId)) summary.remittedNotPosted += amount;
    } else if (shouldCountPayment(request)) {
      summary.countableRequestOutflow += amount;
    }
  }

  return summary;
}

export async function calculatePOPaymentSummary({ requestId = null, poNo = null, currentAmount = null } = {}) {
  let currentRequest = null;
  if (requestId != null) {
    currentRequest = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [requestId]);
    if (!currentRequest) throw new Error('Payment request not found');
    poNo = currentRequest.po_no;
    currentAmount = money(currentRequest.approved_amount ?? currentRequest.amount_requested);
  }

  if (!poNo) throw new Error('PO number is required');

  const [po, requests, projectFinancials] = await Promise.all([
    queryGet(`SELECT * FROM purchase_orders WHERE po_no = ?`, [poNo]),
    queryAll(`SELECT * FROM payment_requests WHERE po_no = ?`, [poNo]),
    queryGet(
      `SELECT pf.* FROM project_financials pf
       JOIN purchase_orders po ON po.project = pf.project
       WHERE po.po_no = ?`,
      [poNo]
    ).catch(() => undefined)
  ]);

  if (!po) throw new Error(`Purchase order not found: ${poNo}`);

  const poValue = money(po.revised_po_value || po.po_value);
  const projectInflow = money(projectFinancials?.inflow);
  const systemPaid = await getSystemPaymentTotal(poNo);
  const requestSummary = summarizeRequests(requests, requestId);
  const paymentAmount = currentAmount == null ? 0 : money(currentAmount);
  const currentPOOutflow = systemPaid;
  const currentCountsTowardApproval = currentRequest ? shouldCountPayment(currentRequest) : paymentAmount > 0;
  const outflowAfterApproval = currentPOOutflow + (currentCountsTowardApproval ? paymentAmount : 0);
  const remainingPOBalance = poValue - outflowAfterApproval;
  const inflowPct = projectInflow > 0 ? (poValue / projectInflow) * 100 : 0;
  const outflowPct = poValue > 0 ? (outflowAfterApproval / poValue) * 100 : 0;

  return {
    poNo,
    project: po.project || currentRequest?.project || '',
    totalPOValue: poValue,
    projectInflow,
    currentPOOutflow,
    approvedPayments: requestSummary.approvedPayments,
    pendingPayments: requestSummary.pendingPayments,
    rejectedPayments: requestSummary.rejectedPayments,
    cancelledPayments: requestSummary.cancelledPayments,
    draftPayments: requestSummary.draftPayments,
    currentPaymentAmount: paymentAmount,
    outflowAfterApproval,
    remainingPOBalance,
    inflowPct,
    outflowPct,
    systemPaid
  };
}

export async function calculateProjectPaymentSummaryForRequest(requestId) {
  const request = await queryGet(`SELECT * FROM payment_requests WHERE pr_id = ?`, [requestId]);
  if (!request) throw new Error('Payment request not found');

  const poSummary = await calculatePOPaymentSummary({ requestId });
  const project = request.project || poSummary.project || '';
  const reqAmt = money(request.approved_amount ?? request.amount_requested);

  if (!project) {
    return {
      ...poSummary,
      project: '',
      inflow: 0,
      currentOutflow: poSummary.currentPOOutflow,
      currentUtilisation: 0,
      requestedAmount: reqAmt,
      projectedOutflow: poSummary.outflowAfterApproval,
      projectedUtilisation: 0,
      remainingBalance: poSummary.remainingPOBalance
    };
  }

  const [projectFinancials, systemPaidRow, poSumRow] = await Promise.all([
    queryGet(`SELECT * FROM project_financials WHERE project = ?`, [project]).catch(() => undefined),
    queryGet(
      `SELECT COALESCE(SUM(
         CASE
           WHEN pr.pr_id IS NOT NULL THEN COALESCE(pr.approved_amount, pr.amount_requested, 0)
           ELSE COALESCE(sp.amount, 0)
         END
       ), 0) AS total
       FROM system_payments sp
       JOIN purchase_orders po ON po.po_no = sp.po_no
       LEFT JOIN payment_requests pr ON CAST(pr.pr_id AS TEXT) = CAST(sp.pr_key AS TEXT)
       WHERE po.project = ?`,
      [project]
    ),
    queryGet(`SELECT COALESCE(SUM(po_value), 0) as total_po_value FROM purchase_orders WHERE project = ?`, [project])
  ]);

  const inflow = money(projectFinancials?.inflow);
  const boqValue = money(projectFinancials?.project_value) || money(poSumRow?.total_po_value);
  const bcs = money(projectFinancials?.bcs);
  const currentOutflow = money(systemPaidRow?.total);
  const projectedOutflow = currentOutflow + (shouldCountPayment(request) ? reqAmt : 0);
  const currentUtilisation = inflow > 0 ? Math.round((currentOutflow / inflow) * 100) : 0;
  const projectedUtilisation = inflow > 0 ? Math.round((projectedOutflow / inflow) * 100) : 0;
  const remainingBalance = inflow - projectedOutflow;
  const projectInflowPct = boqValue > 0 ? (inflow / boqValue) * 100 : 0;
  const projectOutflowPct = inflow > 0 ? (currentOutflow / inflow) * 100 : 0;
  const inflowOutflowRatio = currentOutflow > 0 ? inflow / currentOutflow : 0;
  const poCurrentOutflowPct = poSummary.totalPOValue > 0 ? (poSummary.currentPOOutflow / poSummary.totalPOValue) * 100 : 0;
  const tdsHoldAmount = money(request.tds_amount);
  const netPayableAfterTds = Math.max(reqAmt - tdsHoldAmount, 0);

  return {
    ...poSummary,
    project,
    boqValue,
    bcs,
    inflow,
    projectInflowPct,
    projectOutflow: currentOutflow,
    projectOutflowPct,
    inflowOutflowRatio,
    poCurrentOutflowPct,
    currentOutflow,
    currentUtilisation,
    requestedAmount: reqAmt,
    projectedOutflow,
    projectedUtilisation,
    remainingBalance,
    tdsHoldAmount,
    tdsHoldPct: money(request.tds_percentage),
    tdsHoldSection: request.tds_section || '',
    netPayableAfterTds
  };
}

export async function calculateProjectOutflowSnapshots() {
  // Single-leg approach: ALL payments flow through system_payments.
  // Manual payments: inserted directly with sp.amount = net amount paid.
  // Workflow remittances: mirrored into system_payments at remittance time
  //   with sp.amount = amount_requested - tds_amount (net).
  // No Leg 2 needed — startup migration backfills any legacy orphan PRs.
  const [systemRows, requestRows] = await Promise.all([
    // Only leg: sum system_payments.amount directly (already net)
    queryAll(
      `SELECT po.project,
              COALESCE(SUM(COALESCE(sp.amount, 0)), 0) AS total
       FROM system_payments sp
       JOIN purchase_orders po ON po.po_no = sp.po_no
       GROUP BY po.project`
    ),
    queryAll(`SELECT * FROM payment_requests`)
  ]);

  const snapshots = {};

  for (const row of systemRows) {
    const project = row.project || '';
    if (!project) continue;
    snapshots[project] = {
      outflow: money(row.total),
      approvedPayments: 0,
      pendingPayments: 0,
      rejectedPayments: 0,
      cancelledPayments: 0,
      draftPayments: 0
    };
  }

  const requestsByProject = new Map();
  for (const request of requestRows) {
    const project = request.project || '';
    if (!project) continue;
    if (!requestsByProject.has(project)) requestsByProject.set(project, []);
    requestsByProject.get(project).push(request);
  }

  for (const [project, requests] of requestsByProject.entries()) {
    const requestSummary = summarizeRequests(requests, null);
    if (!snapshots[project]) {
      snapshots[project] = { outflow: 0, approvedPayments: 0, pendingPayments: 0, rejectedPayments: 0, cancelledPayments: 0, draftPayments: 0 };
    }
    snapshots[project].approvedPayments = requestSummary.approvedPayments;
    snapshots[project].pendingPayments  = requestSummary.pendingPayments;
    snapshots[project].rejectedPayments = requestSummary.rejectedPayments;
    snapshots[project].cancelledPayments = requestSummary.cancelledPayments;
    snapshots[project].draftPayments    = requestSummary.draftPayments;
  }

  return snapshots;
}
