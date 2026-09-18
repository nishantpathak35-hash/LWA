import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '../../ui/core';
import { 
  ShieldAlert, 
  Database, 
  Cloud, 
  CloudUpload, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Key, 
  Eye, 
  EyeOff, 
  HelpCircle,
  Activity,
  HardDrive
} from 'lucide-react';

export default function SettingsSystemTab({
  activeTab,
  
  // System props
  poPrefix, setPoPrefix, handleSavePOPrefix,
  handleClearServerCache, handleReloadAll,
  controlPolicies, setControlPolicies, handleSaveControlPolicies, savingControlPolicies,
  
  // Google Drive Cloud Backup props
  gdriveConfig,
  gdriveForm, setGDriveForm,
  gdriveSaving, handleSaveGDriveConfig,
  gdriveTesting, handleTestGDriveConnection,
  gdriveBackingUp, handleBackupToGDriveNow,

  // Local Snapshot & Diagnostics props
  backupDownloading, handleDownloadLocalBackup,
  systemHealth, diagnosticsLoading, handleRunDiagnostics,
  
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
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      {/* System & Cloud Backup Utilities */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-fade-in">

          {/* 1. Google Drive Automated Daily Backup */}
          <Card className="bg-card border-border shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="p-6 border-b border-border flex flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground font-semibold text-base">Google Drive Cloud Backup</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Automated daily database snapshot storage to your private Google Drive folder via Service Account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {gdriveConfig?.isConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Setup Required
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Daily Schedule Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2.5 text-xs text-foreground">
                  <span className="font-semibold">Cron Schedule:</span>
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px] text-muted-foreground">0 2 * * *</span>
                  <span className="text-muted-foreground">(Daily at 02:00 AM UTC / 07:30 AM IST)</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground select-none">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    checked={Boolean(gdriveForm?.enabled)}
                    onChange={e => setGDriveForm?.(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span>Enable Daily Auto-Backup</span>
                </label>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Google Service Account Email</span>
                    <span className="text-[10px] text-muted-foreground">Client Email</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="pts-backup-sa@project-id.iam.gserviceaccount.com"
                    value={gdriveForm?.clientEmail || ''}
                    onChange={e => setGDriveForm?.(prev => ({ ...prev, clientEmail: e.target.value }))}
                    className="bg-background text-foreground text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Google Drive Folder ID</span>
                    {gdriveForm?.folderId && (
                      <a
                        href={`https://drive.google.com/drive/folders/${gdriveForm.folderId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Open Folder <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 1a2B3c4D5e6F7g8H9i0J..."
                    value={gdriveForm?.folderId || ''}
                    onChange={e => setGDriveForm?.(prev => ({ ...prev, folderId: e.target.value }))}
                    className="bg-background text-foreground text-xs font-mono"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Service Account Private Key (RSA PEM)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                    >
                      {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showPrivateKey ? 'Hide Key' : 'Reveal Key'}
                    </button>
                  </div>
                  <textarea
                    rows={showPrivateKey ? 5 : 2}
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...&#10;-----END PRIVATE KEY-----"
                    value={gdriveForm?.privateKey || ''}
                    onChange={e => setGDriveForm?.(prev => ({ ...prev, privateKey: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs resize-none"
                    spellCheck={false}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Stored securely. Never shared with third parties. Used only to sign JWT assertion for server-to-server upload.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {showGuide ? 'Hide Setup Guide' : 'How to set up Google Drive (3 minutes)'}
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestGDriveConnection}
                    disabled={gdriveTesting || !gdriveForm?.folderId}
                    className="text-xs"
                  >
                    {gdriveTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Testing Folder...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveGDriveConfig}
                    disabled={gdriveSaving}
                    className="text-xs"
                  >
                    {gdriveSaving ? 'Saving...' : 'Save Settings'}
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleBackupToGDriveNow}
                    disabled={gdriveBackingUp}
                    className="text-xs"
                  >
                    {gdriveBackingUp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Backing up to Drive...
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-3.5 h-3.5 mr-1.5" />
                        Backup to Drive Now
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Setup Guide Accordion */}
              {showGuide && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3 text-xs animate-fade-in">
                  <div className="font-semibold text-foreground">3-Step Google Cloud & Drive Setup:</div>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground leading-relaxed">
                    <li>
                      <strong className="text-foreground">Google Cloud Console:</strong> Open Google Cloud Console, enable <code className="font-mono bg-muted px-1 rounded text-foreground">Google Drive API</code>, create a Service Account, and click <em>Keys &rarr; Add Key &rarr; JSON</em>.
                    </li>
                    <li>
                      <strong className="text-foreground">Create Google Drive Folder:</strong> Open your Google Drive, create a folder (e.g. <code className="font-mono bg-muted px-1 rounded text-foreground">LWA Backups</code>), and copy the folder ID from the URL (e.g. <code className="font-mono bg-muted px-1 rounded text-foreground">folders/1a2b3c...</code>).
                    </li>
                    <li>
                      <strong className="text-foreground">Share Folder:</strong> Share that Drive folder with your Service Account email (from step 1) with <strong>Editor</strong> permission. Paste the Service Account Email, Private Key, and Folder ID above and click <em>Save Settings</em>.
                    </li>
                  </ol>
                </div>
              )}

              {/* Last Google Drive Backup Audit Card */}
              {gdriveConfig?.lastBackup && (
                <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Last Cloud Backup to Google Drive
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(gdriveConfig.lastBackup.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">File Name</div>
                      <div className="font-mono text-foreground truncate">{gdriveConfig.lastBackup.fileName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Total Records</div>
                      <div className="font-semibold text-foreground">
                        {Number(gdriveConfig.lastBackup.totalRecords || 0).toLocaleString()} across {gdriveConfig.lastBackup.totalTables || 17} tables
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Trigger Source</div>
                      <div className="text-foreground capitalize">{gdriveConfig.lastBackup.source || 'cron'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Drive Link</div>
                      {gdriveConfig.lastBackup.webViewLink ? (
                        <a
                          href={gdriveConfig.lastBackup.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          View File <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-mono text-muted-foreground">{gdriveConfig.lastBackup.fileId || 'Uploaded'}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Database Snapshot & Local Download */}
          <Card className="bg-card border-border shadow-xs rounded-xl">
            <CardHeader className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-foreground font-semibold text-base">Full Database Snapshot (.json)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Export an offline, encrypted SHA-256 verifiable JSON bundle of all 17 core business tables for local storage or disaster recovery.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-foreground">On-Demand Offline Backup</div>
                  <div className="text-xs text-muted-foreground">
                    Includes Purchase Orders, Payments, Invoices, TDS records, Users, Approval Workflows, and Audit Logs.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleDownloadLocalBackup}
                  disabled={backupDownloading}
                  className="text-xs shrink-0"
                >
                  {backupDownloading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Bundling Snapshot...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download Snapshot (.json)
                    </>
                  )}
                </Button>
              </div>

              {systemHealth?.lastBackup && (
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-4 px-1">
                  <span>Last downloaded: <strong className="text-foreground">{new Date(systemHealth.lastBackup.timestamp).toLocaleString()}</strong></span>
                  <span>Records: <strong className="text-foreground">{systemHealth.lastBackup.totalRecords?.toLocaleString()}</strong></span>
                  <span className="font-mono text-[11px] truncate max-w-xs">{systemHealth.lastBackup.checksum}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Database Health & Integrity Diagnostics */}
          <Card className="bg-card border-border shadow-xs rounded-xl">
            <CardHeader className="p-6 border-b border-border flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-foreground font-semibold text-base">Database Health & Integrity Diagnostics</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live Turso Cloud distributed SQLite latency and relational integrity check.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunDiagnostics}
                disabled={diagnosticsLoading}
                className="text-xs"
              >
                {diagnosticsLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Run Diagnostic Scan
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {systemHealth ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Status</div>
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                        {systemHealth.status === 'healthy' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Healthy
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Attention Needed
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Cloud Latency</div>
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {systemHealth.latencyMs} ms
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Total Table Rows</div>
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {systemHealth.totalRows?.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Orphaned Records</div>
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {systemHealth.integrity?.orphanedPRs + systemHealth.integrity?.orphanedPOItems + systemHealth.integrity?.unmappedInvoices === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">0 (Clean)</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            {systemHealth.integrity?.orphanedPRs + systemHealth.integrity?.orphanedPOItems + systemHealth.integrity?.unmappedInvoices} detected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Integrity Table */}
                  <div className="p-3.5 rounded-lg bg-muted/20 border border-border space-y-2 text-xs">
                    <div className="font-semibold text-foreground">Relational Integrity Check Breakdown:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-muted-foreground">
                      <div>Payment Requests without valid PO: <strong className="text-foreground">{systemHealth.integrity?.orphanedPRs || 0}</strong></div>
                      <div>PO Line Items without valid PO: <strong className="text-foreground">{systemHealth.integrity?.orphanedPOItems || 0}</strong></div>
                      <div>Invoices without valid PO: <strong className="text-foreground">{systemHealth.integrity?.unmappedInvoices || 0}</strong></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4">
                  Click &ldquo;Run Diagnostic Scan&rdquo; to test database connection and verify relational integrity.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. General System Utilities */}
          <Card className="bg-card border-border shadow-xs rounded-xl">
            <CardHeader className="p-6 border-b border-border">
              <CardTitle className="text-foreground font-semibold text-base">General System Utilities</CardTitle>
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

              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-4">
                <div>
                  <div className="font-bold text-sm text-foreground">ERP Control Policies</div>
                  <div className="text-xs text-muted-foreground">Control the safeguards used during payment processing and approvals.</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['show_payment_attention', 'Show Needs Attention panel in Payments'],
                    ['block_payment_over_po_balance', 'Block payment above PO balance'],
                    ['require_supporting_document', 'Require supporting document'],
                    ['allow_payment_holds', 'Allow payment holds / queries'],
                    ['overdue_approval_alerts', 'Show overdue approval alerts'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 text-xs text-foreground cursor-pointer">
                      <input type="checkbox" checked={Boolean(controlPolicies?.[key])} onChange={e => setControlPolicies(p => ({ ...p, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3 max-w-sm">
                  <label className="text-xs text-foreground flex-1">Approval SLA (days)</label>
                  <Input type="number" min="1" max="30" value={controlPolicies?.approval_sla_days || 3} onChange={e => setControlPolicies(p => ({ ...p, approval_sla_days: e.target.value }))} className="w-24 bg-background text-foreground text-xs" />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="primary" onClick={handleSaveControlPolicies} disabled={savingControlPolicies} className="text-xs">
                    {savingControlPolicies ? 'Saving...' : 'Save Control Policies'}
                  </Button>
                </div>
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
        </div>
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
                      <div className="font-mono text-sm text-primary font-bold">{legacyPO.po_no}</div>
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
                          placeholder="e.g. Reconciliation against audited bank statement"
                          value={legacyReason}
                          onChange={e => setLegacyReason(e.target.value)}
                          className="bg-background text-foreground text-xs"
                        />
                      </div>
                      <Button
                        variant="primary"
                        onClick={handleCorrectLegacyPO}
                        disabled={legacySubmitting || !legacyNewPaid || !legacyReason}
                        className="text-xs"
                      >
                        {legacySubmitting ? 'Updating...' : 'Apply Correction & Log Audit'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Merger */}
      {activeTab === 'project_merger' && (
        <Card className="bg-card border-border shadow-xs rounded-xl">
          <CardHeader className="p-6 border-b border-border">
            <CardTitle className="text-foreground font-bold text-sm uppercase tracking-wider">Project Merger Utility</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Merge duplicate projects into a canonical project. All POs, invoices, and payment requests will be re-assigned.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Target Canonical Project Name</label>
                <Input
                  placeholder="e.g. Grand Hyatt Villa"
                  value={mergeTargetProject}
                  onChange={e => setMergeTargetProject(e.target.value)}
                  className="bg-background text-foreground text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Source Projects to Merge (comma-separated)</label>
                <Input
                  placeholder="e.g. Hyatt, Grand Hyatt, GH Villa"
                  value={mergeSourceProjects}
                  onChange={e => setMergeSourceProjects(e.target.value)}
                  className="bg-background text-foreground text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleMergeProjects}
                disabled={mergeSubmitting || !mergeTargetProject || !mergeSourceProjects}
                className="text-xs"
              >
                {mergeSubmitting ? 'Merging Projects...' : 'Merge Projects'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
