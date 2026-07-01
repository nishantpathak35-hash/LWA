import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../ui/core';
import { Plus, Loader2 } from 'lucide-react';

function WhatsAppLogin() {
  const [qr, setQr] = React.useState(null);
  const [status, setStatus] = React.useState('offline');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        setQr(data.qr);
        setStatus(data.status);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    const int = setInterval(fetchStatus, 3000);
    return () => clearInterval(int);
  }, []);

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  if (status === 'ready') return <span className="text-emerald-500 font-bold text-sm bg-emerald-950/30 px-3 py-1 rounded border border-emerald-900/50">WhatsApp Connected</span>;
  if (qr) return (
    <div className="flex flex-col items-center gap-2 bg-white p-2 rounded">
      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qr)}`} alt="WhatsApp QR Code" width={150} height={150} />
      <span className="text-[10px] text-slate-900 font-medium">Scan to connect</span>
    </div>
  );
  return <span className="text-amber-500 font-bold text-sm">Bot Offline (run node backend/whatsapp-bot.js)</span>;
}

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
        <Card className="bg-slate-950/40 border-slate-900">
          <CardHeader>
            <CardTitle className="text-gold font-medium">System Utilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-900 space-y-3">
              <div className="font-bold text-slate-200">PO Number Series Prefix</div>
              <div className="text-xs text-slate-400">
                Specify a custom prefix series to generate PO numbers (e.g., <code>LA/2627/</code>). Leave blank to use default Financial Year prefix.
              </div>
              <div className="flex gap-4 items-center">
                <Input
                  className="max-w-xs"
                  placeholder="LA/2627/"
                  value={poPrefix}
                  onChange={e => setPoPrefix(e.target.value)}
                />
                <Button size="sm" variant="primary" onClick={handleSavePOPrefix}>
                  Save Prefix
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-slate-200">Clear Server Cache</div>
                <div className="text-xs text-slate-400">
                  Clears all cached data (vendors, KPIs, master data, POs). Use this if vendors or projects are not showing up in forms.
                </div>
              </div>
              <Button size="sm" variant="primary" onClick={handleClearServerCache}>
                Clear Cache
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-slate-200">Reload All Data</div>
                <div className="text-xs text-slate-400">
                  Clears cache and reloads vendors, projects, KPIs and master data from the spreadsheet.
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={handleReloadAll}>
                Reload All
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-slate-200">WhatsApp Notifications</div>
                <div className="text-xs text-slate-400">
                  Enable or disable WhatsApp notifications for approvals globally. Scan the QR code to link your account.
                </div>
              </div>
              <WhatsAppLogin />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy Correction */}
      {activeTab === 'legacy_correction' && (
        <div className="space-y-6">
          <Card className="bg-slate-950/40 border-amber-900/50">
            <CardHeader className="p-6 border-b border-slate-900/50">
              <CardTitle className="text-amber-500 font-medium flex items-center gap-2">
                ⚠ Legacy PO Payment Correction
              </CardTitle>
              <p className="text-xs text-slate-400 font-light mt-1">
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
                />
                <Button type="submit" variant="primary" disabled={legacySubmitting}>
                  {legacySubmitting ? 'Searching...' : 'Lookup PO'}
                </Button>
              </form>

              {legacyPO && (
                <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-xl space-y-5 animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">PO Number</div>
                      <div className="font-mono text-sm text-gold">{legacyPO.po_no}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Project</div>
                      <div className="text-sm text-slate-200">{legacyPO.project || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Vendor</div>
                      <div className="text-sm text-slate-200">{legacyPO.vendor_name || legacyPO.vendor || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total PO Value</div>
                      <div className="text-sm text-slate-200 font-semibold">
                        ₹{Number(legacyPO.revised_po_value || legacyPO.po_value || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] text-amber-500/80 uppercase tracking-wider mb-1">Current Logged Paid Amount</div>
                        <div className="text-2xl font-light text-amber-500 font-serif">
                          ₹{Number(legacyPO.legacy_paid || 0).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-light">New Paid Amount Override (₹)</label>
                        <Input
                          type="number"
                          value={legacyNewPaid}
                          onChange={e => setLegacyNewPaid(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-light">Reason for Correction (Required for Audit)</label>
                        <Input
                          type="text"
                          required
                          placeholder="e.g. Fixing legacy double counting issue"
                          value={legacyReason}
                          onChange={e => setLegacyReason(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-end space-y-3 bg-amber-950/20 p-4 rounded-lg border border-amber-900/30">
                      <div className="text-xs text-amber-500/80 mb-2">
                        <strong>Auto-Recalculate:</strong> Safely derives the paid amount based on manual system payments and remitted PRs.
                        <br/><br/>
                        <strong>Manual Update:</strong> Forces the exact amount specified in the input box.
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => handleCorrectLegacyPO(true)}
                        disabled={legacySubmitting || !legacyReason.trim()}
                        className="w-full"
                      >
                        Auto-Recalculate from Ledger
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleCorrectLegacyPO(false)}
                        disabled={legacySubmitting || !legacyReason.trim() || legacyNewPaid === ''}
                        className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30"
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
          <Card className="bg-slate-950/40 border-red-900/50">
            <CardHeader className="p-6 border-b border-slate-900/50">
              <CardTitle className="text-red-400 font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" /> Project Merger Utility
              </CardTitle>
              <p className="text-xs text-slate-400 font-light mt-1">
                Admin utility to securely merge duplicate projects into a single target project without orphaning Purchase Orders or Payment Requests. All financials are summed and the source projects are deleted.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-light">Target Project (The project to KEEP)</label>
                  <Input
                    placeholder="e.g. COOFFIZ NOIDA"
                    value={mergeTargetProject}
                    onChange={e => setMergeTargetProject(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-light">Source Projects (The duplicates to MERGE and DELETE)</label>
                  <Input
                    placeholder="e.g. Cooffiz Noida, Co-offiz Noida, COOFFIZ"
                    value={mergeSourceProjects}
                    onChange={e => setMergeSourceProjects(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500">Separate multiple source projects with commas.</p>
                </div>
                
                <div className="pt-4 border-t border-slate-800">
                  <Button 
                    variant="primary" 
                    className="w-full bg-red-600 hover:bg-red-500 text-white border-none"
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
