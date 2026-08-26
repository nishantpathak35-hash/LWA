'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function BookDemoModal({ isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    turnover: '₹25 Cr - ₹75 Cr',
    projectType: 'Commercial Turnkey Fit-Out',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in select-none">
      
      <div 
        className="relative w-full max-w-xl rounded-3xl border border-white/20 bg-[#0A0D12] text-white p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight font-display">
              Executive Walkthrough Scheduled
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto font-sans font-light">
              Our enterprise solutions specialist will connect with <span className="text-white font-semibold">{formData.name || 'your team'}</span> to tailor a live demonstration for your active fit-out project portfolio.
            </p>
            <div className="pt-4">
              <button
                onClick={() => { setSubmitted(false); onClose(); }}
                className="px-6 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-200 font-mono text-[10px] uppercase font-bold tracking-wider mb-3">
              EXECUTIVE PRODUCT DEMO
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Experience Construct-O-Genie
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-sans font-light">
              Customized walkthrough with real BOQ, site execution, and automated client billing workflows.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left font-sans text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">Your Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Arjun Mehta"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white/40"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">Work Email</label>
                  <input
                    required
                    type="email"
                    placeholder="arjun@interiors.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">Phone Number</label>
                  <input
                    required
                    type="tel"
                    placeholder="+91 98200 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white/40"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">Company / Enterprise</label>
                  <input
                    required
                    type="text"
                    placeholder="Apex Fitouts & Interiors"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">Annual Turnover</label>
                  <select
                    value={formData.turnover}
                    onChange={(e) => setFormData({ ...formData, turnover: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141820] border border-white/15 text-white focus:outline-none focus:border-white/40"
                  >
                    <option>₹5 Cr - ₹25 Cr</option>
                    <option>₹25 Cr - ₹75 Cr</option>
                    <option>₹75 Cr - ₹200 Cr</option>
                    <option>₹200 Cr+ (Enterprise)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">Primary Scope</label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141820] border border-white/15 text-white focus:outline-none focus:border-white/40"
                  >
                    <option>Commercial Turnkey Fit-Out</option>
                    <option>Luxury Residential Interior</option>
                    <option>Retail & Hospitality Fitout</option>
                    <option>General Contracting (Civil+MEP)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all shadow-lg cursor-pointer"
                >
                  Schedule 1-on-1 Walkthrough
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero spam guarantee • 100% Confidential</span>
              </div>
            </form>
          </div>
        )}

      </div>

    </div>
  );
}
