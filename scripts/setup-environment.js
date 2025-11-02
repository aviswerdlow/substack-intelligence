#!/usr/bin/env node

const { writeFileSync, existsSync, readFileSync } = require('fs');
const { join } = require('path');
const crypto = require('crypto');

// Environment templates
const TEMPLATES = {
  development: {
    description: 'Local development environment',
    variables: {
      'NODE_ENV': 'development',
      'NEXT_PUBLIC_APP_URL': 'http://localhost:3000',
      'DEBUG': 'false'
    }
  },
  staging: {
    description: 'Staging/preview environment',
    variables: {
      'NODE_ENV': 'production',
      'VERCEL_ENV': 'preview',
      'DEBUG': 'false'  // Can be overridden but will auto-disable after timeout
    }
  },
  production: {
    description: 'Production environment',
    variables: {
      'NODE_ENV': 'production',
      'VERCEL_ENV': 'production',
      'DEBUG': 'false'  // SECURITY: Always force DEBUG=false in production
    }
  }
};

// Required environment variables by category
const REQUIRED_VARS = {
  core: [
    'NODE_ENV',
    'NEXT_PUBLIC_APP_URL'
  ],
  database: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  auth: [
    'NEXT_PUBLIC_NEXTAUTH_PUBLISHABLE_KEY',
    'NEXTAUTH_SECRET_KEY'
  ],
  ai: [
    'ANTHROPIC_API_KEY'
  ],
  monitoring: [
    'AXIOM_TOKEN',
    'AXIOM_DATASET'
  ],
  security: [
    'ENCRYPTION_KEY'
  ]
};

const OPTIONAL_VARS = {
  gmail: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN'
  ],
  redis: [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ],
  email: [
    'RESEND_API_KEY'
  ],
  jobs: [
    'INNGEST_EVENT_KEY',
    'INNGEST_SIGNING_KEY'
  ],
  cron: [
    'CRON_SECRET'
  ]
};

function generateSecureSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function generateEnvironmentFile(template, outputPath) {
  const config = TEMPLATES[template];
  if (!config) {
    console.error(`❌ Unknown template: ${template}`);
    process.exit(1);
  }

  let content = `# Substack Intelligence Platform - ${config.description}\n`;
  content += `# Generated on: ${new Date().toISOString()}\n`;
  content += `# Template: ${template}\n\n`;
  
  content += `# ⚠️  IMPORTANT: This file contains sensitive information.\n`;
  content += `# - Never commit this file to version control\n`;
  content += `# - Keep all secrets secure and rotate them regularly\n`;
  content += `# - Use environment-specific values for each deployment\n\n`;

  // Core variables
  content += `# ============================================================================\n`;
  content += `# CORE APPLICATION SETTINGS\n`;
  content += `# ============================================================================\n\n`;
  
  for (const varName of REQUIRED_VARS.core) {
    const defaultValue = config.variables[varName] || '';
    content += `# Application environment and URL\n`;
    content += `${varName}=${defaultValue}\n\n`;
  }

  // Database
  content += `# ============================================================================\n`;
  content += `# DATABASE CONFIGURATION\n`;
  content += `# ============================================================================\n\n`;
  
  content += `# Supabase database configuration\n`;
  content += `# Get these values from your Supabase project dashboard\n`;
  content += `NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co\n`;
  content += `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n\n`;

  // Authentication
  content += `# ============================================================================\n`;
  content += `# AUTHENTICATION (NEXTAUTH)\n`;
  content += `# ============================================================================\n\n`;

  content += `# NextAuth secret is used to sign JWTs and sessions\n`;
  content += `# Generate with: openssl rand -base64 32\n`;
  if (template === 'production') {
    content += `# ⚠️  PRODUCTION: Secret must be at least 32 characters\n`;
  }
  content += `NEXTAUTH_SECRET=super-secure-${template}-secret\n`;
  content += `NEXTAUTH_URL=${template === 'production' ? 'https://your-production-domain.com' : 'http://localhost:3000'}\n\n`;

  // AI Services
  content += `# ============================================================================\n`;
  content += `# AI SERVICES\n`;
  content += `# ============================================================================\n\n`;
  
  content += `# Anthropic Claude API key\n`;
  content += `# Get this from https://console.anthropic.com\n`;
  content += `ANTHROPIC_API_KEY=sk-ant-api03-...\n\n`;

  // Monitoring
  content += `# ============================================================================\n`;
  content += `# MONITORING & LOGGING\n`;
  content += `# ============================================================================\n\n`;
  
  content += `# Axiom logging and monitoring\n`;
  content += `# Get these from your Axiom dashboard\n`;
  content += `AXIOM_TOKEN=xaat-...\n`;
  content += `AXIOM_DATASET=substack-intelligence-${template}\n\n`;

  // Security
  content += `# ============================================================================\n`;
  content += `# SECURITY SETTINGS\n`;
  content += `# ============================================================================\n\n`;
  
  content += `# Encryption key for sensitive data (32 characters)\n`;
  content += `# Generate a new unique key for each environment\n`;
  const encryptionKey = generateSecureSecret(32);
  content += `ENCRYPTION_KEY=${encryptionKey}\n\n`;

  if (template !== 'development') {
    content += `# Cron job security secret\n`;
    const cronSecret = generateSecureSecret(24);
    content += `CRON_SECRET=${cronSecret}\n\n`;
  }

  // Optional services
  content += `# ============================================================================\n`;
  content += `# OPTIONAL SERVICES\n`;
  content += `# ============================================================================\n\n`;

  content += `# Gmail Integration (optional for development)\n`;
  content += `# Required for email processing functionality\n`;
  content += `# Get these from Google Cloud Console\n`;
  content += `GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com\n`;
  content += `GOOGLE_CLIENT_SECRET=GOCSPX-...\n`;
  content += `GOOGLE_REFRESH_TOKEN=1//04...\n\n`;

  content += `# Redis for rate limiting (recommended)\n`;
  content += `# Get these from Upstash dashboard\n`;
  content += `UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io\n`;
  content += `UPSTASH_REDIS_REST_TOKEN=AX...\n\n`;

  content += `# Email delivery service (recommended)\n`;
  content += `# Get this from Resend dashboard\n`;
  content += `RESEND_API_KEY=re_...\n\n`;

  content += `# Background job processing (optional)\n`;
  content += `# Get these from Inngest dashboard\n`;
  content += `INNGEST_EVENT_KEY=evt_...\n`;
  content += `INNGEST_SIGNING_KEY=signkey_...\n\n`;

  // Development specific
  if (template === 'development') {
    content += `# ============================================================================\n`;
    content += `# DEVELOPMENT SETTINGS\n`;
    content += `# ============================================================================\n\n`;
    
    content += `# Enable debug mode for verbose logging\n`;
    content += `DEBUG=false\n\n`;
    
    content += `# Disable SSL verification (development only)\n`;
    content += `NODE_TLS_REJECT_UNAUTHORIZED=1\n\n`;
  }

  // Write file
  writeFileSync(outputPath, content);
  console.log(`✅ Generated ${template} environment file: ${outputPath}`);
  
  return {
    path: outputPath,
    generatedSecrets: {
      encryptionKey,
      cronSecret: template !== 'development' ? generateSecureSecret(24) : null
    }
  };
}

function validateEnvironmentFile(filePath) {
  if (!existsSync(filePath)) {
    console.error(`❌ Environment file not found: ${filePath}`);
    return false;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const variables = {};

  // Parse environment variables
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        variables[key] = valueParts.join('=');
      }
    }
  }

  let hasErrors = false;
  const warnings = [];

  // Check required variables
  console.log('\n📋 Checking required variables...');
  for (const [category, vars] of Object.entries(REQUIRED_VARS)) {
    console.log(`\n${category.toUpperCase()}:`);
    for (const varName of vars) {
      if (variables[varName] && variables[varName].trim() !== '') {
        console.log(`  ✅ ${varName}`);
      } else {
        console.log(`  ❌ ${varName} - Missing or empty`);
        hasErrors = true;
      }
    }
  }

  // Check for placeholder values
  console.log('\n🔍 Checking for placeholder values...');
  const placeholders = [
    'your-project-id',
    'your-secret-here',
    'your-key-here',
    '...',
    'abc123',
    '1234567890'
  ];

  for (const [key, value] of Object.entries(variables)) {
    for (const placeholder of placeholders) {
      if (value.toLowerCase().includes(placeholder)) {
        warnings.push(`${key} appears to contain placeholder value`);
        break;
      }
    }
  }

  // Security checks
  console.log('\n🔒 Security checks...');
  
  // Check encryption key length
  if (variables.ENCRYPTION_KEY) {
    if (variables.ENCRYPTION_KEY.length !== 32) {
      warnings.push('ENCRYPTION_KEY should be exactly 32 characters');
    }
  }

  // CRITICAL: Check debug mode in production
  if (nodeEnv === 'production' && variables.DEBUG === 'true') {
    console.log('  ❌ CRITICAL: DEBUG mode is enabled in production!');
    hasErrors = true;
  }

  // Check for test keys in production-like environment
  const nodeEnv = variables.NODE_ENV;
  if (nodeEnv === 'production') {
    if (!variables.NEXTAUTH_SECRET || variables.NEXTAUTH_SECRET.length < 32) {
      warnings.push('NEXTAUTH_SECRET should be at least 32 characters in production');
      hasErrors = true;
    }
    if (variables.NEXTAUTH_URL?.includes('localhost')) {
      warnings.push('NEXTAUTH_URL should not point to localhost in production');
      hasErrors = true;
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  if (hasErrors) {
    console.log('\n❌ Environment validation failed');
    return false;
  } else {
    console.log('\n✅ Environment validation passed');
    return true;
  }
}

function setupDevelopmentSecrets() {
  console.log('🔐 Setting up development secrets...\n');
  
  const secrets = {
    encryptionKey: generateSecureSecret(32),
    cronSecret: generateSecureSecret(24),
    webhookSecret: generateSecureSecret(32)
  };

  console.log('Generated secure secrets for development:');
  console.log(`ENCRYPTION_KEY=${secrets.encryptionKey}`);
  console.log(`CRON_SECRET=${secrets.cronSecret}`);
  console.log(`WEBHOOK_SECRET=${secrets.webhookSecret}`);
  console.log('\nℹ️  Copy these values to your .env.local file\n');
  
  return secrets;
}

// Main CLI functionality
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'generate':
    case 'gen': {
      const template = args[1] || 'development';
      const outputFile = args[2] || `.env.${template}`;
      const outputPath = join(process.cwd(), outputFile);
      
      if (existsSync(outputPath)) {
        console.log(`⚠️  File ${outputPath} already exists.`);
        console.log('Use --force to overwrite or choose a different name.');
        if (!args.includes('--force')) {
          process.exit(1);
        }
      }
      
      generateEnvironmentFile(template, outputPath);
      break;
    }

    case 'validate':
    case 'check': {
      const envFile = args[1] || '.env.local';
      const envPath = join(process.cwd(), envFile);
      
      console.log(`🔍 Validating environment file: ${envPath}\n`);
      const isValid = validateEnvironmentFile(envPath);
      process.exit(isValid ? 0 : 1);
    }

    case 'secrets': {
      setupDevelopmentSecrets();
      break;
    }

    case 'help':
    default: {
      console.log(`
🚀 Substack Intelligence Platform - Environment Setup

Usage:
  node setup-environment.js <command> [options]

Commands:
  generate <template> [file]  Generate environment file from template
    Templates: development, staging, production
    Example: node setup-environment.js generate development .env.local

  validate [file]            Validate environment file
    Example: node setup-environment.js validate .env.local

  secrets                    Generate secure secrets for development
    Example: node setup-environment.js secrets

Options:
  --force                    Overwrite existing files

Examples:
  # Generate development environment
  node setup-environment.js generate development

  # Generate production environment  
  node setup-environment.js generate production .env.production

  # Validate current environment
  node setup-environment.js validate

  # Generate development secrets
  node setup-environment.js secrets
`);
      break;
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateEnvironmentFile,
  validateEnvironmentFile,
  setupDevelopmentSecrets
};