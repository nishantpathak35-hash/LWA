const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/Admin/Desktop/Construct-O-Genie';
const marketingDir = path.join(targetDir, 'components/marketing');
const appDir = path.join(targetDir, 'app');

console.log('Writing all redesigned Construct-O-Genie components...');

// ==========================================
// 1. marketingData.js
// ==========================================
const marketingDataCode = `// Central Domain Data & Formatting Helpers for Construct-O-Genie OS
// Currency and Metric Formatting Standards (INR - Lakhs & Crores)

export const formatINR = (val, compact = false) => {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  
  if (compact) {
    if (Math.abs(num) >= 10000000) {
      return '₹' + (num / 10000000).toFixed(2) + ' Cr';
    }
    if (Math.abs(num) >= 100000) {
      return '₹' + (num / 100000).toFixed(2) + 'L';
    }
    if (Math.abs(num) >= 1000) {
      return '₹' + (num / 1000).toFixed(1) + 'k';
    }
  }
  
  return '₹' + num.toLocaleString('en-IN');
};

export const DEMO_PROJECT = {
  id: 'COG-PRJ-26041',
  code: 'HORIZON-04',
  name: 'Commercial Office — Gurugram',
  client: 'Horizon Technologies Ltd.',
  siteAddress: 'Tower B, Level 14-16, DLF Cyber City, Phase 2, Gurugram, Haryana',
  type: 'Commercial Fit-Out & Turnkey Interiors',
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
  status: 'In Execution',
  gfcVersion: 'REV-04.2'
};

export const PORTFOLIO_PROJECTS = [
  {
    id: 'COG-26041',
    name: 'Commercial Office — Gurugram',
    client: 'Modelled Corporate Client Alpha',
    location: 'Cyber City, Gurugram',
    area: '42,500 sq.ft',
    value: 48250000,
    committedCost: 39400000,
    progress: 67,
    margin: 18.4,
    health: 'healthy',
    status: 'In Execution',
    pendingApprovals: 2,
    stage: 'Procurement & Site'
  },
  {
    id: 'COG-26042',
    name: 'Fintech HQ — Mumbai',
    client: 'Modelled Financial Enterprise',
    location: 'BKC, Mumbai',
    area: '78,000 sq.ft',
    value: 125000000,
    committedCost: 98500000,
    progress: 84,
    margin: 21.2,
    health: 'healthy',
    status: 'Finishing & Joinery',
    pendingApprovals: 1,
    stage: 'Client RA Billing'
  },
  {
    id: 'COG-26043',
    name: 'R&D Center — Bengaluru',
    client: 'Modelled Technology Enterprise',
    location: 'Whitefield, Bengaluru',
    area: '56,000 sq.ft',
    value: 89000000,
    committedCost: 74000000,
    progress: 42,
    margin: 16.8,
    health: 'warning',
    status: 'MEP & Partitions',
    pendingApprovals: 4,
    stage: 'Tier-2 PO Approvals'
  },
  {
    id: 'COG-26044',
    name: 'Corporate Penthouse — Mumbai',
    client: 'Modelled Luxury Asset',
    location: 'Worli, Mumbai',
    area: '18,500 sq.ft',
    value: 62000000,
    committedCost: 46800000,
    progress: 91,
    margin: 24.5,
    health: 'healthy',
    status: 'Snagging & Handover',
    pendingApprovals: 0,
    stage: 'Final Retention Release'
  }
];

export const BOQ_SAMPLE_ITEMS = [
  {
    id: 'BOQ-01',
    code: '04.01.A',
    package: 'Joinery & Millwork',
    desc: 'Bespoke Acoustic Wall Paneling in Natural Fluted White Oak Veneer on 18mm FR Grade HDHMR substrate',
    unit: 'SQ.M',
    tenderQty: 480,
    clientRate: 7200,
    budgetCostRate: 5450,
    totalBudget: 2616000,
    poCommitted: 1980000,
    poBalance: 636000,
    marginPct: 24.3,
    drawingRef: 'DWG-ARCH-JN-04.2',
    gfcRevision: 'REV-04',
    status: 'PO Active (Budget Locked)'
  },
  {
    id: 'BOQ-02',
    code: '07.02.C',
    package: 'Electrical & Lighting',
    desc: 'DALI Dimming Architectural Linear Suspended Profile 3000K CRI 95+ with integrated Dali drivers',
    unit: 'R.MTR',
    tenderQty: 620,
    clientRate: 4800,
    budgetCostRate: 3450,
    totalBudget: 2139000,
    poCommitted: 1725000,
    poBalance: 414000,
    marginPct: 28.1,
    drawingRef: 'DWG-MEP-EL-07.1',
    gfcRevision: 'REV-03',
    status: 'PO Active (Budget Locked)'
  },
  {
    id: 'BOQ-03',
    code: '03.04.B',
    package: 'Glazing & Partitions',
    desc: '12mm Toughened Clear Glass Acoustic Partition with Slimline Matte Black Anodized Aluminium Trims',
    unit: 'SQ.M',
    tenderQty: 340,
    clientRate: 5900,
    budgetCostRate: 4100,
    totalBudget: 1394000,
    poCommitted: 1394000,
    poBalance: 0,
    marginPct: 30.5,
    drawingRef: 'DWG-ARCH-GL-03.4',
    gfcRevision: 'REV-02',
    status: '100% Indented (Cost Ceiling Capped)'
  },
  {
    id: 'BOQ-04',
    code: '09.01.F',
    package: 'Flooring & Carpeting',
    desc: 'Modular High-Traffic Tufted Carpet Tiles with Moisture-Barrier Backing and adhesive primer',
    unit: 'SQ.M',
    tenderQty: 1850,
    clientRate: 3200,
    budgetCostRate: 2350,
    totalBudget: 4347500,
    poCommitted: 3525000,
    poBalance: 822500,
    marginPct: 26.5,
    drawingRef: 'DWG-ARCH-FL-09.1',
    gfcRevision: 'REV-05',
    status: 'PO Active (Budget Locked)'
  }
];

export const WORKFLOW_STAGES = [
  {
    id: 'won',
    step: '01',
    title: 'Quotation Won',
    role: 'Commercial Lead',
    action: 'Client contract signed and baseline tender BOQ locked into system repository.',
    impactRole: 'Baseline Margin',
    impactVal: 'Target set at 22.8%'
  },
  {
    id: 'budget',
    step: '02',
    title: 'Budget Locked',
    role: 'Quantity Surveyor',
    action: 'Itemized rate analysis mapped with internal cost ceilings per trade package.',
    impactRole: 'Cost Ceiling',
    impactVal: '₹3.94 Cr maximum expense cap'
  },
  {
    id: 'po_request',
    step: '03',
    title: 'PO Requested',
    role: 'Project Manager',
    action: 'Material requisition raised against verified GFC drawing revision and BOQ item code.',
    impactRole: 'Item Validation',
    impactVal: '480 m² Oak Veneer Paneling'
  },
  {
    id: 'approval',
    step: '04',
    title: 'Tiered Approval',
    role: 'Founder / Director',
    action: 'Maker-Checker approval with automated budget headroom and margin impact check.',
    impactRole: 'Commitment Added',
    impactVal: '₹19.80L PO committed (24.3% margin)'
  },
  {
    id: 'dispatch',
    step: '05',
    title: 'Vendor Dispatch',
    role: 'Procurement Lead',
    action: 'PO issued to approved vendor with digital delivery note (GRN) tracking barcode.',
    impactRole: 'Delivery Window',
    impactVal: 'On-site ETA within 6 days'
  },
  {
    id: 'execution',
    step: '06',
    title: 'Site Execution & DPR',
    role: 'Site Supervisor',
    action: 'Material inspected at site gate, daily labor headcount and photo progress logged.',
    impactRole: 'DPR Verified',
    impactVal: '67% physical milestone reached'
  },
  {
    id: 'jmr',
    step: '07',
    title: 'Joint Measurement (JMR)',
    role: 'QS & Client PMC',
    action: 'Tripartite measurement sheet verified on-site against architectural drawing grid.',
    impactRole: 'Measurement Sign-Off',
    impactVal: '320 m² work approved by Client PMC'
  },
  {
    id: 'ra_bill',
    step: '08',
    title: 'RA Bill Generated',
    role: 'Billing Head',
    action: 'Client Running Account bill compiled automatically from certified JMR line items.',
    impactRole: 'Invoice Raised',
    impactVal: 'RA-04: ₹64.50L (5% retention held)'
  },
  {
    id: 'tally_sync',
    step: '09',
    title: 'Tally & ERP Sync',
    role: 'Finance & Accounts',
    action: 'Two-way XML/API ledger sync: sales invoice, vendor liability & TDS u/s 194C booked.',
    impactRole: 'Ledger Updated',
    impactVal: 'Synchronized in Tally Prime'
  },
  {
    id: 'collection',
    step: '10',
    title: 'Cash Collection',
    role: 'Managing Director',
    action: 'Payment received via RTGS with UTR reconciliation and retention tracking record.',
    impactRole: 'Cash Realized',
    impactVal: '₹61.27L cleared into bank'
  }
];

export const ROLE_EXPERIENCES = [
  {
    id: 'founder',
    role: 'Founder / Managing Director',
    tagline: 'Multi-Project Margin Command & Cash Visibility',
    description: 'Real-time visibility into active project margins, committed purchase costs against tender budgets, high-value approvals, and projected cash runway.',
    highlights: [
      'Live company gross margin vs tender baseline across all active sites',
      'One-tap executive approvals for purchase orders exceeding ₹5 Lakhs',
      'Accurate milestone billing forecast and pending client receivables',
      'Automated early warnings on scope variations and site delay risks'
    ],
    sampleMetric: { label: 'Protected Portfolio Margin', value: '21.4%', sub: 'Across 4 active sites' }
  },
  {
    id: 'qs',
    role: 'Quantity Surveyor & Estimator',
    tagline: 'Living BOQ Spine & Drawing Revision Sync',
    description: 'Map client tender BOQs into itemized internal cost ceilings, track GFC drawing revision deltas, and lock purchase orders directly against approved line items.',
    highlights: [
      'Drawing revision takeoff comparison (REV-03 vs REV-04.2 deltas)',
      'Itemized rate analysis breakdown (Material, Labor, Plant & Machinery)',
      'Hard budget cost caps preventing purchase orders from exceeding ceilings',
      'Real-time variation register tracking cost impact vs approved client rates'
    ],
    sampleMetric: { label: 'BOQ Lines Budget-Locked', value: '100%', sub: 'Zero unmapped expenses' }
  },
  {
    id: 'pm',
    role: 'Project Manager',
    tagline: 'Turnkey Trade Packages & Procurement Engine',
    description: 'Manage multiple specialized trades simultaneously. Track physical milestone progress, coordinate vendor delivery schedules, and monitor material GRNs at site.',
    highlights: [
      'Trade package registers covering Joinery, MEP, Glazing, and Finishes',
      'Subcontractor work order creation and measurement verification',
      'Site Material Delivery Note (GRN) verification at entry gate',
      'Critical path milestone tracking with planned vs actual progress curves'
    ],
    sampleMetric: { label: 'Trade Packages Active', value: '14 Trades', sub: 'On-schedule delivery' }
  },
  {
    id: 'site',
    role: 'Site Supervisor / Field Engineer',
    tagline: 'Mobile Daily Progress Reports & Joint Measurements',
    description: 'Digital DPR entry on mobile devices, photo-tagged snag lists, daily labor headcounts, and tripartite Joint Measurement Record (JMR) sign-offs with PMC.',
    highlights: [
      'Fast mobile Daily Progress Reports (DPR) with offline caching',
      'Photo snagging tagged directly to architectural floor plans',
      'Subcontractor measurement logging at site with digital sign-off',
      'Material delivery verification against approved purchase order specs'
    ],
    sampleMetric: { label: 'Daily DPR Submission Rate', value: '99.2%', sub: 'Submitted daily before 8 PM' }
  },
  {
    id: 'finance',
    role: 'Head of Accounts & Billing',
    tagline: 'Automated RA Billing & Two-Way ERP Sync',
    description: 'Generate client Running Account (RA) bills directly from verified JMRs, manage contractor tax withholdings (TDS u/s 194C), track retention, and sync two-way with Tally Prime and SAP.',
    highlights: [
      'Automated RA billing with milestone advance recovery and retention',
      'Statutory compliance handling (GST, TDS u/s 194C, e-Way bills)',
      'Vendor payment advice generation with bank UTR reconciliation',
      'Direct two-way synchronization with Tally Prime, SAP, and Zoho Books'
    ],
    sampleMetric: { label: 'Billing Cycle Turnaround', value: '4 Days', sub: 'From JMR sign-off to RA bill' }
  }
];

export const INTEGRATIONS_LIST = [
  {
    name: 'Tally Prime',
    type: 'Direct XML & ODBC Connector',
    category: 'Accounting & Statutory',
    desc: 'Two-way synchronization for purchase vouchers, vendor ledgers, TDS u/s 194C deduction, and client sales bills.',
    badge: 'Native XML/ODBC'
  },
  {
    name: 'SAP ECC / S/4HANA',
    type: 'API & RFC Enterprise Connector',
    category: 'Enterprise ERP',
    desc: 'Consolidate multi-entity fit-out project financials, enterprise procurement approval chains, and master vendor data.',
    badge: 'Enterprise RFC/API'
  },
  {
    name: 'Zoho Books',
    type: 'REST API Cloud Sync',
    category: 'Cloud Accounting',
    desc: 'Real-time sync for client invoices, vendor payments, expense tracking, and GST e-invoicing compliance.',
    badge: 'REST API'
  },
  {
    name: 'Microsoft Excel & CSV',
    type: 'Bidirectional Multi-Sheet Engine',
    category: 'Data Import & Export',
    desc: 'Seamless import of complex tender BOQs with formulas and export of rate analysis and financial summaries.',
    badge: 'Instant Multi-Sheet'
  },
  {
    name: 'Custom ERP Connectors',
    type: 'Secure REST Webhooks',
    category: 'Custom Architecture',
    desc: 'Developer-friendly webhooks and REST endpoints to integrate with proprietary contractor ERPs and internal tools.',
    badge: 'Custom Webhooks'
  }
];

export const FAQS = [
  {
    q: 'How does Construct-O-Genie prevent site teams from exceeding the approved project budget?',
    a: 'Every tender BOQ item is mapped to an internal Budget Cost Ceiling (BCC). When a site engineer or project manager creates a Purchase Order or Subcontractor Work Order, the system checks available budget headroom in real time. If a PO exceeds the budget or baseline margin threshold, it is automatically blocked and escalated to the Founder or Commercial Director for multi-tier approval.'
  },
  {
    q: 'Does Construct-O-Genie sync bi-directionally with Tally Prime and SAP?',
    a: 'Yes. Construct-O-Genie offers verified two-way synchronization with Tally Prime via direct XML/ODBC connectors, as well as SAP ECC / S/4HANA via secure API and RFC protocols. Approved vendor purchase bills, TDS u/s 194C deductions, payment advices, and client sales invoices sync automatically without manual double data entry.'
  },
  {
    q: 'How does the Joint Measurement Record (JMR) to RA Billing workflow work?',
    a: 'Site supervisors and quantity surveyors record verified site measurements against the architectural drawing grid on mobile. Once the client PMC approves the digital JMR sign-off, the finance team can generate a client Running Account (RA) bill with a single click. The system automatically computes advance mobilization deductions, retention money, and GST.'
  },
  {
    q: 'Can site supervisors log Daily Progress Reports (DPRs) with poor network connectivity?',
    a: 'Yes. The mobile site interface features local offline caching. Field supervisors can log labor headcounts, progress percentages, material deliveries (GRNs), and photo-tagged snags on site. Data automatically synchronizes securely as soon as an internet connection is re-established.'
  },
  {
    q: 'How does Construct-O-Genie handle client scope changes and GFC drawing revisions?',
    a: 'When an architect issues a new Good For Construction (GFC) revision (e.g. REV-04 vs REV-03), Construct-O-Genie runs an automated delta takeoff. Any added quantities or new trade specifications are recorded into a formal Variation Register, ensuring unbilled extra work is flagged before material procurement begins.'
  },
  {
    q: 'How long does onboarding and data migration take for an active contracting firm?',
    a: 'Most turnkey fit-out and interior general contractors onboard within 7 to 14 days. Our engineering team assists with importing active tender BOQs from Excel, configuring vendor master lists, mapping cost codes to your Tally/SAP chart of accounts, and setting up role-based approval thresholds.'
  }
];
`;

fs.writeFileSync(path.join(marketingDir, 'marketingData.js'), marketingDataCode, 'utf8');
console.log('1. marketingData.js written');
