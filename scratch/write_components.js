const fs = require('fs');

const deconstructedBuildingCode = `'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  Eye, 
  Sliders, 
  Maximize2, 
  Activity, 
  ShieldCheck, 
  Zap, 
  FileSpreadsheet, 
  Crosshair,
  Info
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   ARCHITECTURAL DECONSTRUCTION DATA SCHEMA (APPLE-GRADE EDITORIAL QUALITY)
───────────────────────────────────────────────────────────────────────────── */
export const ARCHITECTURAL_LAYERS = [
  {
    id: 0,
    index: '01',
    phaseBadge: 'EPOCH 01 / 04 : MONOLITHIC SUPERSTRUCTURE',
    layerName: 'Monolithic Concrete Core & Shell',
    editorialHook: 'The Raw Slab: Where Structural Integrity Meets Sub-Millimeter Precision',
    tagline: 'Grade M40 Post-Tensioned Slabs, Drop Panels & High-Span Perimeter Glazing',
    narrative:
      'Before a single partition is marked, Construct-O-Genie locks the base structural coordinate grid. 3D point cloud scans verify column plumbness and slab levelness (FFL/SSL) to ±1.5mm tolerance, preventing cascading dimensional errors before fit-out begins.',
    src: '/building-stage3.jpg',
    boqValue: '₹10.00 Cr (Base Core)',
    boqNumeric: 0,
    scopePercent: '0% Fit-Out (Raw Base)',
    elevation: '+0.000m SSL',
    axisCode: 'GRID AXIS A1–G14',
    tradeCount: 'Base Core Developers',
    qualityCert: 'ASTM C39 / IS 456 Compliant',
    primaryColor: '#00FFA3',
    glowColor: 'rgba(0, 255, 163, 0.4)',
    accentGradient: 'linear-gradient(135deg, #00FFA3 0%, #00C8FF 100%)',
    metrics: [
      { label: 'Slab Floor Plate', val: '14,800 sq.ft' },
      { label: 'Core Structural Deflection', val: '< 1.8 mm' },
      { label: 'Point Cloud Scans', val: '12 Scans Verified' },
      { label: 'Developer Snag Status', val: 'Zero Core Defects' },
    ],
    hotspots: [
      {
        id: 'col-1',
        name: 'Grade M40 Self-Compacting Drop Columns',
        type: 'SUPERSTRUCTURE',
        spec: 'IS 456:2000 Grade M40 • Post-tensioned tendon anchor points',
        status: 'Core Certified',
        cost: 'Base Building Asset',
        x: 32,
        y: 46,
      },
      {
        id: 'soffit-1',
        name: 'Coffered Raw Concrete Ceiling Soffit',
        type: 'STRUCTURAL CEILING',
        spec: 'Clear Height 4,200mm • High-density core formwork finish',
        status: 'Level Checked',
        cost: 'Base Building Asset',
        x: 55,
        y: 18,
      },
      {
        id: 'curtain-1',
        name: 'Double-Glazed Low-E Unitized Facade',
        type: 'PERIMETER ENVELOPE',
        spec: 'DGU 28mm (6mm SunGuard + 16mm Argon + 6mm Toughened)',
        status: 'Air/Water Tested',
        cost: 'Base Building Asset',
        x: 18,
        y: 62,
      },
    ],
  },
  {
    id: 1,
    index: '02',
    phaseBadge: 'EPOCH 02 / 04 : MEP INFRASTRUCTURE & ROUGH-INS',
    layerName: 'The MEP Nervous System & Services',
    editorialHook: 'Zero Spatial Clashes: Orchestrating HVAC, Power, Fire & BMS Routing',
    tagline: 'Variable Refrigerant Flow (VRF), High-Capacity Trays & Fire Sprinkler Loops',
    narrative:
      'Hidden behind luxury ceilings lies a dense labyrinth of life-safety and environmental mechanics. Construct-O-Genie coordinates mechanical, electrical, and plumbing trades simultaneously—eliminating on-site rework with locked 3D BIM routing and instant mobile milestone sign-offs.',
    src: '/building-mep.jpg',
    boqValue: '₹2.10 Cr',
    boqNumeric: 2.1,
    scopePercent: '45% MEP & Framing Realized',
    elevation: '+3.450m DUCT CLR',
    axisCode: 'ZONE NORTH-MEP-04',
    tradeCount: '6 Specialized Trade Partners',
    qualityCert: 'NFPA 13 & IS 659 GFC Certified',
    primaryColor: '#FF3366',
    glowColor: 'rgba(255, 51, 102, 0.4)',
    accentGradient: 'linear-gradient(135deg, #FF3366 0%, #FF8A00 100%)',
    metrics: [
      { label: 'HVAC Air Distribution', val: '28,000 CFM VRF' },
      { label: 'GI Ducting Pressure', val: 'Tested @ 1.5x WP' },
      { label: 'Cable Ladder Trays', val: '1,450 R.M. Installed' },
      { label: 'Fire Suppression Heads', val: '124 Sprinklers Calibrated' },
    ],
    hotspots: [
      {
        id: 'hvac-1',
        name: 'Class-0 Nitrile Insulated GI Ducting',
        type: 'HVAC AIR DISTRIBUTION',
        spec: '22-Gauge Galvanized Sheet • Zero-leakage flanged transverse joints',
        status: 'Pressure Tested',
        cost: '₹42,30,000',
        x: 48,
        y: 15,
      },
      {
        id: 'trays-1',
        name: 'Heavy-Duty Perforated Cable Trays',
        type: 'ELECTRICAL POWER SPINE',
        spec: 'Hot-Dip Galvanized 300x50mm • Segregated Data & High Voltage',
        status: 'Inspected & Cleared',
        cost: '₹21,50,000',
        x: 74,
        y: 24,
      },
      {
        id: 'drywall-1',
        name: 'Galvanized C-Stud Drywall Skeleton',
        type: 'ACOUSTIC FRAMING',
        spec: '0.55mm BMT Steel Studs • 50mm Rockwool 48kg/m³ infill prep',
        status: 'Plumb Verified',
        cost: '₹18,40,000',
        x: 28,
        y: 65,
      },
    ],
  },
  {
    id: 2,
    index: '03',
    phaseBadge: 'EPOCH 03 / 04 : ARCHITECTURAL SUBSTRATES & JOINERY',
    layerName: 'Architectural Substrates & Millwork',
    editorialHook: 'Sub-Millimeter Joinery: Engineering the Skin and Acoustic Boundaries',
    tagline: 'Precision Wall Paneling, Concealed Pockets, HVAC Plenums & Screeds',
    narrative:
      'The raw skeleton transforms into tailored architectural volumes. Custom acoustic wall paneling, perimeter shadow-line reveals, and bespoke millwork substrates are verified against GFC Revision 04 drawings before high-value Italian stone and engineered timbers arrive.',
    src: '/building-stage2.jpg',
    boqValue: '₹5.40 Cr',
    boqNumeric: 5.4,
    scopePercent: '78% Fit-Out Executed',
    elevation: '+2.850m CEILING FFL',
    axisCode: 'ZONE ATRIUM-JOINERY-02',
    tradeCount: '11 Finishes & Substrates',
    qualityCert: 'FSC Certified / GreenPro Tier 1',
    primaryColor: '#00C8FF',
    glowColor: 'rgba(0, 200, 255, 0.4)',
    accentGradient: 'linear-gradient(135deg, #00C8FF 0%, #7000FF 100%)',
    metrics: [
      { label: 'Acoustic Drywall STC', val: 'STC 54 Rating' },
      { label: 'Flush Concealed Reveals', val: '12mm Shadowline' },
      { label: 'Sub-Floor Screed Moisture', val: '< 2.5% CM Test' },
      { label: 'Millwork Tolerances', val: '±0.5mm CNC Routed' },
    ],
    hotspots: [
      {
        id: 'panel-1',
        name: 'FR-Grade Fluted Oak Acoustic Paneling',
        type: 'ARCHITECTURAL WALLS',
        spec: 'Micro-perforated natural veneer on Class-1 Fire-Rated MDF core',
        status: 'Moisture Sealed',
        cost: '₹58,00,000',
        x: 62,
        y: 48,
      },
      {
        id: 'reveal-1',
        name: 'Extruded Aluminum Perimeter Shadow Reveal',
        type: 'CEILING REVEAL DETAIL',
        spec: 'Anodized 15x15mm negative profile with indirect continuous LED channel',
        status: 'True-Aligned',
        cost: '₹14,20,000',
        x: 42,
        y: 12,
      },
      {
        id: 'cove-1',
        name: 'Recessed Linear HVAC Diffuser Slot',
        type: 'INTEGRATED SERVICES',
        spec: 'Architectural slot diffuser with internal insulated plenum box',
        status: 'Flow Balanced',
        cost: '₹16,80,000',
        x: 80,
        y: 35,
      },
    ],
  },
  {
    id: 3,
    index: '04',
    phaseBadge: 'EPOCH 04 / 04 : TURNKEY ARCHITECTURAL REALITY',
    layerName: 'Bespoke Turnkey Interior Reality',
    editorialHook: 'The Masterpiece: Flawless Execution, Zero Snags & Operational Handover',
    tagline: 'Italian Calacatta, Biophilic Living Walls, Tunable DALI & Ergonomic Suites',
    narrative:
      'The finished space—an acoustic sanctuary of luxury materials, precision lighting, and integrated executive amenities. Delivered on schedule, 100% matched to the original BOQ, fully verified by digital Joint Measurement Records (JMR) with zero warranty disputes.',
    src: '/hero-interior.jpg',
    boqValue: '₹8.45 Cr (Delivered Total)',
    boqNumeric: 8.45,
    scopePercent: '100% Turnkey Handover Ready',
    elevation: 'COMPLETED FFL',
    axisCode: 'ZONE ALL-AREAS-HANDOVER',
    tradeCount: 'Turnkey Client Sign-Off',
    qualityCert: 'LEED Platinum / ISO 9001:2015',
    primaryColor: '#FFB800',
    glowColor: 'rgba(255, 184, 0, 0.4)',
    accentGradient: 'linear-gradient(135deg, #FFB800 0%, #FF3366 100%)',
    metrics: [
      { label: 'Final Snag Clearance', val: '100% Rectified' },
      { label: 'Lighting CRI / DALI', val: 'CRI 97+ / Tunable' },
      { label: 'Acoustic Reverberation', val: 'RT60 = 0.42 sec' },
      { label: 'Final Handover Sign-Off', val: 'Digital JMR Locked' },
    ],
    hotspots: [
      {
        id: 'marble-1',
        name: 'Bookmatched Calacatta Borghini Marble',
        type: 'SIGNATURE RECEPTION',
        spec: '20mm Polished Italian Slabs • Waterproof epoxy bonded with mitred 45° edges',
        status: 'Hand-Finished & Sealed',
        cost: '₹64,00,000',
        x: 52,
        y: 72,
      },
      {
        id: 'lighting-1',
        name: 'Architectural Glare-Free Magnetic Track DALI',
        type: 'INTELLIGENT LIGHTING',
        spec: 'UGR < 10 • 2700K–6500K Tunable White via centralized scene controller',
        status: 'Commissioned',
        cost: '₹34,50,000',
        x: 38,
        y: 22,
      },
      {
        id: 'acoustic-1',
        name: 'Frameless Double Glazed Acoustic Partitions',
        type: 'EXECUTIVE SUITES',
        spec: '12.76mm Acoustic PVB Laminated Toughened • 48dB Sound Transmission Loss',
        status: 'Acoustic Tested',
        cost: '₹46,20,000',
        x: 78,
        y: 58,
      },
    ],
  },
];

export default function DeconstructedBuildingScroll({ onOpenDemo }) {
  const sectionRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Sync scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;

      const current = -rect.top;
      const progress = Math.min(Math.max(current / totalScrollable, 0), 1);
      setScrollProgress(progress);

      // Determine active layer (0 to 3)
      const rawIndex = Math.min(
        Math.floor(progress * ARCHITECTURAL_LAYERS.length),
        ARCHITECTURAL_LAYERS.length - 1
      );
      setActiveLayerIndex(rawIndex);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeLayer = ARCHITECTURAL_LAYERS[activeLayerIndex];

  // Manual scrub jump
  const handleJumpToLayer = (index) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const totalScrollable = sectionRef.current.offsetHeight - window.innerHeight;
    const targetScroll = window.scrollY + rect.top + (index / (ARCHITECTURAL_LAYERS.length - 1)) * totalScrollable;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  return (
    <section
      ref={sectionRef}
      id="deconstruction-engine"
      className="relative w-full bg-[#040609] text-white"
      style={{ minHeight: '380vh' }}
    >
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden px-4 md:px-8 py-4 md:py-6 z-20">
        
        {/* Subtle Blueprint Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0, 240, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Ambient Top Glow Orbs */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full blur-[140px] pointer-events-none transition-colors duration-700 opacity-25"
          style={{ background: activeLayer.primaryColor }}
        />

        {/* HEADER BAR */}
        <header className="relative z-30 flex flex-wrap items-center justify-between gap-3 border border-white/[0.08] bg-[#040609]/85 backdrop-blur-xl rounded-2xl px-5 py-3 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: activeLayer.primaryColor }}
                />
                <span
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ background: activeLayer.primaryColor }}
                />
              </span>
              <span className="font-mono text-xs font-semibold tracking-wider text-slate-300 uppercase">
                SPATIAL DECONSTRUCTION ENGINE
              </span>
            </div>
            <div className="hidden md:block h-4 w-px bg-white/10" />
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>ELEVATION:</span>
              <span className="text-white font-medium">{activeLayer.elevation}</span>
              <span className="text-white/20">|</span>
              <span>GRID:</span>
              <span className="text-cyan-400">{activeLayer.axisCode}</span>
            </div>
          </div>

          {/* Epoch Switcher Buttons */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/[0.08]">
            {ARCHITECTURAL_LAYERS.map((layer, idx) => {
              const isActive = idx === activeLayerIndex;
              return (
                <button
                  key={layer.id}
                  onClick={() => handleJumpToLayer(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-300 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white/10 text-white font-bold shadow-sm border border-white/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: isActive ? layer.primaryColor : 'rgba(255,255,255,0.3)',
                    }}
                  />
                  <span>0{idx + 1}</span>
                  <span className="hidden lg:inline text-[11px] opacity-75">{layer.layerName.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Cumulative BOQ</div>
              <div className="font-mono text-sm font-bold text-emerald-400">
                {activeLayer.boqValue}
              </div>
            </div>
            <button
              onClick={onOpenDemo}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-cyan-300 transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-white/5"
            >
              <span>Explore Demo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* MAIN STAGE VIEWPORT */}
        <div className="relative z-20 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center my-3 min-h-0">
          
          {/* LEFT: EDITORIAL NARRATIVE & METRICS (4 COLS) */}
          <div className="lg:col-span-4 flex flex-col justify-center space-y-4 max-h-full overflow-y-auto pr-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] w-fit">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: activeLayer.primaryColor }}
              />
              <span className="font-mono text-[11px] tracking-wider text-slate-300">
                {activeLayer.phaseBadge}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {activeLayer.layerName}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-cyan-300 mt-1">
                {activeLayer.editorialHook}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {activeLayer.narrative}
            </p>

            {/* Micro Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {activeLayer.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
                >
                  <div className="text-[10px] font-mono text-slate-400 uppercase truncate">
                    {m.label}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white mt-0.5 font-mono">
                    {m.val}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1 flex items-center justify-between border-t border-white/[0.08] text-xs font-mono">
              <span className="text-slate-400">STANDARDS CERTIFIED:</span>
              <span className="text-emerald-400 font-semibold">{activeLayer.qualityCert}</span>
            </div>
          </div>

          {/* CENTER/RIGHT: 3D INTERACTIVE BUILDING VIEWER (8 COLS) */}
          <div
            className="lg:col-span-8 h-full flex flex-col items-center justify-center relative min-h-[360px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
          >
            {/* Visual Viewport Frame with 3D Parallax Tilt */}
            <div
              className="relative w-full h-[54vh] lg:h-[68vh] rounded-3xl overflow-hidden border border-white/10 bg-[#090D12] shadow-2xl transition-transform duration-300 ease-out"
              style={{
                transform: `perspective(1000px) rotateY(${mousePos.x * 6}deg) rotateX(${
                  -mousePos.y * 6
                }deg)`,
              }}
            >
              {/* Stacked Cross-Fading Architectural Layer Images */}
              {ARCHITECTURAL_LAYERS.map((layer, idx) => {
                const isCurrent = idx === activeLayerIndex;
                return (
                  <div
                    key={layer.id}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{
                      opacity: isCurrent ? 1 : 0,
                      pointerEvents: isCurrent ? 'auto' : 'none',
                    }}
                  >
                    <img
                      src={layer.src}
                      alt={layer.layerName}
                      className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.08]"
                    />

                    {/* Dark gradient overlay for contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#040609] via-transparent to-[#040609]/40 pointer-events-none" />

                    {/* Architectural Crosshair Reticles / Hotspots */}
                    {isCurrent &&
                      layer.hotspots.map((spot) => {
                        const isSelected = selectedHotspot?.id === spot.id;
                        return (
                          <div
                            key={spot.id}
                            style={{ top: `${spot.y}%`, left: `${spot.x}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group"
                          >
                            {/* Pulsing Target Dot */}
                            <button
                              onClick={() => setSelectedHotspot(isSelected ? null : spot)}
                              className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/40 hover:border-cyan-400 hover:scale-110 transition-all duration-200 cursor-pointer shadow-lg"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ background: layer.primaryColor }}
                              />
                              <span
                                className="animate-ping absolute w-5 h-5 rounded-full opacity-60"
                                style={{ background: layer.primaryColor }}
                              />
                            </button>

                            {/* Hotspot Hover / Active Flyout Card */}
                            <div
                              className={`absolute left-10 top-1/2 -translate-y-1/2 w-64 p-3 rounded-xl bg-black/90 border border-white/20 backdrop-blur-2xl shadow-2xl transition-all duration-300 pointer-events-none ${
                                isSelected
                                  ? 'opacity-100 translate-x-0 pointer-events-auto scale-100 z-50'
                                  : 'opacity-0 -translate-x-2 scale-95 group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span className="text-cyan-400 font-bold uppercase">{spot.type}</span>
                                <span>{spot.status}</span>
                              </div>
                              <div className="font-bold text-white text-xs leading-snug">
                                {spot.name}
                              </div>
                              <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                                {spot.spec}
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between font-mono text-[10px]">
                                <span className="text-slate-400">BOQ LINE ITEM:</span>
                                <span className="text-emerald-400 font-semibold">{spot.cost}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}

              {/* HUD Precision Overlay Elements */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 font-mono text-[11px] bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '12s' }} />
                <span className="text-slate-300">TELEMETRY:</span>
                <span className="text-white font-bold">{Math.round(scrollProgress * 100)}% EXPLORATION</span>
              </div>

              <div className="absolute top-4 right-4 z-20 font-mono text-[11px] bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-slate-300">
                <span>INTERACTIVE 3D HUD</span>
              </div>

              <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hover hotspots to inspect GFC specifications and verified rate items</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM PROGRESS SCRUBBER BAR */}
        <footer className="relative z-30 flex flex-col gap-2 border border-white/[0.08] bg-[#040609]/85 backdrop-blur-xl rounded-2xl px-5 py-3 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>SCROLL DOWN TO DECONSTRUCT ARCHITECTURE</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-300">
                EPOCH 0{activeLayerIndex + 1} OF 04
              </span>
              <span className="text-cyan-400 font-bold">
                {activeLayer.scopePercent}
              </span>
            </div>
          </div>

          {/* Smooth Continuous Scrubber Track */}
          <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 left-0 transition-all duration-150 ease-out rounded-full"
              style={{
                width: `${scrollProgress * 100}%`,
                background: activeLayer.accentGradient,
                boxShadow: `0 0 16px ${activeLayer.glowColor}`,
              }}
            />
          </div>
        </footer>

      </div>
    </section>
  );
}
`;

fs.writeFileSync('C:/Users/Admin/Desktop/Construct-O-Genie/components/marketing/DeconstructedBuildingScroll.js', deconstructedBuildingCode, 'utf8');
console.log('DeconstructedBuildingScroll.js successfully written!');
