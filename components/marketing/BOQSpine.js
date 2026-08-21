'use client';

import React, { useState } from 'react';
import { BOQ_SAMPLE_ITEMS } from './marketingData';
import { 
  FileSpreadsheet, 
  ArrowRight, 
  CheckCircle2, 
  ShoppingCart, 
  Hammer, 
  Receipt, 
  TrendingUp, 
  Sparkles,
  Link2,
  Sliders
} from 'lucide-react';

export default function BOQSpine() {
  const [selectedItemId, setSelectedItemId] = useState('BOQ-01');

  const selectedItem = BOQ_SAMPLE_ITEMS.find(i => i.id === selectedItemId) || BOQ_SAMPLE_ITEMS[0];

  return (
    <section id="boq-spine" className="py-24 bg-[#090C10] border-b border-white/[0.06] relative overflow-hidden">
      
      {/* Background CAD Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] uppercase tracking-wider mb-4">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            THE COMMERCIAL SPINE
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Your BOQ shouldn't live <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-white">
              in a spreadsheet.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Turn static scope into a live commercial control layer. Click any BOQ line item below to see how it automatically drives purchase orders, site installation, client billing, and item-level margin.
          </p>
        </div>

        {/* Interactive Live BOQ Control Table */}
        <div className="rounded-3xl bg-[#0c1015] border border-white/[0.08] shadow-2xl overflow-hidden">
          
          {/* Table Header Bar */}
          <div className="p-4 sm:p-5 bg-white/[0.02] border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white font-bold tracking-wide">
                PROJECT: HORIZON WORKSPACE (BOQ / FINAL ESTIMATE REV 04)
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <span>TOTAL ITEMS: 148</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 font-semibold">AVERAGE MARGIN: 21.8%</span>
            </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-white/[0.01] border-b border-white/[0.04] text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Code</th>
                  <th className="py-3.5 px-4 font-bold">Item Description</th>
                  <th className="py-3.5 px-4 font-bold text-right">Quantity</th>
                  <th className="py-3.5 px-4 font-bold text-right">Selling Rate</th>
                  <th className="py-3.5 px-4 font-bold text-right">Cost Rate</th>
                  <th className="py-3.5 px-4 font-bold text-right">Margin %</th>
                  <th className="py-3.5 px-4 font-bold">PO Linked</th>
                  <th className="py-3.5 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {BOQ_SAMPLE_ITEMS.map((item) => {
                  const isSelected = item.id === selectedItemId;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`cursor-pointer transition-all duration-150 ${
                        isSelected 
                          ? 'bg-amber-500/10 border-l-4 border-l-amber-400 text-white' 
                          : 'hover:bg-white/[0.02] text-slate-300'
                      }`}
                    >
                      <td className="py-4 px-4 font-bold text-amber-400/90 whitespace-nowrap">
                        {item.code}
                      </td>
                      <td className="py-4 px-4 font-medium text-white max-w-xs sm:max-w-md truncate">
                        {item.item}
                        <span className="block text-[10px] text-slate-400 font-normal">{item.category}</span>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        {item.qty.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-white whitespace-nowrap">
                        ₹{item.sellingRate.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-400 whitespace-nowrap">
                        ₹{item.costRate.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                        {item.marginPct}%
                      </td>
                      <td className="py-4 px-4 text-cyan-400 whitespace-nowrap">
                        {item.poNo}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          isSelected 
                            ? 'bg-amber-400 text-slate-950 shadow' 
                            : 'bg-white/[0.04] text-slate-400 hover:text-white'
                        }`}>
                          {isSelected ? 'INSPECTING' : 'SELECT'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Live Relationship Flow Bar (The Downstream Ripple Effect) */}
          <div className="p-6 sm:p-8 bg-[#090d13] border-t border-amber-500/30">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                <Link2 className="w-4 h-4" />
                Live Downstream Traceability for [{selectedItem.code}]: {selectedItem.item}
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                PROFITABILITY: +₹{((selectedItem.sellingRate - selectedItem.costRate) * selectedItem.qty).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
              
              {/* Step 1: BOQ Item */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 shadow-md">
                <div className="text-[10px] text-amber-400 font-bold uppercase mb-1">01. BOQ Item</div>
                <div className="text-white font-bold">{selectedItem.qty} {selectedItem.unit}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Rate: ₹{selectedItem.sellingRate}</div>
              </div>

              {/* Step 2: Linked PO */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 shadow-md">
                <div className="text-[10px] text-cyan-400 font-bold uppercase mb-1">02. Purchase Order</div>
                <div className="text-white font-bold">{selectedItem.poNo}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Budget: ₹{(selectedItem.costRate * selectedItem.qty).toLocaleString()}</div>
              </div>

              {/* Step 3: Allocated Vendor */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-teal-500/30 shadow-md">
                <div className="text-[10px] text-teal-400 font-bold uppercase mb-1">03. Vendor Ledger</div>
                <div className="text-white font-bold truncate">{selectedItem.vendor}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">194C Compliant</div>
              </div>

              {/* Step 4: Site GRN */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/30 shadow-md">
                <div className="text-[10px] text-blue-400 font-bold uppercase mb-1">04. Site Material</div>
                <div className="text-white font-bold">{selectedItem.grnStatus}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Gate Pass Verified</div>
              </div>

              {/* Step 5: Site Progress */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-md">
                <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">05. Site Install</div>
                <div className="text-white font-bold">{selectedItem.installedPct}% Installed</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Certified by JMR</div>
              </div>

              {/* Step 6: Client Invoiced */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 shadow-md">
                <div className="text-[10px] text-purple-400 font-bold uppercase mb-1">06. Client Billing</div>
                <div className="text-emerald-400 font-bold">₹{selectedItem.billedAmount.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">RA Bill #03</div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
