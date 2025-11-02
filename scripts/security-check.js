#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const files = {
  middleware: path.join(projectRoot, 'apps/web/middleware.ts'),
  rateLimiting: path.join(projectRoot, 'apps/web/lib/security/rate-limiting.ts'),
  validation: path.join(projectRoot, 'lib/validation.ts'),
  documentation: path.join(projectRoot, 'docs/security/security-audit-report.md'),
  packageJson: path.join(projectRoot, 'package.json'),
};

const requiredSecurityHeaders = [
  'Strict-Transport-Security',
  'Content-Security-Policy',
  'Referrer-Policy',
  'Permissions-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'X-XSS-Protection',
];

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function addCheck(results, name, passed, details = '') {
  results.push({ name, passed, details });
}

function checkSecurityHeaders(results) {
  const content = readFileSafe(files.middleware);
  if (!content) {
    addCheck(results, 'Middleware security headers file present', false, 'apps/web/middleware.ts not found');
    return;
  }

  const missingHeaders = requiredSecurityHeaders.filter(header => !content.includes(header));
  if (missingHeaders.length > 0) {
    addCheck(
      results,
      'Required security headers configured',
      false,
      `Missing: ${missingHeaders.join(', ')}`
    );
    return;
  }

  addCheck(results, 'Required security headers configured', true);
}

function checkRateLimiting(results) {
  const content = readFileSafe(files.rateLimiting);
  if (!content) {
    addCheck(results, 'Rate limiting configuration present', false, 'Rate limiting module missing');
    return;
  }

  const hasSlidingWindow = /Ratelimit\.slidingWindow\(/.test(content);
  const hasClientIdentifier = /getClientIdentifier/.test(content);

  if (!hasSlidingWindow || !hasClientIdentifier) {
    addCheck(
      results,
      'Rate limiting strategy implemented',
      false,
      'Sliding window or client identifier logic missing'
    );
    return;
  }

  addCheck(results, 'Rate limiting strategy implemented', true);
}

function checkValidation(results) {
  const content = readFileSafe(files.validation);
  if (!content) {
    addCheck(results, 'Centralized validation utilities present', false, 'lib/validation.ts missing');
    return;
  }

  const exportsExpected = ['postCreationSchema', 'sanitizeHtml', 'sanitizePostPayload'];
  const missing = exportsExpected.filter(token => !content.includes(token));

  if (missing.length > 0) {
    addCheck(
      results,
      'Validation utilities export required helpers',
      false,
      `Missing exports: ${missing.join(', ')}`
    );
    return;
  }

  addCheck(results, 'Validation utilities export required helpers', true);
}

function checkDocumentation(results) {
  const content = readFileSafe(files.documentation);
  if (!content) {
    addCheck(results, 'Security audit documentation available', false, 'Security audit report missing');
    return;
  }

  const hasChecklist = /OWASP Top 10/i.test(content) && /Rate Limiting/i.test(content);
  addCheck(
    results,
    'Security audit documentation available',
    hasChecklist,
    hasChecklist ? '' : 'Documentation missing required sections'
  );
}

function checkScripts(results) {
  const packageJsonContent = readFileSafe(files.packageJson);
  if (!packageJsonContent) {
    addCheck(results, 'Security scripts declared', false, 'package.json missing');
    return;
  }

  try {
    const packageJson = JSON.parse(packageJsonContent);
    const scripts = packageJson.scripts || {};
    const hasSecurityCheck = typeof scripts['security:check'] === 'string';
    const hasSecurityAudit = typeof scripts['security:audit'] === 'string';

    if (!hasSecurityCheck || !hasSecurityAudit) {
      const missing = [
        !hasSecurityCheck ? 'security:check' : null,
        !hasSecurityAudit ? 'security:audit' : null,
      ].filter(Boolean);
      addCheck(results, 'Security scripts declared', false, `Missing scripts: ${missing.join(', ')}`);
      return;
    }

    addCheck(results, 'Security scripts declared', true);
  } catch (error) {
    addCheck(results, 'Security scripts declared', false, 'Failed to parse package.json');
  }
}

function run() {
  const results = [];

  checkSecurityHeaders(results);
  checkRateLimiting(results);
  checkValidation(results);
  checkDocumentation(results);
  checkScripts(results);

  const failed = results.filter(result => !result.passed);

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const details = result.details ? ` - ${result.details}` : '';
    console.log(`${icon} ${result.name}${details}`);
  });

  if (failed.length > 0) {
    console.log('\nSecurity checks failed. Please address the items above.');
    process.exit(1);
  }

  console.log('\nAll security checks passed.');
}

run();
