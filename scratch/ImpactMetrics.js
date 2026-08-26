'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function ImpactMetrics() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative bg-transparent text-center">
      
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-200 font-mono text-[11px] uppercase tracking-wider mb-4 backdrop-blur-md">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        COMMERCIAL SCALE & IMPACT
      </div>

      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase max-w-3xl mx-auto drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] font-display">
        Measurable Results for <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
          Fit-Out Enterprises.
        </span>
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12 text-left">
        {[
          {
            number: '₹1,400+ Cr',
            label: 'Total Projects Managed',
            desc: 'Deployed across commercial corporate offices, retail spaces, and luxury residential projects.',
          },
          {
            number: '0',
            label: 'Unbilled Site Variations',
            desc: 'Every change in project scope is documented and approved before work commences.',
          },
          {
            number: '4 Days',
            label: 'Average Billing Cycle',
            desc: 'Accelerated from 42 days via automated Joint Measurement Records (JMR).',
          },
          {
            number: '45 Days',
            label: 'Typical System Payback',
            desc: 'Delivers immediate return by stopping material waste and unrecorded labor overtime.',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="p-5 sm:p-6 rounded-2xl bg-[#0A0D12]/65 border border-white/10 backdrop-blur-xl shadow-xl space-y-2.5 hover:border-white/25 transition-all duration-300"
          >
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
              {stat.number}
            </div>
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              {stat.label}
            </div>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              {stat.desc}
            </p>
          </div>
        ))}
      </div>

    </section>
  );
}
