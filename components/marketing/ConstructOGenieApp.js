'use client';

import React, { useState } from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import ProblemSection from './ProblemSection';
import ProjectLifecycle from './ProjectLifecycle';
import BOQSpine from './BOQSpine';
import CommandCentre from './CommandCentre';
import RoleTabs from './RoleTabs';
import SiteOfficeSync from './SiteOfficeSync';
import FinanceFlow from './FinanceFlow';
import ApprovalStack from './ApprovalStack';
import PortalsSection from './PortalsSection';
import IndiaNativeOps from './IndiaNativeOps';
import AuditTraceability from './AuditTraceability';
import QualitativeOutcomes from './QualitativeOutcomes';
import FinalCTA from './FinalCTA';
import Footer from './Footer';
import BookDemoModal from './BookDemoModal';
import SignInModal from './SignInModal';

export default function ConstructOGenieApp() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080A0C] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 antialiased font-sans">
      
      {/* Floating Header */}
      <Navbar 
        onOpenDemo={() => setDemoOpen(true)} 
        onOpenLogin={() => setLoginOpen(true)} 
      />

      {/* Main Experience Stream */}
      <main>
        <Hero 
          onOpenDemo={() => setDemoOpen(true)} 
        />
        
        <ProblemSection />
        
        <ProjectLifecycle />
        
        <BOQSpine />
        
        <CommandCentre />
        
        <RoleTabs />
        
        <SiteOfficeSync />
        
        <FinanceFlow />
        
        <ApprovalStack />
        
        <PortalsSection />
        
        <IndiaNativeOps />
        
        <AuditTraceability />
        
        <QualitativeOutcomes />
        
        <FinalCTA 
          onOpenDemo={() => setDemoOpen(true)} 
        />
      </main>

      {/* Enterprise Footer */}
      <Footer 
        onOpenDemo={() => setDemoOpen(true)} 
        onOpenLogin={() => setLoginOpen(true)} 
      />

      {/* Interactive Modals */}
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
