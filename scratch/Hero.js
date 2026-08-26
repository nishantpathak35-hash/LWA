'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronDown, CheckCircle2, Activity, Building2 } from 'lucide-react';

const LIVE_SITE_UPDATES = [
  { site: 'Horizon HQ (Gurugram)', event: 'Acoustic Paneling: 420 Sqm Verified (GRN #0241)', time: 'Just now' },
  { site: 'Fintech Hub (BKC Mumbai)', event: 'Client Certified RA Bill #04 (₹48.2 Lakhs)', time: '3m ago' },
  { site: 'Aura Biotech (Bengaluru)', event: 'MEP VRF Pressure Test Passed @ 1.5x WP', time: '12m ago' },
  { site: 'Oberoi Penthouse (Worli)', event: 'Tripartite JMR #02 Signed by Principal Architect', time: '18m ago' },
];

export default function Hero({ onOpenDemo }) {
  const [activeUpdateIndex, setActiveUpdateIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveUpdateIndex((prev) => (prev + 1) % LIVE_SITE_UPDATES.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const currentUpdate = LIVE_SITE_UPDATES[activeUpdateIndex];

  return (
    <section id="overview" className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 pt-28 pb-16 z-10 bg-transparent">
      
      {/* Category Tag */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] backdrop-blur-2xl text-slate-200 text-xs mb-6 shadow-xl">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="font-semibold text-white tracking-wide">
          Construction Management Software
        </span>
        <span className="text-white/20">|</span>
        <span className="text-slate-300">Built for Interior & Fit-Out Contractors</span>
      </div>

      {/* Perfectly Scaled Monumental Headline */}
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.06] uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.9)] font-display">
          FROM BARE SHELL <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            TO HANDOVER.
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl font-normal text-slate-200 max-w-2xl mx-auto tracking-normal leading-relaxed drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-sans">
          Manage estimation, BOQs, site progress, vendor procurement, and project billing on a single unified platform.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 w-full sm:w-auto">
        <button
          onClick={onOpenDemo}
          className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 active:scale-95 transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.25)] cursor-pointer"
        >
          <span>Schedule a Live Demo</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <a
          href="#boq-estimation"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-medium text-xs border border-white/20 backdrop-blur-2xl transition-all duration-200"
        >
          <span>Explore Platform Features</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
        </a>
      </div>

      {/* Live Active Site Telemetry Ticker */}
      <div className="mt-10 max-w-xl w-full mx-auto p-2.5 rounded-2xl bg-[#0A0D12]/75 border border-white/10 backdrop-blur-xl shadow-2xl flex items-center justify-between text-xs font-mono text-left transition-all duration-500">
        <div className="flex items-center gap-2 truncate pr-2">
          <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="truncate text-[11px]">
            <span className="text-white font-bold">{currentUpdate.site}: </span>
            <span className="text-slate-300 font-sans">{currentUpdate.event}</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap pl-2 border-l border-white/10">
          {currentUpdate.time}
        </div>
      </div>

      {/* Industry Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 max-w-4xl w-full mx-auto">
        {[
          { metric: '₹140+ Cr', label: 'Active Projects Managed', sub: 'Across 12+ Concurrent Sites' },
          { metric: '0', label: 'Unbilled Site Variations', sub: 'Pre-Approved Work Orders' },
          { metric: '4 Days', label: 'Client Billing Cycle', sub: 'From Measurement to Invoice' },
          { metric: '100%', label: 'GST & TDS Compliant', sub: 'Direct Tally Prime Sync' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 sm:p-4 rounded-2xl bg-[#0A0D12]/65 border border-white/10 backdrop-blur-xl text-left shadow-xl"
          >
            <div className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              {item.metric}
            </div>
            <div className="text-xs font-semibold text-slate-200 mt-1">
              {item.label}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
              {item.sub}
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
