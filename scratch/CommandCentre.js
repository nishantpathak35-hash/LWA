'use client';

import React, { useState } from 'react';
import { PORTFOLIO_PROJECTS } from './marketingData';
import { Building2, TrendingUp, AlertCircle, CheckCircle2, DollarSign, Activity } from 'lucide-react';

export default function CommandCentre() {
  const [activeProjectId, setActiveProjectId] = useState(PORTFOLIO_PROJECTS[0].id);
  const selectedProj = PORTFOLIO_PROJECTS.find((p) => p.id === activeProjectId) || PORTFOLIO_PROJECTS[0];

  return (
    <section id="command-centre" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative bg-transparent">
      
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-200 font-mono text-[11px] uppercase tracking-wider mb-4 backdrop-blur-md">
          <Activity className="w-3.5 h-3.5" />
          EXECUTIVE PORTFOLIO INTELLIGENCE
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          Executive Command Centre. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
            Multi-Site Radar in One Screen.
          </span>
        </h2>
        <p className="mt-4 text-base text-slate-200">
          Track live project margins, committed procurement vs budget actuals, and critical path milestone health across all active turnkey fit-outs.
        </p>
      </div>

      {/* Main Command Console */}
      <div className="rounded-3xl border border-white/20 bg-black/40 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Project Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="text-xs font-mono text-slate-200 uppercase font-bold">Active Fit-Out Sites</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {PORTFOLIO_PROJECTS.map((proj) => {
                const isActive = proj.id === activeProjectId;
                return (
                  <button
                    key={proj.id}
                    onClick={() => setActiveProjectId(proj.id)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-white/[0.08] text-slate-200 border border-white/30/50 font-bold shadow-md'
                        : 'bg-black/40 text-slate-300 border border-white/10 hover:bg-black/60 hover:text-white'
                    }`}
                  >
                    {proj.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-right font-mono hidden sm:block">
            <div className="text-[10px] text-slate-400">PORTFOLIO VALUE</div>
            <div className="text-sm font-bold text-emerald-400">₹142.5 Cr Under Management</div>
          </div>
        </div>

        {/* Selected Project Live Telemetry */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left font-mono">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <div className="text-[10px] text-slate-400 uppercase">CONTRACT VALUE</div>
            <div className="text-base sm:text-lg font-bold text-white mt-1">{selectedProj.value}</div>
            <div className="text-[10px] text-slate-200 mt-1">{selectedProj.sqft} sq.ft fit-out</div>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <div className="text-[10px] text-slate-400 uppercase">PHYSICAL PROGRESS</div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1">{selectedProj.progress}% Completed</div>
            <div className="text-[10px] text-slate-300 mt-1">Milestone on track</div>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <div className="text-[10px] text-slate-400 uppercase">PROJECTED MARGIN</div>
            <div className="text-base sm:text-lg font-bold text-slate-200 mt-1">{selectedProj.margin}</div>
            <div className="text-[10px] text-emerald-400 mt-1">+1.8% vs budget plan</div>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <div className="text-[10px] text-slate-400 uppercase">RISK RADAR</div>
            <div className="text-base sm:text-lg font-bold text-emerald-300 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{selectedProj.risk}</span>
            </div>
            <div className="text-[10px] text-slate-300 mt-1">0 unbilled variations</div>
          </div>
        </div>

      </div>

    </section>
  );
}
