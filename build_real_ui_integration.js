const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/Admin/Desktop/Construct-O-Genie';
const marketingDir = path.join(targetDir, 'components/marketing');

console.log('Integrating authentic sanitized Construct-O-Genie ERP UI into website...');

// ==========================================
// 1. ProductExperience.js (Authentic ERP UI Modules with Anonymized Sample Data)
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
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileCheck,
  HardHat,
  Receipt,
  Download,
  ArrowRight,
  Eye
} from 'lucide-react';
import { PORTFOLIO_PROJECTS, BOQ_SAMPLE_ITEMS, DEMO_PROJECT, formatINR } from './marketingData';

export default function ProductExperience({ onOpenDemo }) {
  const [activeTab, setActiveTab] = useState('founder');
  const [selectedBOQItem, setSelectedBOQItem] = useState(BOQ_SAMPLE_ITEMS[0]);
  const [selectedProject, setSelectedProject] = useState(PORTFOLIO_PROJECTS[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs = [
    { id: 'founder', name: 'Executive Radar', icon: Building2, desc: 'Multi-site margins, cashflow & director approvals' },
    { id: 'boq', name: 'Living BOQ Spine', icon: Layers, desc: 'Rate analysis, drawing deltas & cost ceilings' },
    { id: 'procurement', name: 'Procurement & POs', icon: ShoppingCart, desc: 'Maker-checker approvals & budget headroom locks' },
    { id: 'site', name: 'Site DPR & Snagging', icon: Smartphone, desc: 'Mobile daily reports, headcounts & photo snags' },
    { id: 'billing', name: 'JMR & RA Billing', icon: FileText, desc: 'Tripartite measurements & client RA invoices' },
    { id: 'finance', name: 'Tally & Statutory Sync', icon: RefreshCw, desc: 'Two-way XML/API ledger & TDS u/s 194C sync' },
  ];

  return (
    <section id="product" className="scroll-mt-28 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-200 font-mono text-[11px] uppercase tracking-wider backdrop-blur-md">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          GENUINE PRODUCT INTERFACE
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight apple-headline">
          The Operating System in Action.
        </h2>
        <p className="apple-lead font-light">
          An authentic interactive preview of Construct-O-Genie ERP modules with sanitized reference project data.
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

      {/* Main Glass Workspace Console */}
      <div className="p-5 sm:p-8 rounded-3xl apple-glass shadow-2xl text-left relative overflow-hidden">
        
        {/* Environment Watermark */}
        <div className="absolute top-4 right-6 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[10px] font-mono text-slate-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>DEMO WORKSPACE • SANITIZED DATA</span>
        </div>

        {/* ========================================================
            TAB 1: EXECUTIVE FOUNDER RADAR
            ======================================================== */}
        {activeTab === 'founder' && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="apple-eyebrow text-slate-400 block">
                  CONSTRUCT-O-GENIE OS • EXECUTIVE PORTFOLIO DASHBOARD
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Multi-Site Margin Health & Cashflow Radar
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                  ALL 4 SITES BUDGET-LOCKED
                </span>
              </div>
            </div>

            {/* Active Portfolio Projects Selector */}
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

            {/* Live Financial Metrics for Selected Project */}
            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Selected Active Site</span>
                  <div className="text-lg font-bold text-white font-display">{selectedProject.name} ({selectedProject.area})</div>
                </div>
                <div className="text-right font-mono text-xs tabular-nums">
                  <span className="text-slate-400 block uppercase text-[10px]">Physical Milestone</span>
                  <span className="text-emerald-400 font-bold text-base">{selectedProject.progress}% Verified</span>
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
                  <span className="text-[10px] text-emerald-400 block mt-0.5">Within Cost Ceiling</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase">Protected Margin</span>
                  <span className="text-base font-black text-emerald-400 block mt-0.5">{selectedProject.margin}% Realized</span>
                  <span className="text-[10px] text-emerald-300 block mt-0.5">Zero Scope Leakage</span>
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

        {/* ========================================================
            TAB 2: LIVING BOQ SPINE
            ======================================================== */}
        {activeTab === 'boq' && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="apple-eyebrow text-slate-400 block">
                  CONSTRUCT-O-GENIE OS • LIVING BOQ & ITEM RATE ANALYSIS
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Itemized Rate Breakdown & Budget Cost Ceilings
                </h3>
              </div>
              <span className="px-3 py-1 rounded-md bg-white/[0.06] border border-white/10 text-xs font-mono text-slate-300">
                GFC Takeoff: REV-04.2
              </span>
            </div>

            {/* BOQ Items Table */}
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
                        onClick={() => { setSelectedBOQItem(item); setDrawerOpen(true); }}
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

            {/* Line Item Rate Breakdown Drawer */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-sans">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Selected Line Item Rate Analysis</span>
                <div className="text-sm font-bold text-white">{selectedBOQItem.code} • {selectedBOQItem.package}</div>
                <div className="text-xs text-slate-300 mt-0.5">GFC Drawing Delta: {selectedBOQItem.drawingRef} ({selectedBOQItem.gfcRevision})</div>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Budget Cap</span>
                  <span className="font-bold text-white">{formatINR(selectedBOQItem.totalBudget)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Available Headroom</span>
                  <span className="font-bold text-emerald-400">{formatINR(selectedBOQItem.poBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: PROCUREMENT & PO ENGINE
            ======================================================== */}
        {activeTab === 'procurement' && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="apple-eyebrow text-slate-400 block">
                  CONSTRUCT-O-GENIE OS • MAKER-CHECKER PROCUREMENT ENGINE
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
                  <span className="text-[10px] font-mono text-slate-400 uppercase">PO #26041-042 • Joinery Package</span>
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
                  <span className="text-[10px] font-mono text-slate-400 uppercase">PO #26041-043 • Electrical Package</span>
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

        {/* ========================================================
            TAB 4: SITE DPR & SNAGGING
            ======================================================== */}
        {activeTab === 'site' && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="apple-eyebrow text-slate-400 block">
                  CONSTRUCT-O-GENIE OS • MOBILE SITE DPR & SNAGGING
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

        {/* ========================================================
            TAB 5: JMR & RA BILLING
            ======================================================== */}
        {activeTab === 'billing' && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="apple-eyebrow text-slate-400 block">
                  CONSTRUCT-O-GENIE OS • CERTIFIED JMR & RA BILLING
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

        {/* ========================================================
            TAB 6: TALLY & STATUTORY SYNC
            ======================================================== */}
        {activeTab === 'finance' && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="apple-eyebrow text-slate-400 block">
                  CONSTRUCT-O-GENIE OS • TWO-WAY ACCOUNTING ENGINE
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
console.log('ProductExperience.js updated with authentic ERP architecture.');
