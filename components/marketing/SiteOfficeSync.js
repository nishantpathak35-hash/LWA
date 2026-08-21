'use client';

import React, { useState } from 'react';
import { 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  RefreshCw, 
  Hammer, 
  Camera, 
  Receipt, 
  ArrowRight,
  Wifi,
  Activity,
  Layers
} from 'lucide-react';

export default function SiteOfficeSync() {
  const [synced, setSynced] = useState(false);

  const handleSimulateSync = () => {
    setSynced(true);
    setTimeout(() => setSynced(false), 4500);
  };

  return (
    <section id="site-sync" className="py-24 bg-[#080A0C] border-b border-white/[0.06] relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] uppercase tracking-wider mb-4">
            <Hammer className="w-3.5 h-3.5" />
            FIELD-TO-OFFICE REALITY
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            The site and office finally work <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-white">
              from the same reality.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            No more waiting for end-of-week spreadsheet summaries. Site progress, manpower logs, delivery gate notes, and imprest expenses update the central HQ dashboard instantly.
          </p>
        </div>

        {/* Live Simulation Button */}
        <div className="text-center mb-10">
          <button
            onClick={handleSimulateSync}
            className="px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${synced ? 'animate-spin text-emerald-400' : 'text-cyan-400'}`} />
            <span>{synced ? 'SYNCHRONIZING SITE & HQ IN REALTIME...' : 'SIMULATE SITE LOG UPDATE (CLICK TO TEST)'}</span>
          </button>
        </div>

        {/* Dual Split-Screen: Mobile Site vs Desktop Office */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT: Mobile Site Experience (4 cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-[#0c1015] border border-white/[0.08] p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                  <Smartphone className="w-4 h-4" />
                  SITE ENGINEER MOBILE APP
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>ONLINE (GURGAON SITE)</span>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                
                {/* Mobile Item 1: DPR */}
                <div className={`p-3.5 rounded-xl border transition-all duration-300 ${
                  synced ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-900/80 border-white/[0.06]'
                }`}>
                  <div className="flex items-center justify-between font-bold text-white mb-1">
                    <span>Daily Progress (DPR)</span>
                    <span className="text-emerald-400 text-[10px]">{synced ? 'SUBMITTED' : 'READY'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Acoustic Panelling Level 14: <strong className="text-white">85% Completed</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <Camera className="w-3 h-3 text-cyan-400" />
                    <span>8 Geotagged site photos attached</span>
                  </div>
                </div>

                {/* Mobile Item 2: GRN Delivery */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06]">
                  <div className="flex items-center justify-between font-bold text-white mb-1">
                    <span>Material Gate Receipt (GRN)</span>
                    <span className="text-cyan-400 text-[10px]">VERIFIED</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    DORMA Glass Partitions: <strong>320 SQ.M Received</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Challan #DC-984 matched against PO #COG-0244
                  </div>
                </div>

                {/* Mobile Item 3: Site Imprest */}
                <div className={`p-3.5 rounded-xl border transition-all duration-300 ${
                  synced ? 'bg-amber-950/40 border-amber-500/50' : 'bg-slate-900/80 border-white/[0.06]'
                }`}>
                  <div className="flex items-center justify-between font-bold text-white mb-1">
                    <span>Site Petty Cash Voucher</span>
                    <span className="text-amber-400 text-[10px]">₹18,450</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Emergency scaffolding clamp purchase + freight
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <Receipt className="w-3 h-3 text-amber-400" />
                    <span>GST Bill scanned & uploaded</span>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Syncing with Construct-O-Genie Cloud</span>
              <span className="text-emerald-400">PWA NATIVE</span>
            </div>
          </div>

          {/* RIGHT: Desktop HQ Command Dashboard (8 cols) */}
          <div className="lg:col-span-8 rounded-3xl bg-[#0c1015] border border-white/[0.08] p-6 sm:p-8 shadow-2xl font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.06] mb-6 gap-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Monitor className="w-4 h-4" />
                  HQ COMMAND CENTRE (HEAD OFFICE DESKTOP)
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>PROJECT: HORIZON WORKSPACE (DLF GURGAON)</span>
                </div>
              </div>

              {/* Real-time Dynamic Metrics updated by Site */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400 uppercase">Live Site Progress</div>
                  <div className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                    <span>{synced ? '72%' : '67%'}</span>
                    {synced && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded animate-bounce">
                        +5% TODAY
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">DPR verified by PM</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400 uppercase">Goods Received (GRN)</div>
                  <div className="text-2xl font-bold text-teal-400 mt-1">₹1.88 Cr</div>
                  <div className="text-[10px] text-slate-400 mt-1">Ready for RA Bill match</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400 uppercase">Site Imprest Balance</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {synced ? '₹31,550' : '₹50,000'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {synced ? '₹18,450 Reconciled' : 'Limit: ₹50,000'}
                  </div>
                </div>

              </div>

              {/* Realtime Action Feed */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.04] space-y-2.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Live Project Event Stream
                </div>
                
                <div className="flex items-center justify-between text-[11px] p-2 rounded bg-white/[0.02]">
                  <span className="text-slate-300">14:15 · Site engineer logged 42 carpenters on Level 14</span>
                  <span className="text-emerald-400 font-bold">DPR RECORDED</span>
                </div>
                <div className="flex items-center justify-between text-[11px] p-2 rounded bg-white/[0.02]">
                  <span className="text-slate-300">12:30 · Saint-Gobain glass delivery certified by Gate In-charge</span>
                  <span className="text-cyan-400 font-bold">GRN-109</span>
                </div>
                <div className="flex items-center justify-between text-[11px] p-2 rounded bg-white/[0.02]">
                  <span className="text-slate-300">10:45 · Client representative approved JMR Section 4.1</span>
                  <span className="text-purple-400 font-bold">JMR SIGNED</span>
                </div>
              </div>

            </div>

            <div className="mt-6 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-cyan-400 flex items-center justify-between">
              <span>Single source of truth between Head Office and Project Sites</span>
              <span>ZERO COMMUNICATION DELAYS</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
