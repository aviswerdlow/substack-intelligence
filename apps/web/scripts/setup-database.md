# Database Setup Instructions

Since the Supabase CLI is not installed, you need to run the migrations manually in the Supabase dashboard.

## Steps to Set Up Database:

1. **Go to Supabase SQL Editor**
   - Navigate to: https://supabase.com/dashboard/project/yjsrugmmgzbmyrodufin/sql/new
   - Or in your dashboard, click on "SQL Editor" in the left sidebar

2. **Run Migrations in Order**
   
   Run these SQL files in this exact order:

   ### Migration 1: Initial Schema
   - Copy the contents of: `/infrastructure/supabase/migrations/001_initial_schema.sql`
   - Paste into SQL editor
   - Click "Run" button

   ### Migration 2: Reports Schema  
   - Copy the contents of: `/infrastructure/supabase/migrations/002_reports_schema.sql`
   - Paste into SQL editor
   - Click "Run" button

   ### Migration 3: Functions (if needed)
   - Copy the contents of: `/infrastructure/supabase/migrations/004_semantic_search_function.sql`
   - Paste into SQL editor
   - Click "Run" button

3. **Verify Tables Created**
   - Go to "Table Editor" in Supabase dashboard
   - You should see these tables:
     - companies
     - company_mentions
     - newsletters
     - reports
     - report_companies

4. **Enable Row Level Security (RLS)**
   - For each table, click on it in Table Editor
   - Go to "RLS" tab
   - Enable RLS if not already enabled
   - Add appropriate policies (or disable for development)

## Alternative: Install Supabase CLI

If you prefer to use the CLI:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Then run migrations
pnpm db:migrate
```

## Test Database Connection

After setup, the dashboard should:
- Show real stats instead of 0 values
- Load Recent Companies without errors
- Health check should show database as "Healthy"