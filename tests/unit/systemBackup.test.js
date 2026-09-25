import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as db from '../../app/lib/db.js';
import { 
  createDatabaseBackup, 
  getSystemHealthAndDiagnostics, 
  getGoogleDriveConfig, 
  saveGoogleDriveConfig,
  performAutoBackupToGoogleDrive 
} from '../../app/lib/api/system.js';

describe('System Database Backup & Health Diagnostics', () => {
  let inMemorySettings = {};

  beforeEach(() => {
    inMemorySettings = {};
    vi.mocked(db.queryAll).mockResolvedValue([]);
    vi.mocked(db.queryGet).mockImplementation(async (sql) => {
      if (sql.includes('WHERE key =')) {
        const match = sql.match(/key = '([^']+)'/);
        const key = match ? match[1] : '';
        return inMemorySettings[key] ? { value: inMemorySettings[key], updated_at: new Date().toISOString() } : null;
      }
      return { cnt: 0 };
    });
    vi.mocked(db.queryRun).mockImplementation(async (sql, params) => {
      if (sql.includes('gdrive_backup_config')) {
        inMemorySettings['gdrive_backup_config'] = params[0];
      } else if (sql.includes('last_gdrive_backup')) {
        inMemorySettings['last_gdrive_backup'] = params[0];
      } else if (sql.includes('last_backup_meta')) {
        inMemorySettings['last_backup_meta'] = params[0];
      }
      return { rowsAffected: 1 };
    });
  });

  it('creates database backup snapshot with SHA256 checksum and metadata', async () => {
    const backup = await createDatabaseBackup('test-admin@luxeworx.com');

    expect(backup).toBeDefined();
    expect(backup.meta).toBeDefined();
    expect(backup.meta.system).toBe('LWA Payment Tracking System');
    expect(backup.meta.exportedBy).toBe('test-admin@luxeworx.com');
    expect(backup.meta.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(backup.meta.totalTables).toBeGreaterThan(0);
    expect(backup.data).toBeDefined();
    expect(typeof backup.data).toBe('object');
  });

  it('fails backup when any required table cannot be read', async () => {
    vi.mocked(db.queryAll).mockImplementation(async (sql) => {
      if (String(sql).includes('attachments')) throw new Error('table missing');
      return [];
    });

    await expect(createDatabaseBackup('test-admin@luxeworx.com'))
      .rejects.toThrow(/Backup failed for table "attachments"/);
  });

  it('runs system health and relational integrity diagnostics', async () => {
    const health = await getSystemHealthAndDiagnostics('test-admin@luxeworx.com');

    expect(health).toBeDefined();
    expect(['healthy', 'attention']).toContain(health.status);
    expect(typeof health.latencyMs).toBe('number');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    expect(health.integrity).toBeDefined();
    expect(typeof health.integrity.orphanedPRs).toBe('number');
    expect(typeof health.integrity.orphanedPOItems).toBe('number');
    expect(typeof health.integrity.unmappedInvoices).toBe('number');
  });

  it('manages Google Drive backup configuration in app_settings', async () => {
    const testConfig = {
      clientEmail: 'test-backup@project.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...fake...key\n-----END PRIVATE KEY-----',
      folderId: 'folder_abc123',
      enabled: false
    };

    const saveResult = await saveGoogleDriveConfig(testConfig, 'test-admin@luxeworx.com');
    expect(saveResult.success).toBe(true);

    const config = await getGoogleDriveConfig();
    expect(config.clientEmail).toBe(testConfig.clientEmail);
    expect(config.folderId).toBe(testConfig.folderId);
    expect(config.enabled).toBe(false);
    expect(config.hasPrivateKey).toBe(true);
  });

  it('cron backup skips cleanly when enabled is false', async () => {
    const result = await performAutoBackupToGoogleDrive('cron');
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('disabled');
  });

  it('manual backup throws descriptive error when credentials are incomplete', async () => {
    await expect(
      performAutoBackupToGoogleDrive('manual', { clientEmail: '', privateKey: '', folderId: '' })
    ).rejects.toThrow(/not fully configured/i);
  });
});
