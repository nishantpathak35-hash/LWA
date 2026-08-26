'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  Sliders, 
  Crosshair,
  Info,
  FileSpreadsheet,
  Link2
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTRUCTION & FIT-OUT EXECUTION STAGES (AUTHENTIC TECHNICAL SPECIFICATIONS)
───────────────────────────────────────────────────────────────────────────── */
export const ARCHITECTURAL_LAYERS = [
  {
    id: 0,
    index: '01',
    stageCode: 'STAGE 01',
    layerName: 'Base Building Handover & Core Shell',
    technicalSummary: 'Structural Grid Verification, Slab Levelness & Perimeter Envelope',
    narrative:
      'Before interior fit-out commences, the base structural coordinate grid is locked. Site engineers verify column plumbness and slab levelness (FFL/SSL) against architectural datum levels to prevent cumulative dimensional errors across trade packages.',
    src: '/building-stage3.jpg',
    scopeDescription: 'Base Building Handover',
    elevation: 'Datum +0.000m SSL',
    axisCode: 'Grid Axis A1–G14',
    qualityStandard: 'IS 456:2000 & Base Handover Snag Protocol',
    primaryColor: '#FFFFFF',
    glowColor: 'rgba(0, 255, 163, 0.4)',
    accentGradient: 'linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 100%)',
    specifications: [
      { label: 'Floor Plate Area', val: '14,800 sq.ft' },
      { label: 'Slab Level Tolerance', val: '±2.0 mm verified' },
      { label: 'Point Survey', val: 'Base Grid Locked' },
      { label: 'Core Snag Status', val: 'Handover Cleared' },
    ],
    components: [
      {
        id: 'col-1',
        name: 'M40 Concrete Structural Columns',
        trade: 'Civil & Structural',
        spec: 'Grade M40 concrete drop columns with post-tensioned tendon anchor checks',
        status: 'Handover Verified',
        boqRef: 'Base Building Asset',
        x: 32,
        y: 46,
      },
      {
        id: 'soffit-1',
        name: 'Structural Ceiling Soffit',
        trade: 'Civil Core',
        spec: 'Clear Height 4,200mm to underside of slab • Service routing clearance verified',
        status: 'Level Checked',
        boqRef: 'Base Building Asset',
        x: 55,
        y: 18,
      },
      {
        id: 'curtain-1',
        name: 'Double Glazed Unitized Facade',
        trade: 'Perimeter Envelope',
        spec: '28mm DGU Acoustic Facade with thermal break and air/water infiltration clearance',
        status: 'Leakage Tested',
        boqRef: 'Base Building Asset',
        x: 18,
        y: 62,
      },
    ],
  },
  {
    id: 1,
    index: '02',
    stageCode: 'STAGE 02',
    layerName: 'MEP Services & First-Fix Rough-Ins',
    technicalSummary: 'HVAC VRF Distribution, Cable Trays & Fire Sprinkler Mains',
    narrative:
      'Coordinated execution of mechanical, electrical, plumbing, and fire safety services. Rerouting clashes are resolved directly against composite MEP shop drawings before drywall partitioning and ceiling suspension grids are installed.',
    src: '/building-mep.jpg',
    scopeDescription: 'First-Fix MEP Services',
    elevation: '+3.450m Duct Invert',
    axisCode: 'Zone North — MEP-01',
    qualityStandard: 'NFPA 13 & IS 659 GFC Approved',
    primaryColor: '#FF3366',
    glowColor: 'rgba(255, 51, 102, 0.4)',
    accentGradient: 'linear-gradient(135deg, #FF3366 0%, #FF8A00 100%)',
    specifications: [
      { label: 'HVAC Air Volume', val: '28,000 CFM VRF' },
      { label: 'Duct Pressure Test', val: 'Passed @ 1.5x WP' },
      { label: 'Cable Ladder Trays', val: '1,450 R.M. Installed' },
      { label: 'Fire Sprinklers', val: '124 Heads Calibrated' },
    ],
    components: [
      {
        id: 'hvac-1',
        name: 'Class-0 Insulated Galvanized Ducting',
        trade: 'HVAC / Mechanical',
        spec: '22-Gauge GI sheet with closed-cell nitrile rubber insulation and flanged joints',
        status: 'Pressure Tested',
        boqRef: 'BOQ Item 07.02.A',
        x: 48,
        y: 15,
      },
      {
        id: 'trays-1',
        name: 'Heavy-Duty Perforated Cable Trays',
        trade: 'Electrical Systems',
        spec: 'Hot-dip galvanized 300x50mm trays with segregated high voltage & data raceways',
        status: 'Inspected & Cleared',
        boqRef: 'BOQ Item 08.01.C',
        x: 74,
        y: 24,
      },
      {
        id: 'drywall-1',
        name: 'Galvanized Steel Stud Drywall Framing',
        trade: 'Partitions & Framing',
        spec: '0.55mm BMT C-stud framing with 50mm 48kg/m³ mineral wool acoustic infill',
        status: 'Plumbness Verified',
        boqRef: 'BOQ Item 03.04.B',
        x: 28,
        y: 65,
      },
    ],
  },
  {
    id: 2,
    index: '03',
    stageCode: 'STAGE 03',
    layerName: 'Framing, Drywall & Joinery Substrates',
    technicalSummary: 'Acoustic Partitions, Millwork Carcass & Floor Screeds',
    narrative:
      'Substrates and framing packages take shape. Wall paneling substructures, concealed sliding door tracks, and MEP access hatches are aligned against approved GFC Revision 04 drawings prior to finishing trade mobilization.',
    src: '/building-stage2.jpg',
    scopeDescription: 'Substrates & Carpentry',
    elevation: '+2.850m Ceiling Grid',
    axisCode: 'Zone Atrium — Joinery-02',
    qualityStandard: 'FSC Certified & GreenPro Tier 1',
    primaryColor: '#FFFFFF',
    glowColor: 'rgba(255, 255, 255, 0.4)',
    accentGradient: 'linear-gradient(135deg, #FFFFFF 0%, #7000FF 100%)',
    specifications: [
      { label: 'Partition Acoustic Rating', val: 'STC 54 Rating' },
      { label: 'Perimeter Shadow Reveal', val: '12mm Negative' },
      { label: 'Floor Screed Moisture', val: '< 2.5% CM Tested' },
      { label: 'Joinery CNC Tolerance', val: '±0.5mm Precision' },
    ],
    components: [
      {
        id: 'panel-1',
        name: 'Fire-Retardant Acoustic Wall Paneling',
        trade: 'Joinery & Paneling',
        spec: 'Micro-perforated natural oak veneer on Class-1 fire-rated MDF core',
        status: 'Moisture Sealed',
        boqRef: 'BOQ Item 04.01.A',
        x: 62,
        y: 48,
      },
      {
        id: 'reveal-1',
        name: 'Extruded Aluminum Ceiling Reveal Profile',
        trade: 'False Ceilings',
        spec: 'Anodized 15x15mm negative shadow line profile with integrated LED lighting channel',
        status: 'Alignment Verified',
        boqRef: 'BOQ Item 06.03.D',
        x: 42,
        y: 12,
      },
      {
        id: 'cove-1',
        name: 'Recessed Linear HVAC Diffuser Slots',
        trade: 'Integrated Services',
        spec: 'Architectural slot diffusers with internally insulated plenum boxes and balancing dampers',
        status: 'Airflow Balanced',
        boqRef: 'BOQ Item 07.04.E',
        x: 80,
        y: 35,
      },
    ],
  },
  {
    id: 3,
    index: '04',
    stageCode: 'STAGE 04',
    layerName: 'Finishes, Testing & Turnkey Handover',
    technicalSummary: 'Final Materials, DALI Lighting, Testing & Commissioning',
    narrative:
      'The finished interior space. Delivered on schedule, 100% matched to approved BOQ specifications, verified by tripartite Joint Measurement Records (JMR), and handed over with complete digital as-built documentation.',
    src: '/hero-interior.jpg',
    scopeDescription: 'Handover & Commissioning',
    elevation: 'Finished Floor Level (FFL)',
    axisCode: 'All Project Zones',
    qualityStandard: 'ISO 9001:2015 & Client Sign-Off',
    primaryColor: '#FFB800',
    glowColor: 'rgba(255, 184, 0, 0.4)',
    accentGradient: 'linear-gradient(135deg, #FFB800 0%, #FF3366 100%)',
    specifications: [
      { label: 'Snag Rectification', val: '100% Cleared' },
      { label: 'Lighting CRI / Scene', val: 'CRI 95+ Tunable' },
      { label: 'Acoustic Reverberation', val: 'RT60 = 0.45 sec' },
      { label: 'Digital JMR Status', val: 'Signed & Certified' },
    ],
    components: [
      {
        id: 'marble-1',
        name: 'Italian Statuario Marble Flooring',
        trade: 'Stone & Flooring',
        spec: '20mm bookmatched Italian marble with mitred joints, brass inlay, and diamond polish finish',
        status: 'Sealed & Certified',
        boqRef: 'BOQ Item 03.05.A',
        x: 52,
        y: 72,
      },
      {
        id: 'lighting-1',
        name: 'Magnetic Architectural Track Lighting',
        trade: 'Lighting Automation',
        spec: 'Glare-free magnetic track spotlights with DALI dimming and centralized scene controls',
        status: 'Commissioned',
        boqRef: 'BOQ Item 08.03.B',
        x: 38,
        y: 22,
      },
      {
        id: 'acoustic-1',
        name: 'Double Glazed Acoustic Glass Partitions',
        trade: 'Glazing & Doors',
        spec: '12.76mm acoustic PVB laminated toughened glass with concealed drop seals and DORMA hardware',
        status: 'Sound Tested',
        boqRef: 'BOQ Item 02.04.C',
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

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;

      const current = -rect.top;
      const progress = Math.min(Math.max(current / totalScrollable, 0), 1);
      setScrollProgress(progress);

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
      id="execution-stages"
      className="relative w-full bg-[#040609] text-white"
      style={{ minHeight: '340vh' }}
    >
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden px-4 md:px-8 py-4 md:py-6 z-20">
        
        {/* Subtle Blueprint Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
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
              <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
                EXECUTION STAGE VIEWER
              </span>
            </div>
            <div className="hidden md:block h-4 w-px bg-white/10" />
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 font-mono">
              <span>ELEVATION:</span>
              <span className="text-white font-medium">{activeLayer.elevation}</span>
              <span className="text-white/20">|</span>
              <span>ZONE:</span>
              <span className="text-slate-200">{activeLayer.axisCode}</span>
            </div>
          </div>

          {/* Stage Switcher */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/[0.08]">
            {ARCHITECTURAL_LAYERS.map((layer, idx) => {
              const isActive = idx === activeLayerIndex;
              return (
                <button
                  key={layer.id}
                  onClick={() => handleJumpToLayer(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold shadow-sm border border-white/20'
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
                  <span className="hidden lg:inline text-[11px] opacity-75">{layer.scopeDescription}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenDemo}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/10 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Book a Demo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* MAIN STAGE VIEWPORT */}
        <div className="relative z-20 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center my-3 min-h-0">
          
          {/* LEFT: TECHNICAL SPECS & SUMMARY (4 COLS) */}
          <div className="lg:col-span-4 flex flex-col justify-center space-y-4 max-h-full overflow-y-auto pr-1 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] w-fit">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: activeLayer.primaryColor }}
              />
              <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-200">
                {activeLayer.stageCode} : {activeLayer.scopeDescription.toUpperCase()}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {activeLayer.layerName}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-200 mt-1">
                {activeLayer.technicalSummary}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              {activeLayer.narrative}
            </p>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {activeLayer.specifications.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm"
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
              <span className="text-slate-400">QUALITY STANDARD:</span>
              <span className="text-emerald-400 font-semibold">{activeLayer.qualityStandard}</span>
            </div>
          </div>

          {/* CENTER/RIGHT: INTERACTIVE BUILDING VIEWER (8 COLS) */}
          <div
            className="lg:col-span-8 h-full flex flex-col items-center justify-center relative min-h-[360px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
          >
            {/* Visual Viewport Frame with 3D Parallax Tilt */}
            <div
              className="relative w-full h-[54vh] lg:h-[68vh] rounded-3xl overflow-hidden border border-white/10 bg-[#090D12] shadow-2xl transition-transform duration-300 ease-out"
              style={{
                transform: `perspective(1000px) rotateY(${mousePos.x * 5}deg) rotateX(${
                  -mousePos.y * 5
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

                    <div className="absolute inset-0 bg-gradient-to-t from-[#040609] via-transparent to-[#040609]/40 pointer-events-none" />

                    {/* Hotspot Target Markers */}
                    {isCurrent &&
                      layer.components.map((spot) => {
                        const isSelected = selectedHotspot?.id === spot.id;
                        return (
                          <div
                            key={spot.id}
                            style={{ top: `${spot.y}%`, left: `${spot.x}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group"
                          >
                            <button
                              onClick={() => setSelectedHotspot(isSelected ? null : spot)}
                              className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/40 hover:border-white/30 hover:scale-110 transition-all duration-200 cursor-pointer shadow-lg"
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

                            {/* Inspection Flyout Card */}
                            <div
                              className={`absolute left-10 top-1/2 -translate-y-1/2 w-64 p-3.5 rounded-xl bg-black/90 border border-white/20 backdrop-blur-2xl shadow-2xl transition-all duration-300 pointer-events-none text-left ${
                                isSelected
                                  ? 'opacity-100 translate-x-0 pointer-events-auto scale-100 z-50'
                                  : 'opacity-0 -translate-x-2 scale-95 group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span className="text-white font-bold uppercase">{spot.trade}</span>
                                <span>{spot.status}</span>
                              </div>
                              <div className="font-bold text-white text-xs leading-snug">
                                {spot.name}
                              </div>
                              <div className="text-[11px] text-slate-300 mt-1 leading-relaxed font-sans">
                                {spot.spec}
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between font-mono text-[10px]">
                                <span className="text-slate-400">BOQ MAPPING:</span>
                                <span className="text-emerald-400 font-semibold">{spot.boqRef}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}

              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 font-mono text-[11px] bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Crosshair className="w-3.5 h-3.5 text-white" />
                <span className="text-slate-300">INTERACTIVE INSPECTION MODE</span>
              </div>

              <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Info className="w-3.5 h-3.5 text-white" />
                <span>Click hotspots to inspect trade specifications and BOQ mappings</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SCRUBBER BAR */}
        <footer className="relative z-30 flex flex-col gap-2 border border-white/[0.08] bg-[#040609]/85 backdrop-blur-xl rounded-2xl px-5 py-3 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-white" />
              <span>SCROLL TO EXPLORE EXECUTION STAGES</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-300">
                STAGE 0{activeLayerIndex + 1} OF 04
              </span>
              <span className="text-white font-bold">
                {activeLayer.scopeDescription}
              </span>
            </div>
          </div>

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
