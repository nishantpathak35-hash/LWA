'use client';

import React from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  MessageSquare, 
  AlertTriangle, 
  HelpCircle, 
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldCheck
} from 'lucide-react';

export default function ProblemSection() {
  return (
    <section className="py-24 bg-[#090C10] border-b border-white/[0.06] relative overflow-hidden">
      
      {/* Background Accent Grids */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[11px] uppercase tracking-wider mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            THE INTERIOR INDUSTRY BOTTLENECK
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Your business has outgrown <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-amber-500">
              WhatsApp + Excel.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Interior execution is complex. When 15 departments communicate through spreadsheets and chat groups, margin leaks, drawings get superseded, and project delays become inevitable.
          </p>
        </div>

        {/* Dual Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* LEFT: Without Construct-O-Genie (Chaos & Fragmented Communication) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0e1117] border border-red-500/20 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl bg-red-500/10 border-l border-b border-red-500/20 font-mono text-[11px] text-red-400 uppercase font-semibold">
              WITHOUT CONSTRUCT-O-GENIE
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">The Fragmented Chaos</h3>
                  <p className="text-xs text-slate-400 font-mono">12 DISCONNECTED TOOLS & CHAT THREADS</p>
                </div>
              </div>

              {/* Abstract Fragmented Chat & File Cards */}
              <div className="space-y-3 font-mono text-xs">
                
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06] text-slate-300 flex items-start gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>BOQ_Horizon_v7_FINAL_rev3(2).xlsx</span>
                      <span className="text-[10px] text-red-400">Which version is approved?</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Edited 4 days ago by Estimator. Rates mismatch site procurement.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06] text-slate-300 flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      "Sir please approve ₹8.4L marble PO urgently, vendor is waiting"
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Director doesn't know remaining budget or if drawing was revised.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06] text-slate-300 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      Site executed superseding GFC Rev 02 instead of Rev 04
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      ₹3.2L rework required. Client disputes invoice.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06] text-slate-300 flex items-start gap-3">
                  <HelpCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      Finance checking 5 bank accounts for vendor UTR numbers
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Vendors repeatedly calling site engineers for payment status.
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] text-xs font-mono text-red-400/80 flex items-center justify-between">
              <span>Result: Margin erosion & unbilled variations</span>
              <span>EST. 4-8% LOSS</span>
            </div>
          </div>

          {/* RIGHT: With Construct-O-Genie (Unified Project Operating Layer) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0f1722] to-[#0a1017] border border-cyan-500/40 shadow-2xl shadow-cyan-950/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl bg-cyan-500/20 border-l border-b border-cyan-500/30 font-mono text-[11px] text-cyan-400 uppercase font-semibold">
              WITH CONSTRUCT-O-GENIE
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">One Project. One Source of Truth.</h3>
                  <p className="text-xs text-cyan-400 font-mono">SYNCHRONIZED OPERATING LAYER</p>
                </div>
              </div>

              {/* Clean Harmonized Connected Statements */}
              <div className="space-y-4 font-mono text-xs">
                
                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-slate-200 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm font-sans">
                      Design knows what changed.
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      GFC Drawing Vault distributes latest revisions directly to site tablets.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-slate-200 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm font-sans">
                      Procurement knows what to order.
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      POs generated directly from BOQ items with strict budget guardrails.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-slate-200 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm font-sans">
                      Site knows what to execute.
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      Digital DPRs, JMRs, and gate GRNs sync in real-time to HQ.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-slate-200 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold shrink-0">
                    4
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm font-sans">
                      Finance knows what it costs & Management sees the margin.
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      Automated 194C TDS, vendor remittance advice & live project P&L.
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-cyan-500/20 text-xs font-mono text-cyan-400 flex items-center justify-between">
              <span>Result: Guaranteed 18.4% projected gross margin</span>
              <span className="font-bold">TOTAL CONTROL</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
