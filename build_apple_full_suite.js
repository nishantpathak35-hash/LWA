const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/Admin/Desktop/Construct-O-Genie';
const marketingDir = path.join(targetDir, 'components/marketing');
const appDir = path.join(targetDir, 'app');

console.log('Crafting Apple-grade typography, copywriting, and materials across the entire site...');

// ==========================================
// 1. app/layout.js (Apple Typography Setup with SF-grade Google Fonts)
// ==========================================
const layoutCode = `import "./globals.css";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport = {
  themeColor: "#030508",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  metadataBase: new URL("https://www.constructogenie.in"),
  title: "Construct-O-Genie — The Operating System for Turnkey Interiors & Fit-Out",
  description: "Run every fit-out project with total margin certainty. Living BOQ, itemized procurement caps, mobile site DPRs, certified JMR billing, and bi-directional Tally & SAP sync.",
  keywords: [
    "turnkey interior software",
    "fit-out construction OS",
    "BOQ margin protection",
    "Tally Prime construction sync",
    "JMR measurement record",
    "commercial fit-out ERP",
  ],
  authors: [{ name: "Construct-O-Genie Technologies" }],
  openGraph: {
    title: "Construct-O-Genie — From Bare Shell to Certified Handover",
    description: "Run every fit-out project with total margin certainty. Manage budgets, procurement, execution, and billing from one connected platform.",
    url: "https://www.constructogenie.in",
    siteName: "Construct-O-Genie",
    images: [
      {
        url: "/dashboard-screen.jpg",
        width: 1200,
        height: 630,
        alt: "Construct-O-Genie Executive Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Construct-O-Genie — Fit-Out Construction OS",
    description: "BOQ Line Locking, Site DPRs, Maker/Checker Approvals, and Tally/SAP ERP Invoicing.",
    images: ["/dashboard-screen.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={\`\${displayFont.variable} \${bodyFont.variable} \${monoFont.variable} dark\`}>
      <body className="bg-[#030508] text-slate-100 antialiased font-sans selection:bg-white/20 selection:text-white">
        {children}
      </body>
    </html>
  );
}
`;

fs.writeFileSync(path.join(appDir, 'layout.js'), layoutCode, 'utf8');
console.log('1. app/layout.js written');

// ==========================================
// 2. app/globals.css (Apple Typography Engine & Fluid Materials)
// ==========================================
const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --font-display: var(--font-display, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --font-body: var(--font-body, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --font-mono: var(--font-mono, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace);
  --bg-obsidian: #030508;
  --apple-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --apple-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

html {
  scroll-behavior: smooth;
  color-scheme: dark;
  -webkit-tap-highlight-color: transparent;
}

body {
  background: var(--bg-obsidian);
  color: #f8fafc;
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
  letter-spacing: -0.011em;
}

::selection {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #030508;
}
::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}

/* ==========================================
   APPLE OPTICAL TYPOGRAPHY SYSTEM
   ========================================== */
.font-display {
  font-family: var(--font-display);
  letter-spacing: -0.035em;
}

.font-mono {
  font-family: var(--font-mono);
  letter-spacing: -0.015em;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "zero" 1;
}

.apple-headline {
  font-family: var(--font-display);
  letter-spacing: -0.04em;
  line-height: 1.06;
}

.apple-eyebrow {
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.6875rem;
}

.apple-lead {
  font-size: 1.125rem;
  line-height: 1.6;
  color: #cbd5e1;
  letter-spacing: -0.015em;
}

/* ==========================================
   APPLE MATERIALS & FROSTED GLASS
   ========================================== */
.apple-glass {
  background: radial-gradient(
    140% 140% at 50% 0%, 
    rgba(255, 255, 255, 0.05) 0%, 
    rgba(255, 255, 255, 0.01) 100%
  ), #080B10;
  backdrop-filter: blur(32px) saturate(190%);
  -webkit-backdrop-filter: blur(32px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top-color: rgba(255, 255, 255, 0.18);
  box-shadow: 
    0 30px 60px -12px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
}

.apple-glass-card {
  background: radial-gradient(
    120% 120% at 50% 0%, 
    rgba(255, 255, 255, 0.04) 0%, 
    rgba(255, 255, 255, 0.005) 100%
  ), rgba(8, 11, 16, 0.94);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-top-color: rgba(255, 255, 255, 0.16);
  box-shadow: 
    0 20px 40px -10px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
  transition: 
    transform 320ms var(--apple-spring),
    border-color 240ms ease-out,
    box-shadow 320ms var(--apple-spring);
  will-change: transform;
}

.apple-glass-card:hover {
  transform: translateY(-2px);
  border-top-color: rgba(255, 255, 255, 0.28);
  box-shadow: 
    0 28px 50px -10px rgba(0, 0, 0, 0.85),
    0 0 25px rgba(255, 255, 255, 0.04);
}

.apple-interactive {
  transition: 
    transform 300ms var(--apple-spring),
    background-color 200ms ease-out,
    border-color 200ms ease-out,
    box-shadow 300ms var(--apple-spring);
  will-change: transform;
}

.apple-interactive:active {
  transform: scale(0.985);
  transition-duration: 100ms;
}

/* Subtle architectural CAD background */
.cad-grid {
  background-image: linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 80px 80px;
}

/* Accessible focus ring */
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.75);
  outline-offset: 2px;
}

/* Range input styling */
input[type="range"] {
  -webkit-appearance: none;
  background: #18181b;
  border-radius: 999px;
  height: 6px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: transform 150ms var(--apple-spring);
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

input[type="range"]::-webkit-slider-thumb:active {
  transform: scale(0.95);
}
`;

fs.writeFileSync(path.join(appDir, 'globals.css'), globalsCss, 'utf8');
console.log('2. app/globals.css written');

// ==========================================
// 3. components/marketing/marketingData.js (Apple Precision Writing & Structured Models)
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
    client: 'Sample Corporate Client Alpha',
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
    client: 'Sample Financial Enterprise',
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
    client: 'Sample Technology Enterprise',
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
    client: 'Sample Luxury Asset',
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
    action: 'Signed tender baseline locked directly into the system repository.',
    impactRole: 'Baseline Margin',
    impactVal: 'Target locked at 22.8%'
  },
  {
    id: 'budget',
    step: '02',
    title: 'Budget Locked',
    role: 'Quantity Surveyor',
    action: 'Itemized rate analysis mapped with internal cost ceilings per package.',
    impactRole: 'Cost Ceiling',
    impactVal: '₹3.94 Cr maximum expense cap'
  },
  {
    id: 'po_request',
    step: '03',
    title: 'PO Requested',
    role: 'Project Manager',
    action: 'Requisition raised against verified GFC drawing revision and BOQ item.',
    impactRole: 'Item Validation',
    impactVal: '480 m² Oak Veneer Paneling'
  },
  {
    id: 'approval',
    step: '04',
    title: 'Tiered Approval',
    role: 'Founder / Director',
    action: 'Multi-tier Maker-Checker approval with live budget headroom check.',
    impactRole: 'Commitment Added',
    impactVal: '₹19.80L PO committed (24.3% margin)'
  },
  {
    id: 'dispatch',
    step: '05',
    title: 'Vendor Dispatch',
    role: 'Procurement Lead',
    action: 'PO dispatched to approved vendor with digital delivery note (GRN) tracking.',
    impactRole: 'Delivery Window',
    impactVal: 'On-site ETA within 6 days'
  },
  {
    id: 'execution',
    step: '06',
    title: 'Site Execution & DPR',
    role: 'Site Supervisor',
    action: 'Material inspected at site gate, daily labor headcount and photos logged.',
    impactRole: 'DPR Verified',
    impactVal: '67% physical milestone reached'
  },
  {
    id: 'jmr',
    step: '07',
    title: 'Joint Measurement (JMR)',
    role: 'QS & Client PMC',
    action: 'Tripartite measurement sheet verified on-site against architectural grid.',
    impactRole: 'Measurement Sign-Off',
    impactVal: '320 m² work approved by Client PMC'
  },
  {
    id: 'ra_bill',
    step: '08',
    title: 'RA Bill Generated',
    role: 'Billing Head',
    action: 'Client Running Account bill compiled automatically from certified JMRs.',
    impactRole: 'Invoice Raised',
    impactVal: 'RA-04: ₹64.50L (5% retention held)'
  },
  {
    id: 'tally_sync',
    step: '09',
    title: 'Tally & ERP Sync',
    role: 'Finance & Accounts',
    action: 'Two-way XML/API ledger sync: sales invoice, vendor liability & TDS 194C.',
    impactRole: 'Ledger Updated',
    impactVal: 'Synchronized in Tally Prime'
  },
  {
    id: 'collection',
    step: '10',
    title: 'Cash Collection',
    role: 'Managing Director',
    action: 'Payment received via RTGS with UTR reconciliation and retention record.',
    impactRole: 'Cash Realized',
    impactVal: '₹61.27L cleared into bank'
  }
];

export const ROLE_EXPERIENCES = [
  {
    id: 'founder',
    role: 'Founder & Managing Director',
    tagline: 'Multi-Project Margin Command & Cash Visibility',
    description: 'Total financial visibility across active projects. Track real-time gross margin, committed purchase liabilities against tender budgets, and pending director approvals.',
    highlights: [
      'Live portfolio gross margin vs tender baseline across all active sites',
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
    description: 'Map tender BOQs into itemized internal cost ceilings, track GFC drawing revision deltas, and lock purchase orders directly against approved line items.',
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
    role: 'Site Supervisor & Field Engineer',
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
console.log('3. components/marketing/marketingData.js written');

// ==========================================
// 4. Hero.js (Apple Keynote-Level Copy & Typographic Hierarchy)
// ==========================================
const heroCode = `'use client';

import React, { useState } from 'react';
import { ArrowRight, Play, Layers } from 'lucide-react';
import { ARCHITECTURAL_STAGES } from './ArchitecturalCanvas';
import { DEMO_PROJECT, formatINR } from './marketingData';

export default function Hero({ onOpenDemo, onStageSelect, activeStage = 0 }) {
  const [selectedStage, setSelectedStage] = useState(0);

  const handleStageClick = (idx) => {
    setSelectedStage(idx);
    if (onStageSelect) onStageSelect(idx);
  };

  return (
    <section id="overview" className="relative min-h-[92vh] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 pt-32 pb-16 z-10 bg-transparent">
      
      {/* Category Eyebrow */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#080B10]/90 border border-white/15 backdrop-blur-2xl text-slate-200 text-xs mb-6 shadow-xl">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="font-semibold text-white tracking-wide">
          Turnkey Interior & Fit-Out OS
        </span>
        <span className="text-white/20">|</span>
        <span className="text-slate-300">BOQ • Procurement • JMR • RA Billing</span>
      </div>

      {/* Monumental Apple-Style Headline */}
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] apple-headline">
          Run every fit-out project from <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-100 to-white">
            one operating system.
          </span>
        </h1>

        <p className="apple-lead max-w-2xl mx-auto tracking-normal drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          Manage budgets, procurement, execution, billing and project margins from one connected platform. Built specifically for interior and turnkey contracting companies.
        </p>
      </div>

      {/* Primary & Secondary Action Pair */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 w-full sm:w-auto">
        <button
          onClick={onOpenDemo}
          className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 active:scale-95 transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.2)] cursor-pointer apple-interactive"
        >
          <span>Book a 15-Min Demo</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <a
          href="#product"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold text-xs bg-[#080B10]/80 border border-white/20 hover:border-white/40 hover:bg-[#080B10]/95 backdrop-blur-xl transition-all cursor-pointer apple-interactive"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/40" />
          <span>Watch Product Tour</span>
        </a>
      </div>

      {/* Architectural Deconstruction Layer Scrubber */}
      <div className="mt-10 w-full max-w-3xl mx-auto">
        <div className="p-2 rounded-2xl apple-glass shadow-2xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between px-3">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-emerald-400" />
              ARCHITECTURAL DECONSTRUCTION ENGINE
            </span>
            <span className="text-slate-300">INTERACTIVE PROJECT X-RAY</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {ARCHITECTURAL_STAGES.map((st, idx) => {
              const isSelected = (selectedStage ?? activeStage) === idx;
              return (
                <button
                  key={st.id}
                  onClick={() => handleStageClick(idx)}
                  className={\`p-2.5 rounded-xl text-left transition-all text-xs font-mono border cursor-pointer apple-interactive \${
                    isSelected
                      ? 'bg-white text-slate-950 border-white shadow-lg font-bold'
                      : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/30 hover:text-white'
                  }\`}
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <span>0{idx + 1}</span>
                    <span className={\`w-1.5 h-1.5 rounded-full \${isSelected ? 'bg-emerald-600' : 'bg-white/20'}\`} />
                  </div>
                  <div className="text-[11px] font-bold truncate mt-0.5 font-sans">
                    {idx === 0 ? 'Finished Interior' : idx === 1 ? 'Joinery & Framing' : idx === 2 ? 'MEP First-Fix' : 'Bare Concrete'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Early Genuine Product Proof Reveal: Elevation Platform Card */}
      <div className="mt-12 w-full max-w-4xl mx-auto">
        <div className="p-5 sm:p-7 rounded-3xl apple-glass shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-left space-y-4">
          
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  CONSTRUCT-O-GENIE OS • EXECUTIVE PORTFOLIO RADAR
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white font-display">
                  {DEMO_PROJECT.name}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/10 text-[11px] font-mono text-slate-300">
                GFC REV-04.2 LOCKED
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-bold">
                MARGIN PROTECTED 18.4%
              </span>
            </div>
          </div>

          {/* 4 Financial Mechanics Pillars in Hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs tabular-nums">
            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <span className="text-[10px] text-slate-400 block uppercase">Contract Value</span>
              <span className="text-sm sm:text-base font-bold text-white block mt-0.5">{formatINR(DEMO_PROJECT.contractValue, true)}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Signed Tender Scope</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <span className="text-[10px] text-slate-400 block uppercase">Committed Expenses</span>
              <span className="text-sm sm:text-base font-bold text-white block mt-0.5">{formatINR(DEMO_PROJECT.poIssued, true)}</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Within Cost Ceiling</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 font-bold block uppercase">Certified JMR Billing</span>
              <span className="text-sm sm:text-base font-black text-emerald-400 block mt-0.5">{formatINR(DEMO_PROJECT.billedToClient, true)}</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">4 RA Bills Certified</span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <span className="text-[10px] text-slate-400 block uppercase">Cash Collected</span>
              <span className="text-sm sm:text-base font-bold text-white block mt-0.5">{formatINR(DEMO_PROJECT.collectedFromClient, true)}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Tally Sync Verified</span>
            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'Hero.js'), heroCode, 'utf8');
console.log('4. components/marketing/Hero.js written');

// ==========================================
// 5. BusinessOutcomes.js (Three Major Pillars with Authoritative Apple Tone)
// ==========================================
const outcomesCode = `'use client';

import React from 'react';
import { ShieldCheck, Layers, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BusinessOutcomes({ onOpenDemo }) {
  const pillars = [
    {
      id: 'margin',
      num: '01',
      title: 'Protect Margin',
      tagline: 'Track budgets, committed costs and project margin.',
      description: 'Lock tender BOQ selling rates against internal Budget Cost Ceilings (BCC). Every Purchase Order automatically updates committed liability and guards your baseline margin before approval.',
      bulletPoints: [
        'Hard budget caps preventing purchase orders beyond approved rates',
        'Real-time gross margin projection per project and trade package',
        'Automatic variation logging when architectural GFC drawings revise',
      ],
      highlight: 'Committed Cost Protection'
    },
    {
      id: 'execution',
      num: '02',
      title: 'Control Execution',
      tagline: 'Connect BOQ, procurement, approvals and site workflows.',
      description: 'Eliminate disconnected spreadsheets and WhatsApp approvals. Empower site supervisors with mobile Daily Progress Reports (DPR), material GRN verification, and multi-tier Maker-Checker authorization.',
      bulletPoints: [
        'Tiered Maker-Checker approval routing based on PO value threshold',
        'Mobile daily labor headcount, material delivery and photo snagging',
        'Subcontractor measurement entry mapped to itemized work orders',
      ],
      highlight: 'Single Operational Workflow'
    },
    {
      id: 'cash',
      num: '03',
      title: 'Accelerate Cash',
      tagline: 'Connect JMR, RA billing and collections.',
      description: 'Turn site progress into cash faster. Generate certified Joint Measurement Records (JMR) with client PMC sign-offs and produce Running Account (RA) bills with statutory TDS u/s 194C, retention and Tally sync.',
      bulletPoints: [
        'Digital tripartite JMR sign-off against architectural grid coordinates',
        '1-click client RA bill compilation with retention & advance deductions',
        'Direct two-way synchronization with Tally Prime and enterprise ERPs',
      ],
      highlight: '4-Day Billing Turnaround'
    },
  ];

  return (
    <section id="outcomes" className="scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          THREE CORE BUSINESS OUTCOMES
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight apple-headline">
          Engineered for Fit-Out Financial Control.
        </h2>
        <p className="apple-lead font-light">
          Three non-negotiable operational disciplines that protect contracting margins and accelerate cash collection.
        </p>
      </div>

      {/* 3 Outcome Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pillars.map((p) => (
          <div
            key={p.id}
            className="p-6 sm:p-8 rounded-3xl apple-glass shadow-xl flex flex-col justify-between space-y-6 hover:border-white/30 transition-all duration-300 group text-left apple-interactive"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black font-mono text-white/20 group-hover:text-emerald-400 transition-colors">
                  {p.num}
                </span>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase">
                  {p.highlight}
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
                  {p.title}
                </h3>
                <p className="text-xs font-semibold text-emerald-300 font-sans">
                  {p.tagline}
                </p>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {p.description}
              </p>

              <div className="space-y-2 pt-2 border-t border-white/10">
                {p.bulletPoints.map((bp, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{bp}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onOpenDemo}
              className="inline-flex items-center gap-2 text-xs font-bold text-white group-hover:text-emerald-300 transition-colors cursor-pointer uppercase tracking-wider pt-2"
            >
              <span>See in Live Walkthrough</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'BusinessOutcomes.js'), outcomesCode, 'utf8');
console.log('5. components/marketing/BusinessOutcomes.js written');

console.log('All Apple-tier files updated successfully!');
