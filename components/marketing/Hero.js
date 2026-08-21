'use client';

import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  ArrowRight, 
  Play, 
  Activity, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  TrendingUp,
  Cpu,
  ArrowUpRight,
  Maximize2
} from 'lucide-react';
import { DEMO_PROJECT } from './marketingData';

export default function Hero({ onOpenDemo }) {
  const [activeNode, setActiveNode] = useState('project');
  const [pulseStep, setPulseStep] = useState(0);

  const steps = [
    { key: 'crm', title: 'Lead Converted', desc: '₹4.82 Cr commercial opportunity won' },
    { key: 'recce', title: 'Site Recce Done', desc: '3D laser scan & 340 photos captured' },
    { key: 'design', title: 'GFC Rev 04.2 Approved', desc: 'Architectural & MEP drawings released' },
    { key: 'boq', title: 'BOQ Populated', desc: '148 item rates calibrated to scale' },
    { key: 'procurement', title: 'PO #COG-0241 Created', desc: '₹2.14 Cr committed across 14 vendors' },
    { key: 'site', title: 'DPR & Progress 67%', desc: 'Acoustic panelling installed & certified' },
    { key: 'billing', title: 'Client Bill #03 Raised', desc: '₹3.08 Cr progressive GST invoice' },
    { key: 'finance', title: 'Vendor Payment Cleared', desc: 'TDS 194C deducted, UTR generated' },
    { key: 'pl', title: 'Margin Realized', desc: '18.4% Net Project Margin (₹88.7L)' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseStep((prev) => (prev + 1) % steps.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [steps.length]);

  const nodes = [
    { id: 'crm', label: 'CRM & LEAD', coord: 'top-4 left-6 sm:left-12', color: 'border-cyan-500/50 text-cyan-400 bg-cyan-950/30' },
    { id: 'design', label: 'DESIGN & GFC', coord: 'top-4 right-6 sm:right-12', color: 'border-blue-500/50 text-blue-400 bg-blue-950/30' },
    { id: 'boq', label: 'BOQ & ESTIMATION', coord: 'top-1/2 -translate-y-1/2 -left-2 sm:left-4', color: 'border-amber-500/50 text-amber-400 bg-amber-950/30' },
    { id: 'procurement', label: 'PROCUREMENT & PO', coord: 'top-1/2 -translate-y-1/2 -right-2 sm:right-4', color: 'border-teal-500/50 text-teal-400 bg-teal-950/30' },
    { id: 'site', label: 'SITE & DPR', coord: 'bottom-6 left-6 sm:left-12', color: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30' },
    { id: 'finance', label: 'FINANCE & TDS', coord: 'bottom-6 right-6 sm:right-12', color: 'border-purple-500/50 text-purple-400 bg-purple-950/30' }
  ];

  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-[#080A0C] border-b border-white/[0.06]">
      
      {/* Precision CAD Architectural Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Subtle Cyan Radial Atmospheric Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[450px] bg-gradient-to-b from-cyan-500/10 via-teal-500/5 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Technical Coordinate Eyebrow */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md mb-8 animate-fade-in shadow-inner shadow-cyan-500/10">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase">
            THE OPERATING SYSTEM FOR INTERIOR & FIT-OUT COMPANIES
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono text-cyan-400/80 border-l border-white/10 pl-2">
            GRID: 28.4595° N, 77.0266° E // REV 04.2
          </span>
        </div>

        {/* Cinematic Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-5xl mx-auto leading-[1.08] selection:bg-cyan-500/30">
          Run your entire interior business from <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-400">one operating system.</span>
        </h1>

        {/* Architectural Subtitle */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-normal">
          From the first site survey to the final vendor payment, Construct-O-Genie connects design, BOQs, procurement, execution, billing and finance around every project.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onOpenDemo}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-400 text-slate-950 font-bold text-sm tracking-wide uppercase font-mono shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            <span>Book a Demo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <a 
            href="#lifecycle"
            className="w-full sm:w-auto px-7 py-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-mono tracking-wide border border-white/[0.1] hover:border-white/[0.2] transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
            <span>Explore the Platform</span>
          </a>
        </div>

        {/* Live Project Choreography Bar */}
        <div className="mt-12 max-w-3xl mx-auto p-3 rounded-2xl bg-[#0e131a]/90 border border-cyan-500/20 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold shrink-0">
              {String(pulseStep + 1).padStart(2, '0')}
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <span>{steps[pulseStep].title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">LIVE DATA PULSE</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {steps[pulseStep].desc}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === pulseStep ? 'w-6 bg-cyan-400' : 'w-2 bg-white/10'
                }`} 
              />
            ))}
          </div>
        </div>

        {/* Interactive Construct-O-Genie Project Operating System Node Graph */}
        <div className="mt-14 relative max-w-5xl mx-auto rounded-3xl bg-[#0a0d12] border border-white/[0.08] p-6 sm:p-12 shadow-2xl shadow-black overflow-hidden group">
          
          {/* Subtle Technical Grid Lines & Crosshairs */}
          <div className="absolute top-3 left-4 font-mono text-[10px] text-slate-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            OPERATING LAYER ACTIVE // SYNC 100%
          </div>
          <div className="absolute top-3 right-4 font-mono text-[10px] text-slate-400">
            PRJ: {DEMO_PROJECT.id}
          </div>

          {/* Central Operating Hub: HORIZON WORKSPACE */}
          <div className="relative z-10 my-8 sm:my-16 flex flex-col items-center">
            
            <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#151c26] to-[#0c1118] border border-cyan-500/40 shadow-2xl shadow-cyan-950/50 max-w-lg w-full text-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] tracking-wider uppercase">
                Central Project Record
              </div>
              
              <div className="font-mono text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                {DEMO_PROJECT.client}
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                {DEMO_PROJECT.name}
              </h3>
              
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/[0.06] text-left">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Contract Value</div>
                  <div className="text-sm sm:text-base font-bold text-white font-mono">₹4.82 Cr</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Procurement</div>
                  <div className="text-sm sm:text-base font-bold text-teal-400 font-mono">₹2.14 Cr</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Net Margin</div>
                  <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono">18.4%</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  Site Progress: 67%
                </span>
                <span>GFC REV-04.2 GURGAON</span>
              </div>
            </div>

            {/* SVG Connecting Geometric CAD Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 -z-0" viewBox="0 0 800 400" preserveAspectRatio="none">
              <line x1="150" y1="60" x2="400" y2="200" stroke="#00F0FF" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="650" y1="60" x2="400" y2="200" stroke="#00F0FF" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="100" y1="200" x2="400" y2="200" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="700" y1="200" x2="400" y2="200" stroke="#00F0FF" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="150" y1="340" x2="400" y2="200" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="650" y1="340" x2="400" y2="200" stroke="#A855F7" strokeWidth="1.5" strokeDasharray="4 4" />
            </svg>
          </div>

          {/* Surrounding Connected Operating Nodes */}
          {nodes.map((node) => (
            <div 
              key={node.id}
              onClick={() => setActiveNode(node.id)}
              className={`absolute ${node.coord} z-20 cursor-pointer transition-all duration-300 hover:scale-105`}
            >
              <div className={`px-3 py-2 rounded-xl border backdrop-blur-md font-mono text-[11px] font-bold tracking-wider shadow-lg flex items-center gap-2 ${node.color}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                <span>{node.label}</span>
              </div>
            </div>
          ))}

          {/* Subtle Technical Footer inside node graph */}
          <div className="relative z-10 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Everything is connected: A change in BOQ immediately ripples through PO, Site, Invoicing & Margin.
            </span>
            <span className="text-cyan-400 mt-2 sm:mt-0">ONE PROJECT. ONE SYSTEM. TOTAL CONTROL.</span>
          </div>

        </div>

      </div>
    </section>
  );
}
