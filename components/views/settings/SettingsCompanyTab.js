import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../ui/core';

export default function SettingsCompanyTab({
  companyName,
  setCompanyName,
  companyAddress,
  setCompanyAddress,
  companyGstin,
  setCompanyGstin,
  companyLogo,
  setCompanyLogo,
  savingCompany,
  handleSaveCompany
}) {
  return (
    <Card className="bg-card border-border shadow-xs rounded-xl">
      <CardHeader className="p-6 border-b border-border">
        <CardTitle className="text-amber-700 dark:text-gold font-bold text-sm uppercase tracking-wider">Company Profile & Invoice Settings</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSaveCompany} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Registered Company Name</label>
              <Input
                placeholder="e.g. LUXEWORX ATELIER INTERIOR PRIVATE LIMITED"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
                className="bg-background text-foreground text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">GSTIN</label>
              <Input
                placeholder="e.g. 06AAGCL1112M1ZP"
                value={companyGstin}
                onChange={e => setCompanyGstin(e.target.value)}
                required
                className="bg-background text-foreground font-mono text-xs"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Registered Office Address</label>
              <textarea
                className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground/60 text-xs focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all duration-200"
                rows={4}
                placeholder="8th Floor, Magnum Towers-1&#10;Golf Course Ext Rd&#10;Gurugram Haryana 122001"
                value={companyAddress}
                onChange={e => setCompanyAddress(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Company Logo (Base64 data URI)</label>
              <textarea
                className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground/60 text-xs focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all duration-200 font-mono text-xs"
                rows={4}
                placeholder="data:image/png;base64,..."
                value={companyLogo}
                onChange={e => setCompanyLogo(e.target.value)}
              />
              {companyLogo && (
                <div className="mt-3 p-3 border border-border rounded-lg bg-muted/40 max-w-xs">
                  <span className="text-[10px] text-muted-foreground block mb-1">Logo Preview:</span>
                  <img src={companyLogo} alt="Preview" className="h-12 w-auto object-contain bg-white p-1 rounded border border-border" />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" variant="primary" disabled={savingCompany} className="text-xs">
              {savingCompany ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
