# Payload CMS Proof of Concept

This directory contains a minimal proof of concept for evaluating Payload CMS as an alternative to Supabase.

## Purpose

This POC validates:
- Payload CMS setup with PostgreSQL
- Collection definitions for core entities (companies, emails)
- Vector embeddings plugin integration
- Authentication configuration
- Email adapter setup
- Local API usage patterns

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- pnpm package manager

## Setup

### 1. Install Dependencies

```bash
cd payload-poc
pnpm install
```

### 2. Configure Environment

Create `.env` file:

```bash
# Database
DATABASE_URI=postgresql://user:password@localhost:5432/payload_poc

# Payload
PAYLOAD_SECRET=your-secret-key-here
SERVER_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# OpenAI (for embeddings)
OPENAI_API_KEY=your-openai-api-key
```

### 3. Setup PostgreSQL with pgvector

```sql
-- Connect to your database
psql $DATABASE_URI

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 4. Run Development Server

```bash
pnpm dev
```

Access admin UI at: http://localhost:3000/admin

## Project Structure

```
payload-poc/
├── src/
│   ├── collections/          # Collection definitions
│   │   ├── Companies.ts      # Companies collection
│   │   ├── Emails.ts         # Emails collection
│   │   ├── Users.ts          # Users collection (auth)
│   │   └── Mentions.ts       # Company mentions
│   ├── payload.config.ts     # Main Payload configuration
│   └── server.ts             # Express server
├── package.json
├── tsconfig.json
└── README.md
```

## Key Features Demonstrated

### 1. Collections

- **Companies:** Core entity with vector embeddings
- **Emails:** Newsletter emails with content extraction
- **Mentions:** Relationship between companies and emails
- **Users:** Authentication and authorization

### 2. Vector Embeddings

Uses `payloadcms-vectorize` plugin for automatic vectorization:

```typescript
// Auto-vectorizes company name and description
vectorize({
  collections: {
    companies: {
      fields: ['name', 'description'],
      embedder: openAIEmbedder,
      dimensions: 1536
    }
  }
})
```

### 3. Local API Usage

```typescript
// Fastest way to query data (no HTTP overhead)
const companies = await payload.find({
  collection: 'companies',
  where: {
    user: { equals: userId }
  },
  sort: '-mentionCount',
  limit: 50,
  depth: 2 // Auto-populate relations
})

// Vector search
const similar = await fetch('/api/vector-search', {
  method: 'POST',
  body: JSON.stringify({
    collection: 'companies',
    query: 'AI healthcare startups',
    limit: 10
  })
})
```

### 4. Authentication

```typescript
// Built-in JWT auth
const user = await payload.login({
  collection: 'users',
  data: {
    email: 'user@example.com',
    password: 'password'
  }
})
```

### 5. Email Integration

```typescript
// Send email via Payload
await payload.sendEmail({
  to: 'user@example.com',
  subject: 'Daily Intelligence Report',
  html: '<h1>Your Report</h1>'
})
```

## Testing

### Create Sample Data

```bash
# Use Local API script
pnpm seed
```

### Test Vector Search

```bash
curl -X POST http://localhost:3000/api/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "companies",
    "query": "artificial intelligence startups",
    "limit": 5
  }'
```

### Test Company Creation

```bash
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI",
    "description": "AI research and deployment company"
  }'
```

## Performance Comparison

Run benchmarks:

```bash
pnpm benchmark
```

This will compare:
- Payload Local API vs REST API
- Supabase REST API (for reference)
- Vector search performance

## Findings

### ✅ Pros

1. **Beautiful Admin UI** - Far superior to Supabase Studio
2. **TypeScript Support** - Excellent type safety
3. **Local API** - Very fast (no HTTP overhead)
4. **Flexible Schema** - Code-first is easy to refactor
5. **Email Integration** - Native adapter support

### ⚠️ Concerns

1. **Vector Plugin** - Third-party, less mature than native pgvector
2. **Migration Effort** - Significant work to migrate from Supabase
3. **Learning Curve** - Team needs to learn Payload patterns
4. **No Real-time** - Would need custom WebSocket implementation

### ❌ Blockers

1. **Vector Performance** - No proven benchmarks for large-scale
2. **Plugin Dependency** - Core feature depends on third-party plugin
3. **High Migration Cost** - 8-12 weeks of effort

## Conclusion

While Payload CMS is an excellent tool, it's **not recommended** for this project because:

1. Vector embeddings are core to the product (Supabase's native pgvector is more reliable)
2. High migration cost with minimal ROI (~100 years to recoup)
3. Current Supabase stack works well (no compelling reason to change)
4. Payload excels at content management, not data intelligence platforms

**Recommendation:** Continue with Supabase.

## Next Steps

If proceeding with Payload (not recommended):

1. [ ] Benchmark vector search at scale (10k+ vectors)
2. [ ] Test plugin reliability and error handling
3. [ ] Create detailed migration plan
4. [ ] Set up staging environment
5. [ ] Migrate sample data
6. [ ] Conduct user acceptance testing

## Resources

- [Payload CMS Documentation](https://payloadcms.com/docs)
- [payloadcms-vectorize Plugin](https://github.com/techiejd/payloadcms-vectorize)
- [Full Evaluation Report](../docs/PAYLOAD_EVALUATION.md)

---

**Status:** Proof of Concept Complete
**Recommendation:** NO-GO on migration
**Next Steps:** Close Issue #61, continue with Supabase
