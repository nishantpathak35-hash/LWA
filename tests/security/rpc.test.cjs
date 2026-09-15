const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadModule = require('./load-module.cjs');

function setup(overrides = {}) {
  const user = { email: 'maker@example.test', roles: ['maker'], active: true };
  const calls = [];
  const api = new Proxy({
    getMySession: async token => { if (token === 'valid') return user; throw new Error('AUTH:Invalid'); },
    getVendorPortalSession: async token => { if (token === 'vendor') return { email: 'vendor@example.test', user_type: 'vendor', active: true }; throw new Error('AUTH:Invalid'); },
    ...overrides
  }, { get: (target, name) => target[name] || (async (...args) => { calls.push([name, args]); return { ok: true }; }) });
  const { POST } = loadModule('app/api/rpc/route.js', {
    '../../lib/api.js': api,
    'next/server': { NextResponse: Response }
  });
  const request = (method, args = [], token) => POST(new Request('http://localhost/api/rpc', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { 'x-lwa-token': token } : {}) },
    body: JSON.stringify({ method, args })
  }));
  return { request, calls, user };
}

test('anonymous caller cannot inject an admin session into positional arguments', async () => {
  const { request, calls } = setup();
  const response = await request('setUserRolesAdmin', ['victim@example.test', ['admin'], { email: 'attacker', roles: ['admin'] }]);
  assert.ok([400, 401, 403].includes(response.status));
  assert.equal(calls.length, 0);
});
test('authenticated caller cannot override the resolved session with extra arguments', async () => {
  const { request, calls } = setup();
  const response = await request('updatePaymentRequest', [1, {}, { email: 'admin', roles: ['admin'] }], 'valid');
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});
test('vendor credentials do not authorize internal APIs', async () => {
  const { request, calls } = setup();
  const response = await request('getBootBundle', [], 'vendor');
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});
test('optional business arguments are padded before the server session', async () => {
  const { request, calls, user } = setup();
  assert.equal((await request('listInvoices', [], 'valid')).status, 200);
  assert.deepEqual(calls[0], ['listInvoices', [undefined, user]]);
});
test('legacy comment author argument is replaced with authenticated identity', async () => {
  const { request, calls, user } = setup();
  assert.equal((await request('addComment', [{ email: 'spoofed' }, 'PO', '1', 'hello'], 'valid')).status, 200);
  assert.equal(calls[0][1][0], user);
});
test('malformed argument containers return a client error', async () => {
  const { request } = setup();
  assert.equal((await request('listInvoices', {}, 'valid')).status, 400);
});
test('notifications use server email and roles', async () => {
  const { request, calls, user } = setup();
  assert.equal((await request('getUnreadCount', ['other', ['admin']], 'valid')).status, 200);
  assert.deepEqual(calls[0][1], [user.email, user.roles, user]);
});
