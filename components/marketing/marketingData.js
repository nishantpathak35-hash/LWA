export const DEMO_PROJECT = {
  id: "COG-PRJ-26041",
  code: "HORIZON-04",
  name: "Horizon Workspace & Innovation Lab",
  client: "Horizon Technologies Ltd.",
  siteAddress: "Tower B, Level 14-16, DLF Cyber City, Phase 2, Gurugram, Haryana",
  type: "Commercial Fit-Out & Turnkey Interiors",
  areaSqFt: 42500,
  contractValue: 48250000, // ₹4.825 Cr
  bcsBudget: 39400000,    // ₹3.94 Cr
  poIssued: 21420000,     // ₹2.142 Cr
  billedToClient: 30800000, // ₹3.08 Cr
  collectedFromClient: 26200000, // ₹2.62 Cr
  vendorPayables: 18800000, // ₹1.88 Cr
  vendorPaid: 15400000,   // ₹1.54 Cr
  tdsDeducted: 376000,    // ₹3.76L
  projectedMargin: 18.4,  // %
  siteProgress: 67,       // %
  daysRemaining: 42,
  status: "In Execution",
  gfcVersion: "REV-04.2"
};

export const PORTFOLIO_PROJECTS = [
  {
    id: "COG-26041",
    name: "Horizon Workspace HQ",
    client: "Horizon Technologies",
    location: "Gurugram",
    value: 48250000,
    progress: 67,
    margin: 18.4,
    health: "healthy",
    status: "Execution",
    pendingApprovals: 2,
    stage: "Procurement & Site"
  },
  {
    id: "COG-26042",
    name: "Starlight Fintech Hub",
    client: "Starlight Capital",
    location: "BKC, Mumbai",
    value: 125000000,
    progress: 84,
    margin: 21.2,
    health: "healthy",
    status: "Finishing",
    pendingApprovals: 1,
    stage: "Client Billing"
  },
  {
    id: "COG-26043",
    name: "Aura Biotech R&D Facility",
    client: "Aura Life Sciences",
    location: "Whitefield, Bengaluru",
    value: 89000000,
    progress: 42,
    margin: 16.8,
    health: "warning",
    status: "MEP & Partitions",
    pendingApprovals: 4,
    stage: "PO Approvals"
  },
  {
    id: "COG-26044",
    name: "The Oberoi Grand Penthouse",
    client: "Private Residence",
    location: "Worli, Mumbai",
    value: 62000000,
    progress: 91,
    margin: 24.5,
    health: "healthy",
    status: "Snagging",
    pendingApprovals: 0,
    stage: "Final Retention"
  }
];

export const BOQ_SAMPLE_ITEMS = [
  {
    id: "BOQ-01",
    code: "04.01.A",
    item: "Bespoke Acoustic Wall Panelling & Fluted Oak Veneer",
    category: "Joinery & Panelling",
    qty: 480,
    unit: "SQ.M",
    sellingRate: 7200,
    costRate: 5450,
    marginPct: 24.3,
    poNo: "PO-COG-0241",
    vendor: "WoodCraft Studios",
    grnStatus: "Received (420 SQ.M)",
    installedPct: 85,
    billedAmount: 2937600
  },
  {
    id: "BOQ-02",
    code: "02.04.C",
    item: "Slim Profile Double Glazed Acoustic Glass Partition (DORMA)",
    category: "Glazing & Aluminium",
    qty: 320,
    unit: "SQ.M",
    sellingRate: 11800,
    costRate: 9200,
    marginPct: 22.0,
    poNo: "PO-COG-0244",
    vendor: "Saint-Gobain / Alumex Systems",
    grnStatus: "Received (100%)",
    installedPct: 92,
    billedAmount: 3474400
  },
  {
    id: "BOQ-03",
    code: "06.02.B",
    item: "Knauf Micro-perforated Gypsum Acoustic Baffle Ceiling",
    category: "Ceilings & MEP",
    qty: 1250,
    unit: "SQ.M",
    sellingRate: 3400,
    costRate: 2680,
    marginPct: 21.1,
    poNo: "PO-COG-0248",
    vendor: "Knauf Ceiling India",
    grnStatus: "Received (1250 SQ.M)",
    installedPct: 70,
    billedAmount: 2975000
  },
  {
    id: "BOQ-04",
    code: "08.01.D",
    item: "Modular System Workstations with Cable Backbone (Steelcase)",
    category: "Loose Furniture",
    qty: 240,
    unit: "NOS",
    sellingRate: 28500,
    costRate: 23200,
    marginPct: 18.6,
    poNo: "PO-COG-0252",
    vendor: "Workscape Solutions",
    grnStatus: "In Transit",
    installedPct: 15,
    billedAmount: 0
  },
  {
    id: "BOQ-05",
    code: "03.05.A",
    item: "Italian Statuario Marble Flooring with Brass Inlay Detailing",
    category: "Flooring & Finishes",
    qty: 620,
    unit: "SQ.M",
    sellingRate: 9400,
    costRate: 7100,
    marginPct: 24.5,
    poNo: "PO-COG-0239",
    vendor: "Classic Marble Co.",
    grnStatus: "Received (100%)",
    installedPct: 100,
    billedAmount: 5828000
  }
];

export const LIFECYCLE_STAGES = [
  {
    id: "01",
    name: "LEAD & CRM",
    tagline: "Commercial Opportunity",
    description: "Prospect captures scope, estimated footprint, target handover date and preliminary budget probability.",
    metric: "₹4.82 Cr Value",
    statusText: "85% Conversion Probability",
    technicalRef: "CRM / OPP-26041"
  },
  {
    id: "02",
    name: "SITE RECCE",
    tagline: "Site Condition & Scan",
    description: "Mobile site survey records 340 geotagged photographs, 3D laser dimensions, beam clearances and MEP risers.",
    metric: "42,500 SQ.FT",
    statusText: "Laser Survey Calibrated",
    technicalRef: "SURVEY / REC-01"
  },
  {
    id: "03",
    name: "DESIGN & GFC",
    tagline: "Drawing Vault & Revisions",
    description: "Central GFC vault maintains architectural, structural and MEP revisions with instant site distribution.",
    metric: "Rev 04.2 GFC",
    statusText: "All Disciplines Approved",
    technicalRef: "VAULT / ARCH-DWG"
  },
  {
    id: "04",
    name: "QUANTITY TAKEOFF",
    tagline: "Vector PDF Measurement",
    description: "Direct drawing takeoff measures areas, perimeters and item counts, pushing calibrated quantities to the BOQ.",
    metric: "148 Quantities",
    statusText: "100% Calibrated to Scale",
    technicalRef: "QTO / DWG-CALIB"
  },
  {
    id: "05",
    name: "BOQ & ESTIMATION",
    tagline: "Live Commercial Spine",
    description: "Itemized selling price, cost rate, material specification, labour budget and target gross margin.",
    metric: "₹3.94 Cr Cost Budget",
    statusText: "Target Margin 18.4%",
    technicalRef: "BOQ / FINAL-VER"
  },
  {
    id: "06",
    name: "PROCUREMENT",
    tagline: "BOQ-Linked Purchase Orders",
    description: "Automatic PO creation linked to BOQ line items with budget validation and maker/checker approvals.",
    metric: "14 POs Issued",
    statusText: "₹2.14 Cr Committed",
    technicalRef: "PROC / PO-SERIES"
  },
  {
    id: "07",
    name: "SITE EXECUTION",
    tagline: "DPR, JMR & Material GRN",
    description: "Site engineers log daily progress, joint measurement sheets, material receipts and site imprest expenses.",
    metric: "67% Physical Progress",
    statusText: "Daily DPR Submitted",
    technicalRef: "SITE / DPR-DAILY"
  },
  {
    id: "08",
    name: "CLIENT BILLING",
    tagline: "Milestones & GST Invoices",
    description: "Automated progress billing based on certified JMR measurements with milestone GST invoicing.",
    metric: "₹3.08 Cr Billed",
    statusText: "Invoice #INV-03 Certified",
    technicalRef: "FIN / GST-INV"
  },
  {
    id: "09",
    name: "COLLECTIONS & TDS",
    tagline: "Cash Inflow & Retention",
    description: "Real-time receivables tracking, client TDS certificate reconciliation and retention money schedules.",
    metric: "₹2.62 Cr Collected",
    statusText: "₹46.0L Outstanding",
    technicalRef: "RECV / LEDGER"
  },
  {
    id: "10",
    name: "PROJECT P&L",
    tagline: "Executive Financial Visibility",
    description: "Live real-time project profitability, cashflow variances, committed cost burn and net margin control.",
    metric: "₹88.7L Net Profit",
    statusText: "18.4% Realized Margin",
    technicalRef: "EXEC / PL-SUMMARY"
  }
];

export const INDIA_OPS_CHIPS = [
  { code: "BOQ", label: "Bill of Quantities", desc: "Item-level cost, selling rate, material & labour rates" },
  { code: "PO", label: "Purchase Orders", desc: "Maker/checker approval thresholds with custom series" },
  { code: "GRN", label: "Goods Receipt Note", desc: "Site gate entry & physical delivery verification" },
  { code: "RA Bills", label: "Running Account Bills", desc: "Subcontractor progressive measurement certification" },
  { code: "JMR", label: "Joint Measurement Records", desc: "Tripartite signed site measurements for billing" },
  { code: "DPR", label: "Daily Progress Reporting", desc: "Workforce count, progress logs & site photographs" },
  { code: "TDS 194C / 194J", label: "Tax Deducted at Source", desc: "Automated 1%, 2% & 10% TDS deduction & challan mapping" },
  { code: "GST Invoicing", label: "Compliant Tax Invoices", desc: "CGST, SGST & IGST breakdown with HSN/SAC codes" },
  { code: "Retention", label: "Retention Money Vault", desc: "5-10% retention withholding until DLP handover" },
  { code: "Site Imprest", label: "Petty Cash Management", desc: "Digital voucher upload & live balance reconciliation" },
  { code: "GSTR-2B", label: "ITC Reconciliation", desc: "Vendor invoice matching against GST portal filings" },
  { code: "Tally Bridge", label: "Tally XML & Prime Sync", desc: "Direct XML voucher export for master accounting" }
];
