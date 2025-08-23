/**
 * Test Setup File
 * Configures global test environment and utilities
 */

// Suppress console.log in tests unless in verbose mode
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const isVerbose = process.env.LOG_LEVEL === 'VERBOSE' || 
                  process.env.LOG_LEVEL === 'DEBUG' ||
                  process.argv.includes('--verbose') ||
                  process.argv.includes('-v');

if (!isVerbose) {
  console.log = () => {};
  console.warn = () => {};
  // Keep console.error for critical errors
  console.error = (...args) => {
    // Only show actual errors, not test assertions
    if (args[0] && typeof args[0] === 'string' && !args[0].includes('AssertionError')) {
      originalConsoleError(...args);
    }
  };
}

// Add custom matchers if needed
if (global.expect) {
  // Add any custom Vitest matchers here
}

// Global test utilities
global.testLogger = require('./logger').getLogger();

// Cleanup function for tests
global.afterEach(() => {
  // Clear any test artifacts
  if (global.testLogger) {
    global.testLogger.clear();
  }
});

// Export for module usage
module.exports = {
  originalConsoleLog,
  originalConsoleError,
  originalConsoleWarn
};