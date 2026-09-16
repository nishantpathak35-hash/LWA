import { describe, expect, it } from 'vitest';
import { buildFinancialPreview } from '../../app/lib/financialPreview.js';

describe('approval financial preview', () => {
  const summary = { currentPaymentAmount: 200, totalPOValue: 1000, currentPOOutflow: 400, remainingPOBalance: 400, inflow: 2000, currentOutflow: 900, projectedOutflow: 1100, tdsHoldAmount: 20, netPayableAfterTds: 180 };
  it('updates projected balances with edited gross and TDS without changing source', () => {
    const preview = buildFinancialPreview(summary, { gross: 300, tds: 30 });
    expect(preview.netPayableAfterTds).toBe(270);
    expect(preview.remainingPOBalance).toBe(300);
    expect(preview.projectedOutflow).toBe(1200);
    expect(preview.remainingBalance).toBe(800);
    expect(summary.currentPaymentAmount).toBe(200);
  });
  it('preserves zero net payable for full TDS deductions', () => {
    expect(buildFinancialPreview(summary, { gross: 200, tds: 200 }).netPayableAfterTds).toBe(0);
  });
  it('does not present missing inflow as healthy utilisation', () => {
    expect(buildFinancialPreview({ ...summary, inflow: 0 }, { gross: 200, tds: 0 }).projectedUtilisation).toBe(null);
  });
});
