import { queryAll, queryGet, queryRun } from '../db.js';
import { logAudit } from './core.js';
import { testDriveFolderAccess, uploadBackupToGoogleDrive } from '../google-drive.js';
import crypto from 'node:crypto';

const CORE_TABLES = [
  'vendors',
  'purchase_orders',
  'po_items',
  'payment_requests',
  'system_payments',
  'manual_payments',
  'invoices',
  'users',
  'audit_logs',
  'project_financials',
  'tds_sections',
  'approval_workflows',
  'approval_workflow_stages',
  'number_series',
  'app_settings',
  'clients',
  'item_master'
];

/**
 * Creates a complete database snapshot of all primary business tables.
 * Returns metadata and bundled table records.
 */
export async function createDatabaseBackup(userEmail = 'admin@luxeworx.com') {
  const backupData = {};
  const tableCounts = {};
  let totalRecords = 0;

  for (const table of CORE_TABLES) {
    try {
      const rows = await queryAll(`SELECT * FROM ${table}`);
      backupData[table] = rows || [];
      tableCounts[table] = (rows || []).length;
      totalRecords += (rows || []).length;
    } catch (err) {
      console.warn(`Backup: skipped or failed table "${table}":`, err.message);
      backupData[table] = [];
      tableCounts[table] = 0;
    }
  }

  const timestamp = new Date().toISOString();
  const rawPayload = JSON.stringify(backupData);
  const checksum = crypto.createHash('sha256').update(rawPayload).digest('hex');

  const meta = {
    system: 'LWA Payment Tracking System',
    version: '2.0.0',
    timestamp,
    exportedBy: userEmail,
    totalTables: Object.keys(backupData).length,
    totalRecords,
    tableCounts,
    checksum: `sha256:${checksum}`
  };

  // Record audit log
  try {
    await logAudit(
      userEmail,
      'System Backup',
      `Exported database snapshot: ${totalRecords} records across ${meta.totalTables} tables`,
      'System'
    );
  } catch (e) {
    console.error('Failed to log backup audit:', e);
  }

  // Store last backup metadata in app_settings
  try {
    await queryRun(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('last_backup_meta', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(meta), timestamp]
    );
  } catch (e) {
    console.warn('Failed to update last_backup_meta in app_settings:', e);
  }

  return {
    meta,
    data: backupData
  };
}

/**
 * Performs live database health check, table record metrics,
 * and integrity diagnostics (detects orphaned payment requests, orphaned PO items, unmapped invoices).
 */
export async function getSystemHealthAndDiagnostics(userEmail = 'admin@luxeworx.com') {
  const startTime = Date.now();
  const tableMetrics = {};
  let totalRows = 0;

  for (const table of CORE_TABLES) {
    try {
      const res = await queryGet(`SELECT COUNT(*) as cnt FROM ${table}`);
      const count = Number(res?.cnt || 0);
      tableMetrics[table] = count;
      totalRows += count;
    } catch {
      tableMetrics[table] = 0;
    }
  }

  // Integrity checks
  let orphanedPRs = 0;
  try {
    const prRes = await queryGet(`
      SELECT COUNT(*) as cnt
      FROM payment_requests pr
      WHERE pr.po_no IS NOT NULL 
        AND pr.po_no != '' 
        AND pr.po_no NOT IN (SELECT po_no FROM purchase_orders)
    `);
    orphanedPRs = Number(prRes?.cnt || 0);
  } catch {
    orphanedPRs = 0;
  }

  let orphanedPOItems = 0;
  try {
    const itemsRes = await queryGet(`
      SELECT COUNT(*) as cnt
      FROM po_items pi
      WHERE pi.po_no IS NOT NULL
        AND pi.po_no != ''
        AND pi.po_no NOT IN (SELECT po_no FROM purchase_orders)
    `);
    orphanedPOItems = Number(itemsRes?.cnt || 0);
  } catch {
    orphanedPOItems = 0;
  }

  let unmappedInvoices = 0;
  try {
    const invRes = await queryGet(`
      SELECT COUNT(*) as cnt
      FROM invoices i
      WHERE i.po_no IS NOT NULL
        AND i.po_no != ''
        AND i.po_no NOT IN (SELECT po_no FROM purchase_orders)
    `);
    unmappedInvoices = Number(invRes?.cnt || 0);
  } catch {
    unmappedInvoices = 0;
  }

  let lastBackup = null;
  try {
    const settingRes = await queryGet(`SELECT value, updated_at FROM app_settings WHERE key = 'last_backup_meta'`);
    if (settingRes?.value) {
      lastBackup = JSON.parse(settingRes.value);
    }
  } catch {
    lastBackup = null;
  }

  const latencyMs = Date.now() - startTime;
  const isClean = orphanedPRs === 0 && orphanedPOItems === 0 && unmappedInvoices === 0;

  return {
    status: isClean ? 'healthy' : 'attention',
    latencyMs,
    totalRows,
    tableMetrics,
    integrity: {
      orphanedPRs,
      orphanedPOItems,
      unmappedInvoices,
      isClean
    },
    lastBackup
  };
}

/**
 * Resolves Google Drive backup configuration from app_settings and process.env.
 */
async function resolveDriveCredentials() {
  let stored = {};
  try {
    const row = await queryGet(`SELECT value FROM app_settings WHERE key = 'gdrive_backup_config'`);
    if (row?.value) {
      stored = JSON.parse(row.value);
    }
  } catch (e) {
    console.warn('Failed to read gdrive_backup_config:', e);
  }

  const clientEmail = (stored.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKey = (stored.privateKey || process.env.GOOGLE_PRIVATE_KEY || '').trim();
  const folderId = (stored.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
  const enabled = stored.enabled !== undefined 
    ? Boolean(stored.enabled) 
    : (process.env.GOOGLE_DRIVE_AUTO_BACKUP_ENABLED === 'true' || process.env.GOOGLE_DRIVE_AUTO_BACKUP_ENABLED === '1');

  return {
    clientEmail,
    privateKey,
    folderId,
    enabled
  };
}

/**
 * Gets Google Drive backup configuration and last backup status for UI display.
 * Masks sensitive private key.
 */
export async function getGoogleDriveConfig() {
  const creds = await resolveDriveCredentials();
  
  let lastBackup = null;
  try {
    const row = await queryGet(`SELECT value FROM app_settings WHERE key = 'last_gdrive_backup'`);
    if (row?.value) {
      lastBackup = JSON.parse(row.value);
    }
  } catch (e) {
    console.warn('Failed to read last_gdrive_backup:', e);
  }

  return {
    clientEmail: creds.clientEmail,
    folderId: creds.folderId,
    enabled: creds.enabled,
    hasPrivateKey: Boolean(creds.privateKey && creds.privateKey.length > 20),
    isConfigured: Boolean(creds.clientEmail && creds.privateKey && creds.folderId),
    lastBackup
  };
}

/**
 * Saves Google Drive backup configuration. Preserves existing private key if masked/not provided.
 */
export async function saveGoogleDriveConfig(newConfig, userEmail = 'admin@luxeworx.com') {
  const existing = await resolveDriveCredentials();

  let finalKey = existing.privateKey;
  if (newConfig.privateKey && !newConfig.privateKey.includes('••••') && newConfig.privateKey.trim().length > 20) {
    finalKey = newConfig.privateKey.trim();
  }

  const configToSave = {
    clientEmail: (newConfig.clientEmail || existing.clientEmail || '').trim(),
    privateKey: finalKey,
    folderId: (newConfig.folderId || existing.folderId || '').trim(),
    enabled: newConfig.enabled !== undefined ? Boolean(newConfig.enabled) : existing.enabled,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail
  };

  await queryRun(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('gdrive_backup_config', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [JSON.stringify(configToSave), configToSave.updatedAt]
  );

  try {
    await logAudit(
      userEmail,
      'Google Drive Config',
      `Updated Google Drive auto-backup settings (enabled: ${configToSave.enabled}, folder: ${configToSave.folderId})`,
      'System'
    );
  } catch (e) {
    console.error('Failed to log audit for gdrive config:', e);
  }

  return {
    success: true,
    message: 'Google Drive backup configuration saved successfully',
    config: {
      clientEmail: configToSave.clientEmail,
      folderId: configToSave.folderId,
      enabled: configToSave.enabled,
      hasPrivateKey: Boolean(finalKey && finalKey.length > 20),
      isConfigured: Boolean(configToSave.clientEmail && finalKey && configToSave.folderId)
    }
  };
}

/**
 * Live test of Google Drive folder access.
 */
export async function testGoogleDriveConnection(customConfig = null) {
  const base = await resolveDriveCredentials();
  const creds = {
    clientEmail: customConfig?.clientEmail || base.clientEmail,
    privateKey: (customConfig?.privateKey && !customConfig.privateKey.includes('••••')) ? customConfig.privateKey : base.privateKey,
    folderId: customConfig?.folderId || base.folderId
  };

  if (!creds.clientEmail) {
    throw new Error('Service Account Email is missing');
  }
  if (!creds.privateKey) {
    throw new Error('Service Account Private Key is missing');
  }
  if (!creds.folderId) {
    throw new Error('Google Drive Folder ID is missing');
  }

  return await testDriveFolderAccess(creds);
}

/**
 * Performs full database snapshot and uploads it directly to Google Drive.
 * Designed to be called by automated cron or manual UI action.
 */
export async function performAutoBackupToGoogleDrive(source = 'cron', customConfig = null) {
  const base = await resolveDriveCredentials();
  const creds = {
    clientEmail: customConfig?.clientEmail || base.clientEmail,
    privateKey: (customConfig?.privateKey && !customConfig.privateKey.includes('••••')) ? customConfig.privateKey : base.privateKey,
    folderId: customConfig?.folderId || base.folderId,
    enabled: base.enabled
  };

  // If automated cron and disabled, skip cleanly
  if (source === 'cron' && !creds.enabled) {
    return {
      skipped: true,
      reason: 'Automated Google Drive backup is currently disabled in settings'
    };
  }

  if (!creds.clientEmail || !creds.privateKey || !creds.folderId) {
    throw new Error('Google Drive credentials (email, private key, folder ID) are not fully configured');
  }

  // 1. Generate full database snapshot
  const triggerUser = source === 'cron' ? 'Automated Daily Cron' : (source || 'admin@luxeworx.com');
  const backup = await createDatabaseBackup(triggerUser);

  // 2. Format filename with date and time
  const d = new Date();
  const dateStr = d.toISOString().split('T')[0];
  const timeStr = d.toISOString().split('T')[1].slice(0, 8).replace(/:/g, '');
  const fileName = `lwa_pts_backup_${dateStr}_${timeStr}.json`;

  // 3. Upload to Google Drive
  const uploadResult = await uploadBackupToGoogleDrive({
    clientEmail: creds.clientEmail,
    privateKey: creds.privateKey,
    folderId: creds.folderId,
    fileName,
    fileContent: backup
  });

  const recordInfo = {
    success: true,
    timestamp: d.toISOString(),
    source,
    fileId: uploadResult.fileId,
    fileName: uploadResult.fileName,
    size: uploadResult.size,
    webViewLink: uploadResult.webViewLink,
    totalRecords: backup.meta.totalRecords,
    totalTables: backup.meta.totalTables,
    checksum: backup.meta.checksum
  };

  // 4. Record status in app_settings
  try {
    await queryRun(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('last_gdrive_backup', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(recordInfo), d.toISOString()]
    );
  } catch (e) {
    console.warn('Failed to update last_gdrive_backup in app_settings:', e);
  }

  // 5. Record audit log
  try {
    await logAudit(
      triggerUser,
      'Google Drive Backup',
      `Auto-backup uploaded to Google Drive: ${fileName} (${backup.meta.totalRecords} records across ${backup.meta.totalTables} tables)`,
      'System'
    );
  } catch (e) {
    console.error('Failed to log Google Drive backup audit:', e);
  }

  return recordInfo;
}
