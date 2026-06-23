export function normalizePOStatus(po = {}) {
  return String(po.approval_status || po.status || '').trim().toLowerCase();
}

export function isPOEligibleForPayment(po = {}) {
  const status = normalizePOStatus(po);
  return status !== 'draft' && status !== 'cancelled' && status !== 'canceled';
}

export function getPOPaymentIneligibilityReason(po = {}) {
  if (isPOEligibleForPayment(po)) return '';
  const status = po.approval_status || po.status || 'Draft';
  return `PO ${po.po_no || po.poNo || ''} is ${status}. Payment requests are allowed for every PO except Draft and Cancelled.`;
}
