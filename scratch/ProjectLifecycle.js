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
  ChevronLeft,
  Scan,
  Maximize2
} from 'lucide-react';

export default function ProjectLifecycle() {
  const [activeStageIndex, setActiveStageIndex] = useState(4); // Default to BOQ

  const activeStage = LIFECYCLE_STAGES[activeStageIndex];

  return (
    <section id="lifecycle" className="bg-transparent py-28  border-b border-white/[0.08] relative overflow-hidden">
      
      {/* CAD Grid Lines */}
      <div className="absolute inset-0 cad-grid-pattern opacity-25 pointer-events-none" />

      {/* Atmospheric Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-white/[0.06] blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/20 text-white font-mono text-[11px] uppercase tracking-wider mb-4 shadow-lg shadow-slate-950/30">
            <Layers className="w-3.5 h-3.5" />
            END-TO-END PROJECT THREAD
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            From first conversation <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-200 to-white">
              to final collection.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            One single project record evolves continuously across 10 native stages. No duplicate data entry, no re-typing estimates, and zero communication gaps.
          </p>
        </div>

        {/* Horizontal Step Bar */}
        <div className="relative mb-12">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-4 no-scrollbar border-b border-white/[0.08]">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isActive = idx === activeStageIndex;
              const isPast = idx < activeStageIndex;

              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageIndex(idx)}
                  className={`px-4.5 py-3 rounded-2xl font-mono text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-3 shrink-0 ${
                    isActive
                      ? 'bg-white/[0.08] border border-white/30 text-white shadow-xl shadow-slate-950/60'
                      : isPast
                      ? 'bg-[#0B1017] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20'
                      : 'bg-[#080B10] border border-white/[0.04] text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] ${
                    isActive 
                      ? 'bg-white text-slate-950 shadow-[0_0_10px_#00F0FF]' 
                      : isPast 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-white/[0.06] text-slate-400'
                  }`}>
                    {stage.id}
                  </span>
                  <span className="font-bold">{stage.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Stage Visual Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch rounded-3xl bg-[#0B0F16] border border-white/[0.1] p-6 sm:p-10 shadow-[0_25px_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
          
          {/* Stage Overview & Description (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <span className="font-mono text-4xl font-black text-white">
                  {activeStage.id}
                </span>
                <div>
                  <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                    STAGE {activeStage.id} OF 10
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                    {activeStage.name}
                  </h3>
                </div>
              </div>

              <div className="inline-block px-3.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-200 mb-4 font-semibold">
                {activeStage.tagline}
              </div>

              <p className="text-slate-300 text-sm leading-relaxed font-sans">
                {activeStage.description}
              </p>
            </div>

            {/* Key Stage Metric */}
            <div className="p-5 rounded-2xl bg-[#0F1622] border border-white/[0.08] font-mono">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Stage Benchmark Output</div>
              <div className="text-2xl font-bold text-white mt-1">{activeStage.metric}</div>
              <div className="text-xs text-emerald-400 mt-1 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                {activeStage.statusText}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <button
                onClick={() => setActiveStageIndex(Math.max(0, activeStageIndex - 1))}
                disabled={activeStageIndex === 0}
                className="px-3.5 py-2 text-xs font-mono text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <button
                onClick={() => setActiveStageIndex(Math.min(LIFECYCLE_STAGES.length - 1, activeStageIndex + 1))}
                disabled={activeStageIndex === LIFECYCLE_STAGES.length - 1}
                className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/30 border border-white/20 text-slate-200 text-xs font-mono font-bold flex items-center gap-2 transition-all"
              >
                Next Stage <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* High-Fidelity UI Mockup (7 cols) */}
          <div className="lg:col-span-7 bg-[#070A0F] rounded-2xl border border-white/[0.08] p-6 font-mono text-xs flex flex-col justify-between shadow-inner">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-slate-300 ml-2 font-mono text-[11px]">
                  PROJECT / COG-PRJ-26041 :: {activeStage.technicalRef}
                </span>
              </div>
              <span className="text-[10px] text-white px-2.5 py-0.5 rounded bg-white/10 border border-white/20 font-bold">
                STAGE ACTIVE
              </span>
            </div>

            {/* Stage Payload Content */}
            <div className="py-6 space-y-4">
              
              {activeStageIndex === 0 && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#0F1522] border border-white/[0.06] flex justify-between items-center">
                    <span className="text-slate-400">Opportunity</span>
                    <span className="text-white font-bold">Horizon Workspace Turnkey Fit-Out</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <span className="text-[10px] text-slate-400 block">Footprint</span>
                      <span className="text-white font-bold">42,500 SQ.FT</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <span className="text-[10px] text-slate-400 block">Probability</span>
                      <span className="text-emerald-400 font-bold">85% Won</span>
                    </div>
                  </div>
                </div>
              )}

              {activeStageIndex === 1 && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#0F1522] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-slate-300">Laser 3D Measurement Scan</span>
                    <span className="text-emerald-400 font-bold">Tolerance 99.8%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <div className="text-[10px] text-slate-400">Slab-to-Slab</div>
                      <div className="text-white font-bold text-sm">3.85 M</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <div className="text-[10px] text-slate-400">MEP Risers</div>
                      <div className="text-white font-bold text-sm">14 Shafts</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <div className="text-[10px] text-slate-400">Photos Geotagged</div>
                      <div className="text-white font-bold text-sm">340 Files</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStageIndex === 2 && (
                <div className="space-y-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">GFC Drawing Vault (Central Distribution)</div>
                  <div className="p-3 rounded-xl bg-[#0F1522] border border-white/20 flex items-center justify-between">
                    <span className="text-white font-bold">ARCH-GFC-LVL14-PARTITION-REV04.2.dwg</span>
                    <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950 px-2 py-0.5 rounded">APPROVED</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/40 flex items-center justify-between text-slate-400">
                    <span>MEP-HVAC-DUCT-LAYOUT-REV03.1.dwg</span>
                    <span className="text-slate-400 text-[10px]">SUPERSEDED (LOCKED)</span>
                  </div>
                </div>
              )}

              {activeStageIndex === 3 && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#0F1522] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-slate-300">Vector PDF Takeoff Calibration</span>
                    <span className="text-white font-bold">Scale 1:100</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <div className="text-[10px] text-slate-400">Acoustic Panelling Area</div>
                      <div className="text-white font-bold">480 SQ.M Measured</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <div className="text-[10px] text-slate-400">Glazed Partitions</div>
                      <div className="text-white font-bold">320 SQ.M (84 L.M)</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStageIndex >= 4 && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#0F1522] border border-white/20 flex items-center justify-between">
                    <span className="text-white font-bold">Live Synchronized Stage Data</span>
                    <span className="text-emerald-400 font-bold">Lineage Active</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <div className="text-[10px] text-slate-400">Committed POs</div>
                      <div className="text-teal-400 font-bold text-sm">₹2.14 Cr</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <div className="text-[10px] text-slate-400">Billed to Client</div>
                      <div className="text-white font-bold text-sm">₹3.08 Cr</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0F1522]">
                      <div className="text-[10px] text-slate-400">Realized Margin</div>
                      <div className="text-emerald-400 font-bold text-sm">18.4% Net</div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
              <span>Automatic data preservation across all 10 project milestones</span>
              <span className="text-white font-bold">100% SYNCHRONIZED</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
