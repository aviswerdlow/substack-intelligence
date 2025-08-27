# Substack Intelligence Platform

AI-powered venture intelligence platform for consumer VC deal sourcing. Automatically extracts and analyzes company mentions from curated Substack newsletters, transforming manual research into automated daily intelligence briefings.

## 🚀 Features

- **Automated Email Processing**: Gmail API integration to fetch Substack newsletters
- **AI-Powered Extraction**: Claude 3 Opus for company mention extraction with 95% accuracy
- **Real-time Intelligence**: Live dashboard with Supabase real-time subscriptions
- **Smart Deduplication**: Advanced company matching and consolidation
- **Vector Search**: Semantic similarity matching for company discovery
- **Workflow Orchestration**: Reliable daily processing with Inngest

## 🏗️ Architecture

Built with modern, edge-native architecture:

- **Framework**: Next.js 14 App Router with TypeScript
- **Database**: Supabase (PostgreSQL) with vector embeddings
- **Authentication**: Clerk for enterprise-grade auth
- **AI/ML**: Anthropic Claude 3 Opus + OpenAI embeddings
- **Orchestration**: Inngest for reliable workflows
- **Deployment**: Vercel Edge Functions
- **Monitoring**: Axiom for structured logging

## 📁 Project Structure

```
substack-intelligence/
├── apps/
│   ├── web/                 # Next.js 14 application
│   └── email/               # React Email templates
├── packages/
│   ├── database/            # Supabase client & queries
│   ├── shared/              # Shared types & utilities
│   └── ai/                  # LLM abstractions
├── services/
│   ├── ingestion/           # Gmail connector
│   ├── extraction/          # Claude integration
│   └── enrichment/          # Company data enrichment
└── infrastructure/
    ├── supabase/            # Database migrations
    └── monitoring/          # Observability config
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+
- pnpm package manager
- Supabase account
- Anthropic API key
- Google Cloud Console project (for Gmail API)
- Clerk account

### 1. Clone and Install

```bash
git clone <repository-url>
cd substack-intelligence
pnpm install
```

### 2. Environment Setup

Copy the environment template and fill in your API keys:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-key
CLERK_SECRET_KEY=sk_test_your-key

# AI Services
ANTHROPIC_API_KEY=sk-ant-your-key

# Google Gmail API
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### 3. Database Setup

Initialize Supabase and run migrations:

```bash
# Start Supabase locally
npx supabase start

# Run migrations
npx supabase db push

# Generate TypeScript types
pnpm db:generate
```

### 4. Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## 🧪 Testing the System

### Health Check

Visit `/api/health` to verify all services are connected:

```bash
curl http://localhost:3000/api/health
```

### Test Company Extraction

Test the Claude extraction service:

```bash
# Test with sample data
curl http://localhost:3000/api/test/extract

# Test with custom content
curl -X POST http://localhost:3000/api/test/extract \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Glossier just raised $80M in Series E funding...",
    "newsletterName": "Test Newsletter"
  }'
```

### Test Gmail Connection

Verify Gmail API connectivity:

```bash
curl http://localhost:3000/api/test/gmail
```

### Manual Pipeline Trigger

Trigger the intelligence pipeline manually:

```bash
curl -X POST http://localhost:3000/api/trigger/intelligence
```

## 📊 Daily Intelligence Pipeline

The system runs automated daily processing at 6 AM:

1. **Email Ingestion** - Fetches yesterday's Substack emails via Gmail API
2. **AI Extraction** - Uses Claude 3 Opus to extract company mentions
3. **Data Storage** - Stores companies and mentions in Supabase
4. **Deduplication** - Consolidates duplicate companies by normalized name
5. **Analytics Update** - Updates mention counts and newsletter diversity

## 🔒 Security Features

- **Authentication**: Clerk-powered auth with organization support
- **Row Level Security**: Supabase RLS policies for data isolation
- **Rate Limiting**: Upstash Redis for API rate limiting
- **Security Headers**: CSP, HSTS, and other security headers
- **Input Validation**: Zod schemas for type-safe validation

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic CI/CD

### Supabase Production

1. Create production Supabase project
2. Run migrations in production
3. Update environment variables

## 📈 Monitoring & Analytics

- **Structured Logging**: Axiom integration for log analysis
- **Error Tracking**: Comprehensive error handling and reporting
- **Performance Metrics**: API response times and processing stats
- **Business Metrics**: Company extraction accuracy and coverage

## 🛣️ Roadmap

### Phase 1: MVP ✅
- [x] Gmail API integration
- [x] Claude extraction service
- [x] Basic database schema
- [x] Daily workflow automation

### Phase 2: Enhancement
- [ ] Real-time dashboard UI
- [ ] Company enrichment pipeline
- [ ] PDF report generation
- [ ] Email delivery system

### Phase 3: Intelligence
- [ ] Trend detection across time
- [ ] Sentiment analysis refinement
- [ ] Category clustering
- [ ] Weekly intelligence reports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

Private - All rights reserved

## 📞 Support

For questions or support, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for venture intelligence**Deployment test 1756314988
