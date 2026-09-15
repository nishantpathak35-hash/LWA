const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const { createClient } = require('@libsql/client');

function load(file, dependencies, processValue = process) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: id => {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  }, process: processValue, console, setTimeout });
  return exports;
}

async function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'payment-integrity-'));
  const client = createClient({ url: `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}` });
  t.after(() => { client.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  const db = load('app/lib/db.js', { '@libsql/client': { createClient: () => client } }, {
    env: { TURSO_DATABASE_URL: 'file::memory:', TURSO_AUTH_TOKEN: 'local-test' }
  });
  await client.executeMultiple(`
    CREATE TABLE payment_requests (pr_id INTEGER PRIMARY KEY, po_no TEXT, vendor_id INTEGER, vendor_code TEXT, vendor_name TEXT, project TEXT, category TEXT, amount_requested REAL, approved_amount REAL, stage TEXT, remittance TEXT, remarks TEXT, created_by TEXT, created_at TEXT, tds_amount REAL, tds_percentage REAL, tds_section TEXT, invoice_id TEXT, version INTEGER DEFAULT 1, remittance_ref TEXT, remittance_date TEXT, proc_approval TEXT, finance_approval TEXT, director_approval TEXT);
    CREATE TABLE purchase_orders (po_no TEXT PRIMARY KEY, po_value REAL, revised_po_value REAL, legacy_paid REAL DEFAULT 0, final_payable REAL, payment_status TEXT, vendor_code TEXT, vendor_name TEXT, project TEXT);
    CREATE TABLE system_payments (id INTEGER PRIMARY KEY, po_no TEXT, pr_key TEXT, amount REAL, remitted_by TEXT, created_at TEXT, utr_ref TEXT, bank_name TEXT, payment_mode TEXT, remarks TEXT, reference_no TEXT);
    CREATE TABLE manual_payments (id INTEGER PRIMARY KEY, po_no TEXT, payment_date TEXT, amount REAL, payment_mode TEXT, utr_ref TEXT, bank_name TEXT, reference_no TEXT, remarks TEXT, payment_type TEXT, recorded_by TEXT, created_at TEXT);
    CREATE TABLE audit_logs (id INTEGER PRIMARY KEY, user TEXT, action_type TEXT, details TEXT, department TEXT, timestamp TEXT);
    CREATE TABLE approval_history_v2 (workflow_id TEXT, entity_type TEXT, entity_id TEXT, stage_name TEXT, action TEXT, performed_by TEXT, remarks TEXT, stage_sequence INTEGER, metadata TEXT);
    CREATE TABLE invoices (id INTEGER PRIMARY KEY, invoice_id TEXT, po_no TEXT, vendor_code TEXT);
    INSERT INTO purchase_orders (po_no, po_value, vendor_code, vendor_name, project) VALUES ('PO1', 1000, 'V1', 'Vendor', 'Site');
    INSERT INTO payment_requests (pr_id,po_no,amount_requested,approved_amount,tds_amount,stage,remittance,version) VALUES (1,'PO1',100,100,10,'Ready to Remit','',1);
  `);
  const { PaymentRepository } = load('src/modules/payments/repositories/PaymentRepository.ts', {
    '../../../../app/lib/db.js': db
  });
  const { AuthService } = load('src/modules/core/services/AuthService.ts', {});
  const { PaymentService } = load('src/modules/payments/services/PaymentService.ts', {
    '../repositories/PaymentRepository.ts': { PaymentRepository },
    '../../core/services/AuthService.ts': { AuthService },
    '../../core/services/ApprovalWorkflowService.ts': { ApprovalWorkflowService: {
      getNextStage: async () => ({ newStage: 'Ready to Remit', updates: {} })
    } },
    '../../purchase-orders/services/POService.ts': { POService: { getPO: po => db.queryGet('SELECT * FROM purchase_orders WHERE po_no = ?', [po]) } },
    '../../../../app/lib/api.js': { logAudit: async () => {} }
  });
  return { client, db, PaymentRepository, PaymentService };
}
const finance = { email: 'finance@example.com', roles: ['finance'] };
const remit = { amount: 90, utrRef: 'UTR1', paymentDate: '2026-09-15', paymentMode: 'Bank Transfer' };

test('non-admin cannot use client adminOverride', async t => {
  const { PaymentService } = await setup(t);
  await assert.rejects(PaymentService.updatePaymentRequest(1, { adminOverride: true, amountRequested: 200 }, finance), /Unauthorized/);
});
test('remittance requires a trusted finance role', async t => {
  const { PaymentService } = await setup(t);
  await assert.rejects(PaymentService.remitPaymentRequest(1, remit, { email: 'site@example.com', roles: ['site'] }), /Unauthorized/);
});
test('remittance retry posts once and recalculates gross PO settlement', async t => {
  const { db, PaymentService } = await setup(t);
  await PaymentService.remitPaymentRequest(1, remit, finance);
  await PaymentService.remitPaymentRequest(1, remit, finance);
  assert.equal((await db.queryGet('SELECT COUNT(*) n FROM system_payments')).n, 1);
  assert.equal((await db.queryGet('SELECT legacy_paid FROM purchase_orders')).legacy_paid, 100);
  assert.equal((await db.queryGet('SELECT COUNT(*) n FROM audit_logs')).n, 1);
  await assert.rejects(PaymentService.remitPaymentRequest(1, { ...remit, utrRef: 'OTHER' }, finance), /already|conflict/i);
});
test('audit failure rolls back remittance and request changes', async t => {
  const { db, client, PaymentService } = await setup(t);
  await client.execute("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END");
  await assert.rejects(PaymentService.remitPaymentRequest(1, remit, finance), /audit unavailable/);
  assert.equal((await db.queryGet('SELECT COUNT(*) n FROM system_payments')).n, 0);
  assert.equal((await db.queryGet('SELECT stage FROM payment_requests')).stage, 'Ready to Remit');
});
test('stale approval leaves no history or audit', async t => {
  const { db, PaymentRepository } = await setup(t);
  await assert.rejects(PaymentRepository.updateRequestWithAuditAndHistory(1, { stage: 'Remitted' },
    { user: 'a', action_type: 'Approved', details: 'test' },
    { entity_type: 'payment_request', entity_id: '1', stage_name: 'Finance', action: 'Approved', performed_by: 'a' }, 0), /CONFLICT/);
  assert.equal((await db.queryGet('SELECT COUNT(*) n FROM approval_history_v2')).n, 0);
});
test('manual ledger failure rolls back manual entry', async t => {
  const { db, client, PaymentService } = await setup(t);
  await client.execute("CREATE TRIGGER fail_ledger BEFORE INSERT ON system_payments BEGIN SELECT RAISE(ABORT, 'ledger unavailable'); END");
  await assert.rejects(PaymentService.createManualPayment({ poNo: 'PO1', amount: 20 }, 'finance@example.com'), /ledger unavailable/);
  assert.equal((await db.queryGet('SELECT COUNT(*) n FROM manual_payments')).n, 0);
});
test('non-finite amounts and mismatched invoice links are rejected', async t => {
  const { db, PaymentService } = await setup(t);
  await assert.rejects(PaymentService.createPaymentRequest({ poNo: 'PO1', vendor: 'Vendor', amountRequested: Infinity }, 'a'), /Amount/);
  await db.queryRun("INSERT INTO invoices (invoice_id,po_no,vendor_code) VALUES ('INV1','PO2','V2')");
  await assert.rejects(PaymentService.createPaymentRequest({ poNo: 'PO1', vendor: 'Vendor', amountRequested: 20, invoice_id: 'INV1' }, 'a'), /invoice/i);
});
test('remittance must equal the approved net amount', async t => {
  const { PaymentService } = await setup(t);
  await assert.rejects(PaymentService.remitPaymentRequest(1, { ...remit, amount: 500 }, finance), /amount/i);
});
