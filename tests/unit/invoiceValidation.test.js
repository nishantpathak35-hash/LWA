import { describe, it, expect } from 'vitest';
import { validateInvoiceFields, belongsToVendor } from '../../src/modules/invoices/services/invoiceValidation.js';

describe('invoice data validation', () => {
  const valid = { invoiceNumber: 'I1', invoiceDate: '2026-09-15', subtotal: 100, taxAmount: 18, invoiceTotal: 118 };
  it('accepts a reconciled invoice', () => expect(validateInvoiceFields(valid)).toEqual(valid));
  it.each([NaN, Infinity, -1, {}, null, 'NaN'])('rejects invalid totals: %s', value => expect(() => validateInvoiceFields({ ...valid, invoiceTotal: value })).toThrow());
  it('rejects impossible dates', () => expect(() => validateInvoiceFields({ ...valid, invoiceDate: '2026-02-30' })).toThrow());
  it('rejects totals that do not reconcile', () => expect(() => validateInvoiceFields({ ...valid, invoiceTotal: 119 })).toThrow());
  it('allows missing extraction fields for manual completion', () => expect(validateInvoiceFields({ invoiceNumber: '', invoiceDate: '', subtotal: 0, taxAmount: 0, invoiceTotal: 0 }, { partial: true }).invoiceNumber).toBe(''));
  it('does not treat two missing vendor IDs as ownership', () => expect(belongsToVendor({ vendor_code: 'OTHER' }, 'V1', undefined)).toBe(false));
});
