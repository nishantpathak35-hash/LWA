import { describe, expect, it } from 'vitest';
import { 
  getGoogleAccessToken, 
  testDriveFolderAccess, 
  uploadBackupToGoogleDrive 
} from '../../app/lib/google-drive.js';

describe('Google Drive Helper Module', () => {
  it('validates required credentials for access token exchange', async () => {
    await expect(
      getGoogleAccessToken({ clientEmail: '', privateKey: '' })
    ).rejects.toThrow(/email and private key are required/i);
  });

  it('validates folderId requirement for folder access test', async () => {
    await expect(
      testDriveFolderAccess({ clientEmail: 'test@example.com', privateKey: 'dummy', folderId: '' })
    ).rejects.toThrow(/Folder ID is required/i);
  });

  it('validates folderId requirement for backup upload', async () => {
    await expect(
      uploadBackupToGoogleDrive({
        clientEmail: 'test@example.com',
        privateKey: 'dummy',
        folderId: '',
        fileName: 'test.json',
        fileContent: {}
      })
    ).rejects.toThrow(/Target Google Drive Folder ID is required/i);
  });
});
