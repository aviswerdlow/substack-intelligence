# Test Infrastructure Documentation

## Overview

This project has been refactored to provide clean, structured test output with comprehensive log level control. All `console.log` statements have been replaced with a structured logging system that provides better control over test verbosity.

## Features

### 1. Structured Logging System
- **Custom Test Logger** (`libs/test-utils/logger.js`)
  - Supports multiple log levels: ERROR, WARN, INFO, DEBUG, VERBOSE
  - Color-coded output for better readability
  - Contextual data support with JSON formatting
  - Test result summaries with pass/fail/skip counts

### 2. Log Level Control
Control test output verbosity using environment variables or command-line flags:

```bash
# Quiet mode - only errors
npm run test:quiet
# or
LOG_LEVEL=ERROR npm test

# Verbose mode - all details
npm run test:verbose
# or
LOG_LEVEL=VERBOSE npm test

# Debug mode - detailed debugging info
npm run test:debug
# or
LOG_LEVEL=DEBUG npm test

# Default mode - standard output
npm test
```

### 3. Custom Vitest Reporter
- **Location**: `libs/test-utils/reporter.js`
- Integrates with the structured logging system
- Provides clean test output based on log level
- Shows test duration and performance metrics in verbose mode

### 4. Test Setup Configuration
- **Setup File**: `libs/test-utils/setup.js`
- Automatically suppresses console.log in tests unless in verbose mode
- Provides global test utilities
- Configures test environment

## Usage

### Running Tests

```bash
# Standard test run
npm test

# Run tests with verbose output
npm run test:verbose

# Run tests with minimal output (errors only)
npm run test:quiet

# Run tests with debug information
npm run test:debug

# Run tests with coverage
npm run test:coverage
```

### Using the Logger in Tests

```javascript
const { getLogger, logStep } = require('./libs/test-utils/logger');

const logger = getLogger();

// In your test
logger.group('Test Suite Name');
logStep('Performing action');
logger.success('Test passed');
logger.failure('Test failed', { error: 'Details' });
logger.info('Information');
logger.debug('Debug info');
logger.verbose('Verbose details');

// Summary
logger.summary({
  passed: ['Test 1', 'Test 2'],
  failed: [{ name: 'Test 3', error: 'Error message' }],
  skipped: ['Test 4']
});
```

### Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `LOG_LEVEL` | ERROR, WARN, INFO, DEBUG, VERBOSE | Controls logging verbosity |
| `TEST_LOG_LEVEL` | Same as above | Alternative to LOG_LEVEL |
| `VERBOSE` | true/false | Enable verbose mode |
| `TEST_VERBOSE` | true/false | Alternative to VERBOSE |
| `BUFFER_LOGS` | true/false | Buffer logs instead of immediate output |
| `HEADLESS` | true/false | Run Puppeteer tests in headless mode |
| `KEEP_BROWSER_OPEN` | true/false | Keep browser open after Puppeteer tests |
| `SLOW_MO` | number | Slow down Puppeteer actions (ms) |

## Test Files Updated

### Core Test Files
- `test-supabase-url.js` - Tests Supabase URL DNS resolution
- `test-navigation.js` - Tests application navigation and routes
- `test-database.js` - Tests database connectivity and operations

### Script Test Files
- `scripts/test-pipeline.js` - Comprehensive pipeline validation
- `scripts/test-extraction.js` - AI extraction testing
- `scripts/test-app-puppeteer.js` - E2E application testing
- `scripts/test-live-deployment.js` - Live deployment validation

## Configuration Files

### Vitest Configuration (`vitest.config.js`)
- Configures test environment
- Sets up custom reporter based on log level
- Defines coverage settings
- Configures test timeouts

### Package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:verbose": "LOG_LEVEL=VERBOSE vitest run --reporter=verbose",
    "test:quiet": "LOG_LEVEL=ERROR vitest run --reporter=dot",
    "test:debug": "LOG_LEVEL=DEBUG vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Best Practices

1. **No Direct Console.log**: All test files use the structured logger instead of console.log
2. **Meaningful Test Names**: Use descriptive names for tests and test suites
3. **Proper Error Handling**: Catch and log errors with context
4. **Clean Output by Default**: Tests run with clean output unless verbose mode is enabled
5. **Exit Codes**: Tests properly set exit codes (0 for success, 1 for failure)

## Migration Guide

If you need to update additional test files:

1. Replace `console.log` with appropriate logger methods:
   ```javascript
   // Before
   console.log('Testing feature...');
   
   // After
   logger.info('Testing feature...');
   ```

2. Add structured test results:
   ```javascript
   const results = {
     passed: [],
     failed: [],
     skipped: []
   };
   
   // Track results
   if (testPassed) {
     results.passed.push('Test name');
   } else {
     results.failed.push({ name: 'Test name', error: 'Error message' });
   }
   
   // Show summary
   logger.summary(results);
   ```

3. Use log levels appropriately:
   - `error()` - Critical errors that prevent test execution
   - `warn()` - Warnings that don't stop tests
   - `info()` - Important test information
   - `debug()` - Debugging information
   - `verbose()` - Detailed trace information

## Troubleshooting

### Tests are too verbose
- Run with `npm run test:quiet` or set `LOG_LEVEL=ERROR`

### Need more test details
- Run with `npm run test:verbose` or set `LOG_LEVEL=VERBOSE`

### Tests not showing any output
- Check if `LOG_LEVEL` is set to a valid value
- Ensure the logger is properly imported and initialized

### Browser tests failing
- Set `HEADLESS=false` to see browser actions
- Use `SLOW_MO=1000` to slow down actions
- Set `KEEP_BROWSER_OPEN=true` to inspect after failure

## Future Improvements

- [ ] Add test performance benchmarking
- [ ] Implement test result persistence
- [ ] Add HTML report generation
- [ ] Create test result dashboard
- [ ] Add parallel test execution support
- [ ] Implement test retry logic for flaky tests