-- CRITICAL SECURITY FIX: Add user isolation to prevent data leakage between users
-- This migration adds user_id columns to emails, companies, and company_mentions tables
-- to ensure proper data isolation between users.

-- Step 1: Add user_id column to emails table
ALTER TABLE public.emails 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Step 2: Add user_id column to companies table  
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Step 3: Add user_id column to company_mentions table
ALTER TABLE public.company_mentions
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_company_mentions_user_id ON public.company_mentions(user_id);

-- Step 5: Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_emails_user_id_received_at ON public.emails(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_user_id_mention_count ON public.companies(user_id, mention_count DESC);

-- Step 6: Add RLS (Row Level Security) policies if not already enabled
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_mentions ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies (assuming service role bypasses RLS)
-- These policies ensure users can only see their own data

-- Emails policies
CREATE POLICY "Users can view own emails" ON public.emails
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own emails" ON public.emails
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own emails" ON public.emails
    FOR UPDATE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own emails" ON public.emails
    FOR DELETE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Companies policies  
CREATE POLICY "Users can view own companies" ON public.companies
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own companies" ON public.companies
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own companies" ON public.companies
    FOR UPDATE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own companies" ON public.companies
    FOR DELETE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Company mentions policies
CREATE POLICY "Users can view own mentions" ON public.company_mentions
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own mentions" ON public.company_mentions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own mentions" ON public.company_mentions
    FOR UPDATE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own mentions" ON public.company_mentions
    FOR DELETE USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Step 8: IMPORTANT - For existing data, we need to associate it with the correct user
-- This is a one-time cleanup. You may need to manually assign data to the correct users
-- or delete all existing data to start fresh.

-- Option 1: Delete all existing data (safest but loses all data)
-- DELETE FROM public.company_mentions;
-- DELETE FROM public.companies;
-- DELETE FROM public.emails;

-- Option 2: Assign all existing data to a specific user (replace 'USER_ID_HERE' with actual user ID)
-- UPDATE public.emails SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE public.companies SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE public.company_mentions SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;

-- Note: After running this migration, you MUST update your application code to:
-- 1. Always include user_id when inserting data
-- 2. Always filter by user_id when querying data
-- 3. Update the TypeScript types to include user_id fields