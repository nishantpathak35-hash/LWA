import { expect, it } from 'vitest';
import { loadInvoiceDocument } from '../../app/lib/invoicePreview';

it('loads the selected attachment with authentication and recognizes legacy image MIME', async () => {
  fetch.mockResolvedValueOnce(new Response(new Blob(['image'], { type: 'application/octet-stream' })));
  const blob = await loadInvoiceDocument({ id: 42, file_name: 'scan.PNG', file_type: 'application/octet-stream' }, 'session-token');
  expect(fetch.mock.calls.at(-1)[0]).toBe('/api/attachments/42?disposition=inline');
  expect(fetch.mock.calls.at(-1)[1].headers['x-lwa-token']).toBe('session-token');
  expect(blob.type).toBe('image/png');
});

it('reports missing files instead of embedding the error response', async () => {
  fetch.mockResolvedValueOnce(new Response('Attachment Not Found', { status: 404 }));
  await expect(loadInvoiceDocument({ id: 43, file_name: 'bill.pdf' }, 'token')).rejects.toThrow(/not found/i);
});

it('keeps PDFs as PDFs and rejects empty files', async () => {
  fetch.mockResolvedValueOnce(new Response(new Blob(['pdf'], { type: 'application/pdf' })));
  expect((await loadInvoiceDocument({ id: 44 }, 'token')).type).toBe('application/pdf');
  fetch.mockResolvedValueOnce(new Response(new Blob([])));
  await expect(loadInvoiceDocument({ id: 45 }, 'token')).rejects.toThrow(/empty/i);
});
