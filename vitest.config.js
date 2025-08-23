import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./libs/test-utils/setup.js'],
    reporters: process.env.LOG_LEVEL === 'VERBOSE' 
      ? ['verbose', './libs/test-utils/reporter.js']
      : process.env.LOG_LEVEL === 'ERROR'
      ? ['dot']
      : ['default', './libs/test-utils/reporter.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'test/**',
        '**/*.test.js',
        '**/*.spec.js',
        '**/test-*.js',
        'scripts/test-*.js'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@libs': path.resolve(__dirname, './libs'),
      '@apps': path.resolve(__dirname, './apps'),
      '@packages': path.resolve(__dirname, './packages')
    }
  }
});