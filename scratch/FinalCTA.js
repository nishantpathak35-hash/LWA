'use client';

import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function FinalCTA({ onOpenDemo }) {
  return (
    <section className="relative py-20 overflow-hidden text-center z-10 bg-transparent">
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Headline */}
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.05] mb-4 uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] font-display">
          FROM BARE SHELL <br />
          TO FINAL HANDOVER. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            TOTAL OPERATIONAL CONTROL.
          </span>
        </h2>

        <p className="text-sm sm:text-lg text-slate-200 max-w-2xl mx-auto mb-8 leading-relaxed font-light drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          Eliminate site leakages, spreadsheet errors, and delayed contractor billing. Run your turnkey interior projects on a single system of record.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
          <button
            onClick={onOpenDemo}
            className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider transition-all duration-200 hover:bg-slate-200 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.25)] cursor-pointer"
          >
            <span>Schedule a Live Demo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <a
            href="#boq-estimation"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold text-xs bg-white/[0.06] border border-white/20 hover:border-white/40 hover:bg-white/[0.12] backdrop-blur-xl transition-all"
          >
            <span>Explore All Features</span>
          </a>
        </div>

        {/* Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-300">
          {[
            'Built for Commercial & Residential Contractors',
            'Tally Prime & Tax Compliance Native',
            'Dedicated Onboarding Support',
            'No Long-Term Lock-in',
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-white" /> {t}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}
