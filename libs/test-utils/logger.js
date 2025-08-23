/**
 * Test Logger Utility
 * Provides structured logging for tests with different log levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4
};

const COLORS = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const LEVEL_COLORS = {
  ERROR: COLORS.red,
  WARN: COLORS.yellow,
  INFO: COLORS.blue,
  DEBUG: COLORS.gray,
  VERBOSE: COLORS.cyan
};

const ICONS = {
  ERROR: '❌',
  WARN: '⚠️',
  INFO: '📍',
  DEBUG: '🔍',
  VERBOSE: '📝',
  SUCCESS: '✅',
  FAILURE: '❌',
  PENDING: '⏳',
  SKIP: '⏭️'
};

class TestLogger {
  constructor() {
    this.logLevel = this._getLogLevel();
    this.isVerbose = this._isVerbose();
    this.buffer = [];
    this.currentTest = null;
  }

  _getLogLevel() {
    const level = process.env.LOG_LEVEL || process.env.TEST_LOG_LEVEL || 'INFO';
    return LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
  }

  _isVerbose() {
    return process.argv.includes('--verbose') || 
           process.argv.includes('-v') ||
           process.env.VERBOSE === 'true' ||
           process.env.TEST_VERBOSE === 'true';
  }

  _shouldLog(level) {
    const levelValue = typeof level === 'string' ? LOG_LEVELS[level] : level;
    return levelValue <= this.logLevel || (this.isVerbose && levelValue <= LOG_LEVELS.VERBOSE);
  }

  _formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const color = LEVEL_COLORS[level] || '';
    const icon = ICONS[level] || '';
    
    if (this.isVerbose) {
      return `${color}[${timestamp}] ${icon} ${level}: ${message}${COLORS.reset}${data ? ` ${JSON.stringify(data)}` : ''}`;
    }
    
    return `${color}${icon} ${message}${COLORS.reset}${data ? ` ${JSON.stringify(data)}` : ''}`;
  }

  _write(formattedMessage) {
    if (process.env.BUFFER_LOGS === 'true') {
      this.buffer.push(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  error(message, data) {
    if (this._shouldLog('ERROR')) {
      this._write(this._formatMessage('ERROR', message, data));
    }
  }

  warn(message, data) {
    if (this._shouldLog('WARN')) {
      this._write(this._formatMessage('WARN', message, data));
    }
  }

  info(message, data) {
    if (this._shouldLog('INFO')) {
      this._write(this._formatMessage('INFO', message, data));
    }
  }

  debug(message, data) {
    if (this._shouldLog('DEBUG')) {
      this._write(this._formatMessage('DEBUG', message, data));
    }
  }

  verbose(message, data) {
    if (this._shouldLog('VERBOSE')) {
      this._write(this._formatMessage('VERBOSE', message, data));
    }
  }

  success(message, data) {
    if (this._shouldLog('INFO')) {
      this._write(`${COLORS.green}${ICONS.SUCCESS} ${message}${COLORS.reset}${data ? ` ${JSON.stringify(data)}` : ''}`);
    }
  }

  failure(message, data) {
    if (this._shouldLog('ERROR')) {
      this._write(`${COLORS.red}${ICONS.FAILURE} ${message}${COLORS.reset}${data ? ` ${JSON.stringify(data)}` : ''}`);
    }
  }

  test(name, fn) {
    this.currentTest = name;
    if (this._shouldLog('INFO')) {
      this._write(`\n${COLORS.cyan}🧪 Test: ${name}${COLORS.reset}`);
    }
    return fn();
  }

  step(message) {
    if (this._shouldLog('INFO')) {
      this._write(`  ${COLORS.gray}→ ${message}${COLORS.reset}`);
    }
  }

  group(title) {
    if (this._shouldLog('INFO')) {
      this._write(`\n${COLORS.blue}📋 ${title}${COLORS.reset}`);
      this._write(COLORS.gray + '─'.repeat(50) + COLORS.reset);
    }
  }

  summary(results) {
    if (!this._shouldLog('INFO')) return;

    this._write('\n' + COLORS.cyan + '📊 TEST SUMMARY' + COLORS.reset);
    this._write('═'.repeat(50));

    if (results.passed?.length > 0) {
      this._write(`${COLORS.green}✅ Passed: ${results.passed.length}${COLORS.reset}`);
      if (this.isVerbose) {
        results.passed.forEach(test => this._write(`  ${COLORS.gray}• ${test}${COLORS.reset}`));
      }
    }

    if (results.failed?.length > 0) {
      this._write(`${COLORS.red}❌ Failed: ${results.failed.length}${COLORS.reset}`);
      results.failed.forEach(test => this._write(`  ${COLORS.red}• ${test.name}: ${test.error}${COLORS.reset}`));
    }

    if (results.skipped?.length > 0) {
      this._write(`${COLORS.yellow}⏭️ Skipped: ${results.skipped.length}${COLORS.reset}`);
      if (this.isVerbose) {
        results.skipped.forEach(test => this._write(`  ${COLORS.gray}• ${test}${COLORS.reset}`));
      }
    }

    const total = (results.passed?.length || 0) + (results.failed?.length || 0) + (results.skipped?.length || 0);
    this._write(`\n${COLORS.blue}Total: ${total} tests${COLORS.reset}`);
  }

  flush() {
    if (this.buffer.length > 0) {
      this.buffer.forEach(msg => console.log(msg));
      this.buffer = [];
    }
  }

  clear() {
    this.buffer = [];
  }
}

// Singleton instance
let loggerInstance = null;

function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new TestLogger();
  }
  return loggerInstance;
}

// Helper functions for common test patterns
function logTestStart(testName) {
  const logger = getLogger();
  logger.test(testName, () => {});
}

function logTestEnd(testName, success, error) {
  const logger = getLogger();
  if (success) {
    logger.success(`${testName} completed`);
  } else {
    logger.failure(`${testName} failed`, error);
  }
}

function logStep(message) {
  const logger = getLogger();
  logger.step(message);
}

module.exports = {
  TestLogger,
  getLogger,
  logTestStart,
  logTestEnd,
  logStep,
  LOG_LEVELS,
  COLORS,
  ICONS
};