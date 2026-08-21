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
  Layers
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
        'Live consolidated P&L across all turnkey projects',
        'Maker/checker multi-tiered approval workflows for high-value POs',
        'Automated cashflow forecast & client billing collection risk alerts',
        'Audit trail of every drawing revision and commercial modification'
      ],
      metrics: [
        { label: 'Portfolio Margin', value: '19.8%' },
        { label: 'Active Sites', value: '12 Projects' },
        { label: 'Budget Variance', value: '0.4% (Healthy)' }
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
        { label: 'GFC Revisions', value: '100% Tracked' },
        { label: 'Site Reworks', value: '0% Discrepancy' },
        { label: 'Disciplines', value: 'Arch, MEP, Struct' }
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
        { label: 'POs Committed', value: '₹2.14 Cr (14 POs)' },
        { label: 'Budget Adherence', value: '99.4%' },
        { label: 'Vendor Network', value: '48 Verified' }
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
        { label: 'Daily DPRs', value: '100% On Time' },
        { label: 'Certified JMRs', value: '₹3.08 Cr' },
        { label: 'Site Progress', value: '67% Active' }
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
        { label: 'TDS Reconciled', value: '₹3.76L' },
        { label: 'Collections', value: '₹2.62 Cr' },
        { label: 'Tally Sync', value: '1-Click XML' }
      ]
    }
  ];

  const currentRole = roles.find(r => r.id === activeTab) || roles[0];

  return (
    <section id="roles" className="py-24 bg-[#090C10] border-b border-white/[0.06] relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-4">
            <Layers className="w-3.5 h-3.5" />
            ROLE-BASED WORKSPACES
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            One system. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-white">
              Every team.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Tailored native workflows for every department in your interior company, all sharing the same real-time project state.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-10">
          {roles.map((r) => {
            const isActive = r.id === activeTab;

            return (
              <button
                key={r.id}
                onClick={() => setActiveTab(r.id)}
                className={`px-5 py-3 rounded-xl font-mono text-xs uppercase tracking-wider transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30'
                    : 'bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {r.name}
              </button>
            );
          })}
        </div>

        {/* Role Content Card */}
        <div className="rounded-3xl bg-[#0c1015] border border-white/[0.08] p-6 sm:p-12 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Description (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-1">
                {currentRole.title}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {currentRole.headline}
              </h3>
            </div>

            <div className="space-y-3 pt-2">
              {currentRole.points.map((pt, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Metrics Grid (5 Cols) */}
          <div className="lg:col-span-5 bg-[#080b0f] rounded-2xl border border-white/[0.08] p-6 sm:p-8 font-mono space-y-4 shadow-inner">
            <div className="text-xs font-bold text-white pb-3 border-b border-white/[0.06] flex items-center justify-between">
              <span>{currentRole.name} KPI BENCHMARKS</span>
              <span className="text-cyan-400">REALTIME</span>
            </div>

            <div className="space-y-3">
              {currentRole.metrics.map((m, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 uppercase">{m.label}</div>
                  <div className="text-2xl font-bold text-white mt-1">{m.value}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-[11px] text-slate-400 text-center">
              Synchronized with Central Project Operating Engine
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
