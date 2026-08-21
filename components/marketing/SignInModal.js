'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, ArrowRight, Layers, ShieldCheck, Loader2 } from 'lucide-react';
import { useAppState } from '../StateProvider';

export default function SignInModal({ isOpen, onClose }) {
  const { login } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (login) {
        await login(email, password);
        onClose();
      } else {
        // Fallback for standalone demo
        setTimeout(() => {
          window.location.href = '/?logged_in=true';
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in font-mono text-xs">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0c1015] border border-white/[0.1] p-6 sm:p-8 shadow-2xl shadow-black overflow-hidden">
        
        {/* Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-left mb-6">
          <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-bold uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5" />
            ENTERPRISE ERP ACCESS
          </div>
          <h3 className="text-2xl font-bold text-white font-sans tracking-tight">
            Sign In to Construct-O-Genie
          </h3>
          <p className="text-slate-400 text-xs font-sans mt-1">
            Access your interior company's active projects, BOQs, and finance console.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Work Email</label>
            <input
              type="email"
              required
              placeholder="user@interiorcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider font-mono shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/[0.06] text-center text-[10px] text-slate-400">
          Enterprise Maker/Checker Authentication Enabled
        </div>

      </div>
    </div>
  );
}
