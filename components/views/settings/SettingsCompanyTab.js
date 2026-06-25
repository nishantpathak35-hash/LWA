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
    <Card className="bg-slate-950/40 border-slate-900">
      <CardHeader>
        <CardTitle className="text-gold font-medium">Company Profile & Invoice Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSaveCompany} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-light">Registered Company Name</label>
              <Input
                placeholder="e.g. LUXEWORX ATELIER INTERIOR PRIVATE LIMITED"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-light">GSTIN</label>
              <Input
                placeholder="e.g. 06AAGCL1112M1ZP"
                value={companyGstin}
                onChange={e => setCompanyGstin(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs text-slate-400 font-light">Registered Office Address</label>
              <textarea
                className="w-full px-3.5 py-2 bg-white dark:bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all duration-200"
                rows={4}
                placeholder="8th Floor, Magnum Towers-1&#10;Golf Course Ext Rd&#10;Gurugram Haryana 122001"
                value={companyAddress}
                onChange={e => setCompanyAddress(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs text-slate-400 font-light">Company Logo (Base64 data URI)</label>
              <textarea
                className="w-full px-3.5 py-2 bg-white dark:bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all duration-200 font-mono text-xs"
                rows={6}
                placeholder="data:image/png;base64,..."
                value={companyLogo}
                onChange={e => setCompanyLogo(e.target.value)}
              />
              {companyLogo && (
                <div className="mt-3 p-3 border border-border rounded-lg bg-slate-900/10 max-w-xs">
                  <span className="text-[10px] text-slate-400 block mb-1">Logo Preview:</span>
                  <img src={companyLogo} alt="Preview" className="h-12 w-auto object-contain bg-white p-1 rounded" />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-900">
            <Button type="submit" variant="primary" disabled={savingCompany}>
              {savingCompany ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
