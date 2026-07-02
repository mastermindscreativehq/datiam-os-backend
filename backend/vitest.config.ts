import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.test.ts',
      'src/tests/**/*.test.ts',
    ],
    setupFiles: ['src/tests/setup.ts'],
    env: {
      NODE_ENV:          'test',
      JWT_SECRET:        'datiam-test-jwt-secret-do-not-use-in-prod',
      DATABASE_URL:      'postgresql://test:test@localhost:5432/datiam_test',
      ANTHROPIC_API_KEY: 'sk-test-mock-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/modules/commercial-intelligence/**/*.ts',
        'src/modules/content/**/*.ts',
        'src/modules/campaign-manager/**/*.ts',
        'src/modules/social-accounts/**/*.ts',
        'src/modules/publishing-engine/**/*.ts',
        'src/modules/analytics-hub/**/*.ts',
        'src/modules/trend-intelligence/**/*.ts',
        'src/modules/crm/**/*.ts',
        'src/modules/ai/growth-ai*.ts',
        'src/modules/notifications/**/*.ts',
      ],
      exclude: [
        'src/modules/commercial-intelligence/__tests__/**',
        'src/tests/**',
      ],
      thresholds: {
        lines: 70,
        branches: 70,
      },
    },
  },
});
