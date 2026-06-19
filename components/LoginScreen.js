'use client';

import React, { useState } from 'react';
import { useAppState } from './StateProvider';
import { ShieldCheck, RefreshCw, KeyRound, Mail } from 'lucide-react';

export default function LoginScreen() {
  const { login, error, setError } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      // Error is set in StateProvider context, but we reset loading state
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#020617] text-slate-100 overflow-hidden font-sans">
      {/* Brand panel (Left side) */}
      <div className="flex-1 hidden md:flex flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-r border-slate-900/60 relative">
        {/* Decorative ambient gradients */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gold/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-gold to-yellow-600 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-gold/10">
            LW
          </div>
          <span className="font-semibold tracking-wider text-slate-200">LUXEWORX</span>
        </div>

        <div className="space-y-6 max-w-xl relative z-10 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/20 bg-gold/5 text-xs text-gold/90 font-medium tracking-wide">
            FINANCE OPERATIONS
          </div>
          <h1 className="text-4xl lg:text-5xl font-light leading-tight font-serif">
            Capital, <em className="text-gold not-italic font-normal">composed</em>.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed font-light">
            A single unified ledger for purchase orders, vendor payments, project cashflow, and multi-stage approvals. Engineered for premium interior design practices.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-900">
            <div>
              <div className="text-2xl font-light text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gold" />
                256-bit
              </div>
              <p className="text-xs text-slate-500 mt-1">SESSION SECURITY</p>
            </div>
            <div>
              <div className="text-2xl font-light text-slate-200 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-gold animate-spin-slow" />
                Real-time
              </div>
              <p className="text-xs text-slate-500 mt-1">DATA RECONCILIATION</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-600 relative z-10">
          &copy; Luxeworx Atelier Interiors Pvt Ltd &middot; Private System
        </div>
      </div>

      {/* Form panel (Right side) */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16 lg:p-24 relative z-10 bg-[#020617]">
        {/* Mobile branding */}
        <div className="absolute top-8 left-8 flex items-center gap-2 md:hidden">
          <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center font-bold text-slate-950">
            LW
          </div>
          <span className="text-xs font-semibold text-slate-200 tracking-wider">LUXEWORX</span>
        </div>

        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div>
            <h2 className="text-3xl font-light tracking-tight text-slate-100 font-serif">Sign in</h2>
            <p className="mt-2 text-sm text-slate-400 font-light">
              Use the credentials provisioned by your system director.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 tracking-wider block mb-2" htmlFor="email">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-900 rounded-lg text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
                    placeholder="you@luxeworx.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 tracking-wider block mb-2" htmlFor="password">
                  PASSWORD
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-900 rounded-lg text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 leading-relaxed">
                {error.replace(/^Error: /i, '')}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-gold active:from-yellow-700 text-slate-950 font-medium text-sm rounded-lg shadow-lg shadow-gold/5 hover:shadow-gold/15 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-slate-600">
            Forgot your password? Contact your director to reset it.
          </p>
        </div>
      </div>
    </div>
  );
}
