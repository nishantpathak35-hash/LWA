'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Compass, 
  FileSpreadsheet, 
  ShoppingCart, 
  Receipt, 
  Hammer, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';

export default function RoleTabs() {
  const [activeTab, setActiveTab] = useState('procurement');

  const roles = [
    {
      id: 'management',
      name: 'MANAGEMENT',
      title: 'Founders, Directors & Commercial Heads',
      headline: 'Total portfolio margin control and zero surprise cost escalations.',
      points: [
        'Live consolidated P&L across all turnkey interior projects',
        'Maker/checker multi-tiered approval workflows for high-value POs',
        'Automated cashflow forecast & client billing collection risk alerts',
        'Audit trail of every drawing revision and commercial modification'
      ],
      metrics: [
        { label: 'Portfolio Margin', value: '19.8%', color: 'text-emerald-400' },
        { label: 'Active Sites', value: '12 Projects', color: 'text-white' },
        { label: 'Budget Variance', value: '0.4% (Healthy)', color: 'text-white' }
      ]
    },
    {
      id: 'design',
      name: 'DESIGN & ARCHITECTURE',
      title: 'Design Heads, Architects & 3D Visualizers',
      headline: 'Drawing revisions directly connected to BOQ line items and site teams.',
      points: [
        'Central GFC Drawing Vault with automatic versioning (Rev 01 to GFC Final)',
        'Instant push notifications to site engineers when a drawing changes',
        'Superseded drawing lockout to eliminate expensive site reworks',
        'Direct takeoff measurement linking vector CAD/PDFs to the BOQ'
      ],
      metrics: [
        { label: 'GFC Revisions', value: '100% Tracked', color: 'text-white' },
        { label: 'Site Reworks', value: '0% Discrepancy', color: 'text-emerald-400' },
        { label: 'Disciplines', value: 'Arch, MEP, Struct', color: 'text-white' }
      ]
    },
    {
      id: 'procurement',
      name: 'PROCUREMENT',
      title: 'Purchase Managers & Material Buyers',
      headline: 'Convert approved BOQs into vendor POs without losing budget control.',
      points: [
        'One-click BOQ-to-PO generation with automated quantity limits',
        'Vendor rate comparison across acoustic panels, glass, joinery & MEP',
        'Live gate-entry GRN tracking so bills are only cleared for physical deliveries',
        'Vendor contract allocation preventing over-commitment against BCS budgets'
      ],
      metrics: [
        { label: 'POs Committed', value: '₹2.14 Cr (14 POs)', color: 'text-teal-400' },
        { label: 'Budget Adherence', value: '99.4%', color: 'text-emerald-400' },
        { label: 'Vendor Network', value: '48 Verified', color: 'text-white' }
      ]
    },
    {
      id: 'site',
      name: 'SITE EXECUTION',
      title: 'Project Managers, Site Engineers & Quality In-charge',
      headline: 'Mobile daily reporting, digital JMRs, and site material verification.',
      points: [
        'Mobile Daily Progress Reporting (DPR) with manpower logs and geotagged photos',
        'Digital Joint Measurement Records (JMR) signed on-screen with client reps',
        'Site imprest & petty cash voucher uploads with instant balance reconciliation',
        'Gate delivery GRN scanning directly matching supplier delivery challans'
      ],
      metrics: [
        { label: 'Daily DPRs', value: '100% On Time', color: 'text-emerald-400' },
        { label: 'Certified JMRs', value: '₹3.08 Cr', color: 'text-white' },
        { label: 'Site Progress', value: '67% Active', color: 'text-amber-400' }
      ]
    },
    {
      id: 'finance',
      name: 'FINANCE & ACCOUNTS',
      title: 'CFOs, Finance Controllers & Accountants',
      headline: 'India-native commercial operations: TDS, GST, RA Bills, and Tally.',
      points: [
        'Automated 194C, 194J, and 194Q TDS deductions with auto-generated payment advice',
        'Running Account (RA) bill certification matching physical site progress',
        'Client milestone tax invoicing with automated GST calculation',
        'Seamless XML export for Tally Prime and enterprise ERP synchronization'
      ],
      metrics: [
        { label: 'TDS Reconciled', value: '₹3.76L', color: 'text-purple-400' },
        { label: 'Collections', value: '₹2.62 Cr', color: 'text-emerald-400' },
        { label: 'Tally Sync', value: '1-Click XML', color: 'text-white' }
      ]
    }
  ];

  const currentRole = roles.find(r => r.id === activeTab) || roles[0];

  return (
    <section id="roles" className="bg-transparent py-28  border-b border-white/[0.08] relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/20 text-white font-mono text-[11px] uppercase tracking-wider mb-4 shadow-lg shadow-slate-950/30">
            <Layers className="w-3.5 h-3.5" />
            ROLE-BASED WORKSPACES
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            One system. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-200 to-white">
              Every team.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Tailored native workspaces for every department in your interior company, all sharing the same real-time project state.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2.5 overflow-x-auto pb-4 no-scrollbar mb-12">
          {roles.map((r) => {
            const isActive = r.id === activeTab;

            return (
              <button
                key={r.id}
                onClick={() => setActiveTab(r.id)}
                className={`px-6 py-3.5 rounded-2xl font-mono text-xs uppercase tracking-wider transition-all duration-200 shrink-0 font-bold ${
                  isActive
                    ? 'bg-gradient-to-r from-white to-slate-200 text-slate-950 shadow-xl shadow-slate-400/30'
                    : 'bg-[#0B0F16] border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                {r.name}
              </button>
            );
          })}
        </div>

        {/* Role Content Card */}
        <div className="rounded-3xl bg-[#0B0F16] border border-white/[0.1] p-6 sm:p-12 shadow-[0_25px_80px_rgba(0,0,0,0.8)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Description (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-xs font-mono text-white uppercase tracking-widest block mb-1 font-bold">
                {currentRole.title}
              </span>
              <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight font-sans">
                {currentRole.headline}
              </h3>
            </div>

            <div className="space-y-3.5 pt-2">
              {currentRole.points.map((pt, i) => (
                <div key={i} className="flex items-start gap-3.5 text-sm text-slate-200 font-sans">
                  <div className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/20 flex items-center justify-center text-white shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Metrics Grid (5 Cols) */}
          <div className="lg:col-span-5 bg-[#070A0F] rounded-2xl border border-white/[0.08] p-6 sm:p-8 font-mono space-y-4 shadow-inner">
            <div className="text-xs font-bold text-white pb-3.5 border-b border-white/[0.08] flex items-center justify-between">
              <span>{currentRole.name} KPI BENCHMARKS</span>
              <span className="text-white text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/20">
                SYNCHRONIZED
              </span>
            </div>

            <div className="space-y-3">
              {currentRole.metrics.map((m, idx) => (
                <div key={idx} className="p-4.5 rounded-2xl bg-[#0F1622] border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">{m.label}</div>
                  <div className={`text-2xl font-bold font-sans mt-1 ${m.color}`}>{m.value}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-[11px] text-slate-400 text-center">
              Directly commands the central project database
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
