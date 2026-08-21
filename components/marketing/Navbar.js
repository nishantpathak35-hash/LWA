'use client';

import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  ChevronDown, 
  ArrowRight, 
  Building2, 
  FileSpreadsheet, 
  ShoppingCart, 
  Hammer, 
  Receipt, 
  Users, 
  Briefcase,
  ShieldCheck,
  Zap,
  Menu,
  X,
  Compass,
  FileCheck2,
  Lock
} from 'lucide-react';

export default function Navbar({ onOpenDemo, onOpenLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#080A0C]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl shadow-black/60 py-3' 
          : 'bg-transparent border-b border-white/[0.04] py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Brand Logo & Wordmark */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 via-slate-900 to-black border border-cyan-500/40 flex items-center justify-center shadow-inner shadow-cyan-500/20 group-hover:border-cyan-400 transition-colors">
            <Layers className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-75" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-base tracking-tight text-white flex items-center gap-1.5">
              Construct-O-Genie
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-mono">
                OS
              </span>
            </span>
            <span className="text-[10px] tracking-wider uppercase text-slate-400 font-mono">
              Interior Operating System
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links & Mega Menus */}
        <nav className="hidden lg:flex items-center gap-1 text-sm">
          
          {/* Product Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setActiveMenu('product')}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button 
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors font-medium ${
                activeMenu === 'product' ? 'text-cyan-400 bg-white/[0.04]' : 'text-slate-300 hover:text-white'
              }`}
            >
              Product
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === 'product' ? 'rotate-180 text-cyan-400' : 'text-slate-400'}`} />
            </button>

            {/* Mega Menu Overlay */}
            {activeMenu === 'product' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[720px] rounded-2xl bg-[#0c1015]/95 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-2xl shadow-black/80 grid grid-cols-2 gap-4 animate-fade-in z-50">
                
                <a href="#lifecycle" onClick={() => setActiveMenu(null)} className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                      Project Management
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400">Core</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Unified GFC revisions, survey recce & real-time milestones.
                    </div>
                  </div>
                </a>

                <a href="#boq-spine" onClick={() => setActiveMenu(null)} className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-amber-950/50 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                      BOQ & Estimation
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400">Commercial</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Live commercial spine linking rate cards, margin & POs.
                    </div>
                  </div>
                </a>

                <a href="#procurement" onClick={() => setActiveMenu(null)} className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm group-hover:text-cyan-300 transition-colors">
                      Procurement & POs
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Automated BOQ-to-PO conversion with budget guardrails.
                    </div>
                  </div>
                </a>

                <a href="#site-sync" onClick={() => setActiveMenu(null)} className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <Hammer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm group-hover:text-emerald-300 transition-colors">
                      Site Execution & DPR
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Mobile daily progress, JMR records & site material GRN.
                    </div>
                  </div>
                </a>

                <a href="#finance-flow" onClick={() => setActiveMenu(null)} className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm group-hover:text-cyan-300 transition-colors">
                      Finance & TDS Control
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Client billing, vendor RA bills, 194C TDS & cashflows.
                    </div>
                  </div>
                </a>

                <a href="#portals" onClick={() => setActiveMenu(null)} className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-purple-950/50 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm group-hover:text-purple-300 transition-colors">
                      Client & Vendor Portals
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Zero-friction external change approvals & vendor ledgers.
                    </div>
                  </div>
                </a>

                <div className="col-span-2 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Built exclusively for India interior contractors & fit-out firms.
                  </span>
                  <a href="#command-centre" onClick={() => setActiveMenu(null)} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium">
                    See Command Centre <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Solutions Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setActiveMenu('solutions')}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button 
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors font-medium ${
                activeMenu === 'solutions' ? 'text-cyan-400 bg-white/[0.04]' : 'text-slate-300 hover:text-white'
              }`}
            >
              Solutions
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === 'solutions' ? 'rotate-180 text-cyan-400' : 'text-slate-400'}`} />
            </button>

            {activeMenu === 'solutions' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[480px] rounded-2xl bg-[#0c1015]/95 backdrop-blur-2xl border border-white/[0.08] p-5 shadow-2xl shadow-black/80 space-y-2 animate-fade-in z-50">
                <a href="#roles" onClick={() => setActiveMenu(null)} className="block p-3 rounded-xl hover:bg-white/[0.04] transition-all group">
                  <div className="font-medium text-white text-sm group-hover:text-cyan-300">
                    Commercial Fit-Out Contractors
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    For high-speed corporate workspaces with heavy MEP & vendor volumes.
                  </div>
                </a>
                <a href="#roles" onClick={() => setActiveMenu(null)} className="block p-3 rounded-xl hover:bg-white/[0.04] transition-all group">
                  <div className="font-medium text-white text-sm group-hover:text-cyan-300">
                    Design & Build (D&B) Studios
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Connect creative concept GFCs directly to procurement and site execution.
                  </div>
                </a>
                <a href="#roles" onClick={() => setActiveMenu(null)} className="block p-3 rounded-xl hover:bg-white/[0.04] transition-all group">
                  <div className="font-medium text-white text-sm group-hover:text-cyan-300">
                    Turnkey Luxury Residential Interior Firms
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Bespoke joinery schedules, marble procurement and client variation controls.
                  </div>
                </a>
              </div>
            )}
          </div>

          <a href="#boq-spine" className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white transition-colors font-medium">
            BOQ Commercial Spine
          </a>

          <a href="#india-ops" className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white transition-colors font-medium">
            India Ops
          </a>

          <a href="#command-centre" className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white transition-colors font-medium">
            Command Centre
          </a>
        </nav>

        {/* Right CTA Area */}
        <div className="hidden lg:flex items-center gap-3">
          <button 
            onClick={onOpenLogin}
            className="px-4 py-2 text-xs font-mono font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors border border-transparent hover:border-white/[0.08]"
          >
            Sign In
          </button>
          
          <button 
            onClick={onOpenDemo}
            className="relative group px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-medium text-xs tracking-wide uppercase shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 overflow-hidden font-mono"
          >
            <span className="relative z-10 font-bold">Book a Demo</span>
            <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-0.5 transition-transform" />
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06]"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#080A0C] border-b border-white/[0.08] px-5 py-6 space-y-4 animate-fade-in">
          <div className="space-y-1">
            <a 
              href="#lifecycle" 
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-white/[0.06] font-medium"
            >
              Connected Project Lifecycle
            </a>
            <a 
              href="#boq-spine" 
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-white/[0.06] font-medium"
            >
              BOQ Commercial Spine
            </a>
            <a 
              href="#command-centre" 
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-white/[0.06] font-medium"
            >
              Command Centre
            </a>
            <a 
              href="#finance-flow" 
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-white/[0.06] font-medium"
            >
              Finance & Project P&L
            </a>
            <a 
              href="#india-ops" 
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-white/[0.06] font-medium"
            >
              India-Native Commercials
            </a>
          </div>

          <div className="pt-4 border-t border-white/[0.08] grid grid-cols-2 gap-3">
            <button 
              onClick={() => { setMobileOpen(false); onOpenLogin(); }}
              className="w-full py-2.5 text-xs font-mono text-center text-slate-300 bg-white/[0.04] border border-white/[0.08] rounded-xl"
            >
              Sign In
            </button>
            <button 
              onClick={() => { setMobileOpen(false); onOpenDemo(); }}
              className="w-full py-2.5 text-xs font-mono font-bold text-center text-slate-950 bg-cyan-400 rounded-xl"
            >
              Book a Demo
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
