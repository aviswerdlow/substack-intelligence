# API Routes Inventory

**Generated:** 2025-11-02
**Framework:** Next.js 14 App Router
**Base Path:** `/api`
**Total Routes:** 100+

## Table of Contents

- [Overview](#overview)
- [Route Categories](#route-categories)
- [Analytics Routes](#analytics-routes)
- [Authentication Routes](#authentication-routes)
- [Companies Routes](#companies-routes)
- [Configuration Routes](#configuration-routes)
- [Cron Jobs](#cron-jobs)
- [Debug Routes](#debug-routes)
- [Email Routes](#email-routes)
- [Health Check Routes](#health-check-routes)
- [Intelligence Routes](#intelligence-routes)
- [Monitoring Routes](#monitoring-routes)
- [Pipeline Routes](#pipeline-routes)
- [Reports Routes](#reports-routes)
- [Search Routes](#search-routes)
- [Security Routes](#security-routes)
- [Settings Routes](#settings-routes)
- [Setup Routes](#setup-routes)
- [Test Routes](#test-routes)
- [Todos Routes](#todos-routes)
- [Trigger Routes](#trigger-routes)
- [Webhooks Routes](#webhooks-routes)
- [Route Security](#route-security)
- [Performance Considerations](#performance-considerations)

---

## Overview

The Substack Intelligence platform exposes 100+ API routes built with Next.js 14 App Router. All routes follow RESTful conventions and return JSON responses (unless specified otherwise).

**Route Structure:**
```
apps/web/app/api/
├── analytics/         # Analytics & metrics
├── auth/             # Authentication & OAuth
├── companies/        # Company management
├── config/           # Configuration validation
├── cron/             # Scheduled jobs
├── debug/            # Development debugging
├── emails/           # Email management
├── health/           # Health checks
├── intelligence/     # Intelligence generation
├── monitoring/       # Observability
├── pipeline/         # Data pipeline
├── reports/          # Report generation
├── search/           # Search endpoints
├── security/         # Security audits
├── settings/         # User settings
├── setup/            # Initial setup
├── test/             # Testing endpoints
├── todos/            # Todo management
├── trigger/          # Manual triggers
└── webhooks/         # Webhook handlers
```

---

## Route Categories

### Summary Table

| Category | Route Count | Purpose | Authentication |
|----------|-------------|---------|----------------|
| Analytics | 7 | Metrics, distributions, trends | Required |
| Authentication | 9 | Gmail OAuth, token management | Varies |
| Companies | 2 | Company CRUD, similarity search | Required |
| Configuration | 2 | Config validation | Public |
| Cron | 4 | Scheduled background jobs | Vercel Cron Token |
| Debug | 6 | Development debugging | Development only |
| Emails | 5 | Email processing, stats | Required |
| Health | 2 | System health checks | Public |
| Intelligence | 1 | AI intelligence generation | Required |
| Monitoring | 6 | Telemetry & observability | Mixed |
| Pipeline | 6 | Data processing pipeline | Required/Cron |
| Reports | 5 | Report generation & delivery | Required |
| Search | 1 | Semantic search | Required |
| Security | 1 | Security audits | Admin only |
| Settings | 4 | User preferences | Required |
| Setup | 1 | User onboarding | Required |
| Test | 18 | Development testing | Development only |
| Todos | 6 | Todo management | Required |
| Trigger | 1 | Manual job triggers | Admin only |
| Webhooks | 1 | External webhooks | Webhook signature |

**Total:** ~100 routes

---

## Analytics Routes

**Base Path:** `/api/analytics`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/analytics/distributions` | GET | Company distributions by funding/industry | JSON |
| `/analytics/export` | GET, POST | Export analytics data | JSON/CSV |
| `/analytics/metrics` | GET | Dashboard metrics summary | JSON |
| `/analytics/newsletters` | GET | Newsletter-specific analytics | JSON |
| `/analytics/recent-companies` | GET | Recently detected companies | JSON |
| `/analytics/top-companies` | GET | Top companies by mentions | JSON |
| `/analytics/trends` | GET | Trending companies over time | JSON |

**Authentication:** Required (Clerk JWT)

**Query Parameters:**
- `timeframe`: `7d`, `30d`, `90d`, `all`
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset
- `format`: `json`, `csv` (export only)

**Example Response:**
```json
{
  "metrics": {
    "totalCompanies": 342,
    "newCompaniesThisWeek": 23,
    "totalMentions": 1245,
    "averageConfidence": 0.87
  },
  "topCompanies": [
    {
      "id": "uuid",
      "name": "Example Corp",
      "mentionCount": 15,
      "sentiment": "positive",
      "confidence": 0.92
    }
  ]
}
```

---

## Authentication Routes

**Base Path:** `/api/auth`

### Gmail OAuth Flow

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/auth/gmail` | GET | Initiate Gmail OAuth flow | Redirect |
| `/auth/gmail/callback` | GET | OAuth callback handler | Redirect |
| `/auth/gmail/status` | GET | Check Gmail connection status | JSON |
| `/auth/gmail/mark-connected` | POST | Mark Gmail as connected | JSON |
| `/auth/gmail/health` | GET | Gmail connection health check | JSON |
| `/auth/gmail/test` | GET | Test Gmail connection | JSON |
| `/auth/gmail/mock` | GET | Mock OAuth (dev only) | JSON |
| `/auth/gmail/debug` | GET | OAuth debug info (dev only) | JSON |

### Token Management

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/auth/google-token` | POST | Refresh Google access token | JSON |

**OAuth Flow:**
```
1. User → /auth/gmail
2. Redirect → Google OAuth consent
3. Google → /auth/gmail/callback?code=...
4. Server → Exchange code for tokens
5. Store → user_settings.gmail_refresh_token
6. Redirect → Dashboard with success message
```

**Status Response:**
```json
{
  "connected": true,
  "email": "user@gmail.com",
  "lastSync": "2025-11-02T10:30:00Z",
  "tokenExpiry": "2025-11-02T11:30:00Z"
}
```

---

## Companies Routes

**Base Path:** `/api/companies`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/companies` | GET, POST | List/create companies | JSON |
| `/companies/[id]/similar` | GET | Find similar companies (vector search) | JSON |

**GET /companies Query Parameters:**
- `search`: Full-text search
- `funding`: Filter by funding status
- `industry`: Filter by industry
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset

**POST /companies Body:**
```json
{
  "name": "Example Corp",
  "description": "An example company",
  "website": "https://example.com",
  "industry": ["saas", "b2b"],
  "funding_status": "series-a"
}
```

**GET /companies/[id]/similar Query Parameters:**
- `threshold`: Similarity threshold 0-1 (default: 0.8)
- `limit`: Number of similar companies (default: 5)

---

## Configuration Routes

**Base Path:** `/api/config`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/config/validate` | GET | Validate environment configuration | JSON |
| `/config/validate/stats` | GET | Configuration statistics | JSON |

**Public Access** (no authentication)

**Response:**
```json
{
  "valid": true,
  "services": {
    "supabase": "connected",
    "anthropic": "connected",
    "clerk": "connected",
    "upstash": "connected"
  },
  "warnings": [],
  "errors": []
}
```

---

## Cron Jobs

**Base Path:** `/api/cron`

| Route | Methods | Purpose | Schedule |
|-------|---------|---------|----------|
| `/cron/cleanup` | GET | Clean up old data | Daily 2am UTC |
| `/cron/daily-intelligence` | POST | Generate daily reports | Daily 6am UTC |
| `/cron/process-emails` | POST | Batch process emails | Every 15 min |
| `/cron/security-audit` | GET | Run security audit | Daily 3am UTC |

**Authentication:** Vercel Cron secret header

**Vercel Configuration:**
```json
{
  "crons": [
    {
      "path": "/api/cron/process-emails",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/daily-intelligence",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/security-audit",
      "schedule": "0 3 * * *"
    }
  ]
}
```

---

## Debug Routes

**Base Path:** `/api/debug*`

| Route | Methods | Purpose | Environment |
|-------|---------|---------|-------------|
| `/debug/pipeline` | GET | Pipeline status debug | Development |
| `/debug-clerk` | GET | Clerk auth debug info | Development |
| `/debug-oauth` | GET | OAuth debug info | Development |
| `/dev/oauth-debug` | GET | OAuth debugging tool | Development |
| `/dev/oauth-debug/test` | GET | Test OAuth flow | Development |

**⚠️ Disabled in Production**

---

## Email Routes

**Base Path:** `/api/emails`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/emails` | GET | List emails | JSON |
| `/emails/extract` | POST | Extract companies from email | JSON |
| `/emails/export` | GET | Export emails data | JSON/CSV |
| `/emails/reprocess` | POST | Reprocess failed emails | JSON |
| `/emails/stats` | GET | Email statistics | JSON |

**GET /emails Query Parameters:**
- `status`: Filter by processing status
- `newsletter`: Filter by newsletter name
- `from`: Start date (ISO 8601)
- `to`: End date (ISO 8601)
- `limit`: Results per page
- `offset`: Pagination offset

**POST /emails/extract Body:**
```json
{
  "emailId": "uuid",
  "forceReprocess": false
}
```

**Stats Response:**
```json
{
  "total": 1523,
  "processed": 1490,
  "pending": 25,
  "failed": 8,
  "companiesExtracted": 342,
  "averageConfidence": 0.85
}
```

---

## Health Check Routes

**Base Path:** `/api/health`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/health` | GET | System health check | JSON |
| `/health/oauth` | GET | OAuth health check | JSON |

**Public Access**

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-02T10:30:00Z",
  "services": {
    "database": "up",
    "ai": "up",
    "cache": "up"
  },
  "version": "1.0.0"
}
```

---

## Intelligence Routes

**Base Path:** `/api/intelligence`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/intelligence` | POST | Generate intelligence report | JSON |

**POST Body:**
```json
{
  "companyId": "uuid",
  "includeCompetitors": true,
  "includeTrends": true
}
```

**Response:**
```json
{
  "company": { /* company data */ },
  "intelligence": "AI-generated intelligence summary...",
  "competitors": [/* similar companies */],
  "trends": [/* trend analysis */],
  "confidence": 0.89
}
```

---

## Monitoring Routes

**Base Path:** `/api/monitoring`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/monitoring/error` | POST | Log client errors | JSON |
| `/monitoring/health` | GET | Monitoring health status | JSON |
| `/monitoring/interaction` | POST | Log user interactions | JSON |
| `/monitoring/pageview` | POST | Log page views | JSON |
| `/monitoring/performance` | POST | Log performance metrics | JSON |
| `/monitoring/system-status` | GET | System status summary | JSON |

**Authentication:** Mixed (public POST for telemetry, authenticated GET)

**Uses:** Axiom for log aggregation

---

## Pipeline Routes

**Base Path:** `/api/pipeline`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/pipeline/health` | GET | Pipeline health check | JSON |
| `/pipeline/process-background` | POST | Background email processing | JSON |
| `/pipeline/status` | GET | Pipeline status | JSON |
| `/pipeline/sync` | POST | Sync emails from Gmail | JSON/Stream |
| `/pipeline/sync/stream` | POST | Streaming email sync | SSE |
| `/pipeline/unlock` | POST | Unlock stuck pipeline | JSON |

**Sync Response (JSON):**
```json
{
  "success": true,
  "emailsProcessed": 15,
  "companiesExtracted": 8,
  "errors": []
}
```

**Sync Response (Stream):**
```
data: {"type":"progress","processed":5,"total":15}
data: {"type":"company","name":"Example Corp"}
data: {"type":"complete","total":15}
```

---

## Reports Routes

**Base Path:** `/api/reports`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/reports` | GET, POST | List/create reports | JSON |
| `/reports/[reportId]/pdf` | GET | Download report PDF | PDF |
| `/reports/generate` | POST | Generate new report | JSON |
| `/reports/schedules` | GET, POST | Manage report schedules | JSON |
| `/reports/schedules/[scheduleId]` | GET, PUT, DELETE | Schedule CRUD | JSON |

**POST /reports/generate Body:**
```json
{
  "type": "daily",
  "startDate": "2025-11-01",
  "endDate": "2025-11-02",
  "format": "pdf",
  "email": true
}
```

**Report Schedule:**
```json
{
  "frequency": "daily",
  "time": "06:00",
  "timezone": "America/New_York",
  "recipients": ["user@example.com"],
  "includePdf": true
}
```

---

## Search Routes

**Base Path:** `/api/search`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/search/semantic` | POST | Semantic search (vector + text) | JSON |

**POST Body:**
```json
{
  "query": "AI healthcare startups",
  "limit": 20,
  "threshold": 0.7,
  "filters": {
    "funding": ["seed", "series-a"],
    "industry": ["healthcare"]
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "company": { /* company data */ },
      "similarity": 0.92,
      "relevance": 0.88
    }
  ],
  "total": 45
}
```

---

## Security Routes

**Base Path:** `/api/security`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/security/audit` | POST | Run security audit | JSON |

**Authentication:** Admin only

**Response:**
```json
{
  "vulnerabilities": [
    {
      "severity": "medium",
      "package": "package-name",
      "issue": "Known vulnerability",
      "recommendation": "Upgrade to version X"
    }
  ],
  "summary": {
    "critical": 0,
    "high": 1,
    "medium": 3,
    "low": 5
  }
}
```

---

## Settings Routes

**Base Path:** `/api/settings`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/settings` | GET, PUT | User settings CRUD | JSON |
| `/settings/api-keys` | GET, POST, DELETE | API key management | JSON |
| `/settings/webhooks` | GET, POST, PUT, DELETE | Webhook management | JSON |
| `/settings/validate-api-key` | POST | Validate API key | JSON |

**Settings Structure:**
```json
{
  "account_settings": {},
  "newsletter_settings": {
    "autoSubscribe": true,
    "digestFrequency": "weekly"
  },
  "ai_settings": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  },
  "report_settings": {
    "defaultFormat": "pdf",
    "autoGenerate": {
      "daily": false,
      "weekly": true
    }
  }
}
```

---

## Setup Routes

**Base Path:** `/api/setup`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/setup/user-settings` | POST | Initialize user settings | JSON |

**Called during onboarding flow**

---

## Test Routes

**Base Path:** `/api/test*`

**⚠️ Development/Staging Only**

| Route | Methods | Purpose |
|-------|---------|---------|
| `/test/all-companies` | GET | List all companies (no pagination) |
| `/test/anthropic` | POST | Test Anthropic API |
| `/test/cleanup` | POST | Clean test data |
| `/test/companies` | GET | Test company queries |
| `/test/create-company` | POST | Create test company |
| `/test/extract` | POST | Test extraction |
| `/test/extract-all` | POST | Extract all pending |
| `/test/extract-batch` | POST | Batch extraction test |
| `/test/find-company-emails` | GET | Find emails for company |
| `/test/gmail` | GET | Test Gmail API |
| `/test/intelligence` | POST | Test intelligence generation |
| `/test/reset` | POST | Reset test data |
| `/test/reset-block` | POST | Reset rate limit blocks |
| `/test/reset-emails` | POST | Reset email status |
| `/test/reset-lenny` | POST | Reset specific user data |
| `/test/single-extract` | POST | Single extraction test |
| `/test-anthropic` | GET | Anthropic connection test |
| `/test-metrics` | GET | Test metrics endpoint |

---

## Todos Routes

**Base Path:** `/api/todos`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/todos` | GET, POST | List/create todos | JSON |
| `/todos/[id]` | GET, PUT, DELETE | Todo CRUD | JSON |
| `/todos/[id]/toggle` | POST | Toggle completion | JSON |
| `/todos/batch` | POST | Batch operations | JSON |
| `/todos/reorder` | POST | Reorder todos | JSON |
| `/todos/stats` | GET | Todo statistics | JSON |

**Todo Object:**
```json
{
  "id": "uuid",
  "title": "Complete audit documentation",
  "description": "...",
  "priority": "high",
  "completed": false,
  "dueDate": "2025-11-05T00:00:00Z",
  "category": "documentation",
  "tags": ["audit", "high-priority"],
  "position": 0
}
```

---

## Trigger Routes

**Base Path:** `/api/trigger`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/trigger/intelligence` | POST | Manually trigger intelligence job | JSON |

**Authentication:** Admin only

---

## Webhooks Routes

**Base Path:** `/api/webhooks`

| Route | Methods | Purpose | Response Type |
|-------|---------|---------|---------------|
| `/webhooks/clerk` | POST | Clerk webhook handler | JSON |

**Authentication:** Svix signature verification

**Supported Events:**
- `user.created`
- `user.updated`
- `user.deleted`
- `session.created`
- `session.ended`

---

## Route Security

### Authentication Patterns

**1. Public Routes (No Auth):**
- Health checks
- Configuration validation

**2. User Routes (Clerk JWT):**
- All `/api/analytics/*`
- All `/api/companies/*`
- All `/api/emails/*`
- All `/api/reports/*`
- All `/api/settings/*`
- All `/api/todos/*`

**3. Admin Routes (Role Check):**
- `/api/security/audit`
- `/api/trigger/*`

**4. Cron Routes (Vercel Secret):**
- All `/api/cron/*`

**5. Webhook Routes (Signature Verification):**
- `/api/webhooks/clerk`

**6. Development Only:**
- All `/api/test/*`
- All `/api/debug/*`

### Rate Limiting

**Implemented via Upstash:**
- Global: 100 requests/minute per IP
- User: 60 requests/minute per user
- AI endpoints: 10 requests/minute per user
- Sync endpoints: 5 requests/hour per user

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699999999
```

### CORS Configuration

**Allowed Origins:**
- Production: `https://substack-intelligence.vercel.app`
- Staging: `https://substack-intelligence-*.vercel.app`
- Development: `http://localhost:3000`

---

## Performance Considerations

### Caching Strategy

**Static Routes (60s cache):**
- Configuration endpoints
- Health checks

**Dynamic Routes (No cache):**
- User-specific data
- Real-time analytics
- Streaming endpoints

### Optimization Tips

1. **Use streaming for long-running operations:**
   - `/api/pipeline/sync/stream`

2. **Implement pagination:**
   - All list endpoints support `limit` and `offset`

3. **Background processing:**
   - Use `/api/pipeline/process-background` for async jobs

4. **Batch operations:**
   - Use `/api/todos/batch` instead of multiple requests

---

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: name",
    "details": {
      "field": "name",
      "expected": "string"
    }
  },
  "requestId": "req_abc123"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | External service down |

---

## API Testing

### Testing Strategy

**Unit Tests:**
- Route handler logic
- Input validation
- Error handling

**Integration Tests:**
- Database operations
- External API calls
- Authentication flows

**E2E Tests:**
- Critical user journeys
- OAuth flows
- Report generation

**Test Files:**
- `apps/web/app/api/__tests__/pipeline-integration.test.ts`
- `apps/web/app/api/pipeline/sync/route.test.ts`

---

## API Documentation

### OpenAPI Specification

**Status:** Not yet implemented

**Recommendation:** Generate OpenAPI 3.0 spec from route definitions

**Tools:**
- next-swagger-doc
- ts-to-openapi
- Manual documentation

### Client SDKs

**Recommendation:** Generate TypeScript SDK from OpenAPI spec

**Potential Libraries:**
- openapi-typescript
- swagger-typescript-api

---

## Migration Notes

### Next.js 14 App Router

**All routes use new App Router pattern:**
```typescript
// route.ts
export async function GET(request: Request) {
  return Response.json({ data: "..." });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ success: true });
}
```

**Dynamic Routes:**
```
/api/companies/[id]/route.ts
/api/reports/[reportId]/pdf/route.ts
/api/todos/[id]/toggle/route.ts
```

---

## Future API Enhancements

### Planned Routes

1. **GraphQL Endpoint:** `/api/graphql`
2. **Bulk Operations:** `/api/bulk/*`
3. **WebSocket:** `/api/ws` for real-time updates
4. **Admin Dashboard:** `/api/admin/*`
5. **Public API:** `/api/v1/public/*` with API keys

### Versioning Strategy

**Recommendation:** Implement API versioning
- URL versioning: `/api/v1/`, `/api/v2/`
- Header versioning: `Accept: application/vnd.api+json; version=1`

---

**Document Owner:** Engineering Team
**Review Cycle:** Monthly or on major API changes
**Last Route Audit:** 2025-11-02
