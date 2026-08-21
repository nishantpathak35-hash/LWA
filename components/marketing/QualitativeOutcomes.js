'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  FileSpreadsheet, 
  DollarSign, 
  Sparkles 
} from 'lucide-react';

export default function QualitativeOutcomes() {
  const outcomes = [
    { title: 'Fewer spreadsheets.', desc: 'Eliminate duplicate estimation spreadsheets, static rate cards, and disconnected trackers.' },
    { title: 'Faster approvals.', desc: 'Clear high-value POs and vendor payments in minutes with complete budget context on mobile.' },
    { title: 'Cleaner procurement.', desc: 'Lock purchase orders directly to BOQ line items so vendors are never over-committed.' },
    { title: 'Better cash visibility.', desc: 'See progressive client billings, receivables, vendor payables, and retention on one screen.' },
    { title: 'Controlled project margins.', desc: 'Stop margin erosion from unbilled site variations, scope creep, and unverified vendor bills.' },
    { title: 'Fewer vendor follow-ups.', desc: 'Self-service vendor portal provides immediate visibility into PO status, GRN matching, and UTRs.' },
    { title: 'One source of truth.', desc: 'Design, procurement, site engineers, and finance work together on the exact same project record.' }
  ];

  return (
    <section className="py-24 bg-[#080A0C] border-b border-white/[0.06] relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            MEASURABLE IMPACT
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            The impact of operating on <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-white">
              a single source of truth.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Construct-O-Genie replaces fragmented WhatsApp chats and spreadsheet chaos with structural commercial discipline.
          </p>
        </div>

        {/* 7 Outcomes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {outcomes.map((item, i) => (
            <div 
              key={i}
              className="p-6 rounded-2xl bg-[#0c1015] border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5 text-emerald-400 font-mono text-xs font-bold mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PILLAR 0{i + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-mono">
                  {item.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-white/[0.04] text-[10px] font-mono text-emerald-400">
                PROVEN OPERATIONAL STANDARD
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
