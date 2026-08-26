'use client';

import React, { useState, useEffect } from 'react';
import ArchitecturalCanvas from './ArchitecturalCanvas';
import ArchitecturalLightTailCursor from './ArchitecturalLightTailCursor';
import Navbar from './Navbar';
import Hero from './Hero';
import ProductPillars from './ProductPillars';
import TradePackageMatrix from './TradePackageMatrix';
import PortalsSection from './PortalsSection';
import QualitativeOutcomes from './QualitativeOutcomes';
import ImpactMetrics from './ImpactMetrics';
import FinalCTA from './FinalCTA';
import Footer from './Footer';
import BookDemoModal from './BookDemoModal';
import SignInModal from './SignInModal';

export default function ConstructOGenieApp() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Global scroll listener for full-page deconstruction background
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            const current = window.scrollY;
            const progress = Math.min(Math.max(current / docHeight, 0), 1);
            setScrollProgress(progress);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 selection:bg-white/30 selection:text-white antialiased font-sans relative">
      
      {/* 0. ARCHITECTURAL LUMINOUS LIGHT-TAIL CURSOR (CANVAS GPU ACCELERATED) */}
      <ArchitecturalLightTailCursor />

      {/* 1. PERSISTENT FULL-SCREEN ARCHITECTURAL DECONSTRUCTION CANVAS (100VW x 100VH) */}
      <ArchitecturalCanvas 
        scrollProgress={scrollProgress} 
      />

      {/* 2. FLOATING ARCHITECTURAL STUDIO NAVBAR */}
      <Navbar 
        onOpenDemo={() => setDemoOpen(true)} 
        onOpenLogin={() => setLoginOpen(true)} 
      />

      {/* 3. CINEMATIC PRODUCT EXPERIENCE STREAM */}
      <main className="relative z-10 space-y-16 sm:space-y-24">
        
        {/* Act 1: The Monumental Vision */}
        <Hero 
          onOpenDemo={() => setDemoOpen(true)} 
        />
        
        {/* Act 2: The Four Pillars of Architectural Control */}
        <ProductPillars 
          onOpenDemo={() => setDemoOpen(true)} 
        />

        {/* Act 3: Turnkey Interior Trade Package Registers */}
        <TradePackageMatrix 
          onOpenDemo={() => setDemoOpen(true)} 
        />
        
        {/* Act 4: Ecosystem Transparency Portals */}
        <PortalsSection />
        
        {/* Act 5: Interactive Margin ROI Simulator */}
        <QualitativeOutcomes />

        {/* Act 6: Industry Impact & Benchmark Scale */}
        <ImpactMetrics />
        
        {/* Act 7: Bare Shell Climax & Finale */}
        <FinalCTA 
          onOpenDemo={() => setDemoOpen(true)} 
        />
      </main>

      {/* 4. ENTERPRISE FOOTER */}
      <Footer 
        onOpenDemo={() => setDemoOpen(true)} 
        onOpenLogin={() => setLoginOpen(true)} 
      />

      {/* 5. INTERACTIVE MODALS */}
      <BookDemoModal 
        isOpen={demoOpen} 
        onClose={() => setDemoOpen(false)} 
      />

      <SignInModal 
        isOpen={loginOpen} 
        onClose={() => setLoginOpen(false)} 
      />

    </div>
  );
}
