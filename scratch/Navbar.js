'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

export default function Navbar({ onOpenDemo, onOpenLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Overview', href: '#overview' },
    { name: 'BOQ & Estimation', href: '#boq-estimation' },
    { name: 'Project Controls', href: '#project-controls' },
    { name: 'Site Execution', href: '#site-execution' },
    { name: 'Finance & Billing', href: '#finance-billing' },
    { name: 'Portals', href: '#portals' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 py-4 pointer-events-none">
      <nav
        className={`pointer-events-auto w-full max-w-7xl flex items-center justify-between px-5 sm:px-6 py-2.5 rounded-2xl transition-all duration-300 ${
          scrolled
            ? 'bg-[#0A0D12]/85 border border-white/15 backdrop-blur-2xl shadow-2xl'
            : 'bg-[#0A0D12]/50 border border-white/10 backdrop-blur-md'
        }`}
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
              <img
                src="/brand/logo-icon.png"
                alt="Construct-O-Genie"
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-white text-base tracking-tight leading-none block font-display">
                Construct-O-Genie
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block mt-0.5">
                Interior & Fit-Out Platform
              </span>
            </div>
          </a>
        </div>

        {/* Navigation Links */}
        <div className="hidden lg:flex items-center gap-7 text-xs font-medium text-slate-300">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="hover:text-white transition-colors py-1 relative group"
            >
              {link.name}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3 font-medium text-xs">
          <button
            onClick={onOpenLogin}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer font-sans"
          >
            Sign In
          </button>
          <button
            onClick={onOpenDemo}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 active:scale-95 transition-all duration-200 shadow-md cursor-pointer"
          >
            <span>Book a Demo</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden pointer-events-auto fixed inset-x-4 top-20 p-6 rounded-3xl bg-[#0A0D12]/95 border border-white/20 backdrop-blur-2xl shadow-2xl flex flex-col gap-4 text-sm font-medium">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-slate-200 hover:text-white border-b border-white/10"
            >
              {link.name}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
              className="w-full py-3 rounded-xl bg-white/10 text-white text-xs font-semibold"
            >
              Sign In
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenDemo(); }}
              className="w-full py-3 rounded-xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider"
            >
              Book a Demo
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
