#!/usr/bin/env node

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

/**
 * Validates build configuration for production deployments
 * Ensures critical security settings are properly configured
 */

const CRITICAL_CHECKS = {
  // Debug mode must be disabled in production
  debugMode: {
    name: 'Debug Mode Check',
    validate: (env) => {
      if (env.NODE_ENV === 'production' && env.DEBUG === 'true') {
        return {
          passed: false,
          message: 'CRITICAL: Debug mode is enabled in production build',
          severity: 'critical'
        };
      }
      return {
        passed: true,
        message: 'Debug mode properly configured',
        severity: 'info'
      };
    }
  },

  // Test keys must not be used in production
  clerkKeys: {
    name: 'Authentication Keys Check',
    validate: (env) => {
      if (env.NODE_ENV === 'production') {
        if (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('test')) {
          return {
            passed: false,
            message: 'Test Clerk publishable key detected in production',
            severity: 'critical'
          };
        }
        if (env.CLERK_SECRET_KEY?.includes('test')) {
          return {
            passed: false,
            message: 'Test Clerk secret key detected in production',
            severity: 'critical'
          };
        }
      }
      return {
        passed: true,
        message: 'Authentication keys properly configured',
        severity: 'info'
      };
    }
  },

  // Encryption key must be present and valid
  encryptionKey: {
    name: 'Encryption Key Check',
    validate: (env) => {
      if (!env.ENCRYPTION_KEY) {
        return {
          passed: false,
          message: 'Encryption key is missing',
          severity: 'critical'
        };
      }
      if (env.ENCRYPTION_KEY.length < 32) {
        return {
          passed: false,
          message: 'Encryption key is too short (minimum 32 characters)',
          severity: 'critical'
        };
      }
      return {
        passed: true,
        message: 'Encryption key properly configured',
        severity: 'info'
      };
    }
  },

  // Required services must be configured
  requiredServices: {
    name: 'Required Services Check',
    validate: (env) => {
      const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ANTHROPIC_API_KEY'
      ];

      const missing = required.filter(key => !env[key] || env[key].includes('...'));
      
      if (missing.length > 0) {
        return {
          passed: false,
          message: `Missing required services: ${missing.join(', ')}`,
          severity: 'critical'
        };
      }
      
      return {
        passed: true,
        message: 'All required services configured',
        severity: 'info'
      };
    }
  },

  // Security headers and policies
  securityPolicies: {
    name: 'Security Policies Check',
    validate: (env) => {
      if (env.NODE_ENV === 'production') {
        if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
          return {
            passed: false,
            message: 'SSL verification is disabled in production',
            severity: 'critical'
          };
        }
      }
      return {
        passed: true,
        message: 'Security policies properly configured',
        severity: 'info'
      };
    }
  }
};

function loadEnvironment() {
  const env = { ...process.env };
  
  // Check for .env files in order of priority
  const envFiles = [
    '.env.production.local',
    '.env.production',
    '.env.local',
    '.env'
  ];

  for (const file of envFiles) {
    const path = join(process.cwd(), file);
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            // Only set if not already defined (respecting priority)
            if (!env[key]) {
              env[key] = valueParts.join('=').trim();
            }
          }
        }
      }
    }
  }

  return env;
}

async function validateBuild() {
  console.log('🔍 Validating build configuration...\n');
  
  const env = loadEnvironment();
  const results = [];
  let hasCriticalErrors = false;
  let hasWarnings = false;

  // Run all checks
  for (const [key, check] of Object.entries(CRITICAL_CHECKS)) {
    console.log(`📋 ${check.name}`);
    const result = check.validate(env);
    results.push({ ...result, check: check.name });

    if (!result.passed) {
      if (result.severity === 'critical') {
        console.log(`  ❌ ${result.message}`);
        hasCriticalErrors = true;
      } else {
        console.log(`  ⚠️  ${result.message}`);
        hasWarnings = true;
      }
    } else {
      console.log(`  ✅ ${result.message}`);
    }
  }

  // API Route validation - critical for catching import-time errors
  console.log('\n🛣️  API Route Import Validation:');
  try {
    const { ApiRouteValidator } = require('./validate-api-routes.js');
    const validator = new ApiRouteValidator();
    
    // Run a quick validation (without full output)
    const originalLog = console.log;
    const logs = [];
    console.log = (msg) => logs.push(msg);
    
    const routeValidationResult = await validator.run();
    console.log = originalLog;
    
    if (routeValidationResult) {
      console.log(`  ✅ All API routes can be imported successfully`);
    } else {
      console.log(`  ❌ Some API routes have import errors`);
      console.log(`  Run 'npm run validate:api-routes' for detailed output`);
      
      // Look for jsdom errors specifically
      const jsdomErrors = validator.results.errors.filter(error => 
        error.error.includes('jsdom') || error.error.includes('Canvas')
      );
      
      if (jsdomErrors.length > 0) {
        console.log(`  🚨 jsdom compatibility issues detected in ${jsdomErrors.length} routes`);
        hasCriticalErrors = true;
      } else {
        hasWarnings = true;
      }
    }
  } catch (error) {
    console.log(`  ⚠️  Could not run API route validation: ${error.message}`);
    hasWarnings = true;
  }

  // Additional production-specific checks
  if (env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production') {
    console.log('\n🏭 Production-specific checks:');
    
    // Check for localhost URLs
    if (env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      console.log('  ❌ Production is using localhost URL');
      hasCriticalErrors = true;
    } else {
      console.log('  ✅ Production URL properly configured');
    }

    // Check for monitoring
    if (!env.AXIOM_TOKEN || !env.AXIOM_DATASET) {
      console.log('  ⚠️  Monitoring not configured (Axiom)');
      hasWarnings = true;
    } else {
      console.log('  ✅ Monitoring configured');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (hasCriticalErrors) {
    console.log('❌ BUILD VALIDATION FAILED - Critical errors found');
    console.log('The build cannot proceed with these security issues.');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Build validation passed with warnings');
    console.log('Consider addressing the warnings before deployment.');
    process.exit(0);
  } else {
    console.log('✅ BUILD VALIDATION PASSED');
    console.log('All security checks passed successfully.');
    process.exit(0);
  }
}

// Export for use in other scripts
module.exports = {
  CRITICAL_CHECKS,
  loadEnvironment,
  validateBuild
};

// Run if called directly
if (require.main === module) {
  validateBuild().catch(error => {
    console.error('Validation failed with error:', error);
    process.exit(1);
  });
}