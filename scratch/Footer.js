'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function Footer({ onOpenDemo, onOpenLogin }) {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/50 backdrop-blur-xl text-slate-400 text-xs py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Brand (4 Cols) */}
        <div className="md:col-span-4 space-y-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <img
                src="/brand/logo-icon.png"
                alt="Construct-O-Genie Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]"
              />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block font-display">
                Construct-O-Genie
              </span>
              <span className="text-[10px] text-slate-300 font-mono block">
                Interior & Fit-Out Platform
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            The complete estimation, site tracking, and billing operating system for interior contracting and commercial turnkey fit-out enterprises.
          </p>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>ISO 9001:2015 & SOC2 Type II Certified</span>
          </div>
        </div>

        {/* Platform Links (2 Cols) */}
        <div className="md:col-span-2 space-y-2 text-left">
          <div className="text-white font-semibold uppercase tracking-wider mb-2 font-mono">Platform</div>
          <div><a href="#overview" className="hover:text-slate-200">Overview</a></div>
          <div><a href="#boq-estimation" className="hover:text-slate-200">BOQ & Estimation</a></div>
          <div><a href="#project-controls" className="hover:text-slate-200">Project Controls</a></div>
          <div><a href="#site-execution" className="hover:text-slate-200">Site Execution</a></div>
          <div><a href="#finance-billing" className="hover:text-slate-200">Finance & Billing</a></div>
          <div><a href="#portals" className="hover:text-slate-200">Portals</a></div>
        </div>

        {/* Industry Features (3 Cols) */}
        <div className="md:col-span-3 space-y-2 text-left">
          <div className="text-white font-semibold uppercase tracking-wider mb-2 font-mono">Enterprise Controls</div>
          <div><span className="text-slate-300">Automated Tax Withholding & Retention Holds</span></div>
          <div><span className="text-slate-300">Two-Way Tally Prime Integration</span></div>
          <div><span className="text-slate-300">Digital Joint Measurement Records (JMR)</span></div>
          <div><span className="text-slate-300">GFC Drawing Revision Control</span></div>
          <div><span className="text-slate-300">GST Invoicing & Delivery Challan Match</span></div>
        </div>

        {/* CTA (3 Cols) */}
        <div className="md:col-span-3 space-y-3 text-left">
          <div className="text-white font-semibold uppercase tracking-wider font-mono">Deploy Construct-O-Genie</div>
          <p className="text-xs text-slate-300 font-sans">
            Schedule a personalized walkthrough with our construction technology specialists.
          </p>
          <button
            onClick={onOpenDemo}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-white to-slate-200 text-slate-950 font-bold text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-md cursor-pointer"
          >
            Book a Live Demo
          </button>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
        <div>© 2026 Construct-O-Genie Technologies Inc. All rights reserved.</div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white">Security</a>
          <a href="#" className="hover:text-white">Privacy Policy</a>
          <a href="#" className="hover:text-white">Terms of Deployment</a>
        </div>
      </div>
    </footer>
  );
}
