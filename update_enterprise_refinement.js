const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/Admin/Desktop/Construct-O-Genie';
const marketingDir = path.join(targetDir, 'components/marketing');
const appDir = path.join(targetDir, 'app');

// Ensure directories exist
[
  marketingDir,
  path.join(appDir, 'privacy'),
  path.join(appDir, 'terms'),
  path.join(appDir, 'security'),
  path.join(appDir, 'contact')
].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log('Writing enterprise-grade second-pass refinement to Construct-O-Genie...');

// ==========================================
// 1. components/marketing/marketingData.js
// ==========================================
const marketingDataCode = `// Central Domain Data & Financial Formatting Helpers for Construct-O-Genie OS
// Defensible, unified figures across the entire website

export const formatINR = (val, compact = false) => {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  
  if (compact) {
    if (Math.abs(num) >= 10000000) {
      const cr = (num / 10000000).toFixed(2);
      return \`₹\${cr.endsWith('.00') ? cr.slice(0, -3) : cr} Cr\`;
    }
    if (Math.abs(num) >= 100000) {
      const l = (num / 100000).toFixed(2);
      return \`₹\${l.endsWith('.00') ? l.slice(0, -3) : l} L\`;
    }
    if (Math.abs(num) >= 1000) {
      return \`₹\${(num / 1000).toFixed(1)}k\`;
    }
  }
  
  return '₹' + num.toLocaleString('en-IN');
};

// Single canonical demo project referenced across Hero, Product Tour, Case Breakdown & ROI
export const DEMO_PROJECT = {
  id: 'COG-PRJ-26041',
  code: 'HORIZON-04',
  name: 'Commercial Corporate Fit-Out — DLF Cyber City',
  client: 'Horizon Enterprise Technologies',
  siteAddress: 'Tower B, Level 14–16, DLF Cyber City, Phase 2, Gurugram, Haryana',
  type: 'Turnkey Commercial Interior Fit-Out',
  areaSqFt: 42500,
  contractValue: 48250000,     // ₹4.83 Cr (₹4,82,50,000)
  bcsBudget: 39400000,         // ₹3.94 Cr baseline target cost (₹3,94,00,000)
  committedCost: 39400000,     // ₹3.94 Cr total committed POs & subcontracts
  projectedMargin: 18.34,      // 18.34% ((4.825 - 3.94) / 4.825 * 100)
  projectedGrossProfit: 8850000, // ₹88.50 L
  poIssuedCount: 48,
  billedToClient: 30800000,    // ₹3.08 Cr certified RA billings
  collectedFromClient: 26200000, // ₹2.62 Cr client cash collected
  vendorPayables: 18800000,    // ₹1.88 Cr vendor liabilities
  vendorPaid: 15400000,        // ₹1.54 Cr disbursed via bank UTR
  retentionHeld: 2412500,      // ₹24.12 L (5% client retention)
  tdsDeducted: 376000,         // ₹3.76 L (TDS u/s 194C)
  siteProgress: 67,            // 67% certified physical completion
  daysRemaining: 42,
  status: 'In Execution',
  gfcVersion: 'REV-04.2'
};

export const PORTFOLIO_PROJECTS = [
  {
    id: 'COG-26041',
    name: 'Commercial Corporate Fit-Out — DLF Cyber City',
    client: 'Horizon Enterprise Technologies',
    location: 'Cyber City, Gurugram',
    area: '42,500 sq.ft',
    value: 48250000,
    committedCost: 39400000,
    progress: 67,
    margin: 18.3,
    health: 'healthy',
    status: 'In Execution',
    pendingApprovals: 2,
    stage: 'Procurement & Site'
  },
  {
    id: 'COG-26042',
    name: 'Fintech Executive HQ — BKC',
    client: 'Axis Financial Services',
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
    name: 'Global Tech R&D Facility — Outer Ring Road',
    client: 'Apex Software Labs',
    location: 'Outer Ring Road, Bengaluru',
    area: '110,000 sq.ft',
    value: 198000000,
    committedCost: 159000000,
    progress: 38,
    margin: 19.7,
    health: 'review',
    status: 'HVAC & MEP First-Fix',
    pendingApprovals: 4,
    stage: 'Subcontractor Indents'
  }
];

export const BOQ_SAMPLE_ITEMS = [
  {
    code: 'BOQ-JOIN-014',
    trade: 'Joinery & Woodwork',
    description: 'Bespoke Executive Boardroom Table (24-Seater) in natural smoked oak veneer with integrated pop-up motorized AV cable cubby and acoustic backing paneling.',
    unit: 'RMT',
    tenderQty: 28.5,
    tenderRate: 48500,
    clientTotal: 1382250,
    bccRate: 38000,
    budgetCeiling: 1083000,
    committedRate: 37200,
    committedTotal: 1060200,
    actualExecutedQty: 18.0,
    certifiedJMRQty: 18.0,
    varianceQty: 0.0,
    marginAmount: 322050,
    marginPercent: 23.3,
    status: 'Locked & In Budget'
  },
  {
    code: 'BOQ-GLAZ-008',
    trade: 'Acoustic Glazing',
    description: 'Double-glazed acoustic glass partitions (Rw 48dB) with slimline matte black anodized aluminum profile, acoustic drop seals, and 12mm toughened laminate glass.',
    unit: 'SQFT',
    tenderQty: 3450,
    tenderRate: 980,
    clientTotal: 3381000,
    bccRate: 790,
    budgetCeiling: 2725500,
    committedRate: 765,
    committedTotal: 2639250,
    actualExecutedQty: 2400,
    certifiedJMRQty: 2350,
    varianceQty: 50,
    marginAmount: 741750,
    marginPercent: 21.9,
    status: 'Locked & In Budget'
  },
  {
    code: 'BOQ-MEP-022',
    trade: 'HVAC & Ducting',
    description: 'Factory-fabricated GI rectangular ductwork (class 24G) complete with closed-cell nitrile rubber thermal insulation, volume control dampers, and linear diffusers.',
    unit: 'SQM',
    tenderQty: 1850,
    tenderRate: 1650,
    clientTotal: 3052500,
    bccRate: 1320,
    budgetCeiling: 2442000,
    committedRate: 1290,
    committedTotal: 2386500,
    actualExecutedQty: 1620,
    certifiedJMRQty: 1620,
    varianceQty: 0.0,
    marginAmount: 666000,
    marginPercent: 21.8,
    status: 'Locked & In Budget'
  },
  {
    code: 'BOQ-ELEC-031',
    trade: 'Electrical & Lighting',
    description: 'Recessed trimless architectural linear LED lighting profile (4000K, CRI 90+) including digital DALI dimming drivers, suspension kits, and feed cabling.',
    unit: 'RMT',
    tenderQty: 620,
    tenderRate: 3400,
    clientTotal: 2108000,
    bccRate: 2750,
    budgetCeiling: 1705000,
    committedRate: 2680,
    committedTotal: 1661600,
    actualExecutedQty: 410,
    certifiedJMRQty: 400,
    varianceQty: 10,
    marginAmount: 446400,
    marginPercent: 21.2,
    status: 'Locked & In Budget'
  }
];

export const WORKFLOW_STAGES = [
  {
    id: 'boq',
    step: '01',
    group: 'Commercial',
    title: 'Living BOQ & Cost Baseline',
    role: 'Commercial Team & QS',
    action: 'Tender BOQ lines are locked with itemized internal budget cost ceilings (BCC) before site mobilization.',
    impactRole: 'Budget Control',
    impactVal: 'Line item cost caps active'
  },
  {
    id: 'drawings',
    step: '02',
    group: 'Commercial',
    title: 'GFC Drawing Revisions',
    role: 'Design Coordinator & QS',
    action: 'Architectural drawing revisions (REV-03 vs REV-04) trigger automated quantity delta takeoffs.',
    impactRole: 'Variation Register',
    impactVal: 'Unbilled extra scope caught early'
  },
  {
    id: 'indent',
    step: '03',
    group: 'Procurement',
    title: 'Material Site Indents',
    role: 'Site Engineer',
    action: 'Site supervisors generate digital material indents mapped strictly to approved BOQ item codes.',
    impactRole: 'Requisition Gate',
    impactVal: 'Zero off-BOQ site ordering'
  },
  {
    id: 'po',
    step: '04',
    group: 'Procurement',
    title: 'PO Generation & Caps',
    role: 'Purchase Manager',
    action: 'System validates quantity and rate against remaining line budget headroom before generating PO.',
    impactRole: 'Cost Protection',
    impactVal: 'Hard ceiling stops overspend'
  },
  {
    id: 'approval',
    step: '05',
    group: 'Procurement',
    title: 'Maker-Checker Approvals',
    role: 'Managing Director / Commercial Lead',
    action: 'High-value POs and rate deviations route through one-click mobile executive approval tiers.',
    impactRole: 'Delegation of Authority',
    impactVal: 'Multi-tier financial governance'
  },
  {
    id: 'grn',
    step: '06',
    group: 'Execution',
    title: 'Gate Entry & GRN Inspection',
    role: 'Storekeeper / Site Supervisor',
    action: 'Material deliveries checked against PO specs with photo-tagged delivery challans at the site gate.',
    impactRole: 'Material Receiving',
    impactVal: 'Defective batches rejected at gate'
  },
  {
    id: 'dpr',
    step: '07',
    group: 'Execution',
    title: 'Mobile DPR & Snagging',
    role: 'Site Engineer',
    action: 'Daily progress percentages, subcontractor headcount, and snag items logged on mobile with offline sync.',
    impactRole: 'Daily Site Log',
    impactVal: 'Submitted daily before 8 PM'
  },
  {
    id: 'jmr',
    step: '08',
    group: 'Billing',
    title: 'Tripartite JMR Certification',
    role: 'QS & Client PMC',
    action: 'Joint Measurement Records verified on drawing grids with digital sign-offs from client, PMC, and contractor.',
    impactRole: 'Measurement Sign-Off',
    impactVal: 'Eliminates billing disputes'
  },
  {
    id: 'ra_bill',
    step: '09',
    group: 'Billing',
    title: 'Automated Client RA Bill',
    role: 'Billing Lead & Accounts',
    action: 'One-click Running Account bill generated directly from certified JMR with advance recovery & retention.',
    impactRole: 'Billing Turnaround',
    impactVal: 'Reduced to ~4 days'
  },
  {
    id: 'accounting',
    step: '10',
    group: 'Finance',
    title: 'Two-Way ERP Sync & Collection',
    role: 'Finance Director',
    action: 'Sales bills and approved vendor liabilities sync directly with Tally Prime / SAP with TDS and retention ledger.',
    impactRole: 'Cash Realized',
    impactVal: 'Real-time ledger reconciliation'
  }
];

export const WORKFLOW_GROUPS = [
  {
    id: 'commercial',
    title: '1. Commercial & Baseline',
    desc: 'Quotation, living BOQ, internal budget cost ceilings, and GFC drawing revision deltas.',
    stages: ['01', '02'],
    roles: ['Commercial Director', 'Lead Estimator / QS']
  },
  {
    id: 'procurement',
    title: '2. Procurement & Approval',
    desc: 'Material indents, budget headroom validation, vendor PO creation, and maker-checker approval tiers.',
    stages: ['03', '04', '05'],
    roles: ['Purchase Manager', 'Managing Director']
  },
  {
    id: 'execution',
    title: '3. Site Execution & Quality',
    desc: 'Site gate GRN receipt, mobile daily progress reports (DPR), labor tracking, and photo snagging.',
    stages: ['06', '07'],
    roles: ['Site Engineer', 'Project Manager']
  },
  {
    id: 'billing',
    title: '4. Joint Measurement & RA Billing',
    desc: 'Tripartite digital JMR sign-offs with PMC, automated Running Account (RA) billing, and retention deductions.',
    stages: ['08', '09'],
    roles: ['Lead QS', 'Client PMC', 'Billing Lead']
  },
  {
    id: 'finance',
    title: '5. Finance & ERP Reconciliation',
    desc: 'Statutory TDS u/s 194C, bank UTR reconciliation, and two-way synchronization with Tally Prime and SAP.',
    stages: ['10'],
    roles: ['Head of Accounts', 'Chief Financial Officer']
  }
];

export const ROLE_EXPERIENCES = [
  {
    id: 'founder',
    role: 'Founder & Managing Director',
    tagline: 'Multi-Site Financial Control & Cash Visibility',
    description: 'Executive visibility across active projects. Monitor projected gross margins, committed liabilities against tender baselines, and pending high-value purchase approvals.',
    highlights: [
      'Portfolio gross margin vs tender baseline across all active projects',
      'One-tap executive approvals for purchase orders exceeding specified thresholds',
      'Milestone billing forecast and real-time client receivable ageing',
      'Early warning triggers on scope variations and site delay risks'
    ],
    sampleMetric: { label: 'Protected Portfolio Margin', value: '18.3%', sub: 'DLF Cyber City & active portfolio' }
  },
  {
    id: 'qs',
    role: 'Quantity Surveyor & Estimator',
    tagline: 'Living BOQ & Drawing Revision Delta Control',
    description: 'Map tender BOQs into itemized internal cost ceilings, track GFC drawing revision deltas, and validate purchase orders directly against approved line items.',
    highlights: [
      'Automated drawing revision takeoff comparisons (REV-03 vs REV-04 deltas)',
      'Itemized rate analysis breakdown (Material, Labor, Plant & Machinery)',
      'Budget cost ceilings preventing purchase orders from exceeding line caps',
      'Variation register tracking cost impact against approved client rates'
    ],
    sampleMetric: { label: 'BOQ Lines Budget-Mapped', value: '100%', sub: 'Full line-item cost visibility' }
  },
  {
    id: 'pm',
    role: 'Project Manager',
    tagline: 'Trade Package Coordination & Site Milestones',
    description: 'Coordinate multiple specialized trades simultaneously. Track physical milestone completion, manage vendor delivery schedules, and monitor gate GRN receipts.',
    highlights: [
      'Trade package registers covering Joinery, MEP, Glazing, and Finishes',
      'Subcontractor work order creation and measurement verification',
      'Site Material Delivery Note (GRN) inspection at the site gate',
      'Critical path milestone tracking with planned vs actual progress curves'
    ],
    sampleMetric: { label: 'Trade Packages Active', value: '14 Trades', sub: 'On-schedule execution' }
  },
  {
    id: 'site',
    role: 'Site Supervisor & Field Engineer',
    tagline: 'Mobile DPRs & Joint Measurement Records',
    description: 'Digital DPR entry on mobile with offline sync, photo-tagged snag lists, daily labor headcounts, and digital Joint Measurement Record (JMR) sign-offs with PMC.',
    highlights: [
      'Fast mobile Daily Progress Reports (DPR) with offline caching',
      'Photo snagging tagged directly to architectural floor plans',
      'Subcontractor measurement logging at site with digital sign-off',
      'Material delivery verification against approved purchase order specs'
    ],
    sampleMetric: { label: 'Daily DPR Submission', value: 'Daily 8 PM', sub: 'Site-to-office sync' }
  },
  {
    id: 'finance',
    role: 'Head of Accounts & Billing',
    tagline: 'Automated RA Billing & ERP Bridge',
    description: 'Generate client Running Account (RA) bills directly from verified JMRs, manage contractor tax withholdings (TDS u/s 194C), track retention, and sync with Tally Prime and SAP.',
    highlights: [
      'Automated RA billing with advance recovery and retention schedules',
      'Statutory compliance handling (GST, TDS u/s 194C, e-Way bills)',
      'Vendor payment advice generation with bank UTR reconciliation',
      'Integration options for Tally Prime, SAP ECC/S4, and Zoho Books'
    ],
    sampleMetric: { label: 'Billing Turnaround', value: '~4 Days', sub: 'From JMR sign-off to RA bill' }
  }
];

export const INTEGRATIONS_LIST = [
  {
    name: 'Tally Prime',
    type: 'Native XML / ODBC Connector',
    category: 'Accounting & Statutory',
    desc: 'Sync purchase vouchers, vendor ledgers, TDS u/s 194C deductions, and client sales bills directly into your Tally company books.',
    badge: 'Native XML/ODBC',
    status: 'Production Ready'
  },
  {
    name: 'SAP ECC / S/4HANA',
    type: 'Enterprise API & RFC Connector',
    category: 'Enterprise ERP',
    desc: 'Consolidate project procurement orders, material ledger entries, and vendor payment clearances into enterprise SAP modules.',
    badge: 'Enterprise RFC/API',
    status: 'Enterprise Custom'
  },
  {
    name: 'Zoho Books',
    type: 'REST Cloud API Sync',
    category: 'Cloud Accounting',
    desc: 'Automated sync for client sales invoices, vendor bills, expense tracking, and GST e-invoicing compliance.',
    badge: 'REST Cloud API',
    status: 'Production Ready'
  },
  {
    name: 'Microsoft Excel & CSV',
    type: 'Structured Multi-Sheet Engine',
    category: 'Data Import & Export',
    desc: 'Import complex multi-trade tender BOQs with rate formulas; export JMR measurement sheets and cost reconciliation reports.',
    badge: 'Instant Import/Export',
    status: 'Standard'
  },
  {
    name: 'Custom ERP & Webhooks',
    type: 'Secure REST Webhooks',
    category: 'Custom Architecture',
    desc: 'Configurable webhook endpoints and REST APIs to connect with internal data lakes and proprietary contractor ERPs.',
    badge: 'Custom Webhooks',
    status: 'Developer API'
  }
];

export const FAQS = [
  {
    q: 'How does Construct-O-Genie protect project gross margins against cost overruns?',
    a: 'Every tender BOQ item is mapped to an internal Budget Cost Ceiling (BCC). When a project engineer or purchase manager creates a Purchase Order or Subcontractor Work Order, the system checks remaining budget headroom in real time. If a PO exceeds the budget or margin threshold, it cannot be issued without tiered executive approval.'
  },
  {
    q: 'How does Construct-O-Genie connect with our existing Tally Prime or SAP setup?',
    a: 'Construct-O-Genie provides direct XML/ODBC integration for Tally Prime and REST API/RFC protocols for SAP. Approved vendor purchase bills, TDS deductions under section 194C, and client sales invoices sync directly into your chart of accounts, eliminating double data entry.'
  },
  {
    q: 'How does the Joint Measurement Record (JMR) to RA Billing workflow work?',
    a: 'Site engineers and quantity surveyors record verified site measurements against the architectural drawing grid on mobile. Once the client PMC approves the digital JMR sign-off, the billing team generates a client Running Account (RA) bill with one click. The system automatically computes advance mobilization deductions, retention money, and GST.'
  },
  {
    q: 'Can site teams submit Daily Progress Reports (DPRs) with poor mobile connectivity?',
    a: 'Yes. The mobile site interface features local offline caching. Field supervisors can log labor headcounts, progress percentages, material deliveries (GRNs), and photo-tagged snags on site. Data automatically synchronizes securely as soon as an internet connection is re-established.'
  },
  {
    q: 'How does Construct-O-Genie handle client scope changes and GFC drawing revisions?',
    a: 'When an architect issues a new Good For Construction (GFC) revision (e.g. REV-04 vs REV-03), Construct-O-Genie runs an automated delta takeoff. Any added quantities or new trade specifications are recorded into a formal Variation Register, ensuring unbilled extra work is flagged before material procurement begins.'
  },
  {
    q: 'What is the typical onboarding and data migration timeline?',
    a: 'Most turnkey fit-out and interior general contractors onboard within 7 to 14 days. Our engineering team assists with importing active tender BOQs from Excel, configuring vendor master lists, mapping cost codes to your Tally/SAP chart of accounts, and setting up role-based approval thresholds.'
  }
];
`;

fs.writeFileSync(path.join(marketingDir, 'marketingData.js'), marketingDataCode, 'utf8');
console.log('1. marketingData.js written with clean UTF-8 encoding');

// ==========================================
// 2. components/marketing/ArchitecturalCanvas.js
// ==========================================
const canvasCode = `'use client';

import React, { useEffect } from 'react';

export const ARCHITECTURAL_STAGES = [
  {
    id: 1,
    title: 'STAGE 01 : FINISHED INTERIOR',
    subtitle: 'High-end commercial office, acoustic wood slat ceiling, linear LED lighting, terrazzo flooring',
    src: '/hero-interior.jpg',
  },
  {
    id: 2,
    title: 'STAGE 02 : FINISHES REMOVED',
    subtitle: 'Furniture stripped, ceiling suspension grid exposed, layout chalk lines on concrete floor',
    src: '/building-stage2.jpg',
  },
  {
    id: 3,
    title: 'STAGE 03 : MEP / FIRST-FIX',
    subtitle: 'HVAC galvanized ductwork, cable trays, red fire sprinklers, light gauge steel stud framing',
    src: '/building-mep.jpg',
  },
  {
    id: 4,
    title: 'STAGE 04 : BARE CONCRETE SHELL',
    subtitle: 'Bare monolithic concrete floor & ceiling slab, structural columns, perimeter glass curtain wall',
    src: '/building-stage3.jpg',
  },
];

export default function ArchitecturalCanvas({ scrollProgress = 0, manualStage = null }) {
  // Preload background images for smooth zero-lag transitions
  useEffect(() => {
    ARCHITECTURAL_STAGES.forEach((stage) => {
      const img = new Image();
      img.src = stage.src;
    });
  }, []);

  const totalStages = ARCHITECTURAL_STAGES.length;

  let activeIndex = 0;
  let blendFactor = 0;

  if (manualStage !== null && manualStage >= 0 && manualStage < totalStages) {
    activeIndex = manualStage === totalStages - 1 ? totalStages - 2 : manualStage;
    blendFactor = manualStage === totalStages - 1 ? 1 : 0;
  } else {
    const scaledProgress = scrollProgress * (totalStages - 1);
    activeIndex = Math.min(Math.floor(scaledProgress), totalStages - 2);
    blendFactor = Math.min(Math.max(scaledProgress - activeIndex, 0), 1);
  }

  return (
    <div
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0 overflow-hidden bg-[#030508]"
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
      aria-hidden="true"
    >
      {/* 4 Progressive Architectural Layers */}
      {ARCHITECTURAL_STAGES.map((stage, idx) => {
        let opacity = 0;
        if (idx === activeIndex) {
          opacity = 1 - blendFactor;
        } else if (idx === activeIndex + 1) {
          opacity = blendFactor;
        } else {
          opacity = 0;
        }

        return (
          <div
            key={stage.id}
            className="absolute inset-0 w-full h-full transition-opacity duration-700 ease-out"
            style={{
              opacity: opacity,
              zIndex: idx,
            }}
          >
            <img
              src={stage.src}
              alt={stage.title}
              loading="eager"
              className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.08] saturate-[1.02]"
              style={{
                transform: \`scale(\${1.01 + scrollProgress * 0.02})\`,
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        );
      })}

      {/* Subtle enterprise contrast gradients for high text legibility */}
      <div className="absolute inset-0 bg-[#030508]/70 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030508]/90 via-[#030508]/50 to-[#030508]/95 pointer-events-none z-10" />

      {/* Restrained Architectural CAD Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255, 255, 255, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'ArchitecturalCanvas.js'), canvasCode, 'utf8');
console.log('2. ArchitecturalCanvas.js written');

// ==========================================
// 3. components/marketing/Hero.js
// ==========================================
const heroCode = `'use client';

import React from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { ARCHITECTURAL_STAGES } from './ArchitecturalCanvas';
import { DEMO_PROJECT, formatINR } from './marketingData';

export default function Hero({ onOpenDemo, onStageSelect, activeStage }) {
  const scrollToPlatform = () => {
    const el = document.getElementById('product-tour');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      
      {/* Top Value Positioning Badge */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md text-xs font-medium text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Fit-Out Project Operating System</span>
          <span className="text-white/30">•</span>
          <span className="text-slate-400">Built for ₹10 Cr – ₹500 Cr+ Turnkey Contractors</span>
        </div>
      </div>

      {/* Main Headline & Supporting Proposition */}
      <div className="text-center max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.12]">
          Run every fit-out project from <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            one operating system.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
          Living BOQ line locking, itemized purchase ceilings, mobile site DPRs, certified JMR sign-offs, and two-way accounting sync.
        </p>

        {/* Workflow Chain Visual */}
        <div className="pt-2 pb-2">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-medium text-slate-400 bg-black/40 px-4 py-2 rounded-lg border border-white/5 backdrop-blur-sm">
            <span className="text-white font-semibold">BOQ</span>
            <span className="text-slate-600">→</span>
            <span className="text-slate-200">Procurement</span>
            <span className="text-slate-600">→</span>
            <span className="text-slate-200">Execution</span>
            <span className="text-slate-600">→</span>
            <span className="text-slate-200">Billing</span>
            <span className="text-slate-600">→</span>
            <span className="text-emerald-400 font-semibold">Margin</span>
          </div>
        </div>

        {/* Primary & Secondary Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onOpenDemo}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-slate-950 font-semibold text-sm hover:bg-slate-100 transition-all duration-200 shadow-lg shadow-white/10 flex items-center justify-center gap-2.5 active:scale-[0.98]"
          >
            <span>Book a 15-Min Demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={scrollToPlatform}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 font-medium text-sm border border-white/10 transition-all duration-200 backdrop-blur-sm flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Explore the Platform</span>
          </button>
        </div>
      </div>

      {/* PROJECT X-RAY: Signature Architectural Deconstruction Control */}
      <div className="mt-16 sm:mt-20 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl p-4 sm:p-6 shadow-2xl">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  PROJECT X-RAY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Deconstruct a 42,500 sq.ft commercial interior backwards from handover to bare shell
              </p>
            </div>

            {/* Quick Live Demo Metric */}
            <div className="flex items-center gap-3 text-xs bg-white/[0.03] px-3.5 py-1.5 rounded-lg border border-white/5">
              <span className="text-slate-400">Contract Value:</span>
              <span className="font-semibold text-white font-mono">{formatINR(DEMO_PROJECT.contractValue, true)}</span>
              <span className="text-white/20">•</span>
              <span className="text-slate-400">Protected Margin:</span>
              <span className="font-semibold text-emerald-400 font-mono">{DEMO_PROJECT.projectedMargin}%</span>
            </div>
          </div>

          {/* 4 Interactive Stage Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
            {ARCHITECTURAL_STAGES.map((stage, idx) => {
              const isSelected = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  onClick={() => onStageSelect(idx)}
                  className={\`text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between \${
                    isSelected
                      ? 'bg-white/[0.08] border-white/30 shadow-md ring-1 ring-white/20'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
                  }\`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={\`text-[11px] font-semibold tracking-wide \${
                        isSelected ? 'text-white' : 'text-slate-400'
                      }\`}>
                        {stage.title}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                      {stage.subtitle}
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {idx === 0 && 'Handover'}
                      {idx === 1 && 'Joinery & Finishes'}
                      {idx === 2 && 'MEP & Conduits'}
                      {idx === 3 && 'Base Building'}
                    </span>
                    <span className={\`font-mono font-medium \${isSelected ? 'text-white' : 'text-slate-400'}\`}>
                      0{idx + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Helper caption */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Click any stage above to inspect layer controls or scroll down to deconstruct smoothly.</span>
            <span className="font-mono text-slate-400">Fixed 1-Point Perspective • DLF Cyber City</span>
          </div>

        </div>
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'Hero.js'), heroCode, 'utf8');
console.log('3. Hero.js written');

// ==========================================
// 4. components/marketing/TrustStrip.js
// ==========================================
const trustCode = `'use client';

import React from 'react';
import { ShieldCheck, FileCheck, Layers, RefreshCw } from 'lucide-react';

export default function TrustStrip() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: 'Living BOQ Locking',
      desc: 'Item-level internal cost caps prevent unbudgeted purchase orders.'
    },
    {
      icon: FileCheck,
      title: 'Joint Measurement (JMR)',
      desc: 'Digital tripartite sign-offs between contractor, client, and PMC.'
    },
    {
      icon: Layers,
      title: 'Variation Register',
      desc: 'Drawing revision deltas captured before material procurement.'
    },
    {
      icon: RefreshCw,
      title: 'Two-Way ERP Sync',
      desc: 'Native connectors for Tally Prime, SAP ECC/S4, and Zoho Books.'
    }
  ];

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      <div className="rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md p-6 sm:p-8">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-semibold text-white tracking-wide">
                    {item.title}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pl-10">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'TrustStrip.js'), trustCode, 'utf8');
console.log('4. TrustStrip.js written');

// ==========================================
// 5. components/marketing/BusinessOutcomes.js
// ==========================================
const outcomesCode = `'use client';

import React from 'react';
import { TrendingUp, Cpu, Clock, CheckCircle2 } from 'lucide-react';

export default function BusinessOutcomes({ onOpenDemo }) {
  const outcomes = [
    {
      icon: TrendingUp,
      title: 'Protect Gross Margin',
      tagline: 'Know the financial impact before approving any commitment.',
      points: [
        { title: 'Budget cost ceilings', desc: 'Prevent unapproved commitments beyond budget.' },
        { title: 'Live committed cost', desc: 'Every PO updates projected project margin in real time.' },
        { title: 'Variation control', desc: 'Capture scope changes and drawing deltas before execution.' }
      ],
      metricLabel: 'Projected Gross Margin',
      metricVal: '18.3%',
      metricSub: 'Protected on ₹4.83 Cr demo contract'
    },
    {
      icon: Cpu,
      title: 'Keep Site & Procurement in Sync',
      tagline: 'Site indents, PO issuances, and gate GRNs in one continuous chain.',
      points: [
        { title: 'BOQ-mapped indents', desc: 'Site engineers requisition only against approved item codes.' },
        { title: 'Maker-checker approval', desc: 'Tiered authority limits for high-value purchases.' },
        { title: 'Gate GRN verification', desc: 'Deliveries inspected against PO specifications before entry.' }
      ],
      metricLabel: 'Material Delivery Compliance',
      metricVal: '98.5%',
      metricSub: 'GRN matched with PO line items'
    },
    {
      icon: Clock,
      title: 'Faster Billing Turnaround',
      tagline: 'Transform certified site measurements into client RA bills in days, not weeks.',
      points: [
        { title: 'Tripartite JMR sign-off', desc: 'Digital measurement certification eliminates client disputes.' },
        { title: 'One-click RA billing', desc: 'Auto-computes advance recovery, retention, and GST.' },
        { title: 'ERP sync & collection', desc: 'Approved bills push directly to Tally Prime or SAP.' }
      ],
      metricLabel: 'Illustrative Turnaround',
      metricVal: '~4 Days',
      metricSub: 'From JMR sign-off to RA bill submission'
    }
  ];

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Built for the commercial realities of fit-out.
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Replace disconnected spreadsheets and manual phone calls with connected financial controls across commercial, site, and finance teams.
        </p>
      </div>

      {/* 3 Core Outcome Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {outcomes.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between hover:border-white/20 transition-all duration-200"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-emerald-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-400">
                    OUTCOME 0{idx + 1}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {item.tagline}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {item.points.map((pt, pIdx) => (
                    <div key={pIdx} className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-slate-200">{pt.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 pl-5.5 leading-normal">
                        {pt.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metric Callout Footer */}
              <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">{item.metricLabel}</div>
                  <div className="text-xl font-bold text-white font-mono mt-0.5">{item.metricVal}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 max-w-[140px] leading-tight">{item.metricSub}</div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'BusinessOutcomes.js'), outcomesCode, 'utf8');
console.log('5. BusinessOutcomes.js written');

// ==========================================
// 6. components/marketing/ProductExperience.js
// ==========================================
const productExpCode = `'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  FileSpreadsheet, 
  ShoppingCart, 
  Smartphone, 
  FileCheck2, 
  ArrowRight, 
  Lock, 
  Receipt
} from 'lucide-react';
import { DEMO_PROJECT, BOQ_SAMPLE_ITEMS, formatINR, PORTFOLIO_PROJECTS } from './marketingData';

export default function ProductExperience({ onOpenDemo }) {
  const [activeTab, setActiveTab] = useState('portfolio');

  const tabs = [
    { id: 'portfolio', label: 'Executive Portfolio', icon: Building2 },
    { id: 'boq', label: 'Living BOQ & Cost Caps', icon: FileSpreadsheet },
    { id: 'procurement', label: 'Procurement & Approvals', icon: ShoppingCart },
    { id: 'site', label: 'Mobile Site DPR & GRN', icon: Smartphone },
    { id: 'jmr', label: 'JMR & RA Billing', icon: FileCheck2 },
    { id: 'accounting', label: 'Tally & SAP Accounting', icon: Receipt },
  ];

  return (
    <section id="product-tour" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 scroll-mt-24">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-medium text-slate-300">
          <span>PRODUCT TOUR</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
          See Construct-O-Genie in action.
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Explore how commercial, procurement, site, and finance workflows connect across an active 42,500 sq.ft fit-out project.
        </p>
      </div>

      {/* Module Selector Tabs */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 \${
                isSelected
                  ? 'bg-white text-slate-950 shadow-lg shadow-white/10 font-semibold'
                  : 'bg-black/40 text-slate-400 hover:text-white hover:bg-white/[0.05] border border-white/5'
              }\`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive App Screen Mockup */}
      <div className="rounded-2xl bg-black/70 border border-white/10 backdrop-blur-xl p-4 sm:p-7 shadow-2xl">
        
        {/* TOP STATUS BAR: Clear 3-Second Financial Hierarchy */}
        <div className="pb-6 mb-6 border-b border-white/10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            {/* Project Title & Status */}
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-medium">
                  {DEMO_PROJECT.code}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {DEMO_PROJECT.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {DEMO_PROJECT.areaSqFt.toLocaleString('en-IN')} sq.ft • {DEMO_PROJECT.client} • GFC Version {DEMO_PROJECT.gfcVersion}
              </p>
            </div>

            {/* Core 3 High-Impact Metrics */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 bg-white/[0.02] p-3 rounded-xl border border-white/5 w-full lg:w-auto">
              <div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Contract Value</div>
                <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                  {formatINR(DEMO_PROJECT.contractValue, true)}
                </div>
              </div>
              <div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Committed Cost</div>
                <div className="text-sm sm:text-base font-bold text-slate-200 font-mono mt-0.5">
                  {formatINR(DEMO_PROJECT.committedCost, true)}
                </div>
              </div>
              <div>
                <div className="text-[10px] sm:text-[11px] text-emerald-400 font-medium">Projected Margin</div>
                <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-0.5">
                  {DEMO_PROJECT.projectedMargin}%
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* TAB 1: EXECUTIVE PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Total Billed to Client</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatINR(DEMO_PROJECT.billedToClient, true)}
                </div>
                <div className="text-[11px] text-emerald-400 mt-0.5">63.8% of contract</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Cash Collected</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatINR(DEMO_PROJECT.collectedFromClient, true)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">85.1% collection rate</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Vendor Liabilities Paid</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatINR(DEMO_PROJECT.vendorPaid, true)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{formatINR(DEMO_PROJECT.vendorPayables - DEMO_PROJECT.vendorPaid, true)} pending</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Client Retention Held</div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatINR(DEMO_PROJECT.retentionHeld, true)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">5.0% contract retention</div>
              </div>
            </div>

            {/* Active Projects Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-slate-400 border-b border-white/5 uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Project Name &amp; Client</th>
                    <th className="py-3 px-4">Area</th>
                    <th className="py-3 px-4">Contract Value</th>
                    <th className="py-3 px-4">Committed Cost</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Projected Margin</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {PORTFOLIO_PROJECTS.map((prj) => (
                    <tr key={prj.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{prj.name}</div>
                        <div className="text-slate-400 text-[11px]">{prj.client}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">{prj.area}</td>
                      <td className="py-3 px-4 font-mono font-medium text-white">{formatINR(prj.value, true)}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{formatINR(prj.committedCost, true)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-400 h-full rounded-full" style={{ width: \`\${prj.progress}%\` }}></div>
                          </div>
                          <span className="font-mono text-[11px]">{prj.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {prj.margin}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                          {prj.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LIVING BOQ */}
        {activeTab === 'boq' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
              <span>Tender BOQ lines with Budget Cost Ceilings (BCC) &amp; live committed PO values:</span>
              <span className="font-mono text-emerald-400">48 Lines Locked</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-slate-400 border-b border-white/5 uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item Code &amp; Specification</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Tender Qty / Rate</th>
                    <th className="py-3 px-4">Client Total</th>
                    <th className="py-3 px-4">Budget Ceiling (BCC)</th>
                    <th className="py-3 px-4">Committed Cost</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {BOQ_SAMPLE_ITEMS.map((item) => (
                    <tr key={item.code} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-mono font-medium text-white text-[11px]">{item.code} • {item.trade}</div>
                        <div className="text-slate-400 text-[11px] truncate mt-0.5">{item.description}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">{item.unit}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {item.tenderQty} @ {formatINR(item.tenderRate)}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-white">
                        {formatINR(item.clientTotal)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {formatINR(item.budgetCeiling)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {formatINR(item.committedTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {item.marginPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PROCUREMENT & APPROVALS */}
        {activeTab === 'procurement' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">POs Issued</div>
                <div className="text-lg font-bold text-white font-mono mt-1">48 Purchase Orders</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Total: {formatINR(21420000, true)}</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Budget Headroom Remaining</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">{formatINR(17980000, true)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Within approved baseline</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Maker-Checker Status</div>
                <div className="text-lg font-bold text-white font-mono mt-1">2 Pending Approvals</div>
                <div className="text-[11px] text-amber-400 mt-0.5">Awaiting Director Sign-Off</div>
              </div>
            </div>

            {/* PO Approval Sample */}
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-white">Pending Executive Approval: PO-DLF-026 (Acoustic Ceiling Panels)</span>
                </div>
                <span className="font-mono text-slate-400">Threshold: &gt; ₹15 Lakhs</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-black/40 p-3 rounded-lg border border-white/5">
                <div><span className="text-slate-400">Vendor:</span> <span className="text-white font-medium">Saint-Gobain Gyproc Ltd</span></div>
                <div><span className="text-slate-400">PO Value:</span> <span className="text-white font-mono font-medium">₹18,40,000</span></div>
                <div><span className="text-slate-400">BOQ Ceiling:</span> <span className="text-white font-mono font-medium">₹19,20,000</span></div>
                <div><span className="text-slate-400">Budget Variance:</span> <span className="text-emerald-400 font-mono font-medium">+₹80,000 Saved</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SITE DPR & GRN */}
        {activeTab === 'site' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Today&apos;s Labor Headcount</div>
                <div className="text-lg font-bold text-white font-mono mt-1">68 Tradespersons</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Joinery (24), MEP (22), Drywall (22)</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Physical Execution Progress</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">67.0% Certified</div>
                <div className="text-[11px] text-slate-400 mt-0.5">S-Curve on schedule</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Gate GRN Verification</div>
                <div className="text-lg font-bold text-white font-mono mt-1">3 Deliveries Inspected</div>
                <div className="text-[11px] text-emerald-400 mt-0.5">Challans matched with PO</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span>Latest Mobile DPR Log (Site In-Charge: R. Sharma)</span>
                <span className="font-mono text-slate-400">Logged 18:30 IST • Offline Cached &amp; Synced</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Level 15 south-wing acoustic ceiling framing completed (100%). Glass partition channel fixing in progress on Level 14. 240 running meters of primary linear LED conduits laid. All material delivery challans uploaded with gate photos.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: JMR & RA BILLING */}
        {activeTab === 'jmr' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Cumulative RA Bills Certified</div>
                <div className="text-lg font-bold text-white font-mono mt-1">{formatINR(30800000, true)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">RA Bill 04 certified by PMC</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Advance Mobilization Recovered</div>
                <div className="text-lg font-bold text-slate-200 font-mono mt-1">{formatINR(4825000, true)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">10% contract mobilization</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Billing Turnaround Time</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">~4 Days</div>
                <div className="text-[11px] text-slate-400 mt-0.5">From JMR sign-off to RA bill</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Tripartite Certified JMR #04 Sign-Off Record</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">Signatures Complete</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 bg-black/40 p-3 rounded-lg border border-white/5">
                <div><span className="text-slate-400">Fit-Out Contractor:</span> <span className="text-white">Certified (Lead QS)</span></div>
                <div><span className="text-slate-400">Client PMC:</span> <span className="text-white">Certified (Sr. PM)</span></div>
                <div><span className="text-slate-400">Client Rep:</span> <span className="text-white">Approved for Billing</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: TALLY & SAP ACCOUNTING */}
        {activeTab === 'accounting' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Tally / SAP Sync Status</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">Connected</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Direct XML / REST Bridge</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">TDS u/s 194C Deducted</div>
                <div className="text-lg font-bold text-white font-mono mt-1">{formatINR(376000, true)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Challan 281 reconciliation</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-slate-400">Bank UTR Reconciled</div>
                <div className="text-lg font-bold text-white font-mono mt-1">{formatINR(15400000, true)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Matched with vendor POs</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-400 leading-relaxed">
              When finance clears a vendor payment in Tally or NetBanking, the bank UTR reference number automatically updates the Construct-O-Genie purchase order ledger, reconciling committed liability with zero double entry.
            </div>
          </div>
        )}

        {/* Action CTA Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            Sanitized reference project data from commercial fit-out operations.
          </div>
          <button
            onClick={onOpenDemo}
            className="px-5 py-2.5 rounded-xl bg-white text-slate-950 font-semibold text-xs hover:bg-slate-100 transition-all flex items-center gap-2"
          >
            <span>Request a Tailored Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'ProductExperience.js'), productExpCode, 'utf8');
console.log('6. ProductExperience.js written');

// ==========================================
// 7. components/marketing/MasterWorkflow.js
// ==========================================
const workflowCode = `'use client';

import React, { useState } from 'react';
import { 
  WORKFLOW_STAGES, 
  WORKFLOW_GROUPS 
} from './marketingData';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function MasterWorkflow({ onOpenDemo }) {
  const [expandedGroup, setExpandedGroup] = useState('commercial');

  const toggleGroup = (id) => {
    setExpandedGroup(expandedGroup === id ? null : id);
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          End-to-End Fit-Out Workflow
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          From initial tender BOQ locking to certified JMR sign-offs and Tally/SAP reconciliation.
        </p>
      </div>

      {/* DESKTOP VIEW: Full 10-Stage Connected Grid */}
      <div className="hidden lg:grid grid-cols-5 gap-4">
        {WORKFLOW_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="p-4 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md flex flex-col justify-between hover:border-white/20 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">
                  STAGE {stage.step}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 font-medium border border-white/5">
                  {stage.group}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                {stage.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {stage.action}
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-white/5">
              <div className="text-[10px] text-slate-400">{stage.impactRole}</div>
              <div className="text-xs font-semibold text-emerald-400 mt-0.5">{stage.impactVal}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MOBILE / TABLET VIEW: 5 Progressive-Disclosure Expandable Groups */}
      <div className="lg:hidden space-y-3">
        {WORKFLOW_GROUPS.map((grp) => {
          const isExpanded = expandedGroup === grp.id;
          const groupStages = WORKFLOW_STAGES.filter((s) => grp.stages.includes(s.step));

          return (
            <div
              key={grp.id}
              className="rounded-xl bg-black/60 border border-white/10 backdrop-blur-md overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleGroup(grp.id)}
                className="w-full p-4 text-left flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">
                    {grp.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {grp.desc}
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-slate-400 flex-shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3 bg-white/[0.01]">
                  {groupStages.map((stage) => (
                    <div key={stage.id} className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-slate-400">Step {stage.step}</span>
                        <span className="text-[10px] font-medium text-emerald-400">{stage.impactVal}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white">{stage.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{stage.action}</p>
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-white/5">
                        Key Stakeholder: <span className="text-slate-300">{stage.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'MasterWorkflow.js'), workflowCode, 'utf8');
console.log('7. MasterWorkflow.js written');

// ==========================================
// 8. components/marketing/RoleWorkspaces.js
// ==========================================
const rolesCode = `'use client';

import React, { useState } from 'react';
import { ROLE_EXPERIENCES } from './marketingData';
import { ArrowRight, CheckCircle2, User, Shield, HardHat, Calculator, Briefcase } from 'lucide-react';

export default function RoleWorkspaces({ onOpenDemo }) {
  const [activeRole, setActiveRole] = useState(ROLE_EXPERIENCES[0].id);

  const roleIcons = {
    founder: Shield,
    qs: Calculator,
    pm: Briefcase,
    site: HardHat,
    finance: User,
  };

  const selectedData = ROLE_EXPERIENCES.find((r) => r.id === activeRole) || ROLE_EXPERIENCES[0];

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      
      {/* Direct, Authentic Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          One system. A different view for every team.
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          From the managing director tracking portfolio gross margin to the site engineer submitting mobile DPRs and JMRs.
        </p>
      </div>

      {/* Role Tabs Selector */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {ROLE_EXPERIENCES.map((role) => {
          const Icon = roleIcons[role.id] || User;
          const isSelected = activeRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id)}
              className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 \${
                isSelected
                  ? 'bg-white text-slate-950 font-semibold shadow-md'
                  : 'bg-black/40 text-slate-400 hover:text-white hover:bg-white/[0.05] border border-white/5'
              }\`}
            >
              <Icon className="w-4 h-4" />
              <span>{role.role.split('&')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Role Workspace Preview Card */}
      <div className="rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Responsibilities & Highlights */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.05] border border-white/10 text-xs font-mono text-slate-300">
                <span>{selectedData.role}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {selectedData.tagline}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {selectedData.description}
              </p>
            </div>

            <div className="space-y-3">
              {selectedData.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{h}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={onOpenDemo}
                className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-xs border border-white/15 transition-all inline-flex items-center gap-2"
              >
                <span>Request {selectedData.role.split('&')[0].trim()} Walkthrough</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Role Metric & Interactive Widget */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 space-y-5">
              <div className="space-y-1">
                <div className="text-xs text-slate-400">{selectedData.sampleMetric.label}</div>
                <div className="text-3xl font-bold text-white font-mono">{selectedData.sampleMetric.value}</div>
                <div className="text-xs text-emerald-400 font-medium">{selectedData.sampleMetric.sub}</div>
              </div>

              <div className="p-3.5 rounded-lg bg-black/50 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Active Workspace Role:</span>
                  <span className="font-semibold text-white font-mono">{selectedData.id.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Role Permissions:</span>
                  <span className="text-emerald-400 font-medium">Verified &amp; Segregated</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Maker-Checker Tier:</span>
                  <span className="text-slate-300">Delegated Authority</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'RoleWorkspaces.js'), rolesCode, 'utf8');
console.log('8. RoleWorkspaces.js written');

// ==========================================
// 9. components/marketing/IntegrationsSection.js
// ==========================================
const integrationsCode = `'use client';

import React from 'react';
import { INTEGRATIONS_LIST } from './marketingData';

export default function IntegrationsSection({ onOpenDemo }) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Connect with your accounting stack.
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Integration options available based on your existing systems. Keep your general ledger in Tally or SAP while managing fit-out projects in Construct-O-Genie.
        </p>
      </div>

      {/* Defensible Integration Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {INTEGRATIONS_LIST.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md flex flex-col justify-between hover:border-white/20 transition-all space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 font-mono">
                  {item.badge}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/5">
                  {item.category}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {item.name}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">{item.type}</div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {item.desc}
              </p>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Capability:</span>
              <span className="text-slate-200 font-medium">{item.status}</span>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'IntegrationsSection.js'), integrationsCode, 'utf8');
console.log('9. IntegrationsSection.js written');

// ==========================================
// 10. components/marketing/CaseBreakdown.js
// ==========================================
const caseCode = `'use client';

import React from 'react';
import { DEMO_PROJECT, formatINR } from './marketingData';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CaseBreakdown({ onOpenDemo }) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      
      {/* Clearly Identified Illustrative Model */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-medium text-slate-300">
          <span>MODELLED REFERENCE CASE</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Illustrative Project Scenario
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Comparing disconnected manual workflows against connected project controls for a 42,500 sq.ft commercial office fit-out.
        </p>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl p-6 sm:p-8">
        
        {/* Project Header Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-white/10 gap-4">
          <div>
            <span className="text-xs font-mono text-slate-400">REFERENCE SPECIFICATION</span>
            <h3 className="text-lg font-bold text-white mt-0.5">42,500 sq.ft Commercial Fit-Out (Gurugram)</h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">Contract Value: </span>
              <span className="font-bold text-white">{formatINR(DEMO_PROJECT.contractValue, true)}</span>
            </div>
            <div>
              <span className="text-slate-400">Tender Baseline: </span>
              <span className="font-bold text-slate-300">{formatINR(DEMO_PROJECT.bcsBudget, true)}</span>
            </div>
          </div>
        </div>

        {/* Before vs With Construct-O-Genie Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Column 1: Disconnected Manual Operations */}
          <div className="p-5 sm:p-6 rounded-xl bg-red-500/[0.02] border border-red-500/15 space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Without Connected Controls</h4>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">JMR &amp; Billing Cycle:</span>
                <span className="font-mono text-rose-300 font-semibold">~28 Days (Disputes)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Uncaptured Scope Variations:</span>
                <span className="font-mono text-rose-300 font-semibold">~5.8% Scope Leakage</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Procurement Budget Control:</span>
                <span className="text-slate-400">Post-facto Tally Entry</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Typical Realized Gross Margin:</span>
                <span className="font-mono text-rose-400 font-bold">~12.5% (Margin Slippage)</span>
              </div>
            </div>
          </div>

          {/* Column 2: With Construct-O-Genie OS */}
          <div className="p-5 sm:p-6 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/20 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <h4 className="text-sm font-bold uppercase tracking-wider">With Integrated Workflow</h4>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Potential JMR Turnaround:</span>
                <span className="font-mono text-emerald-400 font-semibold">~4 Days (Digital Sign-Off)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Variation Capture:</span>
                <span className="font-mono text-emerald-400 font-semibold">Flagged before PO Issuance</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Procurement Budget Control:</span>
                <span className="text-emerald-300">Hard BCC Line Locking</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Target / Protected Gross Margin:</span>
                <span className="font-mono text-emerald-400 font-bold">18.34% ({formatINR(DEMO_PROJECT.projectedGrossProfit, true)})</span>
              </div>
            </div>
          </div>

        </div>

        {/* Prominent Mandatory Disclaimer */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center text-xs text-slate-400">
          Illustrative scenario. Actual results depend on project workflow, client certification, and operating discipline.
        </div>

      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'CaseBreakdown.js'), caseCode, 'utf8');
console.log('10. CaseBreakdown.js written');

// ==========================================
// 11. components/marketing/ROICalculator.js
// ==========================================
const roiCode = `'use client';

import React, { useState } from 'react';
import { formatINR } from './marketingData';
import { ArrowRight } from 'lucide-react';

export default function ROICalculator({ onOpenDemo }) {
  const [turnoverCr, setTurnoverCr] = useState(50); // ₹50 Cr
  const [activeProjects, setActiveProjects] = useState(6);

  // Transparent, conservative calculation formulas
  const turnoverVal = turnoverCr * 10000000;
  // Estimated 3.2% gross margin protection via budget line locking & variation capture
  const projectedSavings = turnoverVal * 0.032;
  // Working capital acceleration (~20 days faster JMR to RA collection)
  const workingCapitalUnlocked = turnoverVal * 0.055;

  return (
    <section id="roi-calculator" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 scroll-mt-24">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Estimate Your Protected Margin
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Interactive simulator based on conservative fit-out industry benchmarks and working capital cycles.
        </p>
      </div>

      {/* Interactive Calculator Container */}
      <div className="rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Sliders */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Turnover Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Annual Fit-Out Turnover:</span>
                <span className="font-mono text-base font-bold text-white">₹{turnoverCr} Cr</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={turnoverCr}
                onChange={(e) => setTurnoverCr(Number(e.target.value))}
                className="w-full accent-emerald-400 bg-white/10 rounded-lg h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>₹10 Cr</span>
                <span>₹100 Cr</span>
                <span>₹200 Cr</span>
                <span>₹300 Cr+</span>
              </div>
            </div>

            {/* Active Projects Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Concurrent Active Sites:</span>
                <span className="font-mono text-base font-bold text-white">{activeProjects} Sites</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={activeProjects}
                onChange={(e) => setActiveProjects(Number(e.target.value))}
                className="w-full accent-emerald-400 bg-white/10 rounded-lg h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>2 Sites</span>
                <span>15 Sites</span>
                <span>30+ Sites</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 leading-relaxed">
              Assumes 3.2% margin leakage prevention (scope capture + budget headroom validation) and ~20 days faster client RA certification.
            </div>

          </div>

          {/* Right Column: Projected Impact Output */}
          <div className="lg:col-span-6">
            <div className="p-6 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/20 space-y-6">
              
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Estimated Annual Margin Protected</div>
                <div className="text-3xl sm:text-4xl font-bold text-emerald-400 font-mono">
                  {formatINR(projectedSavings, true)}
                </div>
                <div className="text-xs text-slate-300">
                  Projected margin gain across {activeProjects} active commercial fit-out projects.
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Working Capital Acceleration:</span>
                  <span className="font-mono font-semibold text-white">{formatINR(workingCapitalUnlocked, true)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">JMR-to-Billing Cycle:</span>
                  <span className="font-mono font-semibold text-emerald-400">~4 Days vs ~28 Days</span>
                </div>
              </div>

              <button
                onClick={onOpenDemo}
                className="w-full py-3 rounded-xl bg-white text-slate-950 font-semibold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                <span>Calculate My ROI on Live Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'ROICalculator.js'), roiCode, 'utf8');
console.log('11. ROICalculator.js written');

// ==========================================
// 12. components/marketing/FAQSection.js
// ==========================================
const faqCode = `'use client';

import React, { useState } from 'react';
import { FAQS } from './marketingData';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQSection({ onOpenDemo }) {
  const [openIdx, setOpenIdx] = useState(0);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto z-10">
      
      {/* Section Header */}
      <div className="text-center space-y-3 mb-10 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Key questions about implementing Construct-O-Genie across fit-out commercial, site, and accounts operations.
        </p>
      </div>

      {/* Accordion FAQ Items */}
      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-xl bg-black/50 border border-white/10 backdrop-blur-md overflow-hidden transition-all"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02]"
              >
                <span className="text-xs sm:text-sm font-bold text-white">
                  {faq.q}
                </span>
                <div className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400 flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'FAQSection.js'), faqCode, 'utf8');
console.log('12. FAQSection.js written');

// ==========================================
// 13. components/marketing/FinalCTA.js
// ==========================================
const finalCtaCode = `'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA({ onOpenDemo }) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto z-10 pb-12">
      <div className="rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/15 backdrop-blur-2xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
        
        <div className="space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Take total control of your fit-out gross margins.
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            See how your active tender BOQs, procurement indents, and billing cycles run inside Construct-O-Genie.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onOpenDemo}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-slate-950 font-semibold text-sm hover:bg-slate-100 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Book a 15-Min Demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span>✓ Onboarding in 7–14 days</span>
          <span>✓ Excel BOQ import assistance</span>
          <span>✓ Tally &amp; SAP compatibility</span>
        </div>

      </div>
    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'FinalCTA.js'), finalCtaCode, 'utf8');
console.log('13. FinalCTA.js written');

// ==========================================
// 14. components/marketing/Footer.js
// ==========================================
const footerCode = `'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer({ onOpenDemo, onOpenLogin }) {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/80 backdrop-blur-xl text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          
          {/* Company Brand Column */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/brand/logo-icon-white.png"
                alt="Construct-O-Genie Logo"
                className="w-6 h-6 object-contain"
              />
              <span className="font-bold text-sm tracking-tight text-white">
                Construct-O-Genie
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              The project operating system for turnkey interior &amp; commercial fit-out contractors. Protecting gross margin from bare shell to certified handover.
            </p>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>Operating Entity: Construct-O-Genie Technologies</div>
              <div>NCR Operations: Gurugram, Haryana, India</div>
              <div>Direct Contact: <a href="mailto:contact@constructogenie.in" className="text-slate-300 hover:text-white underline">contact@constructogenie.in</a></div>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#product-tour" className="hover:text-white transition-colors">Product Tour</a></li>
              <li><button onClick={onOpenDemo} className="hover:text-white transition-colors text-left">Living BOQ</button></li>
              <li><button onClick={onOpenDemo} className="hover:text-white transition-colors text-left">Procurement Caps</button></li>
              <li><button onClick={onOpenDemo} className="hover:text-white transition-colors text-left">Mobile DPR</button></li>
              <li><button onClick={onOpenDemo} className="hover:text-white transition-colors text-left">Certified JMR</button></li>
              <li><button onClick={onOpenDemo} className="hover:text-white transition-colors text-left">Tally &amp; SAP Bridge</button></li>
            </ul>
          </div>

          {/* Company & Resources */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact &amp; Sales</Link></li>
              <li><button onClick={onOpenDemo} className="hover:text-white transition-colors text-left">Book a Demo</button></li>
              <li><a href="#roi-calculator" className="hover:text-white transition-colors">ROI Simulator</a></li>
              <li><button onClick={onOpenLogin} className="hover:text-white transition-colors text-left">Platform Sign In</button></li>
            </ul>
          </div>

          {/* Security & Legal */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider">Security &amp; Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/security" className="hover:text-white transition-colors">Enterprise Security</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Support Desk</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Legal Line */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} Construct-O-Genie Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-white transition-colors">Security</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'Footer.js'), footerCode, 'utf8');
console.log('14. Footer.js written');

// ==========================================
// 15. components/marketing/Navbar.js
// ==========================================
const navbarCode = `'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

export default function Navbar({ onOpenDemo, onOpenLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={\`fixed top-0 left-0 right-0 z-50 transition-all duration-200 \${
        scrolled
          ? 'bg-black/80 border-b border-white/10 backdrop-blur-xl py-3.5 shadow-lg'
          : 'bg-transparent py-5'
      }\`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/brand/logo-icon-white.png"
              alt="Construct-O-Genie"
              className="w-7 h-7 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="font-bold text-sm sm:text-base tracking-tight text-white">
              Construct-O-Genie
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
            <a href="/#product-tour" className="hover:text-white transition-colors">Product Tour</a>
            <a href="/#roi-calculator" className="hover:text-white transition-colors">ROI Calculator</a>
            <Link href="/security" className="hover:text-white transition-colors">Security</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onOpenDemo}
              className="px-4 py-2 rounded-xl bg-white text-slate-950 font-semibold text-xs hover:bg-slate-100 transition-all shadow-sm active:scale-[0.98] flex items-center gap-1.5"
            >
              <span>Book a 15-Min Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/[0.05] text-slate-300 border border-white/10"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-6 border-t border-white/10 mt-3 space-y-4 bg-black/95 rounded-2xl p-4 border">
            <nav className="flex flex-col gap-3 text-sm font-medium text-slate-200">
              <a 
                href="/#product-tour" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                Product Tour
              </a>
              <a 
                href="/#roi-calculator" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                ROI Calculator
              </a>
              <Link 
                href="/security" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                Security
              </Link>
              <Link 
                href="/contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                Contact &amp; Sales
              </Link>
            </nav>

            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenDemo(); }}
                className="w-full py-2.5 rounded-xl bg-white text-slate-950 font-semibold text-xs text-center"
              >
                Book a 15-Min Demo
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                className="w-full py-2.5 rounded-xl bg-white/[0.05] text-slate-200 font-medium text-xs text-center border border-white/10"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'Navbar.js'), navbarCode, 'utf8');
console.log('15. Navbar.js written');

// ==========================================
// 16. components/marketing/BookDemoModal.js
// ==========================================
const demoModalCode = `'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

export default function BookDemoModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [turnover, setTurnover] = useState('₹25 Cr – ₹100 Cr');
  const [projectCount, setProjectCount] = useState('4–10 Projects');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate reliable demo scheduling payload
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#080c14] border border-white/15 p-6 sm:p-8 text-slate-100 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {!submitted ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>Tailored Fit-Out Demonstration</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Book a 15-Min Executive Demo
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                See how Construct-O-Genie connects tender BOQ rates, purchase caps, mobile DPRs, and Tally/SAP billing for your active fit-out projects.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rajesh@contractor.in"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98100 XXXXX"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Apex Interiors Ltd"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Annual Turnover Range</label>
                  <select
                    value={turnover}
                    onChange={(e) => setTurnover(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d121c] border border-white/10 text-white focus:outline-none focus:border-white/30 text-xs"
                  >
                    <option>₹10 Cr – ₹25 Cr</option>
                    <option>₹25 Cr – ₹100 Cr</option>
                    <option>₹100 Cr – ₹300 Cr</option>
                    <option>₹300 Cr+</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Concurrent Active Sites</label>
                  <select
                    value={projectCount}
                    onChange={(e) => setProjectCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d121c] border border-white/10 text-white focus:outline-none focus:border-white/30 text-xs"
                  >
                    <option>1–3 Projects</option>
                    <option>4–10 Projects</option>
                    <option>10–25 Projects</option>
                    <option>25+ Projects</option>
                  </select>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-white text-slate-950 font-semibold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling Demo...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm 15-Min Demo Request</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-400 pt-1">
                Zero spam. An enterprise product specialist will confirm your slot within 2 business hours.
              </p>
            </form>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Demo Request Received</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Thank you, <span className="text-white font-medium">{name}</span>. We will contact you at <span className="text-white font-medium">{email}</span> to confirm your live 15-minute fit-out walkthrough.
              </p>
            </div>
            <button
              onClick={() => { setSubmitted(false); onClose(); }}
              className="px-6 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white font-medium"
            >
              Close Window
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'BookDemoModal.js'), demoModalCode, 'utf8');
console.log('16. BookDemoModal.js written');

// ==========================================
// 17. components/marketing/SignInModal.js
// ==========================================
const signinCode = `'use client';

import React, { useState } from 'react';
import { X, ArrowRight, Building2 } from 'lucide-react';

export default function SignInModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSignIn = (e) => {
    e.preventDefault();
    window.location.href = '/?logged_in=true';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#080c14] border border-white/15 p-6 text-slate-100 shadow-2xl">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-medium text-slate-400">CONSTRUCT-O-GENIE OS</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Sign In to Platform
            </h3>
            <p className="text-xs text-slate-400">
              Access your project workspace, living BOQ, and site logs.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-white text-slate-950 font-semibold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'SignInModal.js'), signinCode, 'utf8');
console.log('17. SignInModal.js written');

// ==========================================
// 18. app/privacy/page.js
// ==========================================
const privacyCode = `import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: "Privacy Policy — Construct-O-Genie",
  description: "Enterprise privacy policy for Construct-O-Genie Fit-Out Construction OS.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#030508] text-slate-200 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Construct-O-Genie</span>
        </Link>
      </div>

      <div className="space-y-8">
        <div className="space-y-2 border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ENTERPRISE GOVERNANCE</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-400">Last updated: August 2026 • Construct-O-Genie Technologies</p>
        </div>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">1. Information We Collect</h2>
          <p>
            Construct-O-Genie Technologies (&quot;Construct-O-Genie&quot;, &quot;we&quot;, &quot;us&quot;) provides a project operating system for commercial interior fit-out and turnkey contracting enterprises. In providing this service, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
            <li><strong>Account &amp; Identity Data:</strong> Name, business email, mobile number, company legal entity name, and role designation.</li>
            <li><strong>Project &amp; Commercial Operational Data:</strong> Tender BOQ line items, purchase orders, subcontractor contracts, Daily Progress Reports (DPRs), Joint Measurement Records (JMRs), and certified Running Account (RA) billing data provided by your authorized users.</li>
            <li><strong>Technical &amp; Telemetry Data:</strong> IP addresses, browser specifications, operating system telemetry, and audit timestamps for security log integrity.</li>
          </ul>
        </section>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">2. Purpose of Data Processing</h2>
          <p>
            We process your enterprise data strictly to provide, maintain, and secure the Construct-O-Genie platform:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
            <li>Executing Living BOQ budget cost ceiling validations and maker-checker approval workflows.</li>
            <li>Facilitating tripartite JMR certifications and Running Account bill calculations.</li>
            <li>Enabling secure two-way accounting synchronization with your configured Tally Prime or SAP instances.</li>
            <li>Maintaining immutable audit trails for commercial compliance and dispute resolution.</li>
          </ul>
        </section>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">3. Data Ownership &amp; Confidentiality</h2>
          <p>
            You retain sole and exclusive ownership of all project rates, contractor costs, vendor contracts, and client commercial data. Construct-O-Genie does not sell, lease, or monetize your project data to third parties.
          </p>
        </section>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">4. Data Security &amp; Retention</h2>
          <p>
            All data is encrypted in transit via TLS 1.3 and at rest via AES-256 in isolated enterprise cloud VPCs hosted in AWS Asia Pacific (Mumbai) data centers. We retain active project records for the duration of your active enterprise subscription plus statutory audit retention periods requested by your organization.
          </p>
        </section>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">5. Contact Information</h2>
          <p>
            For privacy inquiries or data protection requests, please contact our Data Governance Officer at <a href="mailto:privacy@constructogenie.in" className="text-white underline">privacy@constructogenie.in</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(appDir, 'privacy/page.js'), privacyCode, 'utf8');
console.log('18. app/privacy/page.js written');

// ==========================================
// 19. app/terms/page.js
// ==========================================
const termsCode = `import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: "Terms of Service — Construct-O-Genie",
  description: "Enterprise terms of service for Construct-O-Genie Fit-Out Construction OS.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#030508] text-slate-200 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Construct-O-Genie</span>
        </Link>
      </div>

      <div className="space-y-8">
        <div className="space-y-2 border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>COMMERCIAL AGREEMENT</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Terms of Service</h1>
          <p className="text-xs text-slate-400">Effective: August 2026 • Construct-O-Genie Technologies</p>
        </div>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">1. Platform Access &amp; Subscription</h2>
          <p>
            By accessing or subscribing to the Construct-O-Genie project operating system, your organization agrees to these Terms of Service. Construct-O-Genie grants you a non-exclusive, commercial SaaS license to access and utilize the platform across your authorized project sites and corporate entities.
          </p>
        </section>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">2. User Responsibilities &amp; Role Access</h2>
          <p>
            Your organization is responsible for maintaining administrative control over user credentials and role-based permissions (Director, QS, PM, Site Engineer, Finance). You are responsible for ensuring that all financial entries, PO approvals, and JMR records comply with your internal corporate governance.
          </p>
        </section>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">3. Third-Party Integrations (Tally, SAP, Zoho)</h2>
          <p>
            Construct-O-Genie provides connectivity bridges for accounting software such as Tally Prime, SAP, and Zoho Books. Compatibility is dependent upon your organization maintaining licensed, accessible instances of these third-party platforms with proper network permissions.
          </p>
        </section>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">4. Intellectual Property &amp; Commercial Data</h2>
          <p>
            All software code, user interface designs, algorithms, and documentation are the exclusive intellectual property of Construct-O-Genie Technologies. All project rates, BOQs, client records, and site drawings uploaded by your organization remain your exclusive proprietary property.
          </p>
        </section>

        <section className="space-y-3 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">5. Governing Law &amp; Jurisdiction</h2>
          <p>
            These terms are governed by the laws of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the competent courts in New Delhi / Gurugram, India.
          </p>
        </section>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(appDir, 'terms/page.js'), termsCode, 'utf8');
console.log('19. app/terms/page.js written');

// ==========================================
// 20. app/security/page.js
// ==========================================
const securityCode = `import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Server, KeyRound, Database, RefreshCw, FileText } from 'lucide-react';

export const metadata = {
  title: "Enterprise Security Architecture — Construct-O-Genie",
  description: "Security architecture, encryption, access control, and compliance for Construct-O-Genie Fit-Out OS.",
};

export default function SecurityPage() {
  const securityPillars = [
    {
      icon: Lock,
      title: "Data Encryption Standards",
      desc: "All network traffic is encrypted using TLS 1.3 with forward secrecy. All project databases, tender rates, and attachments are encrypted at rest using AES-256 with managed KMS keys."
    },
    {
      icon: KeyRound,
      title: "Role-Based Access Control (RBAC)",
      desc: "Granular permission boundaries enforce strict segregation of duties. Site supervisors cannot alter tender baseline rates, and purchase managers cannot issue high-value POs without multi-tier director sign-off."
    },
    {
      icon: FileText,
      title: "Immutable Audit Trails",
      desc: "Every rate change, GFC drawing revision takeoff, purchase order approval, and JMR measurement modification is permanently logged with user ID, IP address, and cryptographic timestamp."
    },
    {
      icon: Server,
      title: "AWS Asia Pacific (Mumbai) VPC",
      desc: "Enterprise data is hosted in dedicated Virtual Private Clouds (VPC) in ISO-compliant AWS Mumbai data centers with automated multi-zone failover and DDoS protection."
    },
    {
      icon: Database,
      title: "Automated Daily Backups & Disaster Recovery",
      desc: "Point-in-time recovery (PITR) with automated daily snapshot backups. Redundant database replication guarantees business continuity for mission-critical fit-out operations."
    },
    {
      icon: RefreshCw,
      title: "Secure ERP & Accounting Connectors",
      desc: "Integrations with Tally Prime and SAP utilize authenticated, encrypted local connectors and scoped API tokens with zero public exposure of accounting credentials."
    }
  ];

  return (
    <div className="min-h-screen bg-[#030508] text-slate-200 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Construct-O-Genie</span>
        </Link>
      </div>

      <div className="space-y-10">
        <div className="space-y-3 border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SECURITY ARCHITECTURE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Enterprise Security &amp; Data Governance
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Construct-O-Genie is engineered with defense-in-depth architecture to safeguard proprietary commercial tender rates, supplier contracts, and financial ledgers.
          </p>
        </div>

        {/* 6 Security Architecture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {securityPillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="p-6 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-emerald-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-white">{p.title}</h2>
                <p className="text-xs text-slate-300 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Security Contact */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Security Vulnerability Disclosure</h3>
            <p className="text-xs text-slate-400">
              For security advisories or penetration testing reports, please contact our SecOps team.
            </p>
          </div>
          <a
            href="mailto:security@constructogenie.in"
            className="px-5 py-2.5 rounded-xl bg-white text-slate-950 font-semibold text-xs hover:bg-slate-100 transition-all whitespace-nowrap"
          >
            Contact SecOps Team
          </a>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(appDir, 'security/page.js'), securityCode, 'utf8');
console.log('20. app/security/page.js written');

// ==========================================
// 21. app/contact/page.js
// ==========================================
const contactCode = `'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#030508] text-slate-200 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Construct-O-Genie</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Direct Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono font-medium text-emerald-400">ENTERPRISE INQUIRIES</span>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Contact &amp; Sales
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect with our fit-out commercial specialists for product demonstrations, technical architecture reviews, or data migration assistance.
            </p>
          </div>

          <div className="space-y-4 pt-4 text-xs">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Direct Inquiries</span>
              </div>
              <div className="text-slate-400 space-y-1 pl-6">
                <div>Sales: <a href="mailto:sales@constructogenie.in" className="text-slate-200 hover:text-white underline">sales@constructogenie.in</a></div>
                <div>Support: <a href="mailto:support@constructogenie.in" className="text-slate-200 hover:text-white underline">support@constructogenie.in</a></div>
                <div>General: <a href="mailto:contact@constructogenie.in" className="text-slate-200 hover:text-white underline">contact@constructogenie.in</a></div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Operating Location</span>
              </div>
              <p className="text-slate-400 pl-6 leading-relaxed">
                Construct-O-Genie Technologies<br />
                Gurugram, NCR, Haryana, India
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Inquiry Form */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-xl">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <h2 className="text-base font-bold text-white">Send an Enterprise Inquiry</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Mehta"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="vikram@contractor.in"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Turnkey Fit-Out Ltd"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98100 XXXXX"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Project Scale / Inquired Solution</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your active fit-out projects, current ERP/Tally workflow, or specific module requirements..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-white text-slate-950 font-semibold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Inquiry Received</h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Thank you. A Construct-O-Genie commercial specialist will review your inquiry and follow up within 2 business hours.
                  </p>
                </div>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white"
                >
                  Send Another Message
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(appDir, 'contact/page.js'), contactCode, 'utf8');
console.log('21. app/contact/page.js written');

console.log('All enterprise-grade second-pass refinement components successfully written!');
