'use client';

import React from 'react';
import { Crosshair, ChevronDown } from 'lucide-react';
import { STAGES } from './ArchitecturalCanvas';

export default function ScrollStageIndicator({ scrollProgress = 0, currentStageIndex = 0 }) {
  const currentStage = STAGES[currentStageIndex] || STAGES[0];

  return (
    <aside 
      aria-label="Deconstruction Stage Progress"
      className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-end gap-3 pointer-events-none select-none"
    >
      {/* Live Stage Badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#080C12]/80 border border-white/[0.08] backdrop-blur-xl shadow-2xl font-mono text-[10px] text-slate-300">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span className="text-white font-bold tracking-wider">{currentStage.name}</span>
        <span className="text-white/20">|</span>
        <span className="text-white">{currentStage.elevation}</span>
      </div>

      {/* Vertical Track with Nodes */}
      <div className="flex flex-col items-center gap-4 py-2 px-2 rounded-full bg-black/40 border border-white/[0.06] backdrop-blur-md">
        {STAGES.map((s, idx) => {
          const isActive = idx === currentStageIndex;
          const isPassed = idx < currentStageIndex;

          return (
            <div key={s.id} className="group relative flex items-center justify-center">
              {/* Tooltip on left */}
              <div className="absolute right-7 px-2.5 py-1 rounded-lg bg-black/90 border border-white/10 text-[10px] font-mono whitespace-nowrap text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                <span className="text-white font-bold">{s.name}</span>
                <span className="text-slate-400 ml-1.5">({s.subtitle})</span>
              </div>

              {/* Node Indicator */}
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'scale-125 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                    : isPassed
                    ? 'bg-slate-400'
                    : 'bg-white/20'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Progress Metric */}
      <div className="text-[10px] font-mono text-slate-400 pr-1">
        {Math.round(scrollProgress * 100)}% DECONSTRUCTED
      </div>
    </aside>
  );
}
