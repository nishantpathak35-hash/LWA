'use client';

import React, { useState } from 'react';
import { 
  LIFECYCLE_STAGES 
} from './marketingData';
import { 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  FileText, 
  Sparkles, 
  Compass, 
  Layers, 
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';

export default function ProjectLifecycle() {
  const [activeStageIndex, setActiveStageIndex] = useState(4); // Default to BOQ

  const activeStage = LIFECYCLE_STAGES[activeStageIndex];

  return (
    <section id="lifecycle" className="py-24 bg-[#080A0C] border-b border-white/[0.06] relative overflow-hidden">
      
      {/* CAD Grid Lines */}
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
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-4">
            <Layers className="w-3.5 h-3.5" />
            END-TO-END PROJECT THREAD
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            From first conversation <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-white">
              to final collection.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            One single project record evolves across 10 native stages. No duplicate data entry, no re-typing estimates, and zero communication gaps.
          </p>
        </div>

        {/* Horizontal Scrollable Step Bar */}
        <div className="relative mb-10">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-white/[0.08]">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isActive = idx === activeStageIndex;
              const isPast = idx < activeStageIndex;

              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageIndex(idx)}
                  className={`px-4 py-3 rounded-xl font-mono text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-2.5 shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/20 border border-cyan-500/50 text-white shadow-lg shadow-cyan-950'
                      : isPast
                      ? 'bg-white/[0.02] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.04]'
                      : 'bg-transparent border border-white/[0.04] text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                    isActive 
                      ? 'bg-cyan-400 text-slate-950' 
                      : isPast 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-white/[0.06] text-slate-400'
                  }`}>
                    {stage.id}
                  </span>
                  <span className="font-semibold">{stage.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Stage Visual Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch rounded-3xl bg-[#0c1016] border border-white/[0.08] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          
          {/* Stage Overview & Description (Left Column 5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-3xl font-black text-cyan-400">
                  {activeStage.id}
                </span>
                <div>
                  <span className="font-mono text-xs text-slate-400 uppercase tracking-widest block">
                    STAGE {activeStage.id} OF 10
                  </span>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {activeStage.name}
                  </h3>
                </div>
              </div>

              <div className="inline-block px-3 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-cyan-400 mb-4">
                {activeStage.tagline}
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">
                {activeStage.description}
              </p>
            </div>

            {/* Key Stage Metric */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] font-mono">
              <div className="text-[11px] text-slate-400 uppercase">Stage Benchmark Output</div>
              <div className="text-xl font-bold text-white mt-1">{activeStage.metric}</div>
              <div className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activeStage.statusText}
              </div>
            </div>

            {/* Stage Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => setActiveStageIndex(Math.max(0, activeStageIndex - 1))}
                disabled={activeStageIndex === 0}
                className="px-3 py-2 text-xs font-mono text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Stage
              </button>

              <button
                onClick={() => setActiveStageIndex(Math.min(LIFECYCLE_STAGES.length - 1, activeStageIndex + 1))}
                disabled={activeStageIndex === LIFECYCLE_STAGES.length - 1}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                Next Stage <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Realistic High-Fidelity UI Mockup (Right Column 7 cols) */}
          <div className="lg:col-span-7 bg-[#080b0f] rounded-2xl border border-white/[0.08] p-5 font-mono text-xs flex flex-col justify-between shadow-inner">
            
            {/* Mock Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                <span className="text-slate-400 ml-2 font-mono text-[11px]">
                  PROJECT / COG-PRJ-26041 :: {activeStage.technicalRef}
                </span>
              </div>
              <span className="text-[10px] text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                LIVE PRODUCTION VIEW
              </span>
            </div>

            {/* Stage-Specific Visual Payload */}
            <div className="py-6 space-y-4">
              
              {activeStageIndex === 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between p-3 rounded-lg bg-slate-900/60 border border-white/[0.04]">
                    <span className="text-slate-400">Opportunity Title</span>
                    <span className="text-white font-bold">Horizon Workspace Turnkey Fit-Out (42,500 SQ.FT)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-white/[0.04]">
                      <span className="text-slate-400 block text-[10px]">Client</span>
                      <span className="text-cyan-400 font-semibold">Horizon Technologies Ltd.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-white/[0.04]">
                      <span className="text-slate-400 block text-[10px]">Target Handover</span>
                      <span className="text-white">15 Nov 2026 (90 Days)</span>
                    </div>
                  </div>
                </div>
              )}

              {activeStageIndex === 1 && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-white/[0.04] flex items-center justify-between">
                    <span className="text-slate-300">Laser 3D Measurement Calibration</span>
                    <span className="text-emerald-400 font-bold">99.8% Tolerance</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded bg-slate-900/40 border border-white/[0.04]">
                      <div className="text-[10px] text-slate-400">Ceiling Height</div>
                      <div className="text-white font-bold">3.85 M</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900/40 border border-white/[0.04]">
                      <div className="text-[10px] text-slate-400">Riser Drops</div>
                      <div className="text-white font-bold">14 Core Locations</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900/40 border border-white/[0.04]">
                      <div className="text-[10px] text-slate-400">Geotagged Photos</div>
                      <div className="text-cyan-400 font-bold">340 Files</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStageIndex === 2 && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">GFC DRAWING VAULT (LATEST REVISION DISTRIBUTION)</div>
                  <div className="p-2.5 rounded bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between">
                    <span className="text-white">ARCH-GFC-LVL14-PARTITION-REV04.2.dwg</span>
                    <span className="text-emerald-400 font-bold">APPROVED GFC</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/40 border border-white/[0.04] flex items-center justify-between text-slate-400">
                    <span>MEP-HVAC-DUCT-LAYOUT-REV03.1.dwg</span>
                    <span className="text-slate-400">SUPERSEDED</span>
                  </div>
                </div>
              )}

              {activeStageIndex === 3 && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-white/[0.04] flex items-center justify-between">
                    <span className="text-slate-300">Vector PDF Takeoff Tool</span>
                    <span className="text-cyan-400">Scale: 1:100</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded bg-slate-900/50">
                      <div className="text-[10px] text-slate-400">Acoustic Panelling Area</div>
                      <div className="text-white font-bold text-sm">480 SQ.M Measured</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900/50">
                      <div className="text-[10px] text-slate-400">Glazed Partitions</div>
                      <div className="text-white font-bold text-sm">320 SQ.M (84 Linear M)</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStageIndex === 4 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-400 uppercase font-bold px-2">
                    <span className="col-span-2">Line Item</span>
                    <span>Cost / Unit</span>
                    <span className="text-right">Selling Rate</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-white/[0.04] grid grid-cols-4 gap-2 items-center">
                    <span className="col-span-2 text-white truncate">04.01.A Fluted Oak Panelling</span>
                    <span className="text-slate-300">₹5,450 / m²</span>
                    <span className="text-right text-emerald-400 font-bold">₹7,200 (24.3%)</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-white/[0.04] grid grid-cols-4 gap-2 items-center">
                    <span className="col-span-2 text-white truncate">02.04.C Double Glazed Partition</span>
                    <span className="text-slate-300">₹9,200 / m²</span>
                    <span className="text-right text-emerald-400 font-bold">₹11,800 (22.0%)</span>
                  </div>
                </div>
              )}

              {activeStageIndex >= 5 && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between">
                    <span className="text-slate-300">Synchronized Project Milestone</span>
                    <span className="text-cyan-400 font-bold">Active in Execution</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-slate-900/40">
                      <div className="text-[10px] text-slate-400">POs Issued</div>
                      <div className="text-white font-bold">₹2.14 Cr</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/40">
                      <div className="text-[10px] text-slate-400">Billed to Client</div>
                      <div className="text-cyan-400 font-bold">₹3.08 Cr</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/40">
                      <div className="text-[10px] text-slate-400">Projected Margin</div>
                      <div className="text-emerald-400 font-bold">18.4% Net</div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Micro Footer Indicator */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
              <span>Automatic lineage: Stage data flows downstream without data loss</span>
              <span className="text-cyan-400">VALIDATED</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
