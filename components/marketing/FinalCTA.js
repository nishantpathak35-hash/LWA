'use client';

import React from 'react';
import { ArrowRight, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

export default function FinalCTA({ onOpenDemo }) {
  return (
    <section className="py-28 bg-gradient-to-b from-[#080A0C] via-[#0b1017] to-[#080A0C] border-b border-white/[0.06] relative overflow-hidden text-center">
      
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

      {/* Center Cyan Atmospheric Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-cyan-500/15 via-teal-500/10 to-transparent blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Technical Coordinate */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-6">
          <Layers className="w-3.5 h-3.5" />
          READY FOR ENTERPRISE DEPLOYMENT
        </div>

        {/* Cinematic Headline */}
        <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-[1.1]">
          Your next project deserves <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-400">
            a better operating system.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Connect your projects, people, procurement and money in one place. Schedule a personalized architectural walkthrough for your leadership team.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onOpenDemo}
            className="w-full sm:w-auto px-9 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-400 text-slate-950 font-bold text-sm tracking-wide uppercase font-mono shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            <span>Book a Demo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <a
            href="#lifecycle"
            className="w-full sm:w-auto px-7 py-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-mono tracking-wide border border-white/[0.1] hover:border-white/[0.2] transition-all"
          >
            Explore Construct-O-Genie
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            Designed specifically for Interior Contractors
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            Tally & GST Compliant
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            Zero Credit Card Required for Demo
          </span>
        </div>

      </div>
    </section>
  );
}
