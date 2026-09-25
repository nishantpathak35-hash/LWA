import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../app/lib/api.js', () => ({ getMySession: vi.fn(async () => ({ email: 'test@example.com' })) }));
import { POST } from '../../app/api/ai/parse-invoice/route.js';
const request = (extra = {}) => new Request('http://localhost/api/ai/parse-invoice', {
  method: 'POST', headers: { 'x-lwa-token': 'test' }, body: JSON.stringify({ fileData: '/9j/AA==', fileType: 'image/jpeg', ...extra }),
});
beforeEach(() => { vi.stubEnv('GROQ_API_KEY', 'test-key'); });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('reports configuration errors instead of successful empty OCR', async () => {
  vi.stubEnv('GROQ_API_KEY', '');
  expect((await POST(request())).status).toBe(503);
});
it('reports provider errors rather than zero-filled success', async () => {
  fetch.mockResolvedValueOnce(new Response('{}', { status: 429 }));
  const response = await POST(request());
  expect(response.status).toBe(502);
  expect((await response.json()).error).toBeTruthy();
});
it('sends first and last pages together and keeps the invoice total', async () => {
  fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: JSON.stringify({ invoiceNumber: 'A1', invoiceDate: '2026-09-01', subtotal: 100, taxAmount: 18, invoiceTotal: 118 }) } }] }));
  const response = await POST(request({ additionalImages: ['/9j/BB=='] }));
  expect(response.status).toBe(200);
  expect((await response.json()).data.invoiceTotal).toBe(118);
  const sent = JSON.parse(fetch.mock.calls[0][1].body);
  expect(sent.messages[1].content.filter(item => item.type === 'image_url')).toHaveLength(2);
});
it('enforces rate limiting when too many requests are sent in a short window', async () => {
  fetch.mockImplementation(() => Promise.resolve(Response.json({ choices: [{ message: { content: JSON.stringify({ invoiceNumber: 'A1', invoiceDate: '2026-09-01', subtotal: 100, taxAmount: 18, invoiceTotal: 118 }) } }] })));
  let lastResponse;
  for (let i = 0; i < 21; i++) {
    lastResponse = await POST(request());
  }
  expect(lastResponse.status).toBe(429);
  expect((await lastResponse.json()).error).toMatch(/too many requests/i);
});
