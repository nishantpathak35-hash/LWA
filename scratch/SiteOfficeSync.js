'use client';

import React from 'react';
import { Smartphone, CheckCircle2, WifiOff, Camera, MapPin, ArrowRight } from 'lucide-react';

export default function SiteOfficeSync() {
  return (
    <section id="site-sync" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative bg-transparent">
      
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-200 font-mono text-[11px] uppercase tracking-wider mb-4 backdrop-blur-md">
          <Smartphone className="w-3.5 h-3.5" />
          OFFLINE-FIRST MOBILE SITE APP
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          Field Site & Office Sync. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
            No More Lost WhatsApp DPRs.
          </span>
        </h2>
        <p className="mt-4 text-base text-slate-200">
          Site engineers log daily labor progress, materials consumed, and geofenced snag photos directly from mobile—even with zero connectivity in basement fit-outs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Real Software Screenshot inside Mobile Frame (6 Cols) */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl p-2 shadow-2xl overflow-hidden">
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img
                src="/site-sync.jpg"
                alt="Mobile Site Execution App"
                className="w-full h-auto object-cover filter brightness-[0.95] contrast-[1.05]"
              />
            </div>
            
            {/* Live offline sync indicator badge */}
            <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/90 text-slate-950 font-mono text-[10px] font-bold shadow-lg">
              <WifiOff className="w-3 h-3" />
              <span>OFFLINE SYNC READY</span>
            </div>
          </div>
        </div>

        {/* Right: Key Field Capabilities (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {[
            {
              title: 'Digital Daily Progress Reports (DPR)',
              desc: 'Log carpenter headcounts, drywall plaster progress, and painter hours in 90 seconds. Generates instant PDF reports for clients.',
            },
            {
              title: 'Geofenced Snagging & Quality Checklists',
              desc: 'Tag snags directly on 2D floor plans with photo proof and assign them immediately to trade subcontractors.',
            },
            {
              title: 'Digital Joint Measurement Records (JMR)',
              desc: 'Record physical site measurements and get digital on-screen client sign-offs before generating RA bills.',
            },
            {
              title: 'Material GRN & Delivery Matching',
              desc: 'Scan vendor delivery challans at the site gate to prevent quantity shrinkage and duplicate billing.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-black/30 border border-white/10 hover:border-white/30/40 backdrop-blur-md transition-all duration-200 text-left"
            >
              <div className="flex items-center gap-2.5 text-slate-200 font-mono text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>CAPABILITY 0{idx + 1}</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">{item.title}</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

      </div>

    </section>
  );
}
