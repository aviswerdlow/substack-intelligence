# Issue #20: Set Up Monitoring and Error Tracking

**Priority:** 🟡 High
**Type:** Infrastructure
**Estimated Time:** 8-10 hours
**Sprint:** Operations Sprint

## Description
Implement comprehensive monitoring, error tracking, and alerting for production environment.

## Current State
- No error tracking
- No performance monitoring
- No alerting system

## Acceptance Criteria
- [ ] Error tracking configured (Sentry/Rollbar)
- [ ] Performance monitoring active
- [ ] Uptime monitoring setup
- [ ] Custom metrics tracking
- [ ] Alert rules defined
- [ ] Dashboard created
- [ ] Log aggregation configured
- [ ] Incident response playbook
- [ ] On-call rotation setup
- [ ] Status page implemented

## Dependencies
**Blocks:** Production operations
**Blocked by:** Issue #8 (Environment), Issue #16 (CI/CD)

## Technical Implementation
1. **Sentry Integration**
   ```typescript
   // sentry.client.config.ts
   import * as Sentry from '@sentry/nextjs';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
     integrations: [
       new Sentry.BrowserTracing(),
       new Sentry.Replay(),
     ],
     beforeSend(event, hint) {
       // Filter sensitive data
       return event;
     },
   });
   ```

2. **Custom Monitoring**
   ```typescript
   // lib/monitoring.ts
   export const metrics = {
     trackSignup: () => {
       Sentry.metrics.increment('user.signup');
     },
     trackPayment: (amount: number) => {
       Sentry.metrics.distribution('payment.amount', amount);
     },
     trackApiLatency: (endpoint: string, duration: number) => {
       Sentry.metrics.histogram(`api.latency.${endpoint}`, duration);
     },
   };
   ```

3. **Health Check Endpoint**
   ```typescript
   // app/api/health/route.ts
   export async function GET() {
     const checks = {
       database: await checkDatabase(),
       redis: await checkRedis(),
       stripe: await checkStripe(),
       email: await checkEmailService(),
     };

     const healthy = Object.values(checks).every(c => c.healthy);

     return NextResponse.json({
       status: healthy ? 'healthy' : 'degraded',
       timestamp: new Date().toISOString(),
       checks,
     }, {
       status: healthy ? 200 : 503,
     });
   }
   ```

4. **Alert Configuration**
   ```yaml
   # monitoring/alerts.yml
   alerts:
     - name: High Error Rate
       condition: error_rate > 1%
       duration: 5m
       severity: critical
       notify: ['slack', 'pagerduty']

     - name: Slow API Response
       condition: p95_latency > 2000ms
       duration: 10m
       severity: warning
       notify: ['slack']

     - name: Payment Failures
       condition: payment_failure_rate > 5%
       duration: 5m
       severity: critical
       notify: ['slack', 'email', 'pagerduty']
   ```

5. **Logging Strategy**
   ```typescript
   // lib/logger.ts
   import pino from 'pino';

   export const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     transport: {
       target: 'pino-pretty',
       options: {
         colorize: true,
       },
     },
     serializers: {
       req: (req) => ({
         method: req.method,
         url: req.url,
         userId: req.userId,
       }),
       err: pino.stdSerializers.err,
     },
   });
   ```

## Human Actions Required
- [ ] **CREATE:** Sentry/monitoring accounts
- [ ] **PROVIDE:** Monitoring service API keys
- [ ] **DEFINE:** Alert thresholds
- [ ] **SETUP:** On-call schedule
- [ ] **CONFIGURE:** Notification channels

## Labels
`monitoring`, `operations`, `infrastructure`, `observability`

## Related Files
- `/sentry.*.config.ts`
- `/lib/monitoring.ts`
- `/lib/logger.ts`
- `/app/api/health/`