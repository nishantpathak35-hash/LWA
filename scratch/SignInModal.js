'use client';

import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

export default function SignInModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    alert(`Signing in as ${email}... Connecting to workspace instance.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in select-none">
      
      <div 
        className="relative w-full max-w-md rounded-3xl border border-white/20 bg-[#0A0D12] text-white p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9)] text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <img
              src="/brand/logo-icon.png"
              alt="Construct-O-Genie"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
            />
          </div>
          <div>
            <div className="font-extrabold text-white text-base leading-none font-display">Construct-O-Genie</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Enterprise Portal</div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight font-display">Sign In to Your Workspace</h3>
        <p className="text-xs text-slate-300 mt-1 font-light">Access your active fit-out projects and BOQ registers.</p>

        <form onSubmit={handleLogin} className="mt-5 space-y-3.5 font-sans text-xs">
          <div>
            <label className="block text-slate-300 font-mono text-[11px] mb-1">Work Email</label>
            <input
              required
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white/40"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-mono text-[11px] mb-1">Password</label>
            <input
              required
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-white/40"
            />
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono pt-1 text-slate-400">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="rounded bg-black border-white/20 text-white" />
              <span>Remember device</span>
            </label>
            <a href="#" className="text-white hover:underline">Forgot password?</a>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all shadow-lg cursor-pointer"
            >
              Sign In to Workspace
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Single Sign-On (SSO / SAML)</span>
          </div>
        </form>

      </div>

    </div>
  );
}
