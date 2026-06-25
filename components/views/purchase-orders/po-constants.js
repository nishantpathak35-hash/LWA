export const GST_RATES = [0, 5, 12, 18, 28];

export const TDS_SECTIONS = [
  { code: '', label: 'None (No TDS)', rate: 0 },
  { code: '194C', label: '194C – Contractors (1%/2%)', rate: 2 },
  { code: '194J', label: '194J – Professional Services (10%)', rate: 10 },
  { code: '194I', label: '194I – Rent (10%)', rate: 10 },
  { code: '194H', label: '194H – Commission (5%)', rate: 5 },
  { code: '194A', label: '194A – Interest (10%)', rate: 10 },
  { code: '194B', label: '194B – Lottery / Winnings (30%)', rate: 30 },
  { code: '194Q', label: '194Q – Purchase of Goods (0.1%)', rate: 0.1 },
];

export const PAYMENT_MODES = [
  'Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'DD', 'Cash', 'Other'
];

export const UOM_OPTIONS = [
  { value: 'sqft', label: 'Sq Ft' },
  { value: 'sqm', label: 'Sq M' },
  { value: 'Nos', label: 'Nos' },
  { value: 'Pieces', label: 'Pieces' },
  { value: 'Kg', label: 'Kg' },
  { value: 'Ton', label: 'Ton' },
  { value: 'Meter', label: 'Meter' },
  { value: 'Running Meter', label: 'Running Meter' },
  { value: 'Box', label: 'Box' },
  { value: 'Lot', label: 'Lot' }
];
