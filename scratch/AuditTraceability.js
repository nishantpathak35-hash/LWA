'use client';

import React from 'react';
import { ShieldCheck, Clock, CheckCircle2, FileText, UserCheck } from 'lucide-react';

export default function AuditTraceability() {
  const auditLogs = [
    { time: '10:42 AM', user: 'vikram.seth@horizon.com (Design Head)', action: 'BOQ Revision Approved', detail: 'Rev 04.2 GFC acoustic panelling quantities locked (480 SQ.M)' },
    { time: '11:18 AM', user: 'amit.verma@horizon.com (Procurement)', action: 'PO #COG-0241 Generated', detail: 'Committed to WoodCraft Studios within BCS budget limit' },
    { time: '11:24 AM', user: 'system.engine@construct-o-genie.com', action: 'Approval Workflow Dispatched', detail: 'PO value ₹8.42L exceeds ₹5L threshold; escalated to Director' },
    { time: '12:02 PM', user: 'rajesh.sharma@horizon.com (Director)', action: 'PO Authorized & Digitally Signed', detail: 'Budget remaining in Joinery category verified: ₹4.41L' },
    { time: '14:16 PM', user: 'portal.woodcraft@vendor.com', action: 'PO Acknowledged by Vendor', detail: 'Confirmed delivery scheduled for Level 14 site on 24 Aug' },
    { time: 'Next Day 09:30 AM', user: 'suresh.kumar@horizon.com (Site Engineer)', action: 'Gate Delivery GRN-109 Scanned', detail: '420 SQ.M fluted panels inspected, photo uploaded, approved' }
  ];

  return (
    <section className="bg-transparent py-24  border-b border-white/[0.06] relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-white font-mono text-[11px] uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            ENTERPRISE TRACEABILITY
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Every action <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-200 to-white">
              leaves a trail.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Immutable audit logging across every drawing release, commercial modification, purchase authorization, and bank remittance.
          </p>
        </div>

        {/* Audit Timeline Card */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-[#0c1015] border border-white/[0.08] p-6 sm:p-10 shadow-2xl font-mono text-xs">
          
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
            <div className="flex items-center gap-2 text-white font-bold">
              <Clock className="w-4 h-4" />
              <span>PROJECT AUDIT LOG // PRJ-COG-26041</span>
            </div>
            <span className="text-[10px] text-slate-400">IMMUTABLE COMPLIANCE LEDGER</span>
          </div>

          <div className="space-y-4">
            {auditLogs.map((log, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/20 flex items-center justify-center text-white shrink-0 font-bold text-[10px]">
                    0{idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-normal">by {log.user}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {log.detail}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 rounded bg-white/[0.04] text-slate-300 text-[10px] border border-white/[0.06]">
                    {log.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
