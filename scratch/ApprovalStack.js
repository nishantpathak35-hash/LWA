'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Check, 
  X, 
  Clock, 
  FileText, 
  Receipt, 
  ArrowRight,
  Lock,
  Sparkles
} from 'lucide-react';

export default function ApprovalStack() {
  const [poStatus, setPoStatus] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [payStatus, setPayStatus] = useState('pending');

  return (
    <section className="bg-transparent py-24  border-b border-white/[0.06] relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-white font-mono text-[11px] uppercase tracking-wider mb-4">
            <Lock className="w-3.5 h-3.5" />
            FINANCIAL GOVERNANCE & CONTROL
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Nothing important moves <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-200 to-white">
              without the right approval.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Multi-tiered Maker/Checker authorization with live budget validation. Every purchase order and payment voucher requires verifiable approval thresholds before commitment.
          </p>
        </div>

        {/* Dual Interactive Approval Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Card 1: PO Approval Stack */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1015] border border-white/[0.08] shadow-2xl font-mono text-xs flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <FileText className="w-4 h-4" />
                  <span>PO AUTHORIZATION QUEUE</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                  poStatus === 'approved' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : poStatus === 'rejected'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {poStatus === 'approved' ? 'APPROVED & DISPATCHED' : poStatus === 'rejected' ? 'REJECTED' : 'AWAITING DIRECTOR'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Purchase Order</div>
                  <div className="text-base font-bold text-white mt-0.5">PO #COG-0241 (WoodCraft Studios)</div>
                  <div className="text-[11px] text-slate-400">Bespoke Fluted Oak Wall Panelling (480 SQ.M)</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">PO Requested Value</span>
                    <span className="text-white font-bold text-sm">₹8,42,750</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available Category Budget</span>
                    <span className="text-teal-400">₹12,84,000</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-slate-400">Remaining Budget Post-Approval</span>
                    <span className="text-emerald-400 font-bold">₹4,41,250 (Safe)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/[0.06] flex items-center gap-3">
              {poStatus === 'pending' ? (
                <>
                  <button
                    onClick={() => setPoStatus('rejected')}
                    className="flex-1 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => setPoStatus('approved')}
                    className="flex-1 py-3 rounded-xl bg-white hover:bg-white text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-slate-500/30"
                  >
                    <Check className="w-4 h-4" /> Approve PO
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setPoStatus('pending')}
                  className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white"
                >
                  Reset Demo State
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Vendor Payment Advice Stack */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1015] border border-white/[0.08] shadow-2xl font-mono text-xs flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                  <Receipt className="w-4 h-4" />
                  <span>VENDOR PAYMENT ADVICE (194C)</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                  payStatus === 'approved' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                }`}>
                  {payStatus === 'approved' ? 'REMITTED (UTR SENT)' : 'PENDING FINANCE'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Vendor Invoice</div>
                  <div className="text-base font-bold text-white mt-0.5">INV-984 / Saint-Gobain Glass</div>
                  <div className="text-[11px] text-slate-400">Linked to GRN-109 & PO #COG-0244</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Invoice Amount</span>
                    <span className="text-white font-bold text-sm">₹4,80,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-400">TDS Deduction (2% Sec 194C)</span>
                    <span className="text-purple-400 font-semibold">-₹9,600</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-slate-400">Net Remittance Payable</span>
                    <span className="text-emerald-400 font-bold text-base">₹4,70,400</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/[0.06] flex items-center gap-3">
              {payStatus === 'pending' ? (
                <button
                  onClick={() => setPayStatus('approved')}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/30"
                >
                  <Check className="w-4 h-4" /> Authorize Remittance & Send Advice
                </button>
              ) : (
                <div className="w-full space-y-2">
                  <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/30 text-center text-emerald-400 text-[11px]">
                    UTR #AXIS26084920 Generated & Advice Dispatched
                  </div>
                  <button
                    onClick={() => setPayStatus('pending')}
                    className="w-full py-2 text-[10px] text-slate-400 hover:text-white"
                  >
                    Reset Demo State
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
