"use client";

import React from "react";
import { XCircle, CheckCircle2, AlertTriangle, MessageSquare, FileSpreadsheet, HelpCircle, ArrowRight } from "lucide-react";

export default function ProblemSection() {
  return (
    <section className="bg-transparent section-pad  border-b border-white/[0.07] cad-grid relative overflow-hidden">
      
      {/* Vivid background blobs */}
      <div className="absolute top-0 left-0 w-[600px] h-[400px] rounded-full opacity-20 pointer-events-none"
           style={{background:"radial-gradient(circle, #ef4444 0%, transparent 70%)", transform:"translate(-30%, -30%)"}} />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full opacity-15 pointer-events-none"
           style={{background:"radial-gradient(circle, #22d3ee 0%, transparent 70%)", transform:"translate(30%, 30%)"}} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs uppercase tracking-wider mb-5 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" /> THE REAL PROBLEM
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Your business has outgrown{" "}
            <span className="text-transparent bg-clip-text" style={{backgroundImage:"linear-gradient(135deg, #fb923c, #fbbf24)"}}>
              WhatsApp + Excel.
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-300">When 5 departments operate in silos, you bleed margin every single day.</p>
        </div>

        {/* Before / After Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* BEFORE */}
          <div className="relative rounded-3xl overflow-hidden border border-red-500/30 p-8 sm:p-10"
               style={{background:"linear-gradient(135deg, rgba(127,29,29,0.25) 0%, rgba(9,12,16,0.95) 50%)"}}>
            <div className="absolute top-0 right-0 px-4 py-2 rounded-bl-2xl bg-red-500/20 border-l border-b border-red-500/30 font-mono text-xs text-red-400 uppercase font-bold">
              WITHOUT CONSTRUCT-O-GENIE
            </div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">The Fragmented Chaos</h3>
                <p className="text-xs text-red-400 font-mono font-bold mt-0.5">12 DISCONNECTED TOOLS</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { icon: FileSpreadsheet, color: "text-amber-400", title: "BOQ_FINAL_rev3(2).xlsx", desc: "Estimator updated rates. Site procurement ordered from outdated version. ₹3.2L rework." },
                { icon: MessageSquare, color: "text-blue-400", title: '"Approve ₹8.4L marble PO urgently sir"', desc: "Director has no budget context. No drawing confirmation. Blind approval." },
                { icon: AlertTriangle, color: "text-red-400", title: "Site installed superseded GFC Rev 02", desc: "Client disputes milestone. Invoice delayed 6 weeks. Cash flow hit." },
                { icon: HelpCircle, color: "text-purple-400", title: "Finance manually checking bank UTRs", desc: "Vendors calling site engineers daily. 4 hours/week wasted on follow-ups." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-black/40 border border-white/[0.05]">
                  <item.icon className={`w-5 h-5 ${item.color} shrink-0 mt-0.5`} />
                  <div>
                    <div className="font-semibold text-white text-sm">{item.title}</div>
                    <div className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-5 border-t border-red-500/20 flex justify-between font-mono text-xs text-red-400 font-bold">
              <span>Result: Margin erosion</span>
              <span>EST. 5-8% REVENUE LOSS</span>
            </div>
          </div>

          {/* AFTER */}
          <div className="relative rounded-3xl overflow-hidden border border-white/20 p-8 sm:p-10"
               style={{background:"linear-gradient(135deg, rgba(8,51,68,0.4) 0%, rgba(9,12,16,0.95) 50%)", boxShadow:"0 0 60px rgba(34,211,238,0.15)"}}>
            <div className="absolute top-0 right-0 px-4 py-2 rounded-bl-2xl bg-white/[0.08] border-l border-b border-white/20 font-mono text-xs text-slate-200 uppercase font-bold">
              WITH CONSTRUCT-O-GENIE
            </div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.08] border border-white/20 flex items-center justify-center"
                   style={{boxShadow:"0 0 20px rgba(34,211,238,0.3)"}}>
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">One Project. One Truth.</h3>
                <p className="text-xs text-white font-mono font-bold mt-0.5">SYNCHRONIZED OPERATING LAYER</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { num:"01", color:"border-white/20 bg-white/10", tc:"text-white", title:"Design knows what changed.", desc:"GFC Drawing Vault distributes approved revisions instantly to site tablets. Superseded drawings are locked." },
                { num:"02", color:"border-amber-500/40 bg-amber-950/20", tc:"text-amber-400", title:"Procurement knows what to order.", desc:"POs generated from BOQ items with automatic category budget guardrails. Zero over-commitment." },
                { num:"03", color:"border-emerald-500/40 bg-emerald-950/20", tc:"text-emerald-400", title:"Site knows what to execute.", desc:"Digital DPRs and JMRs sync in real-time. Site imprest petty cash reconciled automatically." },
                { num:"04", color:"border-purple-500/40 bg-purple-950/20", tc:"text-purple-400", title:"Finance sees the exact margin.", desc:"Live project P&L, 194C TDS auto-deduction, RA bill certification, Tally XML export." },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border ${item.color}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${item.tc} bg-black/30`}>
                    {item.num}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{item.title}</div>
                    <div className="text-xs text-slate-300 mt-1 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-5 border-t border-white/20 flex justify-between font-mono text-xs text-white font-bold">
              <span>Result: 18.4% guaranteed net margin</span>
              <span>TOTAL CONTROL</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
