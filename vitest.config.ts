import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  envDir: false,
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['tests/unit/live_*.test.ts', 'tests/unit/verify_vendor_integrity.test.ts', 'tests/unit/poEligibility.test.js'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
