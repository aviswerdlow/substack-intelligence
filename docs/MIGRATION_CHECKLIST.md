# Migration Execution Checklist

**Related Documents:**
- [Migration Plan](./MIGRATION_PLAN.md)
- [Migration Risks](./MIGRATION_RISKS.md)

This checklist serves as the execution guide for the migration. Check off items as they are completed.

---

## Pre-Migration Phase

### Decision Making
- [ ] **Decision: Migration Approach Selected**
  - [ ] Option A (Incremental Improvement) OR
  - [ ] Option B (Payload CMS Migration)
  - Decision Maker: ________________
  - Date: ________________

- [ ] **Decision: Acceptable Downtime Defined**
  - Zero downtime / Minimal / Extended: ________________
  - Date: ________________

- [ ] **Decision: Feature Prioritization Complete**
  - MVP features identified
  - v2 features deferred
  - Date: ________________

- [ ] **Decision: Resource Allocation Confirmed**
  - Team members assigned: ________________
  - Budget approved: $________________
  - Date: ________________

### Preparation (2-4 Weeks Before)
- [ ] All team members briefed on migration plan
- [ ] Migration timeline communicated to stakeholders
- [ ] Development environment set up
- [ ] Staging environment configured
- [ ] Monitoring tools configured (Axiom, Vercel, Uptime)
- [ ] Status page created
- [ ] Emergency contact list finalized
- [ ] External dependencies verified (Clerk, Anthropic, Gmail API)

---

## Option A: Incremental Improvement Checklist

### Phase 1: Foundation & Stabilization (Weeks 1-2)

#### Database Schema Completion
- [ ] Create `embedding_queue` table with indexes
- [ ] Create `batch_jobs` table with indexes
- [ ] Add `check_rls_enabled()` database function
- [ ] Enable pgvector extension
- [ ] Add vector column to companies table
- [ ] Create vector search index (ivfflat)
- [ ] Add performance optimization indexes
- [ ] Test all indexes in staging
- [ ] Run database migration in production
- [ ] Verify schema changes successful

#### Vector Search Implementation
- [ ] Implement OpenAI embeddings service
- [ ] Create batch embedding processor
- [ ] Add semantic search API endpoint
- [ ] Implement embedding queue processor
- [ ] Add rate limiting for OpenAI API
- [ ] Test semantic search functionality
- [ ] Generate embeddings for existing companies
- [ ] Deploy to production
- [ ] Verify vector search working

#### Production Monitoring & Logging
- [ ] Enhance Axiom logging with structured events
- [ ] Add performance metrics collection
- [ ] Implement error tracking and alerting
- [ ] Create health check dashboard
- [ ] Add database connection pooling monitoring
- [ ] Configure Vercel Analytics integration
- [ ] Set up alert thresholds
- [ ] Test alerts and notifications
- [ ] Deploy monitoring updates
- [ ] Verify monitoring working

**Phase 1 Checkpoint:**
- [ ] All database migrations successful
- [ ] Vector search operational
- [ ] Monitoring in place
- [ ] No critical issues
- [ ] Ready to proceed to Phase 2

---

### Phase 2: Feature Completion (Weeks 3-4)

#### Company Enrichment Service
- [ ] Choose data provider (Clearbit/Apollo/Custom)
- [ ] Integrate API (if using third-party)
- [ ] Implement enrichment service
- [ ] Add enrichment queue processing
- [ ] Implement rate limiting for external APIs
- [ ] Add data validation and quality scoring
- [ ] Create retry logic with backoff
- [ ] Add enrichment status UI
- [ ] Test enrichment service
- [ ] Deploy to production
- [ ] Run enrichment for existing companies

#### Advanced Analytics & Reporting
- [ ] Implement time-series trending analysis
- [ ] Add cohort analysis
- [ ] Create exportable dashboard widgets
- [ ] Add custom date range filtering
- [ ] Implement report scheduling with Inngest
- [ ] Add email delivery for scheduled reports
- [ ] Create report templates (weekly, monthly)
- [ ] Test all analytics features
- [ ] Deploy to production
- [ ] Verify analytics working

#### Email Processing Pipeline Optimization
- [ ] Implement parallel processing for email batches
- [ ] Add deduplication logic for Gmail message IDs
- [ ] Optimize Claude API rate limiting
- [ ] Add email processing metrics
- [ ] Implement partial failure handling
- [ ] Add processing resume capability
- [ ] Create email processing queue with priorities
- [ ] Test email processing pipeline
- [ ] Deploy to production
- [ ] Verify 2-3x performance improvement

**Phase 2 Checkpoint:**
- [ ] Enrichment service operational
- [ ] Analytics features complete
- [ ] Email processing optimized
- [ ] No critical issues
- [ ] Ready to proceed to Phase 3

---

### Phase 3: Performance & Scalability (Weeks 5-6)

#### Database Query Optimization
- [ ] Audit slow queries using Supabase tools
- [ ] Add database query caching with Redis
- [ ] Implement pagination for all list endpoints
- [ ] Add composite indexes for common queries
- [ ] Optimize `daily_intelligence` view (materialized)
- [ ] Add query result caching (5-minute TTL)
- [ ] Implement connection pooling configuration
- [ ] Test query performance
- [ ] Deploy optimizations
- [ ] Verify performance targets met (API <200ms, DB <50ms)

#### Frontend Performance Optimization
- [ ] Implement React Query data prefetching
- [ ] Add lazy loading for heavy components
- [ ] Optimize bundle size with dynamic imports
- [ ] Implement virtual scrolling for long lists
- [ ] Add service worker for offline capability
- [ ] Optimize image loading with Next.js Image
- [ ] Add loading skeletons
- [ ] Test frontend performance
- [ ] Deploy optimizations
- [ ] Verify Lighthouse score >90

#### Caching Strategy Implementation
- [ ] Implement multi-tier caching (Redis + React Query)
- [ ] Add cache invalidation logic
- [ ] Create caching configuration per endpoint
- [ ] Add cache hit/miss metrics
- [ ] Implement stale-while-revalidate pattern
- [ ] Add cache warming for common queries
- [ ] Test caching behavior
- [ ] Deploy caching strategy
- [ ] Monitor cache performance

**Phase 3 Checkpoint:**
- [ ] Performance targets met (API <200ms p95)
- [ ] Frontend performance excellent (Lighthouse >90)
- [ ] Caching working correctly
- [ ] No critical issues
- [ ] Ready to proceed to Phase 4

---

### Phase 4: Production Readiness (Weeks 7-8)

#### Security Hardening
- [ ] Complete security audit of all API endpoints
- [ ] Implement request validation with Zod schemas
- [ ] Add rate limiting to all public endpoints
- [ ] Implement CSRF protection for mutations
- [ ] Add input sanitization for all user inputs
- [ ] Configure WAF rules in Vercel
- [ ] Add security headers audit and enhancement
- [ ] Implement API key rotation procedures
- [ ] Add audit logging for sensitive operations
- [ ] Verify all RLS policies functional
- [ ] Test security measures
- [ ] Security audit passed

#### Testing & Quality Assurance
- [ ] Increase unit test coverage to >80%
- [ ] Add integration tests for critical paths
- [ ] Create E2E test suite for user workflows
- [ ] Add performance testing with k6/Artillery
- [ ] Implement load testing (1000 req/s baseline)
- [ ] Add database migration testing
- [ ] Create smoke tests for deployment
- [ ] Add visual regression testing (Percy/Chromatic)
- [ ] Run full test suite
- [ ] All tests passing

#### Deployment & DevOps
- [ ] Set up staging environment (Vercel preview)
- [ ] Configure CI/CD pipeline with GitHub Actions
- [ ] Add automated testing in CI pipeline
- [ ] Implement database backup strategy
- [ ] Create deployment runbook
- [ ] Add rollback procedures documentation
- [ ] Configure monitoring alerts
- [ ] Add deployment notifications
- [ ] Test CI/CD pipeline
- [ ] Test rollback procedure

**Phase 4 Checkpoint:**
- [ ] Security audit passed
- [ ] Test coverage >80%
- [ ] CI/CD pipeline operational
- [ ] Rollback tested
- [ ] No critical issues
- [ ] Ready for Phase 5

---

### Phase 5: Migration Execution & Validation (Week 8)

#### Pre-Migration (1-2 days before)
- [ ] **Create database backups:**
  - [ ] Supabase automated backup verified
  - [ ] Manual pg_dump backup created
  - [ ] Backup uploaded to S3
  - [ ] Backup restoration tested
- [ ] Final staging environment test
- [ ] Team availability confirmed
- [ ] Users notified (email sent)
- [ ] Status page prepared
- [ ] Monitoring dashboards ready
- [ ] **Go/No-Go Decision:** ________________ (Date/Time)

#### Migration Day

**Pre-Migration (0-30 minutes):**
- [ ] Final database backup created
- [ ] Backup verified restorable
- [ ] Enable maintenance mode (if needed)
- [ ] User notification sent ("Migration starting")
- [ ] Team war room opened
- [ ] Monitoring active

**Execution (30 minutes - 2 hours):**
- [ ] Deploy new code to production
- [ ] Run database migrations
- [ ] Verify migrations successful
- [ ] Run data integrity checks
- [ ] Generate embeddings for all companies
- [ ] Run enrichment batch jobs (if applicable)

**Validation (2-4 hours):**
- [ ] Smoke tests passed
- [ ] Data validation checks passed:
  - [ ] Row counts match expected
  - [ ] No orphaned records
  - [ ] All relationships intact
  - [ ] RLS policies working
- [ ] Performance checks passed:
  - [ ] API response times <200ms (p95)
  - [ ] Database queries <50ms (p95)
  - [ ] Error rate <0.1%
- [ ] Critical user journeys tested:
  - [ ] Login/signup
  - [ ] Dashboard loads
  - [ ] Companies display correctly
  - [ ] Email sync works
  - [ ] Reports generate

**Go-Live (4-5 hours):**
- [ ] Disable maintenance mode
- [ ] User notification sent ("Migration complete")
- [ ] Monitor error rates (target: <0.1%)
- [ ] Monitor performance metrics
- [ ] Check user feedback channels
- [ ] Address any immediate issues

**Post-Migration Monitoring (24 hours):**
- [ ] Error rates normal
- [ ] Performance stable
- [ ] No user complaints
- [ ] Support tickets reviewed
- [ ] Data integrity verified
- [ ] Backups can be removed after 2 weeks

**Phase 5 Complete:**
- [ ] Migration successful
- [ ] All features working
- [ ] Users satisfied
- [ ] Post-mortem scheduled

---

## Option B: Payload CMS Migration Checklist

### Phase 1: Payload CMS Setup & POC (Weeks 1-2)

#### Environment Setup
- [ ] Install Payload CMS in `/apps/cms/`
- [ ] Configure PostgreSQL connection
- [ ] Set up Payload admin UI
- [ ] Configure authentication (decide: Payload auth vs Clerk)
- [ ] Set up development environment
- [ ] Configure TypeScript types generation
- [ ] Test local Payload instance
- [ ] Deploy Payload to staging

#### Data Model Migration
- [ ] Define Emails collection
- [ ] Define Companies collection
- [ ] Define Company Mentions collection
- [ ] Define User Settings collection
- [ ] Define Todos collection
- [ ] Configure relationships between collections
- [ ] Add custom validation logic
- [ ] Set up access control for multi-tenant isolation
- [ ] Test collections in Payload admin
- [ ] Generate TypeScript types

#### Authentication Migration
- [ ] **Decision: Auth strategy** (Payload auth vs Keep Clerk)
- [ ] If migrating to Payload auth:
  - [ ] Create Users collection
  - [ ] Migrate user data from Clerk
  - [ ] Update login/signup flows
  - [ ] Configure JWT tokens and sessions
  - [ ] Update middleware
  - [ ] Test OAuth flows (Gmail)
- [ ] If keeping Clerk:
  - [ ] Implement Clerk-Payload integration
  - [ ] Custom auth strategy in Payload
  - [ ] Test integration
- [ ] Verify authentication working

**Phase 1 Checkpoint:**
- [ ] Payload CMS operational
- [ ] All collections defined
- [ ] Authentication working
- [ ] No critical issues
- [ ] Ready for Phase 2

---

### Phase 2: Data Migration (Weeks 3-4)

#### Migration Scripts Development
- [ ] Create data export scripts from Supabase
- [ ] Create data transformation scripts
- [ ] Implement data validation and integrity checks
- [ ] Add error handling and retry logic
- [ ] Create migration progress tracking
- [ ] Implement rollback capabilities
- [ ] Create migration for Users
- [ ] Create migration for Emails
- [ ] Create migration for Companies
- [ ] Create migration for Company Mentions
- [ ] Create migration for User Settings
- [ ] Create migration for User Todos
- [ ] Test migrations with dry-run
- [ ] Review dry-run results

#### Data Migration Execution
- [ ] **Backup Supabase database (3 copies)**
- [ ] Run migrations in staging with dry-run
- [ ] Validate dry-run results
- [ ] Fix any issues found
- [ ] Execute actual migration in staging
- [ ] Validate migrated data:
  - [ ] Row counts match
  - [ ] Relationships intact
  - [ ] Data types correct
  - [ ] No corruption detected
- [ ] Document migration results
- [ ] Address any issues

**Phase 2 Checkpoint:**
- [ ] All data migrated to Payload (staging)
- [ ] Data validation passed
- [ ] No data loss
- [ ] No critical issues
- [ ] Ready for Phase 3

---

### Phase 3: API & Frontend Migration (Weeks 5-7)

#### API Layer Refactoring
- [ ] Replace Supabase queries with Payload API
- [ ] Migrate `/api/companies/*` endpoints
- [ ] Migrate `/api/analytics/*` endpoints
- [ ] Migrate `/api/emails/*` endpoints
- [ ] Migrate `/api/reports/*` endpoints
- [ ] Migrate `/api/pipeline/*` endpoints
- [ ] Update authentication middleware
- [ ] Add Payload-specific error handling
- [ ] Update API response formats
- [ ] Add API versioning
- [ ] Test all API endpoints
- [ ] Update API documentation

#### Frontend Component Updates
- [ ] Update React Query hooks
- [ ] Replace Supabase client calls with Payload REST API
- [ ] Update TypeScript types
- [ ] Migrate real-time subscriptions (if applicable)
- [ ] Update form submissions and mutations
- [ ] Update all dashboard components
- [ ] Update company detail pages
- [ ] Update analytics pages
- [ ] Update settings pages
- [ ] Test all user interactions
- [ ] Fix any UI bugs

#### Admin UI Integration
- [ ] Integrate Payload admin UI at `/admin`
- [ ] Configure custom dashboard components
- [ ] Add custom actions (enrichment triggers)
- [ ] Configure user roles and permissions
- [ ] Customize admin UI theme
- [ ] Add custom field components
- [ ] Test admin UI functionality
- [ ] Train team on admin UI

**Phase 3 Checkpoint:**
- [ ] All APIs migrated to Payload
- [ ] Frontend fully functional with Payload
- [ ] Admin UI operational
- [ ] No critical issues
- [ ] Ready for Phase 4

---

### Phase 4: Service Layer Migration (Weeks 8-10)

#### Email Ingestion Service
- [ ] Update GmailConnector to use Payload API
- [ ] Migrate email storage to Payload collections
- [ ] Update email processing pipeline
- [ ] Test Gmail OAuth integration
- [ ] Validate email sync functionality
- [ ] Test error handling

#### AI/ML Services
- [ ] Update Claude extraction service for Payload
- [ ] Migrate embedding generation to Payload hooks
- [ ] Update company enrichment service
- [ ] Test AI service integrations
- [ ] Verify all AI features working

#### Background Jobs Migration
- [ ] Migrate Inngest jobs to Payload hooks
- [ ] Update cron job implementations
- [ ] Test scheduled report generation
- [ ] Validate background processing
- [ ] Test job failure handling

**Phase 4 Checkpoint:**
- [ ] All services migrated
- [ ] Email ingestion working
- [ ] AI services functional
- [ ] Background jobs running
- [ ] No critical issues
- [ ] Ready for Phase 5

---

### Phase 5: Testing & Cutover (Weeks 11-12)

#### Comprehensive Testing
- [ ] Run full regression testing suite
- [ ] Perform load testing on Payload API
- [ ] Test all user workflows end-to-end
- [ ] Security testing and penetration testing
- [ ] Performance benchmarking
- [ ] User acceptance testing (UAT)
- [ ] Fix critical issues found
- [ ] Retest after fixes

#### Parallel Running
- [ ] Set up feature flags for gradual rollout
- [ ] Configure traffic splitting (10% Payload)
- [ ] Monitor both systems
- [ ] Compare results and performance
- [ ] Increase traffic to 25%
- [ ] Monitor and validate
- [ ] Increase traffic to 50%
- [ ] Monitor and validate
- [ ] Increase traffic to 100%

#### Production Cutover
- [ ] **Create final database backups (3 copies)**
- [ ] Final production data migration
- [ ] Switch all traffic to Payload system
- [ ] Monitor system health and performance
- [ ] Validate all features working correctly
- [ ] Keep Supabase as read-only backup
- [ ] Monitor for 2 weeks
- [ ] Decommission Supabase (after 2 weeks)

**Phase 5 Checkpoint:**
- [ ] Payload CMS fully operational
- [ ] All traffic on new system
- [ ] No critical issues
- [ ] Users satisfied
- [ ] Ready for Phase 6

---

### Phase 6: Optimization & Cleanup (Weeks 13-14)

#### Performance Optimization
- [ ] Optimize Payload queries and indexes
- [ ] Implement caching strategies
- [ ] Fine-tune database connection pooling
- [ ] Optimize admin UI performance
- [ ] Add CDN for static assets
- [ ] Monitor and adjust

#### Code Cleanup
- [ ] Remove Supabase client code
- [ ] Remove unused dependencies
- [ ] Update documentation
- [ ] Clean up old migration scripts
- [ ] Archive old API routes
- [ ] Final code review

**Phase 6 Complete:**
- [ ] Migration fully complete
- [ ] System optimized
- [ ] Code clean
- [ ] Documentation updated

---

## Post-Migration Checklist (Both Options)

### Immediately After (0-2 hours)
- [ ] Smoke tests passed
- [ ] Critical user journeys tested
- [ ] Data validation completed
- [ ] Error rates normal (<0.1%)
- [ ] Performance metrics acceptable
- [ ] Users notified of completion
- [ ] Team debriefed

### First 24 Hours
- [ ] Monitor error rates continuously
- [ ] Check user feedback
- [ ] Review support tickets
- [ ] Data integrity checks
- [ ] Performance monitoring
- [ ] Address any urgent issues

### First Week
- [ ] Full regression testing
- [ ] User feedback collection
- [ ] Post-mortem meeting scheduled
- [ ] Post-mortem completed
- [ ] Documentation updated
- [ ] Team retrospective on migration
- [ ] Lessons learned documented

### First Month
- [ ] Long-term performance monitoring
- [ ] Cost analysis completed
- [ ] User satisfaction survey sent
- [ ] Lessons learned shared with organization
- [ ] Decommission old system (if applicable)
- [ ] Final migration report created

---

## Rollback Decision Point

**Execute rollback if:**
- [ ] Critical data loss detected
- [ ] Security breach or vulnerability exposed
- [ ] System completely unavailable for >2 hours
- [ ] Data corruption affecting >10% of records
- [ ] >50% of core features broken
- [ ] Error rate >5% for >1 hour

**Rollback Procedure:**
See [Migration Risks: Rollback Procedures](./MIGRATION_RISKS.md#rollback-procedures)

---

## Sign-offs

### Pre-Migration Approval
- [ ] Engineering Lead: ________________ Date: ________
- [ ] Product Owner: ________________ Date: ________
- [ ] CTO/VP Engineering: ________________ Date: ________

### Go-Live Approval
- [ ] Engineering Lead: ________________ Date: ________
- [ ] Product Owner: ________________ Date: ________
- [ ] On-call Engineer: ________________ Date: ________

### Post-Migration Completion
- [ ] Engineering Lead: ________________ Date: ________
- [ ] Product Owner: ________________ Date: ________
- [ ] Migration successful and complete

---

**Checklist Version:** 1.0
**Last Updated:** 2025-11-02
**Next Review:** Before migration starts
