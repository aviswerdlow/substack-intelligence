#!/usr/bin/env node

/**
 * Example test file demonstrating clean test output
 */

const { getLogger, logStep } = require('./libs/test-utils/logger');

const logger = getLogger();

async function runExampleTests() {
  logger.group('Example Test Suite');
  
  const results = {
    passed: [],
    failed: [],
    skipped: []
  };
  
  // Test 1: Simple passing test
  logStep('Running simple passing test');
  logger.debug('Checking if 2 + 2 equals 4');
  if (2 + 2 === 4) {
    logger.success('Math test passed');
    results.passed.push('Basic math test');
  } else {
    logger.failure('Math test failed');
    results.failed.push({ name: 'Basic math test', error: 'Math is broken!' });
  }
  
  // Test 2: Array operations
  logStep('Testing array operations');
  const arr = [1, 2, 3];
  logger.debug('Array contents', { array: arr });
  if (arr.length === 3) {
    logger.success('Array length test passed');
    results.passed.push('Array length test');
  } else {
    logger.failure('Array length test failed');
    results.failed.push({ name: 'Array length test', error: `Expected 3, got ${arr.length}` });
  }
  
  // Test 3: String operations
  logStep('Testing string operations');
  const str = 'Hello World';
  logger.verbose('String value', { string: str });
  if (str.includes('World')) {
    logger.success('String contains test passed');
    results.passed.push('String contains test');
  } else {
    logger.failure('String contains test failed');
    results.failed.push({ name: 'String contains test', error: 'String does not contain "World"' });
  }
  
  // Test 4: Async operation
  logStep('Testing async operation');
  await new Promise(resolve => setTimeout(resolve, 100));
  logger.success('Async test completed');
  results.passed.push('Async operation test');
  
  // Test 5: Skipped test
  logger.info('Skipping network test (no connection required for demo)');
  results.skipped.push('Network connectivity test');
  
  // Show summary
  logger.summary(results);
  
  // Additional info in verbose mode
  if (logger.isVerbose) {
    logger.verbose('Test execution details', {
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform
    });
  }
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

runExampleTests().catch(error => {
  logger.error('Test suite failed', error);
  process.exit(1);
});