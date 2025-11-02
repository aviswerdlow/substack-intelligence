# Data Flow Diagrams

**Version:** 1.0
**Last Updated:** 2025-11-02
**Purpose:** Visual and textual representation of all data flows in the Substack Intelligence platform

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Core Data Flows](#core-data-flows)
3. [User Interaction Flows](#user-interaction-flows)
4. [Background Processing Flows](#background-processing-flows)
5. [External Integration Flows](#external-integration-flows)
6. [Data Storage & Retrieval](#data-storage--retrieval)

---

## System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Email Client│  │  API Clients │          │
│  │  (Next.js)   │  │  (Reports)   │  │  (REST API)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────────────┐
│         │         APPLICATION LAYER           │                  │
│  ┌──────▼───────┐  ┌──────────────┐  ┌───────▼──────┐          │
│  │  Next.js     │  │   Vercel     │  │   API        │          │
│  │  API Routes  │  │   Cron Jobs  │  │   Middleware │          │
│  └──────┬───────┘  └──────┬───────┘  └───────┬──────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────────────┐
│         │         SERVICES LAYER              │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────▼──────┐          │
│  │   Ingestion  │  │  Enrichment  │  │   Reports    │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  │  (Gmail API) │  │  (Website)   │  │ (PDF + Email)│          │
│  └──────┬───────┘  └──────┬───────┘  └───────┬──────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────────────┐
│         │              AI LAYER               │                  │
│  ┌──────▼───────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Claude AI  │  │    OpenAI    │  │   Upstash    │          │
│  │  (Extraction)│  │  (Embeddings)│  │    Redis     │          │
│  └──────┬───────┘  └──────┬───────┘  └───────┬──────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────────────┐
│         │           DATA LAYER                │                  │
│  ┌──────▼───────────────────▼──────────────────▼──────┐          │
│  │              Supabase (PostgreSQL)                  │          │
│  │  ┌────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │          │
│  │  │ Emails │  │Companies│  │ Mentions│  │ Users  │ │          │
│  │  └────────┘  └─────────┘  └─────────┘  └────────┘ │          │
│  │  ┌────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │          │
│  │  │ Reports│  │  Todos  │  │Settings │  │ Logs   │ │          │
│  │  └────────┘  └─────────┘  └─────────┘  └────────┘ │          │
│  └─────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────────────┐
│         │        EXTERNAL SERVICES            │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────▼──────┐          │
│  │    Clerk     │  │    Resend    │  │    Axiom     │          │
│  │    (Auth)    │  │   (Email)    │  │   (Logs)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Data Flows

### Flow 1: Email Intelligence Pipeline (End-to-End)

This is the primary data flow that powers the entire platform.

```
┌─────────────┐
│   USER      │ Initiates sync (manual or scheduled cron)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Pipeline Initialization                            │
│                                                             │
│  Next.js API Route: /api/pipeline/sync                     │
│  1. Check if user has Gmail connected                      │
│  2. Verify pipeline not already running                    │
│  3. Set pipeline state → "fetching"                        │
│  4. Initialize progress tracking                           │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Gmail Email Fetching                               │
│                                                             │
│  Service: /services/ingestion/src/gmail-connector.ts       │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. Retrieve Gmail tokens from database             │    │
│  │    → Decrypt tokens using app encryption key       │    │
│  │                                                     │    │
│  │ 2. Initialize Google OAuth2 client                 │    │
│  │    → Set credentials from decrypted tokens         │    │
│  │                                                     │    │
│  │ 3. Check if access token expired                   │    │
│  │    → If expired: Refresh using refresh token       │    │
│  │    → Save new tokens (encrypted)                   │    │
│  │                                                     │    │
│  │ 4. Call Gmail API: messages.list()                 │    │
│  │    Filter: from:substack.com                       │    │
│  │    Date: after:[24 hours ago for daily sync]       │    │
│  │    Max results: 1000                               │    │
│  │                                                     │    │
│  │ 5. For each message ID:                            │    │
│  │    → Call Gmail API: messages.get(id)              │    │
│  │    → Extract: subject, from, date, body (HTML)     │    │
│  │    → Parse newsletter name from sender             │    │
│  │                                                     │    │
│  │ 6. Rate limiting check (Upstash Redis)             │    │
│  │    → Max 5 fetches per hour per user               │    │
│  │    → If exceeded: Return 429 error                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Output: Array of raw email objects                        │
│  [                                                          │
│    {                                                        │
│      message_id: "abc123",                                 │
│      subject: "The Breakdown: Hot Startups",               │
│      sender: "newsletter@substack.com",                    │
│      newsletter_name: "The Breakdown",                     │
│      received_at: "2025-11-02T06:30:00Z",                  │
│      raw_html: "<html>...</html>",                         │
│      clean_text: "Today's hot startups include..."         │
│    },                                                       │
│    ...                                                      │
│  ]                                                          │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Email Storage                                      │
│                                                             │
│  Database: Supabase (PostgreSQL)                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ For each email:                                     │    │
│  │   1. Check if email already exists (by message_id)  │    │
│  │      → If exists: Skip (deduplication)              │    │
│  │                                                     │    │
│  │   2. Insert into emails table:                      │    │
│  │      INSERT INTO emails (                           │    │
│  │        message_id,                                  │    │
│  │        subject,                                     │    │
│  │        sender,                                      │    │
│  │        newsletter_name,                             │    │
│  │        received_at,                                 │    │
│  │        raw_html,                                    │    │
│  │        clean_text,                                  │    │
│  │        processing_status = 'pending'                │    │
│  │      )                                              │    │
│  │                                                     │    │
│  │   3. Trigger: Update search_vector (tsvector)       │    │
│  │      → Auto-index subject + clean_text for search   │    │
│  │                                                     │    │
│  │   4. Log insert to Axiom                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  State Change: pipeline state → "extracting"               │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: AI Company Extraction                              │
│                                                             │
│  Service: /packages/ai/src/claude-extractor.ts             │
│                                                             │
│  For each email (status = 'pending'):                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. Update email status → 'processing'               │    │
│  │                                                     │    │
│  │ 2. Rate limit check (Upstash Redis)                │    │
│  │    → Max 100 extraction requests/minute             │    │
│  │    → If exceeded: Wait and retry                    │    │
│  │                                                     │    │
│  │ 3. Check Redis cache (by content hash)              │    │
│  │    → Key: `extract:${hash(clean_text)}`             │    │
│  │    → If cached: Return cached companies (skip AI)   │    │
│  │                                                     │    │
│  │ 4. Call Anthropic Claude API:                       │    │
│  │    Model: claude-3-5-sonnet-20241022                │    │
│  │    System: [Extraction prompt with rules]           │    │
│  │    User: clean_text from email                      │    │
│  │    Temperature: 0.3 (deterministic)                 │    │
│  │    Max tokens: 4096                                 │    │
│  │    Timeout: 60 seconds                              │    │
│  │                                                     │    │
│  │ 5. Retry logic (if API call fails):                 │    │
│  │    → Attempt 1: Immediate                           │    │
│  │    → Attempt 2: Wait 2s                             │    │
│  │    → Attempt 3: Wait 4s                             │    │
│  │    → Attempt 4: Wait 8s                             │    │
│  │    → Attempt 5: Wait 16s                            │    │
│  │    → Max 5 attempts                                 │    │
│  │                                                     │    │
│  │ 6. Parse Claude response (JSON):                    │    │
│  │    {                                                │    │
│  │      "companies": [                                 │    │
│  │        {                                            │    │
│  │          "name": "GreenBottle Co.",                 │    │
│  │          "description": "Sustainable packaging",    │    │
│  │          "context": "GreenBottle raised $2M...",    │    │
│  │          "sentiment": "positive",                   │    │
│  │          "confidence": 0.92                         │    │
│  │        },                                           │    │
│  │        ...                                          │    │
│  │      ]                                              │    │
│  │    }                                                │    │
│  │                                                     │    │
│  │ 7. Validate response schema (Zod)                   │    │
│  │    → Ensure all required fields present             │    │
│  │    → Validate confidence is 0-1 float               │    │
│  │    → Validate sentiment is valid enum               │    │
│  │                                                     │    │
│  │ 8. Cache result in Redis (TTL: 30 days)             │    │
│  │                                                     │    │
│  │ 9. If all retries fail:                             │    │
│  │    → Update email status → 'failed'                 │    │
│  │    → Store error_message                            │    │
│  │    → Log error to Axiom                             │    │
│  │    → Continue to next email                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Output: Extracted companies array for each email          │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Company Normalization & Deduplication              │
│                                                             │
│  For each extracted company:                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. Normalize company name:                          │    │
│  │    → Lowercase                                      │    │
│  │    → Remove "Inc.", "LLC", "Co.", etc.              │    │
│  │    → Remove "The" prefix                            │    │
│  │    → Trim whitespace                                │    │
│  │    Example: "GreenBottle Co." → "greenbottle"       │    │
│  │                                                     │    │
│  │ 2. Check if company exists (exact match):           │    │
│  │    SELECT * FROM companies                          │    │
│  │    WHERE normalized_name = 'greenbottle'            │    │
│  │                                                     │    │
│  │ 3. If exact match found:                            │    │
│  │    → Use existing company_id                        │    │
│  │    → Skip to STEP 6 (save mention)                  │    │
│  │                                                     │    │
│  │ 4. If no exact match, generate embedding:           │    │
│  │    → Call OpenAI API: embeddings.create()           │    │
│  │    → Model: text-embedding-ada-002                  │    │
│  │    → Input: "{name}: {description}"                 │    │
│  │    → Output: 1536-dimensional vector                │    │
│  │                                                     │    │
│  │ 5. Fuzzy match via vector similarity:               │    │
│  │    SELECT *, embedding <=> $1 as distance           │    │
│  │    FROM companies                                   │    │
│  │    WHERE embedding <=> $1 < 0.15                    │    │
│  │    ORDER BY distance ASC                            │    │
│  │    LIMIT 1                                          │    │
│  │    (cosine similarity > 0.85 = distance < 0.15)     │    │
│  │                                                     │    │
│  │ 6. If fuzzy match found:                            │    │
│  │    → Use existing company_id (merge)                │    │
│  │    → Log merge event to Axiom                       │    │
│  │                                                     │    │
│  │ 7. If no match (new company):                       │    │
│  │    → Create new company record                      │    │
│  └────────────────────────────────────────────────────┘    │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Company & Mention Storage                          │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ A. If new company:                                  │    │
│  │    INSERT INTO companies (                          │    │
│  │      id = uuid_generate_v4(),                       │    │
│  │      name = "GreenBottle Co.",                      │    │
│  │      normalized_name = "greenbottle",               │    │
│  │      description = "Sustainable packaging...",      │    │
│  │      embedding = [0.123, -0.456, ...],              │    │
│  │      funding_status = 'unknown',                    │    │
│  │      industry = [],                                 │    │
│  │      enrichment_status = 'pending',                 │    │
│  │      mention_count = 0,                             │    │
│  │      newsletter_diversity = 0,                      │    │
│  │      first_seen_at = NOW()                          │    │
│  │    )                                                │    │
│  │    RETURNING id → company_id                        │    │
│  │                                                     │    │
│  │ B. Create company mention:                          │    │
│  │    INSERT INTO company_mentions (                   │    │
│  │      id = uuid_generate_v4(),                       │    │
│  │      company_id = [from above],                     │    │
│  │      email_id = [current email id],                 │    │
│  │      context = "GreenBottle raised $2M...",         │    │
│  │      sentiment = 'positive',                        │    │
│  │      confidence = 0.92,                             │    │
│  │      extracted_at = NOW()                           │    │
│  │    )                                                │    │
│  │    ON CONFLICT (company_id, email_id) DO NOTHING    │    │
│  │    (prevents duplicate mentions)                    │    │
│  │                                                     │    │
│  │ C. Trigger: Update company analytics                │    │
│  │    UPDATE companies SET                             │    │
│  │      mention_count = (                              │    │
│  │        SELECT COUNT(*) FROM company_mentions        │    │
│  │        WHERE company_id = $1                        │    │
│  │      ),                                             │    │
│  │      newsletter_diversity = (                       │    │
│  │        SELECT COUNT(DISTINCT newsletter_name)       │    │
│  │        FROM company_mentions cm                     │    │
│  │        JOIN emails e ON cm.email_id = e.id          │    │
│  │        WHERE cm.company_id = $1                     │    │
│  │      ),                                             │    │
│  │      last_updated_at = NOW()                        │    │
│  │    WHERE id = $1                                    │    │
│  │                                                     │    │
│  │ D. Check for tracked company alerts:                │    │
│  │    SELECT * FROM tracked_companies                  │    │
│  │    WHERE normalized_name = 'greenbottle'            │    │
│  │    AND enabled = true                               │    │
│  │                                                     │    │
│  │    If found → Trigger alert notification (async)    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Update email status → 'completed'                         │
│  Log completion to Axiom                                   │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Pipeline Completion                                │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. Update pipeline state → "complete"               │    │
│  │                                                     │    │
│  │ 2. Calculate summary stats:                         │    │
│  │    - Total emails processed                         │    │
│  │    - Total companies extracted                      │    │
│  │    - Total mentions created                         │    │
│  │    - Errors encountered                             │    │
│  │                                                     │    │
│  │ 3. Log summary to Axiom                             │    │
│  │                                                     │    │
│  │ 4. Broadcast real-time update to dashboard:         │    │
│  │    → Supabase realtime channel                      │    │
│  │    → WebSocket message to connected clients         │    │
│  │    → Dashboard auto-refreshes stats                 │    │
│  │                                                     │    │
│  │ 5. Clear pipeline lock (allow next sync)            │    │
│  └────────────────────────────────────────────────────┘    │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   USER      │ Sees updated dashboard with fresh data
└─────────────┘
```

**Data Transformations:**

| Stage | Input | Output | Size |
|-------|-------|--------|------|
| Gmail Fetch | Email IDs | Raw emails (HTML) | ~50KB per email |
| HTML Parsing | Raw HTML | Clean text | ~10KB per email |
| AI Extraction | Clean text | Companies JSON | ~2KB per email |
| Normalization | Company JSON | Normalized company | ~500B per company |
| Storage | Normalized data | Database records | ~1KB per mention |

**Performance Metrics:**

- Gmail API calls: ~2 seconds per 100 emails
- AI extraction: ~3 seconds per email (cached: <100ms)
- Database insertion: ~50ms per email
- Total pipeline: ~5-10 minutes for 100 emails

---

### Flow 2: Company Enrichment Pipeline

Enriches company data with external information (website validation, metadata).

```
┌─────────────┐
│   TRIGGER   │ 1 hour after company created
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Enrichment Service                                          │
│  /services/enrichment/src/company-enrichment.ts             │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. Fetch company from database                      │    │
│  │    WHERE enrichment_status = 'pending'              │    │
│  │    AND created_at < NOW() - INTERVAL '1 hour'       │    │
│  │    LIMIT 10 (batch processing)                      │    │
│  │                                                     │    │
│  │ 2. For each company:                                │    │
│  │    a. Extract website URL (if provided)             │    │
│  │                                                     │    │
│  │    b. Validate URL format:                          │    │
│  │       → Must include protocol (https://)            │    │
│  │       → Valid domain format                         │    │
│  │                                                     │    │
│  │    c. Perform HTTP HEAD request:                    │    │
│  │       → Check SSL certificate validity              │    │
│  │       → Check response status (200 = good)          │    │
│  │       → Measure response time                       │    │
│  │       → Timeout: 10 seconds                         │    │
│  │                                                     │    │
│  │    d. Extract metadata from response:               │    │
│  │       → Server header                               │    │
│  │       → Content-Type                                │    │
│  │       → Redirects (follow up to 3)                  │    │
│  │                                                     │    │
│  │    e. Update company record:                        │    │
│  │       UPDATE companies SET                          │    │
│  │         website = [validated URL],                  │    │
│  │         enrichment_status = 'enriched',             │    │
│  │         enrichment_data = {                         │    │
│  │           ssl_valid: true,                          │    │
│  │           response_time_ms: 234,                    │    │
│  │           status_code: 200                          │    │
│  │         },                                          │    │
│  │         last_updated_at = NOW()                     │    │
│  │       WHERE id = $1                                 │    │
│  │                                                     │    │
│  │    f. If enrichment fails:                          │    │
│  │       → Update enrichment_status = 'failed'         │    │
│  │       → Store error message                         │    │
│  │       → Log to Axiom                                │    │
│  │                                                     │    │
│  │ 3. Rate limiting: Max 10 enrichments/hour           │    │
│  │    (prevent hammering external sites)               │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Enrichment Data Structure:**

```json
{
  "ssl_valid": true,
  "response_time_ms": 234,
  "status_code": 200,
  "server": "nginx",
  "redirects": ["http://example.com → https://example.com"],
  "enriched_at": "2025-11-02T12:00:00Z"
}
```

---

### Flow 3: Daily Report Generation

Automated daily report creation and delivery.

```
┌─────────────┐
│ CRON JOB    │ Vercel Cron: Every day at 6:00 AM UTC
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/cron/daily-intelligence                                │
│                                                             │
│ 1. Fetch all users with daily_reports_enabled = true       │
│    SELECT user_id, email, timezone, report_delivery_time   │
│    FROM user_preferences                                   │
│    WHERE daily_reports_enabled = true                      │
│                                                             │
│ 2. For each user:                                          │
│    ┌──────────────────────────────────────────────────┐    │
│    │ a. Calculate report date range:                  │    │
│    │    start = NOW() - INTERVAL '24 hours'           │    │
│    │    end = NOW()                                   │    │
│    │                                                  │    │
│    │ b. Query companies discovered in range:          │    │
│    │    SELECT c.*, COUNT(cm.id) as mention_count     │    │
│    │    FROM companies c                              │    │
│    │    JOIN company_mentions cm ON c.id = cm.company_id │  │
│    │    JOIN emails e ON cm.email_id = e.id           │    │
│    │    WHERE e.received_at BETWEEN $1 AND $2         │    │
│    │      AND cm.confidence >= [user threshold]       │    │
│    │      AND e.newsletter_name NOT IN [excluded]     │    │
│    │    GROUP BY c.id                                 │    │
│    │    ORDER BY mention_count DESC,                  │    │
│    │              c.newsletter_diversity DESC         │    │
│    │    LIMIT 20                                      │    │
│    │                                                  │    │
│    │ c. Calculate sentiment distribution:             │    │
│    │    SELECT sentiment, COUNT(*)                    │    │
│    │    FROM company_mentions cm                      │    │
│    │    JOIN emails e ON cm.email_id = e.id           │    │
│    │    WHERE e.received_at BETWEEN $1 AND $2         │    │
│    │    GROUP BY sentiment                            │    │
│    │                                                  │    │
│    │ d. Generate report PDF:                          │    │
│    │    → Call /services/reports/src/pdf-generator.ts │    │
│    │    → Input: companies array, stats              │    │
│    │    → Render React Email template                │    │
│    │    → Convert HTML to PDF (Puppeteer)            │    │
│    │    → Output: PDF buffer                         │    │
│    │                                                  │    │
│    │ e. Send email via Resend:                        │    │
│    │    → To: user email + additional recipients      │    │
│    │    → Subject: "Daily Intelligence - Nov 2, 2025" │    │
│    │    → Body: HTML email (React Email template)    │    │
│    │    → Attachment: report.pdf                     │    │
│    │                                                  │    │
│    │ f. Log report to database:                       │    │
│    │    INSERT INTO report_history (                  │    │
│    │      report_type = 'daily',                     │    │
│    │      report_date = CURRENT_DATE,                │    │
│    │      generated_at = NOW(),                      │    │
│    │      recipients_count = 2,                      │    │
│    │      companies_count = 15,                      │    │
│    │      mentions_count = 42,                       │    │
│    │      pdf_size = 2340000,                        │    │
│    │      status = 'sent'                            │    │
│    │    )                                            │    │
│    │                                                  │    │
│    │ g. Log delivery to email_delivery_log:           │    │
│    │    For each recipient:                           │    │
│    │      INSERT INTO email_delivery_log (            │    │
│    │        recipient_email,                         │    │
│    │        email_type = 'daily_report',             │    │
│    │        status = 'sent',                         │    │
│    │        companies_included = 15,                 │    │
│    │        pdf_included = true                      │    │
│    │      )                                          │    │
│    └──────────────────────────────────────────────────┘    │
│                                                             │
│ 3. Log cron completion to Axiom                            │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   USER      │ Receives report in inbox
└─────────────┘
```

---

## User Interaction Flows

### Flow 4: User Dashboard View

Real-time data flow when user views dashboard.

```
┌─────────────┐
│   USER      │ Navigates to /dashboard
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js Page Component: /dashboard/page.tsx                │
│                                                             │
│ Server-side rendering (SSR):                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. Verify Clerk authentication                      │    │
│  │    → If not authenticated: Redirect to /sign-in     │    │
│  │                                                     │    │
│  │ 2. Fetch initial data (parallel queries):           │    │
│  │    ┌───────────────────────────────────────────┐    │    │
│  │    │ Query A: Dashboard Stats                  │    │    │
│  │    │   SELECT                                  │    │    │
│  │    │     (SELECT COUNT(*) FROM emails)         │    │    │
│  │    │       as total_emails,                    │    │    │
│  │    │     (SELECT COUNT(*) FROM companies)      │    │    │
│  │    │       as total_companies,                 │    │    │
│  │    │     (SELECT COUNT(*) FROM company_mentions)│   │    │
│  │    │       as total_mentions,                  │    │    │
│  │    │     (SELECT COUNT(DISTINCT newsletter_name)│   │    │
│  │    │      FROM emails) as total_newsletters    │    │    │
│  │    └───────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │    ┌───────────────────────────────────────────┐    │    │
│  │    │ Query B: Recent Companies (Last 24h)      │    │    │
│  │    │   SELECT c.*, COUNT(cm.id) as mentions    │    │    │
│  │    │   FROM companies c                        │    │    │
│  │    │   JOIN company_mentions cm                │    │    │
│  │    │     ON c.id = cm.company_id               │    │    │
│  │    │   JOIN emails e ON cm.email_id = e.id     │    │    │
│  │    │   WHERE e.received_at >                   │    │    │
│  │    │     NOW() - INTERVAL '24 hours'           │    │    │
│  │    │   GROUP BY c.id                           │    │    │
│  │    │   ORDER BY mentions DESC                  │    │    │
│  │    │   LIMIT 10                                │    │    │
│  │    └───────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │    ┌───────────────────────────────────────────┐    │    │
│  │    │ Query C: Pipeline Status                  │    │    │
│  │    │   → Read from Redis cache                 │    │    │
│  │    │   → Key: `pipeline:status:${user_id}`     │    │    │
│  │    │   → Returns: { state, progress, step }    │    │    │
│  │    └───────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │    ┌───────────────────────────────────────────┐    │    │
│  │    │ Query D: User Settings                    │    │    │
│  │    │   SELECT * FROM user_settings             │    │    │
│  │    │   WHERE user_id = [clerk user id]         │    │    │
│  │    └───────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │ 3. Hydrate page with initial data                   │    │
│  └────────────────────────────────────────────────────┘    │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Client-side: React Query + Supabase Realtime               │
│                                                             │
│ 1. React Query setup:                                      │
│    ┌──────────────────────────────────────────────────┐    │
│    │ useQuery('dashboardStats', fetchStats, {         │    │
│    │   refetchInterval: 60000 // Refetch every 1min   │    │
│    │ })                                               │    │
│    │                                                  │    │
│    │ useQuery('recentCompanies', fetchRecent, {       │    │
│    │   refetchInterval: 60000                         │    │
│    │ })                                               │    │
│    └──────────────────────────────────────────────────┘    │
│                                                             │
│ 2. Supabase Realtime subscription:                         │
│    ┌──────────────────────────────────────────────────┐    │
│    │ const channel = supabase                         │    │
│    │   .channel('dashboard-updates')                  │    │
│    │   .on('postgres_changes', {                      │    │
│    │     event: 'INSERT',                             │    │
│    │     schema: 'public',                            │    │
│    │     table: 'companies'                           │    │
│    │   }, (payload) => {                              │    │
│    │     // New company discovered!                   │    │
│    │     queryClient.invalidateQueries('recentCompanies')│ │
│    │     toast.success('New company discovered!')     │    │
│    │   })                                             │    │
│    │   .subscribe()                                   │    │
│    └──────────────────────────────────────────────────┘    │
│                                                             │
│ 3. Dashboard auto-updates in real-time                     │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   USER      │ Sees live updates without page refresh
└─────────────┘
```

---

### Flow 5: Semantic Company Search

User searches for companies using natural language.

```
┌─────────────┐
│   USER      │ Enters search: "sustainable fashion brands"
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/search/semantic                                        │
│                                                             │
│ ┌────────────────────────────────────────────────────┐      │
│ │ 1. Receive query: "sustainable fashion brands"      │      │
│ │                                                     │      │
│ │ 2. Generate query embedding:                        │      │
│ │    → Call OpenAI embeddings API                     │      │
│ │    → Input: "sustainable fashion brands"            │      │
│ │    → Output: [0.234, -0.567, ...] (1536-dim)        │      │
│ │                                                     │      │
│ │ 3. Vector similarity search:                        │      │
│ │    SELECT                                           │      │
│ │      c.*,                                           │      │
│ │      c.embedding <=> $1 as distance,                │      │
│ │      1 - (c.embedding <=> $1) as similarity         │      │
│ │    FROM companies c                                 │      │
│ │    WHERE c.embedding <=> $1 < 0.3                   │      │
│ │      (similarity > 0.7)                             │      │
│ │    ORDER BY distance ASC                            │      │
│ │    LIMIT 20                                         │      │
│ │                                                     │      │
│ │    Uses pgvector IVFFLAT index for fast search      │      │
│ │                                                     │      │
│ │ 4. Enrich results with mention data:                │      │
│ │    For each company:                                │      │
│ │      SELECT COUNT(*) as mention_count               │      │
│ │      FROM company_mentions                          │      │
│ │      WHERE company_id = $1                          │      │
│ │                                                     │      │
│ │ 5. Return results sorted by:                        │      │
│ │    - Primary: Similarity score (desc)               │      │
│ │    - Secondary: Mention count (desc)                │      │
│ └────────────────────────────────────────────────────┘      │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   USER      │ Sees ranked search results
└─────────────┘
```

**Search Performance:**

- Embedding generation: ~200ms
- Vector search: ~50ms (with IVFFLAT index)
- Total: ~300ms for 10,000 companies

---

## Background Processing Flows

### Flow 6: Cron Job - Database Cleanup

Automated cleanup of old data based on retention policies.

```
┌─────────────┐
│ CRON JOB    │ Vercel Cron: Daily at midnight UTC
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/cron/cleanup                                           │
│                                                             │
│ ┌────────────────────────────────────────────────────┐      │
│ │ 1. Email Cleanup (per user retention policy)       │      │
│ │    FOR EACH user with retention policy:            │      │
│ │      SELECT retention_period                       │      │
│ │      FROM user_settings                            │      │
│ │      WHERE user_id = $1                            │      │
│ │                                                    │      │
│ │      DELETE FROM emails                            │      │
│ │      WHERE received_at <                           │      │
│ │        NOW() - INTERVAL '[retention] days'         │      │
│ │                                                    │      │
│ │      Cascade deletes: company_mentions             │      │
│ │                                                    │      │
│ │      Log: "Deleted X emails for user Y"            │      │
│ │                                                    │      │
│ │ 2. Report Cleanup (per user settings)              │      │
│ │    DELETE FROM report_history                      │      │
│ │    WHERE report_date <                             │      │
│ │      NOW() - INTERVAL '[retention] days'           │      │
│ │                                                    │      │
│ │    Also delete PDFs from cloud storage            │      │
│ │                                                    │      │
│ │ 3. Completed Todo Archival                         │      │
│ │    UPDATE user_todos SET archived = true           │      │
│ │    WHERE completed = true                          │      │
│ │      AND completed_at <                            │      │
│ │        NOW() - INTERVAL '30 days'                  │      │
│ │                                                    │      │
│ │ 4. Expired API Key Deletion                        │      │
│ │    DELETE FROM user_api_keys                       │      │
│ │    WHERE expires_at < NOW() - INTERVAL '30 days'   │      │
│ │      (30-day grace period after expiration)        │      │
│ │                                                    │      │
│ │ 5. Failed Webhook Cleanup                          │      │
│ │    DELETE FROM user_webhooks                       │      │
│ │    WHERE enabled = false                           │      │
│ │      AND updated_at <                              │      │
│ │        NOW() - INTERVAL '30 days'                  │      │
│ │                                                    │      │
│ │ 6. Database Vacuum (optimize performance)          │      │
│ │    VACUUM ANALYZE emails;                          │      │
│ │    VACUUM ANALYZE companies;                       │      │
│ │    VACUUM ANALYZE company_mentions;                │      │
│ │                                                    │      │
│ │ 7. Log cleanup summary to Axiom                    │      │
│ └────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 7: Company Alert Notification

Triggered when tracked company is mentioned.

```
┌─────────────┐
│  TRIGGER    │ After company mention inserted
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Database Trigger Function                                   │
│                                                             │
│ ┌────────────────────────────────────────────────────┐      │
│ │ ON INSERT into company_mentions:                    │      │
│ │                                                     │      │
│ │ 1. Get company normalized_name                      │      │
│ │    from NEW.company_id                              │      │
│ │                                                     │      │
│ │ 2. Check if any user is tracking this company:      │      │
│ │    SELECT user_id, alert_email                      │      │
│ │    FROM tracked_companies tc                        │      │
│ │    JOIN user_preferences up ON tc.user_id = up.user_id│   │
│ │    WHERE tc.normalized_name = [company name]        │      │
│ │      AND tc.enabled = true                          │      │
│ │      AND up.company_alerts_enabled = true           │      │
│ │                                                     │      │
│ │ 3. For each tracking user:                          │      │
│ │    a. Fetch mention context from NEW                │      │
│ │                                                     │      │
│ │    b. Fetch email details (newsletter source)       │      │
│ │                                                     │      │
│ │    c. Insert notification record:                   │      │
│ │       INSERT INTO user_notifications (              │      │
│ │         user_id,                                    │      │
│ │         type = 'company_alert',                     │      │
│ │         title = 'New mention: [Company]',           │      │
│ │         message = [context snippet],                │      │
│ │         data = {company_id, mention_id},            │      │
│ │         read = false                                │      │
│ │       )                                             │      │
│ │                                                     │      │
│ │    d. Queue email notification (async):             │      │
│ │       → Add to Inngest queue                        │      │
│ │       → Process within 5 minutes                    │      │
│ │                                                     │      │
│ │    e. Send email via Resend:                        │      │
│ │       Subject: "Alert: [Company] mentioned"         │      │
│ │       Body: Newsletter source + context             │      │
│ │       CTA: "View in Dashboard"                      │      │
│ └────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   USER      │ Receives alert email + in-app notification
└─────────────┘
```

---

## External Integration Flows

### Flow 8: Webhook Event Delivery

User-configured webhooks triggered on events.

```
┌─────────────┐
│  EVENT      │ company.discovered
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Webhook Delivery Service                                    │
│                                                             │
│ ┌────────────────────────────────────────────────────┐      │
│ │ 1. Identify webhooks for this event:                │      │
│ │    SELECT * FROM user_webhooks                      │      │
│ │    WHERE enabled = true                             │      │
│ │      AND 'company.discovered' = ANY(events)         │      │
│ │                                                     │      │
│ │ 2. For each webhook:                                │      │
│ │    a. Build payload:                                │      │
│ │       {                                             │      │
│ │         "event": "company.discovered",              │      │
│ │         "timestamp": "2025-11-02T12:00:00Z",        │      │
│ │         "data": {                                   │      │
│ │           "company": {                              │      │
│ │             "id": "uuid",                           │      │
│ │             "name": "GreenBottle Co.",              │      │
│ │             "description": "...",                   │      │
│ │             "first_seen_at": "2025-11-02..."        │      │
│ │           }                                         │      │
│ │         }                                           │      │
│ │       }                                             │      │
│ │                                                     │      │
│ │    b. Generate HMAC signature:                      │      │
│ │       signature = HMAC-SHA256(                      │      │
│ │         secret = webhook.secret,                    │      │
│ │         message = JSON.stringify(payload)           │      │
│ │       )                                             │      │
│ │                                                     │      │
│ │    c. Send HTTP POST to webhook URL:                │      │
│ │       Headers:                                      │      │
│ │         Content-Type: application/json              │      │
│ │         X-Webhook-Signature: sha256=[signature]     │      │
│ │         X-Webhook-Event: company.discovered         │      │
│ │       Body: [payload JSON]                          │      │
│ │       Timeout: 10 seconds                           │      │
│ │                                                     │      │
│ │    d. Retry logic (if request fails):               │      │
│ │       Attempt 1: Immediate                          │      │
│ │       Attempt 2: Wait 2s                            │      │
│ │       Attempt 3: Wait 4s                            │      │
│ │       Attempt 4: Wait 8s                            │      │
│ │       Max: 4 attempts                               │      │
│ │                                                     │      │
│ │    e. Log webhook delivery:                         │      │
│ │       INSERT INTO webhook_delivery_log (            │      │
│ │         webhook_id,                                 │      │
│ │         event_type,                                 │      │
│ │         payload,                                    │      │
│ │         status_code,                                │      │
│ │         success,                                    │      │
│ │         attempts,                                   │      │
│ │         delivered_at                                │      │
│ │       )                                             │      │
│ │                                                     │      │
│ │    f. Track failure count:                          │      │
│ │       IF failed after all retries:                  │      │
│ │         INCREMENT webhook.consecutive_failures      │      │
│ │         IF consecutive_failures >= 10:              │      │
│ │           UPDATE webhook SET enabled = false        │      │
│ │           Notify user: "Webhook disabled"           │      │
│ └────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│ USER'S CRM  │ Receives webhook event
└─────────────┘
```

---

## Data Storage & Retrieval

### Database Schema Relationships

```
┌──────────────────────────────────────────────────────────────┐
│                   DATABASE RELATIONSHIPS                     │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐
│   emails    │
│─────────────│
│ id (PK)     │───┐
│ message_id  │   │
│ subject     │   │
│ sender      │   │ ONE-TO-MANY
│ newsletter  │   │
│ received_at │   │
│ raw_html    │   │
│ clean_text  │   │
│ status      │   │
└─────────────┘   │
                  │
                  ▼
           ┌──────────────────┐
           │ company_mentions │
           │──────────────────│
           │ id (PK)          │
           │ company_id (FK)  │───────┐
           │ email_id (FK)    │◄──────┘
           │ context          │
           │ sentiment        │
           │ confidence       │
           │ extracted_at     │
           │ UNIQUE(company_id, email_id)
           └──────────────────┘
                  │
                  │ MANY-TO-ONE
                  │
                  ▼
           ┌─────────────┐
           │  companies  │
           │─────────────│
           │ id (PK)     │
           │ name        │
           │ normalized_name (UNIQUE)
           │ description │
           │ website     │
           │ funding_status
           │ industry[]  │
           │ embedding   │ (vector 1536)
           │ mention_count (computed)
           │ newsletter_diversity (computed)
           │ enrichment_status
           │ first_seen_at
           │ last_updated_at
           └─────────────┘

┌─────────────────┐
│ user_settings   │
│─────────────────│
│ id (PK)         │
│ user_id (Clerk) │ (UNIQUE)
│ gmail_connected │
│ gmail_tokens    │ (encrypted)
│ gmail_email     │
│ notifications_enabled
│ digest_frequency
│ account_settings (JSONB)
│ newsletter_settings (JSONB)
│ company_settings (JSONB)
│ ai_settings (JSONB)
│ email_settings (JSONB)
│ report_settings (JSONB)
│ notification_settings (JSONB)
│ privacy_settings (JSONB)
│ appearance_settings (JSONB)
└─────────────────┘
        │
        │ ONE-TO-MANY
        ├────────────────────────────────┐
        │                                │
        ▼                                ▼
┌──────────────────┐           ┌──────────────────┐
│ user_api_keys    │           │ tracked_companies│
│──────────────────│           │──────────────────│
│ id (PK)          │           │ id (PK)          │
│ user_id (FK)     │           │ user_id (FK)     │
│ name             │           │ name             │
│ key_hash         │           │ domain           │
│ key_prefix       │           │ keywords[]       │
│ permissions[]    │           │ enabled          │
│ expires_at       │           └──────────────────┘
│ last_used_at     │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ user_webhooks    │
│──────────────────│
│ id (PK)          │
│ user_id (FK)     │
│ url              │
│ events[]         │
│ enabled          │
│ secret           │
│ consecutive_failures
└──────────────────┘

┌──────────────────┐
│ user_todos       │
│──────────────────│
│ id (PK)          │
│ user_id (FK)     │
│ title            │
│ description      │
│ completed        │
│ priority         │
│ due_date         │
│ category         │
│ tags[]           │
│ position         │
│ completed_at     │
│ created_at       │
│ updated_at       │
└──────────────────┘

┌──────────────────┐
│ report_history   │
│──────────────────│
│ id (PK)          │
│ report_type      │
│ report_date      │
│ generated_at     │
│ recipients_count │
│ companies_count  │
│ mentions_count   │
│ email_id         │
│ pdf_size         │
│ status           │
│ error_message    │
└──────────────────┘
        │
        │ ONE-TO-MANY
        ▼
┌──────────────────────┐
│ email_delivery_log   │
│──────────────────────│
│ id (PK)              │
│ email_id (FK)        │
│ recipient_email      │
│ email_type           │
│ status               │
│ delivered_at         │
│ opened_at            │
│ clicked_at           │
│ companies_included   │
│ pdf_included         │
└──────────────────────┘
```

### Index Strategy

**Performance-Critical Indexes:**

```sql
-- Emails table
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_newsletter ON emails(newsletter_name);
CREATE INDEX idx_emails_status ON emails(processing_status);
CREATE INDEX idx_emails_search ON emails USING GIN(search_vector);

-- Companies table
CREATE INDEX idx_companies_normalized ON companies(normalized_name);
CREATE INDEX idx_companies_mention_count ON companies(mention_count DESC);
CREATE INDEX idx_companies_diversity ON companies(newsletter_diversity DESC);
CREATE INDEX idx_companies_embedding ON companies USING ivfflat(embedding vector_cosine_ops)
  WITH (lists = 100); -- For vector similarity search

-- Company mentions table
CREATE INDEX idx_mentions_company ON company_mentions(company_id);
CREATE INDEX idx_mentions_email ON company_mentions(email_id);
CREATE INDEX idx_mentions_confidence ON company_mentions(confidence DESC);
CREATE UNIQUE INDEX idx_mentions_unique ON company_mentions(company_id, email_id);

-- User todos table
CREATE INDEX idx_todos_user_completed_position
  ON user_todos(user_id, completed, position);
CREATE INDEX idx_todos_user_priority_due
  ON user_todos(user_id, priority, due_date);
```

---

## Data Flow Summary

**Primary Flows:**
1. Email Intelligence Pipeline (end-to-end company extraction)
2. Company Enrichment (website validation)
3. Daily Report Generation (scheduled reports)

**User Interaction Flows:**
4. Dashboard View (real-time data display)
5. Semantic Search (vector-based search)

**Background Flows:**
6. Database Cleanup (retention policies)
7. Company Alerts (tracked company notifications)

**Integration Flows:**
8. Webhook Delivery (external system events)

**Key Performance Metrics:**
- Email processing: 10 emails/minute (with AI)
- Vector search: <100ms for 10k companies
- Dashboard load: <2 seconds
- Real-time updates: <1 second latency

**Data Volume Estimates (1 user, 1 month):**
- Emails: ~100 emails × 10KB = 1MB
- Companies: ~50 companies × 2KB = 100KB
- Mentions: ~150 mentions × 1KB = 150KB
- Embeddings: ~50 vectors × 6KB = 300KB
- Total: ~1.5MB per user per month

**Scalability:**
- 1,000 users = 1.5GB/month
- 10,000 users = 15GB/month
- Database size manageable with retention policies

---

**End of Data Flow Diagrams**
