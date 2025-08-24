#!/usr/bin/env node

/**
 * API Route Import Validation Script
 * 
 * This script validates that all API routes can be imported without errors.
 * It catches import-time issues like the jsdom problem that unit tests might miss.
 * 
 * Usage:
 *   node scripts/validate-api-routes.js
 *   npm run validate:api-routes
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Configuration
const config = {
  apiRoutesPattern: 'apps/web/app/api/**/route.{ts,js}',
  timeout: 30000, // 30 seconds timeout per route
  verbose: process.env.VERBOSE === 'true' || process.argv.includes('--verbose'),
  failFast: process.env.FAIL_FAST === 'true' || process.argv.includes('--fail-fast')
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

class ApiRouteValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
    this.startTime = Date.now();
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  verbose(message) {
    if (config.verbose) {
      this.log(`  ${message}`, colors.blue);
    }
  }

  async findApiRoutes() {
    try {
      const files = await glob(config.apiRoutesPattern);
      return files.sort();
    } catch (error) {
      throw error;
    }
  }

  async validateRoute(routePath) {
    const startTime = Date.now();
    const relativePath = path.relative(process.cwd(), routePath);
    
    this.verbose(`Validating: ${relativePath}`);

    try {
      // Create a new Node.js process to test the import
      // This isolates each test and prevents cross-contamination
      const result = await this.testRouteImport(routePath);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.results.passed++;
        this.log(`✅ ${relativePath} (${duration}ms)`, colors.green);
        
        if (config.verbose && result.exports) {
          this.verbose(`Exports: ${result.exports.join(', ')}`);
        }
        
        return { success: true, route: relativePath, duration, exports: result.exports };
      } else {
        this.results.failed++;
        this.log(`❌ ${relativePath} (${duration}ms)`, colors.red);
        this.log(`   Error: ${result.error}`, colors.red);
        
        const error = {
          route: relativePath,
          error: result.error,
          duration
        };
        
        this.results.errors.push(error);
        return { success: false, ...error };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      this.log(`💥 ${relativePath} (${duration}ms)`, colors.red);
      this.log(`   Fatal Error: ${error.message}`, colors.red);
      
      const errorObj = {
        route: relativePath,
        error: error.message,
        duration,
        fatal: true
      };
      
      this.results.errors.push(errorObj);
      return { success: false, ...errorObj };
    }
  }

  async testRouteImport(routePath) {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const absolutePath = path.resolve(routePath);
      
      // Test script that tries to import the route
      const testScript = `
        async function testImport() {
          try {
            const startTime = Date.now();
            const module = await import('${absolutePath}');
            const duration = Date.now() - startTime;
            
            const exports = Object.keys(module);
            const hasRequiredExports = ['GET', 'POST'].some(method => exports.includes(method));
            
            if (!hasRequiredExports) {
              console.log(JSON.stringify({
                success: false,
                error: 'Route does not export GET or POST handlers',
                exports: exports
              }));
              process.exit(1);
            }
            
            // Check runtime configuration
            const runtimeWarnings = [];
            if (!module.runtime || module.runtime === 'edge') {
              runtimeWarnings.push('Route uses edge runtime - may not support all Node.js APIs');
            }
            
            console.log(JSON.stringify({
              success: true,
              exports: exports,
              duration: duration,
              warnings: runtimeWarnings
            }));
            process.exit(0);
          } catch (error) {
            console.log(JSON.stringify({
              success: false,
              error: error.message,
              stack: error.stack
            }));
            process.exit(1);
          }
        }
        
        testImport();
      `;

      const child = spawn('node', ['--input-type=module'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: `Import test timed out after ${config.timeout}ms`
        });
      }, config.timeout);

      child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (parseError) {
            resolve({
              success: false,
              error: `Failed to parse test output: ${parseError.message}`
            });
          }
        } else {
          let errorMessage = 'Unknown error';
          
          try {
            const result = JSON.parse(stdout);
            errorMessage = result.error || errorMessage;
          } catch {
            errorMessage = stderr || stdout || errorMessage;
          }
          
          resolve({
            success: false,
            error: errorMessage
          });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: `Failed to spawn test process: ${error.message}`
        });
      });

      // Send the test script to the child process
      child.stdin.write(testScript);
      child.stdin.end();
    });
  }

  async run() {
    this.log('🔍 API Route Import Validation', colors.bright);
    this.log('=====================================', colors.bright);

    try {
      // Find all API routes
      const routes = await this.findApiRoutes();
      this.results.total = routes.length;

      if (routes.length === 0) {
        this.log('⚠️  No API routes found!', colors.yellow);
        return false;
      }

      this.log(`Found ${routes.length} API routes to validate\n`);

      // Validate each route
      const validationPromises = routes.map(async (route) => {
        const result = await this.validateRoute(route);
        
        if (!result.success && config.failFast) {
          this.log('\n💥 Fail-fast mode: Stopping on first error', colors.red);
          process.exit(1);
        }
        
        return result;
      });

      const results = await Promise.all(validationPromises);
      
      // Print summary
      this.printSummary();

      // Check for critical issues
      const criticalErrors = this.results.errors.filter(error => 
        error.error.includes('jsdom') ||
        error.error.includes('Module not found') ||
        error.error.includes('Cannot find module') ||
        error.fatal
      );

      if (criticalErrors.length > 0) {
        this.log('\n🚨 Critical Issues Detected:', colors.red);
        criticalErrors.forEach(error => {
          this.log(`   ${error.route}: ${error.error}`, colors.red);
        });
      }

      return this.results.failed === 0;
      
    } catch (error) {
      this.log(`💥 Validation failed: ${error.message}`, colors.red);
      return false;
    }
  }

  printSummary() {
    const duration = Date.now() - this.startTime;
    
    this.log('\n=====================================', colors.bright);
    this.log('📊 Validation Summary', colors.bright);
    this.log('=====================================', colors.bright);
    
    this.log(`Total routes: ${this.results.total}`);
    this.log(`✅ Passed: ${this.results.passed}`, colors.green);
    this.log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? colors.red : colors.green);
    this.log(`⏱️  Total time: ${duration}ms`);
    
    if (this.results.errors.length > 0) {
      this.log('\n📝 Failed Routes:', colors.yellow);
      this.results.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error.route}`, colors.yellow);
        this.log(`   ${error.error}`, colors.red);
      });
    }

    // Success rate
    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    this.log(`\n📈 Success Rate: ${successRate}%`, 
      successRate === 100 ? colors.green : 
      successRate >= 80 ? colors.yellow : colors.red
    );
  }
}

// CLI handling
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
API Route Import Validation Script

Usage: node scripts/validate-api-routes.js [options]

Options:
  --verbose         Enable verbose output
  --fail-fast      Stop on first error
  --help, -h       Show this help

Environment Variables:
  VERBOSE=true     Enable verbose output
  FAIL_FAST=true   Stop on first error
    `);
    process.exit(0);
  }

  const validator = new ApiRouteValidator();
  const success = await validator.run();
  
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { ApiRouteValidator };