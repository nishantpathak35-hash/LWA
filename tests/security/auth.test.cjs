const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./load-module.cjs');

function authFixture() {
  const user = { email: 'user@example.test', name: 'User', roles: '["maker"]', active: 1, password_hash: '$2b$test' };
  const settings = new Map();
  const revokedTokenHashes = new Set();
  const db = {
    queryGet: async (sql, args) => {
      if (sql.includes('app_settings')) return settings.has(args[0]) ? { value: settings.get(args[0]) } : undefined;
      if (sql.includes('revoked_auth_tokens')) return revokedTokenHashes.has(args[0]) ? { token_hash: args[0] } : undefined;
      return { ...user };
    },
    queryRun: async (sql, args) => {
      if (sql.includes('app_settings')) settings.set(args[0], args[1]);
      if (sql.includes('revoked_auth_tokens') && sql.includes('INSERT')) revokedTokenHashes.add(args[0]);
      return { rowsAffected: 1 };
    },
    queryAll: async () => []
  };
  db.queryTransaction = async callback => callback(db);
  const mocks = {
    '../db.js': db, '../email.js': {}, '../poEligibility.js': {}, '../paymentCalculations.js': {},
    '../../../src/modules/vendors/services/VendorService': {}, '../../../src/modules/purchase-orders/services/POService': {},
    '../../../src/modules/payments/services/PaymentService': {}, '../../../src/modules/payments/repositories/PaymentRepository': {},
    '../../../src/modules/core/services/SettingsService': {}, '../../../src/modules/core/services/AuditService': {},
    './core.js': { logAudit: async () => {}, requireAdminConsole: () => {} },
    './token.js': { decryptToken: JSON.parse, encryptToken: JSON.stringify }
  };
  const api = load('app/lib/api/auth.js', mocks);
  const token = extra => JSON.stringify({ email: user.email, user_type: 'internal', exp: Date.now() + 60000,
    credentialVersion: crypto.createHash('sha256').update(user.password_hash).digest('hex'), ...extra });
  return { api, user, token, settings, revokedTokenHashes, mocks };
}
test('internal auth rejects vendor sessions', () => {
  const { AuthService } = load('src/modules/core/services/AuthService.ts');
  assert.throws(() => AuthService.requireAuth({ email: 'v@example.test', user_type: 'vendor' }), /AUTH:/);
});
test('session expiry must be a finite future timestamp', async () => {
  const { api, token } = authFixture();
  await assert.rejects(api.getMySession(token({ exp: undefined })), /AUTH:/);
});
test('disabled account is rejected immediately even after previous lookup', async () => {
  const { api, token, user } = authFixture();
  const value = token();
  await api.getMySession(value);
  user.active = 0;
  await assert.rejects(api.getMySession(value), /AUTH:/);
});
test('password reset invalidates previously issued credentials', async () => {
  const { api, token, user } = authFixture();
  const value = token();
  user.password_hash = '$2b$changed';
  await assert.rejects(api.getMySession(value), /AUTH:/);
});
test('logout revokes token on subsequent lookup', async () => {
  const { api, token } = authFixture();
  const value = token();
  const session = await api.getMySession(value);
  await api.logoutUser(value, session);
  await assert.rejects(api.getMySession(value), /AUTH:/);
});
test('logout persists a token hash so another server instance rejects it', async () => {
  const { api, token, revokedTokenHashes, mocks } = authFixture();
  const value = token();
  const session = await api.getMySession(value);
  await api.logoutUser(value, session);
  assert.equal(revokedTokenHashes.size, 1);

  const freshApi = load('app/lib/api/auth.js', mocks);
  await assert.rejects(freshApi.getMySession(value), /AUTH:/);
});
test('invite acceptance validates password before writing', async () => {
  const { api } = authFixture();
  await assert.rejects(api.acceptInvite('any', 'x'), /Password/);
});
