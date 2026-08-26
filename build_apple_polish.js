const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/Admin/Desktop/Construct-O-Genie';
const marketingDir = path.join(targetDir, 'components/marketing');
const appDir = path.join(targetDir, 'app');

console.log('Elevating Construct-O-Genie to Apple-grade frontend precision...');

// ==========================================
// 1. app/globals.css (Apple Materials, Fluid Springs & Optical Tokens)
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
   APPLE-GRADE MATERIALS & FROSTED GLASS
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

/* ==========================================
   NUMERICAL & TABULAR TYPOGRAPHY
   ========================================== */
.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "zero" 1;
}

.font-display {
  font-family: var(--font-display);
  letter-spacing: -0.025em;
}

.font-mono {
  font-family: var(--font-mono);
}

/* Accessible focus ring */
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.75);
  outline-offset: 2px;
}

/* Range input styling (Apple Minimalist Slider) */
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
console.log('app/globals.css updated with Apple materials.');

// ==========================================
// 2. Navbar.js (Refined with Apple-grade frosted glass header)
// ==========================================
const navbarCode = `'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

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
            ? 'apple-glass shadow-[0_12px_40px_rgba(0,0,0,0.85)]'
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
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] group-hover:scale-105 transition-transform"
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
          <div className="pointer-events-auto fixed inset-x-4 top-20 max-h-[85vh] overflow-y-auto p-6 rounded-3xl apple-glass shadow-2xl flex flex-col gap-2.5 text-sm font-medium z-50 xl:hidden">
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
console.log('Navbar.js updated.');

// ==========================================
// 3. Hero.js (Apple Precision Hero with Hardware-Grade Perspective Card)
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
      
      {/* Domain Category Badge */}
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

      {/* Hero Headline */}
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

      {/* Apple-Grade Architectural Deconstruction Layer Scrubber */}
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
console.log('Hero.js updated with Apple precision.');

// ==========================================
// 4. ProductExperience.js (Apple-grade Product Tabs)
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
  Lock
} from 'lucide-react';
import { PORTFOLIO_PROJECTS, BOQ_SAMPLE_ITEMS, DEMO_PROJECT, formatINR } from './marketingData';

export default function ProductExperience({ onOpenDemo }) {
  const [activeTab, setActiveTab] = useState('founder');
  const [selectedBOQItem, setSelectedBOQItem] = useState(BOQ_SAMPLE_ITEMS[0]);
  const [selectedProject, setSelectedProject] = useState(PORTFOLIO_PROJECTS[0]);

  const tabs = [
    { id: 'founder', name: 'Founder Radar', icon: Building2 },
    { id: 'boq', name: 'Living BOQ Spine', icon: Layers },
    { id: 'procurement', name: 'Procurement & POs', icon: ShoppingCart },
    { id: 'site', name: 'Site DPR & Snagging', icon: Smartphone },
    { id: 'billing', name: 'JMR & RA Billing', icon: FileText },
    { id: 'finance', name: 'Tally & ERP Sync', icon: RefreshCw },
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
              className={\`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border shrink-0 apple-interactive \${
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
      <div className="p-5 sm:p-8 rounded-3xl apple-glass shadow-2xl text-left">
        
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
                    className={\`p-3.5 rounded-2xl text-left transition-all border cursor-pointer apple-interactive \${
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
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-current/15 text-[11px] font-mono tabular-nums">
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
                <div className="text-right font-mono text-xs tabular-nums">
                  <span className="text-slate-400 block uppercase text-[10px]">Physical Milestone</span>
                  <span className="text-emerald-400 font-bold text-base">{selectedProject.progress}% Completed</span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs tabular-nums">
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

            {/* Desktop Table */}
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
                <tbody className="divide-y divide-white/10 font-mono tabular-nums">
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
              <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
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
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 font-mono text-[11px] tabular-nums">
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
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 font-mono text-[11px] tabular-nums">
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

            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4 font-mono text-xs tabular-nums">
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
console.log('ProductExperience.js updated.');

console.log('Apple-grade frontend polishing complete!');
