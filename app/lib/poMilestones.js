/**
 * Utility functions for Purchase Order payment milestones.
 */

export function parsePOMilestones(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function validateMilestonesTotal(milestones = []) {
  if (!milestones || milestones.length === 0) return { valid: true, totalPct: 0 };
  const totalPct = milestones.reduce((sum, m) => sum + Number(m.percentage || 0), 0);
  // Allow small floating point tolerance
  const valid = Math.abs(totalPct - 100) < 0.1;
  return { valid, totalPct };
}

export function calculateMilestoneAmount(poValue, percentage) {
  const val = Number(poValue || 0);
  const pct = Number(percentage || 0);
  if (val <= 0 || pct <= 0) return 0;
  return Math.round((val * pct) / 100);
}

export function getDefaultMilestoneTemplates() {
  return [
    { name: 'Standard 3-Stage (30-50-20)', milestones: [
      { name: 'Advance Payment', percentage: 30 },
      { name: 'Material Delivery to Site', percentage: 50 },
      { name: 'Completion & Final Handover', percentage: 20 }
    ]},
    { name: '4-Stage (20-40-30-10)', milestones: [
      { name: 'Advance Booking', percentage: 20 },
      { name: 'Supply & Dispatch', percentage: 40 },
      { name: 'Installation & Testing', percentage: 30 },
      { name: 'Retention Release', percentage: 10 }
    ]},
    { name: 'Single Lump Sum (100%)', milestones: [
      { name: '100% On Delivery', percentage: 100 }
    ]}
  ];
}
