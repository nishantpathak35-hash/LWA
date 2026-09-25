'use client';
import React from 'react';
import { Input, Button, Badge } from '../../ui/core';

export const INDIAN_STATES = [
  { code: '01', name: '01 - Jammu & Kashmir' },
  { code: '02', name: '02 - Himachal Pradesh' },
  { code: '03', name: '03 - Punjab' },
  { code: '04', name: '04 - Chandigarh' },
  { code: '05', name: '05 - Uttarakhand' },
  { code: '06', name: '06 - Haryana' },
  { code: '07', name: '07 - Delhi' },
  { code: '08', name: '08 - Rajasthan' },
  { code: '09', name: '09 - Uttar Pradesh' },
  { code: '10', name: '10 - Bihar' },
  { code: '19', name: '19 - West Bengal' },
  { code: '21', name: '21 - Odisha' },
  { code: '23', name: '23 - Madhya Pradesh' },
  { code: '24', name: '24 - Gujarat' },
  { code: '27', name: '27 - Maharashtra' },
  { code: '29', name: '29 - Karnataka' },
  { code: '30', name: '30 - Goa' },
  { code: '32', name: '32 - Kerala' },
  { code: '33', name: '33 - Tamil Nadu' },
  { code: '36', name: '36 - Telangana' },
  { code: '37', name: '37 - Andhra Pradesh' },
  { code: '97', name: '97 - Other Territory' }
];

export default function GstTaxSection({ form, onChange, disabled = false }) {
  const gstMode = form.gstMode || ((form.igstAmount && Number(form.igstAmount) > 0) ? 'inter' : 'intra');
  const subtotal = Number(form.subtotal || 0);
  const tax = Number(form.taxAmount || 0);
  const cgst = Number(form.cgstAmount || 0);
  const sgst = Number(form.sgstAmount || 0);
  const igst = Number(form.igstAmount || 0);

  const gstSum = gstMode === 'intra' ? (cgst + sgst) : igst;
  const isBalanced = tax === 0 || Math.abs(tax - gstSum) < 0.02;

  const handleModeChange = (newMode) => {
    if (disabled) return;
    const currentTax = Number(form.taxAmount || 0);
    const updates = { gstMode: newMode };
    if (newMode === 'intra') {
      const half = currentTax > 0 ? (currentTax / 2).toFixed(2) : '';
      updates.cgstAmount = half;
      updates.sgstAmount = half;
      updates.igstAmount = '';
    } else {
      updates.igstAmount = currentTax > 0 ? currentTax.toFixed(2) : '';
      updates.cgstAmount = '';
      updates.sgstAmount = '';
    }
    onChange(updates);
  };

  const handleCgstChange = (val) => {
    const c = Number(val || 0);
    const s = Number(form.sgstAmount || 0);
    const newTax = (c + s).toFixed(2);
    const newTotal = (subtotal + Number(newTax)).toFixed(2);
    onChange({
      cgstAmount: val,
      taxAmount: newTax,
      invoiceTotal: newTotal
    });
  };

  const handleSgstChange = (val) => {
    const s = Number(val || 0);
    const c = Number(form.cgstAmount || 0);
    const newTax = (c + s).toFixed(2);
    const newTotal = (subtotal + Number(newTax)).toFixed(2);
    onChange({
      sgstAmount: val,
      taxAmount: newTax,
      invoiceTotal: newTotal
    });
  };

  const handleIgstChange = (val) => {
    const i = Number(val || 0);
    const newTax = i > 0 ? i.toFixed(2) : '';
    const newTotal = (subtotal + i).toFixed(2);
    onChange({
      igstAmount: val,
      taxAmount: newTax,
      invoiceTotal: newTotal
    });
  };

  return (
    <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            GST Breakdown & Tax Compliance
          </span>
          {tax > 0 && (
            <Badge variant={isBalanced ? 'outline' : 'destructive'} className="text-[10px] py-0 px-1.5 h-4 font-mono font-medium">
              {isBalanced ? '✓ Balanced' : '⚠ Mismatch'}
            </Badge>
          )}
        </div>

        {/* GST Mode Segmented Control */}
        <div className="inline-flex rounded-lg bg-background/80 p-0.5 border border-border text-xs">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleModeChange('intra')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium text-xs ${gstMode === 'intra' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Intra-State (CGST + SGST)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleModeChange('inter')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium text-xs ${gstMode === 'inter' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Inter-State (IGST)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Place of Supply */}
        <div>
          <label className="text-[11px] text-muted-foreground font-medium block mb-1">
            Place of Supply (POS)
          </label>
          <select
            disabled={disabled}
            value={form.placeOfSupply || ''}
            onChange={(e) => onChange({ placeOfSupply: e.target.value })}
            className="w-full h-9 bg-background border border-border text-foreground text-xs rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select State / UT...</option>
            {INDIAN_STATES.map(s => (
              <option key={s.code} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {gstMode === 'intra' ? (
          <>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                CGST (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                disabled={disabled}
                value={form.cgstAmount ?? ''}
                onChange={(e) => handleCgstChange(e.target.value)}
                placeholder="0.00"
                className="bg-background border-border text-xs font-mono rounded-lg h-9"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                SGST (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                disabled={disabled}
                value={form.sgstAmount ?? ''}
                onChange={(e) => handleSgstChange(e.target.value)}
                placeholder="0.00"
                className="bg-background border-border text-xs font-mono rounded-lg h-9"
              />
            </div>
          </>
        ) : (
          <div className="md:col-span-2">
            <label className="text-[11px] text-muted-foreground font-medium block mb-1">
              IGST Amount (₹)
            </label>
            <Input
              type="number"
              step="0.01"
              disabled={disabled}
              value={form.igstAmount ?? ''}
              onChange={(e) => handleIgstChange(e.target.value)}
              placeholder="0.00"
              className="bg-background border-border text-xs font-mono rounded-lg h-9"
            />
          </div>
        )}
      </div>
    </div>
  );
}
