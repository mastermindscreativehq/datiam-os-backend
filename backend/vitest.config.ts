import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/modules/commercial-intelligence/**/*.ts'],
      exclude: ['src/modules/commercial-intelligence/__tests__/**'],
      thresholds: {
        lines: 80,
        branches: 80,
      },
    },
  },
});
