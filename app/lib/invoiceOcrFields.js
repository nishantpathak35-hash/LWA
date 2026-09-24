export function mergeOcrFields(form, data = {}) {
  const next = { ...form };
  if (data.invoiceNumber) next.invoiceNumber = String(data.invoiceNumber);
  if (/^\d{4}-\d{2}-\d{2}$/.test(data.invoiceDate || '')) next.invoiceDate = data.invoiceDate;
  const total = Number(data.invoiceTotal), sub = Number(data.subtotal), tax = Number(data.taxAmount);
  if ([total, sub, tax].every(Number.isFinite) && total > 0 && sub >= 0 && tax >= 0 && Math.abs(sub + tax - total) <= 0.05) {
    next.subtotal = String(sub); next.taxAmount = String(tax); next.invoiceTotal = String(total);
  }
  return next;
}
