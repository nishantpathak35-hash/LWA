import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config.mjs';

describe('Next.js security headers', () => {
  it('applies baseline security headers to all application routes', async () => {
    expect(typeof nextConfig.headers).toBe('function');

    const rules = await nextConfig.headers();
    const catchAll = rules.find(rule => rule.source === '/:path*');
    expect(catchAll).toBeDefined();

    const headers = Object.fromEntries(catchAll.headers.map(header => [header.key, header.value]));
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
  });
});
