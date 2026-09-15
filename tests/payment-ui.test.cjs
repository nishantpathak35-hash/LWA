const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const originalLoader = require.extensions['.js'];
const root = path.resolve(__dirname, '..');
require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(root + path.sep) || filename.includes(`${path.sep}node_modules${path.sep}`)) return originalLoader(module, filename);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename.replace(/\.js$/, '.jsx'),
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  module._compile(output.outputText, filename);
};
const PaymentListTable = require('../components/views/payments/PaymentListTable').default;
function render(requests, selectedPayments = []) {
  return renderToStaticMarkup(React.createElement(PaymentListTable, {
    displayedRequests: requests, pos: [], selectedPayments,
    canActOnReq: req => req.stage === 'Ready to Remit', getWorkflowActionButton: () => null,
  }));
}
test('ready payments keep their label on mobile and desktop', () => {
  const html = render([{ id: 1, stage: 'Ready to Remit', vendor_name: 'Supplier', created_at: '2026-01-01' }]);
  assert.equal((html.match(/Ready to Remit/g) || []).length, 2);
  assert.equal(html.includes('Settled / Remitted'), false);
});
test('mobile and desktop both sort newest payments first', () => {
  const html = render([
    { id: 1, stage: 'Ready to Remit', vendor_name: 'Older Supplier', created_at: '2026-01-01' },
    { id: 2, stage: 'Ready to Remit', vendor_name: 'Newer Supplier', created_at: '2026-02-01' },
  ]);
  const positions = [...html.matchAll(/(?:Newer|Older) Supplier/g)].map(m => m[0]);
  assert.equal(positions[0], 'Newer Supplier');
  const desktop = html.slice(html.indexOf('<table'));
  assert.ok(desktop.indexOf('Newer Supplier') < desktop.indexOf('Older Supplier'));
});
test('unrelated selected IDs do not mark all actionable payments selected', () => {
  const html = render([{ id: 1, stage: 'Ready to Remit', created_at: '2026-01-01' }], [99]);
  const selectAll = html.match(/<input[^>]*aria-label="Select all actionable payments"[^>]*>/)[0];
  assert.equal(selectAll.includes('checked'), false);
});
