'use client';

import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ProductPillars({ onOpenDemo }) {
  const pillars = [
    {
      id: 'boq-estimation',
      number: '01',
      tag: 'BOQ & RATE ESTIMATION',
      title: 'Accurate Estimation Linked Directly to Your BOQ.',
      desc: 'Connect architectural drawing revisions directly to material quantities and labor rates. Purchase orders are locked against approved budget lines, preventing over-ordering and unexpected cost escalations before site work begins.',
      src: '/design-studio.jpg',
      metrics: [
        { label: 'DRAWING SYNC', val: 'GFC Revision Diffs' },
        { label: 'PO CONTROL', val: 'Budget Line Locking' },
      ],
      highlights: [
        'Automatic tracking of GFC drawing revisions and scope changes',
        'Detailed itemized rate analysis for materials, labor, and machinery',
        'Purchase orders locked against approved BOQ quantities',
      ],
    },
    {
      id: 'project-controls',
      number: '02',
      tag: 'PROJECT CONTROLS & OVERSIGHT',
      title: 'Real-Time Progress & Cost Tracking Across All Sites.',
      desc: 'Designed for founders, project directors, and commercial managers. Monitor actual site progress against planned timelines, review gross profit margins, and identify project risks before they impact completion dates.',
      src: '/dashboard-screen.jpg',
      metrics: [
        { label: 'PORTFOLIO VIEW', val: 'Multi-Site Tracking' },
        { label: 'MARGIN VISIBILITY', val: 'Budget vs Actuals' },
      ],
      highlights: [
        'Live tracking of project margins, costs, and cash flow',
        'Planned vs actual schedule tracking with milestone alerts',
        'Role-based access for project managers, quantity surveyors, and directors',
      ],
    },
    {
      id: 'site-execution',
      number: '03',
      tag: 'SITE EXECUTION & FIELD LOGS',
      title: 'Digital Daily Progress Reports & Joint Measurements.',
      desc: 'Give your site supervisors a dedicated mobile app. Log daily labor strength, track material consumption, pin photos of site snags to floor plans, and record client-verified Joint Measurement Records (JMR) directly from the field.',
      src: '/site-sync.jpg',
      metrics: [
        { label: 'MOBILE LOGS', val: 'Offline Site Ready' },
        { label: 'MEASUREMENTS', val: 'Digital JMR Sign-Off' },
      ],
      highlights: [
        'Quick daily progress reports (DPR) with labor and machinery logs',
        'Photo-based snag tracking pinned directly to 2D floor plans',
        'Material delivery verification at site gate to avoid duplicate billing',
      ],
    },
    {
      id: 'finance-billing',
      number: '04',
      tag: 'PROJECT CASH FLOW & BILLING',
      title: 'Automated Client Invoicing, Contractor Payouts & Tally Sync.',
      desc: 'Generate client and contractor Running Account bills directly from certified site measurements. The system automatically calculates statutory tax withholdings and security retentions, with seamless two-way synchronization into Tally Prime.',
      src: '/finance-team.jpg',
      metrics: [
        { label: 'BILLING SPEED', val: '4 Days vs 42 Days' },
        { label: 'ACCOUNTING', val: 'Tally Prime Integration' },
      ],
      highlights: [
        'Automated Running Account (RA) billing from verified site measurements',
        'Automatic contractor tax deductions and security retention tracking',
        'Two-way sync with Tally Prime for accounting and vendor disbursements',
      ],
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative bg-transparent space-y-28">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-200 font-mono text-[11px] uppercase tracking-wider mb-4 backdrop-blur-md">
          COMPLETE PROJECT PLATFORM
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] font-display">
          Built For Interior Contractors. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            From Tender to Handover.
          </span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-300 font-light leading-relaxed">
          Replace messy spreadsheets and unorganized WhatsApp groups with a structured system built for fit-out execution.
        </p>
      </div>

      {/* 4 Product Spreads with smooth scroll offsets */}
      {pillars.map((pillar, idx) => {
        const isEven = idx % 2 === 0;
        return (
          <div
            id={pillar.id}
            key={pillar.id}
            className={`scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center ${
              isEven ? '' : 'lg:flex-row-reverse'
            }`}
          >
            {/* Content (5 Cols) */}
            <div className={`lg:col-span-5 space-y-5 text-left ${isEven ? '' : 'lg:order-2'}`}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-black text-white">
                  {pillar.number}
                </span>
                <div className="h-4 w-px bg-white/20" />
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {pillar.tag}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-display">
                {pillar.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed font-sans">
                {pillar.desc}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono">
                {pillar.metrics.map((m, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-[#0A0D12]/70 border border-white/10 backdrop-blur-xl">
                    <div className="text-[10px] text-slate-400 uppercase truncate">{m.label}</div>
                    <div className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">{m.val}</div>
                  </div>
                ))}
              </div>

              {/* Key Highlights */}
              <div className="space-y-2 pt-1 text-xs text-slate-300 font-sans">
                {pillar.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={onOpenDemo}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-white hover:text-slate-300 transition-colors cursor-pointer group font-sans"
                >
                  <span>REQUEST A PRODUCT WALKTHROUGH</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Photography Frame (7 Cols) */}
            <div className={`lg:col-span-7 ${isEven ? '' : 'lg:order-1'}`}>
              <div className="rounded-3xl border border-white/15 bg-[#0A0D12]/60 backdrop-blur-2xl p-2 sm:p-2.5 shadow-2xl overflow-hidden group hover:border-white/30 transition-all duration-300">
                <div className="rounded-2xl overflow-hidden relative">
                  <img
                    src={pillar.src}
                    alt={pillar.title}
                    className="w-full h-[40vh] sm:h-[48vh] object-cover object-center filter brightness-[0.96] contrast-[1.06] group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        );
      })}

    </section>
  );
}
