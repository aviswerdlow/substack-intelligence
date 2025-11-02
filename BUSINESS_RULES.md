# Business Rules Documentation

**Version:** 1.0
**Last Updated:** 2025-11-02
**Purpose:** Document all business logic, rules, and constraints in the Substack Intelligence platform

---

## Table of Contents

1. [Email Processing Rules](#email-processing-rules)
2. [Company Extraction Rules](#company-extraction-rules)
3. [Data Quality Rules](#data-quality-rules)
4. [User Access & Permissions](#user-access--permissions)
5. [Rate Limiting & Quotas](#rate-limiting--quotas)
6. [Report Generation Rules](#report-generation-rules)
7. [Notification & Alert Rules](#notification--alert-rules)
8. [Data Retention & Cleanup](#data-retention--cleanup)
9. [Pricing & Usage Limits](#pricing--usage-limits)
10. [Security & Compliance Rules](#security--compliance-rules)

---

## Email Processing Rules

### ER-001: Email Fetch Criteria

**Rule:** Only fetch emails from Substack domain
- **Filter:** `from:substack.com`
- **Rationale:** Focus on Substack newsletters only
- **Exception:** None. All emails must match this filter.

**Implementation:**
- Location: `/services/ingestion/src/gmail-connector.ts`
- Gmail API query parameter

---

### ER-002: Email Date Range

**Rule:** Default historical fetch is 30 days
- **Default Range:** Past 30 days from sync date
- **Configurable:** Yes, via user settings (max 90 days)
- **Rationale:** Balance between data completeness and API quotas

**Business Logic:**
- First sync: 30 days
- Daily sync: Past 24 hours only
- Manual sync: User-configurable (1-90 days)

**Implementation:**
- Location: `/services/ingestion/src/gmail-connector.ts`
- Parameter: `daysToFetch`

---

### ER-003: Email Deduplication

**Rule:** Each email is stored only once based on Gmail message_id
- **Unique Constraint:** `emails.message_id` (UNIQUE index)
- **Behavior:** If duplicate detected, skip insertion (no error)
- **Rationale:** Prevent duplicate processing on re-syncs

**Edge Cases:**
- Same newsletter sent to multiple addresses → Treat as separate emails (different message_id)
- Forwarded emails → New message_id, treated as new email

**Implementation:**
- Location: Database constraint in Supabase migrations
- SQL: `UNIQUE(message_id)`

---

### ER-004: Email Processing Priority

**Rule:** Process emails in chronological order (oldest first)
- **Sort Order:** `received_at ASC`
- **Rationale:** Build knowledge graph chronologically
- **Exception:** Manual reprocessing can override order

**Implementation:**
- Location: `/apps/web/app/api/pipeline/sync/route.ts`
- Query: `ORDER BY received_at ASC`

---

### ER-005: Email Processing Status Lifecycle

**Rule:** Email must follow status progression: `pending → processing → completed|failed`

**Valid Transitions:**
```
pending → processing (when extraction starts)
processing → completed (when extraction succeeds)
processing → failed (when extraction fails after retries)
failed → processing (when user triggers reprocessing)
completed → processing (when user triggers reprocessing)
```

**Invalid Transitions:**
- `pending → completed` (must go through processing)
- `completed → pending` (use reprocessing instead)
- `failed → completed` (must reprocess)

**Implementation:**
- Location: Email processing pipeline
- Field: `emails.processing_status`

---

### ER-006: Email Retry Logic

**Rule:** Failed email processing retries up to 3 times with exponential backoff

**Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: After 2 seconds
- Attempt 3: After 4 seconds
- Attempt 4: After 8 seconds
- Max attempts: 5

**Failure Conditions:**
- Claude API timeout (>60s)
- Claude API rate limit
- Network errors
- Invalid response format

**After Max Retries:**
- Status → `failed`
- Error message stored in `emails.error_message`
- User can manually reprocess

**Implementation:**
- Location: `/packages/ai/src/claude-extractor.ts`
- Function: `extractCompaniesWithRetry()`

---

### ER-007: Email Content Cleaning

**Rule:** HTML emails must be converted to clean text before AI processing

**Cleaning Steps:**
1. Strip HTML tags (keep text only)
2. Remove extra whitespace (normalize to single spaces)
3. Remove email signatures
4. Remove unsubscribe links
5. Preserve paragraph structure
6. Extract newsletter name from sender

**Quality Requirements:**
- Must preserve company names (no truncation)
- Must preserve context around mentions
- Must be readable by AI model

**Implementation:**
- Location: `/services/ingestion/src/gmail-connector.ts`
- Libraries: cheerio or similar HTML parser

---

### ER-008: Email Full-Text Search Indexing

**Rule:** All emails must be indexed for full-text search upon save

**Indexed Fields:**
- `subject` (weight: A - highest)
- `clean_text` (weight: B)
- `newsletter_name` (weight: A)

**Search Vector:**
- Type: `tsvector`
- Configuration: English
- Index: GIN index for performance

**Update Trigger:**
- Automatically updated on INSERT/UPDATE
- No manual refresh needed

**Implementation:**
- Location: Supabase migration
- Trigger: `emails_search_vector_update`

---

## Company Extraction Rules

### CE-001: Extraction Scope

**Rule:** Only extract companies that meet these criteria:

**Include:**
- Consumer brands (DTC, retail, CPG)
- Venture-backed startups (any stage)
- New ventures from known executives
- Emerging brands gaining cultural relevance

**Exclude:**
- Public companies (unless new venture/spin-off)
- Non-profit organizations
- Government entities
- Individual creators/influencers (unless building a company)
- Service providers mentioned in passing (lawyers, accountants)

**Rationale:** Focus on investment-relevant companies

**Implementation:**
- Location: `/packages/ai/src/claude-extractor.ts`
- Method: Prompt engineering in Claude system prompt

---

### CE-002: Confidence Scoring

**Rule:** Each extracted company must have confidence score 0.0 - 1.0

**Score Interpretation:**
- 0.9 - 1.0: Very high confidence (clear, unambiguous mention)
- 0.7 - 0.89: High confidence (strong mention with context)
- 0.5 - 0.69: Medium confidence (mentioned but less context)
- 0.3 - 0.49: Low confidence (ambiguous or indirect mention)
- 0.0 - 0.29: Very low confidence (uncertain extraction)

**Minimum Threshold (Default):** 0.6
- Configurable by user in settings
- Range: 0.3 - 0.95

**Below Threshold Behavior:**
- Still stored in database
- Excluded from reports (unless user lowers threshold)
- Flagged for manual review

**Implementation:**
- Location: AI extraction service
- Field: `company_mentions.confidence`

---

### CE-003: Sentiment Classification

**Rule:** Each mention must be classified as positive, negative, or neutral

**Definitions:**
- **Positive:** Company praised, success highlighted, recommendation implied
- **Negative:** Company criticized, failure mentioned, warning issued
- **Neutral:** Factual mention without opinion/sentiment

**Examples:**
- Positive: "Brand X is revolutionizing sustainable fashion"
- Negative: "Brand X laid off 30% of staff after failed Series B"
- Neutral: "Brand X raised $5M seed round"

**Ambiguous Cases:**
- Default to neutral if unclear
- Mixed sentiment → Use dominant sentiment

**Usage:**
- Sentiment distribution in analytics
- Filter companies by sentiment
- Alert on negative sentiment for tracked companies

**Implementation:**
- Location: AI extraction
- Field: `company_mentions.sentiment`

---

### CE-004: Context Extraction

**Rule:** Capture 100-300 characters of surrounding context for each mention

**Requirements:**
- Include complete sentences (don't cut mid-sentence)
- Center on company name mention
- Preserve punctuation and formatting
- Strip only excessive whitespace

**Minimum Context:** 50 characters (if email is very short)
**Maximum Context:** 500 characters (truncate with "...")

**Purpose:**
- User understands why company was mentioned
- Investment memo context
- Sentiment justification

**Implementation:**
- Location: AI extraction
- Field: `company_mentions.context`

---

### CE-005: Company Name Normalization

**Rule:** Normalize company names to ensure deduplication

**Normalization Steps:**
1. Convert to lowercase
2. Remove punctuation (except hyphens in brand names)
3. Remove legal suffixes (Inc., LLC, Corp., Co.)
4. Remove "The" prefix
5. Trim whitespace
6. Preserve hyphens and ampersands

**Examples:**
- "GreenBottle Co." → "greenbottle"
- "The Honest Company, Inc." → "honest company"
- "Dollar Shave Club" → "dollar shave club"
- "Away Travel" → "away travel"

**Edge Cases:**
- Brands with punctuation (e.g., "Away.") → Keep hyphen/period if part of brand
- Brands with numbers (e.g., "23andMe") → Keep numbers

**Implementation:**
- Location: Company save logic
- Field: `companies.normalized_name` (UNIQUE constraint)

---

### CE-006: Company Deduplication

**Rule:** Prevent duplicate companies using normalized name + vector similarity

**Deduplication Logic:**
1. **Exact Match:** Check if `normalized_name` exists
   - If exists → Add mention to existing company, increment mention_count
2. **Fuzzy Match:** If not exact, check vector similarity
   - Generate embedding for new company description
   - Query for cosine_similarity > 0.85
   - If match found → Merge into existing company
3. **New Company:** If no match → Create new company record

**Manual Deduplication:**
- Admin can merge companies manually
- Preserves all mentions from both records

**Implementation:**
- Location: Company save service
- Fields: `normalized_name`, `embedding`

---

### CE-007: Company Metadata Enrichment

**Rule:** Automatically enrich company data when first discovered

**Enrichment Data:**
- Website validation (SSL check, response code)
- Domain age (if accessible)
- Social media links (if on website)
- Logo (from website favicon)

**Enrichment Timing:**
- Trigger: 1 hour after company first saved
- Rationale: Allow initial discovery to be fast, enrich async

**Enrichment Failures:**
- Status → `enrichment_status = failed`
- Retry: Manual trigger only (to avoid wasting quota)

**Implementation:**
- Location: `/services/enrichment/src/company-enrichment.ts`
- Field: `companies.enrichment_status`

---

### CE-008: Mention Count & Diversity Calculation

**Rule:** Automatically calculate mention statistics for each company

**Mention Count:**
- Count: Total number of `company_mentions` for this company
- Updated: On every new mention insertion
- Trigger: Database trigger on `company_mentions` INSERT

**Newsletter Diversity:**
- Count: Number of DISTINCT newsletters mentioning this company
- Formula: `COUNT(DISTINCT emails.newsletter_name) FROM company_mentions JOIN emails`
- Updated: On every new mention insertion

**Usage:**
- Ranking companies by popularity
- Identifying cross-newsletter trends
- Quality signal (diversity > 1 is stronger signal)

**Implementation:**
- Location: Database triggers
- Fields: `companies.mention_count`, `companies.newsletter_diversity`

---

## Data Quality Rules

### DQ-001: Minimum Extraction Quality

**Rule:** Extraction must achieve 95% recall rate (miss <5% of companies)

**Measurement:**
- Sample 100 emails manually
- Count companies mentioned
- Compare to AI extraction results
- Calculate: (AI found / Manual count) = Recall %

**Quality Assurance:**
- Weekly QA checks on sample data
- If recall < 95%: Review prompt engineering
- If precision < 80%: Adjust confidence thresholds

**Precision vs. Recall Trade-off:**
- Prefer higher recall (miss fewer companies)
- Accept some false positives (filtered by confidence threshold)

---

### DQ-002: Duplicate Mention Prevention

**Rule:** Same company cannot be mentioned twice from same email

**Constraint:** `UNIQUE(company_id, email_id)` on `company_mentions` table

**Behavior:**
- If duplicate detected during insertion → Skip (no error)
- Rationale: Same newsletter may mention company multiple times, but count as 1 mention

**Edge Case:**
- Company mentioned in different contexts (positive + negative) → Keep first mention only

**Implementation:**
- Location: Database constraint
- SQL: `UNIQUE(company_id, email_id)`

---

### DQ-003: Data Validation Rules

**Email Validation:**
- Subject: Required, max 500 chars
- Sender: Required, valid email format
- Received date: Required, cannot be future date
- Message ID: Required, unique

**Company Validation:**
- Name: Required, 1-200 chars
- Description: Optional, max 1000 chars
- Website: Optional, valid URL format (must include protocol)
- Funding status: Must be one of: unknown, bootstrapped, seed, series-a, series-b, later-stage, public, acquired

**Company Mention Validation:**
- Context: Required, 10-500 chars
- Sentiment: Must be: positive, negative, neutral
- Confidence: Required, 0.0-1.0 float

**Implementation:**
- Location: Database constraints + Zod schemas in API routes
- Method: Validation before INSERT/UPDATE

---

### DQ-004: Embedding Quality

**Rule:** All company embeddings must be 1536-dimensional vectors

**Requirements:**
- Dimension: Exactly 1536 (OpenAI ada-002 standard)
- Values: Floats between -1.0 and 1.0
- Normalization: L2 normalized (unit vector)

**Generation:**
- Input: Company name + description (max 8000 chars for OpenAI)
- Model: text-embedding-ada-002
- Fallback: If description missing, use name only

**Quality Check:**
- Verify vector length = 1536
- Verify no NaN values
- Verify norm ≈ 1.0 (within 0.01 tolerance)

**Implementation:**
- Location: Embedding generation service
- Field: `companies.embedding`

---

## User Access & Permissions

### UAP-001: Row Level Security (RLS)

**Rule:** Users can only access their own data

**Tables with RLS:**
- `user_settings`: WHERE user_id = auth.uid()
- `user_todos`: WHERE user_id = auth.uid()
- `user_api_keys`: WHERE user_id = auth.uid()
- `user_webhooks`: WHERE user_id = auth.uid()
- `tracked_companies`: WHERE user_id = auth.uid()
- `newsletter_sources`: WHERE user_id = auth.uid()
- `user_preferences`: WHERE user_id = auth.uid()

**Service Role Exception:**
- Service role bypasses RLS (for pipelines)
- Used for email processing, extraction, report generation

**Admin Access:**
- No admin users in current implementation
- Future: Admin role can access all data for support

**Implementation:**
- Location: Supabase RLS policies
- Method: PostgreSQL policies on each table

---

### UAP-002: Shared Data Access

**Rule:** Some data is shared across all users (read-only for users)

**Shared Tables:**
- `emails`: All users see all emails (read-only)
- `companies`: All users see all companies (read-only)
- `company_mentions`: All users see all mentions (read-only)

**Rationale:**
- Intelligence is aggregated across all users
- More users = better data
- Privacy: No user-identifiable data in shared tables

**Write Access:**
- Only service role can INSERT/UPDATE shared tables
- Users cannot modify shared data

**Implementation:**
- Location: Supabase RLS policies
- Policy: SELECT allowed for authenticated users, INSERT/UPDATE only for service role

---

### UAP-003: API Key Permissions

**Rule:** API keys have scoped permissions, not full user access

**Permission Scopes:**
- `companies:read`: Read company data
- `companies:write`: Create/update companies (admin only)
- `mentions:read`: Read mention data
- `emails:read`: Read email metadata (not full content)
- `analytics:read`: Access analytics endpoints
- `reports:generate`: Generate reports programmatically

**Default Permissions (User-generated keys):**
- `companies:read`
- `mentions:read`
- `analytics:read`

**Admin Permissions (Manual grant only):**
- `companies:write`
- `emails:read`
- `reports:generate`

**Enforcement:**
- Check permissions on each API endpoint
- Return 403 Forbidden if lacking permission

**Implementation:**
- Location: API middleware
- Field: `user_api_keys.permissions` (JSONB array)

---

### UAP-004: Webhook Access Control

**Rule:** Webhooks can only trigger for user's own events

**Event Scoping:**
- `company.discovered`: Only companies discovered from user's emails
- `mention.added`: Only mentions from user's emails
- `report.generated`: Only user's reports

**Security:**
- Webhook URL validated (must be HTTPS)
- Webhook secret required (HMAC signature)
- Rate limiting: Max 100 webhook calls/hour per user

**Implementation:**
- Location: Webhook trigger logic
- Verification: HMAC SHA-256 signature in header

---

## Rate Limiting & Quotas

### RLQ-001: Gmail API Rate Limits

**Rule:** Respect Gmail API quotas to avoid account suspension

**Quotas (Gmail API):**
- Requests per day: 1,000,000,000 (effectively unlimited)
- Requests per second per user: 250 (rate-limited by Google)
- Requests per second (total): 25,000 (across all users)

**Application Rate Limits:**
- Email fetches per user per hour: 5
- Rationale: Prevent abuse, conserve quota
- Behavior: Return 429 after 5 fetches in 1 hour

**Burst Protection:**
- Max emails fetched per sync: 1000
- If more than 1000 emails: Fetch oldest 1000, user can run subsequent syncs

**Implementation:**
- Location: Gmail connector service
- Method: Upstash Redis rate limiting

---

### RLQ-002: Claude AI Rate Limits

**Rule:** Manage Claude API rate limits to prevent service disruption

**Claude API Quotas:**
- Requests per minute: 100 (Anthropic tier-dependent)
- Tokens per minute: 100,000 (tier-dependent)

**Application Rate Limits:**
- Extractions per minute per user: 100
- Concurrent extractions: 10
- Rationale: Stay under API quota, ensure fair access

**Backoff Strategy:**
- If 429 from Claude: Exponential backoff (2s, 4s, 8s, 16s, 32s)
- Max wait: 60 seconds
- After max wait: Fail extraction, retry later

**Implementation:**
- Location: Claude extractor service
- Method: Upstash Redis + SDK retry logic

---

### RLQ-003: Embedding Generation Rate Limits

**Rule:** Limit embedding generation to stay within OpenAI quotas

**OpenAI Quotas:**
- Requests per minute: 3,000 (tier-dependent)
- Tokens per minute: 1,000,000 (tier-dependent)

**Application Rate Limits:**
- Embeddings per minute: 100
- Batch size: 100 companies at once
- Rationale: Avoid quota exhaustion

**Backoff Strategy:**
- If 429 from OpenAI: Wait 60 seconds, retry

**Implementation:**
- Location: Embedding service
- Method: Upstash Redis rate limiting

---

### RLQ-004: Email Processing Throughput

**Rule:** Process emails at sustainable rate to avoid timeouts

**Processing Rate:**
- Emails per minute: 10 (with AI extraction)
- Emails per minute: 100 (without extraction, fetch only)

**Timeout Limits:**
- Per email extraction: 60 seconds max
- Total pipeline run: 300 seconds (5 minutes - Vercel Pro limit)

**Large Email Batches:**
- If > 50 emails: Process in background
- Use async job queue (Inngest) for batches > 100
- Send completion notification when done

**Implementation:**
- Location: Pipeline orchestration
- Method: Streaming responses + background jobs

---

### RLQ-005: API Endpoint Rate Limits

**Rule:** Public API endpoints rate-limited to prevent abuse

**Rate Limits by Endpoint:**
- `/api/companies`: 100 requests/minute
- `/api/analytics/*`: 50 requests/minute
- `/api/emails`: 100 requests/minute
- `/api/reports/generate`: 10 requests/hour (expensive)
- `/api/pipeline/sync`: 5 requests/hour (expensive)
- `/api/settings`: 20 requests/minute

**Per User vs. Global:**
- All limits are per user (by Clerk user ID)
- Global limits: 10x individual limits

**Enforcement:**
- Return 429 Too Many Requests
- Include `Retry-After` header (seconds)
- Log rate limit hits for abuse detection

**Implementation:**
- Location: API middleware
- Method: Upstash Redis with sliding window

---

### RLQ-006: Webhook Delivery Rate Limits

**Rule:** Limit webhook deliveries to prevent hammering external services

**Limits:**
- Webhook calls per user per hour: 100
- Concurrent webhook deliveries: 5
- Timeout per webhook: 10 seconds

**Retry Logic:**
- If webhook fails: Retry 3 times (2s, 4s, 8s backoff)
- If all retries fail: Log error, disable webhook after 10 consecutive failures

**Implementation:**
- Location: Webhook delivery service
- Method: Background job queue

---

## Report Generation Rules

### RGR-001: Report Scheduling

**Rule:** Reports generated on schedule based on user preferences

**Frequency Options:**
- Daily: Every day at user-specified time
- Weekly: Every [day of week] at user-specified time
- Monthly: Every 1st of month at user-specified time
- None: No scheduled reports (manual only)

**Timezone Handling:**
- User timezone: Stored in settings (default: auto-detected)
- Schedule: Converted to UTC for cron job
- Display: Always show times in user's timezone

**Example:**
- User in NYC (EST, UTC-5) sets 7:00 AM daily
- Cron job runs at 12:00 PM UTC
- Email delivered at 7:00 AM EST

**Implementation:**
- Location: Cron job `/api/cron/daily-intelligence`
- Method: Vercel cron with timezone conversion

---

### RGR-002: Report Content Inclusion

**Rule:** Reports include only high-quality, relevant companies

**Inclusion Criteria:**
- Confidence >= user's minimum threshold (default 0.6)
- Mentioned within report period (daily: 24h, weekly: 7d, monthly: 30d)
- Not from excluded newsletters
- Matches user's preferred industries (if set)

**Sorting:**
- Primary: Mention count (descending)
- Secondary: Newsletter diversity (descending)
- Tertiary: Confidence score (descending)

**Max Companies per Report:**
- Daily: Top 20 companies
- Weekly: Top 50 companies
- Monthly: Top 100 companies

**Rationale:** Focus on highest-signal companies

**Implementation:**
- Location: Report generation service
- Query: Filtered and sorted database query

---

### RGR-003: Report Format

**Rule:** Reports must be professional, branded, and readable

**PDF Requirements:**
- Page size: US Letter (8.5" x 11")
- Margins: 1" all sides
- Font: Professional sans-serif (Inter or similar)
- Branding: Logo in header, color scheme consistent

**HTML Email Requirements:**
- Responsive design (mobile-friendly)
- Plain text fallback for email clients without HTML
- Inline CSS (for email client compatibility)
- Max width: 600px

**Content Sections:**
1. Header: Report title, date range, user name
2. Summary: Key metrics (companies, mentions, sentiment)
3. Top Companies: Detailed cards with context
4. Trends: Charts and insights (if weekly/monthly)
5. Footer: Unsubscribe link, settings link

**Implementation:**
- Location: React Email templates + Puppeteer
- Templates: `/services/reports/src/templates/`

---

### RGR-004: Report Delivery

**Rule:** Deliver reports reliably to all recipients

**Delivery Method:** Email via Resend

**Recipients:**
- Primary: User's email (from Clerk profile)
- Additional: User-specified emails (max 5)

**Delivery Tracking:**
- Log all sends to `email_delivery_log`
- Track: sent, delivered, opened, clicked
- Alert user if delivery fails

**Attachment Rules:**
- Include PDF: Optional (user setting)
- PDF max size: 10 MB (if larger, provide download link instead)

**Failure Handling:**
- If send fails: Retry 3 times
- If all retries fail: Notify user via dashboard notification
- User can manually trigger re-send

**Implementation:**
- Location: Report delivery service
- Email provider: Resend

---

### RGR-005: Report History Retention

**Rule:** Store all generated reports for user access

**Retention Period:**
- Default: Unlimited (all reports saved forever)
- User configurable: 30, 60, 90 days, or unlimited

**Storage:**
- PDF stored in cloud storage (S3 or similar)
- Metadata in `report_history` table
- Download links expire after 30 days (regenerate on demand)

**Cleanup:**
- Daily cron job deletes reports older than retention period
- Cascade deletes delivery logs

**Implementation:**
- Location: Cron job `/api/cron/cleanup`
- Storage: Cloud storage with signed URLs

---

## Notification & Alert Rules

### NAR-001: Company Alert Triggers

**Rule:** Notify users when tracked companies are mentioned

**Trigger Conditions:**
- Company in user's "Tracked Companies" list
- New mention detected (after user started tracking)
- Confidence >= user's minimum threshold

**Alert Contents:**
- Company name
- Newsletter source
- Context snippet
- Sentiment
- Link to company detail page

**Delivery:**
- Email notification (if enabled)
- In-app notification (dashboard bell icon)

**Frequency:**
- Real-time: Immediately upon mention detection
- Digest: Once daily at user-specified time (if multiple mentions)

**Implementation:**
- Location: Extraction pipeline
- Trigger: After company mention saved, check tracked_companies

---

### NAR-002: Pipeline Error Notifications

**Rule:** Notify users of critical pipeline failures

**Error Types Requiring Notification:**
- Gmail connection lost (token expired)
- Daily sync failed (after all retries)
- Report generation failed
- Webhook delivery repeatedly failing

**Notification Method:**
- Email (if notification_enabled in settings)
- In-app banner on dashboard
- System status widget shows error state

**Error Details:**
- Error type and message
- Timestamp
- Recommended action (e.g., "Reconnect Gmail")
- Link to fix issue

**Implementation:**
- Location: Error handling in each service
- Method: Email via Resend + database notification record

---

### NAR-003: Notification Preferences

**Rule:** Users control notification types and frequency

**Notification Types:**
- Company alerts: On/off per tracked company
- Pipeline errors: Always on (critical)
- Report delivery confirmations: On/off
- System updates: On/off
- Marketing: On/off (separate from product notifications)

**Email Notifications:**
- Enable/disable globally
- Enable/disable per notification type

**In-App Notifications:**
- Always shown (cannot disable)
- Marked as read/unread
- Auto-dismiss after 7 days

**Implementation:**
- Location: User settings
- Fields: `notification_settings` JSONB in user_settings

---

## Data Retention & Cleanup

### DRC-001: Email Retention

**Rule:** Retain emails based on user preferences

**Default Retention:** 90 days
**User Configurable:** 30, 60, 90 days, or unlimited

**Cleanup Logic:**
- Daily cron job runs at midnight UTC
- Deletes emails older than retention period
- Cascade deletes: company_mentions from deleted emails
- Does NOT delete companies (companies preserved even if source email deleted)

**Rationale:**
- Conserve database storage
- GDPR compliance (right to erasure)
- Reduce costs

**Implementation:**
- Location: `/api/cron/cleanup`
- Field: `privacy_settings.retention_period`

---

### DRC-002: Company Retention

**Rule:** Companies are never automatically deleted

**Rationale:**
- Companies are aggregated knowledge (not user-specific)
- Deleting companies breaks mention links
- Users may want historical data

**Manual Deletion:**
- Admin can manually delete companies
- Cascade deletes all mentions
- Warning: "This will delete X mentions from Y emails"

**Orphaned Companies:**
- If all source emails deleted (past retention): Company remains
- Marked as "orphaned" (flag in database)
- Quarterly cleanup of orphaned companies with 0 mentions (admin approval required)

**Implementation:**
- Companies table has no retention policy
- Manual admin tools for cleanup

---

### DRC-003: Report Retention

**Rule:** Reports retained based on user settings

**Default Retention:** Unlimited
**User Configurable:** 30, 60, 90 days, or unlimited

**Cleanup Logic:**
- Daily cron job deletes reports older than retention period
- Cascade deletes: email_delivery_log entries
- PDFs deleted from cloud storage

**Special Cases:**
- Downloaded reports: Not tracked, user responsible for local copies
- Shared reports: Sharing links expire after 7 days

**Implementation:**
- Location: `/api/cron/cleanup`
- Field: `report_settings.retention_period`

---

### DRC-004: Todo Cleanup

**Rule:** Completed todos auto-archived after 30 days

**Retention:**
- Active todos: Kept forever (until completed or deleted)
- Completed todos: Archived after 30 days (hidden from UI)
- Archived todos: Permanently deleted after 180 days

**User Control:**
- User can manually delete todos anytime
- User can unarchive todos (move back to completed)

**Implementation:**
- Cron job: Daily cleanup
- Views: `user_todos_active`, `user_todos_completed` exclude archived

---

### DRC-005: API Key & Webhook Cleanup

**Rule:** Expired or unused credentials are automatically removed

**API Key Expiration:**
- Default expiration: 1 year from creation
- User configurable: 30, 90, 180, 365 days, or no expiration
- Expired keys: Deleted after 30 days (grace period for rotation)

**Unused API Keys:**
- If not used for 180 days: Mark as "inactive"
- User notified: "API key inactive, delete?"
- If still not used after 30 more days: Auto-delete

**Webhook Cleanup:**
- If webhook fails 10 consecutive times: Auto-disable
- User notified: "Webhook disabled due to failures"
- Disabled webhooks: Deleted after 30 days if not re-enabled

**Implementation:**
- Cron job: Weekly cleanup
- Notifications via email

---

## Pricing & Usage Limits

### PUL-001: Free Tier Limits

**Rule:** Free tier users have usage caps

**Free Tier Limits:**
- Emails processed per month: 1,000
- Companies tracked: 50
- Report generation: 10 reports/month
- API calls: 1,000 requests/month
- Storage: 1 GB

**Exceeding Limits:**
- Emails: Stop processing, notify user to upgrade
- Companies: Cannot add more tracked companies
- Reports: Cannot generate more reports
- API calls: Rate limited, returns 429
- Storage: Cannot upload more data

**Reset:**
- Monthly limits reset on 1st of each month

**Implementation:**
- Location: Usage tracking in database
- Enforcement: Middleware checks before operations

---

### PUL-002: Pro Tier Limits

**Rule:** Pro tier users have higher limits

**Pro Tier Limits:**
- Emails processed per month: 10,000
- Companies tracked: Unlimited
- Report generation: Unlimited
- API calls: 100,000 requests/month
- Storage: 10 GB

**Exceeding Limits:**
- Soft limits: Can exceed by 10% with warnings
- Hard limits: Must upgrade to Enterprise

**Implementation:**
- License check: Clerk user metadata or license table
- Enforcement: Same as free tier, different thresholds

---

### PUL-003: Enterprise Tier

**Rule:** Enterprise users have unlimited usage

**Enterprise Features:**
- Unlimited everything
- Custom integrations
- Dedicated support
- SLA guarantees
- On-premise deployment option

**Implementation:**
- Flag: `user_settings.tier = 'enterprise'`
- Bypass: All rate limits and quotas bypassed

---

## Security & Compliance Rules

### SCR-001: Data Encryption

**Rule:** All sensitive data encrypted at rest and in transit

**At Rest:**
- Database: Encrypted via Supabase (AES-256)
- Gmail tokens: Encrypted with AES-256 using app secret key
- API keys: Hashed with bcrypt (not reversible)
- Webhook secrets: Encrypted with AES-256

**In Transit:**
- All API calls: HTTPS only (TLS 1.2+)
- Webhook calls: HTTPS required, HTTP rejected
- Email: TLS encryption for SMTP

**Key Management:**
- Encryption key: Stored in environment variable (32 chars minimum)
- Rotation: Manual rotation every 90 days (best practice)

**Implementation:**
- Location: Encryption utilities in shared package
- Method: Node.js crypto module

---

### SCR-002: Authentication Requirements

**Rule:** All API endpoints require authentication (except public endpoints)

**Authentication Methods:**
1. **Clerk Session:** User logged in via Clerk (web UI)
2. **API Key:** User-generated API key in header (programmatic access)
3. **Cron Secret:** Vercel cron secret for scheduled jobs

**Public Endpoints (No Auth):**
- `/api/health`
- `/` (homepage)
- `/sign-in`, `/sign-up` (Clerk pages)

**Enforcement:**
- Middleware: Check auth on every protected route
- Return 401 Unauthorized if missing/invalid credentials

**Implementation:**
- Location: API middleware (Next.js middleware.ts)
- Method: Clerk auth() or API key validation

---

### SCR-003: GDPR Compliance

**Rule:** Comply with GDPR for EU users

**User Rights:**
1. **Right to Access:** User can export all their data (JSON/CSV)
2. **Right to Rectification:** User can edit settings and preferences
3. **Right to Erasure:** User can delete account (hard delete all user data)
4. **Right to Data Portability:** Export in machine-readable format (JSON)
5. **Right to Object:** User can opt out of analytics/marketing

**Implementation:**
- Export: `/api/settings/export`
- Delete: Account deletion in settings (irreversible)
- Opt-out: Privacy settings toggles

**Data Processing Agreement:**
- Supabase: DPA in place
- Anthropic: DPA in place
- OpenAI: DPA in place
- Resend: DPA in place

---

### SCR-004: Security Audit Logging

**Rule:** Log all security-relevant events for audit trail

**Events to Log:**
- User sign-up/sign-in
- Password changes (via Clerk)
- API key creation/deletion
- Webhook creation/modification
- OAuth token refresh
- Failed authentication attempts (brute force detection)
- Unusual activity (e.g., API calls from new IP)

**Log Retention:** 1 year minimum (compliance requirement)

**Access:** Admin only, via Axiom dashboard

**Implementation:**
- Location: Axiom logging
- Cron: `/api/cron/security-audit` (daily summary)

---

### SCR-005: OAuth Token Security

**Rule:** Protect OAuth tokens with encryption and rotation

**Storage:**
- Tokens encrypted before saving to database
- Encryption key: Environment variable (never in code)

**Refresh:**
- Access tokens: Refreshed automatically when expired
- Refresh tokens: Rotated every 7 days
- If refresh fails: Require user re-authentication

**Revocation:**
- User can disconnect Gmail anytime
- Tokens immediately deleted from database
- Google access revoked via API

**Implementation:**
- Location: Gmail connector service
- Method: Google OAuth2 client with automatic refresh

---

### SCR-006: API Rate Limit Abuse Prevention

**Rule:** Detect and prevent API abuse

**Abuse Indicators:**
- Exceeding rate limits repeatedly (10x in 1 hour)
- Unusual traffic patterns (bot-like behavior)
- Multiple failed authentication attempts (>10 in 5 minutes)

**Response:**
- Temporary ban: 1 hour cooldown
- If repeated: 24 hour cooldown
- If persistent: Manual review, potential account suspension

**Notification:**
- User emailed about suspicious activity
- Provide legitimate reason to appeal

**Implementation:**
- Location: Rate limiting middleware
- Method: Redis tracking of violations

---

## Business Logic Summary

**Total Business Rules:** 60+

**Critical Rules (Must Never Change):**
- Email deduplication (ER-003)
- Company name normalization (CE-005)
- Row level security (UAP-001)
- Data encryption (SCR-001)

**Configurable Rules (User/Admin Control):**
- Confidence thresholds (CE-002)
- Rate limits (RLQ-*)
- Retention periods (DRC-*)
- Notification preferences (NAR-003)

**Rules Requiring Regular Review:**
- Extraction quality targets (DQ-001) - Quarterly review
- Rate limits (RLQ-*) - Adjust based on usage patterns
- Free tier limits (PUL-001) - Review as costs change
- Security audit requirements (SCR-004) - Annual review

---

**End of Business Rules Documentation**
