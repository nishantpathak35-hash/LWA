import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Credit Notes Unit & Security Tests', () => {
  let createCreditNote: any;
  let listCreditNotes: any;
  let deleteCreditNote: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const cnModule = await import('../../app/lib/api/credit-notes');
    createCreditNote = cnModule.createCreditNote;
    listCreditNotes = cnModule.listCreditNotes;
    deleteCreditNote = cnModule.deleteCreditNote;
  });

  it('requires authentication to create credit note', async () => {
    await expect(createCreditNote({}, null)).rejects.toThrow('AUTH: Not signed in');
  });

  it('validates required fields for credit note', async () => {
    const session = { email: 'admin@luxeworx.com' };
    await expect(createCreditNote({}, session)).rejects.toThrow('Credit Note Number is required');
    await expect(createCreditNote({ cnNumber: 'CN-1' }, session)).rejects.toThrow('Credit Note Date is required');
    await expect(createCreditNote({ cnNumber: 'CN-1', cnDate: '2026-03-24' }, session)).rejects.toThrow('Linked PO Number is required');
    await expect(createCreditNote({ cnNumber: 'CN-1', cnDate: '2026-03-24', poNo: 'PO-001' }, session)).rejects.toThrow('Valid Credit Note total amount');
  });

  it('requires authentication to list credit notes', async () => {
    await expect(listCreditNotes({}, null)).rejects.toThrow('AUTH: Not signed in');
  });

  it('requires authentication to delete credit note', async () => {
    await expect(deleteCreditNote('CN-123', null)).rejects.toThrow('AUTH: Not signed in');
  });
});
