const amount = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function buildFinancialPreview(summary, { gross, tds }) {
  if (!summary) return null;
  const currentPaymentAmount = amount(gross);
  const tdsHoldAmount = amount(tds);
  const projectedOutflow = amount(summary.currentOutflow ?? summary.projectOutflow) + currentPaymentAmount;
  const inflow = amount(summary.inflow);
  return { ...summary, currentPaymentAmount, tdsHoldAmount,
    netPayableAfterTds: Math.max(0, currentPaymentAmount - tdsHoldAmount),
    remainingPOBalance: amount(summary.totalPOValue) - amount(summary.currentPOOutflow) - currentPaymentAmount,
    projectedOutflow,
    projectedUtilisation: inflow > 0 ? projectedOutflow / inflow * 100 : null,
    remainingBalance: inflow - projectedOutflow,
  };
}
