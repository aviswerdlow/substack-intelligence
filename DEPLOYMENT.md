# Substack Intelligence Platform - Production Deployment Guide

## Overview

This guide covers the complete production deployment of the Substack Intelligence Platform on Vercel with comprehensive security, monitoring, and reliability features.

## Prerequisites

### Required Accounts & Services
- [ ] Vercel account with Pro plan (for advanced features)
- [ ] GitHub account (for CI/CD)
- [ ] Supabase project (Production tier)
- [ ] Clerk account (Production plan)
- [ ] Anthropic API access
- [ ] Axiom account for logging
- [ ] Upstash Redis (for rate limiting)
- [ ] Resend account (for emails)
- [ ] Google Cloud Console (for Gmail API)

### Domain & DNS
- [ ] Custom domain registered
- [ ] DNS configured to point to Vercel
- [ ] SSL certificate (handled by Vercel)

## Environment Configuration

### 1. Environment Variables Setup

Create environment variables in Vercel dashboard or use the Vercel CLI:

```bash
# Required Production Variables
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NODE_ENV production
vercel env add VERCEL_ENV production

# Database
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Authentication
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production

# AI Services
vercel env add ANTHROPIC_API_KEY production

# Gmail Integration
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GOOGLE_REFRESH_TOKEN production

# Monitoring
vercel env add AXIOM_TOKEN production
vercel env add AXIOM_DATASET production

# Rate Limiting
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production

# Email Service
vercel env add RESEND_API_KEY production

# Background Jobs
vercel env add INNGEST_EVENT_KEY production
vercel env add INNGEST_SIGNING_KEY production

# Security
vercel env add ENCRYPTION_KEY production # 32-character string
vercel env add CRON_SECRET production    # Random secret for cron jobs
```

### 2. Environment Validation

The platform includes automatic environment validation:
- Run `npm run env:validate` to check all required variables
- Production deployment will fail if critical variables are missing
- Security checks prevent using development keys in production

## Deployment Process

### 1. Automated Deployment (Recommended)

The platform includes GitHub Actions for automated deployment:

```yaml
# Triggered on push to main branch
- Security scanning and code quality checks
- Database migration validation  
- Preview deployment with testing
- Security testing with OWASP ZAP
- Production deployment with verification
- Post-deployment health checks
```

### 2. Manual Deployment

If needed, you can deploy manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Deploy to production
vercel --prod
```

## Database Setup

### 1. Supabase Configuration

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Run migrations
-- All migrations are in /infrastructure/supabase/migrations/
-- They will be applied automatically on deployment
```

### 2. Row Level Security (RLS)

All tables have RLS policies configured:
- Users can only access their organization's data
- Admin users have elevated permissions
- Service role bypasses RLS for system operations

### 3. Database Monitoring

- Real-time monitoring via Supabase dashboard
- Query performance tracking
- Automated backups (daily)
- Connection pooling configured

## Security Configuration

### 1. Security Headers

Automatically configured in middleware:
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)
- Referrer-Policy

### 2. Rate Limiting

- IP-based rate limiting with Upstash Redis
- Endpoint-specific limits (auth, API, AI services)
- Burst protection for expensive operations
- Adaptive limiting based on user behavior

### 3. Input Validation

- All inputs validated with Zod schemas
- SQL injection prevention
- XSS protection with input sanitization
- Sensitive data detection and redaction

### 4. Authentication & Authorization

- Clerk for user authentication
- Role-based permissions (Admin, Analyst, Viewer)
- Session security with IP/device tracking
- API key management for service-to-service auth

## Monitoring & Observability

### 1. Health Checks

Multiple health check endpoints:
- `/api/monitoring/health` - Full system health
- `/api/monitoring/health?type=readiness` - Deployment readiness
- `/api/monitoring/health?type=liveness` - Application liveness

### 2. Logging & Metrics

- Structured logging with Axiom
- Performance metrics tracking
- Business metrics and KPIs
- Error tracking with context
- Security event logging

### 3. Alerting

Automated alerts for:
- System errors and failures
- Security incidents
- Performance degradation
- Database issues
- API rate limit violations

### 4. Uptime Monitoring

Configure external monitoring:
- Health check endpoint monitoring
- SSL certificate monitoring
- DNS monitoring
- Performance monitoring

## Scheduled Jobs

### 1. Vercel Cron Jobs

Configured in `vercel.json`:
- Daily intelligence processing (6 AM UTC)
- Weekly database cleanup (Sunday 2 AM UTC)  
- Weekly security audit (Monday 1 AM UTC)

### 2. Background Processing

- Inngest for reliable background jobs
- Email processing workflows
- Company data enrichment
- Report generation

## Performance Optimization

### 1. Caching Strategy

- Static assets: 1 year cache
- API responses: 5 minutes with stale-while-revalidate
- Database queries: Intelligent caching with invalidation
- CDN distribution via Vercel Edge Network

### 2. Database Optimization

- Database indexes on all query columns
- Connection pooling with PgBouncer
- Query optimization with EXPLAIN analysis
- Automated vacuum and analyze

### 3. Function Configuration

- Extended timeouts for AI and report generation (5-15 minutes)
- Memory optimization for different function types
- Regional deployment for reduced latency

## Disaster Recovery

### 1. Database Backups

- Automated daily backups via Supabase
- Point-in-time recovery available
- Cross-region backup replication
- Monthly backup restoration testing

### 2. Application Recovery

- Vercel provides automatic rollback capabilities
- Blue-green deployment strategy
- Database migration rollback procedures
- Configuration backup and restore

### 3. Incident Response

- Automated incident detection and alerting
- Runbook for common issues
- Escalation procedures
- Post-incident review process

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] Security scan passed
- [ ] Performance tests passed
- [ ] Backup verification completed
- [ ] DNS records configured
- [ ] Domain SSL certificate ready

### Deployment
- [ ] GitHub Actions workflow triggered
- [ ] Preview deployment successful
- [ ] Security tests passed
- [ ] Production deployment successful
- [ ] Health checks passing
- [ ] Monitoring alerts configured

### Post-Deployment
- [ ] Application functionality verified
- [ ] Performance metrics within acceptable ranges
- [ ] Security scan clean
- [ ] Backup system operational
- [ ] Monitoring dashboards updated
- [ ] Documentation updated
- [ ] Team notification sent

## Troubleshooting

### Common Issues

**Deployment Failures:**
- Check environment variable configuration
- Verify database connectivity
- Review build logs for errors
- Check function timeout limits

**Performance Issues:**
- Monitor database query performance
- Check API rate limiting
- Review memory usage
- Analyze Core Web Vitals

**Security Alerts:**
- Review security logs in Axiom
- Check for unusual access patterns
- Verify SSL certificate status
- Review authentication logs

### Support Resources

- **Health Dashboard:** `/api/monitoring/health`
- **Security Audit:** `/api/security/audit`
- **Performance Metrics:** Axiom dashboard
- **Error Tracking:** Vercel Functions logs
- **Database Monitoring:** Supabase dashboard

## Maintenance

### Regular Tasks

**Daily:**
- Monitor health check status
- Review error logs and alerts
- Check system performance metrics

**Weekly:**
- Review security audit results
- Database performance analysis
- Backup verification
- Dependency updates

**Monthly:**
- Full security assessment
- Performance optimization review
- Disaster recovery testing
- Cost optimization analysis

## Scaling Considerations

### Traffic Growth
- Vercel automatically scales functions
- Database connection pooling handles concurrency
- Redis for rate limiting scales horizontally
- CDN caching reduces origin load

### Data Growth
- Database storage automatically scales
- Automated data archiving for old records
- Query optimization for large datasets
- Monitoring for storage costs

### Geographic Expansion
- Vercel Edge Network for global performance
- Regional database read replicas
- Localized content delivery
- Compliance with regional data laws

## Cost Optimization

### Monitoring
- Track function execution costs
- Database storage and compute usage
- API call costs (Anthropic, external services)
- CDN bandwidth usage

### Optimization Strategies
- Function cold start reduction
- Database query optimization
- Efficient caching strategies
- Background job optimization
- Resource usage monitoring

---

## Contact & Support

For deployment issues or questions:
- Technical Documentation: See `/docs` folder
- System Status: Check `/api/monitoring/health`
- Security Issues: Run security audit at `/api/security/audit`
- Performance Issues: Monitor Axiom dashboard# Deployment trigger Wed Aug 27 12:38:04 EDT 2025
