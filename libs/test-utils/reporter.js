/**
 * Custom Vitest Reporter
 * Provides clean, structured test output with log level control
 */

import { BaseReporter } from 'vitest/reporters';
import { getLogger } from './logger.js';

export default class CustomReporter extends BaseReporter {
  constructor() {
    super();
    this.logger = getLogger();
    this.testResults = {
      passed: [],
      failed: [],
      skipped: []
    };
  }

  onInit(ctx) {
    super.onInit(ctx);
    if (this.logger._shouldLog('INFO')) {
      this.logger.group('Test Suite Starting');
    }
  }

  onTestFileStart(file) {
    if (this.logger._shouldLog('DEBUG')) {
      this.logger.debug(`Running: ${file.name}`);
    }
  }

  onTestStart(test) {
    if (this.logger._shouldLog('VERBOSE')) {
      this.logger.verbose(`Test: ${test.name}`);
    }
  }

  onTestFinished(test, result) {
    const testName = `${test.suite?.name || 'Suite'} > ${test.name}`;
    
    if (result.state === 'pass') {
      this.testResults.passed.push(testName);
      if (this.logger._shouldLog('DEBUG')) {
        this.logger.success(`✓ ${testName}`, { duration: `${result.duration}ms` });
      }
    } else if (result.state === 'fail') {
      const error = result.errors?.[0];
      this.testResults.failed.push({
        name: testName,
        error: error?.message || 'Unknown error'
      });
      this.logger.failure(`✗ ${testName}`, { 
        error: error?.message,
        duration: `${result.duration}ms` 
      });
      
      if (this.logger._shouldLog('VERBOSE') && error?.stack) {
        this.logger.verbose('Stack trace:', { stack: error.stack });
      }
    } else if (result.state === 'skip') {
      this.testResults.skipped.push(testName);
      if (this.logger._shouldLog('DEBUG')) {
        this.logger.info(`⊘ ${testName} (skipped)`);
      }
    }
  }

  onTestFileFinished(file, result) {
    if (this.logger._shouldLog('DEBUG')) {
      const passed = result.tests.filter(t => t.result?.state === 'pass').length;
      const failed = result.tests.filter(t => t.result?.state === 'fail').length;
      const skipped = result.tests.filter(t => t.result?.state === 'skip').length;
      
      this.logger.info(`File completed: ${file.name}`, {
        passed,
        failed,
        skipped,
        duration: `${result.duration}ms`
      });
    }
  }

  onFinished(files, errors) {
    if (errors.length > 0) {
      this.logger.error('Test suite errors:', { count: errors.length });
      errors.forEach(error => {
        this.logger.error(error.message);
      });
    }

    // Always show summary unless in quiet mode
    if (this.logger._shouldLog('INFO')) {
      this.logger.summary(this.testResults);
      
      const totalTests = this.testResults.passed.length + 
                         this.testResults.failed.length + 
                         this.testResults.skipped.length;
      const duration = files.reduce((acc, f) => acc + (f.result?.duration || 0), 0);
      
      this.logger.info(`Duration: ${duration}ms`);
      
      if (this.testResults.failed.length === 0) {
        this.logger.success('All tests passed!');
      } else {
        this.logger.failure(`${this.testResults.failed.length} tests failed`);
      }
    }
  }
}

// For CommonJS compatibility
module.exports = CustomReporter;