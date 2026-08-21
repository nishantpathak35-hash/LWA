'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Check,
  X
} from 'lucide-react';

export default function PortalsSection() {
  const [activePortal, setActivePortal] = useState('client'); // 'client' | 'vendor'
  const [variationApproved, setVariationApproved] = useState(false);

  return (
    <section id="portals" className="py-24 bg-[#090C10] border-b border-white/[0.06] relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono text-[11px] uppercase tracking-wider mb-4">
            <Users className="w-3.5 h-3.5" />
            EXTERNAL COLLABORATION
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Clarity for clients. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-white">
              Discipline for vendors.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Dedicated external portals keep external stakeholders informed without leaking internal cost rates, markup margins, or contractor communications.
          </p>
        </div>

        {/* Portal Switcher Tabs */}
        <div className="flex justify-center mb-10">
          <div className="p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setActivePortal('client')}
              className={`px-6 py-2.5 rounded-xl transition-all font-bold ${
                activePortal === 'client'
                  ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CLIENT PORTAL EXPERIENCE
            </button>

            <button
              onClick={() => setActivePortal('vendor')}
              className={`px-6 py-2.5 rounded-xl transition-all font-bold ${
                activePortal === 'vendor'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              VENDOR & SUBCONTRACTOR PORTAL
            </button>
          </div>
        </div>

        {/* Portal Showcase Card */}
        <div className="rounded-3xl bg-[#0c1015] border border-white/[0.08] p-6 sm:p-12 shadow-2xl max-w-5xl mx-auto">
          
          {activePortal === 'client' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.06] gap-2">
                <div>
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block font-bold">
                    WHITE-LABEL CLIENT WORKSPACE
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    Horizon Technologies Client Executive View
                  </h3>
                </div>
                <div className="text-xs font-mono text-slate-400 bg-white/[0.02] px-3 py-1 rounded-full border border-white/[0.06]">
                  PROJECT: HORIZON WORKSPACE (42,500 SQ.FT)
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 uppercase">Live Milestone Progress</div>
                  <div className="text-xl font-bold text-white mt-1">67% Complete</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Handover: On Schedule</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 uppercase">Invoiced to Date</div>
                  <div className="text-xl font-bold text-purple-400 mt-1">₹3.08 Cr</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">RA Bill #03 Certified</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 uppercase">Approved Drawings</div>
                  <div className="text-xl font-bold text-white mt-1">GFC Rev 04.2</div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">Digital Signatures Intact</div>
                </div>
              </div>

              {/* Interactive Client Variation Card */}
              <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-500/30 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-500/20 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-400">PENDING CLIENT VARIATION APPROVAL</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      Conference Room Acoustic Panelling Upgrade (Bespoke Fluted Finish)
                    </h4>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span>Contract Impact: <strong className="text-emerald-400">+₹2,85,000</strong></span>
                    <span>Schedule Impact: <strong className="text-white">+3 Days</strong></span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                  Client requested luxury fluted acoustic oak veneer instead of standard fabric wrap for Boardroom & Main Townhall.
                </p>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-purple-500/20">
                  <span className="text-[10px] text-slate-400">
                    Approving automatically updates the master BOQ, creates supplemental POs, and schedules delivery.
                  </span>
                  
                  {variationApproved ? (
                    <span className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> VARIATION APPROVED & BOQ UPDATED
                    </span>
                  ) : (
                    <button
                      onClick={() => setVariationApproved(true)}
                      className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/30 transition-all"
                    >
                      <Check className="w-4 h-4" /> Approve Variation (₹2.85L)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.06] gap-2">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">
                    VENDOR & SUBCONTRACTOR SELF-SERVICE PORTAL
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    WoodCraft Studios (Vendor Code: V-084)
                  </h3>
                </div>
                <div className="text-xs font-mono text-slate-400 bg-white/[0.02] px-3 py-1 rounded-full border border-white/[0.06]">
                  STATUS: VERIFIED VENDOR (194C COMPLIANT)
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 uppercase">Allocated POs</div>
                  <div className="text-xl font-bold text-white mt-1">₹14,80,000</div>
                  <div className="text-[10px] text-teal-400 mt-0.5">PO #COG-0241 Acknowledged</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 uppercase">Bills Processed</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1">₹8,42,750</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Matched with Site GRN-109</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                  <div className="text-[10px] text-slate-400 uppercase">TDS Certificate (194C)</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">Form 16A</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Available for Download</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.04] font-mono text-xs space-y-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold">
                  Vendor Remittance History & UTR Traceability
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-white/[0.04]">
                  <div>
                    <div className="font-bold text-white">RA Bill #02 / ₹4,70,400 Remitted</div>
                    <div className="text-[10px] text-slate-400">UTR: AXIS26084920 · 2% TDS Deducted (₹9,600)</div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    PAID & SETTLED
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}
