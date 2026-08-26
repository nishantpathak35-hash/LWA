'use client';

import React from 'react';
import { INDIA_OPS_CHIPS } from './marketingData';
import { ShieldCheck, Layers, FileCheck2, Cpu } from 'lucide-react';

export default function IndiaNativeOps() {
  return (
    <section id="india-ops" className="bg-transparent py-24  border-b border-white/[0.06] relative overflow-hidden">
      
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-white font-mono text-[11px] uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            NATIVE COMMERCIAL DNA
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Built for how interior businesses <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-200 to-white">
              actually operate.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            You don't need to teach Construct-O-Genie what an RA bill, JMR, or 194C TDS deduction is. Every commercial workflow in the Indian interior execution industry is built into the core.
          </p>
        </div>

        {/* 12 Native Capability Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INDIA_OPS_CHIPS.map((chip, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#0c1015] border border-white/[0.08] hover:border-white/20 transition-all duration-200 shadow-xl group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between font-mono mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.12] text-white font-bold text-xs">
                    {chip.code}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">0{idx + 1} // NATIVE</span>
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-slate-200 transition-colors">
                  {chip.label}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {chip.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.04] text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>Zero configuration required</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
