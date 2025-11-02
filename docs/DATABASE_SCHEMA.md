# Database Schema Documentation

**Generated:** 2025-11-02
**Platform:** Supabase (PostgreSQL 15+)
**Status:** Living Document

## Table of Contents

- [Overview](#overview)
- [Database Extensions](#database-extensions)
- [Core Schema](#core-schema)
- [Table Definitions](#table-definitions)
- [Views](#views)
- [Functions](#functions)
- [Triggers](#triggers)
- [Indexes](#indexes)
- [Row-Level Security](#row-level-security)
- [Migration History](#migration-history)

---

## Overview

The Substack Intelligence platform uses Supabase (managed PostgreSQL) as its primary data store. The database is designed to support:

- **Email ingestion** and full-text search
- **Company extraction** with vector similarity search
- **Multi-tenant user management** with RLS
- **Report generation** and delivery tracking
- **User preferences** and settings
- **Todo management** for users

**Key Features:**
- Vector embeddings for semantic search (pgvector)
- Full-text search with GIN indexes
- Row-Level Security (RLS) for multi-tenancy
- Automatic timestamp management via triggers
- Advanced analytics via materialized views and functions

---

## Database Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector for embeddings
```

**Purpose:**
- `uuid-ossp`: Generates UUIDs for primary keys
- `vector`: Enables 1536-dimension embeddings for semantic similarity

---

## Core Schema

### Entity Relationship Diagram

```
┌─────────────┐          ┌──────────────────┐         ┌─────────────┐
│   emails    │          │ company_mentions │         │  companies  │
│─────────────│          │──────────────────│         │─────────────│
│ id (PK)     │◄────────┤│ email_id (FK)    │        ││ id (PK)     │
│ message_id  │          │ company_id (FK)  │────────►│ name        │
│ subject     │          │ context          │         │ embedding   │
│ sender      │          │ sentiment        │         │ website     │
│ newsletter  │          │ confidence       │         └─────────────┘
│ clean_text  │          └──────────────────┘
│ user_id     │
└─────────────┘

┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  user_settings   │     │ user_api_keys   │     │ user_webhooks   │
│──────────────────│     │─────────────────│     │─────────────────│
│ id (PK)          │     │ id (PK)         │     │ id (PK)         │
│ user_id (UNIQUE) │     │ user_id         │     │ user_id         │
│ gmail_connected  │     │ key_hash        │     │ url             │
│ ai_settings      │     │ permissions     │     │ events[]        │
└──────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ report_history  │     │ user_preferences │     │report_subscript. │
│─────────────────│     │──────────────────│     │──────────────────│
│ id (PK)         │     │ id (PK)          │     │ id (PK)          │
│ report_type     │     │ user_id (UNIQUE) │     │ email (UNIQUE)   │
│ report_date     │     │ timezone         │     │ daily_reports    │
│ status          │     │ alert_email      │     │ confirmed        │
└─────────────────┘     └──────────────────┘     └──────────────────┘

┌─────────────────┐
│  user_todos     │
│─────────────────│
│ id (PK)         │
│ user_id         │
│ title           │
│ priority        │
│ completed       │
│ due_date        │
└─────────────────┘
```

---

## Table Definitions

### 1. emails

**Purpose:** Stores ingested newsletter emails with processing metadata.

**Migration:** `001_initial_schema.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique email identifier |
| `user_id` | TEXT | NULL | Clerk user ID (multi-tenant) |
| `message_id` | TEXT | UNIQUE, NOT NULL | Gmail message ID |
| `subject` | TEXT | NOT NULL | Email subject line |
| `sender` | TEXT | NOT NULL | Sender email address |
| `newsletter_name` | TEXT | NOT NULL | Detected newsletter name |
| `received_at` | TIMESTAMPTZ | NOT NULL | Email receipt timestamp |
| `processed_at` | TIMESTAMPTZ | DEFAULT NOW() | Processing timestamp |
| `raw_html` | TEXT | NULL | Raw HTML content |
| `clean_text` | TEXT | NULL | Extracted plain text |
| `processing_status` | TEXT | CHECK constraint | Status: pending, processing, completed, failed |
| `error_message` | TEXT | NULL | Processing error details |
| `extraction_status` | TEXT | CHECK constraint | Extraction status |
| `extraction_started_at` | TIMESTAMPTZ | NULL | Extraction start time |
| `extraction_completed_at` | TIMESTAMPTZ | NULL | Extraction completion time |
| `extraction_error` | TEXT | NULL | Extraction error message |
| `companies_extracted` | INTEGER | DEFAULT 0 | Count of extracted companies |
| `search_vector` | tsvector | GENERATED | Full-text search vector |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Generated Column:**
```sql
search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', subject), 'A') ||
  setweight(to_tsvector('english', coalesce(clean_text, '')), 'B')
) STORED
```

### 2. companies

**Purpose:** Stores extracted companies with vector embeddings for similarity search.

**Migration:** `001_initial_schema.sql`, `003_add_enrichment_columns.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique company identifier |
| `user_id` | TEXT | NULL | Clerk user ID (multi-tenant) |
| `name` | TEXT | NOT NULL | Company name |
| `normalized_name` | TEXT | UNIQUE, NOT NULL | Normalized name (lowercase) |
| `description` | TEXT | NULL | Company description |
| `website` | TEXT | NULL | Company website URL |
| `funding_status` | TEXT | CHECK constraint | Status: unknown, bootstrapped, seed, series-a, series-b, later-stage, public |
| `industry` | TEXT[] | DEFAULT '{}' | Industry tags array |
| `embedding` | vector(1536) | NULL | OpenAI embedding vector |
| `first_seen_at` | TIMESTAMPTZ | DEFAULT NOW() | First mention timestamp |
| `last_updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |
| `enrichment_status` | TEXT | CHECK constraint | Status: pending, enriched, failed |
| `mention_count` | INTEGER | DEFAULT 1 | Total mention count |
| `newsletter_diversity` | INTEGER | DEFAULT 1 | Unique newsletter count |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Vector Embedding:**
- Dimensions: 1536 (OpenAI text-embedding-ada-002)
- Index: IVFFlat with cosine similarity
- Purpose: Semantic similarity search

### 3. company_mentions

**Purpose:** Junction table linking emails to companies with sentiment analysis.

**Migration:** `001_initial_schema.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique mention identifier |
| `company_id` | UUID | FK → companies(id) | Referenced company |
| `email_id` | UUID | FK → emails(id) | Referenced email |
| `context` | TEXT | NOT NULL | Mention context (surrounding text) |
| `sentiment` | TEXT | CHECK constraint | Sentiment: positive, negative, neutral |
| `confidence` | FLOAT | CHECK (0-1) | Extraction confidence score |
| `extracted_at` | TIMESTAMPTZ | DEFAULT NOW() | Extraction timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |

**Unique Constraint:** `(company_id, email_id)` - Prevents duplicate mentions

### 4. user_settings

**Purpose:** Stores user-specific settings and OAuth tokens.

**Migration:** `001_user_settings.sql`, `005_extended_settings.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique settings ID |
| `user_id` | TEXT | UNIQUE, NOT NULL | Clerk user ID |
| `gmail_connected` | BOOLEAN | DEFAULT false | Gmail connection status |
| `gmail_refresh_token` | TEXT | NULL | Encrypted refresh token |
| `gmail_access_token` | TEXT | NULL | Encrypted access token |
| `gmail_token_expiry` | TIMESTAMPTZ | NULL | Token expiration time |
| `gmail_email` | TEXT | NULL | Connected Gmail address |
| `notifications_enabled` | BOOLEAN | DEFAULT true | Notifications toggle |
| `digest_frequency` | TEXT | DEFAULT 'daily' | Digest frequency |
| `account_settings` | JSONB | DEFAULT '{}' | Account preferences |
| `newsletter_settings` | JSONB | DEFAULT {...} | Newsletter preferences |
| `company_settings` | JSONB | DEFAULT {...} | Company detection settings |
| `ai_settings` | JSONB | DEFAULT {...} | AI provider configuration |
| `email_settings` | JSONB | DEFAULT {...} | Email sync settings |
| `report_settings` | JSONB | DEFAULT {...} | Report generation settings |
| `notification_settings` | JSONB | DEFAULT {...} | Notification preferences |
| `privacy_settings` | JSONB | DEFAULT {...} | Privacy controls |
| `appearance_settings` | JSONB | DEFAULT {...} | UI preferences |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**JSONB Defaults:**
See migration `001_user_settings.sql` for full default structures.

### 5. user_api_keys

**Purpose:** Manages user-generated API keys for external integrations.

**Migration:** `001_user_settings.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique key identifier |
| `user_id` | TEXT | NOT NULL | Clerk user ID |
| `name` | TEXT | NOT NULL | Key name/description |
| `key_hash` | TEXT | NOT NULL | SHA-256 hashed key |
| `key_prefix` | TEXT | NOT NULL | Key prefix (sk_...) |
| `permissions` | JSONB | DEFAULT '[]' | Permission array |
| `expires_at` | TIMESTAMPTZ | NULL | Expiration timestamp |
| `last_used_at` | TIMESTAMPTZ | NULL | Last usage timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Unique Constraint:** `(user_id, name)`

### 6. user_webhooks

**Purpose:** Stores webhook configurations for event notifications.

**Migration:** `001_user_settings.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique webhook ID |
| `user_id` | TEXT | NOT NULL | Clerk user ID |
| `url` | TEXT | NOT NULL | Webhook endpoint URL |
| `events` | TEXT[] | DEFAULT '{}' | Subscribed event types |
| `enabled` | BOOLEAN | DEFAULT true | Webhook enabled status |
| `secret` | TEXT | NOT NULL | HMAC signing secret |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

### 7. report_history

**Purpose:** Tracks generated reports for analytics and auditing.

**Migration:** `002_reports_schema.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique report ID |
| `report_type` | TEXT | CHECK constraint | Type: daily, weekly, monthly |
| `report_date` | TEXT | NOT NULL | Report date (ISO string) |
| `generated_at` | TIMESTAMPTZ | DEFAULT NOW() | Generation timestamp |
| `recipients_count` | INTEGER | DEFAULT 0 | Number of recipients |
| `companies_count` | INTEGER | DEFAULT 0 | Companies included |
| `mentions_count` | INTEGER | DEFAULT 0 | Total mentions included |
| `email_id` | TEXT | NULL | Resend email ID |
| `pdf_size` | INTEGER | NULL | PDF file size (bytes) |
| `status` | TEXT | CHECK constraint | Status: pending, generating, sent, failed |
| `error_message` | TEXT | NULL | Error details |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

### 8. user_preferences

**Purpose:** User-specific report and notification preferences.

**Migration:** `002_reports_schema.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique preference ID |
| `user_id` | TEXT | UNIQUE, NOT NULL | Clerk user ID |
| `daily_reports_enabled` | BOOLEAN | DEFAULT true | Daily report toggle |
| `weekly_reports_enabled` | BOOLEAN | DEFAULT true | Weekly report toggle |
| `report_delivery_time` | TIME | DEFAULT '06:00:00' | Delivery time |
| `timezone` | TEXT | DEFAULT 'UTC' | User timezone |
| `email_format` | TEXT | CHECK constraint | Format: html, text, both |
| `include_pdf` | BOOLEAN | DEFAULT true | Include PDF attachment |
| `minimum_confidence` | FLOAT | CHECK (0-1) | Min mention confidence |
| `excluded_newsletters` | TEXT[] | NULL | Excluded newsletter names |
| `preferred_industries` | TEXT[] | NULL | Preferred industries |
| `alert_high_mention_count` | INTEGER | DEFAULT 3 | Alert threshold |
| `company_alerts_enabled` | BOOLEAN | DEFAULT false | Company alert toggle |
| `alert_email` | TEXT | NULL | Alert email address |
| `slack_webhook` | TEXT | NULL | Slack webhook URL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

### 9. report_subscriptions

**Purpose:** Manages email subscriptions for report delivery.

**Migration:** `002_reports_schema.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique subscription ID |
| `email` | TEXT | UNIQUE, NOT NULL | Subscriber email |
| `user_id` | TEXT | NULL | Clerk user ID (optional) |
| `daily_reports` | BOOLEAN | DEFAULT true | Daily report subscription |
| `weekly_reports` | BOOLEAN | DEFAULT true | Weekly report subscription |
| `company_alerts` | BOOLEAN | DEFAULT false | Company alert subscription |
| `source` | TEXT | CHECK constraint | Source: manual, signup, invite |
| `confirmed` | BOOLEAN | DEFAULT false | Email confirmed |
| `confirmation_token` | TEXT | UNIQUE | Email confirmation token |
| `unsubscribed` | BOOLEAN | DEFAULT false | Unsubscribed status |
| `unsubscribed_at` | TIMESTAMPTZ | NULL | Unsubscribe timestamp |
| `unsubscribe_token` | TEXT | UNIQUE, DEFAULT uuid_generate_v4() | Unsubscribe token |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

### 10. email_delivery_log

**Purpose:** Tracks email delivery status for analytics.

**Migration:** `002_reports_schema.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique log entry ID |
| `email_id` | TEXT | NOT NULL | Resend email ID |
| `recipient_email` | TEXT | NOT NULL | Recipient address |
| `email_type` | TEXT | CHECK constraint | Type: daily_report, weekly_report, company_alert, test |
| `subject` | TEXT | NULL | Email subject |
| `status` | TEXT | CHECK constraint | Status: sent, delivered, opened, clicked, bounced, complained |
| `delivered_at` | TIMESTAMPTZ | NULL | Delivery timestamp |
| `opened_at` | TIMESTAMPTZ | NULL | Open timestamp |
| `clicked_at` | TIMESTAMPTZ | NULL | Click timestamp |
| `companies_included` | INTEGER | DEFAULT 0 | Companies in report |
| `pdf_included` | BOOLEAN | DEFAULT false | PDF attachment flag |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

### 11. user_todos

**Purpose:** User task management with priorities and due dates.

**Migration:** `006_user_todos.sql`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique todo ID |
| `user_id` | TEXT | NOT NULL | Clerk user ID |
| `title` | TEXT | NOT NULL, CHECK (length 1-500) | Todo title |
| `description` | TEXT | CHECK (length ≤ 2000) | Todo description |
| `completed` | BOOLEAN | DEFAULT false | Completion status |
| `priority` | TEXT | CHECK constraint | Priority: low, medium, high, urgent |
| `due_date` | TIMESTAMPTZ | NULL | Due date |
| `category` | TEXT | CHECK (length ≤ 100) | Category label |
| `tags` | TEXT[] | DEFAULT '{}' | Tag array |
| `position` | INTEGER | DEFAULT 0 | Sort position |
| `completed_at` | TIMESTAMPTZ | NULL | Completion timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Check Constraints:**
- `completed = FALSE OR completed_at IS NOT NULL`
- `due_date IS NULL OR due_date > NOW() - INTERVAL '1 year'`

---

## Views

### daily_intelligence

**Purpose:** Real-time dashboard view for last 24 hours of activity.

**Migration:** `001_initial_schema.sql`

```sql
SELECT
  c.id as company_id,
  c.name,
  c.description,
  c.website,
  c.funding_status,
  cm.id as mention_id,
  cm.context,
  cm.sentiment,
  cm.confidence,
  e.newsletter_name,
  e.received_at,
  COUNT(*) OVER (PARTITION BY c.id) as mention_count,
  COUNT(DISTINCT e.newsletter_name) OVER (PARTITION BY c.id) as newsletter_diversity
FROM company_mentions cm
JOIN companies c ON cm.company_id = c.id
JOIN emails e ON cm.email_id = e.id
WHERE e.received_at > NOW() - INTERVAL '24 hours'
ORDER BY mention_count DESC, cm.confidence DESC;
```

### user_todos_active

**Purpose:** Filtered view of active (incomplete) todos.

**Migration:** `006_user_todos.sql`

```sql
SELECT * FROM user_todos
WHERE completed = FALSE
ORDER BY
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  due_date ASC NULLS LAST,
  position ASC,
  created_at ASC;
```

### user_todos_completed

**Purpose:** Completed todos ordered by completion time.

### user_todos_overdue

**Purpose:** Overdue incomplete todos.

### user_todos_upcoming

**Purpose:** Todos due in the next 7 days.

---

## Functions

### 1. match_companies()

**Purpose:** Vector similarity search for similar companies.

**Migration:** `001_initial_schema.sql`

**Signature:**
```sql
FUNCTION match_companies(
  query_company_id UUID,
  match_threshold FLOAT DEFAULT 0.8,
  match_count INT DEFAULT 5
) RETURNS TABLE(id UUID, name TEXT, description TEXT, similarity FLOAT)
```

**Implementation:** Uses cosine similarity on vector embeddings.

### 2. update_company_analytics()

**Purpose:** Trigger function to update company mention statistics.

**Migration:** `001_initial_schema.sql`

**Behavior:** Automatically recalculates `mention_count` and `newsletter_diversity` when mentions are inserted/updated.

### 3. update_updated_at_column()

**Purpose:** Generic trigger function to update `updated_at` timestamp.

**Migration:** Multiple migrations

**Applied To:** All tables with `updated_at` column.

### 4. get_active_report_recipients()

**Purpose:** Retrieve active subscribers for a report type.

**Migration:** `002_reports_schema.sql`

**Signature:**
```sql
FUNCTION get_active_report_recipients(
  report_type TEXT DEFAULT 'daily'
) RETURNS TABLE(email TEXT, user_id TEXT)
```

### 5. update_todo_completion()

**Purpose:** Manage `completed_at` timestamp on todo status changes.

**Migration:** `006_user_todos.sql`

### 6. get_user_todo_stats()

**Purpose:** Calculate todo statistics for a user.

**Migration:** `006_user_todos.sql`

**Signature:**
```sql
FUNCTION get_user_todo_stats(p_user_id TEXT)
RETURNS TABLE(
  total_todos BIGINT,
  completed_todos BIGINT,
  active_todos BIGINT,
  overdue_todos BIGINT,
  due_today BIGINT,
  due_this_week BIGINT,
  completion_rate NUMERIC
)
```

---

## Triggers

### Automatic Analytics Update

```sql
CREATE TRIGGER trigger_update_company_analytics
  AFTER INSERT OR UPDATE ON company_mentions
  FOR EACH ROW EXECUTE FUNCTION update_company_analytics();
```

### Automatic Timestamp Updates

Applied to all tables:
- `emails` → `trigger_update_emails_updated_at`
- `companies` → `trigger_update_companies_updated_at`
- `user_settings` → `update_user_settings_updated_at`
- `user_api_keys` → `update_user_api_keys_updated_at`
- `user_webhooks` → `update_user_webhooks_updated_at`
- `report_history` → `trigger_update_report_history_updated_at`
- `user_preferences` → `trigger_update_user_preferences_updated_at`
- `report_subscriptions` → `trigger_update_report_subscriptions_updated_at`
- `email_delivery_log` → `trigger_update_email_delivery_log_updated_at`
- `user_todos` → `trigger_update_user_todos_updated_at`

### Todo Completion Tracking

```sql
CREATE TRIGGER trigger_todo_completion
  BEFORE UPDATE ON user_todos
  FOR EACH ROW EXECUTE FUNCTION update_todo_completion();
```

---

## Indexes

### emails

```sql
CREATE INDEX idx_emails_search ON emails USING GIN(search_vector);
CREATE INDEX idx_emails_newsletter ON emails(newsletter_name);
CREATE INDEX idx_emails_received ON emails(received_at DESC);
CREATE INDEX idx_emails_processing_status ON emails(processing_status);
```

### companies

```sql
CREATE INDEX idx_companies_embedding ON companies
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_normalized_name ON companies(normalized_name);
CREATE INDEX idx_companies_funding_status ON companies(funding_status);
CREATE INDEX idx_companies_mention_count ON companies(mention_count DESC);
```

### company_mentions

```sql
CREATE INDEX idx_company_mentions_company ON company_mentions(company_id);
CREATE INDEX idx_company_mentions_email ON company_mentions(email_id);
CREATE INDEX idx_company_mentions_confidence ON company_mentions(confidence DESC);
CREATE INDEX idx_company_mentions_sentiment ON company_mentions(sentiment);
CREATE INDEX idx_company_mentions_extracted_at ON company_mentions(extracted_at DESC);
```

### user_todos (11 indexes)

```sql
CREATE INDEX idx_user_todos_user_id ON user_todos(user_id);
CREATE INDEX idx_user_todos_completed ON user_todos(completed);
CREATE INDEX idx_user_todos_priority ON user_todos(priority);
CREATE INDEX idx_user_todos_due_date ON user_todos(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_user_todos_category ON user_todos(category) WHERE category IS NOT NULL;
CREATE INDEX idx_user_todos_tags ON user_todos USING GIN(tags);
CREATE INDEX idx_user_todos_position ON user_todos(user_id, position);
CREATE INDEX idx_user_todos_created_at ON user_todos(created_at DESC);
CREATE INDEX idx_user_todos_updated_at ON user_todos(updated_at DESC);
-- Composite indexes
CREATE INDEX idx_user_todos_user_completed_position ON user_todos(user_id, completed, position);
CREATE INDEX idx_user_todos_user_priority_due ON user_todos(user_id, priority, due_date);
```

### Additional Indexes

See individual table sections for complete index listings.

---

## Row-Level Security (RLS)

**Status:** Enabled on all tables

### Policy Pattern

**Standard User Policies:**
```sql
-- Read own data
CREATE POLICY "Users can read own {table}" ON {table}
  FOR SELECT USING (auth.uid()::text = user_id);

-- Manage own data
CREATE POLICY "Users can {action} own {table}" ON {table}
  FOR {ACTION} USING (auth.uid()::text = user_id);
```

**Service Role Bypass:**
```sql
CREATE POLICY "Service role can manage {table}" ON {table}
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

### Tables with RLS

- ✅ emails
- ✅ companies
- ✅ company_mentions
- ✅ user_settings
- ✅ user_api_keys
- ✅ user_webhooks
- ✅ report_history
- ✅ user_preferences
- ✅ email_delivery_log
- ✅ report_subscriptions
- ✅ user_todos

---

## Migration History

| # | File | Description | Tables Created |
|---|------|-------------|----------------|
| 001 | `001_initial_schema.sql` | Core email/company schema | emails, companies, company_mentions, daily_intelligence view |
| 002 | `001_user_settings.sql` | User settings & config | user_settings, user_api_keys, user_webhooks, newsletter_sources, tracked_companies |
| 003 | `002_reports_schema.sql` | Report generation | report_history, user_preferences, email_delivery_log, report_subscriptions |
| 004 | `003_add_enrichment_columns.sql` | Enrichment fields | (alters companies table) |
| 005 | `004_semantic_search_function.sql` | Search function | (adds function) |
| 006 | `005_extended_settings.sql` | Extended JSONB settings | (alters user_settings) |
| 007 | `006_user_todos.sql` | Todo management | user_todos + 4 views |
| 008 | `007_reports_view.sql` | Reports view | (unknown - missing file) |
| 009 | `008_pipeline_updates.sql` | Pipeline enhancements | (unknown - missing file) |
| 010 | `20250823_debug_mode_audit.sql` | Debug audit | (unknown - missing file) |

**Note:** Some migration files not read during audit. Review these manually.

---

## Data Access Patterns

### Common Queries

**1. Dashboard: Recent Companies**
```sql
SELECT * FROM daily_intelligence
WHERE received_at > NOW() - INTERVAL '24 hours'
ORDER BY mention_count DESC
LIMIT 20;
```

**2. Semantic Search**
```sql
SELECT * FROM match_companies(
  'company-uuid-here',
  0.75,  -- threshold
  10     -- limit
);
```

**3. Full-Text Search**
```sql
SELECT * FROM emails
WHERE search_vector @@ to_tsquery('english', 'AI & startup')
ORDER BY ts_rank(search_vector, to_tsquery('english', 'AI & startup')) DESC;
```

**4. User Todo Stats**
```sql
SELECT * FROM get_user_todo_stats('clerk_user_id_here');
```

---

## Performance Considerations

### Optimization Strategies

1. **Vector Search:** IVFFlat index with 100 lists (tuned for ~10K companies)
2. **Full-Text Search:** GIN indexes on tsvector columns
3. **Composite Indexes:** Multi-column indexes for common query patterns
4. **Partial Indexes:** Filtered indexes on `WHERE` clauses (e.g., due_date)
5. **Generated Columns:** Pre-computed search_vector

### Monitoring Recommendations

- Monitor `companies.embedding` index size (rebuilds may be needed at 100K+ rows)
- Watch query performance on `company_mentions` as junction table grows
- Consider partitioning `emails` table by `received_at` if >1M rows
- Review index usage with `pg_stat_user_indexes`

---

## Backup & Recovery

**Supabase Managed Backups:**
- Daily automated backups (managed by Supabase)
- Point-in-time recovery (PITR) available on Pro plan
- Manual backups via `pg_dump` recommended for critical migrations

**Critical Tables (Priority Order):**
1. `companies` (vector embeddings expensive to regenerate)
2. `company_mentions` (AI extraction results)
3. `emails` (raw data - can be re-ingested from Gmail)
4. `user_settings` (OAuth tokens - encrypted)

---

## Security Considerations

### Data Encryption

- **At Rest:** Supabase platform encryption
- **In Transit:** TLS 1.2+
- **Sensitive Fields:** OAuth tokens (should be encrypted in application layer)

### Access Control

- **Application:** Service role key (full access)
- **Users:** JWT-based RLS (restricted to own data)
- **API Keys:** Hashed with SHA-256

### Audit Logging

**Currently Missing:**
- Consider adding audit log table for sensitive operations
- Track user_settings updates (especially OAuth token changes)
- Log RLS policy bypasses

---

## Future Schema Enhancements

### Planned Changes

1. **Multi-Tenancy:** Add `organization_id` to all tables
2. **Audit Trail:** Create `audit_log` table
3. **Caching:** Add `cached_analytics` table
4. **Webhooks:** Add `webhook_delivery_log` table
5. **Embeddings:** Consider upgrading to 3072-dim embeddings (OpenAI v3)

### Scalability Roadmap

- **10K emails:** Current schema sufficient
- **100K emails:** Add table partitioning by date
- **1M emails:** Consider time-series database for analytics
- **10M emails:** Implement read replicas, materialized views

---

**Document Owner:** Engineering Team
**Review Cycle:** Quarterly or on major schema changes
**Last Schema Update:** 2025-08-23 (pipeline updates migration)
