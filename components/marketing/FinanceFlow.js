'use client';

import React from 'react';
import { 
  Receipt, 
  ArrowDown, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  DollarSign, 
  CheckCircle2,
  FileCheck2,
  PieChart
} from 'lucide-react';
import { DEMO_PROJECT } from './marketingData';

export default function FinanceFlow() {
  return (
    <section id="finance-flow" className="py-24 bg-[#090C10] border-b border-white/[0.06] relative overflow-hidden">
      
      {/* Background CAD Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-4">
            <Receipt className="w-3.5 h-3.5" />
            PROJECT-CENTRIC FINANCIAL CONTROL
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Financial control built <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-200 to-white">
              around the project.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Traditional accounting software tracks company debits and credits. Construct-O-Genie controls project cashflows, client progressive billing, vendor RA bills, 194C TDS, and net margin in real time.
          </p>
        </div>

        {/* Financial Flow Architecture (Sankey / Connected Stream) */}
        <div className="rounded-3xl bg-[#0c1015] border border-white/[0.08] p-6 sm:p-12 shadow-2xl space-y-10">
          
          {/* Top Level: Dual Streams (Inflows vs Outflows) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* INFLOW STREAM (Client Contract to Collections) */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-cyan-500/20 space-y-4 font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  01. INFLOW STREAM (CLIENT REVENUE)
                </span>
                <span className="text-[10px] text-slate-400">MILESTONE GST BILLING</span>
              </div>

              <div className="space-y-3 text-xs">
                
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Contract BOQ Value</div>
                    <div className="text-base font-bold text-white mt-0.5">₹4,82,50,000</div>
                  </div>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950 px-2 py-1 rounded border border-cyan-800">
                    AGREEMENT SIGNED
                  </span>
                </div>

                <div className="flex justify-center text-cyan-400">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Progressive Invoices Raised</div>
                    <div className="text-base font-bold text-white mt-0.5">₹3,08,00,000</div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    RA Bills #01, #02, #03
                  </span>
                </div>

                <div className="flex justify-center text-cyan-400">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-cyan-400 uppercase font-bold">Collected Inflow</div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">₹2,62,00,000</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Retention: ₹24.0L</span>
                    <span className="text-[10px] text-emerald-400 font-bold">85% Realized</span>
                  </div>
                </div>

              </div>
            </div>

            {/* OUTFLOW STREAM (Budget to Vendor Payments & TDS) */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-amber-500/20 space-y-4 font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  02. OUTFLOW STREAM (PROCUREMENT & VENDORS)
                </span>
                <span className="text-[10px] text-slate-400">MAKER/CHECKER APPROVALS</span>
              </div>

              <div className="space-y-3 text-xs">
                
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Cost Budget (BCS)</div>
                    <div className="text-base font-bold text-white mt-0.5">₹3,94,00,000</div>
                  </div>
                  <span className="text-[10px] text-amber-400 bg-amber-950 px-2 py-1 rounded border border-amber-800">
                    APPROVED BUDGET
                  </span>
                </div>

                <div className="flex justify-center text-amber-400">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Purchase Orders (14 POs)</div>
                    <div className="text-base font-bold text-white mt-0.5">₹2,14,20,000</div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Committed to Vendors
                  </span>
                </div>

                <div className="flex justify-center text-amber-400">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-amber-400 uppercase font-bold">Net Vendor Remittances</div>
                    <div className="text-lg font-bold text-white mt-0.5">₹1,54,00,000</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-purple-400 block font-bold">TDS (194C): ₹3,76,000</span>
                    <span className="text-[10px] text-teal-400">Auto Advice Sent</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Convergence Node: REALIZED NET PROJECT MARGIN */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0d1720] via-[#09151c] to-[#0d1720] border border-cyan-500/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 font-mono">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] text-cyan-400 uppercase tracking-widest block font-bold">
                  CONVERGENCE OUTPUT // PROJECT P&L
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Realized Net Profit: ₹88,72,000
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Gross Margin</div>
                <div className="text-3xl font-black text-emerald-400">18.4%</div>
              </div>
              <div className="hidden sm:block border-l border-white/10 pl-6 text-left text-[11px] text-slate-400">
                <span>Direct BOQ variance: <strong className="text-emerald-400">+0.4%</strong></span>
                <span className="block text-slate-400">Tally XML Export: Ready</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
