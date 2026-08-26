const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/Admin/Desktop/Construct-O-Genie';
const marketingDir = path.join(targetDir, 'components/marketing');
const appDir = path.join(targetDir, 'app');

console.log('Writing redesigned Construct-O-Genie components...');

// ==========================================
// 1. Navbar.js
// ==========================================
const navbarCode = `'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X, Layers } from 'lucide-react';

export default function Navbar({ onOpenDemo, onOpenLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = ['overview', 'outcomes', 'product', 'workflow', 'roles', 'integrations', 'roi', 'faq'];
      const scrollPos = window.scrollY + 180;

      for (const s of sections) {
        const el = document.getElementById(s);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(s);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Overview', href: '#overview', id: 'overview' },
    { name: 'Outcomes', href: '#outcomes', id: 'outcomes' },
    { name: 'Platform', href: '#product', id: 'product' },
    { name: 'Workflow', href: '#workflow', id: 'workflow' },
    { name: 'Roles', href: '#roles', id: 'roles' },
    { name: 'Integrations', href: '#integrations', id: 'integrations' },
    { name: 'ROI', href: '#roi', id: 'roi' },
    { name: 'FAQ', href: '#faq', id: 'faq' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 sm:px-6 py-3 sm:py-4 pointer-events-none">
      <nav
        className={\`pointer-events-auto w-full max-w-7xl flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-2xl transition-all duration-300 \${
          scrolled
            ? 'bg-[#080B10]/95 border border-white/15 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)]'
            : 'bg-[#080B10]/75 border border-white/10 backdrop-blur-md'
        }\`}
        aria-label="Main Navigation"
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
              <img
                src="/brand/logo-icon.png"
                alt="Construct-O-Genie"
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="text-left">
              <span className="font-bold text-white text-sm sm:text-base tracking-tight leading-none block font-display">
                Construct-O-Genie
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-wider uppercase block mt-0.5">
                Fit-Out Construction OS
              </span>
            </div>
          </a>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-300">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.name}
                href={link.href}
                className={\`transition-colors py-1 relative \${
                  isActive ? 'text-white font-semibold' : 'text-slate-300 hover:text-white'
                }\`}
              >
                {link.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)] rounded-full" />
                )}
              </a>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 font-medium text-xs">
          <button
            onClick={onOpenLogin}
            className="hidden sm:block px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer font-sans"
          >
            Sign In
          </button>
          
          <button
            onClick={onOpenDemo}
            className="group inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 active:scale-95 transition-all duration-200 shadow-md cursor-pointer tracking-wide"
          >
            <span>Book a 15-Min Demo</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-slate-300 hover:text-white cursor-pointer ml-1"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div 
            className="pointer-events-auto fixed inset-0 bg-black/75 backdrop-blur-sm z-40 xl:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="pointer-events-auto fixed inset-x-4 top-20 max-h-[85vh] overflow-y-auto p-6 rounded-3xl bg-[#080B10]/98 border border-white/20 backdrop-blur-2xl shadow-2xl flex flex-col gap-2.5 text-sm font-medium z-50 xl:hidden">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-slate-200 hover:text-white border-b border-white/10 font-sans"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2.5">
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Sign In to Enterprise Portal
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenDemo(); }}
                className="w-full py-3 rounded-xl bg-white text-slate-950 font-bold text-xs tracking-wide"
              >
                Book a 15-Min Demo
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'Navbar.js'), navbarCode, 'utf8');
console.log('2. Navbar.js written');

// ==========================================
// 2. ArchitecturalCanvas.js (True Deconstruction X-ray Background)
// ==========================================
const canvasCode = `'use client';

import React, { useState, useEffect } from 'react';

export const ARCHITECTURAL_STAGES = [
  {
    id: 1,
    title: 'STAGE 01 : COMPLETED COMMERCIAL FIT-OUT',
    subtitle: 'High-end boardroom joinery, acoustic ceilings, architectural lighting, verified handover',
    src: '/hero-interior.jpg',
  },
  {
    id: 2,
    title: 'STAGE 02 : FRAMING & SUBSTRATES',
    subtitle: 'Partition framing, HDHMR substrate paneling, glazing tracks, millwork substructure',
    src: '/building-stage2.jpg',
  },
  {
    id: 3,
    title: 'STAGE 03 : MEP FIRST-FIX & CEILING GRIDS',
    subtitle: 'Ductwork, fire protection sprinklers, cable trays, linear lighting conduits',
    src: '/building-mep.jpg',
  },
  {
    id: 4,
    title: 'STAGE 04 : BARE CONCRETE SHELL',
    subtitle: 'Base building handover slab, structural columns, perimeter glazing baseline',
    src: '/building-stage3.jpg',
  },
];

export default function ArchitecturalCanvas({ scrollProgress = 0, manualStage = null }) {
  const [internalProgress, setInternalProgress] = useState(0);

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
    // Scroll-linked interpolation
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
            className="absolute inset-0 w-full h-full transition-opacity duration-500 ease-out"
            style={{
              opacity: opacity,
              zIndex: idx,
            }}
          >
            <img
              src={stage.src}
              alt={stage.title}
              loading="eager"
              className="w-full h-full object-cover object-center filter brightness-[0.75] contrast-[1.12] saturate-[1.05]"
              style={{
                transform: \`scale(\${1.01 + scrollProgress * 0.03})\`,
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        );
      })}

      {/* Atmospheric Contrast Layers for pristine text legibility */}
      <div className="absolute inset-0 bg-[#030508]/65 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030508]/85 via-[#030508]/40 to-[#030508]/95 pointer-events-none z-10" />

      {/* Architectural Blueprint CAD Grid & Coordinate Lines */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-10"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
        }}
      />
    </div>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'ArchitecturalCanvas.js'), canvasCode, 'utf8');
console.log('3. ArchitecturalCanvas.js written');

// ==========================================
// 3. Hero.js (Positioning + Deconstruction Scrubber + Early Product Reveal)
// ==========================================
const heroCode = `'use client';

import React, { useState } from 'react';
import { ArrowRight, Play, ShieldCheck, CheckCircle2, ChevronRight, Layers, Lock, FileCheck } from 'lucide-react';
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
      
      {/* Domain Badge */}
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

      {/* Hero Headline & Positioning */}
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] font-display">
          Run every fit-out project from <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-100 to-white">
            one operating system.
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl font-normal text-slate-200 max-w-2xl mx-auto tracking-normal leading-relaxed drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-sans">
          Manage budgets, procurement, execution, billing and project margins from one connected platform. Built specifically for interior and turnkey contracting companies.
        </p>
      </div>

      {/* Standardized Primary & Secondary CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 w-full sm:w-auto">
        <button
          onClick={onOpenDemo}
          className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 active:scale-95 transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.2)] cursor-pointer"
        >
          <span>Book a 15-Min Demo</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <a
          href="#product"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold text-xs bg-[#080B10]/80 border border-white/20 hover:border-white/40 hover:bg-[#080B10]/95 backdrop-blur-xl transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/40" />
          <span>Watch Product Tour</span>
        </a>
      </div>

      {/* Architectural Deconstruction Layer Scrubber */}
      <div className="mt-10 w-full max-w-3xl mx-auto">
        <div className="p-2 rounded-2xl bg-[#080B10]/90 border border-white/15 backdrop-blur-2xl shadow-2xl">
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
                  className={\`p-2.5 rounded-xl text-left transition-all text-xs font-mono border cursor-pointer \${
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

      {/* Early Genuine Product Proof Reveal: Perspective Platform Card */}
      <div className="mt-12 w-full max-w-4xl mx-auto">
        <div className="p-5 sm:p-7 rounded-3xl bg-[#080B10]/95 border border-white/15 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-left space-y-4">
          
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
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
console.log('4. Hero.js written');

// ==========================================
// 4. TrustStrip.js (Honest Positioning & Scale Markers)
// ==========================================
const trustCode = `'use client';

import React from 'react';
import { Building, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function TrustStrip() {
  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative">
      <div className="p-6 sm:p-8 rounded-3xl bg-[#080B10]/85 border border-white/15 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-left">
        
        <div className="max-w-xl space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            ENTERPRISE FIT-OUT GOVERNANCE
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white font-display">
            Built for interior fit-out and turnkey contractors managing complex multi-site execution.
          </h2>
          <p className="text-xs text-slate-300 font-sans">
            Standardized operational controls across corporate offices, luxury hospitality, retail flagships, and high-spec turnkey developments.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto font-mono text-xs shrink-0">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
            <span className="text-base sm:text-lg font-black text-white block">₹1,200+ Cr</span>
            <span className="text-[10px] text-slate-400 block uppercase">Fit-Out Value Monitored</span>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
            <span className="text-base sm:text-lg font-black text-emerald-400 block">450+</span>
            <span className="text-[10px] text-slate-400 block uppercase">Active Commercial Sites</span>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center col-span-2 sm:col-span-1">
            <span className="text-base sm:text-lg font-black text-teal-300 block">100%</span>
            <span className="text-[10px] text-slate-400 block uppercase">Budget Cost Ceiling Capped</span>
          </div>
        </div>

      </div>
    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'TrustStrip.js'), trustCode, 'utf8');
console.log('5. TrustStrip.js written');

// ==========================================
// 5. BusinessOutcomes.js (Three Major Pillars)
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
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
          Engineered for Fit-Out Financial Control.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 font-sans font-light">
          Three non-negotiable operational disciplines that protect contracting margins and accelerate cash collection.
        </p>
      </div>

      {/* 3 Outcome Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pillars.map((p) => (
          <div
            key={p.id}
            className="p-6 sm:p-8 rounded-3xl bg-[#080B10]/90 border border-white/15 backdrop-blur-2xl shadow-xl flex flex-col justify-between space-y-6 hover:border-white/30 transition-all duration-300 group text-left"
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
console.log('6. BusinessOutcomes.js written');

// ==========================================
// 6. ProductExperience.js (Actual Product Interface Showcase with 6 Realistic Tabs)
// ==========================================
const productExperienceCode = `'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Layers, 
  ShoppingCart, 
  Smartphone, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { PORTFOLIO_PROJECTS, BOQ_SAMPLE_ITEMS, DEMO_PROJECT, formatINR } from './marketingData';

export default function ProductExperience({ onOpenDemo }) {
  const [activeTab, setActiveTab] = useState('founder');
  const [selectedBOQItem, setSelectedBOQItem] = useState(BOQ_SAMPLE_ITEMS[0]);
  const [selectedProject, setSelectedProject] = useState(PORTFOLIO_PROJECTS[0]);

  const tabs = [
    { id: 'founder', name: 'Founder Radar', icon: Building2, desc: 'Multi-site margin control & cash runway' },
    { id: 'boq', name: 'Living BOQ Spine', icon: Layers, desc: 'Rate analysis, drawing revisions & budget caps' },
    { id: 'procurement', name: 'Procurement & POs', icon: ShoppingCart, desc: 'Itemized vendor POs with hard budget limits' },
    { id: 'site', name: 'Site DPR & Snagging', icon: Smartphone, desc: 'Mobile daily progress, headcounts & photo snags' },
    { id: 'billing', name: 'JMR & RA Billing', icon: FileText, desc: 'Joint measurements & certified client RA bills' },
    { id: 'finance', name: 'Tally & ERP Sync', icon: RefreshCw, desc: 'Two-way XML/API sync for ledgers & TDS 194C' },
  ];

  return (
    <section id="product" className="scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          AUTHENTIC SOFTWARE EXPERIENCE
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
          The Operating System in Action.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 font-sans font-light">
          Real enterprise software designed for the real workflows and financial mechanics of fit-out businesses.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={\`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border shrink-0 \${
                isActive
                  ? 'bg-white text-slate-950 border-white shadow-xl scale-[1.02]'
                  : 'bg-[#080B10]/80 border-white/10 text-slate-300 hover:border-white/30 hover:text-white'
              }\`}
            >
              <Icon className={\`w-4 h-4 \${isActive ? 'text-slate-950' : 'text-emerald-400'}\`} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Module Frame */}
      <div className="p-5 sm:p-8 rounded-3xl bg-[#080B10]/95 border border-white/15 backdrop-blur-2xl shadow-2xl text-left">
        
        {/* TAB 1: FOUNDER RADAR */}
        {activeTab === 'founder' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  DEMO DATA • EXECUTIVE COMMAND CONSOLE
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Multi-Site Profit & Risk Radar
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                  ALL 4 SITES BUDGET-LOCKED
                </span>
              </div>
            </div>

            {/* Project Selector Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PORTFOLIO_PROJECTS.map((proj) => {
                const isSelected = proj.id === selectedProject.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className={\`p-3.5 rounded-2xl text-left transition-all border cursor-pointer \${
                      isSelected
                        ? 'bg-white text-slate-950 border-white shadow-lg'
                        : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
                    }\`}
                  >
                    <div className={\`text-[10px] font-mono uppercase truncate \${isSelected ? 'text-slate-600 font-bold' : 'text-slate-400'}\`}>
                      {proj.location}
                    </div>
                    <div className="font-bold text-xs sm:text-sm truncate mt-0.5 font-display">
                      {proj.name}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-current/15 text-[11px] font-mono">
                      <span>{formatINR(proj.value, true)}</span>
                      <span className={\`font-bold \${isSelected ? 'text-emerald-800' : 'text-emerald-400'}\`}>
                        {proj.margin}% Margin
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Metrics Panel for Selected Project */}
            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Selected Workspace</span>
                  <div className="text-lg font-bold text-white font-display">{selectedProject.name} ({selectedProject.area})</div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-slate-400 block uppercase text-[10px]">Physical Milestone</span>
                  <span className="text-emerald-400 font-bold text-base">{selectedProject.progress}% Completed</span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase">Contract Value</span>
                  <span className="text-base font-bold text-white block mt-0.5">{formatINR(selectedProject.value, true)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Approved Scope</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase">Committed Expenses</span>
                  <span className="text-base font-bold text-white block mt-0.5">{formatINR(selectedProject.committedCost, true)}</span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">Within Cost Limit</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase">Protected Gross Margin</span>
                  <span className="text-base font-black text-emerald-400 block mt-0.5">{selectedProject.margin}% Realized</span>
                  <span className="text-[10px] text-emerald-300 block mt-0.5">Baseline Target Met</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase">Pending Director Approvals</span>
                  <span className="text-base font-bold text-amber-400 block mt-0.5">{selectedProject.pendingApprovals} High-Value POs</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">&gt; ₹5.00L Tier</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVING BOQ SPINE */}
        {activeTab === 'boq' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  DEMO DATA • LIVING BOQ SPINE & RATE ANALYSIS
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Itemized Rate Breakdown & Budget Cost Ceilings
                </h3>
              </div>
              <span className="px-3 py-1 rounded-md bg-white/[0.06] border border-white/10 text-xs font-mono text-slate-300">
                GFC Takeoff: REV-04.2
              </span>
            </div>

            {/* Desktop Table / Mobile Card Switcher */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/15 text-[10px] font-mono text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3">Trade Package & Description</th>
                    <th className="py-2.5 px-3">Qty / Unit</th>
                    <th className="py-2.5 px-3">Client Rate</th>
                    <th className="py-2.5 px-3">Cost Ceiling</th>
                    <th className="py-2.5 px-3">Committed PO</th>
                    <th className="py-2.5 px-3">Margin</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-mono">
                  {BOQ_SAMPLE_ITEMS.map((item) => {
                    const isSelected = item.id === selectedBOQItem.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedBOQItem(item)}
                        className={\`cursor-pointer transition-colors \${
                          isSelected ? 'bg-white/10' : 'hover:bg-white/[0.04]'
                        }\`}
                      >
                        <td className="py-3 px-3 font-bold text-emerald-400">{item.code}</td>
                        <td className="py-3 px-3 font-sans font-medium text-white max-w-xs">
                          <span className="font-bold text-slate-300 block text-[11px]">{item.package}</span>
                          <span className="text-slate-400 text-[10px] truncate block">{item.desc}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{item.tenderQty} {item.unit}</td>
                        <td className="py-3 px-3 text-white font-bold">{formatINR(item.clientRate)}</td>
                        <td className="py-3 px-3 text-slate-300">{formatINR(item.budgetCostRate)}</td>
                        <td className="py-3 px-3 text-emerald-400">{formatINR(item.poCommitted)}</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">{item.marginPct}%</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                            LOCKED
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Progressive Disclosure Card for selected BOQ line */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-sans">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Selected Line Item</span>
                <div className="text-sm font-bold text-white">{selectedBOQItem.code} • {selectedBOQItem.package}</div>
                <div className="text-xs text-slate-300 mt-0.5">Drawing Reference: {selectedBOQItem.drawingRef} ({selectedBOQItem.gfcRevision})</div>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Budget</span>
                  <span className="font-bold text-white">{formatINR(selectedBOQItem.totalBudget)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">PO Balance</span>
                  <span className="font-bold text-emerald-400">{formatINR(selectedBOQItem.poBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROCUREMENT & PO ENGINE */}
        {activeTab === 'procurement' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  DEMO DATA • MAKER-CHECKER PROCUREMENT ENGINE
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Itemized Purchase Orders with Hard Budget Caps
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                BUDGET HEADROOM CHECKED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">PO-26041-042 • Joinery Package</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono font-bold text-[10px]">APPROVED</span>
                </div>
                <div className="text-base font-bold text-white font-display">WoodCraft Studio & Atelier</div>
                <p className="text-slate-300 text-xs">Bespoke Fluted Oak Veneer Paneling (480 m²) for Executive Boardroom</p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px]">PO VALUE</span>
                    <span className="font-bold text-white">₹19.80L</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">BUDGET CEILING</span>
                    <span className="font-bold text-slate-300">₹26.16L</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">MARGIN AFTER PO</span>
                    <span className="font-bold text-emerald-400">24.3%</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">PO-26041-043 • Electrical Package</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono font-bold text-[10px]">DIRECTOR APPROVAL PENDING</span>
                </div>
                <div className="text-base font-bold text-white font-display">Lumina Tech Systems</div>
                <p className="text-slate-300 text-xs">DALI Dimming Linear Profiles & Drivers (620 R.Mtr) for Open Workspace</p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px]">PO VALUE</span>
                    <span className="font-bold text-white">₹17.25L</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">BUDGET CEILING</span>
                    <span className="font-bold text-slate-300">₹21.39L</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">MARGIN AFTER PO</span>
                    <span className="font-bold text-emerald-400">28.1%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs font-sans">
              <div className="flex items-center gap-2 text-slate-200">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero unapproved commitments: Purchase orders cannot be issued if rates or quantities exceed approved BOQ caps.</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SITE DPR & SNAGGING */}
        {activeTab === 'site' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  DEMO DATA • MOBILE SITE EXECUTION & DPR
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Daily Progress Reports & Photo Snagging
                </h3>
              </div>
              <span className="px-3 py-1 rounded-md bg-white/[0.06] border border-white/10 text-xs font-mono text-slate-300">
                Today: 42 Active Workers On Site
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Trade Headcount</span>
                <div className="text-sm font-bold text-white">Carpentry: 18 • Electrical: 12 • Painting: 8 • MEP: 4</div>
                <span className="text-[10px] font-mono text-emerald-400 block">Verified via Gate Pass</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Material GRN Inward</span>
                <div className="text-sm font-bold text-white">480 m² Oak Veneer received with physical QC inspection</div>
                <span className="text-[10px] font-mono text-emerald-400 block">PO #26041-042 Match</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Floor Plan Pin Snag</span>
                <div className="text-sm font-bold text-white">Grid D-4: Linear fixture conduit clearance flagged</div>
                <span className="text-[10px] font-mono text-amber-400 block">Assigned to MEP PM</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: JMR & RA BILLING */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  DEMO DATA • CERTIFIED JMR & RA BILLING
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Tripartite Measurement to Client RA Invoice
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                JMR-04 SIGNED BY PMC
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 font-sans">
                <div>
                  <div className="text-sm font-bold text-white">Client Running Account Bill #04</div>
                  <div className="text-xs text-slate-400">Horizon Workspace • Level 14 Executive Floor</div>
                </div>
                <span className="text-emerald-400 font-mono font-bold text-sm">₹64,50,000 Verified</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div className="p-2.5 rounded-lg bg-white/[0.04]">
                  <span className="text-slate-400 block text-[9px]">GROSS JMR VALUE</span>
                  <span className="font-bold text-white">₹64.50L</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.04]">
                  <span className="text-slate-400 block text-[9px]">5% RETENTION HELD</span>
                  <span className="font-bold text-amber-400">-₹3.22L</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.04]">
                  <span className="text-slate-400 block text-[9px]">MOBILIZATION RECOVERY</span>
                  <span className="font-bold text-slate-300">-₹6.45L</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-400 block text-[9px]">NET PAYABLE FROM CLIENT</span>
                  <span className="font-black text-emerald-400">₹54.83L</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: TALLY & ERP SYNC */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  DEMO DATA • TWO-WAY ACCOUNTING ENGINE
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Tally Prime & Enterprise ERP Synchronization
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                TALLY PRIME CONNECTED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Automatic Ledger Postings</span>
                <p className="text-slate-300 leading-relaxed">
                  Vendor purchase vouchers, contractor TDS u/s 194C (1% or 2%), and GST e-invoices are pushed directly to Tally Prime without re-typing.
                </p>
                <div className="text-[10px] font-mono text-emerald-400">Sync Status: Real-time via Direct XML Connector</div>
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Bank UTR & Payment Reconciliation</span>
                <p className="text-slate-300 leading-relaxed">
                  When finance clears a vendor payment in Tally or NetBanking, the UTR reference number automatically updates the Construct-O-Genie PO ledger.
                </p>
                <div className="text-[10px] font-mono text-emerald-400">UTR Reconciliation: Active</div>
              </div>
            </div>
          </div>
        )}

      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'ProductExperience.js'), productExperienceCode, 'utf8');
console.log('7. ProductExperience.js written');

// ==========================================
// 7. MasterWorkflow.js (Horizontally connected 10-step fit-out journey)
// ==========================================
const workflowCode = `'use client';

import React, { useState } from 'react';
import { WORKFLOW_STAGES } from './marketingData';
import { GitCommit, ArrowRight, ShieldCheck } from 'lucide-react';

export default function MasterWorkflow({ onOpenDemo }) {
  const [activeStepId, setActiveStepId] = useState(WORKFLOW_STAGES[3].id);

  const activeStage = WORKFLOW_STAGES.find((s) => s.id === activeStepId) || WORKFLOW_STAGES[0];

  return (
    <section id="workflow" className="scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md">
          <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
          END-TO-END FIT-OUT LIFECYCLE
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
          From Signed Tender to Final Handover.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 font-sans font-light">
          One continuous data pipeline connecting Commercial, Quantity Surveying, Procurement, Site, Billing and Finance.
        </p>
      </div>

      {/* Horizontal Stepper (Desktop) / Vertical Steps (Mobile) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#080B10]/95 border border-white/15 backdrop-blur-2xl shadow-2xl text-left space-y-8">
        
        {/* Step Chips Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {WORKFLOW_STAGES.map((st) => {
            const isSelected = st.id === activeStepId;
            return (
              <button
                key={st.id}
                onClick={() => setActiveStepId(st.id)}
                className={\`p-2.5 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between \${
                  isSelected
                    ? 'bg-white text-slate-950 border-white shadow-lg font-bold scale-[1.03]'
                    : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/30 hover:text-white'
                }\`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span>{st.step}</span>
                  <span className={\`w-1.5 h-1.5 rounded-full \${isSelected ? 'bg-emerald-600' : 'bg-white/20'}\`} />
                </div>
                <div className="text-[11px] font-semibold truncate mt-1 font-sans">
                  {st.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Inspector Panel */}
        <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">
                STAGE {activeStage.step} • {activeStage.title}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                Responsible Role: {activeStage.role}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-right font-mono">
              <span className="text-[10px] text-emerald-400 block uppercase font-bold">{activeStage.impactRole}</span>
              <span className="text-sm sm:text-base font-black text-emerald-300">{activeStage.impactVal}</span>
            </div>
          </div>

          <p className="text-sm text-slate-200 font-sans leading-relaxed">
            {activeStage.action}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-sans text-slate-400">
            <span>Every step feeds clean financial data to the next department automatically.</span>
            <button
              onClick={onOpenDemo}
              className="inline-flex items-center gap-1.5 font-bold text-white hover:text-emerald-300 transition-colors uppercase tracking-wider shrink-0"
            >
              <span>Schedule Live Walkthrough</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'MasterWorkflow.js'), workflowCode, 'utf8');
console.log('8. MasterWorkflow.js written');

// ==========================================
// 8. RoleWorkspaces.js (Tailored Experiences for 5 Personas)
// ==========================================
const roleWorkspacesCode = `'use client';

import React, { useState } from 'react';
import { ROLE_EXPERIENCES } from './marketingData';
import { Users, CheckCircle2, ArrowRight } from 'lucide-react';

export default function RoleWorkspaces({ onOpenDemo }) {
  const [activeRoleId, setActiveRoleId] = useState(ROLE_EXPERIENCES[0].id);

  const activeRole = ROLE_EXPERIENCES.find((r) => r.id === activeRoleId) || ROLE_EXPERIENCES[0];

  return (
    <section id="roles" className="scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          ROLE-SPECIFIC WORKSPACES
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
          Purpose-Built for Every Fit-Out Stakeholder.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 font-sans font-light">
          From founders looking at company-wide margins to site engineers recording daily labor headcounts.
        </p>
      </div>

      {/* Role Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-6">
        {ROLE_EXPERIENCES.map((role) => {
          const isSelected = role.id === activeRoleId;
          return (
            <button
              key={role.id}
              onClick={() => setActiveRoleId(role.id)}
              className={\`p-3.5 rounded-2xl text-left transition-all border cursor-pointer \${
                isSelected
                  ? 'bg-white text-slate-950 border-white shadow-xl scale-[1.02]'
                  : 'bg-[#080B10]/80 border-white/10 text-slate-300 hover:border-white/30 hover:text-white'
              }\`}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider truncate opacity-70">
                WORKSPACE
              </div>
              <div className="font-bold text-xs sm:text-sm truncate mt-0.5 font-display">
                {role.role.split('/')[0]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Role Content Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#080B10]/95 border border-white/15 backdrop-blur-2xl shadow-2xl text-left space-y-6">
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">
              {activeRole.tagline}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
              {activeRole.role}
            </h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-right font-mono">
            <span className="text-[10px] text-emerald-400 block uppercase font-bold">{activeRole.sampleMetric.label}</span>
            <span className="text-base sm:text-lg font-black text-emerald-300">{activeRole.sampleMetric.value}</span>
            <span className="text-[9px] text-slate-400 block font-sans">{activeRole.sampleMetric.sub}</span>
          </div>
        </div>

        <p className="text-sm text-slate-200 font-sans leading-relaxed">
          {activeRole.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {activeRole.highlights.map((hl, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-black/50 border border-white/10 flex items-start gap-2.5 text-xs text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{hl}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-slate-950 text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors"
          >
            <span>Explore {activeRole.role.split('/')[0]} View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'RoleWorkspaces.js'), roleWorkspacesCode, 'utf8');
console.log('9. RoleWorkspaces.js written');

// ==========================================
// 9. IntegrationsSection.js (Honest Connectivity Modes)
// ==========================================
const integrationsCode = `'use client';

import React from 'react';
import { INTEGRATIONS_LIST } from './marketingData';
import { RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

export default function IntegrationsSection({ onOpenDemo }) {
  return (
    <section id="integrations" className="scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          ENTERPRISE ACCOUNTING & ERP CONNECTIVITY
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
          Synchronizes with Your Existing Financial Ledgers.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 font-sans font-light">
          Direct two-way synchronization for purchase vouchers, vendor liabilities, statutory TDS u/s 194C, and client sales bills.
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {INTEGRATIONS_LIST.map((integ) => (
          <div
            key={integ.name}
            className="p-6 rounded-3xl bg-[#080B10]/90 border border-white/15 backdrop-blur-2xl shadow-xl flex flex-col justify-between space-y-4 hover:border-white/30 transition-all text-left"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  {integ.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                  {integ.badge}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  {integ.name}
                </h3>
                <span className="text-[11px] font-mono text-emerald-300 block mt-0.5">
                  Protocol: {integ.type}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {integ.desc}
              </p>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Bi-directional Data Flow</span>
              <span className="text-emerald-400 font-bold">Verified</span>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'IntegrationsSection.js'), integrationsCode, 'utf8');
console.log('10. IntegrationsSection.js written');

// ==========================================
// 10. CaseBreakdown.js (Modelled Reference Project with Before vs After)
// ==========================================
const caseBreakdownCode = `'use client';

import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function CaseBreakdown({ onOpenDemo }) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative">
      
      <div className="p-6 sm:p-10 rounded-3xl bg-[#080B10]/95 border border-white/15 backdrop-blur-2xl shadow-2xl space-y-8 text-left">
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
              MODELLED REFERENCE CASE STUDY
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display mt-0.5">
              ₹48.25 Cr Turnkey Corporate Fit-Out (42,500 sq.ft)
            </h2>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-right font-mono text-xs">
            <span className="text-slate-400 block uppercase text-[10px]">Contract Duration</span>
            <span className="text-white font-bold">14 Weeks Fast-Track</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Before Column */}
          <div className="p-5 sm:p-6 rounded-2xl bg-red-500/[0.04] border border-red-500/20 space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold font-display text-base">
              <XCircle className="w-5 h-5" />
              <span>Before Construct-O-Genie</span>
            </div>
            <div className="space-y-2.5 text-xs text-slate-300 font-sans">
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span>Tender BOQs managed in disconnected Excel sheets with untracked rate formulas.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span>Site engineers ordered extra materials via WhatsApp with no prior margin check.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span>Joint Measurement Records (JMR) took 28+ days to sign off with client PMCs.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span>Final gross profit eroded by 6% due to unbilled architectural scope revisions.</span>
              </div>
            </div>
          </div>

          {/* After Column */}
          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold font-display text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>With Construct-O-Genie OS</span>
            </div>
            <div className="space-y-2.5 text-xs text-slate-200 font-sans">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>100% purchase orders budget-locked directly against internal cost ceilings.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>High-value POs routed to Director mobile with instant margin impact visibility.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Digital JMR certified in 4 days with 1-click Running Account bill generation.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Baseline project margin protected at 18.4% with full Tally ledger reconciliation.</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'CaseBreakdown.js'), caseBreakdownCode, 'utf8');
console.log('11. CaseBreakdown.js written');

// ==========================================
// 11. ROICalculator.js (Interactive Sliders & Margin Impact Output)
// ==========================================
const roiCalculatorCode = `'use client';

import React, { useState } from 'react';
import { Calculator, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatINR } from './marketingData';

export default function ROICalculator({ onOpenDemo }) {
  const [turnoverCr, setTurnoverCr] = useState(50); // ₹50 Cr
  const [marginPct, setMarginPct] = useState(20);   // 20% Gross Margin
  const [leakagePct, setLeakagePct] = useState(4.5); // 4.5% Unbilled Leakage

  const annualRevenue = turnoverCr * 10000000;
  const annualMarginLeakagePrevented = annualRevenue * (leakagePct / 100);
  const daysSavedInBilling = Math.round(18 + (turnoverCr / 25));

  return (
    <section id="roi" className="scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md">
          <Calculator className="w-3.5 h-3.5 text-emerald-400" />
          PROFIT LEAKAGE SIMULATOR
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
          Calculate Your Protected Margin.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 font-sans font-light">
          Simulate how eliminating unbilled scope changes and procurement overruns impacts your bottom line.
        </p>
      </div>

      <div className="p-6 sm:p-10 rounded-3xl bg-[#080B10]/95 border border-white/15 backdrop-blur-2xl shadow-2xl text-left">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          {/* Controls Column */}
          <div className="space-y-6">
            
            {/* Turnover Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 uppercase">Annual Fit-Out Turnover</span>
                <span className="text-base font-bold text-white">₹{turnoverCr} Crores</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={turnoverCr}
                onChange={(e) => setTurnoverCr(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>₹10 Cr</span>
                <span>₹250 Cr</span>
                <span>₹500 Cr+</span>
              </div>
            </div>

            {/* Target Margin Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 uppercase">Target Gross Margin</span>
                <span className="text-base font-bold text-emerald-400">{marginPct}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="35"
                step="0.5"
                value={marginPct}
                onChange={(e) => setMarginPct(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>10%</span>
                <span>20%</span>
                <span>35%</span>
              </div>
            </div>

            {/* Scope Leakage Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 uppercase">Estimated Unbilled Scope & Leakage</span>
                <span className="text-base font-bold text-amber-400">{leakagePct}%</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={leakagePct}
                onChange={(e) => setLeakagePct(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>1% (Low)</span>
                <span>4.5% (Typical)</span>
                <span>8% (Severe)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-sans italic">
              Modelled assumption — adjust sliders to match your company's actual operating profile.
            </p>
          </div>

          {/* Results Column */}
          <div className="p-6 sm:p-8 rounded-2xl bg-black/60 border border-white/10 space-y-6">
            
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                ESTIMATED ANNUAL VALUE RECOVERED
              </span>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono">
                {formatINR(annualMarginLeakagePrevented, true)}
              </div>
              <span className="text-xs text-slate-300 font-sans block mt-1">
                Direct profit protected from unapproved material orders and untracked client revisions.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 font-mono text-xs">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase">Billing Cycle Turnaround</span>
                <span className="text-base font-bold text-emerald-400 block mt-0.5">~4 Days</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">vs 25+ days manual</span>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-slate-400 block text-[9px] uppercase">Cash Flow Velocity</span>
                <span className="text-base font-bold text-white block mt-0.5">+{daysSavedInBilling} Days</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Faster collection</span>
              </div>
            </div>

            <button
              onClick={onOpenDemo}
              className="w-full py-3.5 rounded-xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Calculate My ROI on Live Projects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'ROICalculator.js'), roiCalculatorCode, 'utf8');
console.log('12. ROICalculator.js written');

// ==========================================
// 12. FAQSection.js (6 Deep Domain Q&As)
// ==========================================
const faqCode = `'use client';

import React, { useState } from 'react';
import { FAQS } from './marketingData';
import { HelpCircle, ChevronDown } from 'lucide-react';

export default function FAQSection({ onOpenDemo }) {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto z-10 relative">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
          FREQUENTLY ASKED QUESTIONS
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
          Operational & Technical Answers.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 font-sans font-light">
          Everything you need to know about implementing Construct-O-Genie across your fit-out operations.
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-3 text-left">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-[#080B10]/90 border border-white/15 backdrop-blur-2xl shadow-md overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                aria-expanded={isOpen}
              >
                <span className="font-bold text-sm sm:text-base text-white font-display">
                  {faq.q}
                </span>
                <ChevronDown
                  className={\`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 \${
                    isOpen ? 'rotate-180 text-emerald-400' : ''
                  }\`}
                />
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-slate-300 font-sans leading-relaxed border-t border-white/10 pt-4">
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
console.log('13. FAQSection.js written');

// ==========================================
// 13. FinalCTA.js (High-Conversion Restrained Banner)
// ==========================================
const finalCtaCode = `'use client';

import React from 'react';
import { ArrowRight, Play, ShieldCheck } from 'lucide-react';

export default function FinalCTA({ onOpenDemo }) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto z-10 relative">
      <div className="p-8 sm:p-14 rounded-3xl bg-[#080B10]/95 border border-white/15 backdrop-blur-3xl shadow-2xl text-center space-y-6">
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-mono text-[11px] uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          BRING FINANCIAL CERTAINTY TO FIT-OUT EXECUTION
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight font-display max-w-3xl mx-auto leading-tight">
          Bring financial certainty to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-100 to-white">
            every square foot.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto font-sans leading-relaxed">
          Schedule a 15-minute operational walkthrough tailored to your active sites and contracting volume.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <button
            onClick={onOpenDemo}
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 active:scale-95 transition-all shadow-xl cursor-pointer"
          >
            <span>Book a 15-Min Demo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <a
            href="#product"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold text-xs bg-black/40 border border-white/20 hover:border-white/40 hover:bg-black/60 backdrop-blur-xl transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/40" />
            <span>Watch Product Tour</span>
          </a>
        </div>

        <div className="pt-6 text-[11px] font-mono text-slate-400">
          Turnkey Interior OS • Tally & SAP Sync • Zero Commitments Beyond Budget
        </div>

      </div>
    </section>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'FinalCTA.js'), finalCtaCode, 'utf8');
console.log('14. FinalCTA.js written');

// ==========================================
// 14. Footer.js (Structured Enterprise Footer)
// ==========================================
const footerCode = `'use client';

import React from 'react';

export default function Footer({ onOpenDemo, onOpenLogin }) {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#040609] pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-left font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
        
        {/* Col 1: Brand Info */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/logo-icon.png"
              alt="Construct-O-Genie"
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-white text-base font-display">
              Construct-O-Genie
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            The operating system for interior fit-out, turnkey contracting and project execution businesses. Living BOQ Spine, mobile DPRs, maker-checker approvals and direct Tally/SAP synchronization.
          </p>
          <div className="text-[11px] font-mono text-slate-400">
            Enterprise Architecture • Built in India for Global Turnkey Operations
          </div>
        </div>

        {/* Col 2: Product */}
        <div className="space-y-3 text-xs">
          <div className="font-bold text-white font-mono uppercase tracking-wider text-[10px]">Product</div>
          <ul className="space-y-2 text-slate-400">
            <li><a href="#product" className="hover:text-white transition-colors">Founder Radar</a></li>
            <li><a href="#product" className="hover:text-white transition-colors">Living BOQ Spine</a></li>
            <li><a href="#product" className="hover:text-white transition-colors">Procurement Engine</a></li>
            <li><a href="#product" className="hover:text-white transition-colors">Site DPR & Snagging</a></li>
            <li><a href="#product" className="hover:text-white transition-colors">JMR & RA Billing</a></li>
          </ul>
        </div>

        {/* Col 3: Integrations & Roles */}
        <div className="space-y-3 text-xs">
          <div className="font-bold text-white font-mono uppercase tracking-wider text-[10px]">Integrations</div>
          <ul className="space-y-2 text-slate-400">
            <li><a href="#integrations" className="hover:text-white transition-colors">Tally Prime Sync</a></li>
            <li><a href="#integrations" className="hover:text-white transition-colors">SAP ECC / S4HANA</a></li>
            <li><a href="#integrations" className="hover:text-white transition-colors">Zoho Books</a></li>
            <li><a href="#integrations" className="hover:text-white transition-colors">Excel BOQ Import</a></li>
            <li><a href="#integrations" className="hover:text-white transition-colors">Custom REST APIs</a></li>
          </ul>
        </div>

        {/* Col 4: Company & Security */}
        <div className="space-y-3 text-xs">
          <div className="font-bold text-white font-mono uppercase tracking-wider text-[10px]">Security & Legal</div>
          <ul className="space-y-2 text-slate-400">
            <li><span className="text-slate-400">Data Privacy & Encryption</span></li>
            <li><span className="text-slate-400">Role-Based Access (RBAC)</span></li>
            <li><span className="text-slate-400">Audit Trail Logging</span></li>
            <li><button onClick={onOpenDemo} className="hover:text-white transition-colors text-left">Book a 15-Min Demo</button></li>
            <li><button onClick={onOpenLogin} className="hover:text-white transition-colors text-left">Client & Vendor Portal</button></li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
        <div>
          © {new Date().getFullYear()} Construct-O-Genie Technologies. All rights reserved.
        </div>
        <div>
          Fit-Out Construction Operating System
        </div>
      </div>
    </footer>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'Footer.js'), footerCode, 'utf8');
console.log('15. Footer.js written');

// ==========================================
// 15. BookDemoModal.js (High-Conversion Frictionless Scheduling Modal)
// ==========================================
const bookDemoCode = `'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function BookDemoModal({ isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    workEmail: '',
    companyName: '',
    annualTurnover: '₹20 Cr - ₹50 Cr',
    activeProjects: '3 - 8 Projects',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#080B10] border border-white/20 backdrop-blur-2xl shadow-2xl text-left z-10 space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4 font-sans">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white font-display">
              Demo Request Scheduled
            </h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Thank you. Our enterprise solutions team has received your information for <span className="text-white font-semibold">{formData.companyName || 'your company'}</span>. We will connect with a tailored product walkthrough link.
            </p>
            <button
              onClick={() => { setSubmitted(false); onClose(); }}
              className="px-6 py-2.5 rounded-xl bg-white text-slate-950 text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold block">
                15-MINUTE OPERATIONAL WALKTHROUGH
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                Book a 15-Min Demo
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                See live margin locking, mobile DPRs and Tally sync configured for your contracting volume.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="director@fitoutcontractor.com"
                  value={formData.workEmail}
                  onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="Atelier Interiors & Projects"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Annual Turnover</label>
                  <select
                    value={formData.annualTurnover}
                    onChange={(e) => setFormData({ ...formData, annualTurnover: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-white transition-colors"
                  >
                    <option value="₹5 Cr - ₹20 Cr">₹5 Cr - ₹20 Cr</option>
                    <option value="₹20 Cr - ₹50 Cr">₹20 Cr - ₹50 Cr</option>
                    <option value="₹50 Cr - ₹150 Cr">₹50 Cr - ₹150 Cr</option>
                    <option value="₹150 Cr+">₹150 Cr+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Active Projects</label>
                  <select
                    value={formData.activeProjects}
                    onChange={(e) => setFormData({ ...formData, activeProjects: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-white transition-colors"
                  >
                    <option value="1 - 3 Projects">1 - 3 Projects</option>
                    <option value="3 - 8 Projects">3 - 8 Projects</option>
                    <option value="8 - 20 Projects">8 - 20 Projects</option>
                    <option value="20+ Projects">20+ Projects</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-4"
            >
              <span>Continue to Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strictly confidential • No spam • NDA protected</span>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'BookDemoModal.js'), bookDemoCode, 'utf8');
console.log('16. BookDemoModal.js written');

// ==========================================
// 16. SignInModal.js (Enterprise Portal Modal)
// ==========================================
const signInCode = `'use client';

import React, { useState } from 'react';
import { X, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function SignInModal({ isOpen, onClose }) {
  const [role, setRole] = useState('founder');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    alert(\`Demo sign-in simulated for \${role} role (\${email || 'demo@constructogenie.in'}).\`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#080B10] border border-white/20 backdrop-blur-2xl shadow-2xl text-left z-10 space-y-6 font-sans">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
            SECURE ENTERPRISE PORTAL
          </span>
          <h3 className="text-xl font-bold text-white font-display mt-0.5">
            Sign In to Construct-O-Genie
          </h3>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Select Workspace</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-white transition-colors"
            >
              <option value="founder">Founder / Managing Director</option>
              <option value="qs">Quantity Surveyor & Estimator</option>
              <option value="pm">Project Manager</option>
              <option value="site">Site Supervisor (DPR)</option>
              <option value="finance">Finance & Accounts Head</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Work Email</label>
            <input
              type="email"
              required
              placeholder="user@fitoutfirm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-2"
          >
            <span>Access Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Role-Based Access Control (RBAC) • SSL 256-Bit</span>
        </div>

      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'SignInModal.js'), signInCode, 'utf8');
console.log('17. SignInModal.js written');

// ==========================================
// 17. ConstructOGenieApp.js (Clean Main Orchestrator)
// ==========================================
const appCode = `'use client';

import React, { useState, useEffect } from 'react';
import ArchitecturalCanvas from './ArchitecturalCanvas';
import Navbar from './Navbar';
import Hero from './Hero';
import TrustStrip from './TrustStrip';
import BusinessOutcomes from './BusinessOutcomes';
import ProductExperience from './ProductExperience';
import MasterWorkflow from './MasterWorkflow';
import RoleWorkspaces from './RoleWorkspaces';
import IntegrationsSection from './IntegrationsSection';
import CaseBreakdown from './CaseBreakdown';
import ROICalculator from './ROICalculator';
import FAQSection from './FAQSection';
import FinalCTA from './FinalCTA';
import Footer from './Footer';
import BookDemoModal from './BookDemoModal';
import SignInModal from './SignInModal';

export default function ConstructOGenieApp() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);

  // High-performance scroll listener for architectural deconstruction background
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            const current = window.scrollY;
            const progress = Math.min(Math.max(current / docHeight, 0), 1);
            setScrollProgress(progress);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 selection:bg-white/20 selection:text-white antialiased font-sans relative">
      
      {/* 1. PERSISTENT ARCHITECTURAL DECONSTRUCTION BACKGROUND CANVAS */}
      <ArchitecturalCanvas 
        scrollProgress={scrollProgress}
        manualStage={activeStage}
      />

      {/* 2. FLOATING ENTERPRISE NAVBAR */}
      <Navbar 
        onOpenDemo={() => setDemoOpen(true)} 
        onOpenLogin={() => setLoginOpen(true)} 
      />

      {/* 3. CONSOLIDATED ENTERPRISE SECTIONS */}
      <main className="relative z-10 space-y-16 sm:space-y-24">
        
        {/* 01. Cinematic Deconstruction Hero & Early Product Reveal */}
        <Hero 
          onOpenDemo={() => setDemoOpen(true)}
          onStageSelect={(idx) => setActiveStage(idx)}
          activeStage={activeStage}
        />

        {/* 02. Trust & Positioning Strip */}
        <TrustStrip />

        {/* 03. Three Core Business Outcomes */}
        <BusinessOutcomes 
          onOpenDemo={() => setDemoOpen(true)}
        />

        {/* 04. Actual Product Experience (Interactive Enterprise Showcase) */}
        <ProductExperience 
          onOpenDemo={() => setDemoOpen(true)}
        />

        {/* 05. End-to-End Master Workflow */}
        <MasterWorkflow 
          onOpenDemo={() => setDemoOpen(true)}
        />

        {/* 06. Role-Based Dedicated Workspaces */}
        <RoleWorkspaces 
          onOpenDemo={() => setDemoOpen(true)}
        />

        {/* 07. Enterprise Integrations */}
        <IntegrationsSection 
          onOpenDemo={() => setDemoOpen(true)}
        />

        {/* 08. Modelled Case Breakdown (Before vs After) */}
        <CaseBreakdown 
          onOpenDemo={() => setDemoOpen(true)}
        />

        {/* 09. Interactive Profit Margin Simulator */}
        <ROICalculator 
          onOpenDemo={() => setDemoOpen(true)}
        />

        {/* 10. Frequently Asked Questions */}
        <FAQSection 
          onOpenDemo={() => setDemoOpen(true)}
        />

        {/* 11. Final Call to Action */}
        <FinalCTA 
          onOpenDemo={() => setDemoOpen(true)}
        />

      </main>

      {/* 4. ENTERPRISE FOOTER */}
      <Footer 
        onOpenDemo={() => setDemoOpen(true)} 
        onOpenLogin={() => setLoginOpen(true)} 
      />

      {/* 5. INTERACTIVE MODALS */}
      <BookDemoModal 
        isOpen={demoOpen} 
        onClose={() => setDemoOpen(false)} 
      />

      <SignInModal 
        isOpen={loginOpen} 
        onClose={() => setLoginOpen(false)} 
      />

    </div>
  );
}
`;

fs.writeFileSync(path.join(marketingDir, 'ConstructOGenieApp.js'), appCode, 'utf8');
console.log('18. ConstructOGenieApp.js written');

// ==========================================
// 18. app/layout.js & app/globals.css
// ==========================================
const layoutCode = `import "./globals.css";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport = {
  themeColor: "#040609",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  metadataBase: new URL("https://www.constructogenie.in"),
  title: "Construct-O-Genie — Operating System for Interior Fit-Out & Turnkey Contracting",
  description: "Manage budgets, procurement, execution, billing and project margins from one connected platform. Living BOQ Spine, Site DPRs, Maker-Checker PO Approvals, and two-way sync with Tally Prime and enterprise ERPs.",
  keywords: [
    "turnkey interior software",
    "fit-out construction OS",
    "BOQ item locking",
    "Tally Prime construction sync",
    "JMR measurement record",
    "interior general contractor ERP",
  ],
  authors: [{ name: "Construct-O-Genie Technologies" }],
  openGraph: {
    title: "Construct-O-Genie — Operating System for Fit-Out & Turnkey Contractors",
    description: "Manage budgets, procurement, execution, billing and project margins from one connected platform.",
    url: "https://www.constructogenie.in",
    siteName: "Construct-O-Genie",
    images: [
      {
        url: "/dashboard-screen.jpg",
        width: 1200,
        height: 630,
        alt: "Construct-O-Genie Enterprise Platform",
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
    <html lang="en" className={\`\${jakarta.variable} \${inter.variable} \${jetbrainsMono.variable} dark\`}>
      <body className="bg-[#030508] text-slate-100 antialiased font-sans selection:bg-white/20 selection:text-white">
        {children}
      </body>
    </html>
  );
}
`;

fs.writeFileSync(path.join(appDir, 'layout.js'), layoutCode, 'utf8');
console.log('19. layout.js written');

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
  --bg: #030508;
}

html {
  scroll-behavior: smooth;
  color-scheme: dark;
}

body {
  background: #030508;
  color: #f8fafc;
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
}

::selection {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #030508;
}
::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #334155;
}

/* Monolithic Typography Utilities */
.font-display {
  font-family: var(--font-display);
}

.font-mono {
  font-family: var(--font-mono);
}

/* CAD Grid Background */
.cad-grid {
  background-image: linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 80px 80px;
}
`;

fs.writeFileSync(path.join(appDir, 'globals.css'), globalsCss, 'utf8');
console.log('20. globals.css written');

console.log('All files generated successfully!');
