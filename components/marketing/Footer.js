'use client';

import React from 'react';
import { Layers, ArrowUpRight, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer({ onOpenDemo, onOpenLogin }) {
  return (
    <footer className="bg-[#050709] border-t border-white/[0.08] text-slate-400 font-mono text-xs pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid (5 Columns) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-white/[0.06]">
          
          {/* Brand Info (Col 1-2 on mobile, 2 on desktop) */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-white font-sans tracking-tight">
                Construct-O-Genie
              </span>
            </div>
            <p className="text-slate-400 text-xs font-sans leading-relaxed max-w-sm">
              The operating system for interior & fit-out companies. Connecting design, BOQs, procurement, site execution, client billing, and finance around every project.
            </p>
            <div className="pt-2 text-[11px] text-cyan-400">
              ONE PROJECT. ONE SYSTEM. TOTAL CONTROL.
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider font-sans">Product</div>
            <ul className="space-y-2 text-xs">
              <li><a href="#lifecycle" className="hover:text-cyan-400 transition-colors">Project Management</a></li>
              <li><a href="#boq-spine" className="hover:text-cyan-400 transition-colors">BOQ & Estimation</a></li>
              <li><a href="#roles" className="hover:text-cyan-400 transition-colors">Procurement & POs</a></li>
              <li><a href="#site-sync" className="hover:text-cyan-400 transition-colors">Site Execution & DPR</a></li>
              <li><a href="#finance-flow" className="hover:text-cyan-400 transition-colors">Finance & TDS Control</a></li>
              <li><a href="#portals" className="hover:text-cyan-400 transition-colors">Client & Vendor Portals</a></li>
            </ul>
          </div>

          {/* Column 3: Solutions */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider font-sans">Solutions</div>
            <ul className="space-y-2 text-xs">
              <li><a href="#roles" className="hover:text-cyan-400 transition-colors">Commercial Fit-Out</a></li>
              <li><a href="#roles" className="hover:text-cyan-400 transition-colors">Design & Build (D&B)</a></li>
              <li><a href="#roles" className="hover:text-cyan-400 transition-colors">Turnkey Interior Firms</a></li>
              <li><a href="#roles" className="hover:text-cyan-400 transition-colors">Luxury Residential Fit-Out</a></li>
              <li><a href="#india-ops" className="hover:text-cyan-400 transition-colors">India Commercial Ops</a></li>
            </ul>
          </div>

          {/* Column 4: Platform & Access */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider font-sans">Access & Company</div>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={onOpenLogin} className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                  Sign In to ERP <ArrowUpRight className="w-3 h-3" />
                </button>
              </li>
              <li>
                <button onClick={onOpenDemo} className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
                  Book a Product Demo <ArrowUpRight className="w-3 h-3" />
                </button>
              </li>
              <li><a href="#command-centre" className="hover:text-cyan-400 transition-colors">Command Centre</a></li>
              <li><a href="#india-ops" className="hover:text-cyan-400 transition-colors">Security & Compliance</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Metadata & Legal */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
          <div>
            © {new Date().getFullYear()} Construct-O-Genie. All rights reserved. Built for the interior & fit-out industry.
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-300">Security Architecture</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
