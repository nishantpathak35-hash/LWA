'use client';

import React, { useState } from 'react';
import { BOQ_SAMPLE_ITEMS } from './marketingData';
import { FileSpreadsheet, Link2, ArrowRight, Sparkles, CheckCircle2, Layers } from 'lucide-react';

export default function BOQSpine() {
  const [selectedItemId, setSelectedItemId] = useState('BOQ-01');
  const sel = BOQ_SAMPLE_ITEMS.find((b) => b.id === selectedItemId) || BOQ_SAMPLE_ITEMS[0];

  return (
    <section id="boq-spine" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative bg-transparent">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-200 font-mono text-[11px] uppercase tracking-wider mb-4 backdrop-blur-md">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          ESTIMATION & RATE ANALYSIS ENGINE
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          The Living BOQ Spine. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
            Never Over-Indent Material Again.
          </span>
        </h2>
        <p className="mt-4 text-base text-slate-200">
          Every purchase order and site indent is linked to an approved BOQ line item with live balance locking.
        </p>
      </div>

      {/* Interactive Floating Glass BOQ Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Interactive BOQ Item Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-xs font-mono text-slate-300 px-1 uppercase tracking-wider">
            Active Tender & Client BOQ Line Items
          </div>
          
          {BOQ_SAMPLE_ITEMS.map((item) => {
            const isSelected = item.id === selectedItemId;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${
                  isSelected
                    ? 'bg-white/15 border-white/30/50 shadow-lg shadow-slate-950/40 backdrop-blur-xl'
                    : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-black/45 backdrop-blur-md'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-xs mb-1">
                  <span className="text-slate-200 font-bold">{item.id}</span>
                  <span className="text-emerald-400 font-bold">{item.totalValue}</span>
                </div>
                <div className="text-sm font-semibold text-white truncate">
                  {item.description}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300 mt-2 font-mono">
                  <span>Scope: {item.quantity} {item.unit}</span>
                  <span className="text-slate-400">Rate: {item.rate}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Live Rate Analysis & Drawing Diff Viewer (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-2xl shadow-2xl space-y-5">
          
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-mono text-slate-200 uppercase">Item Specification Details</div>
              <h3 className="text-lg font-bold text-white mt-0.5">{sel.description}</h3>
            </div>
            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400">CURRENT STATUS</div>
              <div className="text-xs font-bold text-emerald-400">GFC Rev-03 Locked</div>
            </div>
          </div>

          {/* Rate Breakdown Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <div className="text-[10px] text-slate-400">MATERIAL COST</div>
              <div className="text-sm font-bold text-white mt-1">₹4,200 / Sqm</div>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <div className="text-[10px] text-slate-400">LABOUR RATE</div>
              <div className="text-sm font-bold text-white mt-1">₹1,850 / Sqm</div>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <div className="text-[10px] text-slate-400">PO INDENTS</div>
              <div className="text-sm font-bold text-slate-200 mt-1">68% Ordered</div>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/10">
              <div className="text-[10px] text-slate-400">REMAINING LIMIT</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">32% Buffer</div>
            </div>
          </div>

          {/* Connected Drawing / GFC Revision Strip */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 text-white" />
              <div>
                <div className="text-white font-bold">LINKED GFC ARCHITECTURAL DRAWING</div>
                <div className="text-slate-400 text-[11px]">DWG-INTERIOR-L03-REV04.dwg • Cloud Synced</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              VERIFIED
            </span>
          </div>

        </div>

      </div>

    </section>
  );
}
