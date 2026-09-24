import { expect, it } from 'vitest';
import { mergeOcrFields } from '../../app/lib/invoiceOcrFields.js';
it('keeps entered amounts when OCR finds nothing or only a vendor', () => {
  const form = { subtotal: '100', taxAmount: '18', invoiceTotal: '118' };
  expect(mergeOcrFields(form, { vendorName: 'Supplier', subtotal: 0, taxAmount: 0, invoiceTotal: 0 })).toEqual(form);
});
it('accepts a verified zero tax and ignores inconsistent amount sets', () => {
  expect(mergeOcrFields({}, { subtotal: 100, taxAmount: 0, invoiceTotal: 100 })).toMatchObject({ taxAmount: '0', invoiceTotal: '100' });
  expect(mergeOcrFields({ invoiceTotal: '118' }, { subtotal: 200, taxAmount: -82, invoiceTotal: 118 }).invoiceTotal).toBe('118');
});
