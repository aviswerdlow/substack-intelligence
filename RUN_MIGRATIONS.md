# Running Supabase Migrations

## Option 1: Using Supabase CLI (Recommended)

### Step 1: Get Supabase Access Token
1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Give it a name (e.g., "CLI Access")
4. Copy the token

### Step 2: Login to Supabase CLI
```bash
supabase login
# Paste your access token when prompted
```

### Step 3: Link Your Project
```bash
cd /Users/aviswerdlow/Documents/Coding/substack
supabase link --project-ref yjsrugmmgzbmyrodufin
```

### Step 4: Run Migrations
```bash
# Run all migrations
supabase db push

# Or run them individually:
supabase db push infrastructure/supabase/migrations/001_initial_schema.sql
supabase db push infrastructure/supabase/migrations/002_reports_schema.sql
supabase db push infrastructure/supabase/migrations/004_semantic_search_function.sql
```

## Option 2: Using Supabase Dashboard (Manual)

### Step 1: Open SQL Editor
Go to: https://supabase.com/dashboard/project/yjsrugmmgzbmyrodufin/sql/new

### Step 2: Run Migrations in Order

#### Migration 1: Initial Schema
1. Copy all content from `/infrastructure/supabase/migrations/001_initial_schema.sql`
2. Paste into SQL editor
3. Click "Run" button
4. Wait for confirmation

#### Migration 2: Reports Schema  
1. Copy all content from `/infrastructure/supabase/migrations/002_reports_schema.sql`
2. Paste into SQL editor
3. Click "Run" button
4. Wait for confirmation

#### Migration 3: Semantic Search Functions
1. Copy all content from `/infrastructure/supabase/migrations/004_semantic_search_function.sql`
2. Paste into SQL editor
3. Click "Run" button
4. Wait for confirmation

### Step 3: Verify Tables Created
Go to Table Editor: https://supabase.com/dashboard/project/yjsrugmmgzbmyrodufin/editor

You should see these tables:
- companies
- company_mentions
- emails
- report_history
- user_preferences
- email_delivery_log
- report_subscriptions
- embedding_queue

## Option 3: Direct Database Connection

If you have the database password, you can also use:
```bash
# Set environment variable with your database password
export PGPASSWORD="your-database-password"

# Run migrations directly
psql -h aws-0-us-west-1.pooler.supabase.com -p 5432 -d postgres -U postgres.yjsrugmmgzbmyrodufin < infrastructure/supabase/migrations/001_initial_schema.sql
psql -h aws-0-us-west-1.pooler.supabase.com -p 5432 -d postgres -U postgres.yjsrugmmgzbmyrodufin < infrastructure/supabase/migrations/002_reports_schema.sql
psql -h aws-0-us-west-1.pooler.supabase.com -p 5432 -d postgres -U postgres.yjsrugmmgzbmyrodufin < infrastructure/supabase/migrations/004_semantic_search_function.sql
```

## After Running Migrations

### Test Database Connection
```bash
cd /Users/aviswerdlow/Documents/Coding/substack/apps/web
pnpm dev
# Visit http://localhost:3000/dashboard
# Check if stats load and Recent Companies shows data
```

### Seed Test Data (Optional)
You can create test data in the Supabase dashboard:
1. Go to Table Editor
2. Add sample companies
3. Add sample emails
4. Add company mentions to link them

## Troubleshooting

### If migrations fail:
- Check for syntax errors in SQL
- Ensure extensions are enabled (uuid-ossp, vector)
- Run migrations one at a time to identify issues

### If connection fails:
- Verify Supabase service key in .env.local
- Check network connectivity
- Ensure project is not paused in Supabase dashboard