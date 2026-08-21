'use client';

import React, { useState } from 'react';
import { PORTFOLIO_PROJECTS } from './marketingData';
import { 
  Building2, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  Activity
} from 'lucide-react';

export default function CommandCentre() {
  const [selectedPrjId, setSelectedPrjId] = useState(PORTFOLIO_PROJECTS[0].id);

  const selectedPrj = PORTFOLIO_PROJECTS.find(p => p.id === selectedPrjId) || PORTFOLIO_PROJECTS[0];

  return (
    <section id="command-centre" className="py-24 bg-[#080A0C] border-b border-white/[0.06] relative overflow-hidden">
      
      {/* Background CAD Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-4">
            <Building2 className="w-3.5 h-3.5" />
            MANAGEMENT COMMAND CENTRE
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Know exactly where <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-400">
              every project stands.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Real-time portfolio visibility across commercial contract values, site progress, vendor exposure, pending approvals, and realized gross margins.
          </p>
        </div>

        {/* Executive Portfolio KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-10 font-mono">
          
          <div className="p-4 rounded-2xl bg-[#0c1015] border border-white/[0.08] shadow-lg">
            <div className="text-[10px] text-slate-400 uppercase">Active Portfolio</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1">12 Projects</div>
            <div className="text-[10px] text-cyan-400 mt-0.5">₹38.45 Cr Total</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1015] border border-white/[0.08] shadow-lg">
            <div className="text-[10px] text-slate-400 uppercase">Total Receivables</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1">₹4.20 Cr</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">85% Within Terms</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1015] border border-white/[0.08] shadow-lg">
            <div className="text-[10px] text-slate-400 uppercase">Vendor Payables</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1">₹2.84 Cr</div>
            <div className="text-[10px] text-teal-400 mt-0.5">194C Compliant</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1015] border border-white/[0.08] shadow-lg">
            <div className="text-[10px] text-slate-400 uppercase">Average Gross Margin</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">19.8%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Target: 18.0%</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1015] border border-white/[0.08] shadow-lg">
            <div className="text-[10px] text-slate-400 uppercase">Pending Approvals</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">7 Queue</div>
            <div className="text-[10px] text-slate-400 mt-0.5">4 POs, 3 Payments</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1015] border border-white/[0.08] shadow-lg">
            <div className="text-[10px] text-slate-400 uppercase">Financial Risk</div>
            <div className="text-xl sm:text-2xl font-bold text-cyan-400 mt-1">0 Critical</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">All Budgets Intact</div>
          </div>

        </div>

        {/* Split Interactive Portfolio View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Project List (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider px-1">
              Select Project to Inspect Financial Health
            </div>

            {PORTFOLIO_PROJECTS.map((prj) => {
              const isSelected = prj.id === selectedPrjId;

              return (
                <div
                  key={prj.id}
                  onClick={() => setSelectedPrjId(prj.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#121822] border-cyan-500/50 shadow-xl shadow-cyan-950/40 text-white'
                      : 'bg-[#0c1015] border-white/[0.06] hover:bg-white/[0.02] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-xs mb-1">
                    <span className="text-cyan-400 font-bold">{prj.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      prj.health === 'healthy' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {prj.status}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-white">{prj.name}</div>
                  <div className="text-xs text-slate-400">{prj.client} · {prj.location}</div>

                  <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-3 gap-2 font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Value</div>
                      <div className="font-semibold text-white">₹{(prj.value / 10000000).toFixed(2)} Cr</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Progress</div>
                      <div className="font-semibold text-cyan-400">{prj.progress}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Margin</div>
                      <div className="font-semibold text-emerald-400">{prj.margin}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Inspector Panel (7 Cols) */}
          <div className="lg:col-span-7 rounded-3xl bg-[#0c1015] border border-white/[0.08] p-6 sm:p-8 shadow-2xl font-mono text-xs space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.06] gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">{selectedPrj.client}</span>
                <h3 className="text-xl font-bold text-white tracking-tight">{selectedPrj.name}</h3>
              </div>
              <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-bold">
                STAGE: {selectedPrj.stage}
              </div>
            </div>

            {/* Financial Progress Bar */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-2">
                <span>Site Execution Progress: <strong className="text-white">{selectedPrj.progress}%</strong></span>
                <span>Target Handover: <strong className="text-cyan-400">On Track</strong></span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/[0.04]">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${selectedPrj.progress}%` }}
                />
              </div>
            </div>

            {/* Core Financial Diagnostic Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 uppercase">Contract BOQ</div>
                <div className="text-sm font-bold text-white mt-1">₹{(selectedPrj.value / 10000000).toFixed(2)} Cr</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 uppercase">Committed POs</div>
                <div className="text-sm font-bold text-teal-400 mt-1">₹{((selectedPrj.value * 0.44) / 10000000).toFixed(2)} Cr</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 uppercase">Client Invoiced</div>
                <div className="text-sm font-bold text-cyan-400 mt-1">₹{((selectedPrj.value * (selectedPrj.progress / 100)) / 10000000).toFixed(2)} Cr</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 uppercase">Projected Net P&L</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">{selectedPrj.margin}% Margin</div>
              </div>
            </div>

            {/* Pending Executive Action Queue for this project */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20">
              <div className="flex items-center justify-between text-amber-400 font-bold mb-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Pending Executive Approvals ({selectedPrj.pendingApprovals})
                </span>
                <span className="text-[10px] uppercase">MAKER / CHECKER CONTROL</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {selectedPrj.pendingApprovals > 0 
                  ? `2 Purchase Orders awaiting director authorization & 2 Vendor Payment advices pending TDS validation.`
                  : `All purchase orders, vendor invoices, and client billing up to date. Zero bottlenecks.`}
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
