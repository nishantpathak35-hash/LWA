'use client';

import React, { useState } from 'react';
import { Users, Building, ShieldCheck, ArrowRight, CheckCircle2, FileText, Eye, Clock, Key } from 'lucide-react';

export default function PortalsSection() {
  const [activePortal, setActivePortal] = useState('client');

  return (
    <section id="portals" className="scroll-mt-28 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative bg-transparent">
      
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-200 font-mono text-[11px] uppercase tracking-wider mb-3 backdrop-blur-md">
          <Users className="w-3.5 h-3.5" />
          COLLABORATION PORTALS
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] font-display">
          Client & Vendor Portals. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Real-Time Visibility Without WhatsApp Follow-Ups.
          </span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-300 font-light">
          Provide enterprise clients with photographic progress updates and give trade subcontractors a self-service hub to track work orders and payment advice.
        </p>
      </div>

      {/* Portal Selector */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex p-1 rounded-2xl bg-[#0A0D12]/70 border border-white/15 backdrop-blur-xl">
          <button
            onClick={() => setActivePortal('client')}
            className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activePortal === 'client'
                ? 'bg-white text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Client Progress Portal
          </button>
          <button
            onClick={() => setActivePortal('vendor')}
            className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activePortal === 'vendor'
                ? 'bg-white text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Subcontractor & Vendor Hub
          </button>
        </div>
      </div>

      {/* Portal Display Box */}
      <div className="p-5 sm:p-8 rounded-3xl bg-[#0A0D12]/60 border border-white/15 backdrop-blur-2xl shadow-2xl text-left">
        {activePortal === 'client' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-6 space-y-3.5">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-300 uppercase font-bold">
                <Eye className="w-4 h-4" />
                <span>Client Visibility & Approvals</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display">
                Photo Updates, Timeline Tracking & Variation Approvals
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans font-light">
                Clients can view weekly verified site photos, track milestone progress against the project schedule, review certified RA bills, and approve variation orders with clear scope documentation.
              </p>
              <div className="space-y-2 pt-1 text-xs text-slate-300 font-sans">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Weekly verified photographic progress reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Digital sign-off on running account invoices</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Transparent variation order ledger with rate backups</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs space-y-2.5">
              <div className="flex justify-between border-b border-white/10 pb-2.5">
                <span className="text-white font-bold truncate pr-2">PROJECT: CORPORATE OFFICE L12 FIT-OUT</span>
                <span className="text-emerald-400 font-semibold shrink-0">82% COMPLETE</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">PENDING CLIENT APPROVAL</div>
                <div className="text-white font-bold text-xs">Variation VO-04: Italian Marble Wall Upgrade</div>
                <div className="text-white text-xs font-bold">Value: ₹14,80,000 • Schedule Delta +2 Days</div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Certified Billings: ₹4.80 Cr</span>
                <span>Security Retention: ₹24.0 Lakhs</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-6 space-y-3.5">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-300 uppercase font-bold">
                <Key className="w-4 h-4" />
                <span>Trade Partner Portal</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display">
                Work Orders, Measurement Submissions & Payment Tracking
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans font-light">
                Subcontractors and material suppliers can view approved Purchase Orders, submit Joint Measurement Sheets from site, track GRN matching, and download statutory tax deduction certificates.
              </p>
              <div className="space-y-2 pt-1 text-xs text-slate-300 font-sans">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>View approved POs and material delivery schedules</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Submit site measurements for RA bill certification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Download payment UTR details and tax withholding certificates</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs space-y-2.5">
              <div className="flex justify-between border-b border-white/10 pb-2.5">
                <span className="text-white font-bold truncate pr-2">SUBCONTRACTOR: GLASS & PARTITIONS</span>
                <span className="text-emerald-400 font-semibold shrink-0">PO-L03-GL-08</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">RECENT PAYMENT RECORD</div>
                <div className="text-white font-bold text-xs">RA Bill #03: Toughened Glass Partitions (140 Sqm)</div>
                <div className="text-emerald-300 text-xs font-bold">Net Paid: ₹8,42,800 • UTR #HDFC092834710</div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Tax Withheld: ₹17,200</span>
                <span>Retention Held: ₹43,000</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </section>
  );
}
