# Environment Setup Guide - Substack Intelligence Platform

## Overview

This guide covers the complete environment setup process for the Substack Intelligence Platform, including development, staging, and production configurations with proper secrets management and security practices.

## Quick Start

### 1. Generate Development Environment

```bash
# Generate .env.local for development
npm run env:dev

# Or manually generate
node scripts/setup-environment.js generate development .env.local
```

### 2. Configure Required Services

Add your actual service credentials to the generated `.env.local` file:

```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Processing (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Monitoring (Axiom)
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=substack-intelligence-dev
```

### 3. Validate Environment

```bash
# Validate current environment
npm run env:validate

# Or manually validate
node scripts/setup-environment.js validate .env.local
```

### 4. Generate Secure Secrets

```bash
# Generate development secrets
npm run env:secrets
```

## Environment Templates

### Development Environment

**Purpose:** Local development with minimal external dependencies

**Key Features:**
- Uses test/development keys from services
- Gmail integration is optional
- Debug mode available
- Local database supported

**Setup:**
```bash
npm run env:dev
```

### Staging Environment  

**Purpose:** Pre-production testing with production-like setup

**Key Features:**
- Production-like configuration
- Separate service instances
- All integrations functional
- Staging-specific datasets

**Setup:**
```bash
npm run env:staging
```

### Production Environment

**Purpose:** Live production with all security and monitoring enabled

**Key Features:**
- Live/production keys required
- Enhanced security validation
- Full monitoring and alerting
- Enterprise-grade reliability

**Setup:**
```bash
npm run env:prod
```

## Service Configuration

### Required Services

#### 1. Supabase (Database)
```bash
# Get from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Setup Steps:**
1. Create Supabase project
2. Run database migrations: `npm run db:migrate`
3. Configure RLS policies (included in migrations)

#### 2. Clerk (Authentication)
```bash
# Get from your Clerk dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # or pk_live_ for production
CLERK_SECRET_KEY=sk_test_...                   # or sk_live_ for production
```

**Setup Steps:**
1. Create Clerk application
2. Configure OAuth providers (if needed)
3. Set up organization support

#### 3. Anthropic (AI Processing)
```bash
# Get from https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Setup Steps:**
1. Create Anthropic account
2. Generate API key
3. Monitor usage and rate limits

#### 4. Axiom (Monitoring)
```bash
# Get from your Axiom dashboard
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=substack-intelligence-dev
```

**Setup Steps:**
1. Create Axiom account
2. Create dataset for your environment
3. Configure retention policies

### Optional Services

#### 5. Gmail Integration
```bash
# Get from Google Cloud Console
GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REFRESH_TOKEN=1//04...
```

**Setup Steps:**
1. Create Google Cloud project
2. Enable Gmail API
3. Set up OAuth 2.0 credentials
4. Generate refresh token

#### 6. Upstash Redis (Rate Limiting)
```bash
# Get from Upstash dashboard
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...
```

#### 7. Resend (Email Delivery)
```bash
# Get from Resend dashboard
RESEND_API_KEY=re_...
```

#### 8. Inngest (Background Jobs)
```bash
# Get from Inngest dashboard
INNGEST_EVENT_KEY=evt_...
INNGEST_SIGNING_KEY=signkey_...
```

## Security Configuration

### Generated Secrets

The setup script automatically generates secure secrets:

```bash
# 32-character encryption key
ENCRYPTION_KEY=randomly-generated-32-char-key-here

# Cron job protection secret
CRON_SECRET=randomly-generated-cron-secret-here
```

### Manual Secret Generation

```bash
# Generate new secrets
npm run env:secrets

# Or use Node.js crypto
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Secret Strength Validation

The platform validates secret strength:
- Minimum 16 characters
- High entropy (no repetitive patterns)
- No common patterns (123456, password, etc.)
- Character variety (lowercase, uppercase, numbers, symbols)

### Environment-Specific Security

**Development:**
- Test keys allowed
- Debug mode available
- Relaxed validation

**Staging:**
- Production-like security
- Separate service instances
- Full validation enabled

**Production:**
- Live keys required
- Maximum security validation
- No debug mode
- Comprehensive monitoring

## Environment Validation

### Automatic Validation

The platform includes comprehensive environment validation:

```bash
# Validate current environment
npm run env:validate

# Validate specific file
node scripts/setup-environment.js validate .env.production
```

### Validation Checks

**Required Variables:**
- All mandatory environment variables present
- No empty or missing critical values

**Format Validation:**
- API key format verification
- URL format checking
- Boolean and number parsing

**Security Validation:**
- No placeholder values in production
- Test keys not used in production
- Adequate secret strength
- No sensitive data exposure

### API Configuration Validation

```bash
# Check API configuration (admin only)
curl https://your-app.vercel.app/api/config/validate
```

**Validation Categories:**
- Environment security
- Secrets configuration  
- Runtime configuration
- Full system validation

## Deployment Environment Setup

### Vercel Environment Variables

#### Using Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add each variable for appropriate environments
4. Use Vercel's encryption for sensitive values

#### Using Vercel CLI:
```bash
# Set production variables
vercel env add ANTHROPIC_API_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add ENCRYPTION_KEY production

# Set preview/staging variables
vercel env add ANTHROPIC_API_KEY preview
vercel env add CLERK_SECRET_KEY preview

# Set development variables  
vercel env add ANTHROPIC_API_KEY development
```

### Environment-Specific Configuration

**Development (Vercel Dev):**
- Uses `.env.local`
- Test/development keys
- Debug logging enabled

**Preview (Vercel Preview):**
- Uses preview environment variables
- Staging service instances
- Production-like security

**Production (Vercel Production):**
- Uses production environment variables
- Live service instances
- Maximum security and monitoring

## Security Best Practices

### Secret Management

**DO:**
- Use unique secrets for each environment
- Rotate secrets regularly (quarterly)
- Use strong, high-entropy values
- Store secrets in encrypted systems
- Monitor for secret exposure

**DON'T:**
- Reuse secrets across environments
- Commit secrets to version control
- Use placeholder or example values
- Share production secrets
- Log sensitive values

### Environment Isolation

**Development:**
- Use test/development service instances
- Separate databases and datasets
- Debug mode available
- Relaxed rate limits

**Staging:**
- Mirror production configuration
- Separate service instances
- Production-like data volumes
- Full integration testing

**Production:**
- Live service instances
- Maximum security settings
- Comprehensive monitoring
- Disaster recovery ready

### Access Control

**Development:**
- Local access only
- Individual developer accounts
- Limited external integrations

**Staging:**
- Team access with authentication
- Temporary access tokens
- Testing-specific permissions

**Production:**
- Restricted access with MFA
- Role-based permissions
- Comprehensive audit logging
- Regular access reviews

## Monitoring and Alerting

### Health Monitoring

```bash
# Check system health
curl https://your-app.vercel.app/api/monitoring/health

# Check deployment readiness
curl https://your-app.vercel.app/api/monitoring/health?type=readiness

# Check application liveness
curl https://your-app.vercel.app/api/monitoring/health?type=liveness
```

### Configuration Monitoring

The platform continuously monitors:
- Environment variable changes
- Secret expiration and rotation
- Service connectivity and health
- Security configuration drift
- Performance degradation

### Alerting Configuration

Alerts are triggered for:
- Missing or invalid environment variables
- Weak or expired secrets
- Service connectivity issues
- Security configuration problems
- Performance threshold breaches

## Troubleshooting

### Common Issues

**Environment Validation Errors:**
```bash
# Check missing variables
npm run env:validate

# Check service connectivity
curl https://your-app.vercel.app/api/config/validate?type=secrets
```

**Service Connection Issues:**
- Verify API keys are valid and not expired
- Check service status pages
- Validate network connectivity
- Review rate limiting settings

**Secret Generation Issues:**
```bash
# Generate new secrets
npm run env:secrets

# Validate secret strength
node -e "
const crypto = require('crypto');
const secret = 'your-secret-here';
console.log('Length:', secret.length);
console.log('Entropy:', secret.split('').reduce((acc, char) => ({ ...acc, [char]: (acc[char] || 0) + 1 }), {}));
"
```

### Debugging Environment Issues

**Check Current Environment:**
```bash
# View current environment (sanitized)
node -e "console.log(Object.keys(process.env).filter(k => k.includes('NEXT_PUBLIC')).sort())"

# Validate configuration
npm run env:validate
```

**Service Debugging:**
```bash
# Test database connection
curl https://your-app.vercel.app/api/monitoring/health?type=database

# Test AI service  
curl https://your-app.vercel.app/api/monitoring/health?type=anthropic

# Test authentication
curl https://your-app.vercel.app/api/monitoring/health?type=auth
```

## Migration and Rotation

### Secret Rotation

**Quarterly Rotation Schedule:**
1. Generate new secrets
2. Update development environment
3. Test functionality
4. Update staging environment
5. Verify staging operations
6. Update production environment
7. Monitor for issues
8. Revoke old secrets

**Rotation Script:**
```bash
# Generate new encryption key
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update environment
echo "New encryption key: $NEW_KEY"
echo "Update ENCRYPTION_KEY in your environment variables"
```

### Environment Migration

**Development → Staging:**
1. Validate development configuration
2. Generate staging secrets
3. Configure staging services
4. Deploy to staging
5. Run integration tests

**Staging → Production:**
1. Security audit and validation
2. Generate production secrets
3. Configure production services
4. Deploy with blue-green strategy
5. Monitor and validate

---

## Support

For environment setup issues:
- **Documentation:** Check this guide and `/docs` folder
- **Validation:** Use `npm run env:validate`
- **Health Checks:** Monitor `/api/monitoring/health`
- **Security Audit:** Run `/api/security/audit`
- **Configuration:** Check `/api/config/validate`