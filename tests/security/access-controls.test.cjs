const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const load = require('./load-module.cjs');

test('attachment uploads use authenticated storage and expose only the PTS download route', async t => {
  const env = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  for (const key of env) {
    const old = process.env[key];
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
    process.env[key] = 'fixture';
  }
  const locator = 'https://res.cloudinary.com/fixture/raw/authenticated/v1/erp_attachments/invoice/sample.pdf';
  const api = load('app/lib/api/attachments.js', {
    '../db.js': {
      queryRun: async (sql, args) => {
        if (sql.includes('INSERT INTO attachments')) assert.equal(args[5], locator);
        return { lastInsertRowid: 18n };
      },
      queryAll: async sql => { assert.doesNotMatch(sql, /file_data/); return []; }
    },
    './core.js': { logAudit: async () => {} },
    cloudinary: { v2: { config() {}, uploader: { upload: async (_, options) => {
      assert.equal(options.type, 'authenticated');
      return { secure_url: locator };
    } }, url: (path, options) => {
      assert.equal(path, 'erp_attachments/invoice/sample.pdf');
      assert.equal(options.type, 'authenticated');
      assert.equal(options.sign_url, true);
      return 'signed';
    } } }
  });
  const admin = { email: 'admin@example.test', roles: ['admin'] };
  const item = { entityType: 'invoice', entityId: 'sample', fileName: 'sample.pdf', fileData: 'cGRm' };
  assert.equal((await api.uploadScopedAttachment(item, admin)).url, '/api/attachments/18');
  assert.equal(api.attachmentDeliveryUrl(locator), 'signed');
  assert.throws(() => api.attachmentDeliveryUrl(locator.replace('/fixture/', '/other/')), /Unsupported/);
  await api.getAttachments(item, admin);
});

test('payment holds require the current approver and an authorised responder', async t => {
  const { DatabaseSync } = require('node:sqlite');
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec(`CREATE TABLE payment_requests(pr_id, stage, created_by);
    INSERT INTO payment_requests VALUES(1,'Pending Finance','owner@example.test');
    CREATE TABLE app_settings(key,value)`);
  const db = {
    queryRun: async (sql, args = []) => ({ rowsAffected: sqlite.prepare(sql).run(...args).changes }),
    queryGet: async (sql, args) => sqlite.prepare(sql).get(...args)
  };
  const api = load('app/lib/api/collaboration.js', {
    '../db.js': db, './notifications.js': { createNotification: async () => {} },
    '../../../src/modules/core/services/ApprovalWorkflowService': { ApprovalWorkflowService: {
      getNextStage: async (_, stage, roles) => ({ newStage: roles.includes('finance') ? 'Pending Director' : stage })
    } }
  });
  const owner = { email: 'owner@example.test', roles: ['maker'] };
  const finance = { email: 'finance@example.test', roles: ['finance'] };
  await assert.rejects(api.requestPaymentClarification(owner, 1, 'Confirm amount'), /AUTH:/);
  await api.requestPaymentClarification(finance, 1, 'Confirm amount');
  await assert.rejects(api.requestPaymentClarification(finance, 1, 'Confirm again'), /hold has changed/);
  await assert.rejects(api.answerPaymentClarification({ ...owner, email: 'other@example.test' }, 1, 'Confirmed'), /AUTH:/);
  await api.answerPaymentClarification(owner, 1, 'Confirmed');
  assert.equal(sqlite.prepare('SELECT query_status FROM payment_requests').get().query_status, 'answered');
});

test('scheduled backups require configured bearer authentication on both methods', async t => {
  const previous = process.env.CRON_SECRET;
  t.after(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
  let calls = 0;
  const route = load('app/api/cron/backup/route.js', {
    'next/server': { NextResponse: Response },
    '../../../lib/api/system.js': { performAutoBackupToGoogleDrive: async () => ++calls }
  });
  const request = new Request('https://example.test/backup');
  delete process.env.CRON_SECRET;
  assert.equal((await route.GET(request)).status, 503);
  process.env.CRON_SECRET = 'fixture';
  assert.equal((await route.POST(request)).status, 401);
  assert.equal(calls, 0);
  assert.equal((await route.GET(new Request(request, { headers: { Authorization: 'Bearer fixture' } }))).status, 200);
  assert.equal(calls, 1);
});

test('WhatsApp pairing is restricted to administrators before querying the provider', async () => {
  const { GET } = load('app/api/whatsapp/status/route.js', {
    'next/server': { NextResponse: Response },
    '../../../lib/api/auth.js': { getMySession: async () => ({ email: 'employee@example.test', roles: ['maker'] }) }
  });
  const request = new Request('https://example.test/status');
  assert.equal((await GET(request)).status, 401);
  request.headers.set('x-lwa-token', 'fixture');
  const denied = await GET(request);
  assert.equal(denied.status, 403);
  assert.match(denied.headers.get('cache-control'), /no-store/);
});

test('file permissions follow vendor ownership and employee project allocation', async () => {
  const db = { queryGet: async (sql, args) => {
    if (sql.includes('purchase_orders')) return { vendor_code: 'V1', project: 'A' };
    if (sql.includes('site_employees')) return args[0] === 'assigned@example.test' && args[1] === 'A' ? { ok: 1 } : null;
    throw Error('Unexpected query');
  } };
  const { attachmentAccess } = load('app/lib/api/attachments.js', { '../db.js': db, './core.js': {} });
  const vendor = { email: 'vendor@example.test', user_type: 'vendor', vendor_code: 'V1' };
  assert.equal(await attachmentAccess(vendor, 'po', 'PO1'), 'read');
  assert.equal(await attachmentAccess({ ...vendor, vendor_code: 'V2' }, 'po', 'PO1'), null);
  assert.equal(await attachmentAccess({ email: 'assigned@example.test' }, 'po', 'PO1'), 'project');
  assert.equal(await attachmentAccess({ email: 'other@example.test' }, 'po', 'PO1'), null);
});

test('vendor sessions require the current credential version and an unrevoked token', async () => {
  const user = { email: 'vendor@example.test', status: 'Active', password_hash: 'fixture' };
  let revoked = false;
  const { VendorPortalAuthService } = load('src/modules/vendor-portal/services/VendorPortalAuthService.ts', {
    '../../../../app/lib/db.js': { queryGet: async sql => sql.includes('vendor_portal_users') ? user : { id: 1, vendor_code: 'V1' } },
    '../../../../app/lib/api/token.js': { decryptToken: JSON.parse },
    '../../../../app/lib/api/auth.js': { isTokenRevoked: async () => revoked },
    '../../vendors/repositories/VendorRepository.ts': {}
  });
  const token = JSON.stringify({ user_type: 'vendor', email: user.email, exp: Date.now() + 60000,
    credentialVersion: createHash('sha256').update(user.password_hash).digest('hex') });
  assert.equal((await VendorPortalAuthService.getVendorSession(token)).vendor_code, 'V1');
  revoked = true;
  await assert.rejects(VendorPortalAuthService.getVendorSession(token), /AUTH:/);
  revoked = false;
  user.password_hash = 'new-fixture';
  await assert.rejects(VendorPortalAuthService.getVendorSession(token), /AUTH:/);
});
