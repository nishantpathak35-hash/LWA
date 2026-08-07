import { describe, it, expect } from 'vitest';
import { sanitizeEmail, normalizeEmailList } from '../../app/lib/email.js';

describe('email sanitization and normalization', () => {
  it('sanitizes single valid email addresses', () => {
    expect(sanitizeEmail('  Accounts@LuxeWorx.com ')).toBe('accounts@luxeworx.com');
    expect(sanitizeEmail('invalid-email')).toBeNull();
    expect(sanitizeEmail('@domain.com')).toBeNull();
    expect(sanitizeEmail('')).toBeNull();
    expect(sanitizeEmail(null)).toBeNull();
  });

  it('normalizes string with comma or semicolon separated emails', () => {
    const raw = 'accounts@luxeworx.com, finance@luxeworx.com; director@luxeworx.com';
    expect(normalizeEmailList(raw)).toEqual([
      'accounts@luxeworx.com',
      'finance@luxeworx.com',
      'director@luxeworx.com'
    ]);
  });

  it('normalizes array with mixed/invalid/comma-separated strings', () => {
    const raw = [' accounts@luxeworx.com, finance@luxeworx.com ', 'invalid-email', '@', 'director@luxeworx.com'];
    expect(normalizeEmailList(raw)).toEqual([
      'accounts@luxeworx.com',
      'finance@luxeworx.com',
      'director@luxeworx.com'
    ]);
  });

  it('handles JSON string stored in DB app_settings', () => {
    const jsonStr = JSON.stringify(['admin@company.com', 'finance@company.com, ceo@company.com']);
    expect(normalizeEmailList(jsonStr)).toEqual([
      'admin@company.com',
      'finance@company.com',
      'ceo@company.com'
    ]);
  });

  it('handles objects with email field inside array', () => {
    const list = [{ email: ' user1@test.com ' }, { email: 'user2@test.com' }];
    expect(normalizeEmailList(list)).toEqual([
      'user1@test.com',
      'user2@test.com'
    ]);
  });
});
