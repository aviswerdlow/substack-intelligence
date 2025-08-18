import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/*/src/**/*.ts',
        'services/*/src/**/*.ts',
        'apps/web/app/**/*.ts',
        'apps/web/lib/**/*.ts'
      ],
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/types/**',
        'apps/web/app/globals.css'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web'),
      '@substack-intelligence/shared': path.resolve(__dirname, './packages/shared/src'),
      '@substack-intelligence/database': path.resolve(__dirname, './packages/database/src'),
      '@substack-intelligence/ai': path.resolve(__dirname, './packages/ai/src'),
      '@substack-intelligence/enrichment': path.resolve(__dirname, './services/enrichment/src'),
      '@substack-intelligence/ingestion': path.resolve(__dirname, './services/ingestion/src'),
      '@substack-intelligence/reports': path.resolve(__dirname, './services/reports/src'),
      '@substack-intelligence/email': path.resolve(__dirname, './apps/email/src')
    }
  }
});