'use client';

import React, { useState } from 'react';
import { CheckCircle2, TrendingUp, Calculator } from 'lucide-react';

export default function QualitativeOutcomes() {
  const [turnover, setTurnover] = useState(25); // In Crores (₹ Cr)
  const [projectCount, setProjectCount] = useState(8);

  const unbilledVariationsSaved = (turnover * 0.038).toFixed(2);
  const procurementLeakageSaved = (turnover * 0.042).toFixed(2);
  const adminManhoursSavedInLakhs = Math.round(projectCount * 4.5);
  const totalAnnualSavings = (
    parseFloat(unbilledVariationsSaved) + 
    parseFloat(procurementLeakageSaved) + 
    (adminManhoursSavedInLakhs / 100)
  ).toFixed(2);

  const benefits = [
    { 
      title: 'Zero Unbilled Scope Creep', 
      desc: 'Site engineers log design variations on mobile before work begins, ensuring client sign-off prior to contractor execution.',
      stat: '+3.8% Margin'
    },
    { 
      title: 'Faster Purchase Approvals', 
      desc: 'Approve vendor purchase orders against live BOQ item balances without waiting for manual Excel verifications.',
      stat: '90% Faster'
    },
    { 
      title: 'Locked Material Indents', 
      desc: 'Prevent over-ordering at site by capping material purchase orders strictly to approved BOQ quantities.',
      stat: 'Budget Locked'
    },
    { 
      title: 'Complete Cash & Billing Clarity', 
      desc: 'Track certified client billings, tax withholdings, contractor payables, and retention release dates on one screen.',
      stat: 'Live Tracking'
    },
    { 
      title: 'Subcontractor Self-Service', 
      desc: 'Vendors view approved work orders, submit measurement sheets, and track payment UTRs without manual follow-up.',
      stat: 'Less Friction'
    },
    { 
      title: 'One Shared System of Record', 
      desc: 'Quantity surveyors, project managers, site engineers, and billing teams operate on the exact same project data.',
      stat: 'Audit Ready'
    }
  ];

  return (
    <section id="roi-simulator" className="scroll-mt-28 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative bg-transparent">
      
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] uppercase tracking-wider mb-3 backdrop-blur-md">
          <Calculator className="w-3.5 h-3.5" />
          COMMERCIAL IMPACT CALCULATOR
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] font-display">
          Protect Your Project Margins. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-100 to-white">
            Prevent 6% to 9% Profit Erosion.
          </span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-300 font-light">
          Estimate the direct financial impact of eliminating unbilled site variations and unauthorized material over-ordering.
        </p>
      </div>

      {/* Interactive Margin Protection Calculator */}
      <div className="mb-12 p-5 sm:p-8 rounded-3xl bg-[#0A0D12]/60 border border-emerald-500/20 backdrop-blur-2xl shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Controls (6 Cols) */}
          <div className="lg:col-span-6 space-y-5 text-left">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-display">Project Volume Parameters</h3>
              <p className="text-xs text-slate-300">Adjust parameters to reflect your contracting operations</p>
            </div>

            {/* Slider 1: Annual Turnover */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm font-medium">
                <span className="text-slate-300">Annual Contracting Turnover:</span>
                <span className="text-emerald-400 font-bold font-mono text-sm sm:text-base">₹{turnover} Crores</span>
              </div>
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={turnover}
                onChange={(e) => setTurnover(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>₹5 Cr</span>
                <span>₹75 Cr</span>
                <span>₹150 Cr+</span>
              </div>
            </div>

            {/* Slider 2: Active Concurrent Projects */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm font-medium">
                <span className="text-slate-300">Active Concurrent Sites:</span>
                <span className="text-white font-bold font-mono text-sm sm:text-base">{projectCount} Projects</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={projectCount}
                onChange={(e) => setProjectCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>2 Sites</span>
                <span>15 Sites</span>
                <span>30+ Sites</span>
              </div>
            </div>

            {/* Savings Breakdown */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase truncate">Recovered Scope Changes</div>
                <div className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
                  +₹{unbilledVariationsSaved} Cr
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-sans">Avg 3.8% unbilled work recovery</div>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase truncate">Over-Ordering Prevented</div>
                <div className="text-sm sm:text-base font-bold text-white mt-0.5">
                  +₹{procurementLeakageSaved} Cr
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-sans">Avg 4.2% material cost control</div>
              </div>
            </div>
          </div>

          {/* Result Display (6 Cols) */}
          <div className="lg:col-span-6 p-5 sm:p-7 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-black/60 to-black/80 border border-emerald-500/30 text-left flex flex-col justify-between shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                ESTIMATED ANNUAL IMPACT
              </div>

              <div className="text-[11px] text-slate-300 uppercase font-mono">Total Protected Annual Profit</div>
              
              <div className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-1 font-mono flex items-baseline gap-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white">
                  ₹{totalAnnualSavings}
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-400">Crores / Year</span>
              </div>

              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed font-sans font-light">
                Based on industry benchmarks across commercial fit-out projects. The software pays for itself within the first 45 days of active site deployment.
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">Client Billing Cycle:</span>
              <span className="text-emerald-400 font-bold">4 Days (vs 42 Industry Avg)</span>
            </div>
          </div>

        </div>
      </div>

      {/* 6 Operational Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto text-left">
        {benefits.map((item, i) => (
          <div 
            key={i}
            className="p-5 rounded-2xl bg-[#0A0D12]/60 border border-white/10 hover:border-emerald-500/40 backdrop-blur-xl transition-all duration-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2.5">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PILLAR 0{i + 1}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px]">
                  {item.stat}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-display">
                {item.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-sans font-light">
                {item.desc}
              </p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-white/5 text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
              OPERATIONAL STANDARD
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
