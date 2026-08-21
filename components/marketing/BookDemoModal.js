'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Building2, 
  Mail, 
  Phone, 
  User, 
  Loader2,
  Sparkles
} from 'lucide-react';

export default function BookDemoModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    companySize: '11-50',
    projectsPerYear: '6-20',
    primaryChallenge: 'Everything'
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#0c1015] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl shadow-cyan-950/60 overflow-hidden font-mono text-xs">
        
        {/* Subtle Top CAD Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-amber-400" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white font-sans">
              Demo Request Received
            </h3>
            <p className="text-slate-300 text-xs font-sans max-w-sm mx-auto leading-relaxed">
              Thank you, <strong className="text-white">{formData.name}</strong>. Our enterprise solutions team will contact you within 4 business hours to schedule a custom walkthrough for <strong className="text-cyan-400">{formData.company}</strong>.
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08] transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              SCHEDULE A PERSONALIZED ARCHITECTURAL DEMO
            </div>
            <h3 className="text-2xl font-bold text-white font-sans tracking-tight">
              See Construct-O-Genie in Action
            </h3>
            <p className="text-slate-400 text-xs font-sans mt-1">
              Discover how leading interior & fit-out firms replace spreadsheets with unified project control.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Seth"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="vikram@interiorcompany.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Phone Number (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98110 XXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Company / Studio Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Horizon Interiors Ltd."
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Company Size</label>
                  <select
                    value={formData.companySize}
                    onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-white focus:outline-none focus:border-cyan-400 text-xs"
                  >
                    <option value="1-10">1 - 10 employees</option>
                    <option value="11-50">11 - 50 employees</option>
                    <option value="51-200">51 - 200 employees</option>
                    <option value="200+">200+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Projects Per Year</label>
                  <select
                    value={formData.projectsPerYear}
                    onChange={(e) => setFormData({ ...formData, projectsPerYear: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-white focus:outline-none focus:border-cyan-400 text-xs"
                  >
                    <option value="1-5">1 - 5 Turnkey Projects</option>
                    <option value="6-20">6 - 20 Turnkey Projects</option>
                    <option value="20+">20+ Large Commercial Projects</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Primary Operational Challenge</label>
                <select
                  value={formData.primaryChallenge}
                  onChange={(e) => setFormData({ ...formData, primaryChallenge: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-white focus:outline-none focus:border-cyan-400 text-xs"
                >
                  <option value="Everything">Everything (Unified Operating System)</option>
                  <option value="BOQ Control">BOQ & Margin Control (Eliminating Leaks)</option>
                  <option value="Procurement">Procurement & POs (Budget Validation)</option>
                  <option value="Site Execution">Site Execution & DPR (Field Sync)</option>
                  <option value="Finance">Finance, RA Bills & 194C TDS</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider font-mono shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scheduling Demo...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Demo Request</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
