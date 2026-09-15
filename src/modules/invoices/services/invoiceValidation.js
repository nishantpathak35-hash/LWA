export function validateInvoiceFields(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid invoice data');
  const { invoiceNumber, invoiceDate } = input;
  if (typeof invoiceNumber !== 'string' || invoiceNumber.length > 200 || (!partial && !invoiceNumber.trim())) throw new Error('Valid Invoice Number is required');
  if (typeof invoiceDate !== 'string' || (!partial || invoiceDate !== '') && (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) || !Number.isFinite(Date.parse(invoiceDate)) || new Date(invoiceDate).toISOString().slice(0, 10) !== invoiceDate)) throw new Error('Valid Invoice Date is required (YYYY-MM-DD)');
  const amounts = {};
  for (const key of ['subtotal', 'taxAmount', 'invoiceTotal']) {
    const value = input[key];
    if (value === undefined && key !== 'invoiceTotal' && !partial) continue;
    if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > Number.MAX_SAFE_INTEGER / 100) throw new Error(`${key} must be a finite nonnegative amount`);
    amounts[key] = Number(value);
  }
  if (!partial && amounts.invoiceTotal <= 0) throw new Error('Valid Invoice Total amount is required');
  if (amounts.subtotal !== undefined && amounts.taxAmount !== undefined && Math.abs(amounts.subtotal + amounts.taxAmount - amounts.invoiceTotal) > 0.011) throw new Error('Subtotal and tax must equal Invoice Total');
  return { invoiceNumber: invoiceNumber.trim(), invoiceDate, ...amounts };
}

export function belongsToVendor(po, vendorCode, vendorId) {
  const code = String(po.vendor_code || po.vendor_key || '').trim().toLowerCase();
  const expected = String(vendorCode || '').trim().toLowerCase();
  return Boolean(code && expected && code === expected) || Boolean(po.vendor_id && vendorId && Number(po.vendor_id) === Number(vendorId));
}
