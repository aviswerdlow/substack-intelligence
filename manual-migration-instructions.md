# Manual Migration Instructions

Since we're having issues with the CLI authentication, the easiest way is to run the migrations manually through the Supabase Dashboard.

## Steps to Run Migrations:

### 1. Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/yjsrugmmgzbmyrodufin/sql/new

### 2. Run Each Migration in Order

#### Migration 1: Initial Schema (001_initial_schema.sql)
Copy and paste this entire SQL, then click "RUN":

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Then paste the rest of the 001_initial_schema.sql content
```

#### Migration 2: Reports Schema (002_reports_schema.sql)
Copy and paste the entire content, then click "RUN"

#### Migration 3: Enrichment Columns (003_add_enrichment_columns.sql)
Copy and paste the entire content, then click "RUN"

#### Migration 4: Semantic Search (004_semantic_search_function.sql)
Copy and paste the entire content, then click "RUN"

### 3. Verify Tables Were Created
Go to Table Editor: https://supabase.com/dashboard/project/yjsrugmmgzbmyrodufin/editor

You should see:
- companies
- company_mentions  
- emails
- report_history
- user_preferences
- email_delivery_log
- report_subscriptions
- embedding_queue

### 4. Test the Connection
After running migrations, restart your dev server:
```bash
cd apps/web
pnpm dev
```

Then visit http://localhost:3000/dashboard and check if the stats load properly.

## Alternative: Use pgAdmin or TablePlus
If you have a database client like pgAdmin or TablePlus, you can connect using:
- Host: aws-0-us-west-1.pooler.supabase.com
- Port: 5432
- Database: postgres
- User: postgres.yjsrugmmgzbmyrodufin
- Password: [Get from Supabase dashboard Settings > Database]

Then run the SQL files directly.