import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../ui/core';
import { Plus, ShieldAlert, Layers } from 'lucide-react';

export default function SettingsSystemTab({
  activeTab,
  
  // System props
  poPrefix, setPoPrefix, handleSavePOPrefix,
  handleClearServerCache, handleReloadAll,
  
  // Legacy Correction props
  legacyPONo, setLegacyPONo, legacyPO,
  legacyNewPaid, setLegacyNewPaid,
  legacyReason, setLegacyReason,
  legacySubmitting,
  handleSearchLegacyPO, handleCorrectLegacyPO,
  
  // Project Merger props
  mergeTargetProject, setMergeTargetProject,
  mergeSourceProjects, setMergeSourceProjects,
  mergeSubmitting, handleMergeProjects
}) {
  return (
    <>
      {/* System Utilities */}
      {activeTab === 'system' && (
        <Card className="bg-card border-border shadow-xs rounded-xl">
          <CardHeader className="p-6 border-b border-border">
            <CardTitle className="text-amber-700 dark:text-gold font-bold text-sm uppercase tracking-wider">System Utilities</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="font-bold text-sm text-foreground">PO Number Series Prefix</div>
              <div className="text-xs text-muted-foreground">
                Specify a custom prefix series to generate PO numbers (e.g., <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">LA/2627/</code>). Leave blank to use default Financial Year prefix.
              </div>
              <div className="flex gap-4 items-center pt-1">
                <Input
                  className="max-w-xs bg-background text-foreground text-xs"
                  placeholder="LA/2627/"
                  value={poPrefix}
                  onChange={e => setPoPrefix(e.target.value)}
                />
                <Button size="sm" variant="primary" onClick={handleSavePOPrefix} className="text-xs">
                  Save Prefix
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-sm text-foreground">Clear Server Cache</div>
                <div className="text-xs text-muted-foreground">
                  Clears all cached data (vendors, KPIs, master data, POs). Use this if vendors or projects are not showing up in forms.
                </div>
              </div>
              <Button size="sm" variant="primary" onClick={handleClearServerCache} className="text-xs">
                Clear Cache
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-sm text-foreground">Reload All Data</div>
                <div className="text-xs text-muted-foreground">
                  Clears cache and reloads vendors, projects, KPIs and master data from database.
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={handleReloadAll} className="text-xs text-slate-700 dark:text-slate-300">
                Reload All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy Correction */}
      {activeTab === 'legacy_correction' && (
        <div className="space-y-6">
          <Card className="bg-card border-amber-500/30 shadow-xs rounded-xl">
            <CardHeader className="p-6 border-b border-border">
              <CardTitle className="text-amber-700 dark:text-amber-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Legacy PO Payment Correction
              </CardTitle>
              <p className="text-xs text-muted-foreground font-light mt-1">
                Admin utility to correct miscalculated legacy paid amounts on purchase orders. All actions are strictly audited.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <form onSubmit={handleSearchLegacyPO} className="flex gap-3 max-w-md">
                <Input
                  required
                  placeholder="Enter PO Number..."
                  value={legacyPONo}
                  onChange={e => setLegacyPONo(e.target.value)}
                  className="bg-background text-foreground text-xs"
                />
                <Button type="submit" variant="primary" disabled={legacySubmitting} className="text-xs">
                  {legacySubmitting ? 'Searching...' : 'Lookup PO'}
                </Button>
              </form>

              {legacyPO && (
                <div className="p-5 bg-muted/30 border border-border rounded-xl space-y-5 animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-border">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">PO Number</div>
                      <div className="font-mono text-sm text-gold font-bold">{legacyPO.po_no}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Project</div>
                      <div className="text-xs font-semibold text-foreground">{legacyPO.project || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Vendor</div>
                      <div className="text-xs font-semibold text-foreground">{legacyPO.vendor_name || legacyPO.vendor || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total PO Value</div>
                      <div className="text-xs text-foreground font-bold">
                        ₹{Number(legacyPO.revised_po_value || legacyPO.po_value || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-1 font-semibold">Current Logged Paid Amount</div>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 font-serif">
                          ₹{Number(legacyPO.legacy_paid || 0).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">New Paid Amount Override (₹)</label>
                        <Input
                          type="number"
                          value={legacyNewPaid}
                          onChange={e => setLegacyNewPaid(e.target.value)}
                          className="bg-background text-foreground text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Reason for Correction (Required for Audit)</label>
                        <Input
                          type="text"
                          required
                          placeholder="e.g. Fixing legacy double counting issue"
                          value={legacyReason}
                          onChange={e => setLegacyReason(e.target.value)}
                          className="bg-background text-foreground text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-end space-y-3 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                      <div className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed mb-2">
                        <strong>Auto-Recalculate:</strong> Safely derives paid amount based on manual system payments and remitted PRs (Gross = Vendor Paid + TDS).
                        <br/><br/>
                        <strong>Manual Update:</strong> Forces exact amount specified in input box.
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => handleCorrectLegacyPO(true)}
                        disabled={legacySubmitting || !legacyReason.trim()}
                        className="w-full text-xs"
                      >
                        Auto-Recalculate from Ledger
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleCorrectLegacyPO(false)}
                        disabled={legacySubmitting || !legacyReason.trim() || legacyNewPaid === ''}
                        className="w-full text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      >
                        Force Manual Update
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Merger Tab */}
      {activeTab === 'project_merger' && (
        <div className="space-y-6">
          <Card className="bg-card border-red-500/30 shadow-xs rounded-xl">
            <CardHeader className="p-6 border-b border-border">
              <CardTitle className="text-red-600 dark:text-red-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-600 dark:text-red-400" /> Project Merger Utility
              </CardTitle>
              <p className="text-xs text-muted-foreground font-light mt-1">
                Admin utility to securely merge duplicate projects into a single target project without orphaning Purchase Orders or Payment Requests. All financials are summed and source projects are deleted.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Target Project (The project to KEEP)</label>
                  <Input
                    placeholder="e.g. COOFFIZ NOIDA"
                    value={mergeTargetProject}
                    onChange={e => setMergeTargetProject(e.target.value)}
                    className="bg-background text-foreground text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Source Projects (The duplicates to MERGE and DELETE)</label>
                  <Input
                    placeholder="e.g. Cooffiz Noida, Co-offiz Noida, COOFFIZ"
                    value={mergeSourceProjects}
                    onChange={e => setMergeSourceProjects(e.target.value)}
                    className="bg-background text-foreground text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Separate multiple source projects with commas.</p>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <Button 
                    variant="primary" 
                    className="w-full bg-red-600 hover:bg-red-500 text-white border-none text-xs font-bold"
                    onClick={handleMergeProjects}
                    disabled={mergeSubmitting || !mergeTargetProject.trim() || !mergeSourceProjects.trim()}
                  >
                    {mergeSubmitting ? 'Merging Projects...' : 'Merge Projects Now'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
