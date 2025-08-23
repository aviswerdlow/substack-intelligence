# Debug Mode Security Safeguards

## Overview

This document outlines the comprehensive security measures implemented to prevent debug mode from being accidentally or maliciously enabled in production environments.

## Security Layers

### 1. Build-Time Validation ✅

**Location:** `/scripts/validate-build.js`

- **Pre-build Check:** Automatically runs before every build
- **Critical Failures:** Build stops if DEBUG=true in production
- **Validation Points:**
  - Debug mode status
  - Authentication keys (no test keys in production)
  - Encryption key presence and length
  - Required services configuration
  - SSL verification settings

**Usage:**
```bash
npm run build  # Automatically runs validation
npm run security:validate-build  # Manual validation
```

### 2. Environment Template Protection ✅

**Location:** `/scripts/setup-environment.js`

- **Forced Settings:** Production templates always set DEBUG=false
- **Template Enforcement:** Cannot generate production env with DEBUG=true
- **Staging Controls:** DEBUG defaults to false, can be overridden with timeout

### 3. Runtime Middleware Protection ✅

**Location:** `/apps/web/middleware.ts`

- **Request Blocking:** Returns 403 if DEBUG=true detected in production
- **Automatic Override:** Forces DEBUG=false even if somehow enabled
- **Incident Logging:** All attempts are logged as security incidents
- **Security Headers:** Adds comprehensive security headers to all responses

### 4. Monitoring & Alerting ✅

**Location:** `/apps/web/app/api/monitoring/debug-mode/route.ts`

- **Status Endpoint:** GET /api/monitoring/debug-mode
- **Audit Endpoint:** POST /api/monitoring/debug-mode
- **Real-time Alerts:** Critical incidents trigger immediate alerts
- **Admin Only:** Requires admin role to access monitoring

### 5. Audit Trail ✅

**Location:** `/apps/web/lib/db/debug-audit.ts`
**Database:** `debug_mode_audit` table

- **Complete History:** All debug mode changes are logged
- **Severity Levels:** 
  - Critical: Production attempts
  - Warning: Staging enablement
  - Info: Normal operations
- **Metadata Tracking:** User, IP, timestamp, reason
- **Query Support:** Filter by date, environment, type, user

### 6. Auto-Disable in Staging ✅

**Implementation:** Middleware timeout check

- **1-Hour Limit:** Debug mode auto-disables after 60 minutes in staging
- **Tracked Enablement:** Timestamp recorded when enabled
- **Automatic Cleanup:** No manual intervention required
- **Audit Entry:** Auto-disable events are logged

## Security Incident Response

### When DEBUG Mode is Attempted in Production:

1. **Immediate Block:** Request returns 403 Forbidden
2. **Audit Log:** Incident recorded with severity "critical"
3. **Console Alert:** Error logged to console
4. **Monitoring Alert:** Sent to Axiom (if configured)
5. **Email Alert:** Security team notified (if configured)
6. **Webhook:** External systems notified (if configured)

### Incident Data Captured:

```json
{
  "id": "uuid",
  "type": "BLOCKED",
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "production",
  "user_id": "user_123",
  "user_email": "user@example.com",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "reason": "Attempted to enable debug mode",
  "severity": "critical"
}
```

## Testing Verification

Run the comprehensive test suite:

```bash
npm test apps/web/__tests__/security/debug-mode.test.ts
```

### Test Coverage:

- ✅ Build validation failures
- ✅ Middleware request blocking
- ✅ Auto-disable timeout
- ✅ Audit logging with severity
- ✅ API endpoint security
- ✅ Environment template generation

## Configuration

### Environment Variables

```env
# Production (forced)
NODE_ENV=production
DEBUG=false  # Cannot be changed

# Staging (timeout enabled)
NODE_ENV=production
VERCEL_ENV=preview
DEBUG=false  # Can be true, auto-disables after 1 hour

# Development (flexible)
NODE_ENV=development
DEBUG=true   # Can be enabled for debugging
```

### Monitoring Configuration

```env
# Axiom for logging
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=security-incidents

# Email alerts
RESEND_API_KEY=re_...
SECURITY_ALERT_EMAIL=security@company.com

# Webhook for external systems
SECURITY_WEBHOOK_URL=https://alerts.company.com/webhook
```

## Deployment Checklist

Before deploying to production:

- [ ] Run `npm run security:validate-build`
- [ ] Verify DEBUG=false in production env file
- [ ] Check monitoring endpoints are accessible
- [ ] Confirm audit table is created in database
- [ ] Test alert notifications
- [ ] Review recent audit logs for attempts

## Manual Override (Emergency Only)

In the extremely rare case where debug mode must be enabled in production:

1. **DO NOT** attempt to change environment variables
2. **DO NOT** modify the code safeguards
3. **INSTEAD:** Use application-level debug features that don't rely on DEBUG env var
4. **ALWAYS:** Create an incident ticket documenting why this was needed

## Security Contact

For security concerns or to report vulnerabilities:
- Internal: security@company.com
- External: security-reports@company.com
- Emergency: Page on-call security engineer

## Compliance

This implementation addresses:
- SOC 2 Type II requirements for audit logging
- GDPR requirements for security incident tracking
- PCI DSS requirements for configuration management
- ISO 27001 controls for access management