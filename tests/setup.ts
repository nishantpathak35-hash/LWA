import { vi } from 'vitest';

// Unit tests must never initialize a live database or external transport.
vi.mock('@libsql/client', () => ({ createClient: () => { throw new Error('Live database transport is disabled in unit tests'); } }));
vi.mock('../app/lib/db.js', () => ({
  queryAll: vi.fn(async () => { throw new Error('Mock queryAll explicitly in this test'); }),
  queryGet: vi.fn(async () => { throw new Error('Mock queryGet explicitly in this test'); }),
  queryRun: vi.fn(async () => { throw new Error('Mock queryRun explicitly in this test'); }),
  queryBatch: vi.fn(async () => { throw new Error('Mock queryBatch explicitly in this test'); }),
}));
vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('External network calls are disabled in unit tests'); }));
