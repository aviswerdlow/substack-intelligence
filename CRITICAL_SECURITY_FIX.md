# CRITICAL SECURITY FIX - User Data Isolation

## Issue Discovered
A critical security vulnerability was discovered where all users share the same data. The `emails`, `companies`, and `company_mentions` tables lack `user_id` columns, causing data from one user (e.g., aviswerdlow@gmail.com) to be visible to other users (e.g., humancode.io accounts).

## Immediate Actions Required

### 1. Apply Database Migration
Run the following migration immediately in your Supabase database:

```bash
# Option 1: Via Supabase Dashboard
# Navigate to SQL Editor and run the migration from:
# packages/database/migrations/003_add_user_isolation.sql

# Option 2: Via Supabase CLI
supabase db push --db-url "YOUR_DATABASE_URL" < packages/database/migrations/003_add_user_isolation.sql
```

### 2. Handle Existing Data
**IMPORTANT**: You must decide how to handle existing data. Choose one option:

#### Option A: Delete All Existing Data (Recommended for Safety)
```sql
-- Run this in Supabase SQL Editor
DELETE FROM public.company_mentions;
DELETE FROM public.companies;  
DELETE FROM public.emails;
```

#### Option B: Assign to Specific User
```sql
-- Replace 'USER_CLERK_ID' with the actual Clerk user ID
UPDATE public.emails SET user_id = 'USER_CLERK_ID' WHERE user_id IS NULL;
UPDATE public.companies SET user_id = 'USER_CLERK_ID' WHERE user_id IS NULL;
UPDATE public.company_mentions SET user_id = 'USER_CLERK_ID' WHERE user_id IS NULL;
```

### 3. Deploy Code Changes
Deploy the updated code immediately:

```bash
# Commit and push changes
git add .
git commit -m "CRITICAL: Fix user data isolation security vulnerability"
git push

# Deploy to Vercel
vercel --prod
```

### 4. Regenerate TypeScript Types
After applying the migration:

```bash
# Generate new types from Supabase
supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > packages/database/src/types/supabase.ts
```

## Changes Made

### Database Schema
- Added `user_id` column to `emails`, `companies`, and `company_mentions` tables
- Added Row Level Security (RLS) policies to ensure users can only see their own data
- Created indexes for performance optimization

### Application Code
1. **Pipeline Sync** (`/apps/web/app/api/pipeline/sync/route.ts`):
   - Now filters emails by `user_id`
   - Associates new companies and mentions with `user_id`

2. **Gmail Connector** (`/services/ingestion/src/gmail-connector.ts`):
   - Accepts `userId` parameter
   - Stores emails with `user_id`

3. **Database Queries** (`/packages/database/src/queries.ts`):
   - All queries now accept and filter by `userId`

4. **API Routes** (`/apps/web/app/api/companies/route.ts`):
   - Passes authenticated user's ID to database queries

5. **TypeScript Types** (`/packages/database/src/types/supabase.ts`):
   - Updated to include `user_id` fields

## Testing Verification

After applying the fix:

1. Sign in as User A
2. Run the pipeline sync
3. Note the companies and emails shown
4. Sign out and sign in as User B
5. Verify that User B cannot see User A's data
6. Run pipeline sync for User B
7. Verify data isolation is working

## Prevention Measures

1. **Always include user context** in database operations
2. **Enable RLS** on all user-specific tables
3. **Test with multiple accounts** before production deployment
4. **Security review** all database queries for proper user filtering

## Support

If you encounter any issues with this fix:
1. Immediately revert to prevent data exposure
2. Contact security team
3. Review audit logs for any unauthorized data access