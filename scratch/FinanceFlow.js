'use client';

import React, { useState } from 'react';
import { DollarSign, ArrowRight, CheckCircle2, ShieldCheck, FileCheck, RefreshCw } from 'lucide-react';

export default function FinanceFlow() {
  const [billAmount, setBillAmount] = useState(1500000); // 15 Lakhs

  // Financial calculations
  const gst = billAmount * 0.18;
  const taxWithholding = billAmount * 0.02; // 2% contractor tax withholding
  const retention = billAmount * 0.05; // 5% security retention
  const netPayable = billAmount + gst - taxWithholding - retention;

  return (
    <section id="finance-billing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 relative bg-transparent">
      
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] uppercase tracking-wider mb-4 backdrop-blur-md">
          <DollarSign className="w-3.5 h-3.5" />
          PROJECT CASH FLOW & BILLING
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          Cash Flow, Billing & Accounting. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-slate-300">
            Automated in Real Time.
          </span>
        </h2>
        <p className="mt-4 text-base text-slate-200">
          Running Account bills generate automatically from certified field measurements, calculating tax withholdings and security retentions with direct Tally Prime sync.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Team Screenshot (6 Cols) */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl p-2.5 shadow-2xl overflow-hidden">
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img
                src="/finance-team.jpg"
                alt="Finance & Billing Team Platform"
                className="w-full h-auto object-cover filter brightness-[0.95] contrast-[1.05]"
              />
            </div>
            <div className="p-4 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>2-Way Tally Prime Bridge Active</span>
              </div>
              <span className="text-emerald-400 font-bold">100% AUDIT READY</span>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive RA Bill Calculator (6 Cols) */}
        <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-black/40 border border-white/15 backdrop-blur-2xl shadow-2xl space-y-5 text-left">
          
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Live Billing & Contractor Payout Engine</h3>
              <p className="text-xs text-slate-300">Automated milestone certification, tax withholding & retention holds</p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
              RA BILL #04
            </span>
          </div>

          {/* Amount Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Certified Milestone Value:</span>
              <span className="text-white font-bold">₹{(billAmount / 100000).toFixed(1)} Lakhs</span>
            </div>
            <input
              type="range"
              min="500000"
              max="5000000"
              step="100000"
              value={billAmount}
              onChange={(e) => setBillAmount(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Deductions Breakdown */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/5 text-slate-300">
              <span>Gross Certified Value:</span>
              <span className="text-white font-bold">₹{billAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 text-slate-300">
              <span>+ 18% GST Output:</span>
              <span className="text-slate-200 font-bold">+₹{gst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 text-slate-300">
              <span>- 2% Contractor Tax Withholding:</span>
              <span className="text-red-400 font-bold">-₹{taxWithholding.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 text-slate-300">
              <span>- 5% Security Retention:</span>
              <span className="text-amber-400 font-bold">-₹{retention.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-bold">
              <span className="text-white">Net Approved Payout:</span>
              <span className="text-emerald-400">₹{netPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
}
