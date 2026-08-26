'use client';

import React, { useState } from 'react';
import { 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowRight, 
  Eye, 
  ShieldCheck,
  Compass,
  Boxes,
  FileCheck,
  Building
} from 'lucide-react';

const INTERIOR_PACKAGES = [
  {
    id: 'joinery',
    name: 'Joinery & Millwork',
    tradeCode: 'PACKAGE 01 / JOINERY',
    tagline: 'Bespoke Acoustic Wall Paneling & Fluted Oak Veneer',
    drawingRef: 'GFC / DWG-ARCH-JN-04.2',
    standard: 'FSC Certified & Class-1 Fire Rated',
    boqItemCode: '04.01.A',
    quantity: '480 SQ.M',
    costBudget: '₹26,16,000',
    sellingValue: '₹34,56,000',
    marginPct: '24.3%',
    vendor: 'WoodCraft Studios',
    deliveryStatus: 'Received on Site (100% GRN Verified)',
    installedPct: 85,
    specifications: [
      { label: 'Core Material', val: '18mm FR Grade HDHMR' },
      { label: 'Surface Finish', val: 'Natural American White Oak Veneer' },
      { label: 'CNC Acoustic Slit', val: '3mm Pitch / 16mm Spacing' },
      { label: 'Hardware Hardware', val: 'Concealed Hettich Sensys Hinges' },
    ],
    sampleImg: '/building-stage2.jpg',
  },
  {
    id: 'glazing',
    name: 'Architectural Glazing',
    tradeCode: 'PACKAGE 02 / GLAZING',
    tagline: 'Slim Profile Double Glazed Acoustic Partitions',
    drawingRef: 'GFC / DWG-GL-L12-08',
    standard: 'STC 52 Acoustic Rating & EN 12150 Safety',
    boqItemCode: '02.04.C',
    quantity: '320 SQ.M',
    costBudget: '₹29,44,000',
    sellingValue: '₹37,76,000',
    marginPct: '22.0%',
    vendor: 'Saint-Gobain / Alumex Systems',
    deliveryStatus: 'Delivered (Batch 02 Cleared)',
    installedPct: 92,
    specifications: [
      { label: 'Glass Specification', val: '12.76mm Acoustic PVB Toughened DGU' },
      { label: 'Extrusion Profile', val: '25mm Anodized Matt Black Slim Frame' },
      { label: 'Acoustic Drop Seal', val: 'DORMA Automatic Threshold Drop Seal' },
      { label: 'Deflection Tolerance', val: '< L/175 Structural Clearance' },
    ],
    sampleImg: '/hero-interior.jpg',
  },
  {
    id: 'mep',
    name: 'MEP & HVAC VRF',
    tradeCode: 'PACKAGE 03 / MEP SERVICES',
    tagline: 'VRF Air Distribution, Fire Sprinklers & Cable Trays',
    drawingRef: 'GFC / DWG-MEP-HVAC-02.1',
    standard: 'NFPA 13 & IS 659 GFC Approved',
    boqItemCode: '07.02.A',
    quantity: '1,450 R.M.',
    costBudget: '₹48,20,000',
    sellingValue: '₹59,80,000',
    marginPct: '19.4%',
    vendor: 'Voltas / Daikin Certified Vendor',
    deliveryStatus: 'Pressure Tested @ 1.5x WP',
    installedPct: 78,
    specifications: [
      { label: 'Duct Construction', val: '22-Gauge Class-0 Insulated GI' },
      { label: 'Cable Raceway', val: '300x50mm Perforated Ladder Trays' },
      { label: 'Sprinkler Piping', val: 'Class-C MS Heavy Duty with UL Sprinklers' },
      { label: 'Air Balancing', val: 'CFM Verified with Tripartite Report' },
    ],
    sampleImg: '/building-mep.jpg',
  },
  {
    id: 'marble',
    name: 'Stone & Italian Marble',
    tradeCode: 'PACKAGE 04 / FLOORING',
    tagline: 'Bookmatched Italian Statuario with Brass Inlay',
    drawingRef: 'GFC / DWG-FL-ST-03.4',
    standard: 'IS 1122 & Mitred Edge Tolerance',
    boqItemCode: '03.05.A',
    quantity: '620 SQ.M',
    costBudget: '₹44,02,000',
    sellingValue: '₹58,28,000',
    marginPct: '24.5%',
    vendor: 'Classic Marble Company',
    deliveryStatus: 'Dry-Lay Approved & Sealed',
    installedPct: 100,
    specifications: [
      { label: 'Stone Grade', val: '20mm First-Choice Italian Statuario' },
      { label: 'Laying Bed', val: 'Polymer-Modified Adhesive Screed' },
      { label: 'Accent Detailing', val: '8mm Solid Brushed Brass Inlay Strips' },
      { label: 'Polishing Method', val: '8-Stage Diamond Resin Polish (95 Gloss)' },
    ],
    sampleImg: '/hero-interior.jpg',
  },
  {
    id: 'ceilings',
    name: 'Ceilings & Lighting',
    tradeCode: 'PACKAGE 05 / CEILINGS',
    tagline: 'Micro-Perforated Acoustic Baffles & DALI Magnetic Tracks',
    drawingRef: 'GFC / DWG-CL-LT-06.2',
    standard: 'ASTM C423 NRC 0.85 & DALI 2.0',
    boqItemCode: '06.02.B',
    quantity: '1,250 SQ.M',
    costBudget: '₹33,50,000',
    sellingValue: '₹42,50,000',
    marginPct: '21.2%',
    vendor: 'Knauf Ceiling Systems',
    deliveryStatus: 'Suspension Grid Laser Aligned',
    installedPct: 70,
    specifications: [
      { label: 'Baffle Dimensions', val: '150mm Depth x 50mm Width Linear' },
      { label: 'Acoustic Infill', val: 'NRC 0.85 Bio-Soluble Mineral Core' },
      { label: 'Lighting Track', val: '48V Low-Voltage Magnetic Channel' },
      { label: 'Light Quality', val: 'CRI 95+ Tunable White (2700K–5000K)' },
    ],
    sampleImg: '/design-studio.jpg',
  },
];

export default function TradePackageMatrix({ onOpenDemo }) {
  const [activeTab, setActiveTab] = useState(0);
  const pkg = INTERIOR_PACKAGES[activeTab];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative bg-transparent">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-200 font-mono text-[11px] uppercase tracking-wider mb-3 backdrop-blur-md">
          <Layers className="w-3.5 h-3.5 text-white" />
          INTERIOR TRADE PACKAGE REGISTERS
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] font-display">
          Turnkey Trade Packages. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Locked from BOQ to Site Gate.
          </span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-300 font-light">
          Every interior package is tied to approved GFC drawings, purchase order quantities, physical site GRN delivery, and subcontractor measurement sheets.
        </p>
      </div>

      {/* Package Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {INTERIOR_PACKAGES.map((item, idx) => {
          const isActive = idx === activeTab;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-white text-slate-950 shadow-lg font-bold scale-105'
                  : 'bg-[#0A0D12]/70 text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-black' : 'bg-white/40'}`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Package Specification Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0A0D12]/70 border border-white/15 backdrop-blur-2xl shadow-2xl text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Details (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  {pkg.tradeCode}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display mt-0.5">
                  {pkg.tagline}
                </h3>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold">
                MARGIN: {pkg.marginPct}
              </div>
            </div>

            {/* Reference Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase truncate">GFC Drawing Ref</div>
                <div className="text-white font-bold truncate mt-0.5">{pkg.drawingRef}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase truncate">BOQ Line Item</div>
                <div className="text-white font-bold truncate mt-0.5">{pkg.boqItemCode} ({pkg.quantity})</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-slate-400 uppercase truncate">Quality Standard</div>
                <div className="text-white font-bold truncate mt-0.5">{pkg.standard}</div>
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase font-semibold">
                Material & Installation Specifications
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {pkg.specifications.map((spec, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono">{spec.label}</span>
                      <span className="text-slate-200 font-medium">{spec.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vendor & Site Status */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">APPROVED VENDOR / SUBCONTRACTOR:</span>
                <span className="text-white font-bold">{pkg.vendor}</span>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-slate-400 block text-[10px]">PHYSICAL SITE PROGRESS:</span>
                <span className="text-emerald-400 font-bold">{pkg.installedPct}% INSTALLED</span>
              </div>
            </div>
          </div>

          {/* Right Visual Image & Takeoff Snapshot (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-white/20 overflow-hidden relative shadow-2xl">
              <img
                src={pkg.sampleImg}
                alt={pkg.name}
                className="w-full h-56 sm:h-64 object-cover filter brightness-[0.95] contrast-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-white">
                <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/20">
                  {pkg.name}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/80 text-black font-bold">
                  {pkg.deliveryStatus}
                </span>
              </div>
            </div>

            {/* Commercial Numbers */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Committed Purchase Order Cost:</span>
                <span className="text-white font-bold">{pkg.costBudget}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Client Certified Billing Value:</span>
                <span className="text-white font-bold">{pkg.sellingValue}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm">
                <span className="text-slate-300">Realized Gross Margin:</span>
                <span className="text-emerald-400">{pkg.marginPct}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
