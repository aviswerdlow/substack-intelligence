module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../..',
  testMatch: ['**/tests/puppeteer/**/*.test.ts'],
  testTimeout: 120000, // 2 minutes default timeout
  setupFilesAfterEnv: ['<rootDir>/tests/puppeteer/config/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        jsx: 'react'
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@substack-intelligence/(.*)$': '<rootDir>/../../packages/$1/src'
  },
  collectCoverage: false,
  coverageDirectory: 'coverage/puppeteer',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  bail: false,
  maxWorkers: 1, // Run tests sequentially for Puppeteer
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};